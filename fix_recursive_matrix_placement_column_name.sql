-- ============================================================================
-- CRITICAL FIX V3: Fix recursive_matrix_placement - Wrong Column Name
-- Date: 2025-10-12
-- Priority: P0 - DEPLOY IMMEDIATELY
--
-- Issue: recursive_matrix_placement() uses "member_wallet" column in referrals
--        table, but the actual column name is "referred_wallet"
--
-- Solution: Update the function to use correct column name
-- ============================================================================

BEGIN;

-- Get the current function definition and fix the column names
CREATE OR REPLACE FUNCTION public.recursive_matrix_placement(p_member_wallet character varying, p_referrer_wallet character varying)
 RETURNS TABLE(placements_created integer, deepest_layer integer, placement_details jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_upline_wallets VARCHAR(42)[];
    v_current_root VARCHAR(42);
    v_placements_count INTEGER := 0;
    v_max_layer INTEGER := 0;
    v_details JSONB := '[]'::JSONB;
    v_position VARCHAR(10);
    v_parent_wallet VARCHAR(42);
    v_layer INTEGER;
    v_placement_record JSONB;
    i INTEGER;
BEGIN
    -- 收集所有上级（最多19层）
    WITH RECURSIVE upline_chain AS (
        SELECT referrer_wallet as wallet, 1 as depth
        FROM (SELECT p_referrer_wallet as referrer_wallet) t

        UNION ALL

        SELECT m.referrer_wallet, uc.depth + 1
        FROM upline_chain uc
        INNER JOIN members m ON uc.wallet = m.wallet_address
        WHERE uc.depth < 19 AND m.referrer_wallet IS NOT NULL
    )
    SELECT array_agg(wallet ORDER BY depth) INTO v_upline_wallets
    FROM upline_chain;

    -- 如果没有上级，直接返回
    IF v_upline_wallets IS NULL OR array_length(v_upline_wallets, 1) = 0 THEN
        RETURN QUERY SELECT 0, 0, '[]'::JSONB;
        RETURN;
    END IF;

    -- 在每个上级的矩阵中占位
    FOR i IN 1..array_length(v_upline_wallets, 1) LOOP
        v_current_root := v_upline_wallets[i];

        -- 使用BFS在该矩阵中找下一个可用位置
        SELECT pos, parent, layer
        INTO v_position, v_parent_wallet, v_layer
        FROM find_next_bfs_position(v_current_root, p_member_wallet);

        -- 如果找到位置且该层级不超过19层，插入
        IF v_position IS NOT NULL AND (v_layer IS NULL OR v_layer <= 19) THEN
            -- 确保layer有值（默认为1）
            IF v_layer IS NULL THEN
                v_layer := 1;
            END IF;

            -- 检查是否已存在（防止重复）
            IF NOT EXISTS (
                SELECT 1 FROM matrix_referrals
                WHERE matrix_root_wallet = v_current_root
                AND member_wallet = p_member_wallet
            ) THEN
                -- 插入matrix_referrals记录
                INSERT INTO matrix_referrals (
                    matrix_root_wallet,
                    member_wallet,
                    parent_wallet,
                    parent_depth,
                    layer,
                    position,
                    referral_type,
                    source
                ) VALUES (
                    v_current_root,
                    p_member_wallet,
                    v_parent_wallet,
                    i,  -- parent_depth = 上级链中的位置
                    v_layer,  -- layer = 在该矩阵中的实际层级（BFS确定）
                    v_position,
                    CASE WHEN v_layer = 1 THEN 'is_direct' ELSE 'is_spillover' END,
                    'recursive_placement'
                );

                -- 🔧 FIX: 如果是直接推荐人（i=1，即第一个上级），同时在referrals表创建记录
                -- ✅ FIXED: Changed member_wallet to referred_wallet
                IF i = 1 THEN
                    -- 检查referrals表是否已有记录（使用正确的列名 referred_wallet）
                    IF NOT EXISTS (
                        SELECT 1 FROM referrals
                        WHERE referred_wallet = p_member_wallet  -- ✅ FIXED: member_wallet → referred_wallet
                        AND referrer_wallet = v_current_root
                    ) THEN
                        INSERT INTO referrals (
                            referred_wallet,                -- ✅ FIXED: member_wallet → referred_wallet
                            referrer_wallet,
                            referred_activation_sequence,   -- ✅ FIXED: member_activation_sequence → referred_activation_sequence
                            referred_activation_time,       -- ✅ ADDED: required field
                            referrer_activation_sequence,   -- ✅ Optional, kept as-is
                            referral_depth,                 -- ✅ ADDED: corresponds to layer
                            created_at
                        ) VALUES (
                            p_member_wallet,
                            v_current_root,
                            (SELECT activation_sequence FROM members WHERE wallet_address = p_member_wallet),
                            (SELECT activation_time FROM members WHERE wallet_address = p_member_wallet),
                            (SELECT activation_sequence FROM members WHERE wallet_address = v_current_root),
                            v_layer,  -- referral_depth = layer in matrix
                            NOW()
                        );

                        RAISE NOTICE '✅ Created referrals record: referred=%, referrer=%, layer=%',
                            p_member_wallet, v_current_root, v_layer;
                    END IF;
                END IF;

                v_placements_count := v_placements_count + 1;
                v_max_layer := GREATEST(v_max_layer, v_layer);

                v_placement_record := jsonb_build_object(
                    'matrix_root', v_current_root,
                    'layer', v_layer,
                    'position', v_position,
                    'parent', v_parent_wallet
                );
                v_details := v_details || v_placement_record;
            END IF;
        END IF;
    END LOOP;

    RETURN QUERY SELECT v_placements_count, v_max_layer, v_details;
END;
$function$;

COMMENT ON FUNCTION recursive_matrix_placement IS
'Fixed to use correct column names for referrals table:
- member_wallet → referred_wallet
- Added required fields: referred_activation_time, referral_depth
Correctly handles matrix placement across upline chain with BFS positioning.';

-- ============================================================================
-- STEP 2: Validation
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ CRITICAL FIX V3 APPLIED: Fixed Column Names in recursive_matrix_placement';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes Applied:';
    RAISE NOTICE '  ✅ member_wallet → referred_wallet';
    RAISE NOTICE '  ✅ Added referred_activation_time field';
    RAISE NOTICE '  ✅ Added referral_depth field';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready to backfill 10 missing members!';
    RAISE NOTICE '';
END $$;

COMMIT;

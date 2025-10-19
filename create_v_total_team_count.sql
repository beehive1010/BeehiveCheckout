-- ============================================================================
-- 创建 v_total_team_count 视图
-- 用于计算总团队人数（递归referrer树，所有层级，不受19层矩阵限制）
-- ============================================================================

-- ============================================================================
-- View: v_total_team_count
-- Purpose: Calculate total team count using recursive referrer tree
--          Includes ALL layers (not limited to 19-layer matrix)
-- ============================================================================
CREATE OR REPLACE VIEW v_total_team_count AS
WITH RECURSIVE downline_tree AS (
    -- Base case: 直接推荐（Layer 1）
    SELECT
        m1.wallet_address as root_wallet,
        m2.wallet_address as member_wallet,
        m2.current_level as member_level,
        m2.activation_time as member_activated_at,
        1 as referral_depth,
        ARRAY[m1.wallet_address, m2.wallet_address]::VARCHAR(42)[] as referral_path
    FROM members m1
    INNER JOIN members m2 ON m2.referrer_wallet = m1.wallet_address
    WHERE m2.wallet_address != m1.wallet_address  -- 排除自我推荐

    UNION ALL

    -- Recursive case: 间接推荐（Layer 2+）
    SELECT
        dt.root_wallet,
        m.wallet_address as member_wallet,
        m.current_level as member_level,
        m.activation_time as member_activated_at,
        dt.referral_depth + 1,
        (dt.referral_path || m.wallet_address)::VARCHAR(42)[]
    FROM downline_tree dt
    INNER JOIN members m ON m.referrer_wallet = dt.member_wallet
    WHERE dt.referral_depth < 100  -- 防止无限递归
      AND NOT (m.wallet_address = ANY(dt.referral_path))  -- 防止循环推荐
)
SELECT
    root_wallet,
    -- 总团队人数（所有层级）
    COUNT(DISTINCT member_wallet) as total_team_count,

    -- 激活团队人数（所有层级中current_level >= 1的成员）
    COUNT(DISTINCT member_wallet) FILTER (
        WHERE member_level >= 1
    ) as activated_team_count,

    -- 最大推荐深度
    MAX(referral_depth) as max_referral_depth,

    -- 各层级分布
    COUNT(DISTINCT member_wallet) FILTER (WHERE referral_depth = 1) as layer_1_count,
    COUNT(DISTINCT member_wallet) FILTER (WHERE referral_depth = 2) as layer_2_count,
    COUNT(DISTINCT member_wallet) FILTER (WHERE referral_depth = 3) as layer_3_count,
    COUNT(DISTINCT member_wallet) FILTER (WHERE referral_depth BETWEEN 4 AND 10) as layer_4_to_10_count,
    COUNT(DISTINCT member_wallet) FILTER (WHERE referral_depth BETWEEN 11 AND 19) as layer_11_to_19_count,
    COUNT(DISTINCT member_wallet) FILTER (WHERE referral_depth >= 20) as layer_20_plus_count,

    -- 统计时间
    NOW() as calculated_at
FROM downline_tree
GROUP BY root_wallet;

COMMENT ON VIEW v_total_team_count IS
'Total team count using recursive referrer tree.
This view calculates team statistics across ALL referral layers (not limited to 19-layer matrix).

Fields:
- total_team_count: Total number of team members across all referral layers
- activated_team_count: Number of activated members (current_level >= 1) across all layers
- max_referral_depth: Maximum referral depth reached
- layer_X_count: Distribution of members across different layers
- layer_20_plus_count: Members beyond the 19-layer matrix limit

Difference from v_matrix_overview:
- v_total_team_count: Uses referrer_wallet chain (unlimited depth)
- v_matrix_overview: Uses matrix_referrals table (limited to 19 layers)

Use cases:
- Dashboard: Show total team size (all layers)
- Referrals page: Display comprehensive team statistics
- Analytics: Understand team growth beyond matrix limits';

-- 授予权限
GRANT SELECT ON v_total_team_count TO authenticated, anon;

-- ============================================================================
-- 验证视图数据
-- ============================================================================
DO $$
DECLARE
    v_test_wallet VARCHAR(42) := '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab';
    v_total_count INTEGER;
    v_activated_count INTEGER;
    v_max_depth INTEGER;
    v_layer_20_plus INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'VIEW VALIDATION: v_total_team_count';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '';

    -- 查询测试钱包的统计数据
    SELECT
        total_team_count,
        activated_team_count,
        max_referral_depth,
        layer_20_plus_count
    INTO
        v_total_count,
        v_activated_count,
        v_max_depth,
        v_layer_20_plus
    FROM v_total_team_count
    WHERE root_wallet = v_test_wallet;

    RAISE NOTICE 'Test Wallet: %', v_test_wallet;
    RAISE NOTICE '';
    RAISE NOTICE 'Statistics (All Layers via Referrer Tree):';
    RAISE NOTICE '  - Total Team Count: %', COALESCE(v_total_count, 0);
    RAISE NOTICE '  - Activated Team Count: %', COALESCE(v_activated_count, 0);
    RAISE NOTICE '  - Max Referral Depth: %', COALESCE(v_max_depth, 0);
    RAISE NOTICE '  - Members Beyond Layer 19: %', COALESCE(v_layer_20_plus, 0);
    RAISE NOTICE '';

    IF v_total_count > 0 THEN
        RAISE NOTICE '✅ View created successfully with data';

        -- 对比矩阵内统计
        DECLARE
            v_matrix_count INTEGER;
        BEGIN
            SELECT total_members INTO v_matrix_count
            FROM v_matrix_overview
            WHERE wallet_address = v_test_wallet;

            RAISE NOTICE '';
            RAISE NOTICE 'Comparison with Matrix (19 Layers Only):';
            RAISE NOTICE '  - Matrix Team Count: %', COALESCE(v_matrix_count, 0);
            RAISE NOTICE '  - Total Team Count: %', v_total_count;
            RAISE NOTICE '  - Difference: % members beyond matrix',
                         v_total_count - COALESCE(v_matrix_count, 0);

            IF v_total_count >= COALESCE(v_matrix_count, 0) THEN
                RAISE NOTICE '✅ Total team >= Matrix team (correct)';
            ELSE
                RAISE NOTICE '⚠️  Total team < Matrix team (unexpected!)';
            END IF;
        END;
    ELSE
        RAISE NOTICE '⚠️  View created but no data for test wallet';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE 'Frontend components can now use:';
    RAISE NOTICE '  - Total Team: v_total_team_count.total_team_count';
    RAISE NOTICE '  - Active Team (all layers): v_total_team_count.activated_team_count';
    RAISE NOTICE '  - Matrix Team (19 layers): v_matrix_overview.total_members';
    RAISE NOTICE '  - Active Team (19 layers): v_matrix_overview.active_members';
    RAISE NOTICE '';
END $$;

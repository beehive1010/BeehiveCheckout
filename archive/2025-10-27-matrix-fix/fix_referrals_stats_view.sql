-- ============================================================================
-- 修复 referrals_stats_view 视图
-- 问题：原视图从matrix_referrals统计，direct_referrals实际是Layer 1（最多3个）
-- 修复：从referrals表统计真正的直推人数
-- ============================================================================

-- 删除旧视图
DROP VIEW IF EXISTS referrals_stats_view CASCADE;

-- 创建正确的直推统计视图
CREATE OR REPLACE VIEW referrals_stats_view AS
SELECT
    r.referrer_wallet,
    -- 总推荐人数（从referrals表）
    COUNT(*) AS total_referrals,

    -- 直推人数（所有从referrals表的记录都是直推）
    COUNT(*) AS direct_referrals,

    -- 激活的直推人数
    COUNT(*) FILTER (
        WHERE EXISTS (
            SELECT 1 FROM members m
            WHERE m.wallet_address = r.referred_wallet
            AND m.current_level >= 1
        )
    ) AS activated_referrals,

    -- 唯一成员数
    COUNT(DISTINCT r.referred_wallet) AS unique_members,

    -- 时间统计
    MAX(r.created_at) AS last_referral_date,
    MIN(r.created_at) AS first_referral_date
FROM referrals r
WHERE r.referrer_wallet IS NOT NULL
  AND r.referred_wallet IS NOT NULL
  AND r.referrer_wallet != r.referred_wallet  -- 排除自我推荐
GROUP BY r.referrer_wallet;

COMMENT ON VIEW referrals_stats_view IS
'Provides referral statistics per referrer based on referrals table.

FIXED: Now correctly queries from referrals table for true direct referrals count.
Previously was querying matrix_referrals Layer 1 (limited to 3 positions).

Fields:
- referrer_wallet: The referrer wallet address
- total_referrals: Total number of direct referrals (from referrals table)
- direct_referrals: Same as total_referrals (all referrals records are direct)
- activated_referrals: Number of referrals with current_level >= 1
- unique_members: Distinct referred member count
- last_referral_date: Most recent referral timestamp
- first_referral_date: First referral timestamp

Difference from matrix statistics:
- referrals_stats_view.direct_referrals: All direct referrals (can be 10, 20, 100+)
- matrix_referrals Layer 1: Matrix positions (limited to 3: L, M, R)

Example:
- User A has 50 direct referrals in referrals table
- User A has 3 Layer 1 positions in matrix (L, M, R)
- referrals_stats_view.direct_referrals = 50 ✓
- matrix Layer 1 count = 3 ✓';

-- 授予权限
GRANT SELECT ON referrals_stats_view TO authenticated, anon;

-- ============================================================================
-- 验证修复
-- ============================================================================
DO $$
DECLARE
    v_test_wallet VARCHAR(42) := '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab';
    v_direct_from_view INTEGER;
    v_direct_from_table INTEGER;
    v_matrix_layer1 INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'VALIDATION: referrals_stats_view FIX';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '';

    -- 从新视图查询
    SELECT direct_referrals INTO v_direct_from_view
    FROM referrals_stats_view
    WHERE referrer_wallet = v_test_wallet;

    -- 从referrals表直接查询
    SELECT COUNT(*) INTO v_direct_from_table
    FROM referrals
    WHERE referrer_wallet = v_test_wallet
      AND referred_wallet != referrer_wallet;

    -- 从matrix_referrals查询Layer 1
    SELECT COUNT(*) INTO v_matrix_layer1
    FROM matrix_referrals
    WHERE matrix_root_wallet = v_test_wallet
      AND layer = 1;

    RAISE NOTICE 'Test Wallet: %', v_test_wallet;
    RAISE NOTICE '';
    RAISE NOTICE 'Direct Referrals Count:';
    RAISE NOTICE '  - From referrals_stats_view: %', COALESCE(v_direct_from_view, 0);
    RAISE NOTICE '  - From referrals table (correct): %', COALESCE(v_direct_from_table, 0);
    RAISE NOTICE '  - Matrix Layer 1 positions (max 3): %', COALESCE(v_matrix_layer1, 0);
    RAISE NOTICE '';

    IF v_direct_from_view = v_direct_from_table THEN
        RAISE NOTICE '✅ View fixed: direct_referrals matches referrals table';
    ELSE
        RAISE NOTICE '⚠️  Mismatch: view=%, table=%',
                     v_direct_from_view, v_direct_from_table;
    END IF;

    IF v_direct_from_view != v_matrix_layer1 THEN
        RAISE NOTICE '✅ Correct: direct_referrals (%) != matrix Layer 1 (%)',
                     v_direct_from_view, v_matrix_layer1;
    ELSE
        RAISE NOTICE '⚠️  Warning: direct_referrals equals matrix Layer 1';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE 'Expected behavior:';
    RAISE NOTICE '  - Direct Referrals can be > 3 (no limit)';
    RAISE NOTICE '  - Matrix Layer 1 is always <= 3 (L, M, R positions)';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- 显示示例数据
-- ============================================================================
SELECT
    'Sample Data' as info,
    referrer_wallet,
    direct_referrals as "Direct Referrals (from referrals table)",
    activated_referrals as "Activated Referrals",
    unique_members as "Unique Members"
FROM referrals_stats_view
ORDER BY direct_referrals DESC
LIMIT 5;

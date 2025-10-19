-- ============================================================================
-- 创建 v_matrix_overview 视图
-- 用于显示每个矩阵根的整体统计信息
-- ============================================================================

CREATE OR REPLACE VIEW v_matrix_overview AS
SELECT
    mr.matrix_root_wallet as wallet_address,
    COUNT(DISTINCT mr.member_wallet) as total_members,
    MAX(mr.layer) as deepest_layer,
    -- 激活成员数（有current_level的成员）
    COUNT(DISTINCT mr.member_wallet) FILTER (
        WHERE EXISTS (
            SELECT 1 FROM members m
            WHERE m.wallet_address = mr.member_wallet
            AND m.current_level >= 1
        )
    ) as active_members,
    -- 直推成员数
    COUNT(DISTINCT mr.member_wallet) FILTER (WHERE mr.referral_type = 'direct') as direct_referrals,
    -- 滑落成员数
    COUNT(DISTINCT mr.member_wallet) FILTER (WHERE mr.referral_type = 'spillover') as spillover_members,
    -- 最早排位时间
    MIN(mr.created_at) as first_placement_time,
    -- 最新排位时间
    MAX(mr.created_at) as latest_placement_time
FROM matrix_referrals mr
WHERE mr.layer >= 1 AND mr.layer <= 19
GROUP BY mr.matrix_root_wallet;

COMMENT ON VIEW v_matrix_overview IS
'Overview statistics for each matrix root, showing total members, depth, and referral types';

-- 授予权限
GRANT SELECT ON v_matrix_overview TO authenticated, anon;

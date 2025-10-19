-- ============================================================================
-- 创建 v_member_overview 视图
-- 用于显示会员的综合信息，包括矩阵统计
-- ============================================================================

CREATE OR REPLACE VIEW v_member_overview AS
SELECT
    m.wallet_address,
    u.username,
    u.email,
    m.activation_time,
    m.activation_sequence,
    m.current_level,
    (m.current_level >= 1) as is_active,
    m.referrer_wallet,
    -- 直推数量
    (
        SELECT COUNT(*)
        FROM referrals r
        WHERE r.referrer_wallet = m.wallet_address
    ) as direct_referrals_count,
    -- 作为矩阵根的统计
    (
        SELECT COUNT(DISTINCT mr.member_wallet)
        FROM matrix_referrals mr
        WHERE mr.matrix_root_wallet = m.wallet_address
    ) as total_members,
    -- 激活成员数
    (
        SELECT COUNT(DISTINCT mr.member_wallet)
        FROM matrix_referrals mr
        WHERE mr.matrix_root_wallet = m.wallet_address
        AND EXISTS (
            SELECT 1 FROM members mem
            WHERE mem.wallet_address = mr.member_wallet
            AND mem.current_level >= 1
        )
    ) as active_members,
    -- 最深层级
    (
        SELECT MAX(mr.layer)
        FROM matrix_referrals mr
        WHERE mr.matrix_root_wallet = m.wallet_address
    ) as deepest_layer,
    -- 被排位到多少个矩阵中（作为member）
    (
        SELECT COUNT(DISTINCT mr.matrix_root_wallet)
        FROM matrix_referrals mr
        WHERE mr.member_wallet = m.wallet_address
    ) as placed_in_matrices_count,
    -- 总排位次数
    (
        SELECT COUNT(*)
        FROM matrix_referrals mr
        WHERE mr.member_wallet = m.wallet_address
    ) as total_placements
FROM members m
LEFT JOIN users u ON u.wallet_address = m.wallet_address;

COMMENT ON VIEW v_member_overview IS
'Comprehensive member overview with matrix statistics and referral counts';

-- 授予权限
GRANT SELECT ON v_member_overview TO authenticated, anon;

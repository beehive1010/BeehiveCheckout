-- 移除user_keys概念，直接使用钱包地址作为主键绑定
-- ========================================
-- 简化系统设计，钱包地址就是唯一标识
-- ========================================

-- 第1步：删除包含user_keys的视图
-- ========================================

DROP VIEW IF EXISTS member_rewards_summary CASCADE;
DROP VIEW IF EXISTS layer_rewards_details CASCADE;
DROP VIEW IF EXISTS member_nft_complete CASCADE;
DROP VIEW IF EXISTS referrals_stats CASCADE;

-- 第2步：重新创建简洁的视图（直接使用钱包地址）
-- ========================================

-- 成员奖励统计视图
CREATE OR REPLACE VIEW member_rewards_summary AS
WITH reward_stats AS (
    SELECT 
        reward_recipient,
        COUNT(*) as total_rewards,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'claimable') as claimable_count,
        COUNT(*) FILTER (WHERE status = 'claimed') as claimed_count,
        COUNT(*) FILTER (WHERE status = 'forfeited') as forfeited_count,
        COUNT(*) FILTER (WHERE status = 'rolled_up') as rolled_up_count,
        COUNT(*) FILTER (WHERE eligibility_met = true) as eligible_count,
        COUNT(*) FILTER (WHERE eligibility_met = false) as ineligible_count,
        SUM(final_reward_amount) FILTER (WHERE status = 'claimable') as claimable_amount,
        SUM(final_reward_amount) FILTER (WHERE status = 'claimed') as claimed_amount,
        SUM(final_reward_amount) FILTER (WHERE status = 'pending') as pending_amount
    FROM layer_rewards
    GROUP BY reward_recipient
)
SELECT 
    m.activation_id as 激活序号,
    m.wallet_address as 钱包地址,
    nml.level_name as 当前等级名称,
    m.current_level as 当前等级,
    nml.nft_price_usdt as 当前等级价格USDT,
    COALESCE(rs.total_rewards, 0) as 总奖励数,
    COALESCE(rs.eligible_count, 0) as 符合条件奖励,
    COALESCE(rs.ineligible_count, 0) as 不符合条件奖励,
    COALESCE(rs.pending_count, 0) as 待定奖励,
    COALESCE(rs.claimable_count, 0) as 可领取奖励,
    COALESCE(rs.claimed_count, 0) as 已领取奖励,
    COALESCE(rs.forfeited_count, 0) as 失效奖励,
    COALESCE(rs.rolled_up_count, 0) as 滚动奖励,
    COALESCE(rs.claimable_amount, 0) as 可领取金额USDT,
    COALESCE(rs.claimed_amount, 0) as 已领取金额USDT,
    COALESCE(rs.pending_amount, 0) as 待定金额USDT
FROM membership m
LEFT JOIN nft_membership_levels nml ON m.current_level = nml.level
LEFT JOIN reward_stats rs ON m.wallet_address = rs.reward_recipient
ORDER BY m.activation_id;

-- 推荐统计视图
CREATE OR REPLACE VIEW referrals_stats AS
WITH member_direct_stats AS (
    SELECT 
        m.activation_id,
        m.wallet_address as matrix_root,
        m.referrer_wallet,
        COUNT(r.id) as total_referrals,
        COUNT(r.id) FILTER (WHERE r.matrix_layer = 1) as layer1_count,
        COUNT(r.id) FILTER (WHERE r.matrix_layer > 1) as spillover_count
    FROM membership m
    LEFT JOIN referrals r ON m.wallet_address = r.matrix_root
    GROUP BY m.activation_id, m.wallet_address, m.referrer_wallet
),
layer1_positions AS (
    SELECT 
        matrix_root,
        MAX(CASE WHEN matrix_position = 'L' THEN activation_id END) as L_activation_id,
        MAX(CASE WHEN matrix_position = 'M' THEN activation_id END) as M_activation_id,
        MAX(CASE WHEN matrix_position = 'R' THEN activation_id END) as R_activation_id
    FROM referrals
    WHERE matrix_layer = 1
    GROUP BY matrix_root
)
SELECT 
    mds.activation_id as 激活序号,
    mds.matrix_root as 会员地址,
    CASE 
        WHEN mds.referrer_wallet IS NULL THEN '🌟 原始根节点'
        ELSE mds.referrer_wallet
    END as 推荐人地址,
    mds.total_referrals as 直推人数,
    mds.spillover_count as 溢出人数,
    lp.L_activation_id as L安置激活序号,
    lp.M_activation_id as M安置激活序号,
    lp.R_activation_id as R安置激活序号,
    mds.layer1_count || '/3' as Layer1完成度,
    CASE 
        WHEN mds.layer1_count = 0 THEN 'L'
        WHEN mds.layer1_count = 1 THEN 'M'
        WHEN mds.layer1_count = 2 THEN 'R'
        ELSE 'FULL'
    END as 空缺安置位置
FROM member_direct_stats mds
LEFT JOIN layer1_positions lp ON mds.matrix_root = lp.matrix_root
ORDER BY mds.activation_id;

-- 奖励详情视图
CREATE OR REPLACE VIEW layer_rewards_details AS
SELECT 
    lr.id,
    m1.activation_id as 触发者激活序号,
    lr.triggering_member as 触发者地址,
    m2.activation_id as 接收者激活序号,
    lr.reward_recipient as 接收者地址,
    lr.layer_number as 层级,
    lr.matrix_position as 位置,
    nml.level_name as NFT等级名称,
    lr.triggering_nft_level as NFT等级,
    lr.final_reward_amount as 奖励金额USDT,
    lr.platform_fee as 平台费USDT,
    lr.status as 状态,
    lr.eligibility_met as 符合条件,
    lr.required_nft_level as 需要等级,
    lr.recipient_current_level as 当前等级,
    lr.direct_referral_count as 直推人数,
    lr.required_direct_referrals as 需要直推人数,
    CASE 
        WHEN lr.pending_expires_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (lr.pending_expires_at - NOW())) / 3600 
        ELSE NULL 
    END as 剩余小时,
    lr.created_at as 创建时间,
    lr.claimed_at as 领取时间
FROM layer_rewards lr
JOIN membership m1 ON lr.triggering_member = m1.wallet_address
JOIN membership m2 ON lr.reward_recipient = m2.wallet_address
JOIN nft_membership_levels nml ON lr.triggering_nft_level = nml.level
ORDER BY lr.created_at DESC;

-- 完整成员信息视图
CREATE OR REPLACE VIEW member_complete_info AS
SELECT 
    m.activation_id as 激活序号,
    m.wallet_address as 钱包地址,
    CASE 
        WHEN m.referrer_wallet IS NULL THEN '🌟 原始根节点'
        ELSE m.referrer_wallet
    END as 推荐人地址,
    nml.level_name as 当前等级名称,
    m.current_level as 当前等级,
    nml.nft_price_usdt as NFT价格USDT,
    nml.platform_fee_usdt as 平台费USDT,
    nml.total_cost_usdt as 总成本USDT,
    nml.tier as 等级档次,
    nml.max_layer_members as 最大层级会员数,
    m.activation_time as 激活时间,
    -- 推荐统计
    COALESCE(rs.直推人数, 0) as 直推人数,
    COALESCE(rs.溢出人数, 0) as 溢出人数,
    COALESCE(rs.Layer1完成度, '0/3') as Layer1完成度,
    COALESCE(rs.空缺安置位置, 'L') as 空缺位置,
    -- 奖励统计
    COALESCE(mrs.总奖励数, 0) as 总奖励数,
    COALESCE(mrs.可领取奖励, 0) as 可领取奖励,
    COALESCE(mrs.可领取金额USDT, 0) as 可领取金额USDT,
    COALESCE(mrs.已领取金额USDT, 0) as 已领取金额USDT
FROM membership m
LEFT JOIN nft_membership_levels nml ON m.current_level = nml.level
LEFT JOIN referrals_stats rs ON m.wallet_address = rs.会员地址
LEFT JOIN member_rewards_summary mrs ON m.wallet_address = mrs.钱包地址
ORDER BY m.activation_id;

-- 第3步：创建钱包地址查询函数
-- ========================================

-- 根据激活序号查询钱包地址
CREATE OR REPLACE FUNCTION get_wallet_by_activation_id(p_activation_id INTEGER)
RETURNS VARCHAR(42) AS $$
DECLARE
    wallet_addr VARCHAR(42);
BEGIN
    SELECT wallet_address INTO wallet_addr
    FROM membership
    WHERE activation_id = p_activation_id;
    
    RETURN wallet_addr;
END;
$$ LANGUAGE plpgsql;

-- 根据钱包地址查询激活序号
CREATE OR REPLACE FUNCTION get_activation_id_by_wallet(p_wallet_address VARCHAR(42))
RETURNS INTEGER AS $$
DECLARE
    activation_num INTEGER;
BEGIN
    SELECT activation_id INTO activation_num
    FROM membership
    WHERE wallet_address = p_wallet_address;
    
    RETURN activation_num;
END;
$$ LANGUAGE plpgsql;

-- 第4步：简化的矩阵视图
-- ========================================

CREATE OR REPLACE VIEW matrix_structure_view AS
SELECT 
    m.activation_id as 激活序号,
    m.wallet_address as 会员地址,
    CASE 
        WHEN m.referrer_wallet IS NULL THEN '🌟 原始根节点'
        ELSE m.referrer_wallet
    END as 推荐人地址,
    COUNT(mp.id) FILTER (WHERE mp.is_direct_referral = true) as 直推会员人数,
    COUNT(mp.id) FILTER (WHERE mp.is_spillover_placed = true) as 溢出人数,
    -- Layer 1的L-M-R位置成员
    (SELECT mp2.member_wallet FROM matrix_placements mp2 
     WHERE mp2.matrix_root = m.wallet_address AND mp2.matrix_layer = 1 AND mp2.matrix_position = 'L' LIMIT 1) as L位置会员,
    (SELECT mp2.member_wallet FROM matrix_placements mp2 
     WHERE mp2.matrix_root = m.wallet_address AND mp2.matrix_layer = 1 AND mp2.matrix_position = 'M' LIMIT 1) as M位置会员,
    (SELECT mp2.member_wallet FROM matrix_placements mp2 
     WHERE mp2.matrix_root = m.wallet_address AND mp2.matrix_layer = 1 AND mp2.matrix_position = 'R' LIMIT 1) as R位置会员,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM matrix_placements WHERE matrix_root = m.wallet_address AND matrix_layer = 1 AND matrix_position = 'L') THEN 'L'
        WHEN NOT EXISTS (SELECT 1 FROM matrix_placements WHERE matrix_root = m.wallet_address AND matrix_layer = 1 AND matrix_position = 'M') THEN 'M'
        WHEN NOT EXISTS (SELECT 1 FROM matrix_placements WHERE matrix_root = m.wallet_address AND matrix_layer = 1 AND matrix_position = 'R') THEN 'R'
        ELSE 'FULL'
    END as 空缺安置位置
FROM membership m
LEFT JOIN matrix_placements mp ON m.wallet_address = mp.matrix_root
GROUP BY m.activation_id, m.wallet_address, m.referrer_wallet
ORDER BY m.activation_id;

-- 第5步：显示系统状态
-- ========================================

SELECT '=== 移除user_keys，使用钱包地址作为主键 ===' as status;

-- 显示成员完整信息
SELECT '=== 成员完整信息（前5个） ===' as section;
SELECT 激活序号, 钱包地址, 推荐人地址, 当前等级名称, 直推人数, 总奖励数, 可领取金额USDT 
FROM member_complete_info 
ORDER BY 激活序号 
LIMIT 5;

-- 显示矩阵结构
SELECT '=== 矩阵结构（前5个） ===' as section;
SELECT * FROM matrix_structure_view ORDER BY 激活序号 LIMIT 5;

-- 显示奖励统计
SELECT '=== 奖励统计（有奖励的成员） ===' as section;
SELECT 激活序号, 钱包地址, 当前等级名称, 总奖励数, 可领取奖励, 可领取金额USDT
FROM member_rewards_summary 
WHERE 总奖励数 > 0 
ORDER BY 激活序号 
LIMIT 5;
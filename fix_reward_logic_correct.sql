-- 修正奖励逻辑和地址格式脚本
-- 修正问题：
-- 1. Layer 1 奖励 = 直推奖励，给 referrer
-- 2. Layer Rewards = Layer 2-19 奖励，给 matrix root
-- 3. 所有查询使用原始以太坊地址格式（保持大小写）

-- 1. 清理错误的奖励数据
SELECT 'Cleaning incorrect reward data' as step;

-- 删除错误分配的Layer 1奖励（这些应该是直推奖励，不是层级奖励）
DELETE FROM layer_rewards 
WHERE matrix_layer = 1 
    AND created_at >= CURRENT_DATE - INTERVAL '2 hours';  -- 只删除最近修复时错误添加的

-- 2. 创建直推奖励表（如果不存在）
CREATE TABLE IF NOT EXISTS direct_referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_wallet TEXT NOT NULL,
    referred_member_wallet TEXT NOT NULL,
    reward_amount NUMERIC(18,6) DEFAULT 100.000000,
    status VARCHAR(20) DEFAULT 'claimable' CHECK (status IN ('claimable', 'claimed', 'expired')),
    created_at TIMESTAMP DEFAULT NOW(),
    claimed_at TIMESTAMP NULL,
    transaction_hash TEXT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. 添加直推奖励记录（Layer 1 = 直推奖励）
INSERT INTO direct_referral_rewards (
    referrer_wallet,
    referred_member_wallet,
    reward_amount,
    status,
    created_at,
    metadata
)
SELECT DISTINCT
    r.referrer_wallet,
    r.member_wallet as referred_member_wallet,
    100.000000 as reward_amount,
    'claimable' as status,
    r.placed_at as created_at,
    jsonb_build_object(
        'type', 'direct_referral',
        'matrix_position', r.matrix_position,
        'source', 'correction_script_layer1'
    ) as metadata
FROM referrals r
JOIN members m_referrer ON r.referrer_wallet = m_referrer.wallet_address
JOIN members m_referred ON r.member_wallet = m_referred.wallet_address
LEFT JOIN direct_referral_rewards drr ON (
    drr.referrer_wallet = r.referrer_wallet 
    AND drr.referred_member_wallet = r.member_wallet
)
WHERE r.is_direct_referral = true
    AND r.matrix_layer = 1  -- Layer 1 是直推
    AND m_referrer.current_level >= 1
    AND m_referred.current_level >= 1
    AND drr.id IS NULL  -- 避免重复
ON CONFLICT DO NOTHING;

-- 4. 添加正确的层级奖励（Layer 2-19 给 matrix root）
INSERT INTO layer_rewards (
    triggering_member_wallet,
    reward_recipient_wallet,
    matrix_root_wallet,
    triggering_nft_level,
    reward_amount,
    matrix_layer,
    status,
    recipient_required_level,
    recipient_current_level,
    requires_direct_referrals,
    direct_referrals_required,
    direct_referrals_current,
    created_at
)
SELECT DISTINCT
    r.member_wallet as triggering_member_wallet,
    r.matrix_root_wallet as reward_recipient_wallet,  -- 层级奖励给 matrix root
    r.matrix_root_wallet,
    1 as triggering_nft_level,
    CASE 
        WHEN r.matrix_layer = 2 THEN 150.000000
        WHEN r.matrix_layer = 3 THEN 165.000000
        WHEN r.matrix_layer = 4 THEN 250.000000
        WHEN r.matrix_layer = 5 THEN 300.000000
        ELSE 100.000000 * r.matrix_layer  -- 其他层级的奖励金额
    END as reward_amount,
    r.matrix_layer,
    'claimable' as status,
    r.matrix_layer as recipient_required_level,  -- 需要对应层级
    COALESCE(m_root.current_level, 1) as recipient_current_level,
    false as requires_direct_referrals,
    0 as direct_referrals_required,
    0 as direct_referrals_current,
    r.placed_at as created_at
FROM referrals r
JOIN members m_root ON r.matrix_root_wallet = m_root.wallet_address
JOIN members m_member ON r.member_wallet = m_member.wallet_address
LEFT JOIN layer_rewards lr ON (
    lr.triggering_member_wallet = r.member_wallet 
    AND lr.reward_recipient_wallet = r.matrix_root_wallet
    AND lr.matrix_layer = r.matrix_layer
)
WHERE r.matrix_layer >= 2  -- Layer 2-19 才是层级奖励
    AND r.matrix_layer <= 19
    AND m_root.current_level >= r.matrix_layer  -- Root必须有对应层级
    AND m_member.current_level >= 1
    AND lr.id IS NULL  -- 避免重复
    AND r.placed_at IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. 创建统一的奖励汇总视图
CREATE OR REPLACE VIEW member_all_rewards_view AS
SELECT 
    m.wallet_address,
    u.username,
    m.current_level,
    
    -- 直推奖励统计
    COALESCE(drr_stats.direct_claimable_count, 0) as direct_claimable_count,
    COALESCE(drr_stats.direct_claimable_amount, 0) as direct_claimable_amount,
    COALESCE(drr_stats.direct_claimed_count, 0) as direct_claimed_count,
    COALESCE(drr_stats.direct_claimed_amount, 0) as direct_claimed_amount,
    
    -- 层级奖励统计
    COALESCE(lr_stats.layer_claimable_count, 0) as layer_claimable_count,
    COALESCE(lr_stats.layer_claimable_amount, 0) as layer_claimable_amount,
    COALESCE(lr_stats.layer_claimed_count, 0) as layer_claimed_count,
    COALESCE(lr_stats.layer_claimed_amount, 0) as layer_claimed_amount,
    
    -- 总计
    COALESCE(drr_stats.direct_claimable_amount, 0) + COALESCE(lr_stats.layer_claimable_amount, 0) as total_claimable,
    COALESCE(drr_stats.direct_claimed_amount, 0) + COALESCE(lr_stats.layer_claimed_amount, 0) as total_claimed,
    COALESCE(drr_stats.direct_claimable_amount, 0) + COALESCE(lr_stats.layer_claimable_amount, 0) + 
    COALESCE(drr_stats.direct_claimed_amount, 0) + COALESCE(lr_stats.layer_claimed_amount, 0) as total_earned

FROM members m
LEFT JOIN users u ON m.wallet_address = u.wallet_address
LEFT JOIN (
    -- 直推奖励统计
    SELECT 
        referrer_wallet,
        COUNT(CASE WHEN status = 'claimable' THEN 1 END) as direct_claimable_count,
        SUM(CASE WHEN status = 'claimable' THEN reward_amount ELSE 0 END) as direct_claimable_amount,
        COUNT(CASE WHEN status = 'claimed' THEN 1 END) as direct_claimed_count,
        SUM(CASE WHEN status = 'claimed' THEN reward_amount ELSE 0 END) as direct_claimed_amount
    FROM direct_referral_rewards 
    GROUP BY referrer_wallet
) drr_stats ON m.wallet_address = drr_stats.referrer_wallet
LEFT JOIN (
    -- 层级奖励统计
    SELECT 
        reward_recipient_wallet,
        COUNT(CASE WHEN status = 'claimable' THEN 1 END) as layer_claimable_count,
        SUM(CASE WHEN status = 'claimable' THEN reward_amount ELSE 0 END) as layer_claimable_amount,
        COUNT(CASE WHEN status = 'claimed' THEN 1 END) as layer_claimed_count,
        SUM(CASE WHEN status = 'claimed' THEN reward_amount ELSE 0 END) as layer_claimed_amount
    FROM layer_rewards 
    WHERE matrix_layer >= 2  -- 只统计层级奖励
    GROUP BY reward_recipient_wallet
) lr_stats ON m.wallet_address = lr_stats.reward_recipient_wallet
WHERE m.current_level >= 1;

-- 6. 更新 member_balance 表使用正确的逻辑
UPDATE member_balance 
SET 
    claimable_rewards = COALESCE(all_rewards.total_claimable_count, 0),
    claimable_amount_usdt = COALESCE(all_rewards.total_claimable, 0),
    claimed_rewards = COALESCE(all_rewards.total_claimed_count, 0),
    claimed_amount_usdt = COALESCE(all_rewards.total_claimed, 0),
    total_earned = COALESCE(all_rewards.total_earned, 0),
    reward_balance = COALESCE(all_rewards.total_claimable, 0),
    available_balance = COALESCE(all_rewards.total_claimable, 0),
    balance_updated = NOW()
FROM (
    SELECT 
        wallet_address,
        (direct_claimable_count + layer_claimable_count) as total_claimable_count,
        (direct_claimed_count + layer_claimed_count) as total_claimed_count,
        total_claimable,
        total_claimed,
        total_earned
    FROM member_all_rewards_view
) all_rewards
WHERE member_balance.wallet_address = all_rewards.wallet_address;

-- 7. 检查特定地址的修正结果（使用原始地址格式）
SELECT 'Corrected Results for 0xA657F135485D8D28e893fd40c638BeF0d636d98F' as section;

-- 会员基本信息
SELECT 
    'Member Info' as subsection,
    m.wallet_address,
    u.username,
    m.current_level,
    m.referrer_wallet
FROM members m
LEFT JOIN users u ON m.wallet_address = u.wallet_address
WHERE m.wallet_address = '0xA657F135485D8D28e893fd40c638BeF0d636d98F';

-- 作为推荐人的直推奖励
SELECT 
    'Direct Referral Rewards (as Referrer)' as subsection,
    drr.referred_member_wallet,
    u.username as referred_username,
    drr.reward_amount,
    drr.status,
    drr.created_at
FROM direct_referral_rewards drr
LEFT JOIN users u ON drr.referred_member_wallet = u.wallet_address
WHERE drr.referrer_wallet = '0xA657F135485D8D28e893fd40c638BeF0d636d98F'
ORDER BY drr.created_at;

-- 作为matrix root的层级奖励
SELECT 
    'Layer Rewards (as Matrix Root)' as subsection,
    lr.triggering_member_wallet,
    u.username as triggering_username,
    lr.matrix_layer,
    lr.reward_amount,
    lr.status,
    lr.created_at
FROM layer_rewards lr
LEFT JOIN users u ON lr.triggering_member_wallet = u.wallet_address
WHERE lr.reward_recipient_wallet = '0xA657F135485D8D28e893fd40c638BeF0d636d98F'
    AND lr.matrix_layer >= 2
ORDER BY lr.matrix_layer, lr.created_at;

-- 余额汇总
SELECT 
    'Balance Summary' as subsection,
    wallet_address,
    username,
    current_level,
    direct_claimable_amount,
    layer_claimable_amount,
    total_claimable,
    total_claimed,
    total_earned
FROM member_all_rewards_view
WHERE wallet_address = '0xA657F135485D8D28e893fd40c638BeF0d636d98F';

-- 8. 系统级验证报告
SELECT 'System Verification - Corrected Logic' as section;

-- 直推奖励统计
SELECT 
    'Direct Referral Rewards Stats' as subsection,
    COUNT(*) as total_direct_rewards,
    COUNT(CASE WHEN status = 'claimable' THEN 1 END) as claimable_count,
    SUM(CASE WHEN status = 'claimable' THEN reward_amount ELSE 0 END) as claimable_amount,
    COUNT(CASE WHEN status = 'claimed' THEN 1 END) as claimed_count,
    SUM(CASE WHEN status = 'claimed' THEN reward_amount ELSE 0 END) as claimed_amount
FROM direct_referral_rewards;

-- 层级奖励统计
SELECT 
    'Layer Rewards Stats (Layer 2-19)' as subsection,
    COUNT(*) as total_layer_rewards,
    COUNT(CASE WHEN status = 'claimable' THEN 1 END) as claimable_count,
    SUM(CASE WHEN status = 'claimable' THEN reward_amount ELSE 0 END) as claimable_amount,
    COUNT(CASE WHEN status = 'claimed' THEN 1 END) as claimed_count,
    SUM(CASE WHEN status = 'claimed' THEN reward_amount ELSE 0 END) as claimed_amount
FROM layer_rewards
WHERE matrix_layer >= 2;

-- 按层级统计奖励
SELECT 
    'Rewards by Layer' as subsection,
    matrix_layer,
    COUNT(*) as count,
    SUM(reward_amount) as total_amount,
    AVG(reward_amount) as avg_amount
FROM layer_rewards
WHERE matrix_layer >= 2
GROUP BY matrix_layer
ORDER BY matrix_layer;

-- 前10名受益者
SELECT 
    'Top 10 Reward Earners' as subsection,
    wallet_address,
    username,
    current_level,
    total_claimable,
    total_claimed,
    total_earned,
    direct_claimable_amount as direct_rewards,
    layer_claimable_amount as layer_rewards
FROM member_all_rewards_view
WHERE total_earned > 0
ORDER BY total_earned DESC, total_claimable DESC
LIMIT 10;

SELECT 'Reward logic correction completed successfully!' as final_status;
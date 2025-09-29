-- 修复奖励系统和会员余额脚本
-- 执行日期: 2025-09-29

-- 1. 创建修复日志表
CREATE TABLE IF NOT EXISTS reward_fix_log (
    id SERIAL PRIMARY KEY,
    wallet_address TEXT,
    fix_type VARCHAR(50),
    old_value NUMERIC(10,6),
    new_value NUMERIC(10,6),
    reason TEXT,
    fixed_at TIMESTAMP DEFAULT NOW()
);

-- 2. 统一 layer_rewards 和 reward_claims 数据
-- 将 claimable 状态的 layer_rewards 同步到 reward_claims
INSERT INTO reward_claims (
    root_wallet,
    triggering_member_wallet,
    layer,
    nft_level,
    reward_amount_usdc,
    status,
    created_at,
    metadata
)
SELECT 
    lr.reward_recipient_wallet as root_wallet,
    lr.triggering_member_wallet,
    lr.matrix_layer as layer,
    lr.triggering_nft_level as nft_level,
    lr.reward_amount as reward_amount_usdc,
    'claimable' as status,
    lr.created_at,
    jsonb_build_object(
        'source', 'layer_rewards_sync',
        'original_id', lr.id,
        'sync_date', NOW()
    ) as metadata
FROM layer_rewards lr
LEFT JOIN reward_claims rc ON (
    rc.root_wallet = lr.reward_recipient_wallet 
    AND rc.triggering_member_wallet = lr.triggering_member_wallet
    AND rc.layer = lr.matrix_layer
)
WHERE lr.status = 'claimable' 
    AND rc.id IS NULL
    AND lr.reward_recipient_wallet IS NOT NULL
    AND lr.triggering_member_wallet IS NOT NULL;

-- 记录同步操作
INSERT INTO reward_fix_log (wallet_address, fix_type, new_value, reason)
SELECT 
    lr.reward_recipient_wallet,
    'sync_to_claims',
    lr.reward_amount,
    'Synced claimable layer_rewards to reward_claims'
FROM layer_rewards lr
LEFT JOIN reward_claims rc ON (
    rc.root_wallet = lr.reward_recipient_wallet 
    AND rc.triggering_member_wallet = lr.triggering_member_wallet
    AND rc.layer = lr.matrix_layer
)
WHERE lr.status = 'claimable' 
    AND rc.id IS NULL
    AND lr.reward_recipient_wallet IS NOT NULL
    AND lr.triggering_member_wallet IS NOT NULL;

-- 3. 恢复被错误滚出的奖金
-- 检查那些因为等级不够而被滚出的奖金，但现在等级已经满足的情况
UPDATE layer_rewards 
SET 
    status = 'claimable',
    expires_at = NULL,
    rolled_up_to = NULL,
    roll_up_reason = NULL
FROM members m
WHERE layer_rewards.reward_recipient_wallet = m.wallet_address
    AND layer_rewards.status = 'rolled_up'
    AND layer_rewards.roll_up_reason = 'expired_timeout'
    AND m.current_level >= layer_rewards.recipient_required_level
    AND layer_rewards.reward_amount > 0;

-- 记录恢复操作
INSERT INTO reward_fix_log (wallet_address, fix_type, new_value, reason)
SELECT 
    lr.reward_recipient_wallet,
    'restore_rolled_up',
    lr.reward_amount,
    CONCAT('Restored rolled up reward - member now Level ', m.current_level)
FROM layer_rewards lr
JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
WHERE lr.reward_recipient_wallet = m.wallet_address
    AND lr.status = 'claimable'
    AND m.current_level >= lr.recipient_required_level
    AND lr.reward_amount > 0;

-- 4. 修复 member_balance_complete 表
-- 重新计算每个会员的奖金余额
UPDATE member_balance_complete mbc
SET 
    claimable_rewards = (
        SELECT COUNT(*)::INTEGER 
        FROM layer_rewards lr 
        WHERE lr.reward_recipient_wallet = mbc.wallet_address 
            AND lr.status = 'claimable'
    ),
    claimable_amount_usdt = (
        SELECT COALESCE(SUM(lr.reward_amount), 0)
        FROM layer_rewards lr 
        WHERE lr.reward_recipient_wallet = mbc.wallet_address 
            AND lr.status = 'claimable'
    ),
    claimed_rewards = (
        SELECT COUNT(*)::INTEGER
        FROM reward_claims rc 
        WHERE rc.root_wallet = mbc.wallet_address 
            AND rc.status = 'claimed'
    ),
    claimed_amount_usdt = (
        SELECT COALESCE(SUM(rc.reward_amount_usdc), 0)
        FROM reward_claims rc 
        WHERE rc.root_wallet = mbc.wallet_address 
            AND rc.status = 'claimed'
    ),
    total_earned = (
        SELECT COALESCE(SUM(lr.reward_amount), 0)
        FROM layer_rewards lr 
        WHERE lr.reward_recipient_wallet = mbc.wallet_address 
            AND lr.status IN ('claimable', 'claimed')
    ) + (
        SELECT COALESCE(SUM(rc.reward_amount_usdc), 0)
        FROM reward_claims rc 
        WHERE rc.root_wallet = mbc.wallet_address 
            AND rc.status = 'claimed'
    ),
    balance_updated = NOW()
WHERE mbc.current_level >= 1;

-- 记录余额修复
INSERT INTO reward_fix_log (wallet_address, fix_type, new_value, reason)
SELECT 
    wallet_address,
    'balance_recalculated',
    claimable_amount_usdt,
    'Recalculated member balance based on actual rewards'
FROM member_balance_complete 
WHERE current_level >= 1;

-- 5. 创建统一的奖金视图
CREATE OR REPLACE VIEW unified_rewards_view AS
SELECT 
    lr.reward_recipient_wallet as wallet_address,
    u.username,
    lr.triggering_member_wallet,
    ut.username as triggering_username,
    lr.matrix_layer as layer,
    lr.triggering_nft_level as nft_level,
    lr.reward_amount,
    lr.status,
    lr.created_at,
    'layer_rewards' as source_table,
    lr.id as source_id
FROM layer_rewards lr
LEFT JOIN users u ON lr.reward_recipient_wallet = u.wallet_address
LEFT JOIN users ut ON lr.triggering_member_wallet = ut.wallet_address

UNION ALL

SELECT 
    rc.root_wallet as wallet_address,
    u.username,
    rc.triggering_member_wallet,
    ut.username as triggering_username,
    rc.layer,
    rc.nft_level,
    rc.reward_amount_usdc as reward_amount,
    rc.status,
    rc.created_at,
    'reward_claims' as source_table,
    rc.id as source_id
FROM reward_claims rc
LEFT JOIN users u ON rc.root_wallet = u.wallet_address
LEFT JOIN users ut ON rc.triggering_member_wallet = ut.wallet_address;

-- 6. 创建奖金汇总统计视图
CREATE OR REPLACE VIEW member_rewards_summary AS
SELECT 
    m.wallet_address,
    u.username,
    m.current_level,
    
    -- Layer Rewards 统计
    COALESCE(lr_stats.claimable_count, 0) as lr_claimable_count,
    COALESCE(lr_stats.claimable_amount, 0) as lr_claimable_amount,
    COALESCE(lr_stats.claimed_count, 0) as lr_claimed_count,
    COALESCE(lr_stats.claimed_amount, 0) as lr_claimed_amount,
    COALESCE(lr_stats.rolled_up_count, 0) as lr_rolled_up_count,
    COALESCE(lr_stats.rolled_up_amount, 0) as lr_rolled_up_amount,
    
    -- Reward Claims 统计
    COALESCE(rc_stats.claimable_count, 0) as rc_claimable_count,
    COALESCE(rc_stats.claimable_amount, 0) as rc_claimable_amount,
    COALESCE(rc_stats.claimed_count, 0) as rc_claimed_count,
    COALESCE(rc_stats.claimed_amount, 0) as rc_claimed_amount,
    
    -- 总计
    COALESCE(lr_stats.claimable_amount, 0) + COALESCE(rc_stats.claimable_amount, 0) as total_claimable,
    COALESCE(lr_stats.claimed_amount, 0) + COALESCE(rc_stats.claimed_amount, 0) as total_claimed,
    COALESCE(lr_stats.claimable_amount, 0) + COALESCE(rc_stats.claimable_amount, 0) + 
    COALESCE(lr_stats.claimed_amount, 0) + COALESCE(rc_stats.claimed_amount, 0) as total_earned
    
FROM members m
LEFT JOIN users u ON m.wallet_address = u.wallet_address
LEFT JOIN (
    SELECT 
        reward_recipient_wallet,
        COUNT(CASE WHEN status = 'claimable' THEN 1 END) as claimable_count,
        SUM(CASE WHEN status = 'claimable' THEN reward_amount ELSE 0 END) as claimable_amount,
        COUNT(CASE WHEN status = 'claimed' THEN 1 END) as claimed_count,
        SUM(CASE WHEN status = 'claimed' THEN reward_amount ELSE 0 END) as claimed_amount,
        COUNT(CASE WHEN status = 'rolled_up' THEN 1 END) as rolled_up_count,
        SUM(CASE WHEN status = 'rolled_up' THEN reward_amount ELSE 0 END) as rolled_up_amount
    FROM layer_rewards 
    GROUP BY reward_recipient_wallet
) lr_stats ON m.wallet_address = lr_stats.reward_recipient_wallet
LEFT JOIN (
    SELECT 
        root_wallet,
        COUNT(CASE WHEN status = 'claimable' THEN 1 END) as claimable_count,
        SUM(CASE WHEN status = 'claimable' THEN reward_amount_usdc ELSE 0 END) as claimable_amount,
        COUNT(CASE WHEN status = 'claimed' THEN 1 END) as claimed_count,
        SUM(CASE WHEN status = 'claimed' THEN reward_amount_usdc ELSE 0 END) as claimed_amount
    FROM reward_claims 
    GROUP BY root_wallet
) rc_stats ON m.wallet_address = rc_stats.root_wallet
WHERE m.current_level >= 1;

-- 7. 验证修复结果
SELECT 'Fix Summary' as summary_type;
SELECT 
    COUNT(*) as total_members,
    SUM(CASE WHEN total_claimable > 0 THEN 1 ELSE 0 END) as members_with_claimable,
    SUM(total_claimable) as total_claimable_amount,
    SUM(total_claimed) as total_claimed_amount,
    SUM(total_earned) as total_earned_amount
FROM member_rewards_summary;

-- 显示修复日志
SELECT 'Fix Log' as log_type;
SELECT 
    fix_type,
    COUNT(*) as count,
    SUM(new_value) as total_amount,
    MIN(fixed_at) as first_fix,
    MAX(fixed_at) as last_fix
FROM reward_fix_log 
GROUP BY fix_type 
ORDER BY first_fix;
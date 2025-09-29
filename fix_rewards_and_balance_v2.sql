-- 修复奖励系统和会员余额脚本 V2
-- 执行日期: 2025-09-29

-- 1. 修复reward_claims表的expires_at字段约束
-- 先检查表结构并更新
ALTER TABLE reward_claims ALTER COLUMN expires_at DROP NOT NULL;

-- 2. 重新同步 layer_rewards 到 reward_claims（处理expires_at）
INSERT INTO reward_claims (
    root_wallet,
    triggering_member_wallet,
    layer,
    nft_level,
    reward_amount_usdc,
    status,
    created_at,
    expires_at,
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
    CASE 
        WHEN lr.expires_at IS NOT NULL THEN lr.expires_at 
        ELSE lr.created_at + INTERVAL '30 days'
    END as expires_at,
    jsonb_build_object(
        'source', 'layer_rewards_sync_v2',
        'original_id', lr.id,
        'sync_date', NOW()
    ) as metadata
FROM layer_rewards lr
LEFT JOIN reward_claims rc ON (
    rc.root_wallet = lr.reward_recipient_wallet 
    AND rc.triggering_member_wallet = lr.triggering_member_wallet
    AND rc.layer = lr.matrix_layer
    AND rc.metadata->>'source' LIKE 'layer_rewards_sync%'
)
WHERE lr.status = 'claimable' 
    AND rc.id IS NULL
    AND lr.reward_recipient_wallet IS NOT NULL
    AND lr.triggering_member_wallet IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. 创建member_balance表（如果不存在）
CREATE TABLE IF NOT EXISTS member_balance (
    wallet_address TEXT PRIMARY KEY,
    username TEXT,
    current_level INTEGER DEFAULT 1,
    reward_balance NUMERIC(18,6) DEFAULT 0,
    available_balance NUMERIC(18,6) DEFAULT 0,
    total_earned NUMERIC(18,6) DEFAULT 0,
    total_withdrawn NUMERIC(18,6) DEFAULT 0,
    claimable_rewards INTEGER DEFAULT 0,
    pending_rewards INTEGER DEFAULT 0,
    claimed_rewards INTEGER DEFAULT 0,
    claimable_amount_usdt NUMERIC(18,6) DEFAULT 0,
    claimed_amount_usdt NUMERIC(18,6) DEFAULT 0,
    balance_updated TIMESTAMP DEFAULT NOW()
);

-- 4. 同步会员基础信息到member_balance
INSERT INTO member_balance (
    wallet_address,
    username,
    current_level,
    balance_updated
)
SELECT 
    m.wallet_address,
    u.username,
    m.current_level,
    NOW()
FROM members m
LEFT JOIN users u ON m.wallet_address = u.wallet_address
ON CONFLICT (wallet_address) 
DO UPDATE SET 
    username = EXCLUDED.username,
    current_level = EXCLUDED.current_level,
    balance_updated = EXCLUDED.balance_updated;

-- 5. 重新计算每个会员的奖金余额
UPDATE member_balance 
SET 
    claimable_rewards = COALESCE(lr_stats.claimable_count, 0),
    claimable_amount_usdt = COALESCE(lr_stats.claimable_amount, 0),
    claimed_rewards = COALESCE(rc_stats.claimed_count, 0),
    claimed_amount_usdt = COALESCE(rc_stats.claimed_amount, 0),
    total_earned = COALESCE(lr_stats.total_earned, 0) + COALESCE(rc_stats.claimed_amount, 0),
    reward_balance = COALESCE(lr_stats.claimable_amount, 0),
    available_balance = COALESCE(lr_stats.claimable_amount, 0),
    balance_updated = NOW()
FROM (
    -- Layer rewards 统计
    SELECT 
        reward_recipient_wallet,
        COUNT(CASE WHEN status = 'claimable' THEN 1 END) as claimable_count,
        SUM(CASE WHEN status = 'claimable' THEN reward_amount ELSE 0 END) as claimable_amount,
        SUM(CASE WHEN status IN ('claimable', 'claimed') THEN reward_amount ELSE 0 END) as total_earned
    FROM layer_rewards 
    GROUP BY reward_recipient_wallet
) lr_stats ON member_balance.wallet_address = lr_stats.reward_recipient_wallet
LEFT JOIN (
    -- Reward claims 统计
    SELECT 
        root_wallet,
        COUNT(CASE WHEN status = 'claimed' THEN 1 END) as claimed_count,
        SUM(CASE WHEN status = 'claimed' THEN reward_amount_usdc ELSE 0 END) as claimed_amount
    FROM reward_claims 
    GROUP BY root_wallet
) rc_stats ON member_balance.wallet_address = rc_stats.root_wallet
WHERE member_balance.current_level >= 1;

-- 6. 创建奖金修复报告
SELECT 'Reward Fix Report' as report_title;

-- 总体统计
SELECT 
    'Overall Statistics' as section,
    COUNT(*) as total_members,
    SUM(CASE WHEN claimable_amount_usdt > 0 THEN 1 ELSE 0 END) as members_with_rewards,
    SUM(claimable_amount_usdt) as total_claimable,
    SUM(claimed_amount_usdt) as total_claimed,
    SUM(total_earned) as total_earned,
    SUM(claimable_rewards) as total_claimable_count,
    SUM(claimed_rewards) as total_claimed_count
FROM member_balance 
WHERE current_level >= 1;

-- 按等级统计
SELECT 
    'By Level' as section,
    current_level,
    COUNT(*) as members,
    SUM(claimable_amount_usdt) as claimable_amount,
    SUM(claimed_amount_usdt) as claimed_amount,
    AVG(claimable_amount_usdt) as avg_claimable
FROM member_balance 
WHERE current_level >= 1
GROUP BY current_level
ORDER BY current_level DESC;

-- 前10名奖金获得者
SELECT 
    'Top Earners' as section,
    wallet_address,
    username,
    current_level,
    claimable_amount_usdt,
    claimed_amount_usdt,
    total_earned,
    claimable_rewards,
    claimed_rewards
FROM member_balance 
WHERE current_level >= 1
ORDER BY total_earned DESC, claimable_amount_usdt DESC
LIMIT 10;

-- 7. 检查修复前后的变化
SELECT 'Comparison with old data' as section;
SELECT 
    'member_balance vs member_balance_complete' as comparison,
    COUNT(*) as records_compared,
    SUM(CASE WHEN mb.claimable_amount_usdt != mbc.claimable_amount_usdt THEN 1 ELSE 0 END) as differences_found,
    SUM(mb.claimable_amount_usdt) as new_total_claimable,
    SUM(mbc.claimable_amount_usdt) as old_total_claimable,
    SUM(mb.claimable_amount_usdt) - SUM(mbc.claimable_amount_usdt) as difference
FROM member_balance mb
JOIN member_balance_complete mbc ON mb.wallet_address = mbc.wallet_address
WHERE mb.current_level >= 1;

-- 8. 验证数据完整性
SELECT 'Data Integrity Check' as section;

-- 检查 layer_rewards 和 reward_claims 的一致性
SELECT 
    'Layer vs Claims Consistency' as check_type,
    lr.claimable_count as lr_claimable,
    rc.claimable_count as rc_claimable,
    lr.claimable_amount as lr_amount,
    rc.claimable_amount as rc_amount
FROM (
    SELECT 
        COUNT(*) as claimable_count,
        SUM(reward_amount) as claimable_amount
    FROM layer_rewards 
    WHERE status = 'claimable'
) lr
CROSS JOIN (
    SELECT 
        COUNT(*) as claimable_count,
        SUM(reward_amount_usdc) as claimable_amount
    FROM reward_claims 
    WHERE status = 'claimable'
) rc;

-- 记录修复完成时间
INSERT INTO reward_fix_log (wallet_address, fix_type, new_value, reason)
VALUES ('SYSTEM', 'fix_completed', 0, CONCAT('Rewards and balance fix completed at ', NOW()));

SELECT 'Fix completed successfully!' as status;
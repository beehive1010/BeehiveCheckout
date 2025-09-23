-- 修复所有members的奖励逻辑
-- 删除所有不符合逻辑的奖励记录，重新生成正确的奖励

BEGIN;

-- 1. 首先备份当前的奖励数据
CREATE TEMP TABLE reward_backup AS
SELECT * FROM layer_rewards;

-- 2. 删除所有不正确的奖励记录（保留已claimed的）
DELETE FROM layer_rewards 
WHERE status != 'claimed';

-- 3. 重新生成正确的奖励记录
-- 规则：只有当triggering member的level >= layer时，才产生该layer的奖励
INSERT INTO layer_rewards (
    triggering_member_wallet,
    reward_recipient_wallet,
    matrix_root_wallet,
    triggering_nft_level,
    reward_amount,
    layer_position,
    matrix_layer,
    status,
    recipient_required_level,
    recipient_current_level,
    created_at
)
SELECT 
    mtv.member_wallet as triggering_member_wallet,
    mtv.matrix_root_wallet as reward_recipient_wallet,
    mtv.matrix_root_wallet as matrix_root_wallet,
    tm.current_level as triggering_nft_level,
    -- 正确的奖励金额：Layer 1=100, Layer 2=150, Layer 3=200...
    CASE mtv.layer
        WHEN 1 THEN 100.00
        WHEN 2 THEN 150.00
        WHEN 3 THEN 200.00
        WHEN 4 THEN 250.00
        WHEN 5 THEN 300.00
        WHEN 6 THEN 350.00
        WHEN 7 THEN 400.00
        WHEN 8 THEN 450.00
        WHEN 9 THEN 500.00
        WHEN 10 THEN 550.00
        WHEN 11 THEN 600.00
        WHEN 12 THEN 650.00
        WHEN 13 THEN 700.00
        WHEN 14 THEN 750.00
        WHEN 15 THEN 800.00
        WHEN 16 THEN 850.00
        WHEN 17 THEN 900.00
        WHEN 18 THEN 950.00
        WHEN 19 THEN 1000.00
        ELSE 100.00
    END as reward_amount,
    mtv.position as layer_position,
    mtv.layer as matrix_layer,
    -- 状态基于接收者等级vs所需layer等级
    CASE 
        WHEN rm.current_level >= mtv.layer THEN 'claimable'
        ELSE 'pending'
    END as status,
    mtv.layer as recipient_required_level, -- 所需等级 = layer编号
    rm.current_level as recipient_current_level,
    mtv.activation_time as created_at
FROM matrix_referrals_tree_view mtv
-- 获取triggering member信息
JOIN members tm ON tm.wallet_address = mtv.member_wallet
-- 获取reward recipient信息
JOIN members rm ON rm.wallet_address = mtv.matrix_root_wallet
WHERE mtv.is_activated = true
  -- 关键条件：只有当triggering member的level >= layer时才产生奖励
  AND tm.current_level >= mtv.layer
  -- 避免重复创建已存在的奖励
  AND NOT EXISTS (
      SELECT 1 FROM layer_rewards lr 
      WHERE lr.matrix_root_wallet = mtv.matrix_root_wallet
      AND lr.triggering_member_wallet = mtv.member_wallet
      AND lr.matrix_layer = mtv.layer
  );

-- 4. 统计修复结果
SELECT 
    'Fix Results Summary' as description,
    (SELECT COUNT(*) FROM reward_backup WHERE status != 'claimed') as deleted_incorrect_rewards,
    (SELECT COUNT(*) FROM layer_rewards WHERE created_at = NOW()::date) as newly_created_rewards,
    (SELECT COUNT(*) FROM layer_rewards WHERE status = 'claimed') as preserved_claimed_rewards;

-- 5. 验证修复后的状态
SELECT 
    'Post-Fix Validation' as description,
    status,
    COUNT(*) as count,
    SUM(reward_amount) as total_amount
FROM layer_rewards 
GROUP BY status
ORDER BY 
    CASE status 
        WHEN 'claimable' THEN 1 
        WHEN 'pending' THEN 2 
        WHEN 'claimed' THEN 3 
        ELSE 4 
    END;

-- 6. 检查几个主要钱包的奖励状态
SELECT 
    'Sample Wallet Check' as description,
    reward_recipient_wallet,
    status,
    COUNT(*) as reward_count,
    SUM(reward_amount) as total_amount
FROM layer_rewards 
WHERE reward_recipient_wallet IN (
    '0xa212A85f7434A5EBAa5b468971EC3972cE72a544',
    '0x0000000000000000000000000000000000000001',
    '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
)
GROUP BY reward_recipient_wallet, status
ORDER BY reward_recipient_wallet, status;

COMMIT;
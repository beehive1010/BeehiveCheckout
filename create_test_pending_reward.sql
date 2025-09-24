-- 为测试会员创建一个pending reward来测试倒计时组件效果
-- 钱包地址: 0xa212A85f7434A5EBAa5b468971EC3972cE72a544

\echo '=== 创建测试用的Pending Reward ==='

-- 1. 先查看当前会员状态
SELECT 
    'Current Member Status' as info,
    wallet_address,
    current_level,
    direct_referrals_count
FROM members 
WHERE wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544';

\echo ''

-- 2. 创建一个Layer 2 R位置的pending奖励（需要Level 3+才能领取）
INSERT INTO layer_rewards (
    reward_recipient_wallet,
    triggering_member_wallet,
    matrix_root_wallet,
    triggering_nft_level,
    matrix_layer,
    layer_position,
    reward_amount,
    status,
    recipient_required_level,
    recipient_current_level,
    direct_referrals_required,
    direct_referrals_current,
    requires_direct_referrals,
    created_at,
    expires_at,
    roll_up_reason
) VALUES (
    '0xa212A85f7434A5EBAa5b468971EC3972cE72a544',
    '0x1234567890123456789012345678901234567890',  -- 假的触发者地址
    '0xa212A85f7434A5EBAa5b468971EC3972cE72a544',
    3,  -- Level 3 NFT activation triggered this reward
    2,  -- Layer 2 reward
    'R',  -- R position (第三个奖励)
    200.00,  -- Layer 2 reward amount
    'pending',  -- Status: pending because user is Level 2 but needs Level 3+
    3,  -- Required Level 3+ for Layer 2 R position
    2,  -- Current level is 2 (from members table)
    0,  -- No direct referrals required
    0,  -- Current direct referrals (not relevant for R position)
    false,  -- R position does not require direct referrals
    NOW(),
    NOW() + INTERVAL '72 hours',  -- 72-hour countdown
    NULL  -- No rollup reason yet
);

\echo ''

-- 3. 获取刚创建的reward ID
DO $$
DECLARE
    new_reward_id UUID;
BEGIN
    -- Get the reward ID we just created
    SELECT id INTO new_reward_id 
    FROM layer_rewards 
    WHERE reward_recipient_wallet ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
      AND matrix_layer = 2 
      AND layer_position = 'R'
      AND status = 'pending'
    ORDER BY created_at DESC 
    LIMIT 1;

    -- Create countdown timer for the pending reward
    INSERT INTO countdown_timers (
        wallet_address,
        timer_type,
        title,
        description,
        start_time,
        end_time,
        is_active,
        auto_action,
        metadata,
        related_reward_id
    ) VALUES (
        '0xa212A85f7434A5EBAa5b468971EC3972cE72a544',
        'pending_reward',
        'Layer 2 R Position Upgrade Incentive',
        'Layer 2 R Position: Upgrade to Level 3+ to claim this 200 USDT reward! You currently have Level 2. This is a great opportunity to level up and unlock higher rewards!',
        NOW(),
        NOW() + INTERVAL '72 hours',
        true,
        'expire_reward',
        json_build_object(
            'reward_id', new_reward_id,
            'reward_amount', 200.00,
            'reward_layer', 2,
            'layer_position', 'R',
            'required_level', 3,
            'current_level', 2,
            'is_r_position_upgrade_incentive', true,
            'upgrade_message', 'Upgrade to Level 3+ to claim this Layer 2 R reward!',
            'incentive_text', 'This is your upgrade incentive! Level up now to claim 200 USDT!',
            'rollup_warning', 'This reward will rollup to qualified upline members if not claimed within 72 hours',
            'test_reward', true,
            'created_for_demo', true
        ),
        new_reward_id
    );

    RAISE NOTICE 'Created test pending reward with ID: %', new_reward_id;
END $$;

\echo ''

-- 4. 验证创建的测试数据
SELECT 
    'Test Pending Reward Created' as status,
    lr.id as reward_id,
    lr.reward_recipient_wallet,
    lr.matrix_layer,
    lr.layer_position,
    lr.reward_amount,
    lr.status,
    lr.recipient_current_level,
    lr.recipient_required_level,
    lr.expires_at,
    EXTRACT(EPOCH FROM (lr.expires_at - NOW()))/3600 as hours_remaining,
    '🚀 Ready for testing!' as demo_status
FROM layer_rewards lr
WHERE lr.reward_recipient_wallet ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
  AND lr.matrix_layer = 2 
  AND lr.layer_position = 'R'
  AND lr.status = 'pending'
ORDER BY lr.created_at DESC 
LIMIT 1;

\echo ''

-- 5. 验证countdown timer
SELECT 
    'Test Countdown Timer Created' as status,
    ct.id as timer_id,
    ct.wallet_address,
    ct.timer_type,
    ct.title,
    ct.description,
    ct.is_active,
    EXTRACT(EPOCH FROM (ct.end_time - NOW()))/3600 as hours_remaining,
    ct.metadata->>'upgrade_message' as upgrade_message,
    '⏰ Timer active!' as demo_status
FROM countdown_timers ct
WHERE ct.wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
  AND ct.timer_type = 'pending_reward'
  AND ct.is_active = true
ORDER BY ct.start_time DESC 
LIMIT 1;

\echo ''

-- 6. 显示测试用户现在的所有奖励状况
SELECT 
    'All Rewards for Test User' as summary,
    lr.id,
    lr.matrix_layer,
    lr.layer_position,
    lr.reward_amount,
    lr.status,
    CASE 
        WHEN lr.status = 'pending' THEN '⏳ Pending (Demo)'
        WHEN lr.status = 'claimable' THEN '✅ Claimable'
        WHEN lr.status = 'claimed' THEN '💰 Claimed'
        ELSE lr.status
    END as status_display,
    CASE 
        WHEN lr.expires_at IS NOT NULL THEN 
            ROUND(EXTRACT(EPOCH FROM (lr.expires_at - NOW()))/3600, 1)
        ELSE NULL 
    END as hours_remaining
FROM layer_rewards lr
WHERE lr.reward_recipient_wallet ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
ORDER BY lr.matrix_layer, lr.layer_position;

\echo ''
\echo '=== 测试说明 ==='
\echo '✅ 已为测试用户创建了一个Layer 2 R位置的pending reward'
\echo '⏰ 倒计时设置为72小时'
\echo '🎯 用户需要从Level 2升级到Level 3+才能领取200 USDT'
\echo '🚀 现在可以在前端界面查看倒计时组件效果！'
\echo '📱 PendingRewardsTimer组件会显示这个upgrade incentive'
\echo '⚡ 用户界面会显示升级提示和剩余时间'
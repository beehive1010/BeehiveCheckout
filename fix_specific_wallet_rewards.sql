-- Fix specific wallet rewards that should be pending but are claimable
-- Wallet: 0xa212A85f7434A5EBAa5b468971EC3972cE72a544

\echo '=== Checking rewards for wallet 0xa212A85f7434A5EBAa5b468971EC3972cE72a544 ==='

SELECT 
    id,
    reward_recipient_wallet,
    matrix_layer,
    layer_position,
    reward_amount,
    status,
    recipient_required_level,
    recipient_current_level,
    created_at,
    expires_at
FROM layer_rewards 
WHERE reward_recipient_wallet ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
ORDER BY matrix_layer, layer_position;

\echo ''
\echo '=== Checking current level of this wallet ==='

SELECT 
    wallet_address,
    current_level,
    username
FROM members 
WHERE wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544';

\echo ''
\echo '=== Fixing R position rewards that should be pending ==='

-- 修复Layer1 R位置奖励（应该需要Level2+）
UPDATE layer_rewards
SET 
    status = CASE 
        WHEN recipient_current_level >= 2 THEN 'claimable'
        ELSE 'pending'
    END,
    recipient_required_level = 2,  -- Layer1 R需要Level2+
    expires_at = CASE 
        WHEN recipient_current_level >= 2 THEN NULL
        ELSE NOW() + INTERVAL '72 hours'
    END,
    requires_direct_referrals = false,  -- 不需要直推
    direct_referrals_required = 0
WHERE reward_recipient_wallet ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
  AND matrix_layer = 1 
  AND layer_position = 'R';

-- 修复Layer2 R位置奖励（应该需要Level3+）
UPDATE layer_rewards
SET 
    status = CASE 
        WHEN recipient_current_level >= 3 THEN 'claimable'
        ELSE 'pending'
    END,
    recipient_required_level = 3,  -- Layer2 R需要Level3+
    expires_at = CASE 
        WHEN recipient_current_level >= 3 THEN NULL
        ELSE NOW() + INTERVAL '72 hours'
    END,
    requires_direct_referrals = false,
    direct_referrals_required = 0
WHERE reward_recipient_wallet ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
  AND matrix_layer = 2 
  AND layer_position = 'R';

-- 修复Layer3 R位置奖励（应该需要Level4+）
UPDATE layer_rewards
SET 
    status = CASE 
        WHEN recipient_current_level >= 4 THEN 'claimable'
        ELSE 'pending'
    END,
    recipient_required_level = 4,  -- Layer3 R需要Level4+
    expires_at = CASE 
        WHEN recipient_current_level >= 4 THEN NULL
        ELSE NOW() + INTERVAL '72 hours'
    END,
    requires_direct_referrals = false,
    direct_referrals_required = 0
WHERE reward_recipient_wallet ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
  AND matrix_layer = 3 
  AND layer_position = 'R';

-- 为新的pending奖励创建countdown timers
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
)
SELECT 
    lr.reward_recipient_wallet,
    'pending_reward',
    format('Layer %s R Position Reward', lr.matrix_layer),
    format('Layer %s R Position: Need Level %s+ to claim this %s USDT reward. You currently have Level %s.',
           lr.matrix_layer, lr.recipient_required_level, lr.reward_amount, lr.recipient_current_level),
    NOW(),
    lr.expires_at,
    true,
    'expire_reward',
    json_build_object(
        'reward_id', lr.id,
        'reward_amount', lr.reward_amount,
        'reward_layer', lr.matrix_layer,
        'layer_position', lr.layer_position,
        'required_level', lr.recipient_required_level,
        'current_level', lr.recipient_current_level,
        'is_r_position_upgrade_incentive', true
    ),
    lr.id
FROM layer_rewards lr
WHERE lr.reward_recipient_wallet ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
  AND lr.status = 'pending'
  AND lr.layer_position = 'R'
  AND lr.expires_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM countdown_timers ct 
    WHERE ct.related_reward_id = lr.id 
    AND ct.is_active = true
  );

\echo ''
\echo '=== Results after fix ==='

SELECT 
    id,
    reward_recipient_wallet,
    matrix_layer,
    layer_position,
    reward_amount,
    status,
    recipient_required_level,
    recipient_current_level,
    expires_at,
    CASE 
        WHEN status = 'pending' AND expires_at IS NOT NULL THEN 'Needs upgrade incentive'
        WHEN status = 'claimable' THEN 'Ready to claim'
        ELSE 'Other status'
    END as fix_status
FROM layer_rewards 
WHERE reward_recipient_wallet ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
ORDER BY matrix_layer, layer_position;

\echo ''
\echo '=== Checking countdown timers for this wallet ==='

SELECT 
    ct.id,
    ct.wallet_address,
    ct.timer_type,
    ct.title,
    ct.is_active,
    ct.end_time,
    lr.matrix_layer,
    lr.layer_position
FROM countdown_timers ct
JOIN layer_rewards lr ON ct.related_reward_id = lr.id
WHERE ct.wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
  AND ct.is_active = true
ORDER BY lr.matrix_layer, lr.layer_position;
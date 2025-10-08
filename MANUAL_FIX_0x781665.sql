-- 手动补充 members 记录
-- 用户: 0x781665DaeD20238fFA341085aA77d31b8c0Cf68C
-- 问题: membership 记录存在，但 members 记录缺失

-- Step 1: 检查当前状态
SELECT 'Current membership record:' as status;
SELECT * FROM membership WHERE wallet_address ILIKE '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C';

SELECT 'Current members record (should be empty):' as status;
SELECT * FROM members WHERE wallet_address ILIKE '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C';

SELECT 'User registration:' as status;
SELECT wallet_address, referrer_wallet, created_at FROM users WHERE wallet_address ILIKE '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C';

-- Step 2: Get next activation sequence
SELECT 'Next activation sequence:' as status;
SELECT get_next_activation_sequence() as next_sequence;

-- Step 3: 创建 members 记录
-- 注意：这将自动触发所有相关触发器
-- - trg_auto_supplement_new_member → referrals
-- - trigger_auto_create_balance_with_initial → user_balances
-- - trigger_recursive_matrix_placement → matrix_referrals
-- - trigger_member_initial_level1_rewards → layer_rewards

INSERT INTO members (
  wallet_address,
  referrer_wallet,
  current_level,
  activation_sequence,
  activation_time,
  total_nft_claimed
)
SELECT
  '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C',
  u.referrer_wallet,
  1,
  get_next_activation_sequence(),
  m.claimed_at,
  1
FROM users u
CROSS JOIN membership m
WHERE u.wallet_address ILIKE '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C'
  AND m.wallet_address ILIKE '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C'
  AND m.nft_level = 1
  AND NOT EXISTS (
    SELECT 1 FROM members
    WHERE wallet_address ILIKE '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C'
  );

-- Step 4: 验证创建结果
SELECT 'Created members record:' as status;
SELECT * FROM members WHERE wallet_address ILIKE '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C';

SELECT 'Created referrals record:' as status;
SELECT * FROM referrals WHERE member_wallet ILIKE '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C';

SELECT 'Created user_balances record:' as status;
SELECT wallet_address, bcc_balance, bcc_locked, reward_balance FROM user_balances WHERE wallet_address ILIKE '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C';

SELECT 'Created matrix_referrals records:' as status;
SELECT member_wallet, matrix_root_wallet, layer, matrix_position FROM matrix_referrals WHERE member_wallet ILIKE '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C' ORDER BY layer;

SELECT 'Created layer_rewards for referrer:' as status;
SELECT
  reward_recipient_wallet,
  triggering_member_wallet,
  reward_amount,
  status,
  created_at
FROM layer_rewards
WHERE triggering_member_wallet ILIKE '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C'
ORDER BY created_at DESC;

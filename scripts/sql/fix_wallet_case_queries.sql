-- 修复数据库中钱包地址大小写不一致问题
-- 注意：这个脚本会更新数据库中的地址格式

\echo '🔧 开始修复钱包地址大小写不一致问题...'

-- 1. 创建地址映射表（主要已知地址的正确格式）
CREATE TEMP TABLE address_mapping AS 
SELECT 
    '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E' as correct_address,
    ARRAY['0xc813218a28e130b46f8247f0a23f0bd841a8db4e', '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'] as variations
UNION ALL
SELECT 
    '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C',
    ARRAY['0x781665daed20238ffa341085aa77d31b8c0cf68c', '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C']
UNION ALL
SELECT 
    '0xF9e54564D273531F97F95291BAF0C3d74F337937',
    ARRAY['0xf9e54564d273531f97f95291baf0c3d74f337937', '0xF9e54564D273531F97F95291BAF0C3d74F337937']
UNION ALL
SELECT 
    '0xfD6f46A7DF6398814a54db994D04195C3bC6beFD',
    ARRAY['0xfd6f46a7df6398814a54db994d04195c3bc6befd', '0xfD6f46A7DF6398814a54db994D04195C3bC6beFD'];

\echo '📋 地址映射表创建完成'

-- 2. 修复user_balances表中的小写地址
\echo '🔄 修复user_balances表...'
UPDATE user_balances ub
SET wallet_address = am.correct_address
FROM address_mapping am
WHERE LOWER(ub.wallet_address) = ANY(SELECT LOWER(unnest(am.variations)) FROM address_mapping am2 WHERE am2.correct_address = am.correct_address);

-- 3. 修复referrals表中的小写地址
\echo '🔄 修复referrals表...'

-- 修复member_wallet字段
UPDATE referrals r
SET member_wallet = am.correct_address
FROM address_mapping am
WHERE LOWER(r.member_wallet) = ANY(SELECT LOWER(unnest(am.variations)) FROM address_mapping am2 WHERE am2.correct_address = am.correct_address);

-- 修复matrix_root_wallet字段  
UPDATE referrals r
SET matrix_root_wallet = am.correct_address
FROM address_mapping am
WHERE LOWER(r.matrix_root_wallet) = ANY(SELECT LOWER(unnest(am.variations)) FROM address_mapping am2 WHERE am2.correct_address = am.correct_address);

-- 修复referrer_wallet字段
UPDATE referrals r
SET referrer_wallet = am.correct_address
FROM address_mapping am
WHERE LOWER(r.referrer_wallet) = ANY(SELECT LOWER(unnest(am.variations)) FROM address_mapping am2 WHERE am2.correct_address = am.correct_address);

-- 4. 修复layer_rewards表中的地址
\echo '🔄 修复layer_rewards表...'
UPDATE layer_rewards lr
SET reward_recipient_wallet = am.correct_address
FROM address_mapping am
WHERE LOWER(lr.reward_recipient_wallet) = ANY(SELECT LOWER(unnest(am.variations)) FROM address_mapping am2 WHERE am2.correct_address = am.correct_address);

UPDATE layer_rewards lr
SET triggering_member_wallet = am.correct_address
FROM address_mapping am
WHERE LOWER(lr.triggering_member_wallet) = ANY(SELECT LOWER(unnest(am.variations)) FROM address_mapping am2 WHERE am2.correct_address = am.correct_address);

UPDATE layer_rewards lr
SET matrix_root_wallet = am.correct_address
FROM address_mapping am
WHERE LOWER(lr.matrix_root_wallet) = ANY(SELECT LOWER(unnest(am.variations)) FROM address_mapping am2 WHERE am2.correct_address = am.correct_address);

-- 5. 验证修复结果
\echo '📊 验证修复结果...'

-- 检查所有表中的地址格式
SELECT 
    'users' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN wallet_address ~ '^0x[a-f0-9]{40}$' THEN 1 END) as lowercase_addresses,
    COUNT(CASE WHEN wallet_address ~ '^0x[A-Fa-f0-9]{40}$' AND wallet_address !~ '^0x[a-f0-9]{40}$' THEN 1 END) as mixed_case_addresses
FROM users

UNION ALL

SELECT 
    'members',
    COUNT(*),
    COUNT(CASE WHEN wallet_address ~ '^0x[a-f0-9]{40}$' THEN 1 END),
    COUNT(CASE WHEN wallet_address ~ '^0x[A-Fa-f0-9]{40}$' AND wallet_address !~ '^0x[a-f0-9]{40}$' THEN 1 END)
FROM members

UNION ALL

SELECT 
    'user_balances',
    COUNT(*),
    COUNT(CASE WHEN wallet_address ~ '^0x[a-f0-9]{40}$' THEN 1 END),
    COUNT(CASE WHEN wallet_address ~ '^0x[A-Fa-f0-9]{40}$' AND wallet_address !~ '^0x[a-f0-9]{40}$' THEN 1 END)
FROM user_balances

UNION ALL

SELECT 
    'referrals_member',
    COUNT(*),
    COUNT(CASE WHEN member_wallet ~ '^0x[a-f0-9]{40}$' THEN 1 END),
    COUNT(CASE WHEN member_wallet ~ '^0x[A-Fa-f0-9]{40}$' AND member_wallet !~ '^0x[a-f0-9]{40}$' THEN 1 END)
FROM referrals;

\echo '✅ 钱包地址大小写修复完成!'
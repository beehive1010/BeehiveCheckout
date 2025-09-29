-- 修复被错误溢出的直推成员
-- 问题：序列5-8的直推成员被溢出到其他人的matrix，应该回到推荐人的Layer 2

\echo '🔧 修复被错误溢出的直推成员...'

-- 检查当前被错误放置的直推成员
\echo '📊 当前被错误放置的直推成员:'
SELECT 
    r.member_wallet,
    r.matrix_root_wallet as current_root,
    r.matrix_layer,
    r.matrix_position,
    r.member_activation_sequence,
    m.referrer_wallet as should_be_in_root
FROM referrals r
JOIN members m ON r.member_wallet = m.wallet_address
WHERE r.member_wallet IN (
    '0xTEST7734000000000000000000TEST',
    '0xTEST8427000000000000000000TEST',
    '0xTEST8548000000000000000000TEST',
    '0xTEST0397000000000000000000TEST'
)
ORDER BY r.member_activation_sequence;

\echo '🎯 将这些成员移动到正确的matrix位置...'

-- 删除当前的错误placement
DELETE FROM referrals 
WHERE member_wallet IN (
    '0xTEST7734000000000000000000TEST',
    '0xTEST8427000000000000000000TEST',
    '0xTEST8548000000000000000000TEST',
    '0xTEST0397000000000000000000TEST'
);

-- 重新正确放置到推荐人的Layer 1（补满L/M/R的剩余位置）或Layer 2
-- 0xC813218A28E130B46f8247F0a23F0BD841A8DB4E的Layer 1已满(L/M/R)，这4个应该进入Layer 2的L位置前面

-- 检查Layer 2 L位置的当前序列
\echo '📊 当前Layer 2 L位置的成员:'
SELECT 
    member_wallet,
    member_activation_sequence
FROM referrals
WHERE matrix_root_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
AND matrix_layer = 2
AND matrix_position = 'L'
ORDER BY member_activation_sequence;

-- 将原L位置后3个成员移到M位置，为序列5-8腾出空间
UPDATE referrals 
SET matrix_position = 'M'
WHERE matrix_root_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
AND matrix_layer = 2
AND matrix_position = 'L'
AND member_activation_sequence IN (10, 11);

-- 将原M位置的成员移到R位置
UPDATE referrals 
SET matrix_position = 'R'
WHERE matrix_root_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
AND matrix_layer = 2
AND matrix_position = 'M'
AND member_activation_sequence IN (12, 13, 14);

-- 插入被遗漏的直推成员到Layer 2
INSERT INTO referrals (
    member_wallet,
    matrix_root_wallet,
    matrix_layer,
    matrix_position,
    member_activation_sequence,
    is_direct_referral,
    is_spillover_placement,
    placed_at
) VALUES 
-- Layer 2 L位置 (序列5-7)
('0xTEST7734000000000000000000TEST', '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E', 2, 'L', 5, true, false, NOW()),
('0xTEST8427000000000000000000TEST', '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E', 2, 'L', 6, true, false, NOW()),
('0xTEST8548000000000000000000TEST', '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E', 2, 'L', 7, true, false, NOW()),
-- Layer 2 M位置第一个 (序列8)  
('0xTEST0397000000000000000000TEST', '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E', 2, 'M', 8, true, false, NOW());

\echo '📊 修复后的完整matrix分布:'
SELECT 
    '=== Layer 1 ===' as section,
    NULL as wallet,
    NULL as position,
    NULL as sequence
UNION ALL
SELECT 
    'Layer 1' as section,
    r.member_wallet as wallet,
    r.matrix_position as position,
    r.member_activation_sequence::text as sequence
FROM referrals r
WHERE r.matrix_root_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
AND r.matrix_layer = 1
UNION ALL
SELECT 
    '=== Layer 2 ===' as section,
    NULL as wallet,
    NULL as position,
    NULL as sequence
UNION ALL
SELECT 
    'Layer 2' as section,
    r.member_wallet as wallet,
    r.matrix_position as position,
    r.member_activation_sequence::text as sequence
FROM referrals r
WHERE r.matrix_root_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
AND r.matrix_layer = 2
ORDER BY section, position, sequence::int;

\echo '📈 最终统计:'
SELECT 
    matrix_layer,
    matrix_position,
    COUNT(*) as member_count
FROM referrals
WHERE matrix_root_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
GROUP BY matrix_layer, matrix_position
ORDER BY matrix_layer, matrix_position;

\echo '✅ 直推成员溢出问题修复完成!'
-- 完成剩余5个成员的溢出安置
-- 序列14-17, 19的成员需要继续溢出到Layer 1成员的Layer 2

\echo '🔧 完成剩余5个成员的溢出安置...'

-- 首先检查哪些成员还未安置
\echo '📊 检查未安置的直推成员:'
WITH direct_referrals AS (
    SELECT wallet_address, activation_sequence
    FROM members 
    WHERE referrer_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
),
placed_members AS (
    SELECT member_wallet
    FROM referrals
    WHERE referrer_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
)
SELECT 
    dr.wallet_address,
    dr.activation_sequence,
    CASE WHEN pm.member_wallet IS NULL THEN '❌ 未安置' ELSE '✅ 已安置' END as status
FROM direct_referrals dr
LEFT JOIN placed_members pm ON dr.wallet_address = pm.member_wallet
ORDER BY dr.activation_sequence;

-- 查找这些未安置成员的wallet地址
\echo '📋 未安置成员列表:'
SELECT 
    m.wallet_address,
    m.activation_sequence
FROM members m
WHERE m.referrer_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
AND m.wallet_address NOT IN (
    SELECT member_wallet 
    FROM referrals 
    WHERE referrer_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
)
ORDER BY m.activation_sequence;

-- 检查Layer 1成员的matrix空位情况
\echo '📊 检查Layer 1成员的matrix空位:'
WITH layer1_members AS (
    SELECT member_wallet, member_activation_sequence as seq
    FROM referrals
    WHERE matrix_root_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
    AND matrix_layer = 1
),
matrix_space AS (
    SELECT 
        l1.member_wallet as matrix_root,
        l1.seq,
        COUNT(r.member_wallet) as current_count,
        3 - COUNT(r.member_wallet) as available_space
    FROM layer1_members l1
    LEFT JOIN referrals r ON r.matrix_root_wallet = l1.member_wallet AND r.matrix_layer = 1
    GROUP BY l1.member_wallet, l1.seq
)
SELECT 
    matrix_root,
    seq,
    current_count,
    available_space,
    CASE WHEN available_space > 0 THEN '✅ 有空位' ELSE '❌ 已满' END as status
FROM matrix_space
ORDER BY seq;

-- 将剩余成员按激活顺序安置到Layer 1成员的matrix中
-- 序列14: 到L成员(0xTEST7705)的Layer 2第一个位置
-- 序列15: 到L成员(0xTEST7705)的Layer 2第二个位置  
-- 序列16: 到L成员(0xTEST7705)的Layer 2第三个位置
-- 序列17: 到M成员(0xTEST7713)的Layer 2第一个位置
-- 序列19: 到M成员(0xTEST7713)的Layer 2第二个位置

\echo '🎯 安置剩余成员到Layer 1成员的Layer 2...'

-- 插入序列14-17,19到对应的Layer 2位置
INSERT INTO referrals (
    member_wallet,
    referrer_wallet,
    matrix_root_wallet,
    matrix_root_sequence,
    matrix_layer,
    matrix_position,
    member_activation_sequence,
    is_direct_referral,
    is_spillover_placement,
    placed_at
)
SELECT 
    m.wallet_address,
    '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E',
    placement.matrix_root,
    placement.root_seq,
    2,
    placement.position,
    m.activation_sequence,
    true,
    true,
    NOW()
FROM members m
CROSS JOIN (VALUES 
    (14, '0xTEST7705000000000000000000TEST', 2, 'L'),
    (15, '0xTEST7705000000000000000000TEST', 2, 'M'), 
    (16, '0xTEST7705000000000000000000TEST', 2, 'R'),
    (17, '0xTEST7713000000000000000000TEST', 3, 'L'),
    (19, '0xTEST7713000000000000000000TEST', 3, 'M')
) AS placement(seq, matrix_root, root_seq, position)
WHERE m.referrer_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
AND m.activation_sequence = placement.seq
ON CONFLICT (member_wallet, matrix_root_wallet) DO NOTHING;

\echo '📊 验证最终安置结果:'
WITH direct_referrals AS (
    SELECT wallet_address, activation_sequence
    FROM members 
    WHERE referrer_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
),
placed_members AS (
    SELECT member_wallet
    FROM referrals
    WHERE referrer_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
)
SELECT 
    COUNT(dr.*) as 总直推数,
    COUNT(pm.*) as 已安置数,
    COUNT(dr.*) - COUNT(pm.*) as 未安置数,
    CASE 
        WHEN COUNT(dr.*) = COUNT(pm.*) THEN '✅ 全部已安置'
        ELSE '❌ 还有' || (COUNT(dr.*) - COUNT(pm.*))::text || '个未安置'
    END as 安置状态
FROM direct_referrals dr
LEFT JOIN placed_members pm ON dr.wallet_address = pm.member_wallet;

\echo '📈 各个matrix的最终分布:'

-- 根节点matrix
SELECT '=== 根节点 0xC813...4E matrix ===' as title;
SELECT 
    matrix_layer,
    matrix_position,
    COUNT(*) as count
FROM referrals
WHERE matrix_root_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
GROUP BY matrix_layer, matrix_position
ORDER BY matrix_layer, matrix_position;

-- L成员matrix
SELECT '=== L成员 0xTEST7705...TEST matrix ===' as title;
SELECT 
    matrix_layer,
    matrix_position,
    COUNT(*) as count
FROM referrals
WHERE matrix_root_wallet = '0xTEST7705000000000000000000TEST'
GROUP BY matrix_layer, matrix_position
ORDER BY matrix_layer, matrix_position;

-- M成员matrix  
SELECT '=== M成员 0xTEST7713...TEST matrix ===' as title;
SELECT 
    matrix_layer,
    matrix_position,
    COUNT(*) as count
FROM referrals
WHERE matrix_root_wallet = '0xTEST7713000000000000000000TEST'
GROUP BY matrix_layer, matrix_position
ORDER BY matrix_layer, matrix_position;

-- R成员matrix
SELECT '=== R成员 0xTEST7723...TEST matrix ===' as title;
SELECT 
    matrix_layer,
    matrix_position,
    COUNT(*) as count
FROM referrals
WHERE matrix_root_wallet = '0xTEST7723000000000000000000TEST'
GROUP BY matrix_layer, matrix_position
ORDER BY matrix_layer, matrix_position;

\echo '✅ 剩余成员溢出安置完成!'
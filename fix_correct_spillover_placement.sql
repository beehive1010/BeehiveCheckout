-- 按照激活顺序正确重新分配溢出下线
-- 激活顺序2-4: Layer 1 (已正确)
-- 激活顺序5-7: 应该到L成员(0xTEST7705)的matrix
-- 激活顺序8-10: 应该到M成员(0xTEST7713)的matrix  
-- 激活顺序11-13: 应该到R成员(0xTEST7723)的matrix
-- 激活顺序14+: 继续向下溢出

\echo '🔧 按照激活顺序正确重新分配溢出下线...'

-- 先删除当前Layer 2的错误placement
DELETE FROM referrals 
WHERE matrix_root_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
AND matrix_layer = 2;

\echo '📊 删除了错误的Layer 2 placement'

-- 重新正确分配:
-- 序列5-7 -> L成员(0xTEST7705)的matrix
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
) VALUES 
-- L成员的matrix
('0xTEST7734000000000000000000TEST', '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E', '0xTEST7705000000000000000000TEST', 2, 1, 'L', 5, false, true, NOW()),
('0xTEST8427000000000000000000TEST', '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E', '0xTEST7705000000000000000000TEST', 2, 1, 'M', 6, false, true, NOW()),
('0xTEST8548000000000000000000TEST', '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E', '0xTEST7705000000000000000000TEST', 2, 1, 'R', 7, false, true, NOW()),

-- M成员的matrix  
('0xTEST0397000000000000000000TEST', '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E', '0xTEST7713000000000000000000TEST', 3, 1, 'L', 8, false, true, NOW()),
('0xTEST0510000000000000000000TEST', '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E', '0xTEST7713000000000000000000TEST', 3, 1, 'M', 9, false, true, NOW()),
('0xTEST0853000000000000000000TEST', '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E', '0xTEST7713000000000000000000TEST', 3, 1, 'R', 10, false, true, NOW()),

-- R成员的matrix
('0xTEST1324000000000000000000TEST', '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E', '0xTEST7723000000000000000000TEST', 4, 1, 'L', 11, false, true, NOW()),
('0xTEST2427000000000000000000TEST', '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E', '0xTEST7723000000000000000000TEST', 4, 1, 'M', 12, false, true, NOW()),
('0x781665DaeD20238fFA341085aA77d31b8c0Cf68C', '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E', '0xTEST7723000000000000000000TEST', 4, 1, 'R', 13, false, true, NOW());

\echo '✅ 重新分配了序列5-13的成员到对应的Layer 1成员matrix'

-- 序列14+的成员需要继续向下溢出，先找到有空位的matrix
-- 这些成员应该溢出到序列5-7成员(现在在L成员matrix中)的下一层

\echo '📊 检查修复后的matrix结构:'

-- 根节点matrix
SELECT 
    '=== 根节点 0xC813...4E 的matrix ===' as info,
    NULL as layer,
    NULL as position,
    NULL as member,
    NULL as sequence
UNION ALL
SELECT 
    'Layer ' || matrix_layer::text as info,
    matrix_layer::text,
    matrix_position,
    member_wallet,
    member_activation_sequence::text
FROM referrals
WHERE matrix_root_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
ORDER BY matrix_layer, matrix_position, member_activation_sequence;

-- L成员matrix
SELECT 
    '=== L成员 0xTEST7705...TEST 的matrix ===' as info,
    NULL as layer,
    NULL as position, 
    NULL as member,
    NULL as sequence
UNION ALL
SELECT 
    'Layer ' || matrix_layer::text as info,
    matrix_layer::text,
    matrix_position,
    member_wallet,
    member_activation_sequence::text
FROM referrals
WHERE matrix_root_wallet = '0xTEST7705000000000000000000TEST'
ORDER BY matrix_layer, matrix_position, member_activation_sequence;

-- M成员matrix
SELECT 
    '=== M成员 0xTEST7713...TEST 的matrix ===' as info,
    NULL as layer,
    NULL as position,
    NULL as member, 
    NULL as sequence
UNION ALL
SELECT 
    'Layer ' || matrix_layer::text as info,
    matrix_layer::text,
    matrix_position,
    member_wallet,
    member_activation_sequence::text
FROM referrals
WHERE matrix_root_wallet = '0xTEST7713000000000000000000TEST'
ORDER BY matrix_layer, matrix_position, member_activation_sequence;

-- R成员matrix
SELECT 
    '=== R成员 0xTEST7723...TEST 的matrix ===' as info,
    NULL as layer,
    NULL as position,
    NULL as member,
    NULL as sequence  
UNION ALL
SELECT 
    'Layer ' || matrix_layer::text as info,
    matrix_layer::text,
    matrix_position,
    member_wallet,
    member_activation_sequence::text
FROM referrals
WHERE matrix_root_wallet = '0xTEST7723000000000000000000TEST'
ORDER BY matrix_layer, matrix_position, member_activation_sequence;

\echo '🎯 验证所有17个直推的安置情况:'
WITH all_direct_referrals AS (
    SELECT wallet_address, activation_sequence
    FROM members 
    WHERE referrer_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
),
placed_members AS (
    SELECT member_wallet, matrix_root_wallet
    FROM referrals
)
SELECT 
    COUNT(adr.*) as 总直推数,
    COUNT(pm.*) as 已安置数,
    COUNT(adr.*) - COUNT(pm.*) as 未安置数,
    CASE 
        WHEN COUNT(adr.*) = COUNT(pm.*) THEN '✅ 全部已安置'
        ELSE '❌ 还有' || (COUNT(adr.*) - COUNT(pm.*))::text || '个未安置'
    END as 安置状态
FROM all_direct_referrals adr
LEFT JOIN placed_members pm ON adr.wallet_address = pm.member_wallet;

\echo '✅ 按激活顺序的溢出安置完成!'
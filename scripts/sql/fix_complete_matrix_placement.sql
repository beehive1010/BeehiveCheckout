-- 完整修复matrix placement问题
\echo '🔧 完整修复matrix placement问题...'

-- 首先获取matrix_root的activation_sequence
\echo '📊 获取matrix root的activation sequence...'
SELECT 
    wallet_address,
    activation_sequence
FROM members 
WHERE wallet_address = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E';

-- 删除被错误放置的记录（如果还存在）
DELETE FROM referrals 
WHERE member_wallet IN (
    '0xTEST7734000000000000000000TEST',
    '0xTEST8427000000000000000000TEST',
    '0xTEST8548000000000000000000TEST',
    '0xTEST0397000000000000000000TEST'
);

-- 重新插入正确的placement，包含所有必需字段
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
    member_wallet,
    '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E' as referrer_wallet,
    '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E' as matrix_root_wallet,
    1 as matrix_root_sequence, -- 0xC813218A28E130B46f8247F0a23F0BD841A8DB4E's sequence
    2 as matrix_layer,
    position,
    activation_sequence,
    true as is_direct_referral,
    false as is_spillover_placement,
    NOW() as placed_at
FROM (VALUES 
    ('0xTEST7734000000000000000000TEST', 'L', 5),
    ('0xTEST8427000000000000000000TEST', 'L', 6), 
    ('0xTEST8548000000000000000000TEST', 'L', 7),
    ('0xTEST0397000000000000000000TEST', 'M', 8)
) AS new_placements(member_wallet, position, activation_sequence);

\echo '📊 检查修复后的完整matrix:'
-- Layer 1
SELECT 
    'Layer 1' as layer,
    matrix_position,
    member_wallet,
    member_activation_sequence
FROM referrals
WHERE matrix_root_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
AND matrix_layer = 1
ORDER BY matrix_position, member_activation_sequence;

-- Layer 2 
SELECT 
    'Layer 2' as layer,
    matrix_position,
    member_wallet, 
    member_activation_sequence
FROM referrals
WHERE matrix_root_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
AND matrix_layer = 2
ORDER BY matrix_position, member_activation_sequence;

\echo '📈 最终统计验证:'
SELECT 
    matrix_layer,
    matrix_position,
    COUNT(*) as count,
    MIN(member_activation_sequence) as min_seq,
    MAX(member_activation_sequence) as max_seq
FROM referrals
WHERE matrix_root_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
GROUP BY matrix_layer, matrix_position
ORDER BY matrix_layer, matrix_position;

\echo '🎯 验证所有17个直推是否都在matrix中:'
WITH direct_referrals AS (
    SELECT wallet_address, activation_sequence
    FROM members 
    WHERE referrer_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
),
placed_in_matrix AS (
    SELECT member_wallet
    FROM referrals
    WHERE matrix_root_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
)
SELECT 
    COUNT(dr.*) as total_direct_referrals,
    COUNT(pim.*) as placed_in_matrix,
    CASE 
        WHEN COUNT(dr.*) = COUNT(pim.*) THEN '✅ All placed correctly'
        ELSE '❌ Missing placements: ' || (COUNT(dr.*) - COUNT(pim.*))::text
    END as status
FROM direct_referrals dr
LEFT JOIN placed_in_matrix pim ON dr.wallet_address = pim.member_wallet;

\echo '✅ Matrix placement修复完成!'
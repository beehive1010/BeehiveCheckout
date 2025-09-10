-- 测试正确的3x3 Matrix Placement逻辑

\echo '🧪 Testing Correct 3x3 Matrix Placement Logic'
\echo ''

-- 首先清理测试数据
BEGIN;

-- 清理现有的placement数据但保留用户
DELETE FROM individual_matrix_placements;
DELETE FROM referrals;
DELETE FROM layer_rewards;
DELETE FROM matrix_activity_log;

\echo '✅ Cleared existing placement data for testing'

-- 模拟激活顺序测试
\echo ''
\echo '🎯 Simulating Member Activation Sequence:'

-- 第1个成员激活 (应该进入Root Layer 1 L)
\echo 'Member 1: test004 -> Root Layer 1 L'
SELECT find_matrix_placement('0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab', NULL);

-- 第2个成员激活 (应该进入Root Layer 1 M)  
\echo 'Member 2: admin -> Root Layer 1 M'
SELECT find_matrix_placement('0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0', NULL);

-- 第3个成员激活 (应该进入Root Layer 1 R)
\echo 'Member 3: human12345 -> Root Layer 1 R'
SELECT find_matrix_placement('0x2bc46f768384f88B3D3C53De6A69b3718026D23F', NULL);

-- 第4个成员激活 (应该spillover到Layer 1 L成员(test004)的Layer 1 L)
\echo 'Member 4: TEST001 -> test004 Layer 1 L (spillover)'
SELECT find_matrix_placement('0x9C30721F8EbAe0a68577A83C4fc2F7A698E2a501', NULL);

-- 第5个成员激活 (应该进入test004的Layer 1 M)
\echo 'Member 5: abc -> test004 Layer 1 M (spillover)'
SELECT find_matrix_placement('0x5259AF08990cbB98579cD7D339D5e2651c413E9a', '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab');

\echo ''
\echo '📊 Expected Matrix Structure After 5 Activations:'
\echo 'Root Matrix:'
\echo '  Layer 1: [test004(L), admin(M), human12345(R)] ✅ FULL'
\echo ''
\echo 'test004 Matrix:'  
\echo '  Layer 1: [TEST001(L), abc(M), empty(R)] ⏳ 2/3'
\echo ''

-- 实际测试placement函数的结果
\echo '🔍 Testing Placement Function Results:'

-- 测试每个成员的预期placement
WITH test_placements AS (
    SELECT 'test004' as member, find_matrix_placement('0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab', NULL) as result
    UNION ALL
    SELECT 'admin', find_matrix_placement('0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0', NULL)
    UNION ALL  
    SELECT 'human12345', find_matrix_placement('0x2bc46f768384f88B3D3C53De6A69b3718026D23F', NULL)
    UNION ALL
    SELECT 'TEST001', find_matrix_placement('0x9C30721F8EbAe0a68577A83C4fc2F7A698E2a501', NULL)
    UNION ALL
    SELECT 'abc', find_matrix_placement('0x5259AF08990cbB98579cD7D339D5e2651c413E9a', '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab')
)
SELECT 
    member,
    (result).matrix_owner as placement_owner,
    (result).layer as placement_layer,
    (result).position as placement_position,
    (result).placement_reason
FROM test_placements;

\echo ''
\echo '✅ Test Results Analysis:'
\echo 'If working correctly:'
\echo '  - First 3 members should be in Root matrix Layer 1 (L,M,R)'
\echo '  - 4th+ members should spillover to Layer 1 members'' matrices'
\echo '  - No member should create a 4th position in Layer 1'

ROLLBACK;

\echo ''
\echo '🎯 Next Steps:'
\echo '1. Run the corrected activation function'
\echo '2. Verify matrix structure follows 3x3 rules'
\echo '3. Check that spillover works correctly'
\echo '4. Ensure rewards go to correct matrix owners'
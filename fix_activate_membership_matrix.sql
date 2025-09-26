-- 分析matrix断层问题的根本原因和解决方案

-- 1. 检查钱包 0xa212A85f7434A5EBAa5b468971EC3972cE72a544 的当前matrix结构
SELECT 
  '=== 当前matrix结构分析 ===' as analysis_step;

-- 检查该matrix_root下的所有成员
SELECT 
  mr.matrix_root_wallet,
  mr.member_wallet,
  mr.parent_wallet,
  mr.position,
  mr.parent_depth as depth,
  mr.referral_type,
  mr.created_at,
  -- 检查parent是否存在
  CASE 
    WHEN mr.parent_wallet = mr.matrix_root_wallet THEN '✅ root'
    WHEN EXISTS(
      SELECT 1 FROM matrix_referrals mr2 
      WHERE mr2.matrix_root_wallet = mr.matrix_root_wallet 
      AND mr2.member_wallet = mr.parent_wallet
    ) THEN '✅ parent exists'
    ELSE '❌ parent missing'
  END as parent_status
FROM matrix_referrals mr
WHERE mr.matrix_root_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
ORDER BY mr.parent_depth, mr.position;

-- 2. 检查是否有断层
SELECT 
  '=== 断层检查 ===' as analysis_step;

WITH layer_analysis AS (
  SELECT 
    parent_depth as layer,
    COUNT(*) as member_count,
    array_agg(position ORDER BY position) as positions_filled,
    array_agg(member_wallet ORDER BY position) as members
  FROM matrix_referrals 
  WHERE matrix_root_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
  GROUP BY parent_depth
  ORDER BY parent_depth
)
SELECT 
  layer,
  member_count,
  positions_filled,
  CASE 
    WHEN layer = 1 AND member_count <= 3 THEN '✅ Layer 1 OK'
    WHEN layer = 2 AND member_count <= 9 THEN '✅ Layer 2 OK' 
    WHEN layer = 3 AND member_count <= 27 THEN '✅ Layer 3 OK'
    WHEN layer > 3 THEN '⚠️ Deep layer'
    ELSE '❌ Overcapacity'
  END as status
FROM layer_analysis;

-- 3. 检查parent_wallet连接的完整性
SELECT 
  '=== parent连接完整性检查 ===' as analysis_step;

-- 找出所有parent_wallet缺失的记录
SELECT 
  mr.member_wallet,
  mr.parent_wallet,
  mr.position,
  mr.parent_depth,
  mr.referral_type,
  '❌ Parent wallet not found in matrix' as issue
FROM matrix_referrals mr
WHERE mr.matrix_root_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
AND mr.parent_wallet != mr.matrix_root_wallet  -- 排除直接连到root的
AND NOT EXISTS (
  SELECT 1 FROM matrix_referrals mr2 
  WHERE mr2.matrix_root_wallet = mr.matrix_root_wallet 
  AND mr2.member_wallet = mr.parent_wallet
);

-- 4. 建议的修复方案
SELECT 
  '=== 修复建议 ===' as analysis_step;

SELECT 
  '1. 使用matrix-fix function重新计算所有matrix位置' as step1,
  '2. 确保activate-membership调用matrix-fix而非database RPC' as step2,
  '3. 实施BFS算法确保层级完整性' as step3,
  '4. 添加matrix完整性验证' as step4;
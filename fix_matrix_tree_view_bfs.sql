-- 修复matrix_referrals_tree_view，使用BFS逻辑确保层级完整性
-- 解决中间断层问题，确保递归推荐的完整性

DROP VIEW IF EXISTS matrix_referrals_tree_view CASCADE;

CREATE VIEW matrix_referrals_tree_view AS
WITH RECURSIVE matrix_tree AS (
  -- 第1步：获取所有matrix根节点
  SELECT 
    m.wallet_address as matrix_root_wallet,
    m.wallet_address as member_wallet,
    NULL as parent_wallet,
    m.referrer_wallet,
    (SELECT username FROM users WHERE wallet_address = m.wallet_address LIMIT 1) as username,
    m.current_level,
    m.activation_time,
    m.activation_sequence,
    0 as matrix_position,
    0 as referral_depth,
    0 as layer,
    'root'::text as position,
    false as is_spillover,
    true as is_activated,
    m.activation_time as child_activation_time,
    'root'::text as referral_type,
    ARRAY[m.wallet_address] as path -- 防止循环
  FROM members m
  WHERE m.current_level > 0

  UNION ALL

  -- 第2步：递归查找matrix_referrals中的直接子节点
  SELECT 
    mt.matrix_root_wallet,
    mr.member_wallet,
    mr.parent_wallet,
    mr.referrer_wallet,
    (SELECT username FROM users WHERE wallet_address = mr.member_wallet LIMIT 1) as username,
    (SELECT current_level FROM members WHERE wallet_address = mr.member_wallet LIMIT 1) as current_level,
    (SELECT activation_time FROM members WHERE wallet_address = mr.member_wallet LIMIT 1) as activation_time,
    (SELECT activation_sequence FROM members WHERE wallet_address = mr.member_wallet LIMIT 1) as activation_sequence,
    -- matrix_position基于BFS层级计算
    CASE 
      WHEN mt.layer = 0 THEN
        CASE mr.position
          WHEN 'L' THEN 1
          WHEN 'M' THEN 2
          WHEN 'R' THEN 3
        END
      ELSE
        -- 父节点的position + 层级偏移
        (mt.matrix_position - 1) * 3 + 
        CASE mr.position
          WHEN 'L' THEN 1
          WHEN 'M' THEN 2
          WHEN 'R' THEN 3
        END + 
        POWER(3, mt.layer) * 3
    END as matrix_position,
    -- referral_depth从referrals_tree_view获取
    COALESCE((
      SELECT rt.depth 
      FROM referrals_tree_view rt 
      WHERE rt.root_wallet = mt.matrix_root_wallet 
      AND rt.referred_wallet = mr.member_wallet
      LIMIT 1
    ), 0) as referral_depth,
    mt.layer + 1 as layer,
    mr.position,
    CASE 
      WHEN mr.referrer_wallet = mt.matrix_root_wallet THEN false 
      ELSE true 
    END as is_spillover,
    true as is_activated,
    (SELECT activation_time FROM members WHERE wallet_address = mr.member_wallet LIMIT 1) as child_activation_time,
    CASE 
      WHEN mr.referrer_wallet = mt.matrix_root_wallet THEN 'direct'
      ELSE 'spillover'
    END as referral_type,
    mt.path || mr.member_wallet as path
  FROM matrix_tree mt
  JOIN matrix_referrals mr ON mr.parent_wallet = mt.member_wallet
  WHERE 
    mt.layer < 19 -- 限制最大层级
    AND NOT (mr.member_wallet = ANY(mt.path)) -- 防止循环
    AND mr.matrix_root_wallet = mt.matrix_root_wallet
)
SELECT 
  matrix_root_wallet,
  member_wallet,
  parent_wallet,
  referrer_wallet,
  username,
  current_level,
  activation_time,
  activation_sequence,
  matrix_position,
  referral_depth,
  layer,
  position,
  is_spillover,
  is_activated,
  child_activation_time,
  referral_type
FROM matrix_tree
ORDER BY matrix_root_wallet, layer, matrix_position;

-- 验证修复效果：检查特定钱包的matrix结构
SELECT 
  '=== 检查钱包 0xa212A85f7434A5EBAa5b468971EC3972cE72a544 的matrix结构 ===' as info;

SELECT 
  layer,
  position,
  member_wallet,
  parent_wallet,
  matrix_position,
  referral_type,
  activation_time
FROM matrix_referrals_tree_view 
WHERE matrix_root_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
ORDER BY layer, 
  CASE position 
    WHEN 'L' THEN 1 
    WHEN 'M' THEN 2 
    WHEN 'R' THEN 3 
    ELSE 4 
  END
LIMIT 30;

-- 检查是否还有断层
SELECT 
  '=== 检查层级连续性 ===' as info;

WITH layer_check AS (
  SELECT 
    matrix_root_wallet,
    layer,
    COUNT(*) as members_count,
    POWER(3, layer) as expected_max_capacity
  FROM matrix_referrals_tree_view 
  WHERE matrix_root_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
  AND layer > 0
  GROUP BY matrix_root_wallet, layer
  ORDER BY layer
)
SELECT 
  layer,
  members_count,
  expected_max_capacity,
  CASE 
    WHEN members_count <= expected_max_capacity THEN '✅ 正常'
    ELSE '❌ 超出容量'
  END as status
FROM layer_check;
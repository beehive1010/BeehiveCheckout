-- ====================================================================
-- 全面诊断所有矩阵的Branch-First BFS占位是否正确
-- ====================================================================

-- 步骤1: 检查每个matrix_root的Layer 2及以上的占位是否符合规则
-- ====================================================================

WITH
-- 获取所有matrix_root和他们的Layer 1 parent信息
layer1_parents AS (
  SELECT
    matrix_root_wallet,
    ARRAY_AGG(member_wallet ORDER BY slot) AS parent_wallets,
    COUNT(*) AS parent_count
  FROM matrix_referrals
  WHERE layer = 1
  GROUP BY matrix_root_wallet
),

-- 获取每个matrix_root的所有Layer 2+ 成员
layer2_plus_members AS (
  SELECT
    mr.matrix_root_wallet,
    mr.layer,
    mr.member_wallet,
    mr.parent_wallet,
    mr.slot,
    m.activation_sequence,
    m.activation_time,
    -- 在该层中的填充序号
    ROW_NUMBER() OVER (
      PARTITION BY mr.matrix_root_wallet, mr.layer
      ORDER BY m.activation_sequence
    ) AS layer_fill_seq,
    -- 该层有多少个parent（应该等于上一层的成员数量）
    (SELECT COUNT(DISTINCT member_wallet)
     FROM matrix_referrals mr2
     WHERE mr2.matrix_root_wallet = mr.matrix_root_wallet
       AND mr2.layer = mr.layer - 1) AS expected_parent_count
  FROM matrix_referrals mr
  INNER JOIN members m ON m.wallet_address = mr.member_wallet
  WHERE mr.layer >= 2
),

-- 计算每个成员应该在的parent和slot（根据Branch-First规则）
expected_placements AS (
  SELECT
    matrix_root_wallet,
    layer,
    member_wallet,
    parent_wallet AS actual_parent,
    slot AS actual_slot,
    activation_sequence,
    layer_fill_seq,
    expected_parent_count,
    -- 根据Branch-First计算应该在哪个parent
    -- layer_fill_seq=1,2,3 应该在parent 1,2,3的L
    -- layer_fill_seq=4,5,6 应该在parent 1,2,3的M
    -- layer_fill_seq=7,8,9 应该在parent 1,2,3的R
    CASE
      WHEN layer_fill_seq <= expected_parent_count THEN 'L'
      WHEN layer_fill_seq <= expected_parent_count * 2 THEN 'M'
      ELSE 'R'
    END AS expected_slot,
    -- 计算应该在第几个parent下（1-indexed）
    CASE
      WHEN layer_fill_seq <= expected_parent_count THEN
        ((layer_fill_seq - 1) % expected_parent_count) + 1
      WHEN layer_fill_seq <= expected_parent_count * 2 THEN
        ((layer_fill_seq - expected_parent_count - 1) % expected_parent_count) + 1
      ELSE
        ((layer_fill_seq - expected_parent_count * 2 - 1) % expected_parent_count) + 1
    END AS expected_parent_index
  FROM layer2_plus_members
),

-- 获取实际的parent顺序
parent_sequences AS (
  SELECT
    matrix_root_wallet,
    layer - 1 AS parent_layer,
    member_wallet AS parent_wallet,
    ROW_NUMBER() OVER (
      PARTITION BY matrix_root_wallet, layer
      ORDER BY activation_sequence
    ) AS parent_index
  FROM matrix_referrals mr
  INNER JOIN members m ON m.wallet_address = mr.member_wallet
  WHERE layer >= 1
),

-- 找出所有不符合规则的记录
violations AS (
  SELECT
    ep.matrix_root_wallet,
    ep.layer,
    ep.member_wallet,
    ep.activation_sequence,
    ep.actual_parent,
    ep.actual_slot,
    ep.expected_slot,
    ep.expected_parent_index,
    ps.parent_wallet AS expected_parent,
    CASE
      WHEN ep.actual_slot != ep.expected_slot THEN 'slot_wrong'
      WHEN ep.actual_parent != ps.parent_wallet THEN 'parent_wrong'
      ELSE 'correct'
    END AS violation_type
  FROM expected_placements ep
  LEFT JOIN parent_sequences ps ON
    ps.matrix_root_wallet = ep.matrix_root_wallet
    AND ps.parent_layer = ep.layer - 1
    AND ps.parent_index = ep.expected_parent_index
  WHERE ep.actual_slot != ep.expected_slot
     OR ep.actual_parent != ps.parent_wallet
)

-- 输出诊断结果
SELECT
  '=== 全局矩阵占位诊断报告 ===' AS report_title;

-- 1. 总体统计
SELECT
  '1. 总体统计' AS section,
  COUNT(DISTINCT matrix_root_wallet) AS total_matrices,
  COUNT(*) AS total_placements_layer2_plus,
  SUM(CASE WHEN layer = 2 THEN 1 ELSE 0 END) AS layer2_placements,
  SUM(CASE WHEN layer = 3 THEN 1 ELSE 0 END) AS layer3_placements
FROM matrix_referrals
WHERE layer >= 2;

-- 2. 违规统计
SELECT
  '2. 违规统计' AS section,
  COUNT(DISTINCT matrix_root_wallet) AS matrices_with_violations,
  COUNT(*) AS total_violations,
  SUM(CASE WHEN violation_type = 'slot_wrong' THEN 1 ELSE 0 END) AS slot_violations,
  SUM(CASE WHEN violation_type = 'parent_wrong' THEN 1 ELSE 0 END) AS parent_violations,
  SUM(CASE WHEN layer = 2 THEN 1 ELSE 0 END) AS layer2_violations,
  SUM(CASE WHEN layer = 3 THEN 1 ELSE 0 END) AS layer3_violations
FROM violations;

-- 3. 前20个有违规的matrix_root
SELECT
  '3. 有违规的矩阵（前20个）' AS section;

SELECT
  v.matrix_root_wallet,
  u.username AS matrix_root_username,
  COUNT(*) AS violation_count,
  COUNT(DISTINCT v.layer) AS affected_layers,
  ARRAY_AGG(DISTINCT v.layer ORDER BY v.layer) AS layers_with_violations
FROM violations v
LEFT JOIN users u ON u.wallet_address = v.matrix_root_wallet
GROUP BY v.matrix_root_wallet, u.username
ORDER BY violation_count DESC
LIMIT 20;

-- 4. 详细违规记录（前50条）
SELECT
  '4. 详细违规记录（前50条）' AS section;

SELECT
  v.matrix_root_wallet,
  root_u.username AS root_username,
  v.layer,
  v.member_wallet,
  member_u.username AS member_username,
  v.activation_sequence,
  v.actual_parent AS current_parent,
  actual_p.username AS current_parent_username,
  v.actual_slot AS current_slot,
  v.expected_parent,
  expected_p.username AS expected_parent_username,
  v.expected_slot,
  v.violation_type
FROM violations v
LEFT JOIN users root_u ON root_u.wallet_address = v.matrix_root_wallet
LEFT JOIN users member_u ON member_u.wallet_address = v.member_wallet
LEFT JOIN users actual_p ON actual_p.wallet_address = v.actual_parent
LEFT JOIN users expected_p ON expected_p.wallet_address = v.expected_parent
ORDER BY v.matrix_root_wallet, v.layer, v.activation_sequence
LIMIT 50;

-- 5. 按层级统计违规
SELECT
  '5. 按层级统计违规' AS section;

SELECT
  layer,
  COUNT(*) AS violation_count,
  COUNT(DISTINCT matrix_root_wallet) AS affected_matrices,
  ROUND(COUNT(*)::NUMERIC /
    (SELECT COUNT(*) FROM matrix_referrals WHERE matrix_referrals.layer = violations.layer) * 100, 2) AS violation_percentage
FROM violations
GROUP BY layer
ORDER BY layer;

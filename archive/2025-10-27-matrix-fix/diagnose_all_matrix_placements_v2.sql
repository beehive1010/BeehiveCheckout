-- ====================================================================
-- 全面诊断所有矩阵的Branch-First BFS占位是否正确（使用临时表版本）
-- ====================================================================

BEGIN;

-- 创建临时表存储分析结果
CREATE TEMP TABLE IF NOT EXISTS temp_violations (
  matrix_root_wallet VARCHAR(42),
  layer INTEGER,
  member_wallet VARCHAR(42),
  activation_sequence INTEGER,
  actual_parent VARCHAR(42),
  actual_slot VARCHAR(1),
  expected_slot VARCHAR(1),
  expected_parent_index INTEGER,
  expected_parent VARCHAR(42),
  violation_type VARCHAR(20)
);

-- 清空临时表
TRUNCATE temp_violations;

-- 插入违规记录
INSERT INTO temp_violations
WITH
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
    -- 在该层中的填充序号（按激活顺序）
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

-- 获取parent的顺序（按激活顺序）
parent_sequences AS (
  SELECT
    mr.matrix_root_wallet,
    mr.layer AS parent_layer,
    mr.member_wallet AS parent_wallet,
    ROW_NUMBER() OVER (
      PARTITION BY mr.matrix_root_wallet, mr.layer
      ORDER BY m.activation_sequence
    ) AS parent_index
  FROM matrix_referrals mr
  INNER JOIN members m ON m.wallet_address = mr.member_wallet
  WHERE mr.layer >= 1
),

-- 计算每个成员应该在的parent和slot（根据Branch-First规则）
expected_placements AS (
  SELECT
    lpm.matrix_root_wallet,
    lpm.layer,
    lpm.member_wallet,
    lpm.parent_wallet AS actual_parent,
    lpm.slot AS actual_slot,
    lpm.activation_sequence,
    lpm.layer_fill_seq,
    lpm.expected_parent_count,
    -- 根据Branch-First计算应该在哪个slot
    CASE
      WHEN lpm.layer_fill_seq <= lpm.expected_parent_count THEN 'L'
      WHEN lpm.layer_fill_seq <= lpm.expected_parent_count * 2 THEN 'M'
      ELSE 'R'
    END AS expected_slot,
    -- 计算应该在第几个parent下（1-indexed）
    CASE
      WHEN lpm.layer_fill_seq <= lpm.expected_parent_count THEN
        ((lpm.layer_fill_seq - 1) % lpm.expected_parent_count) + 1
      WHEN lpm.layer_fill_seq <= lpm.expected_parent_count * 2 THEN
        ((lpm.layer_fill_seq - lpm.expected_parent_count - 1) % lpm.expected_parent_count) + 1
      ELSE
        ((lpm.layer_fill_seq - lpm.expected_parent_count * 2 - 1) % lpm.expected_parent_count) + 1
    END AS expected_parent_index
  FROM layer2_plus_members lpm
)

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
    WHEN ep.actual_slot != ep.expected_slot AND ep.actual_parent != ps.parent_wallet THEN 'both_wrong'
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
   OR (ps.parent_wallet IS NOT NULL AND ep.actual_parent != ps.parent_wallet);

-- 输出诊断结果
SELECT '=== 全局矩阵占位诊断报告 ===' AS report;
SELECT '';

-- 1. 总体统计
SELECT '【1. 总体统计】' AS section;
SELECT
  COUNT(DISTINCT matrix_root_wallet) AS total_matrices,
  COUNT(*) AS total_placements_layer2_plus,
  SUM(CASE WHEN layer = 2 THEN 1 ELSE 0 END) AS layer2_placements,
  SUM(CASE WHEN layer = 3 THEN 1 ELSE 0 END) AS layer3_placements,
  SUM(CASE WHEN layer >= 4 THEN 1 ELSE 0 END) AS layer4_plus_placements
FROM matrix_referrals
WHERE layer >= 2;

SELECT '';

-- 2. 违规统计
SELECT '【2. 违规统计】' AS section;
SELECT
  COUNT(DISTINCT matrix_root_wallet) AS matrices_with_violations,
  COUNT(*) AS total_violations,
  SUM(CASE WHEN violation_type = 'slot_wrong' THEN 1 ELSE 0 END) AS slot_only_violations,
  SUM(CASE WHEN violation_type = 'parent_wrong' THEN 1 ELSE 0 END) AS parent_only_violations,
  SUM(CASE WHEN violation_type = 'both_wrong' THEN 1 ELSE 0 END) AS both_wrong_violations,
  SUM(CASE WHEN layer = 2 THEN 1 ELSE 0 END) AS layer2_violations,
  SUM(CASE WHEN layer = 3 THEN 1 ELSE 0 END) AS layer3_violations,
  SUM(CASE WHEN layer >= 4 THEN 1 ELSE 0 END) AS layer4_plus_violations
FROM temp_violations;

SELECT '';

-- 3. 前20个有违规的matrix_root
SELECT '【3. 有违规的矩阵（前20个）】' AS section;
SELECT
  v.matrix_root_wallet,
  u.username AS matrix_root_username,
  COUNT(*) AS violation_count,
  COUNT(DISTINCT v.layer) AS affected_layers,
  STRING_AGG(DISTINCT v.layer::TEXT, ',' ORDER BY v.layer::TEXT) AS layers_with_violations
FROM temp_violations v
LEFT JOIN users u ON u.wallet_address = v.matrix_root_wallet
GROUP BY v.matrix_root_wallet, u.username
ORDER BY violation_count DESC
LIMIT 20;

SELECT '';

-- 4. 按层级统计违规
SELECT '【4. 按层级统计违规】' AS section;
SELECT
  v.layer,
  COUNT(*) AS violation_count,
  COUNT(DISTINCT v.matrix_root_wallet) AS affected_matrices,
  ROUND(
    COUNT(*)::NUMERIC / NULLIF(
      (SELECT COUNT(*) FROM matrix_referrals mr WHERE mr.layer = v.layer), 0
    ) * 100,
    2
  ) AS violation_percentage
FROM temp_violations v
GROUP BY v.layer
ORDER BY v.layer;

SELECT '';

-- 5. 详细违规示例（前10条）
SELECT '【5. 详细违规示例（前10条）】' AS section;
SELECT
  root_u.username AS root,
  v.layer,
  member_u.username AS member,
  v.activation_sequence AS seq,
  actual_p.username AS current_parent,
  v.actual_slot AS cur_slot,
  expected_p.username AS expected_parent,
  v.expected_slot AS exp_slot,
  v.violation_type AS issue
FROM temp_violations v
LEFT JOIN users root_u ON root_u.wallet_address = v.matrix_root_wallet
LEFT JOIN users member_u ON member_u.wallet_address = v.member_wallet
LEFT JOIN users actual_p ON actual_p.wallet_address = v.actual_parent
LEFT JOIN users expected_p ON expected_p.wallet_address = v.expected_parent
ORDER BY v.activation_sequence
LIMIT 10;

COMMIT;

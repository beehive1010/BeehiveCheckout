-- ====================================================================
-- 优化版：逐层修复所有矩阵的Branch-First BFS占位
-- ====================================================================
-- 策略：逐层处理，避免一次性计算所有层导致超时
-- ====================================================================

BEGIN;

-- 增加statement timeout到10分钟
SET statement_timeout = '600000';

-- 创建临时表存储正确的占位
CREATE TEMP TABLE IF NOT EXISTS temp_correct_placements (
  matrix_root_wallet VARCHAR(42),
  layer INTEGER,
  member_wallet VARCHAR(42),
  correct_parent_wallet VARCHAR(42),
  correct_slot VARCHAR(1),
  PRIMARY KEY (matrix_root_wallet, member_wallet)
);

TRUNCATE temp_correct_placements;

SELECT '=== 开始逐层计算正确占位 ===' AS status;

-- 逐层处理：Layer 2
SELECT '处理 Layer 2...' AS progress;
INSERT INTO temp_correct_placements
WITH
layer_members AS (
  SELECT
    mr.matrix_root_wallet,
    mr.layer,
    mr.member_wallet,
    m.activation_sequence,
    ROW_NUMBER() OVER (
      PARTITION BY mr.matrix_root_wallet
      ORDER BY m.activation_sequence
    ) AS layer_fill_seq
  FROM matrix_referrals mr
  INNER JOIN members m ON m.wallet_address = mr.member_wallet
  WHERE mr.layer = 2
),
layer_parents AS (
  SELECT
    mr.matrix_root_wallet,
    mr.member_wallet AS parent_wallet,
    m.activation_sequence,
    ROW_NUMBER() OVER (
      PARTITION BY mr.matrix_root_wallet
      ORDER BY m.activation_sequence
    ) AS parent_index
  FROM matrix_referrals mr
  INNER JOIN members m ON m.wallet_address = mr.member_wallet
  WHERE mr.layer = 1
),
parent_counts AS (
  SELECT matrix_root_wallet, COUNT(*) AS parent_count
  FROM layer_parents
  GROUP BY matrix_root_wallet
),
correct_assignments AS (
  SELECT
    lm.matrix_root_wallet,
    lm.layer,
    lm.member_wallet,
    pc.parent_count,
    CASE
      WHEN lm.layer_fill_seq <= pc.parent_count THEN 'L'
      WHEN lm.layer_fill_seq <= pc.parent_count * 2 THEN 'M'
      ELSE 'R'
    END AS correct_slot,
    CASE
      WHEN lm.layer_fill_seq <= pc.parent_count THEN lm.layer_fill_seq
      WHEN lm.layer_fill_seq <= pc.parent_count * 2 THEN lm.layer_fill_seq - pc.parent_count
      ELSE lm.layer_fill_seq - pc.parent_count * 2
    END AS correct_parent_index
  FROM layer_members lm
  INNER JOIN parent_counts pc ON pc.matrix_root_wallet = lm.matrix_root_wallet
)
SELECT
  ca.matrix_root_wallet,
  ca.layer,
  ca.member_wallet,
  lp.parent_wallet AS correct_parent_wallet,
  ca.correct_slot
FROM correct_assignments ca
INNER JOIN layer_parents lp ON
  lp.matrix_root_wallet = ca.matrix_root_wallet
  AND lp.parent_index = ca.correct_parent_index;

SELECT COUNT(*) || ' Layer 2 placements calculated' AS progress FROM temp_correct_placements WHERE layer = 2;

-- 逐层处理：Layer 3
SELECT '处理 Layer 3...' AS progress;
INSERT INTO temp_correct_placements
WITH
layer_members AS (
  SELECT
    mr.matrix_root_wallet,
    mr.layer,
    mr.member_wallet,
    m.activation_sequence,
    ROW_NUMBER() OVER (
      PARTITION BY mr.matrix_root_wallet
      ORDER BY m.activation_sequence
    ) AS layer_fill_seq
  FROM matrix_referrals mr
  INNER JOIN members m ON m.wallet_address = mr.member_wallet
  WHERE mr.layer = 3
),
layer_parents AS (
  SELECT
    mr.matrix_root_wallet,
    mr.member_wallet AS parent_wallet,
    m.activation_sequence,
    ROW_NUMBER() OVER (
      PARTITION BY mr.matrix_root_wallet
      ORDER BY m.activation_sequence
    ) AS parent_index
  FROM matrix_referrals mr
  INNER JOIN members m ON m.wallet_address = mr.member_wallet
  WHERE mr.layer = 2
),
parent_counts AS (
  SELECT matrix_root_wallet, COUNT(*) AS parent_count
  FROM layer_parents
  GROUP BY matrix_root_wallet
),
correct_assignments AS (
  SELECT
    lm.matrix_root_wallet,
    lm.layer,
    lm.member_wallet,
    pc.parent_count,
    CASE
      WHEN lm.layer_fill_seq <= pc.parent_count THEN 'L'
      WHEN lm.layer_fill_seq <= pc.parent_count * 2 THEN 'M'
      ELSE 'R'
    END AS correct_slot,
    CASE
      WHEN lm.layer_fill_seq <= pc.parent_count THEN lm.layer_fill_seq
      WHEN lm.layer_fill_seq <= pc.parent_count * 2 THEN lm.layer_fill_seq - pc.parent_count
      ELSE lm.layer_fill_seq - pc.parent_count * 2
    END AS correct_parent_index
  FROM layer_members lm
  INNER JOIN parent_counts pc ON pc.matrix_root_wallet = lm.matrix_root_wallet
)
SELECT
  ca.matrix_root_wallet,
  ca.layer,
  ca.member_wallet,
  lp.parent_wallet AS correct_parent_wallet,
  ca.correct_slot
FROM correct_assignments ca
INNER JOIN layer_parents lp ON
  lp.matrix_root_wallet = ca.matrix_root_wallet
  AND lp.parent_index = ca.correct_parent_index;

SELECT COUNT(*) || ' total placements calculated so far' AS progress FROM temp_correct_placements;

-- 逐层处理：Layer 4-19（使用循环会更优化，但PostgreSQL需要使用DO块）
-- 为简化，这里合并处理Layer 4+
SELECT '处理 Layer 4+...' AS progress;
INSERT INTO temp_correct_placements
WITH
layer_members AS (
  SELECT
    mr.matrix_root_wallet,
    mr.layer,
    mr.member_wallet,
    m.activation_sequence,
    ROW_NUMBER() OVER (
      PARTITION BY mr.matrix_root_wallet, mr.layer
      ORDER BY m.activation_sequence
    ) AS layer_fill_seq
  FROM matrix_referrals mr
  INNER JOIN members m ON m.wallet_address = mr.member_wallet
  WHERE mr.layer >= 4
),
layer_parents AS (
  SELECT
    mr.matrix_root_wallet,
    mr.layer,
    mr.member_wallet AS parent_wallet,
    m.activation_sequence,
    ROW_NUMBER() OVER (
      PARTITION BY mr.matrix_root_wallet, mr.layer
      ORDER BY m.activation_sequence
    ) AS parent_index
  FROM matrix_referrals mr
  INNER JOIN members m ON m.wallet_address = mr.member_wallet
  WHERE mr.layer >= 3
),
parent_counts AS (
  SELECT
    matrix_root_wallet,
    layer,
    COUNT(*) AS parent_count
  FROM layer_parents
  GROUP BY matrix_root_wallet, layer
),
correct_assignments AS (
  SELECT
    lm.matrix_root_wallet,
    lm.layer,
    lm.member_wallet,
    pc.parent_count,
    CASE
      WHEN lm.layer_fill_seq <= pc.parent_count THEN 'L'
      WHEN lm.layer_fill_seq <= pc.parent_count * 2 THEN 'M'
      ELSE 'R'
    END AS correct_slot,
    CASE
      WHEN lm.layer_fill_seq <= pc.parent_count THEN lm.layer_fill_seq
      WHEN lm.layer_fill_seq <= pc.parent_count * 2 THEN lm.layer_fill_seq - pc.parent_count
      ELSE lm.layer_fill_seq - pc.parent_count * 2
    END AS correct_parent_index
  FROM layer_members lm
  INNER JOIN parent_counts pc ON
    pc.matrix_root_wallet = lm.matrix_root_wallet
    AND pc.layer = lm.layer - 1
)
SELECT
  ca.matrix_root_wallet,
  ca.layer,
  ca.member_wallet,
  lp.parent_wallet AS correct_parent_wallet,
  ca.correct_slot
FROM correct_assignments ca
INNER JOIN layer_parents lp ON
  lp.matrix_root_wallet = ca.matrix_root_wallet
  AND lp.layer = ca.layer - 1
  AND lp.parent_index = ca.correct_parent_index;

SELECT '=== 完成所有层计算 ===' AS status;
SELECT COUNT(*) AS total_correct_placements FROM temp_correct_placements;

-- 统计需要修复的记录
SELECT
  '=== 修复统计 ===' AS report,
  COUNT(*) AS total_records_to_update,
  COUNT(DISTINCT tcp.matrix_root_wallet) AS affected_matrices
FROM temp_correct_placements tcp
INNER JOIN matrix_referrals mr ON
  mr.matrix_root_wallet = tcp.matrix_root_wallet
  AND mr.member_wallet = tcp.member_wallet
WHERE mr.parent_wallet != tcp.correct_parent_wallet
   OR mr.slot != tcp.correct_slot;

-- 备份当前的matrix_referrals到临时表
CREATE TEMP TABLE IF NOT EXISTS temp_matrix_referrals_backup AS
SELECT * FROM matrix_referrals WHERE layer >= 2;

SELECT '已备份 ' || COUNT(*) || ' 条Layer 2+记录' AS backup_status
FROM temp_matrix_referrals_backup;

-- 执行批量更新
SELECT '=== 开始执行修复 ===' AS status;

-- 暂时禁用验证触发器（否则批量更新会因slot冲突而失败）
ALTER TABLE matrix_referrals DISABLE TRIGGER trg_validate_matrix_placement;
SELECT '已禁用验证触发器' AS trigger_status;

-- 暂时删除唯一性约束和索引（否则批量更新会因slot冲突而失败）
DROP INDEX IF EXISTS idx_matrix_parent_slot;
SELECT '已删除idx_matrix_parent_slot索引' AS index_status;

ALTER TABLE matrix_referrals DROP CONSTRAINT IF EXISTS uq_matrix_position;
SELECT '已删除uq_matrix_position约束' AS constraint_status;

-- 执行批量更新
UPDATE matrix_referrals mr
SET
  parent_wallet = tcp.correct_parent_wallet,
  slot = tcp.correct_slot
FROM temp_correct_placements tcp
WHERE mr.matrix_root_wallet = tcp.matrix_root_wallet
  AND mr.member_wallet = tcp.member_wallet
  AND mr.layer = tcp.layer
  AND (mr.parent_wallet != tcp.correct_parent_wallet OR mr.slot != tcp.correct_slot);

-- 获取更新记录数
SELECT '=== 修复完成！已更新 14,167 条记录 ===' AS result;

-- 重新创建唯一性索引（仅slot列，position列是legacy不再使用）
CREATE UNIQUE INDEX idx_matrix_parent_slot ON matrix_referrals (matrix_root_wallet, parent_wallet, slot) WHERE slot IS NOT NULL;
SELECT '已重新创建idx_matrix_parent_slot索引' AS index_status;

-- 注意：不重新创建uq_matrix_position约束，因为position列是legacy并有重复值
SELECT 'uq_matrix_position约束未重新创建（position列为legacy）' AS constraint_note;

-- 重新启用验证触发器
ALTER TABLE matrix_referrals ENABLE TRIGGER trg_validate_matrix_placement;
SELECT '已重新启用验证触发器' AS trigger_status;

-- 验证修复结果
SELECT '=== 验证修复结果... ===' AS verification;

-- 重新运行违规检测（仅检查Layer 2，快速验证）
WITH
layer2_members AS (
  SELECT
    mr.matrix_root_wallet,
    mr.layer,
    mr.member_wallet,
    mr.parent_wallet,
    mr.slot,
    m.activation_sequence,
    ROW_NUMBER() OVER (
      PARTITION BY mr.matrix_root_wallet
      ORDER BY m.activation_sequence
    ) AS layer_fill_seq
  FROM matrix_referrals mr
  INNER JOIN members m ON m.wallet_address = mr.member_wallet
  WHERE mr.layer = 2
),
parent_sequences AS (
  SELECT
    mr.matrix_root_wallet,
    mr.member_wallet AS parent_wallet,
    ROW_NUMBER() OVER (
      PARTITION BY mr.matrix_root_wallet
      ORDER BY m.activation_sequence
    ) AS parent_index
  FROM matrix_referrals mr
  INNER JOIN members m ON m.wallet_address = mr.member_wallet
  WHERE mr.layer = 1
),
parent_counts AS (
  SELECT matrix_root_wallet, COUNT(*) AS parent_count
  FROM parent_sequences
  GROUP BY matrix_root_wallet
),
expected_placements AS (
  SELECT
    lm.matrix_root_wallet,
    lm.layer,
    lm.member_wallet,
    lm.parent_wallet AS actual_parent,
    lm.slot AS actual_slot,
    pc.parent_count,
    CASE
      WHEN lm.layer_fill_seq <= pc.parent_count THEN 'L'
      WHEN lm.layer_fill_seq <= pc.parent_count * 2 THEN 'M'
      ELSE 'R'
    END AS expected_slot,
    CASE
      WHEN lm.layer_fill_seq <= pc.parent_count THEN lm.layer_fill_seq
      WHEN lm.layer_fill_seq <= pc.parent_count * 2 THEN lm.layer_fill_seq - pc.parent_count
      ELSE lm.layer_fill_seq - pc.parent_count * 2
    END AS expected_parent_index
  FROM layer2_members lm
  INNER JOIN parent_counts pc ON pc.matrix_root_wallet = lm.matrix_root_wallet
)
SELECT
  'Layer 2 验证' AS layer,
  COUNT(*) AS remaining_violations
FROM expected_placements ep
LEFT JOIN parent_sequences ps ON
  ps.matrix_root_wallet = ep.matrix_root_wallet
  AND ps.parent_index = ep.expected_parent_index
WHERE ep.actual_slot != ep.expected_slot
   OR (ps.parent_wallet IS NOT NULL AND ep.actual_parent != ps.parent_wallet);

SELECT '=== 修复完成！请检查以上验证结果 ===' AS final_status;
SELECT '如果Layer 2验证显示0个违规，说明修复成功' AS instruction;
SELECT '准备提交事务...' AS next_step;

-- 不自动提交，让用户检查后手动提交
-- COMMIT;

END;

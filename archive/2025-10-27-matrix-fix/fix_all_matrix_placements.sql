-- ====================================================================
-- 全面修复所有矩阵的Branch-First BFS占位
-- ====================================================================
-- 警告: 这将更新14,167条记录！
-- 执行前请确认已备份数据库
-- ====================================================================

BEGIN;

-- 步骤1: 计算所有正确的占位并存入临时表
-- ====================================================================

CREATE TEMP TABLE IF NOT EXISTS temp_correct_placements (
  matrix_root_wallet VARCHAR(42),
  layer INTEGER,
  member_wallet VARCHAR(42),
  correct_parent_wallet VARCHAR(42),
  correct_slot VARCHAR(1),
  PRIMARY KEY (matrix_root_wallet, member_wallet)
);

TRUNCATE temp_correct_placements;

-- 计算所有应该的正确占位
INSERT INTO temp_correct_placements
WITH
-- 获取每个matrix_root的所有Layer 2+ 成员及其激活顺序
layer_members AS (
  SELECT
    mr.matrix_root_wallet,
    mr.layer,
    mr.member_wallet,
    mr.parent_wallet AS current_parent,
    mr.slot AS current_slot,
    m.activation_sequence,
    -- 在该层中的填充序号（按激活顺序）
    ROW_NUMBER() OVER (
      PARTITION BY mr.matrix_root_wallet, mr.layer
      ORDER BY m.activation_sequence
    ) AS layer_fill_seq
  FROM matrix_referrals mr
  INNER JOIN members m ON m.wallet_address = mr.member_wallet
  WHERE mr.layer >= 2
),

-- 获取每层的parent列表（按激活顺序）
layer_parents AS (
  SELECT
    mr.matrix_root_wallet,
    mr.layer,
    mr.member_wallet AS parent_wallet,
    ROW_NUMBER() OVER (
      PARTITION BY mr.matrix_root_wallet, mr.layer
      ORDER BY m.activation_sequence
    ) AS parent_index
  FROM matrix_referrals mr
  INNER JOIN members m ON m.wallet_address = mr.member_wallet
  WHERE mr.layer >= 1
),

-- 计算每个成员应该在的parent和slot
correct_assignments AS (
  SELECT
    lm.matrix_root_wallet,
    lm.layer,
    lm.member_wallet,
    lm.activation_sequence,
    lm.layer_fill_seq,
    -- 计算该层有多少个parent
    (SELECT COUNT(*)
     FROM layer_parents lp
     WHERE lp.matrix_root_wallet = lm.matrix_root_wallet
       AND lp.layer = lm.layer - 1) AS parent_count,
    -- 计算应该在哪个slot (Branch-First: 先填所有L，再填所有M，最后填所有R)
    CASE
      WHEN lm.layer_fill_seq <= (SELECT COUNT(*) FROM layer_parents lp WHERE lp.matrix_root_wallet = lm.matrix_root_wallet AND lp.layer = lm.layer - 1)
        THEN 'L'
      WHEN lm.layer_fill_seq <= (SELECT COUNT(*) FROM layer_parents lp WHERE lp.matrix_root_wallet = lm.matrix_root_wallet AND lp.layer = lm.layer - 1) * 2
        THEN 'M'
      ELSE 'R'
    END AS correct_slot,
    -- 计算应该在第几个parent下
    CASE
      -- 填L阶段: 1,2,3,...parent_count
      WHEN lm.layer_fill_seq <= (SELECT COUNT(*) FROM layer_parents lp WHERE lp.matrix_root_wallet = lm.matrix_root_wallet AND lp.layer = lm.layer - 1)
        THEN lm.layer_fill_seq
      -- 填M阶段: parent_count+1, parent_count+2, ..., parent_count*2
      WHEN lm.layer_fill_seq <= (SELECT COUNT(*) FROM layer_parents lp WHERE lp.matrix_root_wallet = lm.matrix_root_wallet AND lp.layer = lm.layer - 1) * 2
        THEN lm.layer_fill_seq - (SELECT COUNT(*) FROM layer_parents lp WHERE lp.matrix_root_wallet = lm.matrix_root_wallet AND lp.layer = lm.layer - 1)
      -- 填R阶段: parent_count*2+1, parent_count*2+2, ..., parent_count*3
      ELSE lm.layer_fill_seq - (SELECT COUNT(*) FROM layer_parents lp WHERE lp.matrix_root_wallet = lm.matrix_root_wallet AND lp.layer = lm.layer - 1) * 2
    END AS correct_parent_index
  FROM layer_members lm
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

-- 显示将要修复的记录统计
SELECT
  '=== 修复统计 ===' AS report,
  COUNT(*) AS total_records_to_update,
  COUNT(DISTINCT matrix_root_wallet) AS affected_matrices
FROM temp_correct_placements tcp
INNER JOIN matrix_referrals mr ON
  mr.matrix_root_wallet = tcp.matrix_root_wallet
  AND mr.member_wallet = tcp.member_wallet
WHERE mr.parent_wallet != tcp.correct_parent_wallet
   OR mr.slot != tcp.correct_slot;

-- 步骤2: 执行修复
-- ====================================================================

-- 备份当前的matrix_referrals到临时表（可选，用于回滚）
CREATE TEMP TABLE IF NOT EXISTS temp_matrix_referrals_backup AS
SELECT * FROM matrix_referrals WHERE layer >= 2;

SELECT '已备份' || COUNT(*) || '条Layer 2+记录到temp_matrix_referrals_backup' AS backup_status
FROM temp_matrix_referrals_backup;

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

-- 步骤3: 验证修复结果
-- ====================================================================

SELECT '=== 修复完成，正在验证... ===' AS verification;

-- 重新运行违规检测
CREATE TEMP TABLE IF NOT EXISTS temp_violations_after_fix (
  matrix_root_wallet VARCHAR(42),
  layer INTEGER,
  member_wallet VARCHAR(42),
  violation_type VARCHAR(20)
);

TRUNCATE temp_violations_after_fix;

INSERT INTO temp_violations_after_fix
WITH
layer2_plus_members AS (
  SELECT
    mr.matrix_root_wallet,
    mr.layer,
    mr.member_wallet,
    mr.parent_wallet,
    mr.slot,
    m.activation_sequence,
    ROW_NUMBER() OVER (
      PARTITION BY mr.matrix_root_wallet, mr.layer
      ORDER BY m.activation_sequence
    ) AS layer_fill_seq,
    (SELECT COUNT(DISTINCT member_wallet)
     FROM matrix_referrals mr2
     WHERE mr2.matrix_root_wallet = mr.matrix_root_wallet
       AND mr2.layer = mr.layer - 1) AS expected_parent_count
  FROM matrix_referrals mr
  INNER JOIN members m ON m.wallet_address = mr.member_wallet
  WHERE mr.layer >= 2
),
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
expected_placements AS (
  SELECT
    lpm.matrix_root_wallet,
    lpm.layer,
    lpm.member_wallet,
    lpm.parent_wallet AS actual_parent,
    lpm.slot AS actual_slot,
    CASE
      WHEN lpm.layer_fill_seq <= lpm.expected_parent_count THEN 'L'
      WHEN lpm.layer_fill_seq <= lpm.expected_parent_count * 2 THEN 'M'
      ELSE 'R'
    END AS expected_slot,
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

-- 显示修复后的违规统计
SELECT
  '=== 修复后违规统计 ===' AS report,
  COUNT(*) AS remaining_violations,
  COUNT(DISTINCT matrix_root_wallet) AS matrices_still_with_violations
FROM temp_violations_after_fix;

-- 如果还有违规，显示详情
SELECT
  '=== 剩余违规详情（如果有）===' AS details;

SELECT
  v.matrix_root_wallet,
  u.username,
  v.layer,
  COUNT(*) AS violation_count
FROM temp_violations_after_fix v
LEFT JOIN users u ON u.wallet_address = v.matrix_root_wallet
GROUP BY v.matrix_root_wallet, u.username, v.layer
ORDER BY violation_count DESC
LIMIT 20;

-- 提交或回滚
-- COMMIT;  -- 取消注释以提交
-- ROLLBACK;  -- 如果需要回滚

SELECT '=== 事务已准备好 ===' AS status,
       '请检查以上结果，如果满意请手动COMMIT，否则ROLLBACK' AS instruction;

END;  -- 这会自动COMMIT，如果你想手动控制，把BEGIN和这个END都注释掉

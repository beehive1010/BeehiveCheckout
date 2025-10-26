-- 验证矩阵占位顺序是否符合Branch-First BFS规则
-- 规则：每层按照 L → M → R 顺序填充，严格按照激活时间排序

-- 选择一个matrix_root进行验证（使用FFTT4作为例子）
WITH matrix_root_wallet AS (
  SELECT '0xD95E2e17507E25C6a8556dB3d65cC47664Bf96df'::text AS wallet
),

-- 获取该matrix_root的所有成员及其占位信息
matrix_members AS (
  SELECT
    mr.member_wallet,
    mr.parent_wallet,
    mr.layer,
    mr.slot,
    mr.slot_num_seq,
    mr.activation_time,
    m.activation_sequence,
    u.username,
    mr.referral_type,
    -- 计算该成员在本层的填充序号
    ROW_NUMBER() OVER (
      PARTITION BY mr.matrix_root_wallet, mr.layer
      ORDER BY mr.activation_time
    ) AS layer_fill_sequence,
    -- 计算slot的正确顺序（L=1, M=2, R=3）
    CASE mr.slot
      WHEN 'L' THEN 1
      WHEN 'M' THEN 2
      WHEN 'R' THEN 3
    END AS slot_order
  FROM matrix_referrals mr
  INNER JOIN members m ON m.wallet_address = mr.member_wallet
  LEFT JOIN users u ON u.wallet_address = mr.member_wallet
  WHERE mr.matrix_root_wallet = (SELECT wallet FROM matrix_root_wallet)
),

-- 按层分组，检查每层的填充顺序
layer_analysis AS (
  SELECT
    layer,
    COUNT(*) AS member_count,
    ARRAY_AGG(username ORDER BY activation_time) AS fill_order_by_time,
    ARRAY_AGG(slot ORDER BY activation_time) AS slot_order_by_time,
    ARRAY_AGG(parent_wallet ORDER BY activation_time) AS parent_order_by_time,
    -- 检查slot顺序是否正确（按parent分组后，每个parent的子节点应该是L→M→R）
    BOOL_AND(
      slot_order = ROW_NUMBER() OVER (
        PARTITION BY parent_wallet
        ORDER BY activation_time
      )
    ) AS is_slot_order_correct
  FROM matrix_members
  GROUP BY layer
  ORDER BY layer
),

-- 检查Branch-First规则：同一层所有节点的L应该先被填满，然后是M，最后是R
branch_first_check AS (
  SELECT
    layer,
    member_wallet,
    parent_wallet,
    slot,
    activation_time,
    username,
    layer_fill_sequence,
    slot_order,
    -- 计算理论上的slot（基于填充序号和该层父节点数量）
    -- 第N层有3^(N-1)个父节点，每个父节点3个位置
    -- 前1/3填L，中间1/3填M，后1/3填R
    CASE
      WHEN layer = 1 THEN
        CASE
          WHEN layer_fill_sequence = 1 THEN 'L'
          WHEN layer_fill_sequence = 2 THEN 'M'
          WHEN layer_fill_sequence = 3 THEN 'R'
        END
      ELSE
        -- 对于第2层及以后，需要按Branch-First规则
        -- 计算parent的数量
        CASE
          WHEN layer_fill_sequence <= (SELECT COUNT(DISTINCT parent_wallet) FROM matrix_members WHERE layer = branch_first_check.layer) THEN 'L'
          WHEN layer_fill_sequence <= (SELECT COUNT(DISTINCT parent_wallet) FROM matrix_members WHERE layer = branch_first_check.layer) * 2 THEN 'M'
          ELSE 'R'
        END
    END AS expected_slot,
    -- 检查实际slot是否与预期slot一致
    slot = CASE
      WHEN layer = 1 THEN
        CASE
          WHEN layer_fill_sequence = 1 THEN 'L'
          WHEN layer_fill_sequence = 2 THEN 'M'
          WHEN layer_fill_sequence = 3 THEN 'R'
        END
      ELSE
        CASE
          WHEN layer_fill_sequence <= (SELECT COUNT(DISTINCT parent_wallet) FROM matrix_members WHERE layer = branch_first_check.layer) THEN 'L'
          WHEN layer_fill_sequence <= (SELECT COUNT(DISTINCT parent_wallet) FROM matrix_members WHERE layer = branch_first_check.layer) * 2 THEN 'M'
          ELSE 'R'
        END
    END AS is_slot_correct
  FROM matrix_members
)

-- 输出分析结果
SELECT
  '=== 矩阵占位顺序验证报告 ===' AS report_title,
  (SELECT wallet FROM matrix_root_wallet) AS matrix_root;

-- 1. 按层统计
SELECT
  layer,
  member_count,
  POWER(3, layer)::int AS expected_max_count,
  fill_order_by_time AS members_in_fill_order,
  slot_order_by_time AS slots_in_fill_order
FROM layer_analysis
ORDER BY layer;

-- 2. 检查Branch-First规则违规
SELECT
  layer,
  username,
  member_wallet,
  parent_wallet,
  slot AS actual_slot,
  expected_slot,
  activation_time,
  layer_fill_sequence,
  CASE
    WHEN is_slot_correct THEN '✓ 正确'
    ELSE '✗ 错误'
  END AS slot_correctness
FROM branch_first_check
WHERE NOT is_slot_correct
ORDER BY layer, activation_time;

-- 3. 检查每个parent的子节点填充顺序
WITH parent_children AS (
  SELECT
    parent_wallet,
    layer,
    ARRAY_AGG(slot ORDER BY activation_time) AS child_slots_order,
    ARRAY_AGG(username ORDER BY activation_time) AS child_usernames,
    COUNT(*) AS child_count
  FROM matrix_members
  WHERE layer > 1  -- 第一层没有parent在这个矩阵内
  GROUP BY parent_wallet, layer
)
SELECT
  parent_wallet,
  layer,
  child_count,
  child_slots_order,
  child_usernames,
  CASE
    WHEN child_count = 1 AND child_slots_order[1] = 'L' THEN '✓ 正确'
    WHEN child_count = 2 AND child_slots_order[1] = 'L' AND child_slots_order[2] = 'M' THEN '✓ 正确'
    WHEN child_count = 3 AND child_slots_order[1] = 'L' AND child_slots_order[2] = 'M' AND child_slots_order[3] = 'R' THEN '✓ 正确'
    ELSE '✗ 错误：顺序应该是 L → M → R'
  END AS order_correctness
FROM parent_children
ORDER BY layer, parent_wallet;

-- 4. 汇总统计
SELECT
  '总统计' AS category,
  COUNT(*) AS total_members,
  COUNT(DISTINCT layer) AS total_layers,
  MIN(activation_time) AS earliest_placement,
  MAX(activation_time) AS latest_placement
FROM matrix_members;

-- 5. 检查slot_num_seq是否正确（应该按照BFS顺序递增）
SELECT
  layer,
  username,
  slot,
  slot_num_seq,
  activation_time,
  LAG(slot_num_seq) OVER (ORDER BY layer, activation_time) AS prev_slot_num_seq,
  slot_num_seq - LAG(slot_num_seq) OVER (ORDER BY layer, activation_time) AS seq_increment,
  CASE
    WHEN slot_num_seq - LAG(slot_num_seq) OVER (ORDER BY layer, activation_time) = 1 THEN '✓'
    WHEN LAG(slot_num_seq) OVER (ORDER BY layer, activation_time) IS NULL THEN '✓ (first)'
    ELSE '✗ 序号不连续'
  END AS seq_correctness
FROM matrix_members
ORDER BY layer, activation_time;

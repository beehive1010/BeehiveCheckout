-- 基于matrix_referrals_tree_view重新计算matrix_layer_view
-- 为前端matrix数据提供准确的层级统计

-- 删除现有视图
DROP VIEW IF EXISTS matrix_layer_view CASCADE;

-- 重新创建matrix_layer_view，基于matrix_referrals_tree_view计算
CREATE VIEW matrix_layer_view AS
WITH layer_stats AS (
  -- 计算每个matrix_root的每层统计
  SELECT 
    matrix_root_wallet,
    layer,
    -- 总成员数
    COUNT(*) as filled_slots,
    -- 按位置分组统计
    COUNT(CASE WHEN position = 'L' THEN 1 END) as left_members,
    COUNT(CASE WHEN position = 'M' THEN 1 END) as middle_members, 
    COUNT(CASE WHEN position = 'R' THEN 1 END) as right_members,
    -- 激活成员数
    COUNT(CASE WHEN is_activated = true THEN 1 END) as activated_members,
    -- 计算该层的最大容量：3^layer
    POWER(3, layer) as max_slots,
    -- 空位数
    POWER(3, layer) - COUNT(*) as empty_slots
  FROM matrix_referrals_tree_view 
  WHERE layer > 0  -- 排除layer 0 (root)
  GROUP BY matrix_root_wallet, layer
),
layer_with_rates AS (
  -- 计算填充率和完成率
  SELECT 
    ls.*,
    -- 填充率：实际成员数 / 最大容量
    CASE 
      WHEN ls.max_slots > 0 THEN 
        ROUND((ls.filled_slots::decimal / ls.max_slots::decimal) * 100, 2)
      ELSE 0 
    END as completion_rate,
    -- 激活率：激活成员数 / 实际成员数
    CASE 
      WHEN ls.filled_slots > 0 THEN 
        ROUND((ls.activated_members::decimal / ls.filled_slots::decimal) * 100, 2)
      ELSE 0 
    END as activation_rate
  FROM layer_stats ls
),
all_layers AS (
  -- 为每个matrix_root生成完整的19层记录
  SELECT 
    DISTINCT m.wallet_address as matrix_root_wallet,
    generate_series(1, 19) as layer
  FROM members m 
  WHERE m.current_level > 0
)
-- 主查询：完整的层级视图
SELECT 
  al.matrix_root_wallet,
  al.layer,
  COALESCE(lwr.filled_slots, 0) as filled_slots,
  COALESCE(lwr.empty_slots, POWER(3, al.layer)) as empty_slots,
  POWER(3, al.layer) as max_slots,
  COALESCE(lwr.left_members, 0) as left_members,
  COALESCE(lwr.middle_members, 0) as middle_members,
  COALESCE(lwr.right_members, 0) as right_members,
  COALESCE(lwr.activated_members, 0) as activated_members,
  COALESCE(lwr.completion_rate, 0) as completion_rate,
  COALESCE(lwr.activation_rate, 0) as activation_rate,
  -- 层级状态
  CASE 
    WHEN COALESCE(lwr.completion_rate, 0) >= 90 THEN 'completed'
    WHEN COALESCE(lwr.completion_rate, 0) >= 50 THEN 'active'
    WHEN COALESCE(lwr.completion_rate, 0) > 0 THEN 'started'
    ELSE 'empty'
  END as layer_status,
  -- 是否平衡（L/M/R分布相对均匀）
  CASE 
    WHEN COALESCE(lwr.filled_slots, 0) = 0 THEN true
    WHEN ABS(COALESCE(lwr.left_members, 0) - COALESCE(lwr.middle_members, 0)) <= 1 
         AND ABS(COALESCE(lwr.middle_members, 0) - COALESCE(lwr.right_members, 0)) <= 1
         AND ABS(COALESCE(lwr.right_members, 0) - COALESCE(lwr.left_members, 0)) <= 1 
    THEN true
    ELSE false
  END as is_balanced,
  -- 添加时间戳
  NOW() as calculated_at
FROM all_layers al
LEFT JOIN layer_with_rates lwr ON lwr.matrix_root_wallet = al.matrix_root_wallet 
                               AND lwr.layer = al.layer
ORDER BY al.matrix_root_wallet, al.layer;

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_matrix_layer_view_root_layer 
ON matrix_layer_view USING btree (matrix_root_wallet, layer);

-- 验证视图创建成功
SELECT 'matrix_layer_view recreated successfully' as status;

-- 显示示例数据
SELECT 
  matrix_root_wallet,
  layer,
  filled_slots,
  left_members,
  middle_members, 
  right_members,
  max_slots,
  completion_rate,
  layer_status
FROM matrix_layer_view 
WHERE filled_slots > 0 
ORDER BY matrix_root_wallet, layer 
LIMIT 20;
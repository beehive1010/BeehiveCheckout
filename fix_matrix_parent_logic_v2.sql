-- 修正Matrix Parent Wallet计算逻辑 - 简化版本
-- 问题：当前parent_wallet都设为root_wallet，导致滑落安置的成员无法正确显示在parent的matrix中

-- 重新创建matrix_referrals_tree_view，修正parent_wallet逻辑
CREATE OR REPLACE VIEW matrix_referrals_tree_view AS
WITH spillover_data AS (
  SELECT 
    rt.root_wallet AS matrix_root_wallet,
    rt.referred_wallet AS member_wallet,
    rt.referrer_wallet,
    m.referrer_wallet AS actual_referrer,
    u.username,
    m.current_level,
    m.activation_time,
    m.activation_sequence,
    rt.depth AS referral_depth,
    -- 基础计算
    rt.depth + (row_number() OVER (PARTITION BY rt.root_wallet, rt.depth ORDER BY m.activation_time, m.activation_sequence) - 1) / 3 AS layer,
    row_number() OVER (PARTITION BY rt.root_wallet, rt.depth ORDER BY m.activation_time, m.activation_sequence) AS depth_sequence,
    CASE ((row_number() OVER (PARTITION BY rt.root_wallet, rt.depth ORDER BY m.activation_time, m.activation_sequence) - 1) % 3)
      WHEN 0 THEN 'L'
      WHEN 1 THEN 'M'
      ELSE 'R'
    END AS position,
    true AS is_activated,
    m.activation_time AS child_activation_time,
    CASE WHEN rt.depth = 1 THEN 'direct' ELSE 'indirect' END AS referral_type
  FROM referrals_tree_view rt
  JOIN members m ON m.wallet_address = rt.referred_wallet
  LEFT JOIN users u ON u.wallet_address = rt.referred_wallet
  WHERE rt.depth <= 19 AND m.current_level > 0 
  AND EXISTS (
    SELECT 1 FROM members m_root 
    WHERE m_root.wallet_address = rt.root_wallet AND m_root.current_level > 0
  )
),
-- 为每层添加序号
layered_data AS (
  SELECT 
    *,
    row_number() OVER (
      PARTITION BY matrix_root_wallet, layer 
      ORDER BY child_activation_time, member_wallet
    ) AS layer_sequence,
    (layer != referral_depth) AS is_spillover
  FROM spillover_data
),
-- 计算parent_wallet - 简化逻辑
final_data AS (
  SELECT 
    ld.*,
    CASE 
      WHEN ld.layer = 1 THEN ld.matrix_root_wallet
      WHEN ld.layer > 1 THEN 
        -- 简化：直接使用referrer作为parent，这是实际的推荐关系
        -- 后续可以通过业务逻辑处理滑落安置的parent关系
        COALESCE(ld.actual_referrer, ld.matrix_root_wallet)
      ELSE ld.matrix_root_wallet
    END AS parent_wallet
  FROM layered_data ld
)
SELECT 
  matrix_root_wallet,
  member_wallet,
  parent_wallet,
  actual_referrer AS referrer_wallet,
  username,
  current_level,
  activation_time,
  activation_sequence,
  referral_depth,
  LEAST(layer, 19) AS layer,
  position,
  is_spillover,
  is_activated,
  child_activation_time,
  referral_type
FROM final_data
WHERE layer <= 19

UNION ALL

-- Root节点
SELECT 
  m.wallet_address AS matrix_root_wallet,
  m.wallet_address AS member_wallet,
  NULL AS parent_wallet,
  m.referrer_wallet,
  u.username,
  m.current_level,
  m.activation_time,
  m.activation_sequence,
  0 AS referral_depth,
  0 AS layer,
  'root' AS position,
  false AS is_spillover,
  true AS is_activated,
  m.activation_time AS child_activation_time,
  'root' AS referral_type
FROM members m
LEFT JOIN users u ON u.wallet_address = m.wallet_address
WHERE m.current_level > 0

ORDER BY 1, 10, 14;
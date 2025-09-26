-- 重新设计matrix_referrals_tree_view，基于激活序号逻辑
-- 每个matrix_root按激活时间顺序分配序号，计算正确的layer、position和parent_wallet

DROP VIEW IF EXISTS matrix_referrals_tree_view CASCADE;

CREATE VIEW matrix_referrals_tree_view AS
WITH all_matrix_relationships AS (
  -- 收集所有应该出现在matrix中的成员关系
  SELECT DISTINCT
    rt.root_wallet as matrix_root_wallet,
    rt.referred_wallet as member_wallet,
    m.referrer_wallet,
    u.username,
    m.current_level,
    m.activation_time,
    m.activation_sequence,
    rt.depth as referral_depth,
    CASE WHEN rt.depth = 1 THEN 'direct' ELSE 'indirect' END as referral_type
  FROM referrals_tree_view rt
  JOIN members m ON m.wallet_address = rt.referred_wallet
  LEFT JOIN users u ON u.wallet_address = rt.referred_wallet
  WHERE m.current_level > 0
  AND rt.depth <= 19
  AND EXISTS (
    SELECT 1 FROM members m_root 
    WHERE m_root.wallet_address = rt.root_wallet AND m_root.current_level > 0
  )
),
matrix_with_sequence AS (
  -- 为每个matrix_root按激活时间分配序号
  SELECT 
    amr.*,
    -- 计算在该matrix中的激活序号
    row_number() OVER (
      PARTITION BY matrix_root_wallet 
      ORDER BY activation_time, member_wallet
    ) as matrix_activation_sequence
  FROM all_matrix_relationships amr
),
calculated_positions AS (
  -- 根据激活序号计算layer、position等
  SELECT 
    mws.*,
    -- 计算layer：序号1-3是layer1，4-12是layer2，等等
    ceil(matrix_activation_sequence / 3.0)::int as layer,
    -- 计算position：按序号循环L,M,R
    (ARRAY['L','M','R'])[(matrix_activation_sequence - 1) % 3 + 1] as position,
    -- 判断是否spillover（如果不是直接推荐关系）
    (referral_depth > 1) as is_spillover,
    true as is_activated,
    activation_time as child_activation_time
  FROM matrix_with_sequence mws
),
final_with_parent AS (
  -- 计算正确的parent_wallet
  SELECT 
    cp.*,
    CASE 
      WHEN cp.layer = 1 THEN cp.matrix_root_wallet
      WHEN cp.layer > 1 THEN (
        -- 找到上一层对应位置的成员作为parent
        -- Layer2的序号4,5,6对应parent序号1,2,3
        -- Layer3的序号7,8,9对应parent序号1,2,3，等等
        SELECT cp_parent.member_wallet
        FROM calculated_positions cp_parent
        WHERE cp_parent.matrix_root_wallet = cp.matrix_root_wallet
        AND cp_parent.matrix_activation_sequence = 
            ((cp.matrix_activation_sequence - 4) % 3) + 1  -- 映射到layer1的L,M,R
        LIMIT 1
      )
      ELSE cp.matrix_root_wallet
    END as parent_wallet
  FROM calculated_positions cp
)
-- 主查询：包含所有matrix成员
SELECT 
  matrix_root_wallet,
  member_wallet,
  COALESCE(parent_wallet, matrix_root_wallet) as parent_wallet,
  referrer_wallet,
  username,
  current_level,
  activation_time,
  activation_sequence,
  referral_depth,
  LEAST(layer, 19) as layer,
  position,
  is_spillover,
  is_activated,
  child_activation_time,
  referral_type
FROM final_with_parent
WHERE layer <= 19

UNION ALL

-- 添加所有matrix根节点
SELECT 
  m.wallet_address as matrix_root_wallet,
  m.wallet_address as member_wallet,
  NULL as parent_wallet,
  m.referrer_wallet,
  u.username,
  m.current_level,
  m.activation_time,
  m.activation_sequence,
  0 as referral_depth,
  0 as layer,
  'root' as position,
  false as is_spillover,
  true as is_activated,
  m.activation_time as child_activation_time,
  'root' as referral_type
FROM members m
LEFT JOIN users u ON u.wallet_address = m.wallet_address
WHERE m.current_level > 0

ORDER BY 1, 10, 14;
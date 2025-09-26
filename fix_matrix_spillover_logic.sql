-- 修正Matrix滑落安置逻辑
-- 关键理解：滑落的成员放在Layer2，parent_wallet是Layer1的成员

DROP VIEW IF EXISTS matrix_referrals_tree_view CASCADE;

CREATE VIEW matrix_referrals_tree_view AS
WITH direct_referrals AS (
  -- 每个matrix_root的直接推荐，按激活时间排序
  SELECT 
    rt.root_wallet as matrix_root_wallet,
    rt.referred_wallet as member_wallet,
    m.referrer_wallet,
    u.username,
    m.current_level,
    m.activation_time,
    m.activation_sequence,
    rt.depth as referral_depth,
    row_number() OVER (
      PARTITION BY rt.root_wallet 
      ORDER BY m.activation_time, m.activation_sequence
    ) as activation_order,
    'direct' as referral_type
  FROM referrals_tree_view rt
  JOIN members m ON m.wallet_address = rt.referred_wallet
  LEFT JOIN users u ON u.wallet_address = rt.referred_wallet
  WHERE rt.depth = 1  -- 只取直接推荐
  AND m.current_level > 0
  AND EXISTS (
    SELECT 1 FROM members m_root 
    WHERE m_root.wallet_address = rt.root_wallet AND m_root.current_level > 0
  )
),
layer1_members AS (
  -- Layer1：前3个直推成员占据L,M,R位置
  SELECT 
    matrix_root_wallet,
    member_wallet,
    matrix_root_wallet as parent_wallet,
    referrer_wallet,
    username,
    current_level,
    activation_time,
    activation_sequence,
    referral_depth,
    referral_depth as layer,  -- layer = 深度
    (ARRAY['L','M','R'])[activation_order] as position,
    false as is_spillover,
    true as is_activated,
    activation_time as child_activation_time,
    referral_type
  FROM direct_referrals
  WHERE activation_order <= 3
),
spillover_members AS (
  -- Layer2：第4+个成员需要滑落到Layer2
  SELECT 
    dr.matrix_root_wallet,
    dr.member_wallet,
    -- parent_wallet是Layer1成员，按滑落规则分配
    (SELECT l1.member_wallet 
     FROM layer1_members l1 
     WHERE l1.matrix_root_wallet = dr.matrix_root_wallet
     AND l1.position = (ARRAY['L','M','R'])[((dr.activation_order - 4) % 3) + 1]
     LIMIT 1
    ) as parent_wallet,
    dr.referrer_wallet,
    dr.username,
    dr.current_level,
    dr.activation_time,
    dr.activation_sequence,
    dr.referral_depth,
    2 as layer,  -- 滑落的成员在Layer2
    (ARRAY['L','M','R'])[((dr.activation_order - 4) % 3) + 1] as position,
    true as is_spillover,
    true as is_activated,
    dr.activation_time as child_activation_time,
    dr.referral_type
  FROM direct_referrals dr
  WHERE dr.activation_order > 3
),
indirect_referrals AS (
  -- 间接推荐的成员，需要找到合适的位置安置
  SELECT DISTINCT
    rt.root_wallet as matrix_root_wallet,
    rt.referred_wallet as member_wallet,
    -- 简化：parent_wallet设为实际推荐人
    rt.referrer_wallet as parent_wallet,
    m.referrer_wallet,
    u.username,
    m.current_level,
    m.activation_time,
    m.activation_sequence,
    rt.depth as referral_depth,
    LEAST(rt.depth + 1, 19) as layer,  -- 间接推荐的layer
    'L' as position,  -- 简化为L位置
    true as is_spillover,
    true as is_activated,
    m.activation_time as child_activation_time,
    'indirect' as referral_type
  FROM referrals_tree_view rt
  JOIN members m ON m.wallet_address = rt.referred_wallet
  LEFT JOIN users u ON u.wallet_address = rt.referred_wallet
  WHERE rt.depth > 1  -- 间接推荐
  AND rt.depth <= 19
  AND m.current_level > 0
  AND EXISTS (
    SELECT 1 FROM members m_root 
    WHERE m_root.wallet_address = rt.root_wallet AND m_root.current_level > 0
  )
)
-- 合并所有结果
SELECT * FROM layer1_members
UNION ALL
SELECT * FROM spillover_members  
UNION ALL
SELECT * FROM indirect_referrals

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

ORDER BY matrix_root_wallet, layer, activation_time;
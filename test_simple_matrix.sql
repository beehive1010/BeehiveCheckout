-- 简化测试Matrix逻辑
DROP VIEW IF EXISTS matrix_referrals_tree_view CASCADE;

CREATE VIEW matrix_referrals_tree_view AS
WITH positioned_members AS (
  SELECT 
    rt.root_wallet as matrix_root_wallet,
    rt.referred_wallet as member_wallet,
    CASE 
      WHEN rt.depth = 1 THEN rt.root_wallet  -- layer1的parent是root
      ELSE rt.referrer_wallet  -- 其他层的parent是推荐人
    END as parent_wallet,
    m.referrer_wallet,
    u.username,
    m.current_level,
    m.activation_time,
    m.activation_sequence,
    rt.depth as referral_depth,
    rt.depth as layer,  -- layer = 深度
    -- 按每层的激活顺序分配L,M,R位置
    (ARRAY['L','M','R'])[(row_number() OVER (PARTITION BY rt.root_wallet, rt.depth ORDER BY m.activation_time, m.activation_sequence) - 1) % 3 + 1] as position,
    (rt.depth > 1) as is_spillover,  -- 深度>1就是spillover
    true as is_activated,
    m.activation_time as child_activation_time,
    CASE WHEN rt.depth = 1 THEN 'direct' ELSE 'indirect' END as referral_type
  FROM referrals_tree_view rt
  JOIN members m ON m.wallet_address = rt.referred_wallet
  LEFT JOIN users u ON u.wallet_address = rt.referred_wallet
  WHERE rt.depth <= 19 
  AND m.current_level > 0
  AND EXISTS (
    SELECT 1 FROM members m_root 
    WHERE m_root.wallet_address = rt.root_wallet AND m_root.current_level > 0
  )
)
SELECT * FROM positioned_members

UNION ALL

-- 添加根用户（matrix_root本人没有parent）
SELECT 
  m.wallet_address as matrix_root_wallet,
  m.wallet_address as member_wallet,
  NULL as parent_wallet,  -- matrix_root本人没有parent
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
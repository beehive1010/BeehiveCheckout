-- 修正Layer2的parent_wallet逻辑
DROP VIEW IF EXISTS matrix_referrals_tree_view CASCADE;

CREATE VIEW matrix_referrals_tree_view AS
WITH positioned_members AS (
  SELECT 
    rt.root_wallet as matrix_root_wallet,
    rt.referred_wallet as member_wallet,
    m.referrer_wallet,
    u.username,
    m.current_level,
    m.activation_time,
    m.activation_sequence,
    rt.depth as referral_depth,
    rt.depth as layer,
    -- 按每层的激活顺序分配L,M,R位置
    (ARRAY['L','M','R'])[(row_number() OVER (PARTITION BY rt.root_wallet, rt.depth ORDER BY m.activation_time, m.activation_sequence) - 1) % 3 + 1] as position,
    -- 计算在该layer中的序号
    row_number() OVER (PARTITION BY rt.root_wallet, rt.depth ORDER BY m.activation_time, m.activation_sequence) as layer_sequence,
    (rt.depth > 1) as is_spillover,
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
),
members_with_parent AS (
  SELECT 
    pm.*,
    CASE 
      WHEN pm.layer = 1 THEN pm.matrix_root_wallet  -- Layer1的parent是matrix_root
      WHEN pm.layer = 2 THEN (
        -- Layer2的parent是Layer1对应位置的成员
        -- 每3个Layer2成员对应一个Layer1成员
        SELECT pm_layer1.member_wallet
        FROM positioned_members pm_layer1
        WHERE pm_layer1.matrix_root_wallet = pm.matrix_root_wallet
        AND pm_layer1.layer = 1
        AND pm_layer1.position = (ARRAY['L','M','R'])[((pm.layer_sequence - 1) / 3)::int + 1]
        LIMIT 1
      )
      WHEN pm.layer > 2 THEN pm.referrer_wallet  -- Layer3+用推荐人作为parent
      ELSE pm.matrix_root_wallet
    END as parent_wallet
  FROM positioned_members pm
)
SELECT 
  matrix_root_wallet,
  member_wallet,
  parent_wallet,
  referrer_wallet,
  username,
  current_level,
  activation_time,
  activation_sequence,
  referral_depth,
  layer,
  position,
  is_spillover,
  is_activated,
  child_activation_time,
  referral_type
FROM members_with_parent

UNION ALL

-- 添加matrix根节点
SELECT 
  m.wallet_address as matrix_root_wallet,
  m.wallet_address as member_wallet,
  NULL as parent_wallet,  -- matrix_root没有parent
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
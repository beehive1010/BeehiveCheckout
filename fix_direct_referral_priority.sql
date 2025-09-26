-- 修正直推优先占位逻辑，depth = layer
DROP VIEW IF EXISTS matrix_referrals_tree_view CASCADE;

CREATE VIEW matrix_referrals_tree_view AS
WITH direct_priority_assignment AS (
  SELECT 
    rt.root_wallet as matrix_root_wallet,
    rt.referred_wallet as member_wallet,
    rt.referrer_wallet,
    m.referrer_wallet as actual_referrer,
    u.username,
    m.current_level,
    m.activation_time,
    m.activation_sequence,
    rt.depth as referral_depth,
    rt.depth as layer,  -- depth = layer
    -- 直推成员优先分配L,M,R，按激活时间排序
    CASE 
      WHEN rt.depth = 1 THEN 
        (ARRAY['L','M','R'])[(row_number() OVER (PARTITION BY rt.root_wallet, rt.depth ORDER BY m.activation_time, m.activation_sequence) - 1) % 3 + 1]
      ELSE 
        -- 非直推按在该层的顺序分配L,M,R
        (ARRAY['L','M','R'])[(row_number() OVER (PARTITION BY rt.root_wallet, rt.depth ORDER BY m.activation_time, m.activation_sequence) - 1) % 3 + 1]
    END as position,
    (rt.depth > 1) as is_spillover,  -- depth > 1 就是spillover
    true as is_activated,
    m.activation_time as child_activation_time,
    CASE 
      WHEN rt.depth = 1 THEN 'direct'
      ELSE 'indirect'
    END as referral_type,
    -- 在该层中的序号，用于计算parent
    row_number() OVER (PARTITION BY rt.root_wallet, rt.depth ORDER BY m.activation_time, m.activation_sequence) as layer_sequence
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
    dpa.*,
    CASE 
      WHEN dpa.layer = 1 THEN dpa.matrix_root_wallet  -- Layer1的parent是matrix_root
      WHEN dpa.layer = 2 THEN (
        -- Layer2的parent是Layer1对应位置的成员
        -- 每3个Layer2成员对应一个Layer1成员
        SELECT dpa_layer1.member_wallet
        FROM direct_priority_assignment dpa_layer1
        WHERE dpa_layer1.matrix_root_wallet = dpa.matrix_root_wallet
        AND dpa_layer1.layer = 1
        AND dpa_layer1.position = (ARRAY['L','M','R'])[((dpa.layer_sequence - 1) / 3)::int + 1]
        LIMIT 1
      )
      WHEN dpa.layer > 2 THEN (
        -- Layer3+的parent是Layer2对应位置的成员
        SELECT dpa_parent.member_wallet
        FROM direct_priority_assignment dpa_parent
        WHERE dpa_parent.matrix_root_wallet = dpa.matrix_root_wallet
        AND dpa_parent.layer = dpa.layer - 1
        AND dpa_parent.position = (ARRAY['L','M','R'])[((dpa.layer_sequence - 1) / 3)::int + 1]
        LIMIT 1
      )
      ELSE dpa.matrix_root_wallet
    END as parent_wallet
  FROM direct_priority_assignment dpa
)
SELECT 
  matrix_root_wallet,
  member_wallet,
  parent_wallet,
  actual_referrer as referrer_wallet,
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
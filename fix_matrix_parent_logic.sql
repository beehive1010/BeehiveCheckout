-- 修正Matrix Parent Wallet计算逻辑
-- 问题：当前parent_wallet都设为root_wallet，导致滑落安置的成员无法正确显示在parent的matrix中

-- Step 1: 临时删除依赖的views
DROP VIEW IF EXISTS matrix_layers_view CASCADE;
DROP VIEW IF EXISTS referrals_stats_view CASCADE;

-- Step 2: 重新创建matrix_referrals_tree_view，修正parent_wallet逻辑
DROP VIEW IF EXISTS matrix_referrals_tree_view CASCADE;

CREATE VIEW matrix_referrals_tree_view AS
WITH referral_spillover AS (
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
    -- 计算layer (包含spillover)
    (rt.depth + (row_number() OVER (PARTITION BY rt.root_wallet, rt.depth ORDER BY m.activation_time, m.activation_sequence) - 1) / 3) AS layer,
    -- 计算在该层的全局序号
    row_number() OVER (PARTITION BY rt.root_wallet, (rt.depth + (row_number() OVER (PARTITION BY rt.root_wallet, rt.depth ORDER BY m.activation_time, m.activation_sequence) - 1) / 3) ORDER BY m.activation_time, m.activation_sequence) AS layer_sequence,
    -- 计算position
    CASE ((row_number() OVER (PARTITION BY rt.root_wallet, rt.depth ORDER BY m.activation_time, m.activation_sequence) - 1) % 3)
      WHEN 0 THEN 'L'
      WHEN 1 THEN 'M'
      ELSE 'R'
    END AS position,
    -- 判断是否spillover
    ((rt.depth + (row_number() OVER (PARTITION BY rt.root_wallet, rt.depth ORDER BY m.activation_time, m.activation_sequence) - 1) / 3) != rt.depth) AS is_spillover,
    true AS is_activated,
    m.activation_time AS child_activation_time,
    CASE 
      WHEN rt.depth = 1 THEN 'direct'
      ELSE 'indirect'
    END AS referral_type
  FROM referrals_tree_view rt
  JOIN members m ON m.wallet_address = rt.referred_wallet
  LEFT JOIN users u ON u.wallet_address = rt.referred_wallet
  WHERE rt.depth <= 19 AND m.current_level > 0 
  AND EXISTS (
    SELECT 1 FROM members m_root 
    WHERE m_root.wallet_address = rt.root_wallet AND m_root.current_level > 0
  )
),
-- 计算每个成员在各个matrix_root中的正确parent
members_with_parent AS (
  SELECT 
    rs.*,
    CASE 
      WHEN rs.layer = 1 THEN rs.matrix_root_wallet  -- layer1的parent是matrix_root
      WHEN rs.layer > 1 THEN (
        -- 根据滑落安置逻辑计算parent
        -- layer_sequence决定parent：每3个为一组，分别对应上层的L,M,R成员
        WITH parent_layer AS (
          SELECT 
            member_wallet,
            layer_sequence as parent_seq
          FROM referral_spillover rs_parent
          WHERE rs_parent.matrix_root_wallet = rs.matrix_root_wallet
          AND rs_parent.layer = rs.layer - 1
        )
        SELECT pl.member_wallet
        FROM parent_layer pl
        WHERE pl.parent_seq = CASE 
          WHEN rs.layer_sequence <= 3 THEN 1  -- 前3个成员的parent是上层第1个(L)
          WHEN rs.layer_sequence <= 6 THEN 2  -- 中3个成员的parent是上层第2个(M)
          WHEN rs.layer_sequence <= 9 THEN 3  -- 后3个成员的parent是上层第3个(R)
          -- 对于更多层级，继续这个模式
          ELSE ((rs.layer_sequence - 1) % 3) + 1
        END
        LIMIT 1
      )
      ELSE rs.matrix_root_wallet  -- fallback
    END AS parent_wallet
  FROM referral_spillover rs
)
SELECT 
  matrix_root_wallet,
  member_wallet,
  COALESCE(parent_wallet, matrix_root_wallet) AS parent_wallet,
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
FROM members_with_parent
WHERE layer <= 19

UNION ALL

-- Root节点
SELECT 
  m.wallet_address AS matrix_root_wallet,
  m.wallet_address AS member_wallet,
  NULL AS parent_wallet,  -- Root没有parent
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

-- Step 3: 重新创建依赖的views
-- 重新创建 matrix_layers_view
CREATE VIEW matrix_layers_view AS
WITH layer_stats AS (
  SELECT 
    matrix_root_wallet,
    layer,
    count(*) AS filled_slots,
    count(CASE WHEN position = 'L' THEN 1 END) AS l_slots,
    count(CASE WHEN position = 'M' THEN 1 END) AS m_slots,
    count(CASE WHEN position = 'R' THEN 1 END) AS r_slots
  FROM matrix_referrals_tree_view
  WHERE layer > 0 AND layer <= 19
  GROUP BY matrix_root_wallet, layer
),
all_layers AS (
  SELECT 
    base.matrix_root_wallet,
    series.layer,
    power(3, series.layer)::bigint AS max_slots
  FROM (
    SELECT DISTINCT matrix_root_wallet 
    FROM matrix_referrals_tree_view 
    WHERE layer = 0
  ) base
  CROSS JOIN (SELECT generate_series(1, 19) AS layer) series
)
SELECT 
  al.matrix_root_wallet,
  al.layer,
  al.max_slots,
  COALESCE(ls.filled_slots, 0) AS filled_slots,
  COALESCE(ls.l_slots, 0) AS l_slots,
  COALESCE(ls.m_slots, 0) AS m_slots,
  COALESCE(ls.r_slots, 0) AS r_slots,
  CASE 
    WHEN al.max_slots > 0 THEN 
      round((COALESCE(ls.filled_slots, 0)::numeric / al.max_slots::numeric) * 100, 4)
    ELSE 0.00
  END AS completion_rate,
  (al.max_slots - COALESCE(ls.filled_slots, 0)) AS empty_slots
FROM all_layers al
LEFT JOIN layer_stats ls ON ls.matrix_root_wallet = al.matrix_root_wallet 
  AND ls.layer = al.layer
ORDER BY al.matrix_root_wallet, al.layer;

-- 重新创建 referrals_stats_view (保持原有逻辑)
CREATE VIEW referrals_stats_view AS
WITH direct_referrals_stats AS (
  SELECT 
    r.referrer_wallet AS wallet_address,
    count(*) AS direct_referrals_count,
    count(CASE WHEN m.current_level > 0 THEN 1 END) AS activated_referrals_count,
    max(r.created_at) AS last_referral_time,
    min(r.created_at) AS first_referral_time
  FROM referrals_new r
  LEFT JOIN members m ON lower(r.referred_wallet) = lower(m.wallet_address)
  WHERE r.referrer_wallet IS NOT NULL 
  AND r.referred_wallet != '0x0000000000000000000000000000000000000001'
  GROUP BY r.referrer_wallet
),
matrix_stats AS (
  SELECT 
    matrix_root_wallet AS wallet_address,
    count(CASE WHEN layer > 0 THEN 1 END) AS total_team_size,
    max(layer) AS max_layer,
    count(CASE WHEN layer = 1 THEN 1 END) AS layer1_count,
    count(DISTINCT layer) AS active_layers
  FROM matrix_referrals_tree_view
  WHERE layer > 0
  GROUP BY matrix_root_wallet
),
all_members AS (
  SELECT DISTINCT 
    m.wallet_address,
    m.current_level,
    m.activation_time,
    m.referrer_wallet,
    u.username
  FROM members m
  LEFT JOIN users u ON lower(m.wallet_address) = lower(u.wallet_address)
  WHERE m.current_level > 0
)
SELECT 
  am.wallet_address,
  am.username,
  am.current_level,
  am.activation_time,
  am.referrer_wallet,
  COALESCE(drs.direct_referrals_count, 0) AS direct_referrals_count,
  COALESCE(drs.activated_referrals_count, 0) AS activated_referrals_count,
  drs.first_referral_time,
  drs.last_referral_time,
  COALESCE(ms.total_team_size, 0) AS total_team_size,
  COALESCE(ms.max_layer, 0) AS max_layer,
  COALESCE(ms.layer1_count, 0) AS layer1_count,
  COALESCE(ms.active_layers, 0) AS active_layers,
  COALESCE(ms.total_team_size, 0) AS total_activated_members,
  (COALESCE(drs.direct_referrals_count, 0) + COALESCE(ms.total_team_size, 0)) AS total_network_size,
  CASE WHEN ms.total_team_size > 0 THEN true ELSE false END AS has_matrix_team,
  CASE 
    WHEN drs.direct_referrals_count > 0 THEN 
      round((drs.activated_referrals_count::numeric / drs.direct_referrals_count::numeric) * 100, 2)
    ELSE 0.00
  END AS activation_rate,
  CASE 
    WHEN drs.last_referral_time > (now() - interval '30 days') THEN true 
    ELSE false 
  END AS is_recently_active
FROM all_members am
LEFT JOIN direct_referrals_stats drs ON lower(drs.wallet_address) = lower(am.wallet_address)
LEFT JOIN matrix_stats ms ON lower(ms.wallet_address) = lower(am.wallet_address)
ORDER BY am.activation_time DESC;
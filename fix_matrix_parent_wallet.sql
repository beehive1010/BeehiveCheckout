-- Fix Matrix Parent Wallet Issue
-- The problem: parent_wallet is set to root_wallet instead of referrer_wallet

-- Step 1: Drop dependent views temporarily
DROP VIEW IF EXISTS matrix_layers_view CASCADE;
DROP VIEW IF EXISTS referrals_stats_view CASCADE;

-- Step 2: Create corrected matrix_referrals_tree_view
DROP VIEW IF EXISTS matrix_referrals_tree_view CASCADE;

CREATE VIEW matrix_referrals_tree_view AS
WITH referral_spillover AS (
  SELECT 
    rt.root_wallet AS matrix_root_wallet,
    rt.referred_wallet AS member_wallet,
    -- FIX: parent_wallet should be referrer_wallet, not root_wallet
    rt.referrer_wallet AS parent_wallet,
    m.referrer_wallet,
    u.username,
    m.current_level,
    m.activation_time,
    m.activation_sequence,
    rt.depth AS referral_depth,
    (rt.depth + (row_number() OVER (PARTITION BY rt.root_wallet, rt.depth ORDER BY m.activation_time, m.activation_sequence) - 1) / 3) AS layer,
    CASE ((row_number() OVER (PARTITION BY rt.root_wallet, rt.depth ORDER BY m.activation_time, m.activation_sequence) - 1) % 3)
      WHEN 0 THEN 'L'
      WHEN 1 THEN 'M'
      ELSE 'R'
    END AS position,
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
)
SELECT 
  matrix_root_wallet,
  member_wallet,
  parent_wallet,  -- Now correctly set to referrer_wallet
  referrer_wallet,
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
FROM referral_spillover
WHERE layer <= 19

UNION ALL

-- Root nodes (parent_wallet = NULL for roots)
SELECT 
  m.wallet_address AS matrix_root_wallet,
  m.wallet_address AS member_wallet,
  NULL AS parent_wallet,  -- Root has no parent
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

-- Step 3: Recreate matrix_layers_view
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

-- Step 4: Recreate referrals_stats_view if it exists
-- This is a placeholder - you may need to adjust based on actual definition
CREATE VIEW referrals_stats_view AS
SELECT 
  matrix_root_wallet,
  COUNT(*) as total_referrals,
  COUNT(CASE WHEN referral_type = 'direct' THEN 1 END) as direct_referrals,
  COUNT(CASE WHEN referral_type = 'indirect' THEN 1 END) as indirect_referrals,
  COUNT(CASE WHEN is_spillover = true THEN 1 END) as spillover_placements
FROM matrix_referrals_tree_view
WHERE layer > 0
GROUP BY matrix_root_wallet;
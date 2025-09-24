-- Improve referrals_stats_view to include team size data from matrix
-- This will provide comprehensive referral and team data for dashboard

CREATE OR REPLACE VIEW referrals_stats_view AS
WITH 
-- Direct referral counts
direct_referrals AS (
  SELECT 
    rn.referrer_wallet AS wallet_address,
    u.username,
    m.current_level,
    m.activation_sequence,
    COUNT(rn.referred_wallet) AS direct_referrals_count,
    CASE 
      WHEN COUNT(rn.referred_wallet) >= 3 THEN true 
      ELSE false 
    END AS level2_upgrade_eligible,
    COUNT(CASE WHEN rm.current_level > 0 THEN 1 END) AS activated_referrals_count,
    MAX(rn.created_at) AS last_referral_time,
    MIN(rn.created_at) AS first_referral_time
  FROM referrals_new rn
  LEFT JOIN users u ON u.wallet_address = rn.referrer_wallet
  LEFT JOIN members m ON m.wallet_address = rn.referrer_wallet  
  LEFT JOIN members rm ON rm.wallet_address = rn.referred_wallet
  WHERE rn.referred_wallet != '0x0000000000000000000000000000000000000001'
  GROUP BY rn.referrer_wallet, u.username, m.current_level, m.activation_sequence
),

-- Matrix team size from matrix_layers_view
matrix_team_stats AS (
  SELECT 
    matrix_root_wallet as wallet_address,
    SUM(filled_slots) as total_team_size,
    MAX(layer) as max_layer,
    COUNT(CASE WHEN filled_slots > 0 THEN 1 END) as active_layers,
    SUM(activated_members) as total_activated_members
  FROM matrix_layers_view
  WHERE filled_slots > 0
  GROUP BY matrix_root_wallet
),

-- Members without referrals (activated but no direct referrals)
members_without_referrals AS (
  SELECT 
    m.wallet_address,
    u.username,
    m.current_level,
    m.activation_sequence,
    0 AS direct_referrals_count,
    false AS level2_upgrade_eligible,
    0 AS activated_referrals_count,
    NULL::timestamp with time zone AS last_referral_time,
    NULL::timestamp with time zone AS first_referral_time
  FROM members m
  LEFT JOIN users u ON u.wallet_address = m.wallet_address
  WHERE m.current_level > 0 
    AND NOT EXISTS (
      SELECT 1 FROM referrals_new rn2 
      WHERE rn2.referrer_wallet = m.wallet_address 
        AND rn2.referred_wallet != '0x0000000000000000000000000000000000000001'
    )
)

-- Combine all data
SELECT 
  COALESCE(dr.wallet_address, mwr.wallet_address) as wallet_address,
  COALESCE(dr.username, mwr.username) as username,
  COALESCE(dr.current_level, mwr.current_level) as current_level,
  COALESCE(dr.activation_sequence, mwr.activation_sequence) as activation_sequence,
  COALESCE(dr.direct_referrals_count, mwr.direct_referrals_count) as direct_referrals_count,
  COALESCE(dr.level2_upgrade_eligible, mwr.level2_upgrade_eligible) as level2_upgrade_eligible,
  COALESCE(dr.activated_referrals_count, mwr.activated_referrals_count) as activated_referrals_count,
  COALESCE(dr.last_referral_time, mwr.last_referral_time) as last_referral_time,
  COALESCE(dr.first_referral_time, mwr.first_referral_time) as first_referral_time,
  
  -- Matrix team data (NEW COLUMNS)
  COALESCE(mts.total_team_size, 0) as total_team_size,
  COALESCE(mts.max_layer, 0) as max_layer,
  COALESCE(mts.active_layers, 0) as active_layers,
  COALESCE(mts.total_activated_members, 0) as total_activated_members,
  
  -- Computed fields
  (COALESCE(dr.direct_referrals_count, mwr.direct_referrals_count, 0) + 
   COALESCE(mts.total_team_size, 0)) as total_network_size,
   
  CASE 
    WHEN COALESCE(mts.total_team_size, 0) > 0 THEN true 
    ELSE false 
  END as has_matrix_team

FROM direct_referrals dr
FULL OUTER JOIN members_without_referrals mwr ON dr.wallet_address = mwr.wallet_address
LEFT JOIN matrix_team_stats mts ON COALESCE(dr.wallet_address, mwr.wallet_address) = mts.wallet_address

WHERE COALESCE(dr.wallet_address, mwr.wallet_address) != '0x0000000000000000000000000000000000000001'
ORDER BY COALESCE(dr.activation_sequence, mwr.activation_sequence);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_referrals_stats_view_wallet 
ON referrals_new(referrer_wallet);

COMMENT ON VIEW referrals_stats_view IS 
'Enhanced referrals stats view including matrix team size data for comprehensive dashboard reporting';
-- Create comprehensive dashboard view that combines all necessary data
-- This view will provide all recommendation and matrix data needed for dashboard components

CREATE OR REPLACE VIEW comprehensive_dashboard_stats AS
WITH 
-- Basic member info
member_base AS (
  SELECT 
    m.wallet_address,
    u.username,
    m.current_level,
    m.activation_sequence,
    m.activation_time as join_date,
    CASE WHEN m.current_level > 0 THEN true ELSE false END as is_activated
  FROM members m
  LEFT JOIN users u ON u.wallet_address = m.wallet_address
),

-- Referral statistics from referrer_stats view
referral_stats AS (
  SELECT 
    referrer as wallet_address,
    "直接推荐数" as direct_referrals,
    "激活推荐数" as activated_referrals,
    total_direct_referrals,
    activated_referrals as activated_count
  FROM referrer_stats
),

-- Matrix statistics from matrix_layers_view - get summary for each root
matrix_stats AS (
  SELECT 
    matrix_root_wallet as wallet_address,
    COUNT(*) as total_layers_with_data,
    MAX(layer) as max_layer,
    SUM(filled_slots) as total_team_size,
    SUM(activated_members) as total_activated_members,
    AVG(completion_rate) as avg_completion_rate
  FROM matrix_layers_view 
  WHERE filled_slots > 0
  GROUP BY matrix_root_wallet
),

-- Balance data
balance_info AS (
  SELECT 
    wallet_address,
    bcc_transferable,
    bcc_locked,
    bcc_restricted,
    total_usdt_earned
  FROM user_balances
),

-- Reward statistics
reward_stats AS (
  SELECT 
    reward_recipient_wallet as wallet_address,
    COUNT(*) as total_rewards,
    COUNT(CASE WHEN status = 'claimable' THEN 1 END) as claimable_rewards,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_rewards,
    COUNT(CASE WHEN status = 'claimed' THEN 1 END) as claimed_rewards,
    SUM(CASE WHEN status = 'claimable' THEN reward_amount ELSE 0 END) as claimable_amount,
    SUM(CASE WHEN status = 'pending' THEN reward_amount ELSE 0 END) as pending_amount,
    SUM(CASE WHEN status = 'claimed' THEN reward_amount ELSE 0 END) as total_earned_amount
  FROM layer_rewards
  GROUP BY reward_recipient_wallet
)

-- Main query combining all data
SELECT 
  mb.wallet_address,
  mb.username,
  mb.current_level,
  mb.activation_sequence,
  mb.join_date,
  mb.is_activated,
  
  -- Referral data
  COALESCE(rs.direct_referrals, 0) as direct_referrals,
  COALESCE(rs.activated_referrals, 0) as activated_referrals,
  COALESCE(rs.total_direct_referrals, 0) as total_direct_referrals,
  
  -- Matrix data  
  COALESCE(ms.total_team_size, 0) as total_team_size,
  COALESCE(ms.max_layer, 0) as max_layer,
  COALESCE(ms.total_activated_members, 0) as total_activated_members,
  COALESCE(ms.avg_completion_rate, 0) as avg_completion_rate,
  COALESCE(ms.total_layers_with_data, 0) as layers_with_data,
  
  -- Balance data
  COALESCE(bi.bcc_transferable, 0) as bcc_transferable,
  COALESCE(bi.bcc_locked, 0) as bcc_locked,
  COALESCE(bi.bcc_restricted, 0) as bcc_restricted,
  COALESCE(bi.total_usdt_earned, 0) as total_usdt_earned,
  
  -- Reward data
  COALESCE(rws.total_rewards, 0) as total_rewards,
  COALESCE(rws.claimable_rewards, 0) as claimable_rewards,
  COALESCE(rws.pending_rewards, 0) as pending_rewards,
  COALESCE(rws.claimed_rewards, 0) as claimed_rewards,
  COALESCE(rws.claimable_amount, 0) as claimable_amount,
  COALESCE(rws.pending_amount, 0) as pending_amount,
  COALESCE(rws.total_earned_amount, 0) as total_earned_amount,
  
  -- Computed fields for dashboard
  CASE 
    WHEN COALESCE(rs.direct_referrals, 0) >= 3 THEN true 
    ELSE false 
  END as level2_upgrade_eligible,
  
  -- Network strength calculation
  (COALESCE(rs.direct_referrals, 0) * 10 + 
   COALESCE(ms.total_team_size, 0) * 5 + 
   COALESCE(rs.activated_referrals, 0) * 15) as network_strength,
   
  -- Activity indicators
  CASE 
    WHEN rws.total_rewards > 0 THEN true 
    ELSE false 
  END as has_rewards,
  
  CASE 
    WHEN ms.total_team_size > 0 THEN true 
    ELSE false 
  END as has_team

FROM member_base mb
LEFT JOIN referral_stats rs ON rs.wallet_address = mb.wallet_address  
LEFT JOIN matrix_stats ms ON ms.wallet_address = mb.wallet_address
LEFT JOIN balance_info bi ON bi.wallet_address = mb.wallet_address
LEFT JOIN reward_stats rws ON rws.wallet_address = mb.wallet_address
WHERE mb.wallet_address IS NOT NULL
ORDER BY mb.activation_sequence;

-- Create an index to improve query performance
CREATE INDEX IF NOT EXISTS idx_comprehensive_dashboard_wallet 
ON members(wallet_address);

-- Add a comment explaining the view
COMMENT ON VIEW comprehensive_dashboard_stats IS 
'Comprehensive dashboard statistics view combining member info, referrals, matrix data, balances, and rewards for efficient dashboard queries';
-- Fix levels_owned type mismatch in user_bcc_balance_overview view
-- levels_owned is JSONB type, not INTEGER[]

-- Update the user_bcc_balance_overview view with correct types
DROP VIEW IF EXISTS user_bcc_balance_overview;

CREATE OR REPLACE VIEW user_bcc_balance_overview AS
SELECT 
    ub.wallet_address,
    COALESCE(ub.bcc_transferable, 0) as bcc_transferable,
    COALESCE(ub.bcc_locked, 0) as bcc_locked,
    COALESCE(ub.bcc_earned_rewards, 0) as bcc_earned_rewards,
    COALESCE(ub.bcc_pending_activation, 0) as bcc_pending_activation,
    COALESCE(ub.bcc_locked_staking, 0) as bcc_locked_staking,
    (COALESCE(ub.bcc_transferable, 0) + COALESCE(ub.bcc_locked, 0) + COALESCE(ub.bcc_earned_rewards, 0) + COALESCE(ub.bcc_pending_activation, 0) + COALESCE(ub.bcc_locked_staking, 0)) as total_bcc_balance,
    COALESCE(ub.tier_phase, 1) as tier_phase,
    COALESCE(mat.unlock_per_level, 100.0) as tier_multiplier,
    COALESCE(mat.tier_name, 'Tier 1') as tier_name,
    COALESCE(m.current_level, 0) as current_level,
    COALESCE(m.is_activated, false) as is_activated,
    COALESCE(m.levels_owned, '[]'::jsonb) as levels_owned,  -- Use JSONB instead of INTEGER[]
    0 as pending_reward_claims,
    0::DECIMAL(20,8) as pending_bcc_rewards
FROM user_balances ub
LEFT JOIN member_activation_tiers mat ON mat.tier = COALESCE(ub.tier_phase, 1)
LEFT JOIN members m ON m.wallet_address = ub.wallet_address;

-- Grant permissions
GRANT SELECT ON user_bcc_balance_overview TO authenticated, anon;

COMMENT ON VIEW user_bcc_balance_overview IS 'Comprehensive view of user BCC balances with correct JSONB type handling';
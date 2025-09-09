-- Step 1: Safe Objects (Views & Functions)
-- Execute this against your Supabase database

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Update view
DROP VIEW IF EXISTS user_bcc_balance_overview;
CREATE VIEW user_bcc_balance_overview AS
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
    COALESCE(m.levels_owned, '[]'::jsonb) as levels_owned,
    0 as pending_reward_claims,
    0::DECIMAL(20,8) as pending_bcc_rewards
FROM user_balances ub
LEFT JOIN member_activation_tiers mat ON mat.tier = COALESCE(ub.tier_phase, 1)
LEFT JOIN members m ON m.wallet_address = ub.wallet_address;

-- Verification query - run this to test
-- SELECT * FROM user_bcc_balance_overview LIMIT 1;
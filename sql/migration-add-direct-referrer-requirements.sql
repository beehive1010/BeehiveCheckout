-- ================================
-- MIGRATION: Add Direct Referrer Requirements to Level Config
-- ================================

BEGIN;

-- Step 1: Add direct_referrers_required field to level_config
ALTER TABLE level_config 
ADD COLUMN IF NOT EXISTS direct_referrers_required INTEGER NOT NULL DEFAULT 0;

-- Step 2: Update level configuration with direct referrer requirements
-- Level 2 and 3 need 2 direct referrers, others have no requirement
UPDATE level_config 
SET direct_referrers_required = CASE 
    WHEN level = 2 THEN 2  -- Guardian needs 2 direct referrers
    WHEN level = 3 THEN 2  -- Sentinel needs 2 direct referrers  
    ELSE 0                 -- All other levels have no requirement
END;

-- Step 3: Add upgrade_countdown_hours field for 72-hour upgrade timer
ALTER TABLE level_config
ADD COLUMN IF NOT EXISTS upgrade_countdown_hours INTEGER NOT NULL DEFAULT 72;

-- Step 4: Update reward qualification rules in level config
-- Add fields to clarify the reward rules
ALTER TABLE level_config
ADD COLUMN IF NOT EXISTS reward_requires_level_match BOOLEAN NOT NULL DEFAULT true;

-- Update level config with reward rules
UPDATE level_config SET
    reward_requires_level_match = true,  -- Level X rewards require >= Level X membership
    upgrade_countdown_hours = 72        -- 72-hour countdown for upgrades
WHERE level BETWEEN 1 AND 19;

-- Step 5: Create helper view for direct referral counts
CREATE OR REPLACE VIEW user_direct_referral_counts AS
SELECT 
    u.wallet_address,
    COUNT(CASE WHEN ref_u.wallet_address IS NOT NULL THEN 1 END) as direct_referral_count,
    ARRAY_AGG(ref_u.wallet_address) FILTER (WHERE ref_u.wallet_address IS NOT NULL) as direct_referrals
FROM users u
LEFT JOIN users ref_u ON ref_u.referrer_wallet = u.wallet_address
LEFT JOIN members ref_m ON ref_u.wallet_address = ref_m.wallet_address AND ref_m.is_activated = true
GROUP BY u.wallet_address;

-- Step 6: Update the level configuration data with complete information
UPDATE level_config SET
    -- Level 1: No direct referrer requirement
    direct_referrers_required = 0,
    upgrade_countdown_hours = 72,
    reward_requires_level_match = true
WHERE level = 1;

UPDATE level_config SET
    -- Level 2: Requires 2 direct activated referrers
    direct_referrers_required = 2,
    upgrade_countdown_hours = 72,
    reward_requires_level_match = true
WHERE level = 2;

UPDATE level_config SET
    -- Level 3: Requires 2 direct activated referrers
    direct_referrers_required = 2,
    upgrade_countdown_hours = 72,
    reward_requires_level_match = true
WHERE level = 3;

UPDATE level_config SET
    -- Levels 4-19: No direct referrer requirement
    direct_referrers_required = 0,
    upgrade_countdown_hours = 72,
    reward_requires_level_match = true
WHERE level BETWEEN 4 AND 19;

-- Step 7: Add member upgrade pending table for 72-hour countdown
CREATE TABLE IF NOT EXISTS member_upgrade_pending (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    target_level INTEGER NOT NULL,
    current_level INTEGER NOT NULL,
    upgrade_fee_paid INTEGER NOT NULL,  -- USDT cents paid
    direct_referrers_count INTEGER NOT NULL DEFAULT 0,
    direct_referrers_required INTEGER NOT NULL DEFAULT 0,
    countdown_expires_at TIMESTAMP NOT NULL,  -- 72 hours from payment
    status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'qualified', 'expired', 'activated'
    payment_tx_hash TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Step 8: Create index for the new table
CREATE INDEX IF NOT EXISTS idx_member_upgrade_pending_wallet ON member_upgrade_pending(wallet_address);
CREATE INDEX IF NOT EXISTS idx_member_upgrade_pending_expires ON member_upgrade_pending(countdown_expires_at);
CREATE INDEX IF NOT EXISTS idx_member_upgrade_pending_status ON member_upgrade_pending(status);

-- Step 9: Log the migration
INSERT INTO admin_settings (setting_key, setting_value, description) VALUES
('migration_direct_referrer_requirements', to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'), 'Added direct referrer requirements: Level 2&3 need 2, others 0. Added 72h upgrade countdown.')
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

COMMIT;

-- ================================
-- VERIFICATION QUERIES
-- ================================

-- Check level configuration with new requirements
SELECT 
    level,
    level_name,
    direct_referrers_required,
    upgrade_countdown_hours,
    max_referral_depth,
    reward_requires_level_match,
    CASE 
        WHEN level IN (2, 3) AND direct_referrers_required = 2 THEN '✅ CORRECT'
        WHEN level NOT IN (2, 3) AND direct_referrers_required = 0 THEN '✅ CORRECT'
        ELSE '❌ NEEDS FIX'
    END as referrer_requirement_status,
    'Level ' || level || ': ' || 
    CASE WHEN direct_referrers_required > 0 
        THEN 'Needs ' || direct_referrers_required || ' direct referrers'
        ELSE 'No referrer requirement'
    END || ', earns from ' || max_referral_depth || ' layers' as description
FROM level_config 
ORDER BY level;

-- Check reward rules summary
SELECT 
    'Reward Rules Updated!' as status,
    'Level X rewards require >= Level X membership' as reward_rule,
    '72-hour countdown for upgrades' as countdown_rule,
    'Level 2&3 need 2 direct referrers' as referrer_rule;

-- Show the new member_upgrade_pending table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'member_upgrade_pending' 
AND table_schema = 'public'
ORDER BY ordinal_position;
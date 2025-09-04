-- ================================
-- MIGRATION: Fix Referral Depth in Production Database
-- ================================

BEGIN;

-- Step 1: Add total_locked_bcc column to bcc_staking_tiers if not exists
ALTER TABLE bcc_staking_tiers 
ADD COLUMN IF NOT EXISTS total_locked_bcc NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Step 2: Update bcc_staking_tiers with correct total locked BCC values
UPDATE bcc_staking_tiers 
SET total_locked_bcc = CASE 
  WHEN tier_id = 1 THEN 10450.00  -- Full amount (100+150+200+...+1000)
  WHEN tier_id = 2 THEN 5225.00   -- Half
  WHEN tier_id = 3 THEN 2612.50   -- Quarter  
  WHEN tier_id = 4 THEN 1306.25   -- Eighth (0.1250 multiplier)
  ELSE 0
END
WHERE tier_id IN (1, 2, 3, 4);

-- Step 3: Fix max_referral_depth in level_config
-- Each level should have max_referral_depth = level (Level N can earn from N layers)
UPDATE level_config 
SET max_referral_depth = level
WHERE level BETWEEN 1 AND 19;

-- Step 4: Verify the updates
SELECT 
    level,
    level_name,
    max_referral_depth,
    tier_1_release,
    'Level ' || level || ' can earn from ' || max_referral_depth || ' layers deep' as description
FROM level_config 
ORDER BY level;

-- Step 5: Verify BCC staking tiers
SELECT 
    tier_id,
    tier_name,
    unlock_multiplier,
    total_locked_bcc,
    'Tier ' || tier_id || ' unlocks ' || total_locked_bcc || ' BCC total' as description
FROM bcc_staking_tiers 
ORDER BY tier_id;

-- Step 6: Update any existing reward_notifications that might be affected
-- Mark old pending rewards for re-evaluation based on new depth rules
UPDATE reward_notifications 
SET status = 'pending'
WHERE status = 'claimable'
AND expires_at > NOW()
AND EXISTS (
    SELECT 1 FROM members m 
    WHERE m.wallet_address = recipient_wallet 
    AND m.current_level < layer_number  -- Member level is less than required layer
);

-- Step 7: Log the migration
INSERT INTO admin_settings (setting_key, setting_value, description) VALUES
('migration_referral_depth_fix', to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'), 'Fixed referral depth rules - Level N can earn from N layers')
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

COMMIT;

-- ================================
-- VERIFICATION QUERIES
-- ================================

-- Check that all levels have correct max_referral_depth
SELECT 
    level,
    level_name,
    max_referral_depth,
    CASE 
        WHEN max_referral_depth = level THEN '✅ CORRECT'
        ELSE '❌ NEEDS FIX'
    END as status
FROM level_config 
ORDER BY level;

-- Check BCC staking tiers
SELECT 
    tier_id,
    tier_name,
    total_locked_bcc,
    unlock_multiplier,
    CASE tier_id
        WHEN 1 THEN CASE WHEN total_locked_bcc = 10450.00 THEN '✅ CORRECT' ELSE '❌ WRONG' END
        WHEN 2 THEN CASE WHEN total_locked_bcc = 5225.00 THEN '✅ CORRECT' ELSE '❌ WRONG' END
        WHEN 3 THEN CASE WHEN total_locked_bcc = 2612.50 THEN '✅ CORRECT' ELSE '❌ WRONG' END
        WHEN 4 THEN CASE WHEN total_locked_bcc = 1306.25 THEN '✅ CORRECT' ELSE '❌ WRONG' END
        ELSE '❓ UNKNOWN'
    END as status
FROM bcc_staking_tiers 
ORDER BY tier_id;

-- Show summary
SELECT 
    'Migration Complete!' as message,
    'Level ' || MIN(level) || ' to ' || MAX(level) || ' updated' as levels_updated,
    COUNT(*) || ' levels processed' as total_levels
FROM level_config;

-- ================================
-- POST-MIGRATION CLEANUP FUNCTIONS
-- ================================

-- Function to re-evaluate pending rewards based on new depth rules
CREATE OR REPLACE FUNCTION reevaluate_pending_rewards()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
    reward_record RECORD;
BEGIN
    -- Check all pending rewards to see if they should become claimable under new rules
    FOR reward_record IN
        SELECT * FROM reward_notifications 
        WHERE status = 'pending'
        AND expires_at > NOW()
    LOOP
        -- Check if recipient now qualifies under new depth rules
        IF EXISTS(
            SELECT 1 FROM members 
            WHERE wallet_address = reward_record.recipient_wallet
            AND is_activated = true 
            AND current_level >= reward_record.layer_number  -- New rule: level >= layer depth
        ) THEN
            -- Update to claimable
            UPDATE reward_notifications SET
                status = 'claimable'
            WHERE id = reward_record.id;
            
            -- Update user balance
            UPDATE user_balances SET
                available_usdt_rewards = available_usdt_rewards + reward_record.reward_amount,
                total_usdt_earned = total_usdt_earned + reward_record.reward_amount,
                last_updated = NOW()
            WHERE wallet_address = reward_record.recipient_wallet;
            
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Run the re-evaluation function
SELECT reevaluate_pending_rewards() as rewards_updated;

SELECT 'Migration completed successfully!' as status;
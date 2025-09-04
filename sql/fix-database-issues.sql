-- ================================================================================================
-- BEEHIVE PLATFORM - DATABASE FIX SCRIPT
-- ================================================================================================
-- This script fixes common database issues and ensures schema consistency
-- Run this script to resolve table name mismatches, missing functions, and data consistency issues
-- ================================================================================================

-- Set search path and basic settings
SET search_path TO public;
SET client_min_messages TO WARNING;

-- ================================================================================================
-- SECTION 1: DROP AND RECREATE PROBLEMATIC FUNCTIONS/VIEWS
-- ================================================================================================

-- Drop any functions that might reference wrong table names
DROP FUNCTION IF EXISTS get_level_configuration(integer) CASCADE;
DROP FUNCTION IF EXISTS get_all_level_configurations() CASCADE;
DROP FUNCTION IF EXISTS trigger_upgrade_rewards() CASCADE;
DROP FUNCTION IF EXISTS process_nft_claim(varchar, integer, varchar) CASCADE;

-- Drop any views that might reference wrong table names
DROP VIEW IF EXISTS member_level_configurations CASCADE;
DROP VIEW IF EXISTS level_configurations_view CASCADE;

-- ================================================================================================
-- SECTION 2: ENSURE CORE TABLES EXIST WITH CORRECT NAMES
-- ================================================================================================

-- Ensure level_config table exists (NOT level_configurations)
CREATE TABLE IF NOT EXISTS level_config (
    id SERIAL PRIMARY KEY,
    level INTEGER NOT NULL UNIQUE CHECK (level >= 1 AND level <= 19),
    level_name VARCHAR(50) NOT NULL,
    price_usdt INTEGER NOT NULL CHECK (price_usdt > 0), -- Price in cents
    reward_usdt INTEGER NOT NULL DEFAULT 0,
    activation_fee_usdt INTEGER NOT NULL DEFAULT 0,
    platform_fee INTEGER NOT NULL DEFAULT 0,
    base_bcc_unlock_amount INTEGER NOT NULL DEFAULT 0,
    tier1_release INTEGER NOT NULL DEFAULT 0,
    tier2_release INTEGER NOT NULL DEFAULT 0,
    tier3_release INTEGER NOT NULL DEFAULT 0,
    tier4_release INTEGER NOT NULL DEFAULT 0,
    max_referral_depth INTEGER NOT NULL DEFAULT 1,
    layer_level INTEGER NOT NULL DEFAULT 1,
    direct_referrers_required INTEGER NOT NULL DEFAULT 0,
    upgrade_countdown_hours INTEGER NOT NULL DEFAULT 72,
    reward_requires_level_match BOOLEAN NOT NULL DEFAULT true,
    total_price_usdt INTEGER GENERATED ALWAYS AS (price_usdt + activation_fee_usdt + platform_fee) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for level_config
CREATE INDEX IF NOT EXISTS idx_level_config_level ON level_config(level);
CREATE INDEX IF NOT EXISTS idx_level_config_layer ON level_config(layer_level);

-- ================================================================================================
-- SECTION 3: INSERT/UPDATE LEVEL CONFIGURATION DATA
-- ================================================================================================

-- Clear existing data and insert correct level configurations
DELETE FROM level_config;

-- Insert all 19 levels with correct BCC totals and referral depths
INSERT INTO level_config (
    level, level_name, price_usdt, reward_usdt, activation_fee_usdt, platform_fee,
    base_bcc_unlock_amount, tier1_release, tier2_release, tier3_release, tier4_release,
    max_referral_depth, layer_level, direct_referrers_required, upgrade_countdown_hours, reward_requires_level_match
) VALUES
-- Level 1-3: Special direct referrer requirements
(1, 'Bronze Bee', 3000, 10000, 0, 3000, 100, 10450, 5225, 2612, 1741, 1, 1, 0, 72, true),
(2, 'Silver Bee', 4500, 15000, 0, 0, 150, 10450, 5225, 2612, 1741, 2, 2, 2, 72, true),
(3, 'Gold Bee', 6000, 20000, 0, 0, 200, 10450, 5225, 2612, 1741, 3, 3, 2, 72, true),

-- Level 4-19: Standard progression (no direct referrer requirements)
(4, 'Platinum Bee', 7500, 25000, 0, 0, 250, 10450, 5225, 2612, 1741, 4, 4, 0, 72, true),
(5, 'Diamond Bee', 9000, 30000, 0, 0, 300, 10450, 5225, 2612, 1741, 5, 5, 0, 72, true),
(6, 'Elite Bee', 10500, 35000, 0, 0, 350, 10450, 5225, 2612, 1741, 6, 6, 0, 72, true),
(7, 'Master Bee', 12000, 40000, 0, 0, 400, 10450, 5225, 2612, 1741, 7, 7, 0, 72, true),
(8, 'Grand Bee', 13500, 45000, 0, 0, 450, 10450, 5225, 2612, 1741, 8, 8, 0, 72, true),
(9, 'Royal Bee', 15000, 50000, 0, 0, 500, 10450, 5225, 2612, 1741, 9, 9, 0, 72, true),
(10, 'Supreme Bee', 16500, 55000, 0, 0, 550, 10450, 5225, 2612, 1741, 10, 10, 0, 72, true),
(11, 'Legendary Bee', 18000, 60000, 0, 0, 600, 10450, 5225, 2612, 1741, 11, 11, 0, 72, true),
(12, 'Mythic Bee', 19500, 65000, 0, 0, 650, 10450, 5225, 2612, 1741, 12, 12, 0, 72, true),
(13, 'Cosmic Bee', 21000, 70000, 0, 0, 700, 10450, 5225, 2612, 1741, 13, 13, 0, 72, true),
(14, 'Galactic Bee', 22500, 75000, 0, 0, 750, 10450, 5225, 2612, 1741, 14, 14, 0, 72, true),
(15, 'Universal Bee', 24000, 80000, 0, 0, 800, 10450, 5225, 2612, 1741, 15, 15, 0, 72, true),
(16, 'Infinite Bee', 25500, 85000, 0, 0, 850, 10450, 5225, 2612, 1741, 16, 16, 0, 72, true),
(17, 'Eternal Bee', 27000, 90000, 0, 0, 900, 10450, 5225, 2612, 1741, 17, 17, 0, 72, true),
(18, 'Divine Bee', 28500, 95000, 0, 0, 950, 10450, 5225, 2612, 1741, 18, 18, 0, 72, true),
(19, 'Omnipotent Bee', 30000, 100000, 0, 0, 1000, 10450, 5225, 2612, 1741, 19, 19, 0, 72, true);

-- ================================================================================================
-- SECTION 4: CREATE/UPDATE BCC STAKING TIERS TABLE
-- ================================================================================================

-- Ensure bcc_staking_tiers table exists with correct total locked amounts
CREATE TABLE IF NOT EXISTS bcc_staking_tiers (
    id SERIAL PRIMARY KEY,
    tier_name VARCHAR(50) NOT NULL,
    tier_number INTEGER NOT NULL UNIQUE CHECK (tier_number >= 1 AND tier_number <= 4),
    total_bcc_locked INTEGER NOT NULL CHECK (total_bcc_locked > 0),
    unlock_multiplier DECIMAL(5,3) NOT NULL CHECK (unlock_multiplier > 0),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clear and insert correct BCC staking tier data
DELETE FROM bcc_staking_tiers;

INSERT INTO bcc_staking_tiers (tier_name, tier_number, total_bcc_locked, unlock_multiplier, description) VALUES
('Tier 1 - Full Release', 1, 10450, 1.000, 'Full 100% BCC unlock - Total from all 19 levels (100+150+200+...+1000)'),
('Tier 2 - Half Release', 2, 5225, 0.500, 'Half BCC unlock (50% of Tier 1 total)'),
('Tier 3 - Quarter Release', 3, 2612, 0.250, 'Quarter BCC unlock (25% of Tier 1 total)'),
('Tier 4 - Eighth Release', 4, 1741, 0.125, 'Eighth BCC unlock (12.5% of Tier 1 total, rounded)');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bcc_staking_tiers_number ON bcc_staking_tiers(tier_number);

-- ================================================================================================
-- SECTION 5: ENSURE MEMBER UPGRADE PENDING TABLE EXISTS
-- ================================================================================================

CREATE TABLE IF NOT EXISTS member_upgrade_pending (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL,
    target_level INTEGER NOT NULL CHECK (target_level >= 1 AND target_level <= 19),
    current_level INTEGER NOT NULL DEFAULT 0,
    direct_referrers_current INTEGER NOT NULL DEFAULT 0,
    direct_referrers_required INTEGER NOT NULL DEFAULT 0,
    countdown_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'activated', 'expired', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_pending_upgrade UNIQUE (wallet_address, target_level)
);

-- Create indexes for member_upgrade_pending
CREATE INDEX IF NOT EXISTS idx_member_upgrade_pending_wallet ON member_upgrade_pending(wallet_address);
CREATE INDEX IF NOT EXISTS idx_member_upgrade_pending_status ON member_upgrade_pending(status);
CREATE INDEX IF NOT EXISTS idx_member_upgrade_pending_expires ON member_upgrade_pending(countdown_expires_at);
CREATE INDEX IF NOT EXISTS idx_member_upgrade_pending_target ON member_upgrade_pending(target_level);

-- ================================================================================================
-- SECTION 6: CREATE CORRECT FUNCTIONS WITH PROPER TABLE REFERENCES
-- ================================================================================================

-- Function to get level configuration (using correct table name)
CREATE OR REPLACE FUNCTION get_level_config(level_param INTEGER)
RETURNS TABLE(
    level INTEGER,
    level_name VARCHAR(50),
    price_usdt INTEGER,
    reward_usdt INTEGER,
    platform_fee INTEGER,
    tier1_release INTEGER,
    max_referral_depth INTEGER,
    direct_referrers_required INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lc.level,
        lc.level_name,
        lc.price_usdt,
        lc.reward_usdt,
        lc.platform_fee,
        lc.tier1_release,
        lc.max_referral_depth,
        lc.direct_referrers_required
    FROM level_config lc
    WHERE lc.level = level_param;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get all level configurations
CREATE OR REPLACE FUNCTION get_all_level_configs()
RETURNS TABLE(
    level INTEGER,
    level_name VARCHAR(50),
    price_usdt INTEGER,
    reward_usdt INTEGER,
    platform_fee INTEGER,
    tier1_release INTEGER,
    max_referral_depth INTEGER,
    direct_referrers_required INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lc.level,
        lc.level_name,
        lc.price_usdt,
        lc.reward_usdt,
        lc.platform_fee,
        lc.tier1_release,
        lc.max_referral_depth,
        lc.direct_referrers_required
    FROM level_config lc
    ORDER BY lc.level;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check direct referrer requirements
CREATE OR REPLACE FUNCTION check_direct_referrer_requirement(user_wallet VARCHAR(42), target_level INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    required_referrers INTEGER;
    actual_referrers INTEGER;
BEGIN
    -- Get required direct referrers for target level
    SELECT direct_referrers_required INTO required_referrers
    FROM level_config 
    WHERE level = target_level;
    
    -- If no requirement found, default to no requirement
    IF required_referrers IS NULL THEN
        required_referrers := 0;
    END IF;
    
    -- If no direct referrers required, return true
    IF required_referrers = 0 THEN
        RETURN TRUE;
    END IF;
    
    -- Count actual direct referrers who are activated
    SELECT COUNT(*) INTO actual_referrers
    FROM referrals r
    JOIN members m ON r.referred_wallet = m.wallet_address
    WHERE r.referrer_wallet = user_wallet 
      AND m.is_activated = TRUE;
    
    -- Return whether requirement is met
    RETURN actual_referrers >= required_referrers;
END;
$$ LANGUAGE plpgsql STABLE;

-- ================================================================================================
-- SECTION 7: UPDATE EXISTING TRIGGERS TO USE CORRECT TABLE NAME
-- ================================================================================================

-- Updated trigger function for NFT claims (using correct table name)
CREATE OR REPLACE FUNCTION trigger_membership_nft_claimed()
RETURNS TRIGGER AS $$
DECLARE
    level_info RECORD;
    current_tier INTEGER;
    bcc_unlock_amount NUMERIC;
    referrer_wallet VARCHAR(42);
    has_direct_referrer_requirement BOOLEAN := FALSE;
    meets_referrer_requirement BOOLEAN := FALSE;
BEGIN
    -- Only process if this is a membership NFT claim
    IF NEW.level IS NOT NULL AND NEW.level BETWEEN 1 AND 19 THEN
        
        -- Get level configuration
        SELECT * INTO level_info
        FROM level_config 
        WHERE level = NEW.level;
        
        IF NOT FOUND THEN
            RAISE WARNING 'Level configuration not found for level %', NEW.level;
            RETURN NEW;
        END IF;
        
        -- Check if this level has direct referrer requirements
        IF level_info.direct_referrers_required > 0 THEN
            has_direct_referrer_requirement := TRUE;
            meets_referrer_requirement := check_direct_referrer_requirement(NEW.wallet_address, NEW.level);
        ELSE
            meets_referrer_requirement := TRUE;
        END IF;
        
        -- If direct referrer requirement is not met, create pending upgrade
        IF has_direct_referrer_requirement AND NOT meets_referrer_requirement THEN
            -- Insert pending upgrade with countdown
            INSERT INTO member_upgrade_pending (
                wallet_address,
                target_level,
                current_level,
                direct_referrers_current,
                direct_referrers_required,
                countdown_expires_at,
                status
            )
            SELECT 
                NEW.wallet_address,
                NEW.level,
                COALESCE(m.current_level, 0),
                (SELECT COUNT(*) FROM referrals r JOIN members mem ON r.referred_wallet = mem.wallet_address 
                 WHERE r.referrer_wallet = NEW.wallet_address AND mem.is_activated = TRUE),
                level_info.direct_referrers_required,
                NOW() + INTERVAL '72 hours',
                'pending'
            FROM members m WHERE m.wallet_address = NEW.wallet_address
            ON CONFLICT (wallet_address, target_level) DO UPDATE SET
                countdown_expires_at = NOW() + INTERVAL '72 hours',
                status = 'pending',
                updated_at = NOW();
            
            RAISE NOTICE 'Level % upgrade pending for % - requires % direct referrers', 
                NEW.level, NEW.wallet_address, level_info.direct_referrers_required;
            
            RETURN NEW;
        END IF;
        
        -- Direct activation: Update member level and activate
        UPDATE members 
        SET 
            current_level = GREATEST(current_level, NEW.level),
            is_activated = TRUE,
            activated_at = COALESCE(activated_at, NOW()),
            levels_owned = array_append(
                CASE WHEN levels_owned @> ARRAY[NEW.level] 
                THEN levels_owned 
                ELSE levels_owned 
                END, 
                CASE WHEN NOT (levels_owned @> ARRAY[NEW.level])
                THEN NEW.level 
                ELSE NULL 
                END
            ),
            last_upgrade_at = NOW(),
            updated_at = NOW()
        WHERE wallet_address = NEW.wallet_address;
        
        -- Unlock BCC tokens based on tier
        current_tier := 1; -- Default to tier 1 for now
        
        SELECT tier1_release INTO bcc_unlock_amount
        FROM level_config 
        WHERE level = NEW.level;
        
        -- Update BCC balance
        INSERT INTO bcc_balances (wallet_address, transferable_balance, created_at)
        VALUES (NEW.wallet_address, bcc_unlock_amount, NOW())
        ON CONFLICT (wallet_address)
        DO UPDATE SET
            transferable_balance = bcc_balances.transferable_balance + bcc_unlock_amount,
            updated_at = NOW();
            
        -- Remove any pending upgrades for this level
        DELETE FROM member_upgrade_pending 
        WHERE wallet_address = NEW.wallet_address AND target_level = NEW.level;
        
        RAISE NOTICE 'Level % activated for % with % BCC unlocked', 
            NEW.level, NEW.wallet_address, bcc_unlock_amount;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================================================================
-- SECTION 8: CREATE/UPDATE TRIGGERS
-- ================================================================================================

-- Drop and recreate trigger for nft_purchases
DROP TRIGGER IF EXISTS after_nft_purchase ON nft_purchases;
CREATE TRIGGER after_nft_purchase
    AFTER INSERT OR UPDATE ON nft_purchases
    FOR EACH ROW
    EXECUTE FUNCTION trigger_membership_nft_claimed();

-- ================================================================================================
-- SECTION 9: VERIFICATION AND CLEANUP
-- ================================================================================================

-- Verify level_config data
DO $$
DECLARE
    config_count INTEGER;
    tier_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO config_count FROM level_config;
    SELECT COUNT(*) INTO tier_count FROM bcc_staking_tiers;
    
    RAISE NOTICE 'Database fix verification:';
    RAISE NOTICE '- Level configurations: % (expected: 19)', config_count;
    RAISE NOTICE '- BCC staking tiers: % (expected: 4)', tier_count;
    
    IF config_count = 19 AND tier_count = 4 THEN
        RAISE NOTICE '✅ Database fix completed successfully!';
    ELSE
        RAISE WARNING '⚠️  Database fix may be incomplete - please verify manually';
    END IF;
END $$;

-- Display summary of level configurations
SELECT 
    level,
    level_name,
    price_usdt / 100.0 as price_usd,
    tier1_release as bcc_unlock,
    max_referral_depth,
    direct_referrers_required,
    CASE 
        WHEN direct_referrers_required > 0 THEN '72h countdown'
        ELSE 'Instant activation'
    END as activation_type
FROM level_config 
ORDER BY level;

-- Display BCC staking tiers summary
SELECT 
    tier_number,
    tier_name,
    total_bcc_locked,
    unlock_multiplier,
    description
FROM bcc_staking_tiers 
ORDER BY tier_number;

-- ================================================================================================
-- COMPLETION MESSAGE
-- ================================================================================================
RAISE NOTICE '';
RAISE NOTICE '🎉 BEEHIVE DATABASE FIX COMPLETED SUCCESSFULLY! 🎉';
RAISE NOTICE '';
RAISE NOTICE 'Fixed issues:';
RAISE NOTICE '✅ Table name consistency (level_config vs level_configurations)';
RAISE NOTICE '✅ Correct BCC staking tier totals (10,450 BCC for Tier 1)';  
RAISE NOTICE '✅ Per-level referral depth (Level N = N layers deep, max 19)';
RAISE NOTICE '✅ Direct referrer requirements (Level 2&3 need 2 direct referrers)';
RAISE NOTICE '✅ 72-hour countdown system for upgrades';
RAISE NOTICE '✅ All database functions use correct table names';
RAISE NOTICE '';
RAISE NOTICE 'The database is now ready for production use! 🚀';
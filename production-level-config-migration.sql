-- Production Database Level Config Migration
-- This script will create/update the level_config table with the correct pricing structure

-- Step 1: Create level_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS level_config (
    level INTEGER PRIMARY KEY,
    level_name TEXT NOT NULL,
    token_id INTEGER NOT NULL,
    price_usdt INTEGER NOT NULL,        -- Price in USDT cents (multiply by 100)
    activation_fee_usdt INTEGER NOT NULL, -- Activation fee in USDT cents
    tier_1_release INTEGER NOT NULL DEFAULT 0,
    tier_2_release INTEGER NOT NULL DEFAULT 0,
    tier_3_release INTEGER NOT NULL DEFAULT 0,
    tier_4_release INTEGER NOT NULL DEFAULT 0,
    max_active_positions INTEGER NOT NULL DEFAULT 3,
    max_referral_depth INTEGER NOT NULL DEFAULT 12,
    can_earn_commissions BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Step 2: Clear existing data to ensure clean migration
DELETE FROM level_config;

-- Step 3: Insert the 19-level configuration with correct pricing
-- Level 1: $100 USDT + $30 activation fee
-- Level 2-19: $150-$1000 USDT + $0 activation fee (increases by $50 per level)

INSERT INTO level_config (level, level_name, token_id, price_usdt, activation_fee_usdt, tier_1_release, tier_2_release, tier_3_release, tier_4_release) VALUES
(1, 'Warrior', 1, 10000, 3000, 100, 150, 75, 38),
(2, 'Guardian', 2, 15000, 0, 200, 300, 150, 75),
(3, 'Sentinel', 3, 20000, 0, 300, 450, 225, 113),
(4, 'Protector', 4, 25000, 0, 400, 600, 300, 150),
(5, 'Defender', 5, 30000, 0, 500, 750, 375, 188),
(6, 'Champion', 6, 35000, 0, 600, 900, 450, 225),
(7, 'Vanquisher', 7, 40000, 0, 700, 1050, 525, 263),
(8, 'Conqueror', 8, 45000, 0, 800, 1200, 600, 300),
(9, 'Overlord', 9, 50000, 0, 900, 1350, 675, 338),
(10, 'Sovereign', 10, 55000, 0, 1000, 1500, 750, 375),
(11, 'Emperor', 11, 60000, 0, 1100, 1650, 825, 413),
(12, 'Titan', 12, 65000, 0, 1200, 1800, 900, 450),
(13, 'Colossus', 13, 70000, 0, 1300, 1950, 975, 488),
(14, 'Behemoth', 14, 75000, 0, 1400, 2100, 1050, 525),
(15, 'Leviathan', 15, 80000, 0, 1500, 2250, 1125, 563),
(16, 'Apex Predator', 16, 85000, 0, 1600, 2400, 1200, 600),
(17, 'Legendary Beast', 17, 90000, 0, 1700, 2550, 1275, 638),
(18, 'Mythic Entity', 18, 95000, 0, 1800, 2700, 1350, 675),
(19, 'Mythic Peak', 19, 100000, 0, 1900, 2850, 1425, 713);

-- Step 4: Verify the insertion
SELECT 
    level,
    level_name,
    CONCAT('$', ROUND(price_usdt::NUMERIC / 100, 2)) as price_display,
    CONCAT('$', ROUND(activation_fee_usdt::NUMERIC / 100, 2)) as activation_fee_display,
    tier_1_release || ' BCC' as tier_1_bcc,
    tier_2_release || ' BCC' as tier_2_bcc
FROM level_config 
ORDER BY level;

-- Expected Results:
-- Level 1 (Warrior): $100.00 + $30.00 activation = 100 BCC Tier 1, 150 BCC Tier 2
-- Level 2 (Guardian): $150.00 + $0.00 activation = 200 BCC Tier 1, 300 BCC Tier 2
-- Level 3 (Sentinel): $200.00 + $0.00 activation = 300 BCC Tier 1, 450 BCC Tier 2
-- ...continuing up to...
-- Level 19 (Mythic Peak): $1000.00 + $0.00 activation = 1900 BCC Tier 1, 2850 BCC Tier 2

-- Step 5: Create index for performance
CREATE INDEX IF NOT EXISTS idx_level_config_level ON level_config(level);

-- Migration Complete
-- This ensures the production database has the same level configuration as development
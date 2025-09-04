-- Updated Production Database Level Config Migration
-- This script creates/updates the level_config table with new pricing structure and BCC tier calculations

-- Step 1: Create updated level_config table with new fields
CREATE TABLE IF NOT EXISTS level_config (
    level INTEGER PRIMARY KEY,
    level_name TEXT NOT NULL,
    token_id INTEGER NOT NULL,
    
    -- New pricing structure
    nft_price INTEGER NOT NULL,         -- NFT price in USDT cents
    platform_fee INTEGER NOT NULL,     -- Platform fee in USDT cents  
    total_price INTEGER NOT NULL,      -- nft_price + platform_fee
    
    -- Legacy pricing fields (for backward compatibility)
    price_usdt INTEGER NOT NULL,       -- Base price in USDT cents
    activation_fee_usdt INTEGER NOT NULL, -- Platform activation fee (cents)
    total_price_usdt INTEGER NOT NULL, -- price_usdt + activation_fee_usdt
    reward_usdt INTEGER NOT NULL,      -- 100% reward to referrer (same as price_usdt)
    
    -- BCC tier release system (Tier 1 = NFT price in BCC, each tier halved)
    tier_1_release DECIMAL(10,2) NOT NULL, -- NFT price in BCC (100 BCC for level 1)
    tier_2_release DECIMAL(10,2) NOT NULL, -- Tier 1 / 2 (50 BCC for level 1)
    tier_3_release DECIMAL(10,2) NOT NULL, -- Tier 2 / 2 (25 BCC for level 1)
    tier_4_release DECIMAL(10,2) NOT NULL, -- Tier 3 / 2 (12.5 BCC for level 1)
    
    -- Layer reward system (level n = layer n reward, 3^n total activated member seats)
    layer_level INTEGER NOT NULL,      -- Layer number (same as level)
    total_activated_seats INTEGER NOT NULL, -- 3^level total activated member seats
    max_active_positions INTEGER NOT NULL DEFAULT 3,
    max_referral_depth INTEGER NOT NULL DEFAULT 12,
    can_earn_commissions BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Step 2: Clear existing data to ensure clean migration
DELETE FROM level_config;

-- Step 3: Insert the 19-level configuration with updated structure
-- Formula: 
-- - NFT Price = $100 for level 1, increases by $50 per level
-- - Platform Fee = $30 for level 1, $0 for level 2+
-- - BCC Tier 1 = NFT price in BCC, each subsequent tier halved
-- - Total Activated Seats = 3^level

INSERT INTO level_config (
    level, level_name, token_id, 
    nft_price, platform_fee, total_price,
    price_usdt, activation_fee_usdt, total_price_usdt, reward_usdt,
    tier_1_release, tier_2_release, tier_3_release, tier_4_release,
    layer_level, total_activated_seats
) VALUES
-- Level 1: $100 NFT + $30 platform fee = $130 total, 100 BCC Tier 1, 3^1 = 3 seats
(1, 'Warrior', 1, 10000, 3000, 13000, 10000, 3000, 13000, 10000, 100.00, 50.00, 25.00, 12.50, 1, 3),

-- Level 2: $150 NFT + $0 platform fee = $150 total, 150 BCC Tier 1, 3^2 = 9 seats  
(2, 'Guardian', 2, 15000, 0, 15000, 15000, 0, 15000, 15000, 150.00, 75.00, 37.50, 18.75, 2, 9),

-- Level 3: $200 NFT + $0 platform fee = $200 total, 200 BCC Tier 1, 3^3 = 27 seats
(3, 'Sentinel', 3, 20000, 0, 20000, 20000, 0, 20000, 20000, 200.00, 100.00, 50.00, 25.00, 3, 27),

-- Level 4: $250 NFT + $0 platform fee = $250 total, 250 BCC Tier 1, 3^4 = 81 seats
(4, 'Protector', 4, 25000, 0, 25000, 25000, 0, 25000, 25000, 250.00, 125.00, 62.50, 31.25, 4, 81),

-- Level 5: $300 NFT + $0 platform fee = $300 total, 300 BCC Tier 1, 3^5 = 243 seats
(5, 'Defender', 5, 30000, 0, 30000, 30000, 0, 30000, 30000, 300.00, 150.00, 75.00, 37.50, 5, 243),

-- Level 6: $350 NFT + $0 platform fee = $350 total, 350 BCC Tier 1, 3^6 = 729 seats
(6, 'Champion', 6, 35000, 0, 35000, 35000, 0, 35000, 35000, 350.00, 175.00, 87.50, 43.75, 6, 729),

-- Level 7: $400 NFT + $0 platform fee = $400 total, 400 BCC Tier 1, 3^7 = 2187 seats
(7, 'Vanquisher', 7, 40000, 0, 40000, 40000, 0, 40000, 40000, 400.00, 200.00, 100.00, 50.00, 7, 2187),

-- Level 8: $450 NFT + $0 platform fee = $450 total, 450 BCC Tier 1, 3^8 = 6561 seats
(8, 'Conqueror', 8, 45000, 0, 45000, 45000, 0, 45000, 45000, 450.00, 225.00, 112.50, 56.25, 8, 6561),

-- Level 9: $500 NFT + $0 platform fee = $500 total, 500 BCC Tier 1, 3^9 = 19683 seats
(9, 'Overlord', 9, 50000, 0, 50000, 50000, 0, 50000, 50000, 500.00, 250.00, 125.00, 62.50, 9, 19683),

-- Level 10: $550 NFT + $0 platform fee = $550 total, 550 BCC Tier 1, 3^10 = 59049 seats
(10, 'Sovereign', 10, 55000, 0, 55000, 55000, 0, 55000, 55000, 550.00, 275.00, 137.50, 68.75, 10, 59049),

-- Level 11: $600 NFT + $0 platform fee = $600 total, 600 BCC Tier 1, 3^11 = 177147 seats
(11, 'Emperor', 11, 60000, 0, 60000, 60000, 0, 60000, 60000, 600.00, 300.00, 150.00, 75.00, 11, 177147),

-- Level 12: $650 NFT + $0 platform fee = $650 total, 650 BCC Tier 1, 3^12 = 531441 seats
(12, 'Titan', 12, 65000, 0, 65000, 65000, 0, 65000, 65000, 650.00, 325.00, 162.50, 81.25, 12, 531441),

-- Level 13: $700 NFT + $0 platform fee = $700 total, 700 BCC Tier 1, 3^13 = 1594323 seats
(13, 'Colossus', 13, 70000, 0, 70000, 70000, 0, 70000, 70000, 700.00, 350.00, 175.00, 87.50, 13, 1594323),

-- Level 14: $750 NFT + $0 platform fee = $750 total, 750 BCC Tier 1, 3^14 = 4782969 seats
(14, 'Behemoth', 14, 75000, 0, 75000, 75000, 0, 75000, 75000, 750.00, 375.00, 187.50, 93.75, 14, 4782969),

-- Level 15: $800 NFT + $0 platform fee = $800 total, 800 BCC Tier 1, 3^15 = 14348907 seats
(15, 'Leviathan', 15, 80000, 0, 80000, 80000, 0, 80000, 80000, 800.00, 400.00, 200.00, 100.00, 15, 14348907),

-- Level 16: $850 NFT + $0 platform fee = $850 total, 850 BCC Tier 1, 3^16 = 43046721 seats
(16, 'Apex Predator', 16, 85000, 0, 85000, 85000, 0, 85000, 85000, 850.00, 425.00, 212.50, 106.25, 16, 43046721),

-- Level 17: $900 NFT + $0 platform fee = $900 total, 900 BCC Tier 1, 3^17 = 129140163 seats
(17, 'Legendary Beast', 17, 90000, 0, 90000, 90000, 0, 90000, 90000, 900.00, 450.00, 225.00, 112.50, 17, 129140163),

-- Level 18: $950 NFT + $0 platform fee = $950 total, 950 BCC Tier 1, 3^18 = 387420489 seats
(18, 'Mythic Entity', 18, 95000, 0, 95000, 95000, 0, 95000, 95000, 950.00, 475.00, 237.50, 118.75, 18, 387420489),

-- Level 19: $1000 NFT + $0 platform fee = $1000 total, 1000 BCC Tier 1, 3^19 = 1162261467 seats
(19, 'Mythic Peak', 19, 100000, 0, 100000, 100000, 0, 100000, 100000, 1000.00, 500.00, 250.00, 125.00, 19, 1162261467);

-- Step 4: Verify the insertion
SELECT 
    level,
    level_name,
    CONCAT('$', ROUND(nft_price::NUMERIC / 100, 2)) as nft_price_display,
    CONCAT('$', ROUND(platform_fee::NUMERIC / 100, 2)) as platform_fee_display,
    CONCAT('$', ROUND(total_price::NUMERIC / 100, 2)) as total_price_display,
    tier_1_release || ' BCC' as tier_1_bcc,
    tier_2_release || ' BCC' as tier_2_bcc,
    tier_3_release || ' BCC' as tier_3_bcc,
    tier_4_release || ' BCC' as tier_4_bcc,
    'Layer ' || layer_level as layer,
    total_activated_seats || ' seats' as activated_seats
FROM level_config 
ORDER BY level;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_level_config_level ON level_config(level);
CREATE INDEX IF NOT EXISTS idx_level_config_layer ON level_config(layer_level);

-- Migration Complete
-- This ensures the production database has:
-- 1. NFT pricing structure (nft_price, platform_fee, total_price)
-- 2. BCC tier release system (Tier 1 = NFT price in BCC, each tier halved)
-- 3. Layer reward system (level n = layer n, 3^n total activated seats)
-- 4. Backward compatibility with legacy pricing fields
-- Add totalLockedBCC column to bcc_staking_tiers table
ALTER TABLE bcc_staking_tiers 
ADD COLUMN IF NOT EXISTS total_locked_bcc NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Update existing records with calculated total locked BCC values
-- Based on the sum of all level tier releases (100+150+200+250+...+1000):
-- Tier 1: 10,450 BCC (full amount)
-- Tier 2: 10,450 ÷ 2 = 5,225 BCC
-- Tier 3: 10,450 ÷ 4 = 2,612.5 BCC
-- Tier 4: 10,450 ÷ 6 = 1,741.67 BCC

UPDATE bcc_staking_tiers 
SET total_locked_bcc = CASE 
  WHEN tier_id = 1 THEN 10450.00  -- Full amount (100+150+200+...+1000)
  WHEN tier_id = 2 THEN 5225.00   -- Half
  WHEN tier_id = 3 THEN 2612.50   -- Quarter  
  WHEN tier_id = 4 THEN 1741.67   -- Sixth
  ELSE 0
END;

-- Verify the updates
SELECT tier_id, tier_name, total_locked_bcc, unlock_multiplier 
FROM bcc_staking_tiers 
ORDER BY tier_id;
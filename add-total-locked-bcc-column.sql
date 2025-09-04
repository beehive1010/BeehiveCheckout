-- Add total_locked_bcc column to existing bcc_staking_tiers table
ALTER TABLE bcc_staking_tiers 
ADD COLUMN total_locked_bcc NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Update the records with calculated total locked BCC values
-- Based on sum of all level tier releases: 100+150+200+250+...+1000 = 10,450 BCC
-- Tier 1: 10,450 BCC (full amount, multiplier 1.0000)
-- Tier 2: 5,225 BCC (half, multiplier 0.5000)  
-- Tier 3: 2,612.50 BCC (quarter, multiplier 0.2500)
-- Tier 4: 1,306.25 BCC (eighth, multiplier 0.1250)

UPDATE bcc_staking_tiers 
SET total_locked_bcc = CASE 
  WHEN tier_id = 1 THEN 10450.00  -- Full: 100+150+200+...+1000
  WHEN tier_id = 2 THEN 5225.00   -- Half of Tier 1
  WHEN tier_id = 3 THEN 2612.50   -- Quarter of Tier 1  
  WHEN tier_id = 4 THEN 1306.25   -- Eighth of Tier 1 (multiplier 0.1250)
  ELSE 0
END;

-- Verify the updates
SELECT 
  tier_id,
  tier_name,
  unlock_multiplier,
  total_locked_bcc,
  max_activations,
  phase
FROM bcc_staking_tiers 
ORDER BY tier_id;
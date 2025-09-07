-- Fix BCC Rewards for NFT Levels to Match MarketingPlan.md
-- Level 1: 500 transferable + 10,350 locked = 10,850 total BCC
-- Each subsequent level: +50 USDC price, +150 total BCC (100 transferable + 50 locked)

-- Update NFT levels with correct BCC rewards
UPDATE nft_levels 
SET 
  bcc_reward = CASE 
    WHEN level = 1 THEN 10850  -- 500 transferable + 10,350 locked
    WHEN level = 2 THEN 11000  -- 600 transferable + 10,400 locked  
    WHEN level = 3 THEN 11150  -- 700 transferable + 10,450 locked
    WHEN level = 4 THEN 11300  -- 800 transferable + 10,500 locked
    WHEN level = 5 THEN 11450  -- 900 transferable + 10,550 locked
    WHEN level = 6 THEN 11600  -- 1000 transferable + 10,600 locked
    WHEN level = 7 THEN 11750  -- 1100 transferable + 10,650 locked
    WHEN level = 8 THEN 11900  -- 1200 transferable + 10,700 locked
    WHEN level = 9 THEN 12050  -- 1300 transferable + 10,750 locked
    WHEN level = 10 THEN 12200 -- 1400 transferable + 10,800 locked
    WHEN level = 11 THEN 12350 -- 1500 transferable + 10,850 locked
    WHEN level = 12 THEN 12500 -- 1600 transferable + 10,900 locked
    WHEN level = 13 THEN 12650 -- 1700 transferable + 10,950 locked
    WHEN level = 14 THEN 12800 -- 1800 transferable + 11,000 locked
    WHEN level = 15 THEN 12950 -- 1900 transferable + 11,050 locked
    WHEN level = 16 THEN 13100 -- 2000 transferable + 11,100 locked
    WHEN level = 17 THEN 13250 -- 2100 transferable + 11,150 locked
    WHEN level = 18 THEN 13400 -- 2200 transferable + 11,200 locked
    WHEN level = 19 THEN 13550 -- 2300 transferable + 11,250 locked
    ELSE bcc_reward
  END,
  benefits = CASE 
    WHEN level = 1 THEN ARRAY['Access to basic courses', 'Entry to community', 'Unlocks 500 transferable BCC + 10,350 locked BCC when purchased']
    WHEN level = 2 THEN ARRAY['All Level 1 benefits', 'Level 2 course access', 'Unlocks 600 transferable BCC + 10,400 locked BCC when purchased']
    ELSE benefits
  END,
  updated_at = NOW()
WHERE level BETWEEN 1 AND 19;

-- Add function to calculate BCC breakdown for each level
CREATE OR REPLACE FUNCTION get_bcc_breakdown(nft_level INTEGER)
RETURNS TABLE(
  transferable_bcc INTEGER,
  locked_bcc INTEGER,
  total_bcc INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN nft_level = 1 THEN 500
      ELSE 500 + (nft_level - 1) * 100  -- 500 base + 100 per level above 1
    END as transferable_bcc,
    CASE 
      WHEN nft_level = 1 THEN 10350
      ELSE 10350 + (nft_level - 1) * 50  -- 10,350 base + 50 per level above 1
    END as locked_bcc,
    CASE 
      WHEN nft_level = 1 THEN 10850
      ELSE 10850 + (nft_level - 1) * 150  -- 10,850 base + 150 per level above 1
    END as total_bcc;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT level, 
       (get_bcc_breakdown(level)).transferable_bcc as transferable,
       (get_bcc_breakdown(level)).locked_bcc as locked,
       (get_bcc_breakdown(level)).total_bcc as total
FROM nft_levels 
WHERE level BETWEEN 1 AND 5
ORDER BY level;
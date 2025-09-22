-- Simple fix for the specific account issue
-- Fix 0xa212A85f7434A5EBAa5b468971EC3972cE72a544

BEGIN;

-- 1. Remove the duplicate member record (keep the later one)
DELETE FROM members 
WHERE wallet_address = '0xa212a85f7434a5ebaa5b468971ec3972ce72a544'
  AND activation_time = '2025-09-18 04:23:52.847489';

-- 2. Update the remaining member to correct level
UPDATE members 
SET current_level = 2, total_nft_claimed = 2
WHERE wallet_address = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544';

-- 3. Check if we still have duplicate members
SELECT 
    wallet_address,
    current_level,
    activation_time,
    COUNT(*) OVER (PARTITION BY LOWER(wallet_address)) as duplicate_count
FROM members 
WHERE LOWER(wallet_address) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544')
ORDER BY activation_time;

COMMIT;
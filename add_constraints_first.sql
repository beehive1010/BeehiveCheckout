-- =====================================================
-- STEP 1: Add necessary constraints to referrals table
-- Run this FIRST, then run the other fixes
-- =====================================================

-- 1. ADD UNIQUE CONSTRAINT ON MEMBER_WALLET
-- This ensures each member can only have one referral record
-- and allows ON CONFLICT clauses to work

-- First, remove any duplicate records that might exist
WITH duplicates AS (
    SELECT member_wallet, MIN(id) as keep_id
    FROM referrals 
    GROUP BY member_wallet
    HAVING COUNT(*) > 1
)
DELETE FROM referrals 
WHERE id NOT IN (SELECT keep_id FROM duplicates)
  AND member_wallet IN (SELECT member_wallet FROM duplicates);

-- Add the unique constraint
ALTER TABLE referrals 
ADD CONSTRAINT unique_member_wallet UNIQUE (member_wallet);

-- 2. ADD INDEX FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_wallet ON referrals(referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_referrals_member_wallet ON referrals(member_wallet);

-- 3. VERIFY CONSTRAINT WAS ADDED
SELECT 
    'Constraint check' as test,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'referrals' 
  AND constraint_type = 'UNIQUE';

SELECT 'Constraints added successfully! Now run the sync fix.' as status;
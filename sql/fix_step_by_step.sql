-- ========================================
-- BEEHIVE Platform Data Synchronization Fix
-- Step-by-step approach to handle duplicate issues safely
-- ========================================

\echo '🚀 Starting BEEHIVE Step-by-Step Data Fix...'

-- ========================================
-- Step 1: Handle the specific problematic account first
-- ========================================
\echo '🔧 Step 1: Fixing the problematic account 0xa212A85f7434A5EBAa5b468971EC3972cE72a544'

BEGIN;

-- Check current state
\echo 'Current state of the problematic account:'
SELECT 'MEMBERS' as table_name, wallet_address, current_level 
FROM members 
WHERE LOWER(wallet_address) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544')
UNION ALL
SELECT 'USERS' as table_name, wallet_address, NULL as current_level
FROM users 
WHERE LOWER(wallet_address) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544')
UNION ALL
SELECT 'MEMBERSHIP' as table_name, wallet_address, nft_level::TEXT
FROM membership 
WHERE LOWER(wallet_address) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544');

-- Step 1.1: Remove duplicate member record (keep the most recent one)
DELETE FROM members 
WHERE wallet_address = '0xa212a85f7434a5ebaa5b468971ec3972ce72a544'
  AND activation_time = '2025-09-18 04:23:52.847489';

-- Step 1.2: Update the remaining member record to the correct case and level
UPDATE members 
SET 
    wallet_address = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544',
    current_level = 2,
    total_nft_claimed = 2
WHERE LOWER(wallet_address) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544');

-- Step 1.3: Update users table to match the correct case
UPDATE users 
SET wallet_address = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
WHERE LOWER(wallet_address) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544');

-- Step 1.4: Update membership table to match the correct case
UPDATE membership 
SET wallet_address = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
WHERE LOWER(wallet_address) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544');

-- Step 1.5: Update referrals table
UPDATE referrals 
SET 
    member_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544',
    referrer_wallet = CASE 
        WHEN LOWER(referrer_wallet) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544') 
        THEN '0xa212A85f7434A5EBAa5b468971EC3972cE72a544' 
        ELSE referrer_wallet 
    END,
    matrix_root_wallet = CASE 
        WHEN LOWER(matrix_root_wallet) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544') 
        THEN '0xa212A85f7434A5EBAa5b468971EC3972cE72a544' 
        ELSE matrix_root_wallet 
    END
WHERE LOWER(member_wallet) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544')
   OR LOWER(referrer_wallet) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544')
   OR LOWER(matrix_root_wallet) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544');

-- Step 1.6: Update user_balances table if exists
UPDATE user_balances 
SET wallet_address = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
WHERE LOWER(wallet_address) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544');

-- Step 1.7: Update layer_rewards table if exists
UPDATE layer_rewards 
SET 
    matrix_root_wallet = CASE 
        WHEN LOWER(matrix_root_wallet) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544') 
        THEN '0xa212A85f7434A5EBAa5b468971EC3972cE72a544' 
        ELSE matrix_root_wallet 
    END,
    reward_recipient_wallet = CASE 
        WHEN LOWER(reward_recipient_wallet) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544') 
        THEN '0xa212A85f7434A5EBAa5b468971EC3972cE72a544' 
        ELSE reward_recipient_wallet 
    END,
    triggering_member_wallet = CASE 
        WHEN LOWER(triggering_member_wallet) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544') 
        THEN '0xa212A85f7434A5EBAa5b468971EC3972cE72a544' 
        ELSE triggering_member_wallet 
    END
WHERE LOWER(matrix_root_wallet) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544')
   OR LOWER(reward_recipient_wallet) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544')
   OR LOWER(triggering_member_wallet) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544');

COMMIT;

\echo '✅ Fixed problematic account 0xa212A85f7434A5EBAa5b468971EC3972cE72a544'

-- ========================================
-- Step 2: Verify the fix
-- ========================================
\echo '🔍 Step 2: Verifying the fix...'

\echo 'Account status after fix:'
SELECT 'MEMBERS' as table_name, wallet_address, current_level::TEXT as level_info
FROM members 
WHERE LOWER(wallet_address) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544')
UNION ALL
SELECT 'USERS' as table_name, wallet_address, 'N/A' as level_info
FROM users 
WHERE LOWER(wallet_address) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544')
UNION ALL
SELECT 'MEMBERSHIP' as table_name, wallet_address, nft_level::TEXT as level_info
FROM membership 
WHERE LOWER(wallet_address) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544')
ORDER BY table_name, level_info;

-- Check referrals count
\echo 'Direct referrals count:'
SELECT COUNT(*) as direct_referrals_count
FROM referrals 
WHERE LOWER(referrer_wallet) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544');

-- ========================================
-- Step 3: Create data integrity check function
-- ========================================
\echo '📊 Step 3: Creating data integrity check function...'

CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    issue_count INTEGER,
    description TEXT
) AS $$
BEGIN
    -- Check 1: Level synchronization
    RETURN QUERY
    WITH level_mismatches AS (
        SELECT 
            m.wallet_address,
            m.current_level,
            COALESCE(MAX(mb.nft_level), 0) as highest_nft_level
        FROM members m
        LEFT JOIN membership mb ON LOWER(m.wallet_address) = LOWER(mb.wallet_address)
        GROUP BY m.wallet_address, m.current_level
        HAVING m.current_level != COALESCE(MAX(mb.nft_level), 0)
    )
    SELECT 
        'Level Synchronization'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        'Members table current_level vs membership table highest NFT level'::TEXT
    FROM level_mismatches;
    
    -- Check 2: Duplicate members
    RETURN QUERY
    WITH duplicates AS (
        SELECT wallet_address
        FROM members
        GROUP BY wallet_address
        HAVING COUNT(*) > 1
    )
    SELECT 
        'Duplicate Members'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        'Multiple member records for same wallet address'::TEXT
    FROM duplicates;
    
    -- Check 3: NFT count accuracy
    RETURN QUERY
    WITH count_mismatches AS (
        SELECT 
            m.wallet_address,
            m.total_nft_claimed,
            COUNT(DISTINCT mb.nft_level) as actual_count
        FROM members m
        LEFT JOIN membership mb ON LOWER(m.wallet_address) = LOWER(mb.wallet_address)
        GROUP BY m.wallet_address, m.total_nft_claimed
        HAVING m.total_nft_claimed != COUNT(DISTINCT mb.nft_level)
    )
    SELECT 
        'NFT Count Accuracy'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        'Members total_nft_claimed vs actual NFT count'::TEXT
    FROM count_mismatches;
    
    -- Check 4: Case consistency for the problematic account
    RETURN QUERY
    WITH case_issues AS (
        SELECT DISTINCT wallet_address
        FROM (
            SELECT wallet_address FROM members WHERE LOWER(wallet_address) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544')
            UNION ALL
            SELECT wallet_address FROM users WHERE LOWER(wallet_address) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544')
            UNION ALL
            SELECT wallet_address FROM membership WHERE LOWER(wallet_address) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544')
        ) all_addresses
        WHERE wallet_address != '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
    )
    SELECT 
        'Case Consistency'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        'Wallet address case consistency for problematic account'::TEXT
    FROM case_issues;
END;
$$ LANGUAGE plpgsql;

\echo '✅ Data integrity check function created'

-- ========================================
-- Step 4: Run integrity check
-- ========================================
\echo '🔍 Step 4: Running data integrity check...'

SELECT * FROM check_data_integrity();

\echo '✅ Step-by-step fix completed!'
\echo ''
\echo 'Summary:'
\echo '- Fixed duplicate member records for 0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
\echo '- Updated wallet address case consistency across all tables'
\echo '- Synchronized current_level to match highest NFT level (2)'
\echo '- Account should now be able to upgrade to Level 3'
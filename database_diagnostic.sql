-- =====================================================
-- DATABASE DIAGNOSTIC: Check current state
-- =====================================================

-- 1. TABLE STRUCTURE ANALYSIS
SELECT 
    'MEMBERS TABLE' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN referrer_wallet IS NOT NULL AND referrer_wallet != '' THEN 1 END) as records_with_referrer,
    COUNT(CASE WHEN current_level >= 1 THEN 1 END) as activated_members
FROM members
UNION ALL
SELECT 
    'REFERRALS TABLE' as table_name,
    COUNT(*) as total_records,
    COUNT(*) as records_with_referrer,
    NULL as activated_members
FROM referrals;

-- 2. SYNC STATUS CHECK
WITH sync_analysis AS (
    SELECT 
        m.wallet_address,
        m.referrer_wallet as member_referrer,
        r.referrer_wallet as referral_referrer,
        CASE WHEN r.member_wallet IS NOT NULL THEN 1 ELSE 0 END as is_synced,
        m.current_level,
        m.created_at as member_created
    FROM members m
    LEFT JOIN referrals r ON m.wallet_address = r.member_wallet
    WHERE m.referrer_wallet IS NOT NULL AND m.referrer_wallet != ''
)
SELECT 
    COUNT(*) as total_members_with_referrers,
    SUM(is_synced) as synced_to_referrals,
    COUNT(*) - SUM(is_synced) as missing_from_referrals,
    ROUND(SUM(is_synced) * 100.0 / COUNT(*), 2) as sync_percentage
FROM sync_analysis;

-- 3. MEMBERS WITHOUT REFERRAL RECORDS
SELECT 
    'UNSYNCED MEMBERS:' as description,
    m.wallet_address,
    m.referrer_wallet,
    m.current_level,
    m.created_at
FROM members m
LEFT JOIN referrals r ON m.wallet_address = r.member_wallet
WHERE m.referrer_wallet IS NOT NULL 
  AND m.referrer_wallet != ''
  AND r.member_wallet IS NULL
ORDER BY m.created_at DESC
LIMIT 10;

-- 4. REFERRAL CHAIN ANALYSIS
WITH referral_chains AS (
    SELECT 
        r.referrer_wallet as root,
        COUNT(*) as direct_referrals,
        array_agg(m.wallet_address) as referred_members,
        array_agg(m.current_level) as member_levels
    FROM referrals r
    JOIN members m ON r.member_wallet = m.wallet_address
    GROUP BY r.referrer_wallet
)
SELECT 
    'TOP REFERRERS:' as description,
    root as referrer_wallet,
    direct_referrals,
    array_length(referred_members, 1) as verified_count
FROM referral_chains
ORDER BY direct_referrals DESC
LIMIT 5;

-- 5. MATRIX READINESS CHECK
SELECT 
    'MATRIX COMPLETENESS:' as description,
    referrer_wallet,
    COUNT(*) as direct_referrals,
    CASE 
        WHEN COUNT(*) >= 3 THEN '🟢 Matrix Complete' 
        WHEN COUNT(*) >= 2 THEN '🟡 Almost Complete'
        ELSE '🔴 Incomplete' 
    END as matrix_status
FROM referrals r
JOIN members m ON r.member_wallet = m.wallet_address
WHERE m.current_level >= 1  -- Only count activated members
GROUP BY referrer_wallet
HAVING COUNT(*) > 0
ORDER BY COUNT(*) DESC
LIMIT 10;

-- 6. SPECIFIC PROBLEM CASE CHECK
SELECT 
    '🔍 PROBLEM CASE ANALYSIS:' as description,
    'Wallet: 0x479abda60f8c62a7c3fba411ab948a8BE0E616Ab' as wallet_info;

SELECT 
    'Member exists in members table:' as check_type,
    CASE WHEN COUNT(*) > 0 THEN '✅ YES' ELSE '❌ NO' END as result,
    COALESCE(MAX(referrer_wallet), 'N/A') as referrer_wallet,
    COALESCE(MAX(current_level), 0) as current_level
FROM members 
WHERE wallet_address = '0x479abda60f8c62a7c3fba411ab948a8be0e616ab'
UNION ALL
SELECT 
    'Member exists in referrals table:' as check_type,
    CASE WHEN COUNT(*) > 0 THEN '✅ YES' ELSE '❌ NO' END as result,
    COALESCE(MAX(referrer_wallet), 'N/A') as referrer_wallet,
    NULL as current_level
FROM referrals 
WHERE member_wallet = '0x479abda60f8c62a7c3fba411ab948a8be0e616ab';

-- 7. REFERRER CHAIN FOR PROBLEM CASE
WITH RECURSIVE referrer_chain AS (
    -- Base case: start with the problem wallet
    SELECT 
        m.wallet_address,
        m.referrer_wallet,
        m.current_level,
        1 as level,
        m.wallet_address::text as path
    FROM members m
    WHERE m.wallet_address = '0x479abda60f8c62a7c3fba411ab948a8be0e616ab'
    
    UNION ALL
    
    -- Recursive case: get referrer
    SELECT 
        m.wallet_address,
        m.referrer_wallet,
        m.current_level,
        rc.level + 1,
        rc.path || ' <- ' || m.wallet_address
    FROM members m
    JOIN referrer_chain rc ON m.wallet_address = rc.referrer_wallet
    WHERE rc.level < 5  -- Prevent infinite recursion
)
SELECT 
    '📈 REFERRER CHAIN:' as description,
    level,
    wallet_address,
    referrer_wallet,
    current_level,
    path
FROM referrer_chain
ORDER BY level;
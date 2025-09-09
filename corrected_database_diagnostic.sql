-- =====================================================
-- CORRECTED DATABASE DIAGNOSTIC: Check current state
-- Fixed to match actual table structures
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
        m.current_level
    FROM members m
    LEFT JOIN referrals r ON m.wallet_address = r.member_wallet
    WHERE m.referrer_wallet IS NOT NULL AND m.referrer_wallet != ''
)
SELECT 
    '📊 SYNC STATUS' as description,
    COUNT(*) as total_members_with_referrers,
    SUM(is_synced) as synced_to_referrals,
    COUNT(*) - SUM(is_synced) as missing_from_referrals,
    ROUND(SUM(is_synced) * 100.0 / COUNT(*), 2) as sync_percentage
FROM sync_analysis;

-- 3. MEMBERS WITHOUT REFERRAL RECORDS
SELECT 
    '❌ UNSYNCED MEMBERS' as description,
    m.wallet_address,
    m.referrer_wallet,
    m.current_level
FROM members m
LEFT JOIN referrals r ON m.wallet_address = r.member_wallet
WHERE m.referrer_wallet IS NOT NULL 
  AND m.referrer_wallet != ''
  AND r.member_wallet IS NULL
ORDER BY m.wallet_address
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
    '🌳 TOP REFERRERS' as description,
    root as referrer_wallet,
    direct_referrals,
    array_length(referred_members, 1) as verified_count
FROM referral_chains
ORDER BY direct_referrals DESC
LIMIT 5;

-- 5. MATRIX READINESS CHECK
SELECT 
    '🎯 MATRIX COMPLETENESS' as description,
    referrer_wallet,
    COUNT(*) as direct_referrals,
    CASE 
        WHEN COUNT(*) >= 3 THEN '🟢 Matrix Complete' 
        WHEN COUNT(*) >= 2 THEN '🟡 Almost Complete'
        ELSE '🔴 Incomplete' 
    END as matrix_status,
    array_agg(m.wallet_address ORDER BY m.wallet_address) as referral_list
FROM referrals r
JOIN members m ON r.member_wallet = m.wallet_address
WHERE m.current_level >= 1  -- Only count activated members
GROUP BY referrer_wallet
HAVING COUNT(*) > 0
ORDER BY COUNT(*) DESC
LIMIT 10;

-- 6. SPECIFIC PROBLEM CASE CHECK
SELECT 
    '🔍 PROBLEM CASE: 0x479abda60f8c62a7c3fba411ab948a8be0e616ab' as description,
    '' as separator;

SELECT 
    'Member table check' as check_type,
    CASE WHEN COUNT(*) > 0 THEN '✅ EXISTS' ELSE '❌ MISSING' END as result,
    COALESCE(MAX(referrer_wallet), 'N/A') as referrer_wallet,
    COALESCE(MAX(current_level), 0) as current_level
FROM members 
WHERE wallet_address = '0x479abda60f8c62a7c3fba411ab948a8be0e616ab'
UNION ALL
SELECT 
    'Referrals table check' as check_type,
    CASE WHEN COUNT(*) > 0 THEN '✅ EXISTS' ELSE '❌ MISSING' END as result,
    COALESCE(MAX(referrer_wallet), 'N/A') as referrer_wallet,
    NULL as current_level
FROM referrals 
WHERE member_wallet = '0x479abda60f8c62a7c3fba411ab948a8be0e616ab';

-- 7. REFERRER'S CURRENT REFERRALS
SELECT 
    '👥 REFERRER ANALYSIS (0x47098712eeed62d22b60508a24b0ce54c5edd9ef)' as description,
    '' as separator;

-- Check what referrals the referrer currently has
SELECT 
    'Current referrals in referrals table' as source,
    r.member_wallet,
    m.current_level,
    CASE WHEN m.current_level >= 1 THEN '✅ Activated' ELSE '❌ Not Activated' END as status
FROM referrals r
JOIN members m ON r.member_wallet = m.wallet_address
WHERE r.referrer_wallet = '0x47098712eeed62d22b60508a24b0ce54c5edd9ef'
UNION ALL
SELECT 
    'All members claiming this referrer' as source,
    m.wallet_address as member_wallet,
    m.current_level,
    CASE WHEN m.current_level >= 1 THEN '✅ Activated' ELSE '❌ Not Activated' END as status
FROM members m
WHERE m.referrer_wallet = '0x47098712eeed62d22b60508a24b0ce54c5edd9ef';

-- 8. SUMMARY OF WHAT NEEDS TO BE FIXED
SELECT 
    '📋 SUMMARY - WHAT NEEDS TO BE FIXED' as title,
    '' as separator;

WITH summary AS (
    SELECT 
        (SELECT COUNT(*) FROM members WHERE referrer_wallet IS NOT NULL AND referrer_wallet != '') as members_with_ref,
        (SELECT COUNT(*) FROM referrals) as referral_records
)
SELECT 
    CASE 
        WHEN members_with_ref > referral_records THEN 
            '❌ SYNC ISSUE: ' || (members_with_ref - referral_records) || ' members missing from referrals table'
        WHEN members_with_ref = referral_records THEN 
            '✅ TABLES ARE SYNCED'
        ELSE 
            '⚠️ UNEXPECTED: More referrals than members with referrers'
    END as diagnosis,
    members_with_ref,
    referral_records
FROM summary;
-- =====================================================
-- FINAL CORRECTED QUICK FIX - No constraints assumed
-- This version works with the actual table structure
-- =====================================================

-- 1. ADD MISSING REFERRAL RECORDS (SAFEST VERSION)
-- Only insert if the record doesn't already exist
INSERT INTO referrals (member_wallet, referrer_wallet)
SELECT DISTINCT
    m.wallet_address as member_wallet,
    m.referrer_wallet as referrer_wallet
FROM members m
WHERE m.referrer_wallet IS NOT NULL
  AND m.referrer_wallet != ''
  AND NOT EXISTS (
    SELECT 1 FROM referrals r 
    WHERE r.member_wallet = m.wallet_address
  );

-- 2. VERIFY THE RESULTS
SELECT 
    'Before Fix - Members with referrers' as description,
    COUNT(*) as count
FROM members 
WHERE referrer_wallet IS NOT NULL AND referrer_wallet != ''
UNION ALL
SELECT 
    'After Fix - Records in referrals table' as description,
    COUNT(*) as count
FROM referrals;

-- 3. CHECK THE SPECIFIC PROBLEM CASE
SELECT 
    '🎯 TESTING PROBLEM CASE' as test_name,
    m.wallet_address,
    m.referrer_wallet as member_has_referrer,
    CASE 
        WHEN r.member_wallet IS NOT NULL THEN '✅ NOW IN REFERRALS TABLE' 
        ELSE '❌ STILL MISSING FROM REFERRALS' 
    END as fix_status
FROM members m
LEFT JOIN referrals r ON m.wallet_address = r.member_wallet
WHERE m.wallet_address = '0x479abda60f8c62a7c3fba411ab948a8be0e616ab';

-- 4. SHOW REFERRER'S NETWORK AFTER FIX
SELECT 
    '👥 REFERRER NETWORK AFTER FIX' as info,
    'Referrer: 0x47098712eeed62d22b60508a24b0ce54c5edd9ef' as referrer_wallet;

SELECT 
    r.member_wallet,
    m.current_level,
    CASE WHEN m.current_level >= 1 THEN '✅ Activated' ELSE '⏳ Pending' END as status
FROM referrals r
JOIN members m ON r.member_wallet = m.wallet_address
WHERE r.referrer_wallet = '0x47098712eeed62d22b60508a24b0ce54c5edd9ef'
ORDER BY m.current_level DESC, r.member_wallet;
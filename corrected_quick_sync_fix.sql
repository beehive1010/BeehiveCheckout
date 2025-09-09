-- =====================================================
-- CORRECTED QUICK FIX: Sync members to referrals table
-- Fixed to match actual referrals table structure
-- =====================================================

-- Based on the error, referrals table only has: id, member_wallet, referrer_wallet
-- NO created_at column

-- 1. IMMEDIATE SYNC: Add missing referral records (CORRECTED)
INSERT INTO referrals (member_wallet, referrer_wallet)
SELECT 
    m.wallet_address as member_wallet,
    m.referrer_wallet as referrer_wallet
FROM members m
WHERE m.referrer_wallet IS NOT NULL
  AND m.referrer_wallet != ''
  AND NOT EXISTS (
    SELECT 1 FROM referrals r 
    WHERE r.member_wallet = m.wallet_address
  )
ON CONFLICT (member_wallet) DO NOTHING;

-- 2. VERIFY THE FIX
SELECT 
    'Members with referrers' as description,
    COUNT(*) as count
FROM members 
WHERE referrer_wallet IS NOT NULL AND referrer_wallet != ''
UNION ALL
SELECT 
    'Records in referrals table' as description,
    COUNT(*) as count
FROM referrals
UNION ALL
SELECT 
    'Missing referral records' as description,
    (SELECT COUNT(*) FROM members WHERE referrer_wallet IS NOT NULL AND referrer_wallet != '') - 
    (SELECT COUNT(*) FROM referrals) as count;

-- 3. CHECK SPECIFIC PROBLEM CASE
SELECT 
    'SPECIFIC CASE CHECK' as test,
    m.wallet_address,
    m.referrer_wallet as member_referrer,
    r.referrer_wallet as referral_referrer,
    CASE WHEN r.member_wallet IS NOT NULL THEN '✅ FIXED' ELSE '❌ STILL MISSING' END as status
FROM members m
LEFT JOIN referrals r ON m.wallet_address = r.member_wallet
WHERE m.wallet_address = '0x479abda60f8c62a7c3fba411ab948a8be0e616ab';
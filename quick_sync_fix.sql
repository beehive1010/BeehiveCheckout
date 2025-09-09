-- =====================================================
-- QUICK FIX: Sync members to referrals table
-- =====================================================

-- This is the immediate fix to sync existing members to referrals table

-- 1. IMMEDIATE SYNC: Add missing referral records
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
-- Check how many records were added
SELECT 
    'BEFORE SYNC' as status,
    (SELECT COUNT(*) FROM members WHERE referrer_wallet IS NOT NULL AND referrer_wallet != '') as members_with_referrers,
    (SELECT COUNT(*) FROM referrals) as referral_records_before
UNION ALL
SELECT 
    'AFTER SYNC' as status,
    (SELECT COUNT(*) FROM members WHERE referrer_wallet IS NOT NULL AND referrer_wallet != '') as members_with_referrers,
    (SELECT COUNT(*) FROM referrals) as referral_records_after;

-- 3. CHECK SPECIFIC PROBLEM CASE
SELECT 
    m.wallet_address,
    m.referrer_wallet as member_referrer,
    r.referrer_wallet as referral_referrer,
    CASE WHEN r.member_wallet IS NOT NULL THEN '✅ SYNCED' ELSE '❌ MISSING' END as sync_status
FROM members m
LEFT JOIN referrals r ON m.wallet_address = r.member_wallet
WHERE m.wallet_address = '0x479abda60f8c62a7c3fba411ab948a8be0e616ab';
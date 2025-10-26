-- Check user's referrer_wallet in members table
-- Replace with actual wallet address
SELECT
    wallet_address,
    referrer_wallet,
    current_level,
    activation_time,
    activation_sequence
FROM members
WHERE wallet_address ILIKE '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab';

-- Check if this user has any referrals data
SELECT
    referred_wallet,
    referrer_wallet,
    referral_depth,
    created_at
FROM referrals
WHERE referred_wallet ILIKE '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab';

-- Check direct referrals count (confirm 9)
SELECT COUNT(*) as direct_referrals_count
FROM v_direct_referrals
WHERE referrer_wallet ILIKE '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab';

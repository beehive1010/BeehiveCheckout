-- =====================================================
-- BEEHIVE PRODUCTION DATA IMPORT SCRIPT
-- =====================================================

-- Run this after running production_sync_complete.sql
-- This script imports all the corrected data

BEGIN;

-- =====================================================
-- IMPORT CORRECTED DATA
-- =====================================================

-- Import core user data (corrected with real production data)
\COPY users FROM '/tmp/sync_users_corrected.csv' WITH CSV HEADER;
\COPY members FROM '/tmp/sync_members_corrected.csv' WITH CSV HEADER;

-- Import referral matrix (final corrected with complete cascading)
\COPY referrals FROM '/tmp/sync_referrals_final.csv' WITH CSV HEADER;

-- Import reward system data (final corrected)
\COPY user_rewards FROM '/tmp/sync_user_rewards_final.csv' WITH CSV HEADER;
\COPY user_balances FROM '/tmp/sync_user_balances_final.csv' WITH CSV HEADER;
\COPY user_wallet FROM '/tmp/sync_user_wallet.csv' WITH CSV HEADER;

-- Import platform data
\COPY platform_revenue FROM '/tmp/sync_platform_revenue.csv' WITH CSV HEADER;
\COPY user_activities FROM '/tmp/sync_user_activities.csv' WITH CSV HEADER;
\COPY user_notifications FROM '/tmp/sync_user_notifications.csv' WITH CSV HEADER;

-- Import NFT marketplace data
\COPY advertisement_nfts FROM '/tmp/sync_advertisement_nfts.csv' WITH CSV HEADER;
\COPY merchant_nfts FROM '/tmp/sync_merchant_nfts.csv' WITH CSV HEADER;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
    user_count INTEGER;
    referral_count INTEGER;
    reward_count INTEGER;
    balance_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO referral_count FROM referrals;
    SELECT COUNT(*) INTO reward_count FROM user_rewards;
    SELECT COUNT(*) INTO balance_count FROM user_balances;
    
    RAISE NOTICE '✅ Data Import Summary:';
    RAISE NOTICE '📊 Users: % records', user_count;
    RAISE NOTICE '🔗 Referrals: % records', referral_count;
    RAISE NOTICE '💰 Rewards: % records', reward_count;
    RAISE NOTICE '💳 Balances: % records', balance_count;
    
    -- Verify key balances
    RAISE NOTICE '🎯 Key User Balances:';
    FOR r IN SELECT wallet_address, available_usdt_rewards, pending_upgrade_rewards 
             FROM user_wallet WHERE available_usdt_rewards > 0 LOOP
        RAISE NOTICE '  %: $% available, $% pending', 
            SUBSTRING(r.wallet_address FROM 1 FOR 8), r.available_usdt_rewards, r.pending_upgrade_rewards;
    END LOOP;
END $$;

COMMIT;

-- =====================================================
-- FINAL STATUS
-- =====================================================

SELECT '🚀 PRODUCTION SYNC COMPLETE!' as status;
-- ===========================================================================
-- Compare Direct Referrals Between Different Views
-- Date: 2025-10-12
--
-- This script compares direct referral counts from different sources
-- to identify discrepancies between frontend and backend validation
-- ===========================================================================

-- Replace with your actual wallet address
\set wallet_address '''YOUR_WALLET_ADDRESS'''

SELECT '═══════════════════════════════════════════════════════' as separator;
SELECT 'DIRECT REFERRALS COMPARISON REPORT' as report_name;
SELECT '═══════════════════════════════════════════════════════' as separator;

-- Source 1: v_direct_referrals (Frontend uses this)
SELECT '1. v_direct_referrals (Frontend)' as source;
SELECT
    COUNT(*) as direct_referrals_count,
    ARRAY_AGG(referred_wallet ORDER BY referral_date DESC) as referred_wallets
FROM v_direct_referrals
WHERE referrer_wallet ILIKE :wallet_address;

-- Source 2: referrals_stats_view (Backend uses this)
SELECT '2. referrals_stats_view (Backend)' as source;
SELECT
    wallet_address,
    direct_referrals_count,
    total_referrals_count
FROM referrals_stats_view
WHERE wallet_address ILIKE :wallet_address;

-- Source 3: referrals table raw count (Fallback)
SELECT '3. referrals table - referral_depth = 1 (Raw data)' as source;
SELECT
    COUNT(*) as direct_referrals_count,
    ARRAY_AGG(referred_wallet ORDER BY created_at DESC) as referred_wallets
FROM referrals
WHERE referrer_wallet ILIKE :wallet_address
  AND referral_depth = 1;

-- Source 4: referrals table - all referrals
SELECT '4. referrals table - ALL referrals (Including indirect)' as source;
SELECT
    COUNT(*) as total_referrals,
    COUNT(*) FILTER (WHERE referral_depth = 1) as direct_only,
    COUNT(*) FILTER (WHERE referral_depth > 1) as indirect_only
FROM referrals
WHERE referrer_wallet ILIKE :wallet_address;

-- Detailed breakdown by source
SELECT '═══════════════════════════════════════════════════════' as separator;
SELECT 'DETAILED REFERRAL LIST FROM EACH SOURCE' as report_section;
SELECT '═══════════════════════════════════════════════════════' as separator;

-- List from v_direct_referrals
SELECT '1. List from v_direct_referrals:' as list_name;
SELECT
    ROW_NUMBER() OVER (ORDER BY referral_date DESC) as "#",
    referred_wallet,
    referred_level,
    referral_date
FROM v_direct_referrals
WHERE referrer_wallet ILIKE :wallet_address
ORDER BY referral_date DESC;

-- List from referrals table
SELECT '2. List from referrals table (depth=1):' as list_name;
SELECT
    ROW_NUMBER() OVER (ORDER BY created_at DESC) as "#",
    referred_wallet,
    referral_depth,
    created_at
FROM referrals
WHERE referrer_wallet ILIKE :wallet_address
  AND referral_depth = 1
ORDER BY created_at DESC;

-- Check for discrepancies
SELECT '═══════════════════════════════════════════════════════' as separator;
SELECT 'DISCREPANCY ANALYSIS' as analysis_name;
SELECT '═══════════════════════════════════════════════════════' as separator;

WITH frontend_count AS (
    SELECT COUNT(*) as cnt
    FROM v_direct_referrals
    WHERE referrer_wallet ILIKE :wallet_address
),
backend_count AS (
    SELECT COALESCE(direct_referrals_count, 0) as cnt
    FROM referrals_stats_view
    WHERE wallet_address ILIKE :wallet_address
),
raw_count AS (
    SELECT COUNT(*) as cnt
    FROM referrals
    WHERE referrer_wallet ILIKE :wallet_address
      AND referral_depth = 1
)
SELECT
    f.cnt as frontend_view_count,
    b.cnt as backend_view_count,
    r.cnt as raw_table_count,
    CASE
        WHEN f.cnt = b.cnt AND b.cnt = r.cnt THEN '✅ All sources match'
        WHEN f.cnt <> b.cnt THEN '❌ Frontend/Backend mismatch!'
        WHEN b.cnt <> r.cnt THEN '❌ Backend view/Raw table mismatch!'
        ELSE '⚠️ Inconsistency detected'
    END as status,
    CASE
        WHEN f.cnt >= 3 AND b.cnt < 3 THEN '🚨 Frontend shows qualified (9), but backend sees insufficient!'
        WHEN f.cnt < 3 AND b.cnt >= 3 THEN '🚨 Backend shows qualified, but frontend sees insufficient!'
        WHEN f.cnt >= 3 AND b.cnt >= 3 THEN '✅ Both frontend and backend show qualification for Level 2'
        ELSE '❌ Not qualified for Level 2 on either source'
    END as level2_eligibility_analysis
FROM frontend_count f, backend_count b, raw_count r;

-- ===========================================================================
-- RECOMMENDATION:
-- 1. If counts don't match, check view definitions
-- 2. If backend count < 3 but frontend shows 9, the issue is in referrals_stats_view
-- 3. Unified solution: Both frontend and backend should use the same view
-- ===========================================================================

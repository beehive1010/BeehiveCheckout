-- ============================================================================
-- Create Missing Direct Referral Rewards for Backfilled Members
-- Date: 2025-10-12
-- Priority: P0
--
-- Purpose: Create direct_referral_rewards for members who were backfilled
--          into matrix_referrals but didn't get their rewards created
--
-- Business Rule: When a member is placed in Layer 1 of a matrix, the matrix
--                root (referrer) should receive a 100 USDT direct referral reward
-- ============================================================================

BEGIN;

-- Create missing direct referral rewards for Layer 1 placements
-- Only create for the 10 backfilled members
WITH backfilled_layer1_placements AS (
    SELECT DISTINCT
        mr.matrix_root_wallet AS referrer_wallet,
        mr.member_wallet AS referred_member_wallet,
        mr.created_at AS placement_time
    FROM matrix_referrals mr
    WHERE mr.member_wallet IN (
        '0x0314f6075959B7B3d1b156f693683d3155280F07',
        '0x0bA198F73DF3A1374a49Acb2c293ccA20e150Fe0',
        '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0',
        '0x5868F27616BA49e113B8A367c9A77143B289Ed77',
        '0x8E6e69856FAb638537EC0b80e351eB029378F8e0',
        '0x9786584Df210B3feDC05A9b62Cc5c8D1197841Dc',
        '0x990B45797D36633E63BB8cbdC6Cf9478c5530CdC',
        '0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37',
        '0xfD6f46A7DF6398814a54db994D04195C3bC6beFD',
        '0xfDfA9922375CF28c9d979b9CD200f08099C63bA4'
    )
    AND mr.layer = 1  -- Only Layer 1 placements earn direct referral rewards
    AND NOT EXISTS (
        -- Don't create duplicate rewards
        SELECT 1 FROM direct_referral_rewards drr
        WHERE drr.referrer_wallet = mr.matrix_root_wallet
        AND drr.referred_member_wallet = mr.member_wallet
    )
),
inserted_rewards AS (
    INSERT INTO direct_referral_rewards (
        referrer_wallet,
        referred_member_wallet,
        reward_amount,
        status,
        created_at,
        metadata
    )
    SELECT
        referrer_wallet,
        referred_member_wallet,
        100.000000 AS reward_amount,  -- Standard direct referral reward
        'claimable' AS status,  -- Immediately claimable (no gates)
        placement_time AS created_at,
        jsonb_build_object(
            'source', 'backfill_missing_rewards',
            'backfill_date', NOW(),
            'reason', 'Matrix placement completed but reward not created'
        ) AS metadata
    FROM backfilled_layer1_placements
    RETURNING *
)
SELECT
    COUNT(*) AS rewards_created,
    SUM(reward_amount) AS total_reward_amount,
    COUNT(DISTINCT referrer_wallet) AS unique_referrers,
    COUNT(DISTINCT referred_member_wallet) AS unique_referred_members
FROM inserted_rewards;

-- ============================================================================
-- Validation: Show all created rewards
-- ============================================================================

DO $$
DECLARE
    v_total_rewards INTEGER;
    v_total_amount NUMERIC;
BEGIN
    -- Count rewards for backfilled members
    SELECT
        COUNT(*),
        SUM(reward_amount)
    INTO v_total_rewards, v_total_amount
    FROM direct_referral_rewards
    WHERE referred_member_wallet IN (
        '0x0314f6075959B7B3d1b156f693683d3155280F07',
        '0x0bA198F73DF3A1374a49Acb2c293ccA20e150Fe0',
        '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0',
        '0x5868F27616BA49e113B8A367c9A77143B289Ed77',
        '0x8E6e69856FAb638537EC0b80e351eB029378F8e0',
        '0x9786584Df210B3feDC05A9b62Cc5c8D1197841Dc',
        '0x990B45797D36633E63BB8cbdC6Cf9478c5530CdC',
        '0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37',
        '0xfD6f46A7DF6398814a54db994D04195C3bC6beFD',
        '0xfDfA9922375CF28c9d979b9CD200f08099C63bA4'
    );

    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ MISSING DIRECT REFERRAL REWARDS CREATED';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Total Rewards Created: %', v_total_rewards;
    RAISE NOTICE 'Total Reward Amount: % USDT', v_total_amount;
    RAISE NOTICE '';
    RAISE NOTICE 'All rewards are set to status = claimable';
    RAISE NOTICE 'Referrers can now claim their rewards!';
    RAISE NOTICE '';
END $$;

COMMIT;

-- ============================================================================
-- Summary Report: Show rewards by referrer
-- ============================================================================

SELECT
    drr.referrer_wallet,
    COUNT(*) AS reward_count,
    SUM(drr.reward_amount) AS total_amount,
    drr.status
FROM direct_referral_rewards drr
WHERE drr.referred_member_wallet IN (
    '0x0314f6075959B7B3d1b156f693683d3155280F07',
    '0x0bA198F73DF3A1374a49Acb2c293ccA20e150Fe0',
    '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0',
    '0x5868F27616BA49e113B8A367c9A77143B289Ed77',
    '0x8E6e69856FAb638537EC0b80e351eB029378F8e0',
    '0x9786584Df210B3feDC05A9b62Cc5c8D1197841Dc',
    '0x990B45797D36633E63BB8cbdC6Cf9478c5530CdC',
    '0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37',
    '0xfD6f46A7DF6398814a54db994D04195C3bC6beFD',
    '0xfDfA9922375CF28c9d979b9CD200f08099C63bA4'
)
GROUP BY drr.referrer_wallet, drr.status
ORDER BY total_amount DESC;

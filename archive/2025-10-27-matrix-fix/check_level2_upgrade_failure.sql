-- Check Level 2 Upgrade Failures
-- Find NFT claims that succeeded but database activation failed

-- 1. Check claim_sync_queue for pending Level 2 upgrades
SELECT
    '=== Pending Level 2 Claims in Sync Queue ===' as info;

SELECT
    id,
    wallet_address,
    level,
    tx_hash,
    status,
    source,
    error_message,
    retry_count,
    created_at,
    last_retry_at
FROM claim_sync_queue
WHERE level = 2
  AND status = 'pending'
ORDER BY created_at DESC;

-- 2. Check recent failed sync attempts
SELECT
    '=== Recent Failed Sync Attempts ===' as info;

SELECT
    id,
    wallet_address,
    level,
    tx_hash,
    status,
    error_message,
    retry_count,
    created_at,
    last_retry_at
FROM claim_sync_queue
WHERE status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 3. Find members who have Level 1 but no Level 2 membership
-- (These are candidates who may have tried to upgrade)
SELECT
    '=== Members at Level 1 Without Level 2 Membership ===' as info;

SELECT
    m.wallet_address,
    m.current_level,
    m.activation_time,
    COUNT(r.referred_wallet) as direct_referrals,
    mem1.nft_level as has_level1,
    mem2.nft_level as has_level2
FROM members m
LEFT JOIN referrals r ON m.wallet_address = r.referrer_wallet AND r.referral_depth = 1
LEFT JOIN membership mem1 ON m.wallet_address = mem1.wallet_address AND mem1.nft_level = 1
LEFT JOIN membership mem2 ON m.wallet_address = mem2.wallet_address AND mem2.nft_level = 2
WHERE m.current_level = 1
GROUP BY m.wallet_address, m.current_level, m.activation_time, mem1.nft_level, mem2.nft_level
HAVING COUNT(r.referred_wallet) >= 3
ORDER BY m.activation_time DESC;

-- 4. Check audit_logs for level_upgrade attempts
SELECT
    '=== Recent Level Upgrade Attempts from Audit Logs ===' as info;

SELECT
    wallet_address,
    action,
    details,
    created_at
FROM audit_logs
WHERE action = 'level_upgrade'
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- 5. Look for any Level 2 NFT claims in the last 24 hours
SELECT
    '=== Recent Level 2 Membership Records ===' as info;

SELECT
    wallet_address,
    nft_level,
    is_member,
    claimed_at,
    transaction_hash,
    created_at,
    unlock_membership_level
FROM membership
WHERE nft_level = 2
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

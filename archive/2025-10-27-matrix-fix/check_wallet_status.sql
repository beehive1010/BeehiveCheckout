-- 检查钱包 0x8C2CDA621f09543Dfe283eDecE34fd2C446Fd735 的完整状态

\echo '=== 1. Members表 ==='
SELECT
    wallet_address,
    current_level,
    username,
    activation_time,
    updated_at
FROM members
WHERE wallet_address ILIKE '0x8C2CDA621f09543Dfe283eDecE34fd2C446Fd735';

\echo ''
\echo '=== 2. Membership表 (所有等级) ==='
SELECT
    nft_level,
    unlock_membership_level,
    is_member,
    claimed_at,
    claim_price,
    transaction_hash
FROM membership
WHERE wallet_address ILIKE '0x8C2CDA621f09543Dfe283eDecE34fd2C446Fd735'
ORDER BY nft_level;

\echo ''
\echo '=== 3. 直推数量 ==='
SELECT
    COUNT(*) as direct_referral_count
FROM referrals
WHERE referrer_wallet ILIKE '0x8C2CDA621f09543Dfe283eDecE34fd2C446Fd735'
AND referral_depth = 1;

\echo ''
\echo '=== 4. Layer Rewards 汇总 ==='
SELECT
    triggering_nft_level,
    COUNT(*) as reward_count,
    SUM(reward_amount) as total_rewards,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN status = 'claimable' THEN 1 END) as claimable_count
FROM layer_rewards
WHERE triggering_member_wallet ILIKE '0x8C2CDA621f09543Dfe283eDecE34fd2C446Fd735'
GROUP BY triggering_nft_level
ORDER BY triggering_nft_level;

\echo ''
\echo '=== 5. 最近的Layer Rewards详情（Level 2） ==='
SELECT
    id,
    matrix_layer,
    matrix_root_wallet,
    reward_amount,
    status,
    created_at
FROM layer_rewards
WHERE triggering_member_wallet ILIKE '0x8C2CDA621f09543Dfe283eDecE34fd2C446Fd735'
AND triggering_nft_level = 2
ORDER BY matrix_layer
LIMIT 5;

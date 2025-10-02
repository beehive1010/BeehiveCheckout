-- Database Status Check Script
-- Check table structures and data integrity

-- 1. Check referrals table
SELECT 'REFERRALS TABLE STRUCTURE' as check_type;
SELECT 
    table_name,
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'referrals' 
ORDER BY ordinal_position;

-- 2. Check referrals data sample
SELECT 'REFERRALS SAMPLE DATA' as check_type;
SELECT 
    referred_wallet,
    referrer_wallet,
    placement_root,
    placement_layer,
    placement_position,
    referral_type,
    status,
    placed_at
FROM referrals 
ORDER BY placed_at DESC 
LIMIT 10;

-- 3. Check members table
SELECT 'MEMBERS TABLE STRUCTURE' as check_type;
SELECT 
    table_name,
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'members' 
ORDER BY ordinal_position;

-- 4. Check members data sample
SELECT 'MEMBERS SAMPLE DATA' as check_type;
SELECT 
    wallet_address,
    current_level,
    levels_owned,
    referrer_wallet,
    activation_rank,
    tier_level,
    created_at,
    updated_at
FROM members 
ORDER BY created_at DESC 
LIMIT 10;

-- 5. Check membership table
SELECT 'MEMBERSHIP TABLE STRUCTURE' as check_type;
SELECT 
    table_name,
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'membership' 
ORDER BY ordinal_position;

-- 6. Check membership data sample
SELECT 'MEMBERSHIP SAMPLE DATA' as check_type;
SELECT 
    wallet_address,
    level,
    claim_status,
    transaction_hash,
    platform_fee_usdc,
    created_at
FROM membership 
ORDER BY created_at DESC 
LIMIT 10;

-- 7. Check matrix and rewards relationship
SELECT 'MATRIX-REWARDS RELATIONSHIP CHECK' as check_type;
SELECT 
    COUNT(*) as total_referrals,
    COUNT(DISTINCT placement_root) as unique_roots,
    COUNT(DISTINCT placement_layer) as unique_layers,
    AVG(placement_layer) as avg_layer
FROM referrals;

-- 8. Check layer rewards
SELECT 'LAYER REWARDS CHECK' as check_type;
SELECT 
    layer,
    COUNT(*) as reward_count,
    SUM(reward_amount_usdc) as total_rewards,
    status,
    COUNT(DISTINCT root_wallet) as unique_recipients
FROM layer_rewards 
GROUP BY layer, status
ORDER BY layer;

-- 9. Check platform fees
SELECT 'PLATFORM FEES CHECK' as check_type;
SELECT 
    fee_type,
    COUNT(*) as fee_count,
    SUM(amount_usdc) as total_fees,
    status
FROM platform_fees 
GROUP BY fee_type, status
ORDER BY fee_type;

-- 10. Check referrals-members consistency
SELECT 'REFERRALS-MEMBERS CONSISTENCY CHECK' as check_type;
SELECT 
    'Members without referrals' as issue_type,
    COUNT(*) as count
FROM members m
LEFT JOIN referrals r ON m.wallet_address = r.referred_wallet
WHERE r.referred_wallet IS NULL
AND m.wallet_address != '0x0000000000000000000000000000000000000001'

UNION ALL

SELECT 
    'Referrals without members' as issue_type,
    COUNT(*) as count
FROM referrals r
LEFT JOIN members m ON r.referred_wallet = m.wallet_address
WHERE m.wallet_address IS NULL;
-- Fix reward_summary, rewards_summary and update user_balances with correct amounts
-- Based on current layer_rewards data after L→M→R placement fixes

-- Step 1: Check current layer_rewards status
SELECT 
    '=== CURRENT LAYER_REWARDS STATUS ===' as section_title;

SELECT 
    COALESCE(recipient_u.username, 'Unknown') as recipient,
    COALESCE(payer_u.username, 'Unknown') as payer,
    lr.layer,
    lr.reward_type,
    lr.amount_usdt,
    lr.amount_bcc,
    lr.is_claimed
FROM layer_rewards lr
LEFT JOIN users recipient_u ON LOWER(lr.recipient_wallet) = LOWER(recipient_u.wallet_address)
LEFT JOIN users payer_u ON LOWER(lr.payer_wallet) = LOWER(payer_u.wallet_address)
ORDER BY recipient_u.username, lr.layer;

-- Step 2: Drop and recreate reward_summary with correct logic
DROP VIEW IF EXISTS reward_summary CASCADE;

CREATE VIEW reward_summary AS
SELECT 
    lr.recipient_wallet as wallet_address,
    COALESCE(u.username, 'Unknown') as username,
    
    -- USDC amounts by status
    SUM(CASE WHEN lr.reward_type = 'layer_reward' AND lr.is_claimed = false THEN lr.amount_usdt ELSE 0 END) as usdc_claimable,
    SUM(CASE WHEN lr.reward_type = 'pending_layer_reward' THEN lr.amount_usdt ELSE 0 END) as usdc_pending,
    SUM(CASE WHEN lr.is_claimed = true THEN lr.amount_usdt ELSE 0 END) as usdc_claimed,
    SUM(lr.amount_usdt) as total_rewards,
    
    -- Counts by status
    COUNT(*) FILTER (WHERE lr.reward_type = 'layer_reward' AND lr.is_claimed = false) as claimable_count,
    COUNT(*) FILTER (WHERE lr.reward_type = 'pending_layer_reward') as pending_count,
    COUNT(*) FILTER (WHERE lr.is_claimed = true) as claimed_count,
    COUNT(*) FILTER (WHERE lr.reward_type = 'rolled_up_reward') as rolled_up_count,
    
    -- Updated timestamp
    GREATEST(MAX(lr.created_at), MAX(lr.updated_at)) as updated_at

FROM layer_rewards lr
LEFT JOIN users u ON LOWER(lr.recipient_wallet) = LOWER(u.wallet_address)
GROUP BY lr.recipient_wallet, u.username
ORDER BY total_rewards DESC;

-- Step 3: Drop and recreate rewards_summary with proper grouping
DROP VIEW IF EXISTS rewards_summary CASCADE;

CREATE VIEW rewards_summary AS
SELECT 
    lr.recipient_wallet,
    lr.layer,
    lr.reward_type,
    COUNT(*) as total_rewards,
    COUNT(*) FILTER (WHERE lr.reward_type = 'pending_layer_reward') as pending_rewards,
    COUNT(*) FILTER (WHERE lr.is_claimed = true) as claimed_rewards,
    SUM(lr.amount_usdt) as total_amount,
    SUM(CASE WHEN lr.reward_type = 'pending_layer_reward' THEN lr.amount_usdt ELSE 0 END) as pending_amount,
    SUM(CASE WHEN lr.is_claimed = true THEN lr.amount_usdt ELSE 0 END) as claimed_amount,
    SUM(lr.amount_bcc) as total_bcc_amount,
    MAX(lr.created_at) as latest_reward_date,
    MAX(CASE WHEN lr.is_claimed = true THEN lr.updated_at END) as latest_claim_date

FROM layer_rewards lr
GROUP BY lr.recipient_wallet, lr.layer, lr.reward_type
ORDER BY lr.recipient_wallet, lr.layer, lr.reward_type;

-- Step 4: Update user_balances with correct reward amounts
UPDATE user_balances 
SET 
    usdc_claimable = COALESCE(reward_totals.claimable_usdc, 0),
    usdc_pending = COALESCE(reward_totals.pending_usdc, 0),
    usdc_claimed_total = COALESCE(reward_totals.claimed_usdc, 0),
    updated_at = now()
FROM (
    SELECT 
        lr.recipient_wallet,
        SUM(CASE WHEN lr.reward_type = 'layer_reward' AND lr.is_claimed = false THEN lr.amount_usdt ELSE 0 END) as claimable_usdc,
        SUM(CASE WHEN lr.reward_type = 'pending_layer_reward' THEN lr.amount_usdt ELSE 0 END) as pending_usdc,
        SUM(CASE WHEN lr.is_claimed = true THEN lr.amount_usdt ELSE 0 END) as claimed_usdc
    FROM layer_rewards lr
    GROUP BY lr.recipient_wallet
) reward_totals
WHERE LOWER(user_balances.wallet_address) = LOWER(reward_totals.recipient_wallet);

-- Step 5: Show updated reward_summary
SELECT 
    '=== UPDATED REWARD_SUMMARY ===' as section_title;

SELECT 
    username,
    usdc_claimable || ' USDC' as claimable,
    usdc_pending || ' USDC' as pending,
    usdc_claimed || ' USDC' as claimed,
    total_rewards || ' USDC' as total,
    claimable_count || ' claimable' as claimable_rewards,
    pending_count || ' pending' as pending_rewards
FROM reward_summary
WHERE total_rewards > 0
ORDER BY total_rewards DESC;

-- Step 6: Show updated rewards_summary
SELECT 
    '=== UPDATED REWARDS_SUMMARY BY LAYER ===' as section_title;

SELECT 
    COALESCE(u.username, 'Unknown') as member,
    'Layer ' || rs.layer as layer,
    rs.reward_type as status,
    rs.total_rewards || ' rewards' as count,
    rs.total_amount || ' USDC' as amount,
    rs.total_bcc_amount || ' BCC' as bcc_amount
FROM rewards_summary rs
LEFT JOIN users u ON LOWER(rs.recipient_wallet) = LOWER(u.wallet_address)
WHERE rs.total_amount > 0
ORDER BY u.username, rs.layer, rs.reward_type;

-- Step 7: Show updated user_balances
SELECT 
    '=== UPDATED USER_BALANCES ===' as section_title;

SELECT 
    COALESCE(u.username, SUBSTRING(ub.wallet_address, 1, 10)) as user,
    ub.usdc_claimable || ' USDC' as claimable,
    ub.usdc_pending || ' USDC' as pending,
    ub.usdc_claimed_total || ' USDC' as claimed,
    (ub.usdc_claimable + ub.usdc_pending + ub.usdc_claimed_total) || ' USDC' as total_usdc,
    ub.bcc_transferable || ' BCC' as bcc_transferable,
    ub.current_tier as tier
FROM user_balances ub
LEFT JOIN users u ON LOWER(ub.wallet_address) = LOWER(u.wallet_address)
WHERE (ub.usdc_claimable + ub.usdc_pending + ub.usdc_claimed_total) > 0
   OR ub.bcc_transferable > 0
   OR ub.bcc_locked > 0
ORDER BY u.username;

-- Step 8: Validation check
SELECT 
    '=== VALIDATION: LAYER_REWARDS vs USER_BALANCES ===' as section_title;

SELECT 
    COALESCE(u.username, 'Unknown') as member,
    -- From layer_rewards
    SUM(CASE WHEN lr.reward_type = 'layer_reward' AND lr.is_claimed = false THEN lr.amount_usdt ELSE 0 END) as lr_claimable,
    SUM(CASE WHEN lr.reward_type = 'pending_layer_reward' THEN lr.amount_usdt ELSE 0 END) as lr_pending,
    -- From user_balances  
    ub.usdc_claimable as ub_claimable,
    ub.usdc_pending as ub_pending,
    -- Match check
    CASE 
        WHEN ABS(SUM(CASE WHEN lr.reward_type = 'layer_reward' AND lr.is_claimed = false THEN lr.amount_usdt ELSE 0 END) - ub.usdc_claimable) < 0.01
         AND ABS(SUM(CASE WHEN lr.reward_type = 'pending_layer_reward' THEN lr.amount_usdt ELSE 0 END) - ub.usdc_pending) < 0.01
        THEN '✅ Match'
        ELSE '❌ Mismatch'
    END as validation
FROM layer_rewards lr
LEFT JOIN users u ON LOWER(lr.recipient_wallet) = LOWER(u.wallet_address)
LEFT JOIN user_balances ub ON LOWER(lr.recipient_wallet) = LOWER(ub.wallet_address)
GROUP BY lr.recipient_wallet, u.username, ub.usdc_claimable, ub.usdc_pending
HAVING SUM(lr.amount_usdt) > 0
ORDER BY u.username;

-- Final summary
DO $$
DECLARE
    total_reward_recipients INTEGER;
    total_claimable_usdc NUMERIC;
    total_pending_usdc NUMERIC;
    updated_balances INTEGER;
BEGIN
    SELECT COUNT(DISTINCT recipient_wallet) INTO total_reward_recipients FROM layer_rewards;
    
    SELECT 
        SUM(usdc_claimable),
        SUM(usdc_pending)
    INTO total_claimable_usdc, total_pending_usdc
    FROM reward_summary;
    
    SELECT COUNT(*) INTO updated_balances 
    FROM user_balances 
    WHERE usdc_claimable > 0 OR usdc_pending > 0;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== REWARD SUMMARIES AND BALANCES UPDATE COMPLETE ===';
    RAISE NOTICE 'Members with rewards: %', total_reward_recipients;
    RAISE NOTICE 'Total claimable USDC: %', COALESCE(total_claimable_usdc, 0);
    RAISE NOTICE 'Total pending USDC: %', COALESCE(total_pending_usdc, 0);
    RAISE NOTICE 'Updated user balances: %', updated_balances;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Views updated: reward_summary, rewards_summary';
    RAISE NOTICE '✅ User balances synchronized with layer_rewards';
END $$;
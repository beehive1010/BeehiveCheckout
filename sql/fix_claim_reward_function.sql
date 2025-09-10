-- Fix claimReward function to use layer_rewards instead of reward_claims
-- Ensure consistency with our corrected matrix logic

-- Step 1: Check current layer_rewards vs reward_claims data consistency
SELECT 
    '=== LAYER_REWARDS vs REWARD_CLAIMS COMPARISON ===' as section_title;

-- Check layer_rewards data
SELECT 
    'LAYER_REWARDS:' as source,
    lr.id,
    COALESCE(recipient_u.username, 'Unknown') as recipient,
    COALESCE(payer_u.username, 'Unknown') as from_member,
    lr.layer,
    lr.reward_type,
    lr.amount_usdt,
    lr.is_claimed
FROM layer_rewards lr
LEFT JOIN users recipient_u ON LOWER(lr.recipient_wallet) = LOWER(recipient_u.wallet_address)
LEFT JOIN users payer_u ON LOWER(lr.payer_wallet) = LOWER(payer_u.wallet_address)
ORDER BY recipient_u.username, lr.layer

UNION ALL

-- Check reward_claims data  
SELECT 
    'REWARD_CLAIMS:' as source,
    rc.id::text,
    COALESCE(root_u.username, 'Unknown') as recipient,
    COALESCE(trigger_u.username, 'Unknown') as from_member,
    rc.layer,
    rc.status as reward_type,
    rc.reward_amount_usdc,
    CASE WHEN rc.claimed_at IS NOT NULL THEN true ELSE false END as is_claimed
FROM reward_claims rc
LEFT JOIN users root_u ON LOWER(rc.root_wallet) = LOWER(root_u.wallet_address)
LEFT JOIN users trigger_u ON LOWER(rc.triggering_member_wallet) = LOWER(trigger_u.wallet_address)
ORDER BY recipient, layer;

-- Step 2: Analysis summary
SELECT 
    '=== DATA CONSISTENCY ANALYSIS ===' as section_title;

-- Count records in each system
WITH layer_rewards_count AS (
    SELECT 'layer_rewards' as system, COUNT(*) as total_records
    FROM layer_rewards
),
reward_claims_count AS (
    SELECT 'reward_claims' as system, COUNT(*) as total_records  
    FROM reward_claims
)
SELECT * FROM layer_rewards_count
UNION ALL
SELECT * FROM reward_claims_count;

-- Step 3: Recommendation
SELECT 
    '=== RECOMMENDATION ===' as section_title,
    'USE layer_rewards as PRIMARY system' as decision,
    'Benefits: Consistent with matrix logic, complete reward data' as reason1,
    'Update claimReward function to use layer_rewards table' as action_needed;

-- Step 4: Show updated claimReward logic
SELECT 
    '=== CORRECT CLAIM REWARD LOGIC ===' as section_title,
    'Query: layer_rewards WHERE id = claim_id AND recipient_wallet = wallet' as correct_query,
    'Update: SET is_claimed = true, updated_at = now()' as correct_update,
    'Sync: Update user_balances accordingly' as sync_action;

-- Step 5: Verify claimable rewards are accessible
SELECT 
    '=== CLAIMABLE REWARDS VERIFICATION ===' as section_title;

SELECT 
    lr.id,
    COALESCE(recipient_u.username, 'Unknown') as recipient,
    COALESCE(payer_u.username, 'Unknown') as from_member,
    lr.amount_usdt || ' USDC' as reward,
    lr.reward_type as status,
    lr.is_claimed,
    'Ready for claim via layer_rewards.id' as claim_method
FROM layer_rewards lr
LEFT JOIN users recipient_u ON LOWER(lr.recipient_wallet) = LOWER(recipient_u.wallet_address)
LEFT JOIN users payer_u ON LOWER(lr.payer_wallet) = LOWER(payer_u.wallet_address)
WHERE lr.reward_type = 'layer_reward' 
AND lr.is_claimed = false
ORDER BY recipient_u.username;

-- Final recommendation
DO $$
DECLARE
    layer_rewards_count INTEGER;
    reward_claims_count INTEGER;
    claimable_layer_rewards INTEGER;
    claimable_reward_claims INTEGER;
BEGIN
    SELECT COUNT(*) INTO layer_rewards_count FROM layer_rewards;
    SELECT COUNT(*) INTO reward_claims_count FROM reward_claims;
    
    SELECT COUNT(*) INTO claimable_layer_rewards 
    FROM layer_rewards 
    WHERE reward_type = 'layer_reward' AND is_claimed = false;
    
    SELECT COUNT(*) INTO claimable_reward_claims
    FROM reward_claims 
    WHERE status = 'claimable' AND claimed_at IS NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== CLAIM REWARD FUNCTION RECOMMENDATION ===';
    RAISE NOTICE 'layer_rewards records: %', layer_rewards_count;
    RAISE NOTICE 'reward_claims records: %', reward_claims_count;
    RAISE NOTICE 'Claimable in layer_rewards: %', claimable_layer_rewards;
    RAISE NOTICE 'Claimable in reward_claims: %', claimable_reward_claims;
    RAISE NOTICE '';
    RAISE NOTICE '✅ RECOMMENDATION: Use layer_rewards as primary system';
    RAISE NOTICE '✅ Update claimReward function to query layer_rewards table';
    RAISE NOTICE '✅ This ensures consistency with matrix placement logic';
    RAISE NOTICE '';
    RAISE NOTICE 'Correct claimReward implementation:';
    RAISE NOTICE '1. Query: FROM layer_rewards WHERE id = claim_id';
    RAISE NOTICE '2. Verify: recipient_wallet = wallet_address';
    RAISE NOTICE '3. Check: reward_type = "layer_reward" AND is_claimed = false';
    RAISE NOTICE '4. Update: SET is_claimed = true, updated_at = now()';
    RAISE NOTICE '5. Sync: Update user_balances usdc_claimable balance';
END $$;
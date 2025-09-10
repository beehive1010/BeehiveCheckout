-- 基于正确的推荐矩阵结构重新计算layer_rewards
-- 清理旧的错误奖励，并根据新的individual_matrix_placements生成正确的奖励

BEGIN;

-- Step 1: Backup existing rewards
CREATE TEMP TABLE backup_layer_rewards_matrix_fix AS 
SELECT * FROM layer_rewards;

-- Step 2: Clear existing incorrect layer rewards  
DELETE FROM layer_rewards;

-- Step 3: Regenerate correct layer rewards based on actual matrix placements
INSERT INTO layer_rewards (
    recipient_wallet,
    payer_wallet,
    layer,
    reward_type,
    amount_usdt,
    amount_bcc,
    source_transaction_id,
    nft_level,
    is_claimed,
    created_at
)
SELECT 
    imp.matrix_owner as recipient_wallet,
    imp.member_wallet as payer_wallet,
    imp.layer_in_owner_matrix as layer,
    
    -- Determine reward type based on matrix owner's level
    CASE 
        WHEN owner_m.current_level >= imp.layer_in_owner_matrix THEN 'layer_reward'
        ELSE 'pending_layer_reward'
    END as reward_type,
    
    -- Calculate reward amount based on member's current level
    CASE member_m.current_level
        WHEN 1 THEN 100.000000
        WHEN 2 THEN 150.000000
        WHEN 3 THEN 200.000000
        ELSE (100.000000 + (member_m.current_level - 1) * 50.000000)
    END as amount_usdt,
    
    CASE member_m.current_level
        WHEN 1 THEN 100.00000000
        WHEN 2 THEN 150.00000000
        WHEN 3 THEN 200.00000000
        ELSE (100.00000000 + (member_m.current_level - 1) * 50.00000000)
    END as amount_bcc,
    
    'matrix_rebuild_' || imp.matrix_owner || '_from_' || imp.member_wallet as source_transaction_id,
    member_m.current_level as nft_level,
    false as is_claimed,
    NOW() as created_at

FROM individual_matrix_placements imp
LEFT JOIN members owner_m ON imp.matrix_owner = owner_m.wallet_address
LEFT JOIN members member_m ON imp.member_wallet = member_m.wallet_address
WHERE imp.is_active = true
  AND owner_m.current_level > 0  -- Only matrix owners who are active members
  AND member_m.current_level > 0  -- Only reward for active members
ORDER BY imp.matrix_owner, imp.layer_in_owner_matrix, imp.position_in_layer;

-- Step 4: Verification and reporting
DO $$
DECLARE
    reward_summary RECORD;
    matrix_comparison RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== CORRECTED LAYER REWARDS VERIFICATION ===';
    
    -- Overall reward summary
    SELECT 
        COUNT(*) as total_rewards,
        COUNT(DISTINCT recipient_wallet) as unique_recipients,
        SUM(amount_usdt) as total_usdt_rewards,
        COUNT(CASE WHEN reward_type = 'layer_reward' THEN 1 END) as claimable_rewards,
        COUNT(CASE WHEN reward_type = 'pending_layer_reward' THEN 1 END) as pending_rewards
    INTO reward_summary
    FROM layer_rewards;
    
    RAISE NOTICE 'Total rewards: %', reward_summary.total_rewards;
    RAISE NOTICE 'Unique recipients: %', reward_summary.unique_recipients;
    RAISE NOTICE 'Total USDT rewards: %', reward_summary.total_usdt_rewards;
    RAISE NOTICE 'Claimable rewards: %', reward_summary.claimable_rewards;
    RAISE NOTICE 'Pending rewards: %', reward_summary.pending_rewards;
    
    -- Matrix vs Rewards comparison
    FOR matrix_comparison IN
        SELECT 
            imp.matrix_owner,
            owner_u.username as owner_name,
            COUNT(DISTINCT imp.member_wallet) as matrix_members,
            COUNT(DISTINCT lr.payer_wallet) as reward_count,
            COALESCE(SUM(lr.amount_usdt), 0) as total_rewards_usdt
        FROM individual_matrix_placements imp
        LEFT JOIN users owner_u ON imp.matrix_owner = owner_u.wallet_address
        LEFT JOIN layer_rewards lr ON imp.matrix_owner = lr.recipient_wallet
                                  AND imp.member_wallet = lr.payer_wallet
        GROUP BY imp.matrix_owner, owner_u.username
        ORDER BY matrix_members DESC
    LOOP
        RAISE NOTICE 'Matrix Owner: % - Members: %, Rewards: %, Total USDT: %',
            matrix_comparison.owner_name,
            matrix_comparison.matrix_members,
            matrix_comparison.reward_count,
            matrix_comparison.total_rewards_usdt;
    END LOOP;
END $$;

-- Step 5: Display sample corrected rewards
SELECT '=== CORRECTED LAYER REWARDS SAMPLE ===' as section;

SELECT 
    lr.recipient_wallet,
    recipient_u.username as recipient_name,
    lr.payer_wallet,
    payer_u.username as payer_name,
    lr.layer,
    lr.reward_type,
    lr.amount_usdt,
    lr.amount_bcc,
    imp.position_in_layer
FROM layer_rewards lr
LEFT JOIN users recipient_u ON lr.recipient_wallet = recipient_u.wallet_address
LEFT JOIN users payer_u ON lr.payer_wallet = payer_u.wallet_address
LEFT JOIN individual_matrix_placements imp ON lr.recipient_wallet = imp.matrix_owner
                                           AND lr.payer_wallet = imp.member_wallet
ORDER BY lr.recipient_wallet, lr.layer, imp.position_in_layer
LIMIT 15;

COMMIT;

RAISE NOTICE '';
RAISE NOTICE '✅ Layer rewards corrected successfully!';
RAISE NOTICE 'Rewards now accurately reflect the referral-based matrix structure';
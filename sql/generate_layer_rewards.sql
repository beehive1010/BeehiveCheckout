-- Generate layer_rewards based on individual_matrix_placements and layer_rules
-- This creates rewards for matrix owners when their downline members activate NFT levels
-- Based on MarketingPlan.md: Layer Rewards = NFT price when downline member reaches a level

-- Step 1: Clear existing layer_rewards (optional - uncomment if needed)
-- DELETE FROM layer_rewards;

-- Step 2: Generate layer_rewards based on current matrix structure
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
-- Generate rewards for each matrix owner based on their downline structure
SELECT DISTINCT
    imp.matrix_owner as recipient_wallet,
    imp.member_wallet as payer_wallet,
    imp.layer_in_owner_matrix as layer,
    'layer_reward' as reward_type,
    
    -- Reward amount = NFT price for that level (from nft_levels table)
    CASE imp.layer_in_owner_matrix
        WHEN 1 THEN 100.000000  -- Layer 1 = Level 1 NFT price
        WHEN 2 THEN 150.000000  -- Layer 2 = Level 2 NFT price  
        WHEN 3 THEN 200.000000  -- Layer 3 = Level 3 NFT price
        ELSE (100.000000 + (imp.layer_in_owner_matrix - 1) * 50.000000)  -- +50 USDC per level
    END as amount_usdt,
    
    -- BCC reward matches USDC amount (from MarketingPlan.md)
    CASE imp.layer_in_owner_matrix
        WHEN 1 THEN 100.00000000
        WHEN 2 THEN 150.00000000
        WHEN 3 THEN 200.00000000
        ELSE ((100.00000000 + (imp.layer_in_owner_matrix - 1) * 50.00000000))
    END as amount_bcc,
    
    -- Source transaction ID (placeholder for now)
    'matrix_placement_' || imp.id::text as source_transaction_id,
    
    -- NFT level that triggers this reward
    imp.layer_in_owner_matrix as nft_level,
    
    -- Start as unclaimed (pending activation)
    false as is_claimed,
    
    -- Created at current time
    now() as created_at

FROM individual_matrix_placements imp
JOIN members m_recipient ON LOWER(m_recipient.wallet_address) = LOWER(imp.matrix_owner)
JOIN members m_payer ON LOWER(m_payer.wallet_address) = LOWER(imp.member_wallet)
WHERE imp.is_active = true
AND m_recipient.is_activated = true  -- Matrix owner must be activated
AND m_payer.is_activated = true     -- Downline member must be activated

-- Avoid duplicates
ON CONFLICT DO NOTHING;

-- Step 3: Apply special rules from layer_rules and MarketingPlan.md
DO $$
DECLARE
    reward_rec RECORD;
    owner_level INTEGER;
    direct_referrals_count INTEGER;
BEGIN
    RAISE NOTICE 'Applying special reward rules...';
    
    -- Apply Layer 1 special rule: 3rd Layer 1 reward requires root to upgrade to Level 2+
    FOR reward_rec IN 
        SELECT lr.id, lr.recipient_wallet, lr.layer
        FROM layer_rewards lr
        WHERE lr.layer = 1
        AND lr.is_claimed = false
    LOOP
        -- Check recipient's current level
        SELECT COALESCE(current_level, 0) INTO owner_level
        FROM members 
        WHERE wallet_address = reward_rec.recipient_wallet;
        
        -- Count direct referrals for Level 2 requirement
        SELECT COUNT(*) INTO direct_referrals_count
        FROM users u
        WHERE LOWER(u.referrer_wallet) = LOWER(reward_rec.recipient_wallet);
        
        -- Layer 1 (Right slot) special rule from MarketingPlan.md
        IF owner_level < 2 AND direct_referrals_count >= 3 THEN
            -- Mark as pending if owner needs to upgrade to Level 2
            UPDATE layer_rewards 
            SET 
                reward_type = 'pending_layer_reward',
                created_at = now() + interval '72 hours' -- 72 hour upgrade window
            WHERE id = reward_rec.id;
            
            RAISE NOTICE 'Applied Layer 1 special rule for recipient: %', 
                (SELECT username FROM users WHERE wallet_address = reward_rec.recipient_wallet);
        END IF;
    END LOOP;
    
    -- Apply Layer 2+ rules: Root must hold >= that level
    FOR reward_rec IN 
        SELECT lr.id, lr.recipient_wallet, lr.layer
        FROM layer_rewards lr
        WHERE lr.layer >= 2
        AND lr.is_claimed = false
    LOOP
        -- Check if owner has required level
        SELECT COALESCE(current_level, 0) INTO owner_level
        FROM members 
        WHERE wallet_address = reward_rec.recipient_wallet;
        
        IF owner_level < reward_rec.layer THEN
            -- Mark as pending if owner needs to upgrade
            UPDATE layer_rewards 
            SET 
                reward_type = 'pending_layer_reward',
                created_at = now() + interval '72 hours' -- 72 hour upgrade window
            WHERE id = reward_rec.id;
            
            RAISE NOTICE 'Applied Layer % rule - pending for recipient: %', 
                reward_rec.layer,
                (SELECT username FROM users WHERE wallet_address = reward_rec.recipient_wallet);
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Special reward rules applied successfully';
END $$;

-- Step 4: Create summary view for layer_rewards
CREATE OR REPLACE VIEW layer_rewards_summary AS
SELECT 
    lr.recipient_wallet,
    COALESCE(recipient_u.username, 'Unknown') as recipient_name,
    lr.layer,
    COUNT(*) as total_rewards,
    SUM(lr.amount_usdt) as total_usdt_rewards,
    SUM(lr.amount_bcc) as total_bcc_rewards,
    COUNT(*) FILTER (WHERE lr.is_claimed = true) as claimed_rewards,
    COUNT(*) FILTER (WHERE lr.is_claimed = false AND lr.reward_type = 'layer_reward') as claimable_rewards,
    COUNT(*) FILTER (WHERE lr.reward_type = 'pending_layer_reward') as pending_rewards,
    
    -- Current member status
    m.current_level as recipient_current_level,
    m.is_activated as recipient_is_activated,
    
    -- Next action needed
    CASE 
        WHEN COUNT(*) FILTER (WHERE lr.reward_type = 'pending_layer_reward') > 0 THEN 
            'Upgrade to Level ' || lr.layer || ' within 72 hours'
        WHEN COUNT(*) FILTER (WHERE lr.is_claimed = false AND lr.reward_type = 'layer_reward') > 0 THEN
            'Ready to claim rewards'
        ELSE 'All rewards processed'
    END as action_needed

FROM layer_rewards lr
LEFT JOIN users recipient_u ON LOWER(lr.recipient_wallet) = LOWER(recipient_u.wallet_address)
LEFT JOIN members m ON LOWER(lr.recipient_wallet) = LOWER(m.wallet_address)
GROUP BY lr.recipient_wallet, recipient_u.username, lr.layer, m.current_level, m.is_activated
ORDER BY recipient_u.username, lr.layer;

-- Step 5: Show results
SELECT 
    '=== LAYER REWARDS GENERATION SUMMARY ===' as section_title;

-- Show layer_rewards summary
SELECT 
    recipient_name,
    'Layer ' || layer as layer_info,
    total_rewards || ' rewards' as count,
    total_usdt_rewards || ' USDT' as usdt_total,
    total_bcc_rewards || ' BCC' as bcc_total,
    claimable_rewards as claimable,
    pending_rewards as pending,
    action_needed
FROM layer_rewards_summary
ORDER BY recipient_name, layer;

-- Show detailed breakdown
SELECT 
    '=== DETAILED LAYER REWARDS BREAKDOWN ===' as section_title;

SELECT 
    COALESCE(recipient_u.username, 'Unknown') as recipient,
    'Layer ' || lr.layer as layer,
    COALESCE(payer_u.username, SUBSTRING(lr.payer_wallet, 1, 10)) as payer,
    lr.amount_usdt || ' USDT' as reward_amount,
    lr.reward_type as status,
    CASE 
        WHEN lr.is_claimed THEN 'Claimed ✅'
        WHEN lr.reward_type = 'pending_layer_reward' THEN 'Pending upgrade ⏳'
        ELSE 'Ready to claim 💰'
    END as claim_status
FROM layer_rewards lr
LEFT JOIN users recipient_u ON LOWER(lr.recipient_wallet) = LOWER(recipient_u.wallet_address)
LEFT JOIN users payer_u ON LOWER(lr.payer_wallet) = LOWER(payer_u.wallet_address)
ORDER BY recipient_u.username, lr.layer, lr.created_at;

-- Final summary
DO $$
DECLARE
    total_rewards INTEGER;
    total_usdt NUMERIC;
    total_bcc NUMERIC;
    claimable_count INTEGER;
    pending_count INTEGER;
BEGIN
    SELECT 
        COUNT(*),
        SUM(amount_usdt),
        SUM(amount_bcc),
        COUNT(*) FILTER (WHERE is_claimed = false AND reward_type = 'layer_reward'),
        COUNT(*) FILTER (WHERE reward_type = 'pending_layer_reward')
    INTO total_rewards, total_usdt, total_bcc, claimable_count, pending_count
    FROM layer_rewards;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== LAYER REWARDS GENERATION COMPLETE ===';
    RAISE NOTICE 'Total rewards generated: %', total_rewards;
    RAISE NOTICE 'Total USDT value: % USDT', total_usdt;
    RAISE NOTICE 'Total BCC value: % BCC', total_bcc;
    RAISE NOTICE 'Ready to claim: %', claimable_count;
    RAISE NOTICE 'Pending upgrades: %', pending_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Layer rewards generated based on individual_matrix_placements!';
    RAISE NOTICE 'Rewards follow MarketingPlan.md rules:';
    RAISE NOTICE '- Layer 1: 100 USDT + 100 BCC per activation';
    RAISE NOTICE '- Layer 2: 150 USDT + 150 BCC per activation'; 
    RAISE NOTICE '- Layer 3: 200 USDT + 200 BCC per activation';
    RAISE NOTICE '- Special rules applied for pending rewards';
END $$;
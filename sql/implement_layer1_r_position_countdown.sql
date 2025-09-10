-- Implement Layer 1 R position special rule with 72-hour countdown
-- Based on MarketingPlan.md: Layer 1 (Right slot) Reward requires root to upgrade to Level 2+

-- Step 1: Update individual_matrix_placements with proper L/M/R positions
UPDATE individual_matrix_placements 
SET position_in_layer = subq.lmr_position
FROM (
    SELECT 
        id,
        CASE 
            WHEN ROW_NUMBER() OVER (PARTITION BY matrix_owner, layer_in_owner_matrix ORDER BY placed_at) = 1 THEN 'L'
            WHEN ROW_NUMBER() OVER (PARTITION BY matrix_owner, layer_in_owner_matrix ORDER BY placed_at) = 2 THEN 'M'  
            WHEN ROW_NUMBER() OVER (PARTITION BY matrix_owner, layer_in_owner_matrix ORDER BY placed_at) = 3 THEN 'R'
            ELSE NULL
        END as lmr_position
    FROM individual_matrix_placements
    WHERE is_active = true
) subq
WHERE individual_matrix_placements.id = subq.id
AND subq.lmr_position IS NOT NULL;

-- Step 2: Create function to handle Layer 1 R position special rule
CREATE OR REPLACE FUNCTION apply_layer1_r_position_rule()
RETURNS VOID AS $$
DECLARE
    r_position_rec RECORD;
    countdown_timer_id UUID;
    reward_id UUID;
BEGIN
    RAISE NOTICE 'Applying Layer 1 R position special rule (Level 2+ requirement)...';
    
    -- Find all Layer 1 R position rewards that need Level 2+ requirement
    FOR r_position_rec IN 
        SELECT 
            lr.id as reward_id,
            lr.recipient_wallet,
            lr.payer_wallet,
            COALESCE(owner_u.username, 'Unknown') as owner_name,
            COALESCE(payer_u.username, 'Unknown') as payer_name,
            owner_m.current_level as owner_current_level,
            imp.position_in_layer
        FROM layer_rewards lr
        JOIN individual_matrix_placements imp ON (
            LOWER(imp.matrix_owner) = LOWER(lr.recipient_wallet)
            AND LOWER(imp.member_wallet) = LOWER(lr.payer_wallet)
            AND imp.layer_in_owner_matrix = lr.layer
        )
        LEFT JOIN users owner_u ON LOWER(lr.recipient_wallet) = LOWER(owner_u.wallet_address)
        LEFT JOIN users payer_u ON LOWER(lr.payer_wallet) = LOWER(payer_u.wallet_address)
        LEFT JOIN members owner_m ON LOWER(lr.recipient_wallet) = LOWER(owner_m.wallet_address)
        WHERE lr.layer = 1
        AND imp.position_in_layer = 'R'  -- R position in Layer 1
        AND owner_m.current_level < 2    -- Owner doesn't have Level 2+
        AND lr.reward_type != 'pending_layer_reward'  -- Not already pending
    LOOP
        RAISE NOTICE 'Processing R position reward: % (Level %) <- % (R position)', 
            r_position_rec.owner_name,
            r_position_rec.owner_current_level,
            r_position_rec.payer_name;
        
        -- Update layer_reward to pending status
        UPDATE layer_rewards 
        SET 
            reward_type = 'pending_layer_reward',
            updated_at = now()
        WHERE id = r_position_rec.reward_id;
        
        -- Create countdown timer for 72 hours
        INSERT INTO countdown_timers (
            wallet_address,
            timer_type,
            title,
            description,
            start_time,
            end_time,
            is_active,
            auto_action,
            auto_action_data,
            metadata
        ) VALUES (
            r_position_rec.recipient_wallet,
            'layer_reward_upgrade',
            'Layer 1 R Position Reward Pending',
            'Upgrade to Level 2+ within 72 hours to claim ' || 
            (SELECT amount_usdt FROM layer_rewards WHERE id = r_position_rec.reward_id) || 
            ' USDC reward from ' || r_position_rec.payer_name,
            now(),
            now() + interval '72 hours',
            true,
            'rollup_reward',
            jsonb_build_object(
                'reward_id', r_position_rec.reward_id,
                'payer_wallet', r_position_rec.payer_wallet,
                'required_level', 2,
                'reward_amount', (SELECT amount_usdt FROM layer_rewards WHERE id = r_position_rec.reward_id)
            ),
            jsonb_build_object(
                'rule_type', 'layer_1_r_position',
                'special_requirement', 'Level 2+ needed for R position reward'
            )
        ) RETURNING id INTO countdown_timer_id;
        
        -- Update layer_reward with countdown reference
        UPDATE layer_rewards 
        SET 
            source_transaction_id = 'countdown_' || countdown_timer_id || '_' || source_transaction_id
        WHERE id = r_position_rec.reward_id;
        
        RAISE NOTICE '  ⏳ Created 72h countdown timer: %', countdown_timer_id;
    END LOOP;
    
    RAISE NOTICE 'Layer 1 R position rule applied successfully';
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create cron function to check expired countdowns
CREATE OR REPLACE FUNCTION process_expired_reward_countdowns()
RETURNS VOID AS $$
DECLARE
    expired_timer_rec RECORD;
    next_upline_wallet TEXT;
BEGIN
    RAISE NOTICE 'Processing expired reward countdowns...';
    
    -- Find expired countdown timers
    FOR expired_timer_rec IN 
        SELECT 
            ct.id as timer_id,
            ct.wallet_address,
            ct.auto_action_data,
            ct.end_time,
            COALESCE(u.username, 'Unknown') as username
        FROM countdown_timers ct
        LEFT JOIN users u ON LOWER(ct.wallet_address) = LOWER(u.wallet_address)
        WHERE ct.timer_type = 'layer_reward_upgrade'
        AND ct.is_active = true
        AND ct.end_time < now()
    LOOP
        RAISE NOTICE 'Processing expired countdown for: % (expired: %)', 
            expired_timer_rec.username, 
            expired_timer_rec.end_time;
        
        -- Check if user upgraded in time
        IF EXISTS (
            SELECT 1 FROM members m 
            WHERE LOWER(m.wallet_address) = LOWER(expired_timer_rec.wallet_address)
            AND m.current_level >= 2
        ) THEN
            -- User upgraded! Convert pending reward to claimable
            UPDATE layer_rewards 
            SET 
                reward_type = 'layer_reward',
                updated_at = now()
            WHERE id = (expired_timer_rec.auto_action_data->>'reward_id')::UUID;
            
            RAISE NOTICE '  ✅ User upgraded in time - reward is now claimable';
        ELSE
            -- User didn't upgrade - roll up reward to next qualified upline
            SELECT find_next_qualified_upline(
                expired_timer_rec.wallet_address,
                (expired_timer_rec.auto_action_data->>'required_level')::INTEGER
            ) INTO next_upline_wallet;
            
            IF next_upline_wallet IS NOT NULL THEN
                -- Roll up reward to qualified upline
                UPDATE layer_rewards 
                SET 
                    recipient_wallet = next_upline_wallet,
                    reward_type = 'rolled_up_reward',
                    updated_at = now(),
                    source_transaction_id = 'rollup_from_' || expired_timer_rec.wallet_address || '_' || source_transaction_id
                WHERE id = (expired_timer_rec.auto_action_data->>'reward_id')::UUID;
                
                RAISE NOTICE '  ⬆️ Reward rolled up to: %', 
                    (SELECT username FROM users WHERE wallet_address = next_upline_wallet);
                    
                -- Log the rollup
                INSERT INTO roll_up_rewards (
                    original_recipient,
                    final_recipient,
                    reward_amount,
                    reason,
                    created_at
                ) VALUES (
                    expired_timer_rec.wallet_address,
                    next_upline_wallet,
                    (expired_timer_rec.auto_action_data->>'reward_amount')::NUMERIC,
                    'Layer 1 R position - failed to upgrade to Level 2+ within 72 hours',
                    now()
                );
            ELSE
                -- No qualified upline found - reward is forfeited
                UPDATE layer_rewards 
                SET 
                    reward_type = 'forfeited_reward',
                    updated_at = now()
                WHERE id = (expired_timer_rec.auto_action_data->>'reward_id')::UUID;
                
                RAISE NOTICE '  ❌ No qualified upline - reward forfeited';
            END IF;
        END IF;
        
        -- Deactivate the countdown timer
        UPDATE countdown_timers 
        SET 
            is_active = false,
            completed_at = now()
        WHERE id = expired_timer_rec.timer_id;
    END LOOP;
    
    RAISE NOTICE 'Completed processing expired reward countdowns';
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create helper function to find next qualified upline
CREATE OR REPLACE FUNCTION find_next_qualified_upline(
    member_wallet TEXT,
    required_level INTEGER
) RETURNS TEXT AS $$
DECLARE
    upline_wallet TEXT;
BEGIN
    -- Find the next upline in referral chain who has required level
    WITH RECURSIVE upline_chain AS (
        -- Start with the member's referrer
        SELECT 
            u.referrer_wallet as wallet_address,
            1 as level_up
        FROM users u 
        WHERE LOWER(u.wallet_address) = LOWER(member_wallet)
        AND u.referrer_wallet IS NOT NULL
        
        UNION ALL
        
        -- Go up the referral chain
        SELECT 
            u.referrer_wallet as wallet_address,
            uc.level_up + 1
        FROM upline_chain uc
        JOIN users u ON LOWER(u.wallet_address) = LOWER(uc.wallet_address)
        WHERE u.referrer_wallet IS NOT NULL
        AND uc.level_up < 10  -- Prevent infinite loops
    )
    SELECT uc.wallet_address INTO upline_wallet
    FROM upline_chain uc
    JOIN members m ON LOWER(m.wallet_address) = LOWER(uc.wallet_address)
    WHERE m.current_level >= required_level
    ORDER BY uc.level_up
    LIMIT 1;
    
    RETURN upline_wallet;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create roll_up_rewards table if it doesn't exist
CREATE TABLE IF NOT EXISTS roll_up_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_recipient TEXT NOT NULL REFERENCES users(wallet_address),
    final_recipient TEXT NOT NULL REFERENCES users(wallet_address),
    reward_amount NUMERIC NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 6: Apply the Layer 1 R position rule
SELECT apply_layer1_r_position_rule();

-- Step 7: Show results
SELECT 
    '=== LAYER 1 R POSITION RULE APPLIED ===' as section_title;

-- Show pending rewards with countdowns
SELECT 
    COALESCE(owner_u.username, 'Unknown') as matrix_owner,
    COALESCE(payer_u.username, 'Unknown') as r_position_member,
    lr.amount_usdt || ' USDT' as reward_amount,
    lr.reward_type as status,
    ct.end_time as countdown_expires,
    EXTRACT(EPOCH FROM (ct.end_time - now()))/3600 as hours_remaining,
    'Must upgrade to Level 2+ to claim' as requirement
FROM layer_rewards lr
LEFT JOIN users owner_u ON LOWER(lr.recipient_wallet) = LOWER(owner_u.wallet_address)  
LEFT JOIN users payer_u ON LOWER(lr.payer_wallet) = LOWER(payer_u.wallet_address)
LEFT JOIN countdown_timers ct ON (
    LOWER(ct.wallet_address) = LOWER(lr.recipient_wallet)
    AND ct.timer_type = 'layer_reward_upgrade'
    AND ct.is_active = true
)
WHERE lr.reward_type = 'pending_layer_reward'
ORDER BY owner_u.username;

-- Show all current rewards status
SELECT 
    '=== ALL LAYER REWARDS STATUS ===' as section_title;

SELECT 
    COALESCE(owner_u.username, 'Unknown') as matrix_owner,
    COALESCE(payer_u.username, 'Unknown') as member,
    'Layer ' || lr.layer || ' (' || COALESCE(imp.position_in_layer, '?') || ')' as position,
    lr.amount_usdt || ' USDT' as reward,
    CASE lr.reward_type
        WHEN 'layer_reward' THEN '✅ Claimable'
        WHEN 'pending_layer_reward' THEN '⏳ Pending (72h to upgrade)'
        ELSE lr.reward_type
    END as status
FROM layer_rewards lr
LEFT JOIN users owner_u ON LOWER(lr.recipient_wallet) = LOWER(owner_u.wallet_address)
LEFT JOIN users payer_u ON LOWER(lr.payer_wallet) = LOWER(payer_u.wallet_address)
LEFT JOIN individual_matrix_placements imp ON (
    LOWER(imp.matrix_owner) = LOWER(lr.recipient_wallet)
    AND LOWER(imp.member_wallet) = LOWER(lr.payer_wallet)
    AND imp.layer_in_owner_matrix = lr.layer
)
ORDER BY owner_u.username, lr.layer, imp.position_in_layer;

-- Final summary
DO $$
DECLARE
    claimable_count INTEGER;
    pending_count INTEGER;
    total_pending_usdt NUMERIC;
BEGIN
    SELECT 
        COUNT(*) FILTER (WHERE reward_type = 'layer_reward'),
        COUNT(*) FILTER (WHERE reward_type = 'pending_layer_reward'),
        SUM(amount_usdt) FILTER (WHERE reward_type = 'pending_layer_reward')
    INTO claimable_count, pending_count, total_pending_usdt
    FROM layer_rewards;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== LAYER 1 R POSITION RULE SUMMARY ===';
    RAISE NOTICE 'Claimable rewards: %', claimable_count;
    RAISE NOTICE 'Pending rewards (72h countdown): %', pending_count;  
    RAISE NOTICE 'Total pending USDT: %', COALESCE(total_pending_usdt, 0);
    RAISE NOTICE '';
    RAISE NOTICE '⏰ Cron job setup needed:';
    RAISE NOTICE 'Run "SELECT process_expired_reward_countdowns();" every hour';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Layer 1 R position special rule implemented!';
    RAISE NOTICE 'Root must upgrade to Level 2+ within 72h to claim R position rewards.';
END $$;
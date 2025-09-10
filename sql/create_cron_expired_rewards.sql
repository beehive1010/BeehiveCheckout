-- Create cron job function to process expired rewards (72 hours)
-- Handle reward rollups when matrix parents don't upgrade in time

\echo '🔧 Creating cron function for expired reward processing...'

-- Step 1: Create function to process expired rewards
CREATE OR REPLACE FUNCTION process_expired_rewards()
RETURNS TABLE(
    processed_count INTEGER,
    rolled_up_count INTEGER,
    expired_count INTEGER,
    total_amount_processed NUMERIC
) 
LANGUAGE plpgsql AS $$
DECLARE
    processed_rewards INTEGER := 0;
    rolled_up_rewards INTEGER := 0;  
    expired_rewards INTEGER := 0;
    total_amount NUMERIC := 0;
    expired_claim RECORD;
    next_qualified_parent TEXT;
BEGIN
    -- Process all expired pending rewards
    FOR expired_claim IN
        SELECT 
            rc.id,
            rc.root_wallet,
            rc.triggering_member_wallet,
            rc.reward_amount_usdc,
            rc.layer,
            rc.nft_level,
            rc.metadata
        FROM reward_claims rc
        WHERE rc.status = 'pending' 
        AND rc.expires_at <= now()
        ORDER BY rc.created_at
    LOOP
        processed_rewards := processed_rewards + 1;
        total_amount := total_amount + expired_claim.reward_amount_usdc;
        
        -- Find next qualified upline (matrix parent's matrix parent, etc.)
        WITH RECURSIVE upline_search AS (
            -- Start with expired claim's matrix parent
            SELECT 
                r.matrix_parent as wallet,
                m.current_level,
                1 as level_up
            FROM referrals r
            JOIN members m ON r.matrix_parent = m.wallet_address
            WHERE r.member_wallet = expired_claim.root_wallet
            
            UNION ALL
            
            -- Go up the matrix tree
            SELECT 
                r.matrix_parent as wallet,
                m.current_level,
                us.level_up + 1
            FROM upline_search us
            JOIN referrals r ON r.member_wallet = us.wallet
            JOIN members m ON r.matrix_parent = m.wallet_address
            WHERE us.level_up < 10 -- Prevent infinite recursion
            AND us.wallet IS NOT NULL
        )
        SELECT wallet INTO next_qualified_parent
        FROM upline_search
        WHERE current_level >= expired_claim.nft_level
        AND wallet IS NOT NULL
        ORDER BY level_up
        LIMIT 1;
        
        IF next_qualified_parent IS NOT NULL THEN
            -- Roll up to next qualified upline
            UPDATE reward_claims 
            SET 
                status = 'rolled_up',
                rolled_up_at = now(),
                rolled_up_to_wallet = next_qualified_parent,
                metadata = metadata || jsonb_build_object(
                    'rollup_reason', 'Original recipient failed to upgrade within 72 hours',
                    'original_recipient', expired_claim.root_wallet,
                    'rollup_level', (
                        SELECT level_up 
                        FROM (
                            WITH RECURSIVE upline_search AS (
                                SELECT r.matrix_parent as wallet, 1 as level_up
                                FROM referrals r
                                WHERE r.member_wallet = expired_claim.root_wallet
                                UNION ALL
                                SELECT r.matrix_parent as wallet, us.level_up + 1
                                FROM upline_search us
                                JOIN referrals r ON r.member_wallet = us.wallet
                                WHERE us.level_up < 10
                            )
                            SELECT level_up, wallet FROM upline_search WHERE wallet = next_qualified_parent
                        ) sub LIMIT 1
                    )
                )
            WHERE id = expired_claim.id;
            
            -- Create new claimable reward for the rollup recipient
            INSERT INTO reward_claims (
                root_wallet,
                triggering_member_wallet,
                layer,
                nft_level,
                reward_amount_usdc,
                status,
                expires_at,
                metadata
            ) VALUES (
                next_qualified_parent,
                expired_claim.triggering_member_wallet,
                expired_claim.layer,
                expired_claim.nft_level,
                expired_claim.reward_amount_usdc,
                'claimable',
                now() + INTERVAL '72 hours', -- Another 72 hours for new recipient
                expired_claim.metadata || jsonb_build_object(
                    'rolled_up_from', expired_claim.root_wallet,
                    'rollup_processed_at', now()
                )
            );
            
            rolled_up_rewards := rolled_up_rewards + 1;
            
            RAISE NOTICE 'Rolled up % USDC from % to %', 
                         expired_claim.reward_amount_usdc, 
                         expired_claim.root_wallet, 
                         next_qualified_parent;
        ELSE
            -- No qualified upline found, mark as expired (lost reward)
            UPDATE reward_claims 
            SET 
                status = 'expired',
                metadata = metadata || jsonb_build_object(
                    'expiry_reason', 'No qualified upline found for rollup'
                )
            WHERE id = expired_claim.id;
            
            expired_rewards := expired_rewards + 1;
            
            RAISE NOTICE 'Expired % USDC reward - no qualified upline found', 
                         expired_claim.reward_amount_usdc;
        END IF;
    END LOOP;
    
    -- Update user reward balances
    UPDATE user_reward_balances 
    SET 
        usdc_claimable = COALESCE((
            SELECT SUM(reward_amount_usdc) 
            FROM reward_claims 
            WHERE root_wallet = user_reward_balances.wallet_address 
            AND status = 'claimable'
        ), 0),
        usdc_pending = COALESCE((
            SELECT SUM(reward_amount_usdc) 
            FROM reward_claims 
            WHERE root_wallet = user_reward_balances.wallet_address 
            AND status = 'pending'
        ), 0);
    
    -- Return summary
    processed_count := processed_rewards;
    rolled_up_count := rolled_up_rewards;
    expired_count := expired_rewards;
    total_amount_processed := total_amount;
    
    RETURN NEXT;
END;
$$;

\echo '✅ Created process_expired_rewards() function'

-- Step 2: Test the function with current data
\echo ''
\echo '📊 Testing expired rewards processing (no expired rewards yet):'
SELECT * FROM process_expired_rewards();

-- Step 3: Show current pending rewards that will expire
\echo ''
\echo '📊 Current pending rewards (will expire in 72 hours):'
SELECT 
    u.username as recipient,
    tu.username as triggering_member,
    rc.reward_amount_usdc,
    rc.expires_at,
    EXTRACT(EPOCH FROM (rc.expires_at - now()))/3600 as hours_remaining,
    rc.metadata->>'reward_rule' as rule
FROM reward_claims rc
JOIN users u ON rc.root_wallet = u.wallet_address
JOIN users tu ON rc.triggering_member_wallet = tu.wallet_address
WHERE rc.status = 'pending'
ORDER BY rc.expires_at;

\echo ''
\echo '✅ Cron function created for expired rewards processing!'
\echo 'Usage:'
\echo '  - Run SELECT * FROM process_expired_rewards(); every hour via cron'
\echo '  - Handles 72-hour expiry and rollup to qualified uplines'
\echo '  - Updates user_reward_balances automatically'
\echo ''
\echo '📊 Current reward status summary:'
SELECT 
    status,
    COUNT(*) as count,
    SUM(reward_amount_usdc) as total_usdc
FROM reward_claims
GROUP BY status
ORDER BY status;
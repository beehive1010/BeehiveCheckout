-- Execute cleanup via PostgreSQL function
CREATE OR REPLACE FUNCTION cleanup_database_preserve_root()
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    -- Log start
    RAISE NOTICE '🧹 Starting database cleanup - preserving only root user';
    
    -- Delete in correct order to handle foreign key constraints
    
    -- 1. countdown_timers
    DELETE FROM countdown_timers 
    WHERE wallet_address != '0x0000000000000000000000000000000000000001';
    
    -- 2. reward_claims  
    DELETE FROM reward_claims 
    WHERE triggering_member_wallet != '0x0000000000000000000000000000000000000001';
    
    -- 3. user_balances
    DELETE FROM user_balances 
    WHERE wallet_address != '0x0000000000000000000000000000000000000001';
    
    -- 4. layer_rewards
    DELETE FROM layer_rewards 
    WHERE recipient_wallet != '0x0000000000000000000000000000000000000001'
       OR payer_wallet != '0x0000000000000000000000000000000000000001';
    
    -- 5. individual_matrix_placements
    DELETE FROM individual_matrix_placements 
    WHERE matrix_owner != '0x0000000000000000000000000000000000000001'
       OR member_wallet != '0x0000000000000000000000000000000000000001';
    
    -- 6. referrals
    DELETE FROM referrals 
    WHERE referred_wallet != '0x0000000000000000000000000000000000000001';
    
    -- 7. membership
    DELETE FROM membership 
    WHERE wallet_address != '0x0000000000000000000000000000000000000001';
    
    -- 8. platform_fees
    DELETE FROM platform_fees 
    WHERE payer_wallet != '0x0000000000000000000000000000000000000001';
    
    -- 9. bcc_transactions
    DELETE FROM bcc_transactions 
    WHERE wallet_address != '0x0000000000000000000000000000000000000001';
    
    -- 10. members
    DELETE FROM members 
    WHERE wallet_address != '0x0000000000000000000000000000000000000001';
    
    -- 11. users
    DELETE FROM users 
    WHERE wallet_address != '0x0000000000000000000000000000000000000001';
    
    -- Return result
    SELECT json_build_object(
        'success', true,
        'message', '🧹 Database cleanup completed - only root user preserved',
        'users_remaining', (SELECT count(*) FROM users),
        'members_remaining', (SELECT count(*) FROM members),
        'referrals_remaining', (SELECT count(*) FROM referrals)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
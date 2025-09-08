-- Create missing functions for edge function support
-- These functions are referenced in database.types.ts

BEGIN;

-- Create get_current_activation_tier function
CREATE OR REPLACE FUNCTION get_current_activation_tier()
RETURNS TABLE(
    tier INTEGER,
    tier_name VARCHAR,
    current_activations BIGINT,
    bcc_multiplier NUMERIC,
    next_milestone INTEGER
) AS $$
DECLARE
    activation_count BIGINT;
    current_tier_info RECORD;
BEGIN
    -- Get current activation count
    SELECT COUNT(*) INTO activation_count 
    FROM membership 
    WHERE activated_at IS NOT NULL;
    
    -- Determine current tier based on activation count
    SELECT t.tier, t.tier_name, t.base_bcc_locked, t.unlock_per_level, t.max_activation_rank
    INTO current_tier_info
    FROM member_activation_tiers t
    WHERE t.min_activation_rank <= activation_count 
    AND t.max_activation_rank >= activation_count
    AND t.is_active = TRUE
    ORDER BY t.tier DESC
    LIMIT 1;
    
    -- If no tier found, create a default one
    IF current_tier_info IS NULL THEN
        RETURN QUERY SELECT 
            1 as tier,
            'Tier 1 - Early Adopters'::VARCHAR as tier_name,
            activation_count as current_activations,
            100.0::NUMERIC as bcc_multiplier,
            10000 as next_milestone;
        RETURN;
    END IF;
    
    -- Get next milestone (next tier's min_activation_rank)
    DECLARE
        next_milestone_val INTEGER;
    BEGIN
        SELECT min_activation_rank INTO next_milestone_val
        FROM member_activation_tiers
        WHERE tier > current_tier_info.tier
        AND is_active = TRUE
        ORDER BY tier ASC
        LIMIT 1;
        
        -- If no next tier, use a large number
        IF next_milestone_val IS NULL THEN
            next_milestone_val := current_tier_info.max_activation_rank + 1000000;
        END IF;
        
        RETURN QUERY SELECT 
            current_tier_info.tier,
            current_tier_info.tier_name::VARCHAR,
            activation_count,
            (current_tier_info.unlock_per_level / 100.0)::NUMERIC as bcc_multiplier,
            next_milestone_val;
    END;
END;
$$ LANGUAGE plpgsql;

-- Create user_balance_summary view if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'user_balance_summary' 
        AND table_schema = 'public'
    ) THEN
        EXECUTE '
        CREATE VIEW user_balance_summary AS
        SELECT 
            ub.wallet_address,
            u.username,
            ub.bcc_locked,
            ub.bcc_total_initial,
            ub.bcc_transferable,
            (ub.bcc_locked + ub.bcc_transferable) as bcc_current_total,
            ub.usdc_claimable,
            ub.usdc_pending,
            ub.usdc_claimed_total,
            (ub.usdc_claimable + ub.usdc_pending) as usdc_total_available,
            ub.current_tier,
            ub.tier_multiplier,
            mat.tier_name,
            ub.created_at,
            ub.updated_at,
            
            -- Member status
            CASE 
                WHEN m.activation_rank IS NOT NULL THEN ''activated_member''
                WHEN mem.activated_at IS NOT NULL THEN ''membership_activated''
                ELSE ''balance_only''
            END as member_status
            
        FROM user_balances ub
        LEFT JOIN users u ON ub.wallet_address = u.wallet_address
        LEFT JOIN members m ON ub.wallet_address = m.wallet_address
        LEFT JOIN membership mem ON ub.wallet_address = mem.wallet_address
        LEFT JOIN member_activation_tiers mat ON ub.current_tier = mat.tier';
        
        RAISE NOTICE 'Created user_balance_summary view';
    ELSE
        RAISE NOTICE 'user_balance_summary view already exists';
    END IF;
END
$$;

-- Create user_complete_info view if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'user_complete_info' 
        AND table_schema = 'public'
    ) THEN
        EXECUTE '
        CREATE VIEW user_complete_info AS
        SELECT 
            u.wallet_address,
            u.email,
            u.username,
            u.pre_referrer,
            u.role,
            u.created_at as registered_at,
            
            -- Admin info
            a.admin_level,
            a.permissions as admin_permissions,
            a.is_active as admin_active,
            
            -- Member info
            CASE WHEN mem.activation_rank IS NOT NULL THEN TRUE ELSE FALSE END as is_member,
            mem.current_level as member_level,
            mem.activation_rank,
            
            -- Activation status info
            m.claim_status,
            m.activated_at,
            m.activation_tier,
            m.bcc_locked_amount,
            
            -- BCC balance info
            ub.bcc_transferable,
            ub.bcc_locked,
            (ub.bcc_transferable + ub.bcc_locked) as total_bcc,
            
            -- Overall status
            CASE 
                WHEN mem.activation_rank IS NOT NULL THEN ''active_member''
                WHEN m.activated_at IS NOT NULL THEN ''activated_pending''  
                WHEN m.claimed_at IS NOT NULL THEN ''claimed_pending''
                WHEN m.wallet_address IS NOT NULL THEN ''membership_initiated''
                WHEN u.role = ''admin'' THEN ''admin''
                ELSE ''registered_user''
            END as overall_status
            
        FROM users u
        LEFT JOIN admins a ON u.wallet_address = a.wallet_address
        LEFT JOIN members mem ON u.wallet_address = mem.wallet_address  
        LEFT JOIN membership m ON u.wallet_address = m.wallet_address
        LEFT JOIN user_balances ub ON u.wallet_address = ub.wallet_address';
        
        RAISE NOTICE 'Created user_complete_info view';
    ELSE
        RAISE NOTICE 'user_complete_info view already exists';
    END IF;
END
$$;

-- Test the functions
SELECT 'Testing get_current_activation_tier...' as test;
SELECT * FROM get_current_activation_tier();

SELECT 'Testing user_balance_summary view...' as test;
SELECT COUNT(*) as record_count FROM user_balance_summary;

SELECT 'Testing user_complete_info view...' as test;
SELECT COUNT(*) as record_count FROM user_complete_info;

COMMIT;

SELECT '✅ Missing functions and views created successfully!' as status;
-- Create correct views that work with current database structure
-- Fix all column reference issues

BEGIN;

-- First, let's create the get_current_activation_tier function (standalone)
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

-- Create user_balance_summary view that works with current structure
DROP VIEW IF EXISTS user_balance_summary CASCADE;
CREATE VIEW user_balance_summary AS
SELECT 
    ub.wallet_address,
    u.username,
    ub.bcc_locked::NUMERIC as bcc_locked,
    (ub.bcc_locked + ub.bcc_transferable + COALESCE(ub.bcc_restricted, 0))::NUMERIC as bcc_total_initial,
    ub.bcc_transferable::NUMERIC as bcc_transferable,
    (ub.bcc_locked + ub.bcc_transferable)::NUMERIC as bcc_current_total,
    COALESCE(ub.available_usdt_rewards, 0)::NUMERIC as usdc_claimable,
    COALESCE(ub.pending_upgrade_rewards, 0)::NUMERIC as usdc_pending,
    COALESCE(ub.rewards_claimed, 0)::NUMERIC as usdc_claimed_total,
    (COALESCE(ub.available_usdt_rewards, 0) + COALESCE(ub.pending_upgrade_rewards, 0))::NUMERIC as usdc_total_available,
    ub.activation_tier as current_tier,
    NULL::NUMERIC as tier_multiplier,
    mat.tier_name,
    ub.created_at,
    ub.updated_at,
    
    -- Member status
    CASE 
        WHEN mem.activation_rank IS NOT NULL THEN 'activated_member'
        WHEN m.activated_at IS NOT NULL THEN 'membership_activated'
        ELSE 'balance_only'
    END as member_status
    
FROM user_balances ub
LEFT JOIN users u ON ub.wallet_address = u.wallet_address
LEFT JOIN members mem ON ub.wallet_address = mem.wallet_address
LEFT JOIN membership m ON ub.wallet_address = m.wallet_address
LEFT JOIN member_activation_tiers mat ON ub.activation_tier = mat.tier;

-- Create user_complete_info view that works with current structure
DROP VIEW IF EXISTS user_complete_info CASCADE;
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
    
    -- BCC balance info (using current table structure)
    ub.bcc_transferable::NUMERIC as bcc_transferable,
    ub.bcc_locked::NUMERIC as bcc_locked,
    (ub.bcc_transferable + ub.bcc_locked)::NUMERIC as total_bcc,
    
    -- Overall status
    CASE 
        WHEN mem.activation_rank IS NOT NULL THEN 'active_member'
        WHEN m.activated_at IS NOT NULL THEN 'activated_pending'  
        WHEN m.claimed_at IS NOT NULL THEN 'claimed_pending'
        WHEN m.wallet_address IS NOT NULL THEN 'membership_initiated'
        WHEN u.role = 'admin' THEN 'admin'
        ELSE 'registered_user'
    END as overall_status
    
FROM users u
LEFT JOIN admins a ON u.wallet_address = a.wallet_address
LEFT JOIN members mem ON u.wallet_address = mem.wallet_address  
LEFT JOIN membership m ON u.wallet_address = m.wallet_address
LEFT JOIN user_balances ub ON u.wallet_address = ub.wallet_address;

-- Create member_status_detail view for edge functions
DROP VIEW IF EXISTS member_status_detail CASCADE;
CREATE VIEW member_status_detail AS
SELECT 
    u.wallet_address,
    u.username,
    u.email,
    
    -- Member activation status
    mem.activation_rank,
    mem.current_level,
    mem.has_pending_rewards,
    mem.levels_owned,
    mem.referrer_wallet,
    
    -- Membership NFT status
    m.claim_status,
    m.activated_at,
    m.nft_level,
    m.activation_tier,
    
    -- Balance summary
    ub.bcc_transferable,
    ub.bcc_locked,
    COALESCE(ub.available_usdt_rewards, 0) as usdc_claimable,
    COALESCE(ub.pending_upgrade_rewards, 0) as usdc_pending,
    
    -- Referral statistics
    (SELECT COUNT(*) FROM referrals r WHERE r.referrer_wallet = u.wallet_address) as direct_referrals,
    
    -- Overall member status
    CASE 
        WHEN mem.activation_rank IS NOT NULL THEN 'active_member'
        WHEN m.activated_at IS NOT NULL THEN 'nft_activated'
        WHEN m.claim_status = 'claimed' THEN 'nft_claimed'
        WHEN m.wallet_address IS NOT NULL THEN 'membership_initiated'
        ELSE 'user_only'
    END as member_status
    
FROM users u
LEFT JOIN members mem ON u.wallet_address = mem.wallet_address
LEFT JOIN membership m ON u.wallet_address = m.wallet_address
LEFT JOIN user_balances ub ON u.wallet_address = ub.wallet_address;

-- Create member_matrix_status view for matrix operations
DROP VIEW IF EXISTS member_matrix_status CASCADE;
CREATE VIEW member_matrix_status AS
SELECT 
    u.wallet_address,
    u.username,
    mem.current_level,
    mem.activation_rank,
    
    -- Matrix placement info
    r.placement_root,
    r.placement_layer,
    r.placement_position,
    r.referrer_wallet,
    r.referred_at,
    
    -- Matrix root info  
    root_u.username as root_username,
    referrer_u.username as referrer_username,
    
    -- Matrix statistics as root
    (SELECT COUNT(*) FROM referrals r2 WHERE r2.placement_root = u.wallet_address) as team_size_as_root,
    (SELECT COUNT(*) FROM referrals r2 WHERE r2.referrer_wallet = u.wallet_address) as direct_referrals,
    
    -- Matrix status
    CASE 
        WHEN r.placement_root IS NOT NULL THEN 'placed_in_matrix'
        WHEN mem.activation_rank IS NOT NULL THEN 'awaiting_placement'
        ELSE 'not_eligible'
    END as matrix_status
    
FROM users u
LEFT JOIN members mem ON u.wallet_address = mem.wallet_address
LEFT JOIN referrals r ON u.wallet_address = r.referred_wallet
LEFT JOIN users root_u ON r.placement_root = root_u.wallet_address
LEFT JOIN users referrer_u ON r.referrer_wallet = referrer_u.wallet_address;

-- Test all the views and functions
SELECT 'Testing get_current_activation_tier function...' as test;
SELECT * FROM get_current_activation_tier();

SELECT 'Testing user_balance_summary view...' as test;
SELECT COUNT(*) as record_count FROM user_balance_summary;

SELECT 'Testing user_complete_info view...' as test;
SELECT COUNT(*) as record_count FROM user_complete_info;

SELECT 'Testing member_status_detail view...' as test;
SELECT COUNT(*) as record_count FROM member_status_detail;

SELECT 'Testing member_matrix_status view...' as test;
SELECT COUNT(*) as record_count FROM member_matrix_status;

COMMIT;

SELECT '✅ All views and functions created successfully and tested!' as final_status;
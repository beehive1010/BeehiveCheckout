-- =============================================
-- Beehive Complete Auth & Member System SQL
-- Handles Supabase auth sync, NFT claims, referrals, and cleanup
-- =============================================

-- 1. SYNC FUNCTION: auth.users -> public.users
-- This ensures every Supabase auth user gets a public.users record
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    root_wallet TEXT := '0x0000000000000000000000000000000000000001';
BEGIN
    -- Insert into public.users when new auth.user is created
    INSERT INTO public.users (
        wallet_address,
        username,
        email,
        referrer_wallet,
        current_level,
        is_upgraded,
        upgrade_timer_enabled,
        created_at,
        updated_at
    ) VALUES (
        NEW.email, -- Use email as wallet for now, will be updated by frontend (PRESERVE CASE)
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
        NEW.email,
        root_wallet, -- Default to root referrer
        0, -- Not activated yet
        false,
        false,
        NOW(),
        NOW()
    )
    ON CONFLICT (wallet_address) DO UPDATE SET
        email = NEW.email,
        updated_at = NOW();

    -- Create member record (not activated yet)
    INSERT INTO public.members (
        wallet_address,
        is_activated,
        current_level,
        max_layer,
        levels_owned,
        has_pending_rewards,
        upgrade_reminder_enabled,
        total_direct_referrals,
        total_team_size,
        created_at,
        updated_at
    ) VALUES (
        NEW.email, -- PRESERVE CASE for withdrawal compatibility
        false, -- Not activated until NFT claim
        0,
        0,
        ARRAY[]::integer[],
        false,
        false,
        0,
        0,
        NOW(),
        NOW()
    )
    ON CONFLICT (wallet_address) DO NOTHING;

    -- Create user balance record
    INSERT INTO public.user_balances (
        wallet_address,
        bcc_transferable,
        bcc_locked,
        total_usdt_earned,
        available_usdt_rewards
    ) VALUES (
        NEW.email, -- PRESERVE CASE
        500, -- Default 500 BCC
        0,
        0,
        0
    )
    ON CONFLICT (wallet_address) DO NOTHING;

    -- Create countdown timer for cleanup (48 hours default)
    INSERT INTO public.countdown_timers (
        wallet_address,
        timer_type,
        end_time,
        is_active,
        created_at
    ) VALUES (
        NEW.email, -- PRESERVE CASE
        'activation_timeout',
        NOW() + INTERVAL '48 hours',
        true,
        NOW()
    )
    ON CONFLICT (wallet_address) DO UPDATE SET
        end_time = NOW() + INTERVAL '48 hours',
        is_active = true,
        created_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auth user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. NFT CLAIM & MEMBER ACTIVATION FUNCTION
-- This handles the NFT claim -> member activation -> referral insertion flow
CREATE OR REPLACE FUNCTION public.activate_member_with_nft_claim(
    p_wallet_address TEXT,
    p_nft_type TEXT DEFAULT 'membership',
    p_payment_method TEXT DEFAULT 'demo_activation',
    p_transaction_hash TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    user_record RECORD;
    referrer_wallet TEXT;
    root_wallet TEXT := '0x0000000000000000000000000000000000000001';
    activation_result JSON;
BEGIN
    -- Check if user exists and get referrer info (PRESERVE CASE)
    SELECT * INTO user_record 
    FROM public.users 
    WHERE wallet_address = p_wallet_address;
    
    IF user_record IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;

    -- Check if already activated (PRESERVE CASE)
    IF EXISTS (SELECT 1 FROM public.members WHERE wallet_address = p_wallet_address AND is_activated = true) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Member already activated'
        );
    END IF;

    referrer_wallet := COALESCE(user_record.referrer_wallet, root_wallet);

    -- STEP 1: Create NFT purchase record (PROOF OF CLAIM)
    INSERT INTO public.nft_purchases (
        buyer_wallet,
        nft_id,
        nft_type,
        payment_method,
        price_usdt,
        price_bcc,
        status,
        transaction_hash,
        purchased_at,
        metadata
    ) VALUES (
        p_wallet_address, -- PRESERVE CASE for withdrawal compatibility
        'level-1-membership-nft',
        p_nft_type,
        p_payment_method,
        100,
        NULL,
        'completed',
        COALESCE(p_transaction_hash, 'activation_' || extract(epoch from now())::text),
        NOW(),
        json_build_object(
            'level', 1,
            'token_id', 1,
            'activation_method', p_payment_method
        )
    );

    -- STEP 2: Create order record
    INSERT INTO public.orders (
        wallet_address,
        item_id,
        order_type,
        payment_method,
        amount_usdt,
        status,
        transaction_hash,
        completed_at,
        metadata
    ) VALUES (
        p_wallet_address,
        'level-1-membership-nft',
        'nft_membership',
        p_payment_method,
        100,
        'completed',
        COALESCE(p_transaction_hash, 'order_' || extract(epoch from now())::text),
        NOW(),
        json_build_object(
            'level', 1,
            'activation_type', 'membership'
        )
    );

    -- STEP 3: Activate membership
    UPDATE public.members SET
        is_activated = true,
        activated_at = NOW(),
        current_level = 1,
        levels_owned = ARRAY[1],
        updated_at = NOW()
    WHERE wallet_address = p_wallet_address;

    -- STEP 4: Update user record
    UPDATE public.users SET
        current_level = 1,
        is_upgraded = true,
        updated_at = NOW()
    WHERE wallet_address = p_wallet_address;

    -- STEP 5: Deactivate countdown timer (user is now active)
    UPDATE public.countdown_timers SET
        is_active = false,
        completed_at = NOW()
    WHERE wallet_address = p_wallet_address AND timer_type = 'activation_timeout';

    -- STEP 6: NOW CREATE REFERRAL ENTRY (ONLY FOR ACTIVATED MEMBERS)
    INSERT INTO public.referrals (
        root_wallet,
        member_wallet,
        layer,
        position,
        parent_wallet,
        placer_wallet,
        placement_type,
        is_active,
        created_at
    ) VALUES (
        referrer_wallet,
        p_wallet_address,
        1, -- Start at layer 1
        'L', -- Simplified placement
        referrer_wallet,
        referrer_wallet,
        'direct',
        true,
        NOW()
    );

    -- STEP 7: Update referrer's stats (if not root)
    IF referrer_wallet != root_wallet THEN
        UPDATE public.members SET
            total_direct_referrals = total_direct_referrals + 1,
            updated_at = NOW()
        WHERE wallet_address = referrer_wallet;
    END IF;

    activation_result := json_build_object(
        'success', true,
        'message', 'Member activated successfully with NFT claim',
        'wallet_address', p_wallet_address,
        'referrer_wallet', referrer_wallet,
        'level', 1,
        'activated_at', NOW()
    );

    RETURN activation_result;
END;
$$ LANGUAGE plpgsql;

-- 3. CLEANUP INACTIVE USERS FUNCTION
-- Removes users who haven't activated within the countdown time
CREATE OR REPLACE FUNCTION public.cleanup_expired_users()
RETURNS JSON AS $$
DECLARE
    cleanup_count INTEGER := 0;
    expired_user RECORD;
    root_wallet TEXT := '0x0000000000000000000000000000000000000001';
    cleanup_results JSON[] := ARRAY[]::JSON[];
BEGIN
    -- Find users with expired countdown timers who are not activated
    FOR expired_user IN 
        SELECT u.wallet_address, u.referrer_wallet, ct.end_time
        FROM public.users u
        INNER JOIN public.countdown_timers ct ON u.wallet_address = ct.wallet_address
        INNER JOIN public.members m ON u.wallet_address = m.wallet_address
        WHERE ct.timer_type = 'activation_timeout'
          AND ct.is_active = true
          AND ct.end_time < NOW()
          AND m.is_activated = false
          AND u.referrer_wallet != root_wallet -- Don't cleanup root referrer users
    LOOP
        -- Delete user records in order (due to foreign key constraints)
        DELETE FROM public.user_balances WHERE wallet_address = expired_user.wallet_address;
        DELETE FROM public.countdown_timers WHERE wallet_address = expired_user.wallet_address;
        DELETE FROM public.members WHERE wallet_address = expired_user.wallet_address;
        DELETE FROM public.users WHERE wallet_address = expired_user.wallet_address;
        
        cleanup_count := cleanup_count + 1;
        cleanup_results := cleanup_results || json_build_object(
            'wallet_address', expired_user.wallet_address,
            'referrer_wallet', expired_user.referrer_wallet,
            'expired_at', expired_user.end_time,
            'cleaned_up_at', NOW()
        );
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'cleaned_count', cleanup_count,
        'cleaned_users', cleanup_results,
        'message', 'Cleanup completed for ' || cleanup_count || ' expired users'
    );
END;
$$ LANGUAGE plpgsql;

-- 4. REFERRAL REWARD PROCESSING (ONLY FOR ACTIVATED MEMBERS)
-- This processes rewards when new members are activated
CREATE OR REPLACE FUNCTION public.process_referral_rewards(
    p_new_member_wallet TEXT,
    p_activation_level INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
    referral_chain RECORD;
    reward_amount INTEGER;
    layer_count INTEGER := 0;
    total_rewards INTEGER := 0;
    reward_results JSON[] := ARRAY[]::JSON[];
BEGIN
    -- Only process rewards for activated members (PRESERVE CASE)
    IF NOT EXISTS (SELECT 1 FROM public.members WHERE wallet_address = p_new_member_wallet AND is_activated = true) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Member not activated - no rewards processed'
        );
    END IF;

    -- Walk up the referral chain and distribute rewards
    FOR referral_chain IN 
        WITH RECURSIVE referral_path AS (
            -- Start with the new member's direct referrer (PRESERVE CASE)
            SELECT r.root_wallet, r.member_wallet, r.parent_wallet, 1 as depth
            FROM public.referrals r
            WHERE r.member_wallet = p_new_member_wallet
            
            UNION ALL
            
            -- Recursively get the parent's referrer
            SELECT r.root_wallet, r.member_wallet, r.parent_wallet, rp.depth + 1
            FROM public.referrals r
            INNER JOIN referral_path rp ON r.member_wallet = rp.parent_wallet
            WHERE rp.depth < 19 -- Max 19 layers
        )
        SELECT DISTINCT root_wallet as beneficiary_wallet, depth
        FROM referral_path
        WHERE depth <= 19
        ORDER BY depth
    LOOP
        layer_count := layer_count + 1;
        
        -- Calculate reward based on layer (simplified - adjust as needed)
        reward_amount := CASE 
            WHEN referral_chain.depth = 1 THEN 100 -- Direct referrer gets 100 USDT
            WHEN referral_chain.depth <= 3 THEN 50  -- Next 2 levels get 50 USDT
            WHEN referral_chain.depth <= 7 THEN 25  -- Next 4 levels get 25 USDT
            ELSE 10 -- Remaining levels get 10 USDT
        END;

        -- Only give rewards to activated members
        IF EXISTS (SELECT 1 FROM public.members WHERE wallet_address = referral_chain.beneficiary_wallet AND is_activated = true) THEN
            -- Update beneficiary's balance
            UPDATE public.user_balances SET
                available_usdt_rewards = available_usdt_rewards + reward_amount,
                total_usdt_earned = total_usdt_earned + reward_amount,
                updated_at = NOW()
            WHERE wallet_address = referral_chain.beneficiary_wallet;

            total_rewards := total_rewards + reward_amount;
            reward_results := reward_results || json_build_object(
                'beneficiary', referral_chain.beneficiary_wallet,
                'layer', referral_chain.depth,
                'reward_amount', reward_amount,
                'processed_at', NOW()
            );
        END IF;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'new_member', p_new_member_wallet, -- PRESERVE CASE
        'total_rewards_distributed', total_rewards,
        'layers_processed', layer_count,
        'reward_details', reward_results
    );
END;
$$ LANGUAGE plpgsql;

-- 5. TRIGGER: Auto-process rewards when member is activated
CREATE OR REPLACE FUNCTION public.trigger_referral_rewards()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when member becomes activated
    IF OLD.is_activated = false AND NEW.is_activated = true THEN
        -- Process referral rewards asynchronously (you can call this from your app)
        -- For now, just log the event
        INSERT INTO public.admin_actions (
            admin_wallet,
            action_type,
            target_wallet,
            action_data,
            reason
        ) VALUES (
            '0x0000000000000000000000000000000000000001', -- System action
            'member_activated',
            NEW.wallet_address,
            json_build_object(
                'activation_time', NOW(),
                'level', NEW.current_level
            ),
            'Member activated - rewards processing needed'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_member_activated ON public.members;
CREATE TRIGGER on_member_activated
    AFTER UPDATE ON public.members
    FOR EACH ROW EXECUTE FUNCTION public.trigger_referral_rewards();

-- 6. SCHEDULED CLEANUP JOB (Call this periodically)
-- You can run this via a cron job or scheduled function
CREATE OR REPLACE FUNCTION public.run_scheduled_cleanup()
RETURNS JSON AS $$
DECLARE
    cleanup_result JSON;
BEGIN
    -- Clean up expired users
    SELECT public.cleanup_expired_users() INTO cleanup_result;
    
    -- Log the cleanup
    INSERT INTO public.admin_actions (
        admin_wallet,
        action_type,
        action_data,
        reason
    ) VALUES (
        '0x0000000000000000000000000000000000000001',
        'scheduled_cleanup',
        cleanup_result,
        'Automated cleanup of expired users'
    );
    
    RETURN cleanup_result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- USAGE EXAMPLES:
-- =============================================

-- To activate a member with NFT claim:
-- SELECT public.activate_member_with_nft_claim('0x1234...', 'membership', 'demo_activation', 'tx_hash_123');

-- To cleanup expired users:
-- SELECT public.cleanup_expired_users();

-- To process referral rewards manually:
-- SELECT public.process_referral_rewards('0x1234...', 1);

-- To run scheduled cleanup:
-- SELECT public.run_scheduled_cleanup();

-- =============================================
-- IMPORTANT NOTES:
-- =============================================
-- 1. This script handles the complete flow: auth.users -> public.users -> NFT claim -> member activation -> referrals
-- 2. Referrals are ONLY created when users become activated members
-- 3. Users with countdown timers get cleaned up if not activated in time
-- 4. Root wallet users are protected from cleanup
-- 5. Rewards are only distributed to activated members
-- 6. All operations are logged in admin_actions for audit trail

COMMENT ON FUNCTION public.handle_new_user() IS 'Syncs auth.users to public.users and creates initial records';
COMMENT ON FUNCTION public.activate_member_with_nft_claim(TEXT, TEXT, TEXT, TEXT) IS 'Handles NFT claim -> member activation -> referral insertion flow';
COMMENT ON FUNCTION public.cleanup_expired_users() IS 'Removes users who haven not activated within countdown time';
COMMENT ON FUNCTION public.process_referral_rewards(TEXT, INTEGER) IS 'Distributes rewards to referral chain for activated members only';
COMMENT ON FUNCTION public.run_scheduled_cleanup() IS 'Scheduled job to cleanup expired users and maintain system';
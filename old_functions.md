| schema | function_name                                | arguments                                                                                                                                                                                                      | function_type | definition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| public | activate_member_with_nft_claim               | p_wallet_address text, p_nft_type text, p_payment_method text, p_transaction_hash text                                                                                                                         | function      | CREATE OR REPLACE FUNCTION public.activate_member_with_nft_claim(p_wallet_address text, p_nft_type text DEFAULT 'membership'::text, p_payment_method text DEFAULT 'demo_activation'::text, p_transaction_hash text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
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
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| public | activate_member_with_tier_rewards            | p_wallet_address character varying                                                                                                                                                                             | function      | CREATE OR REPLACE FUNCTION public.activate_member_with_tier_rewards(p_wallet_address character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_activation_rank INTEGER;
    v_tier INTEGER;
    v_tier_info public.member_activation_tiers%ROWTYPE;
    v_new_user_bonus DECIMAL(18,8) := 500.0000; -- 500 BCC for new users
BEGIN
    -- Get next activation rank
    v_activation_rank := nextval('public.activation_rank_seq');

    -- Determine tier
    v_tier := public.get_member_tier(v_activation_rank);

    -- Get tier information
    IF v_tier IS NOT NULL THEN
        SELECT * INTO v_tier_info 
        FROM public.member_activation_tiers 
        WHERE tier = v_tier AND is_active = true;
    END IF;

    -- Update member record
    UPDATE public.members SET
        is_activated = true,
        activated_at = NOW(),
        activation_rank = v_activation_rank,
        tier_level = v_tier,
        bcc_locked_initial = COALESCE(v_tier_info.base_bcc_locked, 0),
        bcc_locked_remaining = COALESCE(v_tier_info.base_bcc_locked, 0),
        updated_at = NOW()
    WHERE wallet_address = p_wallet_address;

    -- Add initial BCC balance (500 BCC for new users + any locked amount)
    INSERT INTO public.user_balances (
        wallet_address,
        bcc_transferable,
        bcc_locked
    ) VALUES (
        p_wallet_address,
        v_new_user_bonus,
        COALESCE(v_tier_info.base_bcc_locked, 0)
    ) ON CONFLICT (wallet_address) DO UPDATE SET
        bcc_transferable = user_balances.bcc_transferable + EXCLUDED.bcc_transferable,
        bcc_locked = user_balances.bcc_locked + EXCLUDED.bcc_locked,
        updated_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'activation_rank', v_activation_rank,
        'tier', v_tier,
        'bcc_locked_initial', COALESCE(v_tier_info.base_bcc_locked, 0),
        'new_user_bonus', v_new_user_bonus,
        'tier_name', COALESCE(v_tier_info.tier_name, 'No Tier Rewards')
    );
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| public | activate_new_user                            | p_wallet_address character varying                                                                                                                                                                             | function      | CREATE OR REPLACE FUNCTION public.activate_new_user(p_wallet_address character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Update member as activated
    UPDATE public.members SET
        is_activated = true,
        activated_at = NOW(),
        updated_at = NOW()
    WHERE wallet_address = p_wallet_address;

    -- Give user 500 transferable BCC + 10,450 locked BCC
    INSERT INTO public.user_balances (
        wallet_address,
        bcc_transferable,
        bcc_locked_total,
        bcc_unlocked_balance
    ) VALUES (
        p_wallet_address,
        500.0000, -- 500 BCC transferable bonus
        10450.0000, -- 10,450 BCC locked (sum of all level unlocks)
        0 -- No BCC unlocked yet
    ) ON CONFLICT (wallet_address) DO UPDATE SET
        bcc_transferable = user_balances.bcc_transferable + 500.0000,
        bcc_locked_total = 10450.0000,
        updated_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'activation_bonus', 500.0000,
        'locked_bcc_total', 10450.0000,
        'message', 'User activated with 500 BCC bonus and 10,450 BCC locked'
    );
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| public | calculate_bcc_unlock                         | p_tier integer, p_nft_level integer                                                                                                                                                                            | function      | CREATE OR REPLACE FUNCTION public.calculate_bcc_unlock(p_tier integer, p_nft_level integer)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_unlock_per_level DECIMAL(18,8);
    v_unlock_amount DECIMAL(18,8);
BEGIN
    -- Get unlock amount per level for this tier
    SELECT unlock_per_level INTO v_unlock_per_level
    FROM public.member_activation_tiers
    WHERE tier = p_tier AND is_active = true;

    IF v_unlock_per_level IS NULL THEN
        RETURN 0;
    END IF;

    -- Calculate unlock amount: base + (level-1) * increment
    -- Level 1: 100 BCC, Level 2: 150 BCC, etc. up to Level 19: 1000 BCC
    v_unlock_amount := v_unlock_per_level + ((p_nft_level - 1) * (v_unlock_per_level * 0.5));

    RETURN v_unlock_amount;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| public | calculate_nft_total_price                    | p_level integer                                                                                                                                                                                                | function      | CREATE OR REPLACE FUNCTION public.calculate_nft_total_price(p_level integer)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_nft_price DECIMAL(18,6);
    v_activation_fee DECIMAL(18,6) := 0;
    v_transaction_fee DECIMAL(18,6) := 0;
    v_total_price DECIMAL(18,6);
BEGIN
    -- Get NFT base price
    SELECT price_usdc INTO v_nft_price
    FROM public.nft_levels 
    WHERE level = p_level AND is_active = true;

    IF v_nft_price IS NULL THEN
        RAISE EXCEPTION 'NFT level % not found or inactive', p_level;
    END IF;

    -- Get activation fee
    SELECT fee_amount_usdc INTO v_activation_fee
    FROM public.platform_fees 
    WHERE fee_type = 'activation_fee' 
    AND is_active = true 
    AND (applies_to = 'all_levels' OR 
         (applies_to = 'specific_level' AND nft_level = p_level))
    LIMIT 1;

    -- Get transaction fee
    SELECT fee_amount_usdc INTO v_transaction_fee
    FROM public.platform_fees 
    WHERE fee_type = 'transaction_fee' 
    AND is_active = true 
    AND (applies_to = 'all_levels' OR 
         (applies_to = 'specific_level' AND nft_level = p_level))
    LIMIT 1;

    -- Calculate total
    v_total_price := v_nft_price + COALESCE(v_activation_fee, 0) + COALESCE(v_transaction_fee, 0);

    RETURN v_total_price;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| public | calculate_total_nft_cost                     | p_level integer                                                                                                                                                                                                | function      | CREATE OR REPLACE FUNCTION public.calculate_total_nft_cost(p_level integer)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_nft_price DECIMAL(18,6);
    v_platform_fee DECIMAL(18,6) := 0;
BEGIN
    -- Get NFT price
    SELECT price_usdc INTO v_nft_price
    FROM public.nft_levels 
    WHERE level = p_level AND is_active = true;

    IF v_nft_price IS NULL THEN
        RAISE EXCEPTION 'NFT level % not found or inactive', p_level;
    END IF;

    -- Add platform fee only for Level 1
    IF p_level = 1 THEN
        SELECT fee_amount_usdc INTO v_platform_fee
        FROM public.platform_fees 
        WHERE fee_type = 'activation_fee' 
        AND nft_level = 1
        AND is_active = true;
    END IF;

    RETURN v_nft_price + COALESCE(v_platform_fee, 0);
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| public | can_receive_layer_reward                     | p_root_wallet character varying, p_layer integer, p_claim_number integer                                                                                                                                       | function      | CREATE OR REPLACE FUNCTION public.can_receive_layer_reward(p_root_wallet character varying, p_layer integer, p_claim_number integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_root_level INTEGER;
    v_required_level INTEGER;
    v_pending_hours INTEGER;
    v_activation_expires TIMESTAMPTZ;
BEGIN
    -- Get root member's current level
    SELECT current_level INTO v_root_level
    FROM public.members
    WHERE wallet_address = p_root_wallet AND is_activated = true;

    IF v_root_level IS NULL THEN
        RETURN false; -- Root not activated
    END IF;

    -- For layer X, root must be at least level X
    -- Exception: First 2 rewards in layer 1 don't require upgrade
    IF p_layer = 1 AND p_claim_number <= 2 THEN
        v_required_level := 1; -- Can claim first 2 with level 1
    ELSE
        v_required_level := p_layer + 1; -- Need to be one level higher than layer
    END IF;

    -- Check if root meets level requirement
    IF v_root_level < v_required_level THEN
        RETURN false;
    END IF;

    -- Check pending activation status
    SELECT pending_activation_hours, activation_expires_at
    INTO v_pending_hours, v_activation_expires
    FROM public.members
    WHERE wallet_address = p_root_wallet;

    -- If in pending state, cannot receive rewards
    IF v_pending_hours > 0 AND v_activation_expires > NOW() THEN
        RETURN false;
    END IF;

    RETURN true;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| public | can_root_claim_layer_reward                  | p_root_wallet character varying, p_layer integer, p_layer_1_claim_count integer                                                                                                                                | function      | CREATE OR REPLACE FUNCTION public.can_root_claim_layer_reward(p_root_wallet character varying, p_layer integer, p_layer_1_claim_count integer DEFAULT 0)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_root_level INTEGER;
    v_layer_rule RECORD;
    v_direct_referral_count INTEGER;
BEGIN
    -- Get root member's current level
    SELECT current_level INTO v_root_level
    FROM public.members
    WHERE wallet_address = p_root_wallet AND is_activated = true;

    IF v_root_level IS NULL THEN
        RETURN false;
    END IF;

    -- Get layer rule configuration
    SELECT * INTO v_layer_rule
    FROM public.layer_rules
    WHERE layer = p_layer;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Check direct referral requirements (Layer 1 & 2 only)
    IF v_layer_rule.requires_direct_referrals THEN
        v_direct_referral_count := public.count_direct_referrals(p_root_wallet);

        IF v_direct_referral_count < v_layer_rule.direct_referrals_needed THEN
            RETURN false;
        END IF;
    END IF;

    -- Special rule for Layer 1: 3rd claim requires Level 2
    IF v_layer_rule.has_special_upgrade_rule AND p_layer = 1 AND p_layer_1_claim_count >= 2 THEN
        RETURN v_root_level >= 2;
    END IF;

    -- General rule: root must be >= layer level
    RETURN v_root_level >= p_layer;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| public | check_pending_activation_expiry              |                                                                                                                                                                                                                | function      | CREATE OR REPLACE FUNCTION public.check_pending_activation_expiry()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- If activation_expires_at has passed, clear the pending status
    IF NEW.activation_expires_at IS NOT NULL 
       AND NEW.activation_expires_at <= NOW() 
       AND NEW.pending_activation_hours > 0 THEN

        NEW.pending_activation_hours := 0;
        NEW.activation_expires_at := NULL;
        NEW.admin_set_pending := false;
        NEW.admin_wallet := NULL;
    END IF;

    RETURN NEW;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| public | check_withdrawal_limits                      | p_user_wallet text, p_amount_usd numeric                                                                                                                                                                       | function      | CREATE OR REPLACE FUNCTION public.check_withdrawal_limits(p_user_wallet text, p_amount_usd numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    user_limits RECORD;
    current_date DATE := CURRENT_DATE;
    current_month_start DATE := DATE_TRUNC('month', CURRENT_DATE);
    result JSONB;
BEGIN
    -- Get or create user limits
    INSERT INTO user_withdrawal_limits (user_wallet, daily_reset_date, monthly_reset_date)
    VALUES (p_user_wallet, current_date, current_month_start)
    ON CONFLICT (user_wallet) 
    DO UPDATE SET
        daily_reset_date = CASE 
            WHEN user_withdrawal_limits.daily_reset_date < current_date 
            THEN current_date 
            ELSE user_withdrawal_limits.daily_reset_date 
        END,
        daily_withdrawn_usd = CASE 
            WHEN user_withdrawal_limits.daily_reset_date < current_date 
            THEN 0 
            ELSE user_withdrawal_limits.daily_withdrawn_usd 
        END,
        monthly_reset_date = CASE 
            WHEN user_withdrawal_limits.monthly_reset_date < current_month_start 
            THEN current_month_start 
            ELSE user_withdrawal_limits.monthly_reset_date 
        END,
        monthly_withdrawn_usd = CASE 
            WHEN user_withdrawal_limits.monthly_reset_date < current_month_start 
            THEN 0 
            ELSE user_withdrawal_limits.monthly_withdrawn_usd 
        END;

    -- Get updated limits
    SELECT * INTO user_limits
    FROM user_withdrawal_limits 
    WHERE user_wallet = p_user_wallet;

    -- Check limits
    IF (user_limits.daily_withdrawn_usd + p_amount_usd) > user_limits.daily_limit_usd THEN
        result := jsonb_build_object(
            'allowed', false,
            'reason', 'daily_limit_exceeded',
            'daily_limit', user_limits.daily_limit_usd,
            'daily_used', user_limits.daily_withdrawn_usd,
            'daily_remaining', user_limits.daily_limit_usd - user_limits.daily_withdrawn_usd
        );
    ELSIF (user_limits.monthly_withdrawn_usd + p_amount_usd) > user_limits.monthly_limit_usd THEN
        result := jsonb_build_object(
            'allowed', false,
            'reason', 'monthly_limit_exceeded',
            'monthly_limit', user_limits.monthly_limit_usd,
            'monthly_used', user_limits.monthly_withdrawn_usd,
            'monthly_remaining', user_limits.monthly_limit_usd - user_limits.monthly_withdrawn_usd
        );
    ELSE
        result := jsonb_build_object(
            'allowed', true,
            'daily_remaining', user_limits.daily_limit_usd - user_limits.daily_withdrawn_usd - p_amount_usd,
            'monthly_remaining', user_limits.monthly_limit_usd - user_limits.monthly_withdrawn_usd - p_amount_usd
        );
    END IF;

    RETURN result;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'system_error', 'error', SQLERRM);
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| public | claim_pending_rewards                        | p_wallet_address character varying                                                                                                                                                                             | function      | CREATE OR REPLACE FUNCTION public.claim_pending_rewards(p_wallet_address character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    total_pending DECIMAL(18,6);
    claim_count INTEGER;
    result JSONB;
BEGIN
    -- Get total unclaimed rewards
    SELECT COALESCE(SUM(amount_usdt), 0), COUNT(*)
    INTO total_pending, claim_count
    FROM public.layer_rewards
    WHERE recipient_wallet = p_wallet_address AND is_claimed = false;

    IF total_pending > 0 THEN
        -- Mark rewards as claimed
        UPDATE public.layer_rewards
        SET is_claimed = true,
            claimed_at = NOW()
        WHERE recipient_wallet = p_wallet_address AND is_claimed = false;

        -- Update user balance
        UPDATE public.user_balances
        SET total_usdt_earned = total_usdt_earned + total_pending,
            pending_upgrade_rewards = 0,
            rewards_claimed = rewards_claimed + total_pending,
            updated_at = NOW()
        WHERE wallet_address = p_wallet_address;

        result := jsonb_build_object(
            'success', true,
            'amount_claimed', total_pending,
            'rewards_count', claim_count
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'error', 'No pending rewards to claim'
        );
    END IF;

    RETURN result;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| public | claim_reward_to_balance                      | p_claim_id uuid, p_wallet_address character varying                                                                                                                                                            | function      | CREATE OR REPLACE FUNCTION public.claim_reward_to_balance(p_claim_id uuid, p_wallet_address character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_claim RECORD;
BEGIN
    -- Get and verify claim
    SELECT * INTO v_claim
    FROM public.reward_claims
    WHERE id = p_claim_id AND root_wallet = p_wallet_address AND status = 'claimable';

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Claim not found or not claimable'
        );
    END IF;

    -- Update claim status
    UPDATE public.reward_claims SET
        status = 'claimed',
        claimed_at = NOW()
    WHERE id = p_claim_id;

    -- Add to claimable balance (money goes to balance, not direct payment)
    UPDATE public.user_balances SET
        claimable_reward_balance_usdc = claimable_reward_balance_usdc + v_claim.reward_amount_usdc,
        updated_at = NOW()
    WHERE wallet_address = p_wallet_address;

    -- Create claimed notification
    PERFORM public.create_reward_countdown_notification(p_claim_id);

    RETURN jsonb_build_object(
        'success', true,
        'claim_id', p_claim_id,
        'reward_amount_usdc', v_claim.reward_amount_usdc,
        'added_to_balance', true,
        'message', 'Reward added to your balance. Use withdraw function to get USDC.'
    );
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| public | cleanup_expired_users                        |                                                                                                                                                                                                                | function      | CREATE OR REPLACE FUNCTION public.cleanup_expired_users()
 RETURNS json
 LANGUAGE plpgsql
AS $function$
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
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| public | clear_member_activation_pending              | p_admin_wallet character varying, p_target_wallet character varying, p_reason text                                                                                                                             | function      | CREATE OR REPLACE FUNCTION public.clear_member_activation_pending(p_admin_wallet character varying, p_target_wallet character varying, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_is_admin BOOLEAN := false;
BEGIN
    -- Check if requesting user is admin
    SELECT is_admin INTO v_is_admin 
    FROM public.users 
    WHERE wallet_address = p_admin_wallet;

    IF NOT COALESCE(v_is_admin, false) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Admin privileges required'
        );
    END IF;

    -- Clear pending activation
    UPDATE public.members SET
        pending_activation_hours = 0,
        activation_expires_at = NULL,
        admin_set_pending = false,
        admin_wallet = NULL,
        updated_at = NOW()
    WHERE wallet_address = p_target_wallet;

    -- Log admin action
    INSERT INTO public.admin_actions (
        admin_wallet,
        action_type,
        target_wallet,
        reason
    ) VALUES (
        p_admin_wallet,
        'clear_activation_pending',
        p_target_wallet,
        p_reason
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Activation pending cleared for %s', p_target_wallet)
    );
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| public | count_direct_referrals                       | p_wallet_address character varying                                                                                                                                                                             | function      | CREATE OR REPLACE FUNCTION public.count_direct_referrals(p_wallet_address character varying)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.referrals r
        WHERE r.root_wallet = p_wallet_address 
        AND r.layer = 1
        AND r.is_active = true
    );
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| public | create_countdown_timer                       | p_wallet_address character varying, p_timer_type character varying, p_title character varying, p_duration_hours integer, p_description text, p_auto_action character varying, p_admin_wallet character varying | function      | CREATE OR REPLACE FUNCTION public.create_countdown_timer(p_wallet_address character varying, p_timer_type character varying, p_title character varying, p_duration_hours integer, p_description text DEFAULT NULL::text, p_auto_action character varying DEFAULT NULL::character varying, p_admin_wallet character varying DEFAULT NULL::character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_timer_id UUID;
    v_end_time TIMESTAMPTZ;
BEGIN
    v_end_time := NOW() + (p_duration_hours || ' hours')::INTERVAL;

    -- Deactivate existing timers of same type for this wallet
    UPDATE public.countdown_timers SET
        is_active = false,
        updated_at = NOW()
    WHERE wallet_address = p_wallet_address 
    AND timer_type = p_timer_type 
    AND is_active = true;

    -- Create new timer
    INSERT INTO public.countdown_timers (
        wallet_address,
        timer_type,
        title,
        description,
        end_time,
        auto_action,
        admin_wallet
    ) VALUES (
        p_wallet_address,
        p_timer_type,
        p_title,
        p_description,
        v_end_time,
        p_auto_action,
        p_admin_wallet
    ) RETURNING id INTO v_timer_id;

    RETURN jsonb_build_object(
        'success', true,
        'timer_id', v_timer_id,
        'wallet_address', p_wallet_address,
        'timer_type', p_timer_type,
        'title', p_title,
        'end_time', v_end_time,
        'duration_hours', p_duration_hours
    );
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| public | create_layer_reward_claim                    | p_root_wallet character varying, p_triggering_member_wallet character varying, p_layer integer, p_nft_level integer, p_transaction_hash character varying                                                      | function      | CREATE OR REPLACE FUNCTION public.create_layer_reward_claim(p_root_wallet character varying, p_triggering_member_wallet character varying, p_layer integer, p_nft_level integer, p_transaction_hash character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_reward_amount DECIMAL(18,6);
    v_layer_1_count INTEGER := 0;
    v_can_claim BOOLEAN;
    v_claim_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Get reward amount for this layer
    SELECT fixed_amount_usdc INTO v_reward_amount
    FROM public.reward_rules
    WHERE rule_type = 'layer_reward' AND layer = p_layer AND is_active = true;

    IF v_reward_amount IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No reward rule found for layer');
    END IF;

    -- Count existing Layer 1 claims for special rule
    IF p_layer = 1 THEN
        SELECT COUNT(*) INTO v_layer_1_count
        FROM public.reward_claims
        WHERE root_wallet = p_root_wallet 
        AND layer = 1 
        AND status IN ('claimed', 'claimable');
    END IF;

    -- Check if root can claim this reward
    v_can_claim := public.can_root_claim_layer_reward(p_root_wallet, p_layer, v_layer_1_count);

    -- Set expiry (72 hours from now)
    v_expires_at := NOW() + INTERVAL '72 hours';

    -- Create reward claim
    INSERT INTO public.reward_claims (
        root_wallet,
        triggering_member_wallet,
        layer,
        nft_level,
        reward_amount_usdc,
        status,
        expires_at,
        triggering_transaction_hash,
        metadata
    ) VALUES (
        p_root_wallet,
        p_triggering_member_wallet,
        p_layer,
        p_nft_level,
        v_reward_amount,
        CASE WHEN v_can_claim THEN 'claimable' ELSE 'pending' END,
        v_expires_at,
        p_transaction_hash,
        jsonb_build_object(
            'layer_1_claim_count', v_layer_1_count,
            'root_qualified', v_can_claim,
            'created_by_nft_purchase', true
        )
    ) RETURNING id INTO v_claim_id;

    RETURN jsonb_build_object(
        'success', true,
        'claim_id', v_claim_id,
        'reward_amount_usdc', v_reward_amount,
        'status', CASE WHEN v_can_claim THEN 'claimable' ELSE 'pending' END,
        'expires_at', v_expires_at,
        'layer_1_count', v_layer_1_count
    );
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| public | create_layer_reward_claim_with_notifications | p_root_wallet character varying, p_triggering_member_wallet character varying, p_layer integer, p_nft_level integer, p_transaction_hash character varying                                                      | function      | CREATE OR REPLACE FUNCTION public.create_layer_reward_claim_with_notifications(p_root_wallet character varying, p_triggering_member_wallet character varying, p_layer integer, p_nft_level integer, p_transaction_hash character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_reward_result JSONB;
    v_claim_id UUID;
    v_notification_result JSONB;
BEGIN
    -- Create the reward claim
    v_reward_result := public.create_layer_reward_claim(
        p_root_wallet, p_triggering_member_wallet, p_layer, p_nft_level, p_transaction_hash
    );

    IF NOT (v_reward_result->>'success')::BOOLEAN THEN
        RETURN v_reward_result;
    END IF;

    -- Get claim ID
    v_claim_id := (v_reward_result->>'claim_id')::UUID;

    -- Create countdown notification
    v_notification_result := public.create_reward_countdown_notification(v_claim_id);

    -- Add notification result to response
    RETURN jsonb_set(v_reward_result, '{notification}', v_notification_result);
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| public | create_member_with_pending                   | p_wallet_address character varying, p_use_pending boolean                                                                                                                                                      | function      | CREATE OR REPLACE FUNCTION public.create_member_with_pending(p_wallet_address character varying, p_use_pending boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_pending_enabled BOOLEAN;
    v_pending_hours INTEGER := 0;
    v_expires_at TIMESTAMPTZ := NULL;
BEGIN
    -- Check if pending is enabled globally or specifically requested
    v_pending_enabled := is_activation_pending_enabled();

    -- Use pending if globally enabled or specifically requested
    IF COALESCE(p_use_pending, v_pending_enabled) THEN
        v_pending_hours := get_default_pending_hours();
        v_expires_at := NOW() + (v_pending_hours || ' hours')::INTERVAL;
    END IF;

    -- Create or update member record
    INSERT INTO public.members (
        wallet_address,
        is_activated,
        pending_activation_hours,
        activation_expires_at,
        created_at,
        updated_at
    ) VALUES (
        p_wallet_address,
        false,
        v_pending_hours,
        v_expires_at,
        NOW(),
        NOW()
    )
    ON CONFLICT (wallet_address) DO UPDATE SET
        pending_activation_hours = EXCLUDED.pending_activation_hours,
        activation_expires_at = EXCLUDED.activation_expires_at,
        updated_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'wallet_address', p_wallet_address,
        'pending_hours', v_pending_hours,
        'expires_at', v_expires_at,
        'has_pending', v_pending_hours > 0
    );
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| public | create_referral_link                         | p_referrer_wallet character varying, p_base_url text, p_max_uses integer, p_expires_days integer                                                                                                               | function      | CREATE OR REPLACE FUNCTION public.create_referral_link(p_referrer_wallet character varying, p_base_url text DEFAULT 'https://beehive-platform.com/register'::text, p_max_uses integer DEFAULT NULL::integer, p_expires_days integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_token VARCHAR(32);
    v_expires_at TIMESTAMPTZ;
    v_referral_id UUID;
    v_full_url TEXT;
BEGIN
    -- Check if referrer exists and is activated
    IF NOT EXISTS(
        SELECT 1 FROM public.users u 
        INNER JOIN public.members m ON u.wallet_address = m.wallet_address 
        WHERE u.wallet_address = p_referrer_wallet AND m.is_activated = true
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Referrer must be an activated member'
        );
    END IF;

    -- Generate unique token
    v_token := generate_referral_token();

    -- Set expiry if provided
    IF p_expires_days IS NOT NULL THEN
        v_expires_at := NOW() + (p_expires_days || ' days')::INTERVAL;
    END IF;

    -- Build full referral URL
    v_full_url := p_base_url || '?ref=' || v_token || '&referrer=' || p_referrer_wallet;

    -- Insert referral link record
    INSERT INTO public.referral_links (
        referrer_wallet,
        referral_token,
        referral_url,
        expires_at,
        max_uses
    ) VALUES (
        p_referrer_wallet,
        v_token,
        v_full_url,
        v_expires_at,
        p_max_uses
    ) RETURNING id INTO v_referral_id;

    RETURN jsonb_build_object(
        'success', true,
        'referral_id', v_referral_id,
        'referral_token', v_token,
        'referral_url', v_full_url,
        'referrer_wallet', p_referrer_wallet,
        'expires_at', v_expires_at,
        'max_uses', p_max_uses
    );
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| public | create_reward_countdown_notification         | p_claim_id uuid                                                                                                                                                                                                | function      | CREATE OR REPLACE FUNCTION public.create_reward_countdown_notification(p_claim_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_claim RECORD;
    v_hours_remaining INTEGER;
    v_notification_id UUID;
BEGIN
    -- Get claim details
    SELECT * INTO v_claim
    FROM public.reward_claims
    WHERE id = p_claim_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Claim not found');
    END IF;

    -- Calculate hours remaining
    v_hours_remaining := EXTRACT(EPOCH FROM (v_claim.expires_at - NOW())) / 3600;

    -- Create notification based on status
    IF v_claim.status = 'pending' THEN
        INSERT INTO public.reward_notifications (
            wallet_address,
            reward_claim_id,
            notification_type,
            title,
            message,
            countdown_hours,
            metadata
        ) VALUES (
            v_claim.root_wallet,
            p_claim_id,
            'pending_reward',
            'Reward Available - Upgrade Required',
            format('You have a pending reward of %s USDC from Layer %s. Upgrade to Level %s within %s hours to claim this reward, or it will roll up to your qualified upline.',
                v_claim.reward_amount_usdc,
                v_claim.layer,
                v_claim.layer,
                v_hours_remaining
            ),
            v_hours_remaining,
            jsonb_build_object(
                'layer', v_claim.layer,
                'nft_level', v_claim.nft_level,
                'reward_amount_usdc', v_claim.reward_amount_usdc,
                'expires_at', v_claim.expires_at,
                'required_upgrade_level', v_claim.layer
            )
        ) RETURNING id INTO v_notification_id;

    ELSIF v_claim.status = 'claimable' THEN
        -- Update balance when reward becomes claimable
        UPDATE public.user_balances SET
            claimable_reward_balance_usdc = claimable_reward_balance_usdc + v_claim.reward_amount_usdc,
            updated_at = NOW()
        WHERE wallet_address = v_claim.root_wallet;

        -- Create claimable notification
        INSERT INTO public.reward_notifications (
            wallet_address,
            reward_claim_id,
            notification_type,
            title,
            message,
            countdown_hours,
            metadata
        ) VALUES (
            v_claim.root_wallet,
            p_claim_id,
            'claimed',
            'Reward Ready to Withdraw',
            format('Congratulations! Your Layer %s reward of %s USDC is now available in your reward balance. You can withdraw it anytime.',
                v_claim.layer,
                v_claim.reward_amount_usdc
            ),
            0,
            jsonb_build_object(
                'layer', v_claim.layer,
                'nft_level', v_claim.nft_level,
                'reward_amount_usdc', v_claim.reward_amount_usdc,
                'action_required', 'none'
            )
        ) RETURNING id INTO v_notification_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'notification_id', v_notification_id,
        'hours_remaining', v_hours_remaining,
        'status', v_claim.status
    );
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| public | create_wallet_session                        | p_wallet_address character varying, p_signature text, p_message text                                                                                                                                           | function      | CREATE OR REPLACE FUNCTION public.create_wallet_session(p_wallet_address character varying, p_signature text, p_message text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    session_token TEXT;
    result JSONB;
BEGIN
    -- Validate signature
    IF NOT validate_wallet_signature(p_message, p_signature, p_wallet_address) THEN
        result := jsonb_build_object(
            'success', false,
            'error', 'Invalid signature'
        );
        RETURN result;
    END IF;

    -- Generate session token (simplified)
    session_token := encode(digest(p_wallet_address || extract(epoch from now()), 'sha256'), 'hex');

    -- Log wallet connection
    INSERT INTO public.user_wallet_connections (
        wallet_address,
        connection_type,
        connected_at
    ) VALUES (
        p_wallet_address,
        'supabase_edge_function',
        NOW()
    );

    result := jsonb_build_object(
        'success', true,
        'session_token', session_token,
        'wallet_address', p_wallet_address,
        'expires_at', extract(epoch from (now() + interval '24 hours'))
    );

    RETURN result;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| public | distribute_layer_rewards                     | p_payer_wallet character varying, p_amount_usdt numeric, p_nft_level integer, p_source_transaction_id text                                                                                                     | function      | CREATE OR REPLACE FUNCTION public.distribute_layer_rewards(p_payer_wallet character varying, p_amount_usdt numeric, p_nft_level integer, p_source_transaction_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    reward_record RECORD;
    total_distributed DECIMAL(18,6) := 0;
    distribution_count INTEGER := 0;
    result JSONB;
BEGIN
    -- Find all eligible recipients in the upline
    FOR reward_record IN
        SELECT DISTINCT r.root_wallet as recipient,
               r.layer,
               'matrix' as reward_type
        FROM public.referrals r
        JOIN public.members m ON r.root_wallet = m.wallet_address
        WHERE r.member_wallet = p_payer_wallet
          AND r.layer <= p_nft_level -- Only distribute to unlocked layers
          AND m.is_activated = true
          AND m.current_level >= r.layer -- Recipient must have required NFT level
        ORDER BY r.layer
    LOOP
        -- Calculate reward amount (simplified - actual logic would be more complex)
        DECLARE
            reward_amount DECIMAL(18,6);
        BEGIN
            reward_amount := p_amount_usdt * 0.05; -- 5% per layer (simplified)

            -- Insert reward record
            INSERT INTO public.layer_rewards (
                recipient_wallet,
                payer_wallet,
                layer,
                reward_type,
                amount_usdt,
                source_transaction_id,
                nft_level,
                is_claimed,
                created_at
            ) VALUES (
                reward_record.recipient,
                p_payer_wallet,
                reward_record.layer,
                reward_record.reward_type,
                reward_amount,
                p_source_transaction_id,
                p_nft_level,
                false,
                NOW()
            );

            -- Update recipient's pending rewards
            UPDATE public.user_balances
            SET pending_upgrade_rewards = pending_upgrade_rewards + reward_amount,
                updated_at = NOW()
            WHERE wallet_address = reward_record.recipient;

            total_distributed := total_distributed + reward_amount;
            distribution_count := distribution_count + 1;
        END;
    END LOOP;

    result := jsonb_build_object(
        'success', true,
        'total_distributed', total_distributed,
        'distribution_count', distribution_count
    );

    RETURN result;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| public | find_next_matrix_position                    | p_root_wallet character varying, p_layer integer                                                                                                                                                               | function      | CREATE OR REPLACE FUNCTION public.find_next_matrix_position(p_root_wallet character varying, p_layer integer)
 RETURNS TABLE(matrix_position text, parent_wallet character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    positions_per_layer INTEGER;
    existing_positions INTEGER;
    next_position TEXT;
    parent_addr VARCHAR(42);
BEGIN
    -- Calculate positions per layer: 3^layer
    positions_per_layer := POWER(3, p_layer);

    -- Count existing positions in this layer
    SELECT COUNT(*) INTO existing_positions
    FROM public.referrals
    WHERE root_wallet = p_root_wallet AND layer = p_layer;

    -- If layer is full, return null
    IF existing_positions >= positions_per_layer THEN
        RETURN;
    END IF;

    -- Generate position string based on layer
    IF p_layer = 1 THEN
        -- Layer 1: L, M, R
        CASE existing_positions
            WHEN 0 THEN next_position := 'L';
            WHEN 1 THEN next_position := 'M';
            WHEN 2 THEN next_position := 'R';
        END CASE;
        parent_addr := p_root_wallet;
    ELSE
        -- Deeper layers: find parent and generate position
        -- This is simplified - actual implementation would be more complex
        next_position := 'L'; -- Placeholder
        parent_addr := p_root_wallet; -- Placeholder
    END IF;

    RETURN QUERY SELECT next_position as matrix_position, parent_addr;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| public | generate_referral_token                      |                                                                                                                                                                                                                | function      | CREATE OR REPLACE FUNCTION public.generate_referral_token()
 RETURNS character varying
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    token VARCHAR(32);
    exists_check BOOLEAN;
BEGIN
    LOOP
        -- Generate random 16-character alphanumeric token
        token := LOWER(SUBSTRING(MD5(RANDOM()::TEXT || EXTRACT(EPOCH FROM NOW())) FROM 1 FOR 16));

        -- Check if token already exists
        SELECT EXISTS(SELECT 1 FROM public.referral_links WHERE referral_token = token) INTO exists_check;

        -- Exit loop if unique
        IF NOT exists_check THEN
            EXIT;
        END IF;
    END LOOP;

    RETURN token;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| public | get_active_countdowns                        | p_wallet_address character varying                                                                                                                                                                             | function      | CREATE OR REPLACE FUNCTION public.get_active_countdowns(p_wallet_address character varying)
 RETURNS TABLE(timer_id uuid, timer_type character varying, title character varying, description text, start_time timestamp with time zone, end_time timestamp with time zone, time_remaining interval, is_expired boolean, auto_action character varying, metadata jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        ct.id,
        ct.timer_type,
        ct.title,
        ct.description,
        ct.start_time,
        ct.end_time,
        CASE 
            WHEN ct.end_time > NOW() THEN ct.end_time - NOW()
            ELSE INTERVAL '0'
        END as time_remaining,
        ct.end_time <= NOW() as is_expired,
        ct.auto_action,
        ct.metadata
    FROM public.countdown_timers ct
    WHERE ct.wallet_address = p_wallet_address
    AND ct.is_active = true
    ORDER BY ct.end_time ASC;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| public | get_current_wallet_address                   |                                                                                                                                                                                                                | function      | CREATE OR REPLACE FUNCTION public.get_current_wallet_address()
 RETURNS character varying
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN COALESCE(
        current_setting('request.jwt.claims', true)::json->>'wallet_address',
        current_setting('request.headers', true)::json->>'x-wallet-address'
    );
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| public | get_default_pending_hours                    |                                                                                                                                                                                                                | function      | CREATE OR REPLACE FUNCTION public.get_default_pending_hours()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN (SELECT value::integer FROM public.system_settings WHERE key = 'default_pending_hours');
EXCEPTION WHEN OTHERS THEN
    RETURN 48; -- Default fallback
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| public | get_member_tier                              | p_activation_rank integer                                                                                                                                                                                      | function      | CREATE OR REPLACE FUNCTION public.get_member_tier(p_activation_rank integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF p_activation_rank BETWEEN 1 AND 9999 THEN
        RETURN 1;
    ELSIF p_activation_rank BETWEEN 10000 AND 29999 THEN
        RETURN 2;
    ELSIF p_activation_rank BETWEEN 30000 AND 99999 THEN
        RETURN 3;
    ELSIF p_activation_rank BETWEEN 100000 AND 268140 THEN
        RETURN 4;
    ELSE
        RETURN NULL; -- No tier rewards beyond 268,140
    END IF;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| public | get_nft_fee_breakdown                        | p_level integer                                                                                                                                                                                                | function      | CREATE OR REPLACE FUNCTION public.get_nft_fee_breakdown(p_level integer)
 RETURNS TABLE(nft_price numeric, activation_fee numeric, transaction_fee numeric, upgrade_fee numeric, total_fees numeric, total_price numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        nl.price_usdc as nft_price,
        COALESCE(af.fee_amount_usdc, 0) as activation_fee,
        COALESCE(tf.fee_amount_usdc, 0) as transaction_fee,
        COALESCE(uf.fee_amount_usdc, 0) as upgrade_fee,
        COALESCE(af.fee_amount_usdc, 0) + 
        COALESCE(tf.fee_amount_usdc, 0) + 
        COALESCE(uf.fee_amount_usdc, 0) as total_fees,
        nl.price_usdc + 
        COALESCE(af.fee_amount_usdc, 0) + 
        COALESCE(tf.fee_amount_usdc, 0) as total_price
    FROM public.nft_levels nl
    LEFT JOIN public.platform_fees af ON af.fee_type = 'activation_fee' AND af.is_active = true
    LEFT JOIN public.platform_fees tf ON tf.fee_type = 'transaction_fee' AND tf.is_active = true  
    LEFT JOIN public.platform_fees uf ON uf.fee_type = 'upgrade_fee' AND uf.is_active = true
    WHERE nl.level = p_level AND nl.is_active = true;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| public | get_pending_activations                      | p_admin_wallet character varying                                                                                                                                                                               | function      | CREATE OR REPLACE FUNCTION public.get_pending_activations(p_admin_wallet character varying DEFAULT NULL::character varying)
 RETURNS TABLE(wallet_address character varying, username character varying, pending_hours integer, expires_at timestamp with time zone, admin_set_pending boolean, admin_wallet character varying, created_at timestamp with time zone, time_remaining interval)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- If admin wallet provided, check admin privileges
    IF p_admin_wallet IS NOT NULL THEN
        IF NOT (SELECT is_admin FROM public.users WHERE wallet_address = p_admin_wallet) THEN
            RAISE EXCEPTION 'Admin privileges required';
        END IF;
    END IF;

    RETURN QUERY
    SELECT 
        m.wallet_address,
        u.username,
        m.pending_activation_hours,
        m.activation_expires_at,
        m.admin_set_pending,
        m.admin_wallet,
        u.created_at,
        CASE 
            WHEN m.activation_expires_at > NOW() THEN m.activation_expires_at - NOW()
            ELSE INTERVAL '0'
        END as time_remaining
    FROM public.members m
    LEFT JOIN public.users u ON m.wallet_address = u.wallet_address
    WHERE m.pending_activation_hours > 0 
      AND m.activation_expires_at IS NOT NULL
      AND m.is_activated = false
    ORDER BY m.activation_expires_at ASC;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| public | get_server_wallet_summary                    |                                                                                                                                                                                                                | function      | CREATE OR REPLACE FUNCTION public.get_server_wallet_summary()
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    total_usd DECIMAL(12, 6) := 0;
    operational_chains INTEGER := 0;
    total_chains INTEGER := 0;
    balance_record RECORD;
    result JSONB;
    chains JSONB := '[]'::JSONB;
BEGIN
    FOR balance_record IN 
        SELECT * FROM server_wallet_balances 
        ORDER BY chain_id
    LOOP
        total_chains := total_chains + 1;

        IF balance_record.is_operational THEN
            operational_chains := operational_chains + 1;
        END IF;

        total_usd := total_usd + (balance_record.balance * COALESCE(balance_record.price_usd, 1));

        chains := chains || jsonb_build_object(
            'chain_id', balance_record.chain_id,
            'chain_name', balance_record.chain_name,
            'token_symbol', balance_record.token_symbol,
            'balance', balance_record.balance,
            'usd_value', balance_record.balance * COALESCE(balance_record.price_usd, 1),
            'is_operational', balance_record.is_operational,
            'last_updated', balance_record.last_updated
        );
    END LOOP;

    result := jsonb_build_object(
        'total_usd_value', total_usd,
        'operational_chains', operational_chains,
        'total_chains', total_chains,
        'chains', chains,
        'last_updated', NOW()
    );

    RETURN result;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| public | handle_auth_user_created                     |                                                                                                                                                                                                                | function      | CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_wallet_address VARCHAR(42);
    v_username VARCHAR(100);
BEGIN
    -- Extract wallet address from metadata (if provided by Thirdweb InApp Wallet)
    v_wallet_address := NEW.raw_user_meta_data->>'wallet_address';
    v_username := NEW.raw_user_meta_data->>'username';

    -- Only proceed if we have a wallet address
    IF v_wallet_address IS NOT NULL THEN
        -- Check if public.users record already exists
        IF EXISTS(SELECT 1 FROM public.users WHERE wallet_address = v_wallet_address) THEN
            -- Link existing user to auth.users
            UPDATE public.users SET
                auth_user_id = NEW.id,
                email = COALESCE(email, NEW.email),
                email_verified = NEW.email_confirmed_at IS NOT NULL,
                username = COALESCE(username, v_username),
                updated_at = NOW()
            WHERE wallet_address = v_wallet_address;
        ELSE
            -- Create new public.users record
            INSERT INTO public.users (
                auth_user_id,
                wallet_address,
                email,
                email_verified,
                username,
                is_admin,
                created_at,
                updated_at
            ) VALUES (
                NEW.id,
                v_wallet_address,
                NEW.email,
                NEW.email_confirmed_at IS NOT NULL,
                COALESCE(v_username, 'User_' || SUBSTRING(v_wallet_address FROM 1 FOR 8)),
                false,
                NOW(),
                NOW()
            );

            -- Create corresponding members record
            INSERT INTO public.members (
                wallet_address,
                is_activated,
                created_at,
                updated_at
            ) VALUES (
                v_wallet_address,
                false,
                NOW(),
                NOW()
            );

            -- Create initial balance record
            INSERT INTO public.user_balances (
                wallet_address,
                bcc_transferable,
                bcc_locked,
                created_at,
                updated_at
            ) VALUES (
                v_wallet_address,
                500, -- Initial 500 transferable BCC
                0,   -- No locked BCC initially
                NOW(),
                NOW()
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| public | handle_new_user                              |                                                                                                                                                                                                                | function      | CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| public | is_activation_pending_enabled                |                                                                                                                                                                                                                | function      | CREATE OR REPLACE FUNCTION public.is_activation_pending_enabled()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN (SELECT value::boolean FROM public.system_settings WHERE key = 'activation_pending_enabled');
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| public | is_admin                                     |                                                                                                                                                                                                                | function      | CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN COALESCE(
        current_setting('request.jwt.claims', true)::json->>'is_admin',
        'false'
    )::boolean;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| public | is_valid_wallet_address                      | address text                                                                                                                                                                                                   | function      | CREATE OR REPLACE FUNCTION public.is_valid_wallet_address(address text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN address ~ '^0x[a-fA-F0-9]{40}$';
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| public | place_member_in_matrix                       | p_root_wallet character varying, p_member_wallet character varying, p_placer_wallet character varying, p_placement_type text                                                                                   | function      | CREATE OR REPLACE FUNCTION public.place_member_in_matrix(p_root_wallet character varying, p_member_wallet character varying, p_placer_wallet character varying, p_placement_type text DEFAULT 'direct'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    current_layer INTEGER := 1;
    placement_result RECORD;
    result JSONB;
BEGIN
    -- Find available position starting from layer 1
    WHILE current_layer <= 19 LOOP
        SELECT * INTO placement_result
        FROM public.find_next_matrix_position(p_root_wallet, current_layer);

        IF placement_result.position IS NOT NULL THEN
            -- Insert into referrals table
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
                p_root_wallet,
                p_member_wallet,
                current_layer,
                placement_result.position,
                placement_result.parent_wallet,
                p_placer_wallet,
                p_placement_type,
                true,
                NOW()
            );

            -- Log matrix activity
            INSERT INTO public.matrix_activity_log (
                root_wallet,
                member_wallet,
                activity_type,
                layer,
                position,
                details,
                created_at
            ) VALUES (
                p_root_wallet,
                p_member_wallet,
                'placement',
                current_layer,
                placement_result.position,
                jsonb_build_object(
                    'placer_wallet', p_placer_wallet,
                    'placement_type', p_placement_type
                ),
                NOW()
            );

            result := jsonb_build_object(
                'success', true,
                'layer', current_layer,
                'position', placement_result.position,
                'parent_wallet', placement_result.parent_wallet
            );

            RETURN result;
        END IF;

        current_layer := current_layer + 1;
    END LOOP;

    -- If no position found in any layer
    result := jsonb_build_object(
        'success', false,
        'error', 'No available positions in matrix'
    );

    RETURN result;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| public | process_activation_rewards                   | p_new_member_wallet text, p_activation_level integer, p_tx_hash text                                                                                                                                           | function      | CREATE OR REPLACE FUNCTION public.process_activation_rewards(p_new_member_wallet text, p_activation_level integer DEFAULT 1, p_tx_hash text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    user_record RECORD;
    ancestor_wallet TEXT;
    ancestor_reward INTEGER := 100; -- Your original: 100 USDT to 1st ancestor
    platform_revenue INTEGER := 30; -- Your original: 30 USDT platform revenue
    total_rewards INTEGER := 0;
    reward_results JSON;
BEGIN
    -- Only process rewards for activated members
    IF NOT EXISTS (SELECT 1 FROM public.members WHERE wallet_address = p_new_member_wallet AND is_activated = true) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Member not activated - no rewards processed'
        );
    END IF;

    -- Get the member's referrer info (your original logic)
    SELECT * INTO user_record 
    FROM public.users 
    WHERE wallet_address = p_new_member_wallet;

    -- Find the 1st ancestor (direct upline) from matrix placement
    -- This matches your original: "Get placement position to find direct upline (parent)"
    IF user_record.referrer_wallet IS NOT NULL THEN
        -- In your original system, you get the parent from matrix placement
        -- For now, we'll use the direct referrer as the ancestor
        -- (You can enhance this to use actual matrix placement logic later)
        SELECT parent_wallet INTO ancestor_wallet
        FROM public.referrals 
        WHERE member_wallet = p_new_member_wallet 
        LIMIT 1;

        -- If no matrix parent found, use referrer as fallback
        ancestor_wallet := COALESCE(ancestor_wallet, user_record.referrer_wallet);
    END IF;

    -- YOUR ORIGINAL: Pay 100 USDT to 1st ancestor
    IF ancestor_wallet IS NOT NULL AND ancestor_wallet != '0x0000000000000000000000000000000000000001' THEN
        -- Only give reward to activated ancestors
        IF EXISTS (SELECT 1 FROM public.members WHERE wallet_address = ancestor_wallet AND is_activated = true) THEN
            -- Update ancestor's balance (your original: available_usdt_rewards)
            UPDATE public.user_balances SET
                available_usdt_rewards = available_usdt_rewards + ancestor_reward,
                total_usdt_earned = total_usdt_earned + ancestor_reward,
                updated_at = NOW()
            WHERE wallet_address = ancestor_wallet;

            total_rewards := total_rewards + ancestor_reward;

            -- Log the reward distribution (matches your rewardDistributionService.distributeReward)
            INSERT INTO public.admin_actions (
                admin_wallet,
                action_type,
                target_wallet,
                action_data,
                reason
            ) VALUES (
                '0x0000000000000000000000000000000000000001', -- System
                'ancestor_reward',
                ancestor_wallet,
                json_build_object(
                    'recipient_wallet', ancestor_wallet,
                    'source_wallet', p_new_member_wallet,
                    'trigger_level', p_activation_level,
                    'reward_amount', ancestor_reward,
                    'reward_type', 'activation',
                    'tx_hash', p_tx_hash
                ),
                'Ancestor reward for new member activation'
            );

            -- Your original log: "💰 Ancestor reward: 100 USDT → ancestor_wallet"
        END IF;
    END IF;

    -- YOUR ORIGINAL: Platform revenue (Level 1 only) - 30 USDT
    IF p_activation_level = 1 THEN
        -- Record platform revenue (matches your rewardDistributionService.recordPlatformRevenue)
        INSERT INTO public.admin_actions (
            admin_wallet,
            action_type,
            target_wallet,
            action_data,
            reason
        ) VALUES (
            '0x0000000000000000000000000000000000000001', -- System
            'platform_revenue',
            p_new_member_wallet,
            json_build_object(
                'source_wallet', p_new_member_wallet,
                'level', p_activation_level,
                'amount', platform_revenue,
                'revenue_type', 'nft_claim',
                'tx_hash', p_tx_hash,
                'notes', 'Level ' || p_activation_level || ' activation platform revenue'
            ),
            'Platform revenue from Level 1 activation'
        );

        total_rewards := total_rewards + platform_revenue;

        -- Your original log: "🏢 Platform revenue: 30 USDT"
    END IF;

    -- Build result matching your original return format
    reward_results := json_build_object(
        'success', true,
        'new_member', p_new_member_wallet,
        'ancestor_reward', CASE WHEN ancestor_wallet IS NOT NULL THEN ancestor_reward ELSE NULL END,
        'platform_revenue', CASE WHEN p_activation_level = 1 THEN platform_revenue ELSE NULL END,
        'total_rewards_distributed', total_rewards,
        'ancestor_wallet', ancestor_wallet,
        'level', p_activation_level
    );

    RETURN reward_results;
END;
$function$
 |
| public | process_bcc_purchase                         | p_order_id character varying, p_amount_received numeric                                                                                                                                                        | function      | CREATE OR REPLACE FUNCTION public.process_bcc_purchase(p_order_id character varying, p_amount_received numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    order_record RECORD;
    bcc_amount DECIMAL(18,8);
    result JSONB;
BEGIN
    -- Get order details
    SELECT * INTO order_record
    FROM public.bcc_purchase_orders
    WHERE order_id = p_order_id AND status = 'pending';

    IF order_record.order_id IS NULL THEN
        result := jsonb_build_object(
            'success', false,
            'error', 'Order not found or already processed'
        );
        RETURN result;
    END IF;

    -- Check if order expired
    IF NOW() > order_record.expires_at THEN
        UPDATE public.bcc_purchase_orders
        SET status = 'expired', updated_at = NOW()
        WHERE order_id = p_order_id;

        result := jsonb_build_object(
            'success', false,
            'error', 'Order has expired'
        );
        RETURN result;
    END IF;

    -- Calculate BCC amount
    bcc_amount := p_amount_received * order_record.exchange_rate;

    -- Update order status
    UPDATE public.bcc_purchase_orders
    SET status = 'completed',
        actual_amount_received = p_amount_received,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE order_id = p_order_id;

    -- Credit BCC to user's balance
    INSERT INTO public.user_balances (
        wallet_address,
        bcc_transferable,
        bcc_locked,
        total_usdt_earned,
        pending_upgrade_rewards,
        rewards_claimed,
        created_at,
        updated_at
    ) VALUES (
        order_record.buyer_wallet,
        bcc_amount,
        0,
        0,
        0,
        0,
        NOW(),
        NOW()
    )
    ON CONFLICT (wallet_address)
    DO UPDATE SET
        bcc_transferable = user_balances.bcc_transferable + bcc_amount,
        updated_at = NOW();

    result := jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'amount_usdc', p_amount_received,
        'amount_bcc', bcc_amount,
        'buyer_wallet', order_record.buyer_wallet
    );

    RETURN result;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| public | process_expired_rewards                      |                                                                                                                                                                                                                | function      | CREATE OR REPLACE FUNCTION public.process_expired_rewards()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_processed_count INTEGER := 0;
    v_rolled_up_count INTEGER := 0;
    rec RECORD;
    v_upline_wallet VARCHAR(42);
BEGIN
    -- Process expired pending/claimable rewards
    FOR rec IN 
        SELECT * FROM public.reward_claims
        WHERE status IN ('pending', 'claimable')
        AND expires_at <= NOW()
    LOOP
        -- Find qualified upline member
        SELECT r.root_wallet INTO v_upline_wallet
        FROM public.referrals r
        JOIN public.members m ON r.root_wallet = m.wallet_address
        WHERE r.member_wallet = rec.root_wallet
        AND r.is_active = true
        AND m.current_level >= rec.layer
        ORDER BY r.layer ASC
        LIMIT 1;

        IF v_upline_wallet IS NOT NULL THEN
            -- Roll up to qualified upline
            UPDATE public.reward_claims SET
                status = 'rolled_up',
                rolled_up_at = NOW(),
                rolled_up_to_wallet = v_upline_wallet
            WHERE id = rec.id;

            -- Create new claimable reward for upline
            INSERT INTO public.reward_claims (
                root_wallet,
                triggering_member_wallet,
                layer,
                nft_level,
                reward_amount_usdc,
                status,
                expires_at,
                triggering_transaction_hash,
                metadata
            ) VALUES (
                v_upline_wallet,
                rec.triggering_member_wallet,
                rec.layer,
                rec.nft_level,
                rec.reward_amount_usdc,
                'claimable',
                NOW() + INTERVAL '72 hours',
                rec.triggering_transaction_hash,
                jsonb_build_object(
                    'rolled_up_from', rec.root_wallet,
                    'original_claim_id', rec.id
                )
            );

            v_rolled_up_count := v_rolled_up_count + 1;
        ELSE
            -- No qualified upline, mark as expired
            UPDATE public.reward_claims SET
                status = 'expired'
            WHERE id = rec.id;
        END IF;

        v_processed_count := v_processed_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'processed_rewards', v_processed_count,
        'rolled_up_rewards', v_rolled_up_count
    );
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| public | process_nft_purchase_with_requirements       | p_wallet_address character varying, p_nft_level integer, p_payment_amount_usdc numeric, p_transaction_hash character varying                                                                                   | function      | CREATE OR REPLACE FUNCTION public.process_nft_purchase_with_requirements(p_wallet_address character varying, p_nft_level integer, p_payment_amount_usdc numeric, p_transaction_hash character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_required_amount DECIMAL(18,6);
    v_bcc_unlock_amount DECIMAL(18,8);
    v_direct_referral_count INTEGER;
    v_layer_rewards JSONB[] := ARRAY[]::JSONB[];
    v_reward_result JSONB;
    rec RECORD;
BEGIN
    -- Calculate required payment
    v_required_amount := public.calculate_total_nft_cost(p_nft_level);

    -- Verify payment amount
    IF p_payment_amount_usdc < v_required_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient payment',
            'required', v_required_amount,
            'received', p_payment_amount_usdc
        );
    END IF;

    -- Special requirement: Level 2 needs 3 direct referrals
    IF p_nft_level = 2 THEN
        v_direct_referral_count := public.count_direct_referrals(p_wallet_address);

        IF v_direct_referral_count < 3 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Level 2 NFT requires 3 direct referrals',
                'current_referrals', v_direct_referral_count,
                'required_referrals', 3
            );
        END IF;
    END IF;

    -- Calculate BCC unlock amount
    v_bcc_unlock_amount := (p_nft_level * 50.0 + 50.0);

    -- Update member level
    UPDATE public.members SET
        current_level = GREATEST(current_level, p_nft_level),
        last_upgrade_at = NOW(),
        updated_at = NOW()
    WHERE wallet_address = p_wallet_address;

    -- Update user balances with BCC unlock
    INSERT INTO public.user_balances (
        wallet_address,
        bcc_unlocked_balance
    ) VALUES (
        p_wallet_address,
        v_bcc_unlock_amount
    ) ON CONFLICT (wallet_address) DO UPDATE SET
        bcc_unlocked_balance = user_balances.bcc_unlocked_balance + EXCLUDED.bcc_unlocked_balance,
        updated_at = NOW();

    -- Update member requirements
    PERFORM public.update_member_requirements(p_wallet_address);

    -- Create layer rewards for all root members in member's upline matrix
    FOR rec IN 
        SELECT DISTINCT r.root_wallet, r.layer
        FROM public.referrals r
        WHERE r.member_wallet = p_wallet_address
        AND r.layer = p_nft_level -- Same layer as NFT level
        AND r.is_active = true
    LOOP
        -- Create layer reward claim
        v_reward_result := public.create_layer_reward_claim(
            rec.root_wallet,
            p_wallet_address,
            rec.layer,
            p_nft_level,
            p_transaction_hash
        );

        v_layer_rewards := v_layer_rewards || v_reward_result;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'nft_level', p_nft_level,
        'total_paid_usdc', p_payment_amount_usdc,
        'bcc_unlocked', v_bcc_unlock_amount,
        'direct_referral_count', v_direct_referral_count,
        'layer_rewards_created', array_length(v_layer_rewards, 1),
        'layer_rewards', v_layer_rewards,
        'transaction_hash', p_transaction_hash
    );
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| public | process_nft_purchase_with_unlock             | p_wallet_address character varying, p_nft_level integer, p_payment_amount_usdc numeric, p_transaction_hash character varying                                                                                   | function      | CREATE OR REPLACE FUNCTION public.process_nft_purchase_with_unlock(p_wallet_address character varying, p_nft_level integer, p_payment_amount_usdc numeric, p_transaction_hash character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_required_amount DECIMAL(18,6);
    v_bcc_unlock_amount DECIMAL(18,8);
BEGIN
    -- Calculate required payment
    v_required_amount := public.calculate_total_nft_cost(p_nft_level);

    -- Verify payment amount
    IF p_payment_amount_usdc < v_required_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient payment',
            'required', v_required_amount,
            'received', p_payment_amount_usdc
        );
    END IF;

    -- Calculate BCC unlock amount (same as level * 50 + 50)
    v_bcc_unlock_amount := (p_nft_level * 50.0 + 50.0);

    -- Update member level
    UPDATE public.members SET
        current_level = GREATEST(current_level, p_nft_level),
        last_upgrade_at = NOW(),
        updated_at = NOW()
    WHERE wallet_address = p_wallet_address;

    -- Update user balances
    INSERT INTO public.user_balances (
        wallet_address,
        bcc_transferable,
        bcc_unlocked_balance
    ) VALUES (
        p_wallet_address,
        0, -- No new transferable BCC from purchases
        v_bcc_unlock_amount
    ) ON CONFLICT (wallet_address) DO UPDATE SET
        bcc_unlocked_balance = user_balances.bcc_unlocked_balance + EXCLUDED.bcc_unlocked_balance,
        updated_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'nft_level', p_nft_level,
        'total_paid', p_payment_amount_usdc,
        'bcc_unlocked', v_bcc_unlock_amount,
        'transaction_hash', p_transaction_hash
    );
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| public | process_referral_link                        | p_referral_token character varying, p_claimer_wallet character varying                                                                                                                                         | function      | CREATE OR REPLACE FUNCTION public.process_referral_link(p_referral_token character varying, p_claimer_wallet character varying DEFAULT NULL::character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_referral RECORD;
    v_claimed_wallets JSONB;
    v_is_registration BOOLEAN := p_claimer_wallet IS NOT NULL;
BEGIN
    -- Get referral link record
    SELECT * INTO v_referral
    FROM public.referral_links
    WHERE referral_token = p_referral_token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR total_registrations < max_uses);

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid or expired referral link'
        );
    END IF;

    -- Update click count
    UPDATE public.referral_links SET
        total_clicks = total_clicks + 1,
        updated_at = NOW()
    WHERE id = v_referral.id;

    -- If this is a registration (wallet provided)
    IF v_is_registration THEN
        -- Check if wallet already used this referral
        v_claimed_wallets := v_referral.claimed_by_wallets;

        IF NOT (v_claimed_wallets @> to_jsonb(p_claimer_wallet)) THEN
            -- Add wallet to claimed list
            v_claimed_wallets := v_claimed_wallets || to_jsonb(p_claimer_wallet);

            -- Update referral record
            UPDATE public.referral_links SET
                claimed_by_wallets = v_claimed_wallets,
                total_registrations = total_registrations + 1,
                updated_at = NOW()
            WHERE id = v_referral.id;

            -- Update user's referrer (if user exists)
            UPDATE public.users SET
                referrer_wallet = v_referral.referrer_wallet,
                updated_at = NOW()
            WHERE wallet_address = p_claimer_wallet;

            RETURN jsonb_build_object(
                'success', true,
                'action', 'registration_claimed',
                'referrer_wallet', v_referral.referrer_wallet,
                'referral_token', p_referral_token,
                'claimed_at', NOW()
            );
        ELSE
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Referral link already used by this wallet'
            );
        END IF;
    ELSE
        -- Just a click tracking
        RETURN jsonb_build_object(
            'success', true,
            'action', 'click_tracked',
            'referrer_wallet', v_referral.referrer_wallet,
            'referral_token', p_referral_token,
            'referral_url', v_referral.referral_url
        );
    END IF;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| public | process_referral_rewards                     | p_new_member_wallet text, p_activation_level integer                                                                                                                                                           | function      | CREATE OR REPLACE FUNCTION public.process_referral_rewards(p_new_member_wallet text, p_activation_level integer DEFAULT 1)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    referral_chain RECORD;
    reward_amount INTEGER;
    layer_count INTEGER := 0;
    total_rewards INTEGER := 0;
    reward_results JSON[] := ARRAY[]::JSON[];
BEGIN
    -- Only process rewards for activated members
    IF NOT EXISTS (SELECT 1 FROM public.members WHERE wallet_address = LOWER(p_new_member_wallet) AND is_activated = true) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Member not activated - no rewards processed'
        );
    END IF;

    -- Walk up the referral chain and distribute rewards
    FOR referral_chain IN 
        WITH RECURSIVE referral_path AS (
            -- Start with the new member's direct referrer
            SELECT r.root_wallet, r.member_wallet, r.parent_wallet, 1 as depth
            FROM public.referrals r
            WHERE r.member_wallet = LOWER(p_new_member_wallet)

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
        'new_member', LOWER(p_new_member_wallet),
        'total_rewards_distributed', total_rewards,
        'layers_processed', layer_count,
        'reward_details', reward_results
    );
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| public | process_reward_system_maintenance            |                                                                                                                                                                                                                | function      | CREATE OR REPLACE FUNCTION public.process_reward_system_maintenance()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_expired_result JSONB;
    v_requirements_updated INTEGER := 0;
    rec RECORD;
BEGIN
    -- Process expired rewards
    v_expired_result := public.process_expired_rewards();

    -- Update member requirements for all active members
    FOR rec IN SELECT wallet_address FROM public.members WHERE is_activated = true LOOP
        PERFORM public.update_member_requirements(rec.wallet_address);
        v_requirements_updated := v_requirements_updated + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'expired_rewards_processed', v_expired_result,
        'member_requirements_updated', v_requirements_updated,
        'processed_at', NOW()
    );
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| public | run_scheduled_cleanup                        |                                                                                                                                                                                                                | function      | CREATE OR REPLACE FUNCTION public.run_scheduled_cleanup()
 RETURNS json
 LANGUAGE plpgsql
AS $function$
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
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| public | set_member_activation_pending                | p_admin_wallet character varying, p_target_wallet character varying, p_pending_hours integer, p_reason text                                                                                                    | function      | CREATE OR REPLACE FUNCTION public.set_member_activation_pending(p_admin_wallet character varying, p_target_wallet character varying, p_pending_hours integer, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_is_admin BOOLEAN := false;
    v_max_hours INTEGER;
    v_min_hours INTEGER;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Check if requesting user is admin
    SELECT is_admin INTO v_is_admin 
    FROM public.users 
    WHERE wallet_address = p_admin_wallet;

    IF NOT COALESCE(v_is_admin, false) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Admin privileges required'
        );
    END IF;

    -- Check if admin override is enabled
    IF NOT (SELECT value::boolean FROM public.system_settings WHERE key = 'admin_can_override_pending') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Admin pending override is disabled'
        );
    END IF;

    -- Validate pending hours range
    SELECT value::integer INTO v_max_hours FROM public.system_settings WHERE key = 'max_pending_hours';
    SELECT value::integer INTO v_min_hours FROM public.system_settings WHERE key = 'min_pending_hours';

    IF p_pending_hours < COALESCE(v_min_hours, 1) OR p_pending_hours > COALESCE(v_max_hours, 168) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Pending hours must be between %s and %s', COALESCE(v_min_hours, 1), COALESCE(v_max_hours, 168))
        );
    END IF;

    -- Calculate expiry time
    v_expires_at := NOW() + (p_pending_hours || ' hours')::INTERVAL;

    -- Update member record
    UPDATE public.members SET
        pending_activation_hours = p_pending_hours,
        activation_expires_at = v_expires_at,
        admin_set_pending = true,
        admin_wallet = p_admin_wallet,
        updated_at = NOW()
    WHERE wallet_address = p_target_wallet;

    -- Log admin action
    INSERT INTO public.admin_actions (
        admin_wallet,
        action_type,
        target_wallet,
        action_data,
        reason
    ) VALUES (
        p_admin_wallet,
        'set_activation_pending',
        p_target_wallet,
        jsonb_build_object(
            'pending_hours', p_pending_hours,
            'expires_at', v_expires_at
        ),
        p_reason
    );

    RETURN jsonb_build_object(
        'success', true,
        'pending_hours', p_pending_hours,
        'expires_at', v_expires_at,
        'message', format('Activation pending set to %s hours for %s', p_pending_hours, p_target_wallet)
    );
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| public | spend_bcc_tokens                             | p_wallet_address character varying, p_amount_bcc numeric, p_item_type text, p_item_id uuid, p_transaction_id text                                                                                              | function      | CREATE OR REPLACE FUNCTION public.spend_bcc_tokens(p_wallet_address character varying, p_amount_bcc numeric, p_item_type text, p_item_id uuid, p_transaction_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    current_balance DECIMAL(18,8);
    result JSONB;
BEGIN
    -- Get current balance
    SELECT bcc_transferable INTO current_balance
    FROM public.user_balances
    WHERE wallet_address = p_wallet_address;

    IF current_balance IS NULL OR current_balance < p_amount_bcc THEN
        result := jsonb_build_object(
            'success', false,
            'error', 'Insufficient BCC balance',
            'required', p_amount_bcc,
            'available', COALESCE(current_balance, 0)
        );
        RETURN result;
    END IF;

    -- Deduct BCC from balance
    UPDATE public.user_balances
    SET bcc_transferable = bcc_transferable - p_amount_bcc,
        updated_at = NOW()
    WHERE wallet_address = p_wallet_address;

    -- Create purchase record based on item type
    IF p_item_type IN ('merchant_nft', 'advertisement_nft') THEN
        INSERT INTO public.nft_purchases (
            id,
            buyer_wallet,
            nft_id,
            nft_type,
            price_usdt,
            price_bcc,
            payment_method,
            status,
            purchased_at,
            metadata
        ) VALUES (
            uuid_generate_v4(),
            p_wallet_address,
            p_item_id,
            p_item_type,
            0,
            p_amount_bcc,
            'bcc_tokens',
            'completed',
            NOW(),
            jsonb_build_object('transaction_id', p_transaction_id)
        );
    ELSIF p_item_type = 'course' THEN
        INSERT INTO public.course_activations (
            wallet_address,
            course_id,
            activation_type,
            activated_at,
            expires_at,
            metadata
        ) VALUES (
            p_wallet_address,
            p_item_id,
            'bcc_purchase',
            NOW(),
            NOW() + INTERVAL '1 year',
            jsonb_build_object('transaction_id', p_transaction_id, 'amount_paid', p_amount_bcc)
        );
    END IF;

    result := jsonb_build_object(
        'success', true,
        'transaction_id', p_transaction_id,
        'amount_spent', p_amount_bcc,
        'remaining_balance', current_balance - p_amount_bcc
    );

    RETURN result;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| public | toggle_activation_pending_global             | p_admin_wallet character varying, p_enabled boolean, p_reason text                                                                                                                                             | function      | CREATE OR REPLACE FUNCTION public.toggle_activation_pending_global(p_admin_wallet character varying, p_enabled boolean, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_is_admin BOOLEAN := false;
BEGIN
    -- Check if requesting user is admin
    SELECT is_admin INTO v_is_admin 
    FROM public.users 
    WHERE wallet_address = p_admin_wallet;

    IF NOT COALESCE(v_is_admin, false) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Admin privileges required'
        );
    END IF;

    -- Update global setting
    UPDATE public.system_settings SET
        value = p_enabled::text,
        updated_at = NOW()
    WHERE key = 'activation_pending_enabled';

    -- Log admin action
    INSERT INTO public.admin_actions (
        admin_wallet,
        action_type,
        action_data,
        reason
    ) VALUES (
        p_admin_wallet,
        'toggle_activation_pending_global',
        jsonb_build_object(
            'enabled', p_enabled
        ),
        p_reason
    );

    RETURN jsonb_build_object(
        'success', true,
        'enabled', p_enabled,
        'message', format('Global activation pending %s', CASE WHEN p_enabled THEN 'enabled' ELSE 'disabled' END)
    );
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| public | trigger_referral_rewards                     |                                                                                                                                                                                                                | function      | CREATE OR REPLACE FUNCTION public.trigger_referral_rewards()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| public | trigger_update_matrix_summary                |                                                                                                                                                                                                                | function      | CREATE OR REPLACE FUNCTION public.trigger_update_matrix_summary()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Update matrix summary for the affected layer
    PERFORM public.update_matrix_layer_summary(
        CASE WHEN TG_OP = 'DELETE' THEN OLD.root_wallet ELSE NEW.root_wallet END,
        CASE WHEN TG_OP = 'DELETE' THEN OLD.layer ELSE NEW.layer END
    );

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| public | unlock_bcc_for_nft_level                     | p_wallet_address character varying, p_nft_level integer                                                                                                                                                        | function      | CREATE OR REPLACE FUNCTION public.unlock_bcc_for_nft_level(p_wallet_address character varying, p_nft_level integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_member public.members%ROWTYPE;
    v_unlock_amount DECIMAL(18,8);
    v_current_locked DECIMAL(18,8);
BEGIN
    -- Get member information
    SELECT * INTO v_member FROM public.members WHERE wallet_address = p_wallet_address;

    IF NOT FOUND OR NOT v_member.is_activated THEN
        RETURN jsonb_build_object('success', false, 'error', 'Member not found or not activated');
    END IF;

    -- Skip if no tier (beyond 268,140th member)
    IF v_member.tier_level IS NULL THEN
        RETURN jsonb_build_object('success', true, 'unlocked_amount', 0, 'reason', 'No tier rewards available');
    END IF;

    -- Calculate unlock amount for this level
    v_unlock_amount := public.calculate_bcc_unlock(v_member.tier_level, p_nft_level);

    -- Get current locked balance
    SELECT bcc_locked INTO v_current_locked 
    FROM public.user_balances 
    WHERE wallet_address = p_wallet_address;

    -- Ensure we don't unlock more than available
    v_unlock_amount := LEAST(v_unlock_amount, COALESCE(v_current_locked, 0));

    IF v_unlock_amount > 0 THEN
        -- Transfer from locked to transferable
        UPDATE public.user_balances SET
            bcc_locked = bcc_locked - v_unlock_amount,
            bcc_transferable = bcc_transferable + v_unlock_amount,
            updated_at = NOW()
        WHERE wallet_address = p_wallet_address;

        -- Update member's remaining locked amount
        UPDATE public.members SET
            bcc_locked_remaining = GREATEST(0, bcc_locked_remaining - v_unlock_amount),
            updated_at = NOW()
        WHERE wallet_address = p_wallet_address;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'unlocked_amount', v_unlock_amount,
        'nft_level', p_nft_level,
        'tier', v_member.tier_level,
        'remaining_locked', GREATEST(0, v_member.bcc_locked_remaining - v_unlock_amount)
    );
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| public | update_matrix_layer_summary                  | p_root_wallet character varying, p_layer integer                                                                                                                                                               | function      | CREATE OR REPLACE FUNCTION public.update_matrix_layer_summary(p_root_wallet character varying, p_layer integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    total_pos INTEGER;
    filled_pos INTEGER;
    active_count INTEGER;
    completion_rate DECIMAL(5,2);
BEGIN
    -- Calculate positions for this layer
    total_pos := POWER(3, p_layer);

    -- Count filled positions
    SELECT COUNT(*) INTO filled_pos
    FROM public.referrals
    WHERE root_wallet = p_root_wallet AND layer = p_layer;

    -- Count active members
    SELECT COUNT(*) INTO active_count
    FROM public.referrals r
    JOIN public.members m ON r.member_wallet = m.wallet_address
    WHERE r.root_wallet = p_root_wallet 
      AND r.layer = p_layer 
      AND m.is_activated = true;

    -- Calculate completion rate
    completion_rate := CASE 
        WHEN total_pos > 0 THEN (filled_pos::DECIMAL / total_pos) * 100
        ELSE 0 
    END;

    -- Insert or update summary
    INSERT INTO public.matrix_layer_summary (
        root_wallet,
        layer,
        total_positions,
        filled_positions,
        active_members,
        layer_completion_rate,
        last_updated
    ) VALUES (
        p_root_wallet,
        p_layer,
        total_pos,
        filled_pos,
        active_count,
        completion_rate,
        NOW()
    )
    ON CONFLICT (root_wallet, layer)
    DO UPDATE SET
        total_positions = EXCLUDED.total_positions,
        filled_positions = EXCLUDED.filled_positions,
        active_members = EXCLUDED.active_members,
        layer_completion_rate = EXCLUDED.layer_completion_rate,
        last_updated = NOW();
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| public | update_member_requirements                   | p_wallet_address character varying                                                                                                                                                                             | function      | CREATE OR REPLACE FUNCTION public.update_member_requirements(p_wallet_address character varying)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_direct_count INTEGER;
BEGIN
    -- Count direct referrals
    v_direct_count := public.count_direct_referrals(p_wallet_address);

    -- Update member requirements
    INSERT INTO public.member_requirements (
        wallet_address,
        direct_referral_count,
        can_purchase_level_2,
        last_updated
    ) VALUES (
        p_wallet_address,
        v_direct_count,
        (v_direct_count >= 3),
        NOW()
    ) ON CONFLICT (wallet_address) DO UPDATE SET
        direct_referral_count = EXCLUDED.direct_referral_count,
        can_purchase_level_2 = (EXCLUDED.direct_referral_count >= 3),
        last_updated = NOW();
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| public | update_updated_at_column                     |                                                                                                                                                                                                                | function      | CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| public | update_withdrawal_limits                     | p_user_wallet text, p_amount_usd numeric                                                                                                                                                                       | function      | CREATE OR REPLACE FUNCTION public.update_withdrawal_limits(p_user_wallet text, p_amount_usd numeric)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE user_withdrawal_limits
    SET 
        daily_withdrawn_usd = daily_withdrawn_usd + p_amount_usd,
        monthly_withdrawn_usd = monthly_withdrawn_usd + p_amount_usd,
        last_withdrawal = NOW(),
        updated_at = NOW()
    WHERE user_wallet = p_user_wallet;

    RETURN FOUND;

EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| public | upsert_user                                  | p_wallet_address character varying, p_referrer_wallet character varying, p_username text, p_email text                                                                                                         | function      | CREATE OR REPLACE FUNCTION public.upsert_user(p_wallet_address character varying, p_referrer_wallet character varying DEFAULT NULL::character varying, p_username text DEFAULT NULL::text, p_email text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB;
    user_exists BOOLEAN;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM public.users WHERE wallet_address = p_wallet_address)
    INTO user_exists;

    IF user_exists THEN
        -- Update existing user
        UPDATE public.users
        SET username = COALESCE(p_username, username),
            email = COALESCE(p_email, email),
            updated_at = NOW()
        WHERE wallet_address = p_wallet_address;

        result := jsonb_build_object(
            'success', true,
            'action', 'updated',
            'wallet_address', p_wallet_address
        );
    ELSE
        -- Create new user
        INSERT INTO public.users (
            wallet_address,
            referrer_wallet,
            username,
            email,
            created_at,
            updated_at
        ) VALUES (
            p_wallet_address,
            p_referrer_wallet,
            p_username,
            p_email,
            NOW(),
            NOW()
        );

        -- Create initial member record
        INSERT INTO public.members (
            wallet_address,
            created_at,
            updated_at
        ) VALUES (
            p_wallet_address,
            NOW(),
            NOW()
        );

        -- Create initial balance record
        INSERT INTO public.user_balances (
            wallet_address,
            created_at,
            updated_at
        ) VALUES (
            p_wallet_address,
            NOW(),
            NOW()
        );

        result := jsonb_build_object(
            'success', true,
            'action', 'created',
            'wallet_address', p_wallet_address
        );
    END IF;

    RETURN result;
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| public | validate_wallet_signature                    | p_message text, p_signature text, p_wallet_address character varying                                                                                                                                           | function      | CREATE OR REPLACE FUNCTION public.validate_wallet_signature(p_message text, p_signature text, p_wallet_address character varying)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- In a real implementation, this would verify the cryptographic signature
    -- For now, return true for development
    RETURN is_valid_wallet_address(p_wallet_address);
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| public | withdraw_reward_balance                      | p_wallet_address character varying, p_amount_usdc numeric, p_withdrawal_address character varying                                                                                                              | function      | CREATE OR REPLACE FUNCTION public.withdraw_reward_balance(p_wallet_address character varying, p_amount_usdc numeric, p_withdrawal_address character varying DEFAULT NULL::character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_available_balance DECIMAL(18,6);
    v_withdrawal_address VARCHAR(42);
BEGIN
    -- Get available claimable balance
    SELECT COALESCE(claimable_reward_balance_usdc, 0) INTO v_available_balance
    FROM public.user_balances
    WHERE wallet_address = p_wallet_address;

    IF v_available_balance < p_amount_usdc THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient reward balance',
            'available_balance', v_available_balance,
            'requested_amount', p_amount_usdc
        );
    END IF;

    -- Use provided withdrawal address or default to member wallet
    v_withdrawal_address := COALESCE(p_withdrawal_address, p_wallet_address);

    -- Update balances
    UPDATE public.user_balances SET
        claimable_reward_balance_usdc = claimable_reward_balance_usdc - p_amount_usdc,
        total_rewards_withdrawn_usdc = total_rewards_withdrawn_usdc + p_amount_usdc,
        updated_at = NOW()
    WHERE wallet_address = p_wallet_address;

    -- TODO: Integrate with actual USDC withdrawal system here
    -- This would trigger external payment processing

    RETURN jsonb_build_object(
        'success', true,
        'withdrawn_amount_usdc', p_amount_usdc,
        'withdrawal_address', v_withdrawal_address,
        'remaining_balance_usdc', v_available_balance - p_amount_usdc,
        'processed_at', NOW()
    );
END;
$function$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
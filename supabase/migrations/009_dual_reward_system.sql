-- =============================================
-- Beehive Platform - Dual Reward System Implementation
-- Complete Layer Rewards + Tiered BCC Locked Rewards + Platform Fees
-- =============================================

-- First, let's update the pricing and fee structure
UPDATE public.nft_levels SET price_usdc = 100.00 WHERE level = 1;
UPDATE public.nft_levels SET price_usdc = 150.00 WHERE level = 2;
UPDATE public.nft_levels SET price_usdc = 200.00 WHERE level = 3;
-- Continue with existing pricing for higher levels

-- Add platform activation fee configuration
CREATE TABLE IF NOT EXISTS public.platform_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_type VARCHAR(50) NOT NULL,
    nft_level INTEGER,
    fee_amount_usdc DECIMAL(18,6) NOT NULL,
    fee_percentage DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert platform activation fee for Level 1 only (will be corrected in migration 012)
-- This initial implementation will be overridden by migration 012
INSERT INTO public.platform_fees (fee_type, nft_level, fee_amount_usdc) VALUES
('activation_fee', 1, 30.00);

-- =============================================
-- Update Layer Rules for Matrix Reward System
-- =============================================

-- Clear existing reward rules to rebuild with new logic
DELETE FROM public.reward_rules;

-- Layer rewards: 72-hour claim window with correct linear pricing (Level 1=$100, +$50 per level)
-- Root member gets 100% of NFT price when someone in their matrix upgrades to same level
INSERT INTO public.reward_rules (rule_type, layer, fixed_amount_usdc, requires_activation, claim_window_hours, max_claims_per_user) VALUES
('layer_reward', 1, 100.00, true, 72, 3),
('layer_reward', 2, 150.00, true, 72, 9),
('layer_reward', 3, 200.00, true, 72, 27),
('layer_reward', 4, 250.00, true, 72, 81),
('layer_reward', 5, 300.00, true, 72, 243),
('layer_reward', 6, 350.00, true, 72, 729),
('layer_reward', 7, 400.00, true, 72, 2187),
('layer_reward', 8, 450.00, true, 72, 6561),
('layer_reward', 9, 500.00, true, 72, 19683),
('layer_reward', 10, 550.00, true, 72, 59049),
('layer_reward', 11, 600.00, true, 72, 177147),
('layer_reward', 12, 650.00, true, 72, 531441),
('layer_reward', 13, 700.00, true, 72, 1594323),
('layer_reward', 14, 750.00, true, 72, 4782969),
('layer_reward', 15, 800.00, true, 72, 14348907),
('layer_reward', 16, 850.00, true, 72, 43046721),
('layer_reward', 17, 900.00, true, 72, 129140163),
('layer_reward', 18, 950.00, true, 72, 387420489),
('layer_reward', 19, 1000.00, true, 72, 1162261467);

-- =============================================
-- Tiered BCC Locked Reward System
-- =============================================

-- Create table for member activation tiers
CREATE TABLE IF NOT EXISTS public.member_activation_tiers (
    tier INTEGER PRIMARY KEY,
    min_activation_rank INTEGER NOT NULL,
    max_activation_rank INTEGER NOT NULL,
    base_bcc_locked DECIMAL(18,8) NOT NULL,
    unlock_per_level DECIMAL(18,8) NOT NULL,
    tier_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert tier configuration
INSERT INTO public.member_activation_tiers (tier, min_activation_rank, max_activation_rank, base_bcc_locked, unlock_per_level, tier_name) VALUES
-- Tier 1: 1st-9,999th members get full amount
(1, 1, 9999, 10450.0000, 100.0000, 'Tier 1 - Early Adopters'),

-- Tier 2: 10,000th-29,999th members get half
(2, 10000, 29999, 5225.0000, 50.0000, 'Tier 2 - Growth Phase'),

-- Tier 3: 30,000th-99,999th members get quarter  
(3, 30000, 99999, 2612.5000, 25.0000, 'Tier 3 - Expansion'),

-- Tier 4: 100,000th-268,140th members get eighth
(4, 100000, 268140, 1306.25, 12.5000, 'Tier 4 - Mass Adoption');

-- Add activation rank tracking to members table
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS activation_rank INTEGER,
ADD COLUMN IF NOT EXISTS bcc_locked_initial DECIMAL(18,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bcc_locked_remaining DECIMAL(18,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tier_level INTEGER REFERENCES public.member_activation_tiers(tier);

-- Create sequence for activation ranking
CREATE SEQUENCE IF NOT EXISTS public.activation_rank_seq START 1;

-- =============================================
-- BCC Locked Rewards Functions
-- =============================================

-- Function to get member's tier based on activation rank
CREATE OR REPLACE FUNCTION public.get_member_tier(p_activation_rank INTEGER)
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql;

-- Function to calculate BCC unlock amount for level
CREATE OR REPLACE FUNCTION public.calculate_bcc_unlock(
    p_tier INTEGER,
    p_nft_level INTEGER
) RETURNS DECIMAL(18,8) AS $$
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
$$ LANGUAGE plpgsql;

-- Function to activate member with tier rewards
CREATE OR REPLACE FUNCTION public.activate_member_with_tier_rewards(
    p_wallet_address VARCHAR(42)
) RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unlock BCC when claiming NFT level
CREATE OR REPLACE FUNCTION public.unlock_bcc_for_nft_level(
    p_wallet_address VARCHAR(42),
    p_nft_level INTEGER
) RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Updated Layer Reward Distribution with Root Level Requirements
-- =============================================

-- Function to check if root member can receive layer reward
CREATE OR REPLACE FUNCTION public.can_receive_layer_reward(
    p_root_wallet VARCHAR(42),
    p_layer INTEGER,
    p_claim_number INTEGER
) RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql;

-- Enhanced layer reward creation with level requirements
-- DISABLED: This function references reward_claims table which is created in migration 014
-- Migration 014 provides the complete correct reward system, so this is not needed
/* CREATE OR REPLACE FUNCTION public.create_layer_reward_with_requirements(
    p_root_wallet VARCHAR(42),
    p_member_wallet VARCHAR(42),
    p_layer INTEGER,
    p_nft_level INTEGER,
    p_upgrade_price_usdc DECIMAL(18,6)
) RETURNS JSONB AS $$
DECLARE
    v_claim_count INTEGER;
    v_can_receive BOOLEAN;
    v_reward_amount DECIMAL(18,6);
    v_claim_id UUID;
BEGIN
    -- Count existing claims for this root at this layer
    SELECT COUNT(*) INTO v_claim_count
    FROM public.reward_claims rc
    INNER JOIN public.reward_rules rr ON rc.reward_rule_id = rr.id
    WHERE rc.recipient_wallet = p_root_wallet 
      AND rr.rule_type = 'layer_reward'
      AND rr.layer = p_layer
      AND rc.claim_status IN ('claimed', 'pending');
    
    -- Check if root can receive this reward
    v_can_receive := public.can_receive_layer_reward(p_root_wallet, p_layer, v_claim_count + 1);
    
    IF NOT v_can_receive THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Root member does not meet requirements for layer ' || p_layer || ' reward',
            'required_level', CASE WHEN p_layer = 1 AND v_claim_count >= 2 THEN 2 ELSE p_layer + 1 END,
            'claim_number', v_claim_count + 1
        );
    END IF;
    
    -- Get reward amount for this layer
    SELECT fixed_amount_usdc INTO v_reward_amount
    FROM public.reward_rules
    WHERE rule_type = 'layer_reward' AND layer = p_layer AND is_active = true;
    
    -- Create reward claim
    INSERT INTO public.reward_claims (
        recipient_wallet,
        reward_rule_id,
        source_transaction_id,
        payer_wallet,
        layer,
        nft_level,
        reward_amount_usdc,
        reward_amount_bcc,
        expires_at,
        auto_claim_eligible,
        metadata
    ) SELECT 
        p_root_wallet,
        id,
        'layer_' || p_layer || '_' || p_member_wallet || '_' || p_nft_level,
        p_member_wallet,
        p_layer,
        p_nft_level,
        v_reward_amount,
        0, -- No BCC for layer rewards
        NOW() + INTERVAL '168 hours',
        false, -- Layer rewards require manual claiming
        jsonb_build_object(
            'claim_number', v_claim_count + 1,
            'max_claims', max_claims_per_user,
            'upgrader_wallet', p_member_wallet
        )
    FROM public.reward_rules
    WHERE rule_type = 'layer_reward' AND layer = p_layer AND is_active = true
    RETURNING id INTO v_claim_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'claim_id', v_claim_id,
        'reward_amount', v_reward_amount,
        'layer', p_layer,
        'claim_number', v_claim_count + 1,
        'root_wallet', p_root_wallet
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; */

-- =============================================
-- Updated Purchase Processing Function
-- =============================================

-- DISABLED: This function also references reward_claims table which is created in migration 014
-- Migration 014 provides the complete correct purchase processing function
/* CREATE OR REPLACE FUNCTION public.process_nft_upgrade_with_dual_rewards(
    p_wallet_address VARCHAR(42),
    p_nft_level INTEGER,
    p_payment_amount_usdc DECIMAL(18,6),
    p_transaction_hash VARCHAR(66)
) RETURNS JSONB AS $$
DECLARE
    v_nft_price DECIMAL(18,6);
    v_platform_fee DECIMAL(18,6);
    v_total_required DECIMAL(18,6);
    v_unlock_result JSONB;
    v_layer_rewards JSONB[] := '{}';
    v_referral public.referrals%ROWTYPE;
    v_layer_reward_result JSONB;
    v_pending_timer_result JSONB;
BEGIN
    -- Get NFT price and platform fee
    SELECT price_usdc INTO v_nft_price FROM public.nft_levels WHERE level = p_nft_level;
    SELECT fee_amount_usdc INTO v_platform_fee FROM public.platform_fees 
    WHERE fee_type = 'activation_fee' AND nft_level = p_nft_level AND is_active = true;
    
    v_total_required := v_nft_price + COALESCE(v_platform_fee, 0);
    
    -- Verify payment amount
    IF p_payment_amount_usdc < v_total_required THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient payment amount',
            'required', v_total_required,
            'received', p_payment_amount_usdc
        );
    END IF;
    
    -- Update member level
    UPDATE public.members SET
        current_level = GREATEST(current_level, p_nft_level),
        levels_owned = levels_owned || jsonb_build_array(p_nft_level),
        last_upgrade_at = NOW(),
        updated_at = NOW()
    WHERE wallet_address = p_wallet_address;
    
    -- 1. Unlock tiered BCC rewards for this level
    v_unlock_result := public.unlock_bcc_for_nft_level(p_wallet_address, p_nft_level);
    
    -- 2. Distribute layer rewards to all matrix roots
    FOR v_referral IN
        SELECT * FROM public.referrals 
        WHERE member_wallet = p_wallet_address 
        ORDER BY layer ASC
    LOOP
        v_layer_reward_result := public.create_layer_reward_with_requirements(
            v_referral.root_wallet,
            p_wallet_address,
            v_referral.layer,
            p_nft_level,
            v_nft_price -- Only NFT price, not including platform fee
        );
        
        v_layer_rewards := array_append(v_layer_rewards, v_layer_reward_result);
    END LOOP;
    
    -- 3. Set pending timer for next level (72 hours default)
    v_pending_timer_result := public.create_countdown_timer(
        p_wallet_address,
        'upgrade_pending',
        'Level ' || (p_nft_level + 1) || ' Upgrade Available',
        72, -- 72 hours pending time
        'Next level upgrade unlocked after pending period',
        'auto_activate_level_' || (p_nft_level + 1)
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'nft_level', p_nft_level,
        'payment_breakdown', jsonb_build_object(
            'nft_price', v_nft_price,
            'platform_fee', v_platform_fee,
            'total_paid', p_payment_amount_usdc
        ),
        'bcc_unlock', v_unlock_result,
        'layer_rewards_created', array_length(v_layer_rewards, 1),
        'layer_rewards', v_layer_rewards,
        'pending_timer', v_pending_timer_result,
        'transaction_hash', p_transaction_hash
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; */

-- =============================================
-- Create Views for New System
-- =============================================

-- View for member tier information
CREATE OR REPLACE VIEW public.member_tier_info AS
SELECT 
    m.wallet_address,
    m.activation_rank,
    m.tier_level,
    mat.tier_name,
    mat.base_bcc_locked,
    mat.unlock_per_level,
    m.bcc_locked_initial,
    m.bcc_locked_remaining,
    
    -- Calculate total BCC that will be unlocked at level 19
    CASE 
        WHEN m.tier_level IS NOT NULL THEN 
            mat.unlock_per_level + (18 * (mat.unlock_per_level * 0.5))
        ELSE 0 
    END as max_bcc_unlock,
    
    -- Calculate BCC unlocked so far
    m.bcc_locked_initial - m.bcc_locked_remaining as bcc_unlocked_so_far,
    
    m.is_activated,
    m.activated_at
FROM public.members m
LEFT JOIN public.member_activation_tiers mat ON m.tier_level = mat.tier
ORDER BY m.activation_rank ASC;

-- View for layer reward eligibility
-- DISABLED: This view references reward_claims table which is created in migration 014
-- Migration 014 provides complete reward views
/* CREATE OR REPLACE VIEW public.layer_reward_eligibility AS
SELECT 
    m.wallet_address,
    m.current_level,
    lr.layer,
    lr.layer_name,
    rr.fixed_amount_usdc as reward_per_member,
    rr.max_claims_per_user,
    
    -- Count current claims for this layer
    COALESCE(claim_counts.current_claims, 0) as current_claims,
    rr.max_claims_per_user - COALESCE(claim_counts.current_claims, 0) as remaining_claims,
    
    -- Eligibility status
    CASE 
        WHEN NOT m.is_activated THEN 'Not Activated'
        WHEN m.current_level < lr.layer THEN 'Level Too Low (Need Level ' || lr.layer || ')'
        WHEN m.pending_activation_hours > 0 AND m.activation_expires_at > NOW() THEN 'Pending Activation'
        WHEN COALESCE(claim_counts.current_claims, 0) >= rr.max_claims_per_user THEN 'Max Claims Reached'
        ELSE 'Eligible'
    END as eligibility_status
    
FROM public.members m
CROSS JOIN public.layer_rules lr
LEFT JOIN public.reward_rules rr ON rr.rule_type = 'layer_reward' AND rr.layer = lr.layer AND rr.is_active = true
LEFT JOIN (
    SELECT 
        rc.recipient_wallet,
        rr.layer,
        COUNT(*) as current_claims
    FROM public.reward_claims rc
    INNER JOIN public.reward_rules rr ON rc.reward_rule_id = rr.id
    WHERE rr.rule_type = 'layer_reward' AND rc.claim_status IN ('claimed', 'pending')
    GROUP BY rc.recipient_wallet, rr.layer
) claim_counts ON claim_counts.recipient_wallet = m.wallet_address AND claim_counts.layer = lr.layer
ORDER BY m.wallet_address, lr.layer; */

-- =============================================
-- Update Permissions
-- =============================================

GRANT SELECT ON public.platform_fees TO authenticated;
GRANT SELECT ON public.member_activation_tiers TO authenticated, anon;
GRANT SELECT ON public.member_tier_info TO authenticated;
-- GRANT SELECT ON public.layer_reward_eligibility TO authenticated; -- View commented out

-- End of dual reward system migration
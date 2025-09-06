-- =============================================
-- Beehive Platform - Correct Matrix Reward System
-- ONLY Layer Rewards + Pending System + Level Requirements
-- Apply AFTER 013, replaces reward logic
-- =============================================

-- =============================================
-- 1. CLEAR INCORRECT REWARD RULES
-- =============================================

-- Remove all direct referral rewards (incorrect)
DELETE FROM public.reward_rules WHERE rule_type = 'direct_referral';

-- Update existing layer reward rules with correct pending logic
UPDATE public.reward_rules SET
    claim_window_hours = 72, -- 72-hour pending period
    auto_claim = false       -- Manual claiming required
WHERE rule_type = 'layer_reward';

-- =============================================
-- 2. MEMBER REQUIREMENTS TABLE
-- =============================================

-- Track member requirements and direct referral counts
CREATE TABLE IF NOT EXISTS public.member_requirements (
    wallet_address VARCHAR(42) PRIMARY KEY REFERENCES public.members(wallet_address),
    direct_referral_count INTEGER DEFAULT 0,
    can_purchase_level_2 BOOLEAN DEFAULT false,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CHECK (direct_referral_count >= 0)
);

-- =============================================
-- 3. REWARD CLAIMS WITH PENDING SYSTEM
-- =============================================

-- Enhanced reward claims table for pending system
DROP TABLE IF EXISTS public.reward_claims CASCADE;

CREATE TABLE public.reward_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reward details
    root_wallet VARCHAR(42) NOT NULL REFERENCES public.members(wallet_address),
    triggering_member_wallet VARCHAR(42) NOT NULL REFERENCES public.members(wallet_address),
    layer INTEGER NOT NULL CHECK (layer >= 1 AND layer <= 19),
    nft_level INTEGER NOT NULL CHECK (nft_level >= 1 AND nft_level <= 19),
    
    -- Amounts
    reward_amount_usdc DECIMAL(18,6) NOT NULL,
    
    -- Status and timing
    status TEXT NOT NULL CHECK (status IN ('pending', 'claimable', 'claimed', 'expired', 'rolled_up')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL, -- 72 hours from creation
    claimed_at TIMESTAMPTZ,
    rolled_up_at TIMESTAMPTZ,
    rolled_up_to_wallet VARCHAR(42) REFERENCES public.members(wallet_address),
    
    -- Transaction details
    triggering_transaction_hash VARCHAR(66),
    claim_transaction_hash VARCHAR(66),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for reward_claims table
CREATE INDEX idx_reward_claims_root ON public.reward_claims(root_wallet);
CREATE INDEX idx_reward_claims_status ON public.reward_claims(status);
CREATE INDEX idx_reward_claims_expires ON public.reward_claims(expires_at);
CREATE INDEX idx_reward_claims_layer ON public.reward_claims(layer);

-- =============================================
-- 4. CORE REWARD PROCESSING FUNCTIONS
-- =============================================

-- Function to count direct referrals for a member
CREATE OR REPLACE FUNCTION public.count_direct_referrals(
    p_wallet_address VARCHAR(42)
) RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.referrals r
        WHERE r.root_wallet = p_wallet_address 
        AND r.layer = 1
        AND r.is_active = true
    );
END;
$$ LANGUAGE plpgsql;

-- Function to update member requirements
CREATE OR REPLACE FUNCTION public.update_member_requirements(
    p_wallet_address VARCHAR(42)
) RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;

-- Function to check if root can claim layer reward (updated with layer_rules)
CREATE OR REPLACE FUNCTION public.can_root_claim_layer_reward(
    p_root_wallet VARCHAR(42),
    p_layer INTEGER,
    p_layer_1_claim_count INTEGER DEFAULT 0
) RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql;

-- Function to create layer reward claim
CREATE OR REPLACE FUNCTION public.create_layer_reward_claim(
    p_root_wallet VARCHAR(42),
    p_triggering_member_wallet VARCHAR(42),
    p_layer INTEGER,
    p_nft_level INTEGER,
    p_transaction_hash VARCHAR(66)
) RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process NFT purchase with level requirements
CREATE OR REPLACE FUNCTION public.process_nft_purchase_with_requirements(
    p_wallet_address VARCHAR(42),
    p_nft_level INTEGER,
    p_payment_amount_usdc DECIMAL(18,6),
    p_transaction_hash VARCHAR(66)
) RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process expired rewards (rollup)
CREATE OR REPLACE FUNCTION public.process_expired_rewards() RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. VIEWS FOR REWARD MANAGEMENT
-- =============================================

-- Member requirements view
CREATE OR REPLACE VIEW public.member_requirements_view AS
SELECT 
    mr.wallet_address,
    u.username,
    mr.direct_referral_count,
    mr.can_purchase_level_2,
    m.current_level,
    mr.last_updated,
    
    -- Requirements status
    CASE 
        WHEN mr.can_purchase_level_2 THEN 'Can purchase Level 2'
        ELSE 'Needs ' || (3 - mr.direct_referral_count) || ' more direct referrals'
    END as level_2_status
    
FROM public.member_requirements mr
LEFT JOIN public.users u ON mr.wallet_address = u.wallet_address
LEFT JOIN public.members m ON mr.wallet_address = m.wallet_address
ORDER BY mr.direct_referral_count DESC;

-- Reward claims dashboard
CREATE OR REPLACE VIEW public.reward_claims_dashboard AS
SELECT 
    rc.id,
    rc.root_wallet,
    ru.username as root_username,
    rc.triggering_member_wallet,
    tu.username as triggering_member_username,
    rc.layer,
    rc.nft_level,
    rc.reward_amount_usdc,
    rc.status,
    rc.created_at,
    rc.expires_at,
    rc.claimed_at,
    rc.rolled_up_at,
    rc.rolled_up_to_wallet,
    
    -- Time remaining
    CASE 
        WHEN rc.status IN ('pending', 'claimable') AND rc.expires_at > NOW() 
        THEN rc.expires_at - NOW()
        ELSE INTERVAL '0'
    END as time_remaining,
    
    rc.metadata
    
FROM public.reward_claims rc
LEFT JOIN public.users ru ON rc.root_wallet = ru.wallet_address
LEFT JOIN public.users tu ON rc.triggering_member_wallet = tu.wallet_address
ORDER BY rc.created_at DESC;

-- =============================================
-- 6. GRANT PERMISSIONS
-- =============================================

GRANT SELECT ON public.member_requirements TO authenticated;
GRANT SELECT ON public.reward_claims TO authenticated;
GRANT SELECT ON public.member_requirements_view TO authenticated;
GRANT SELECT ON public.reward_claims_dashboard TO authenticated;

-- Enable RLS
ALTER TABLE public.member_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own requirements" ON public.member_requirements
    FOR SELECT TO authenticated
    USING (wallet_address = get_current_wallet_address());

CREATE POLICY "Users can view their own reward claims" ON public.reward_claims
    FOR SELECT TO authenticated
    USING (root_wallet = get_current_wallet_address());

-- =============================================
-- 7. BACKGROUND JOB FUNCTIONS
-- =============================================

-- Function to run periodically (every hour)
CREATE OR REPLACE FUNCTION public.process_reward_system_maintenance() RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. NOTIFICATION SYSTEM FOR 72-HOUR COUNTDOWN
-- =============================================

-- Create reward notifications table for countdown alerts
CREATE TABLE IF NOT EXISTS public.reward_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Notification details
    wallet_address VARCHAR(42) NOT NULL REFERENCES public.members(wallet_address),
    reward_claim_id UUID NOT NULL REFERENCES public.reward_claims(id),
    notification_type TEXT NOT NULL CHECK (notification_type IN ('pending_reward', 'expiring_soon', 'expired', 'claimed')),
    
    -- Message content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    countdown_hours INTEGER, -- Hours remaining to claim
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    is_sent BOOLEAN DEFAULT false,
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for reward_notifications table
CREATE INDEX idx_reward_notifications_wallet ON public.reward_notifications(wallet_address);
CREATE INDEX idx_reward_notifications_type ON public.reward_notifications(notification_type);
CREATE INDEX idx_reward_notifications_unread ON public.reward_notifications(is_read) WHERE is_read = false;

-- =============================================
-- 9. REWARD BALANCE SYSTEM (NOT DIRECT CLAIMING)
-- =============================================

-- Extend user_balances with reward tracking
ALTER TABLE public.user_balances ADD COLUMN IF NOT EXISTS pending_reward_balance_usdc DECIMAL(18,6) DEFAULT 0.00;
ALTER TABLE public.user_balances ADD COLUMN IF NOT EXISTS claimable_reward_balance_usdc DECIMAL(18,6) DEFAULT 0.00;
ALTER TABLE public.user_balances ADD COLUMN IF NOT EXISTS total_rewards_withdrawn_usdc DECIMAL(18,6) DEFAULT 0.00;

-- Create reward balance view
CREATE OR REPLACE VIEW public.member_reward_balances AS
SELECT 
    m.wallet_address,
    COALESCE(ub.pending_reward_balance_usdc, 0) as pending_balance_usdc,
    COALESCE(ub.claimable_reward_balance_usdc, 0) as claimable_balance_usdc,
    COALESCE(ub.total_rewards_withdrawn_usdc, 0) as total_withdrawn_usdc,
    
    -- Count of pending/claimable claims
    (SELECT COUNT(*) FROM public.reward_claims WHERE root_wallet = m.wallet_address AND status = 'pending') as pending_claims_count,
    (SELECT COUNT(*) FROM public.reward_claims WHERE root_wallet = m.wallet_address AND status = 'claimable') as claimable_claims_count,
    
    -- Sum of pending/claimable amounts
    (SELECT COALESCE(SUM(reward_amount_usdc), 0) FROM public.reward_claims WHERE root_wallet = m.wallet_address AND status = 'pending') as pending_claims_total_usdc,
    (SELECT COALESCE(SUM(reward_amount_usdc), 0) FROM public.reward_claims WHERE root_wallet = m.wallet_address AND status = 'claimable') as claimable_claims_total_usdc
    
FROM public.members m
LEFT JOIN public.user_balances ub ON ub.wallet_address = m.wallet_address
WHERE m.is_activated = true;

-- Function to create countdown notifications when reward becomes pending
CREATE OR REPLACE FUNCTION public.create_reward_countdown_notification(
    p_claim_id UUID
) RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle reward withdrawal (separate from claiming)
CREATE OR REPLACE FUNCTION public.withdraw_reward_balance(
    p_wallet_address VARCHAR(42),
    p_amount_usdc DECIMAL(18,6),
    p_withdrawal_address VARCHAR(42) DEFAULT NULL
) RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced reward claim function that moves rewards to balance instead of direct payment
CREATE OR REPLACE FUNCTION public.claim_reward_to_balance(
    p_claim_id UUID,
    p_wallet_address VARCHAR(42)
) RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced create_layer_reward_claim to include notifications
CREATE OR REPLACE FUNCTION public.create_layer_reward_claim_with_notifications(
    p_root_wallet VARCHAR(42),
    p_triggering_member_wallet VARCHAR(42),
    p_layer INTEGER,
    p_nft_level INTEGER,
    p_transaction_hash VARCHAR(66)
) RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 10. SUMMARY AND COMMENTS
-- =============================================

COMMENT ON FUNCTION public.create_layer_reward_claim IS 'Create layer reward when member upgrades to same level - 72hr pending, special Layer 1 rule';
COMMENT ON FUNCTION public.process_nft_purchase_with_requirements IS 'Process NFT purchase with Level 2 direct referral requirement';
COMMENT ON FUNCTION public.process_expired_rewards IS 'Roll up expired rewards to qualified upline members';
COMMENT ON TABLE public.reward_claims IS 'Layer reward claims with 72-hour pending system and rollup mechanism';
COMMENT ON TABLE public.member_requirements IS 'Track member requirements including direct referral counts for Level 2 purchases';

-- Final notification
DO $$
BEGIN
    RAISE NOTICE '=== CORRECT MATRIX REWARD SYSTEM DEPLOYED ===';
    RAISE NOTICE 'ONLY Layer Rewards: Member upgrades to same layer level = root gets 100%% NFT price';
    RAISE NOTICE 'Pending System: 72-hour claim window, then rolls up to qualified upline';
    RAISE NOTICE 'Layer 1 Special Rule: 3rd reward requires root Level 2+ to unlock';
    RAISE NOTICE 'Other Layers: Root must be >= layer level to claim';
    RAISE NOTICE 'Level 2 Requirement: Must have 3 direct referrals to purchase Level 2 NFT';
    RAISE NOTICE 'Direct referral count includes all placements in member tree (even if placed in downlines)';
    RAISE NOTICE '=== REWARD SYSTEM READY ===';
END $$;
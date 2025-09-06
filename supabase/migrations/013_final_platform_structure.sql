-- =============================================
-- Beehive Platform - Final Platform Structure  
-- Replaces migrations 009-012 with correct implementation
-- Apply ONLY after 008, skip 009-012
-- =============================================

-- =============================================
-- 1. PLATFORM FEES (Level 1 Only)
-- =============================================

-- Create platform fees table for Level 1 only
CREATE TABLE IF NOT EXISTS public.platform_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_type TEXT NOT NULL CHECK (fee_type IN ('activation_fee')),
    nft_level INTEGER NOT NULL CHECK (nft_level = 1), -- Only Level 1
    fee_amount_usdc DECIMAL(18,6) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key to nft_levels
    FOREIGN KEY (nft_level) REFERENCES public.nft_levels(level)
);

-- Insert Level 1 activation fee only
INSERT INTO public.platform_fees (fee_type, nft_level, fee_amount_usdc, description) VALUES
('activation_fee', 1, 30.00, 'Platform activation fee for Level 1 Bronze Bee NFT only');

-- =============================================
-- 2. BCC LOCKED REWARDS SYSTEM
-- =============================================

-- Users get total locked BCC = 10,450 BCC (sum of all level unlocks)
-- Each level purchase unlocks its specific BCC amount
-- Only Level 1 has platform fee, others only pay NFT price

-- Update user_balances table to properly track locked BCC
ALTER TABLE public.user_balances 
ADD COLUMN IF NOT EXISTS bcc_locked_total DECIMAL(18,8) DEFAULT 10450.0000,
ADD COLUMN IF NOT EXISTS bcc_unlocked_balance DECIMAL(18,8) DEFAULT 0;

COMMENT ON COLUMN public.user_balances.bcc_locked_total IS 'Total BCC locked for user (10,450 BCC)';
COMMENT ON COLUMN public.user_balances.bcc_unlocked_balance IS 'BCC unlocked through NFT level purchases';
COMMENT ON COLUMN public.user_balances.bcc_transferable IS 'BCC that can be transferred (500 initial + unlocked amounts)';

-- =============================================
-- 3. MATRIX REWARD RULES (USDC Payments)
-- =============================================

-- Matrix rewards pay full NFT price to root member per layer
-- Clear any existing reward rules
DELETE FROM public.reward_rules WHERE rule_type = 'layer_reward';

-- Layer rewards = Full NFT price per member upgrade
INSERT INTO public.reward_rules (rule_type, layer, fixed_amount_usdc, requires_activation, claim_window_hours, max_claims_per_user) VALUES
('layer_reward', 1, 100.00, true, 168, 3),        -- Layer 1: $100 per member
('layer_reward', 2, 150.00, true, 168, 9),        -- Layer 2: $150 per member  
('layer_reward', 3, 200.00, true, 168, 27),       -- Layer 3: $200 per member
('layer_reward', 4, 250.00, true, 168, 81),       -- Layer 4: $250 per member
('layer_reward', 5, 300.00, true, 168, 243),      -- Layer 5: $300 per member
('layer_reward', 6, 350.00, true, 168, 729),      -- Layer 6: $350 per member
('layer_reward', 7, 400.00, true, 168, 2187),     -- Layer 7: $400 per member
('layer_reward', 8, 450.00, true, 168, 6561),     -- Layer 8: $450 per member
('layer_reward', 9, 500.00, true, 168, 19683),    -- Layer 9: $500 per member
('layer_reward', 10, 550.00, true, 168, 59049),   -- Layer 10: $550 per member
('layer_reward', 11, 600.00, true, 168, 177147),  -- Layer 11: $600 per member
('layer_reward', 12, 650.00, true, 168, 531441),  -- Layer 12: $650 per member
('layer_reward', 13, 700.00, true, 168, 1594323), -- Layer 13: $700 per member
('layer_reward', 14, 750.00, true, 168, 4782969), -- Layer 14: $750 per member
('layer_reward', 15, 800.00, true, 168, 14348907), -- Layer 15: $800 per member
('layer_reward', 16, 850.00, true, 168, 43046721), -- Layer 16: $850 per member
('layer_reward', 17, 900.00, true, 168, 129140163), -- Layer 17: $900 per member
('layer_reward', 18, 950.00, true, 168, 387420489), -- Layer 18: $950 per member
('layer_reward', 19, 1000.00, true, 168, 1162261467); -- Layer 19: $1000 per member

-- =============================================
-- 4. CORE FUNCTIONS
-- =============================================

-- Function to calculate total cost (NFT price + platform fee for Level 1 only)
CREATE OR REPLACE FUNCTION public.calculate_total_nft_cost(
    p_level INTEGER
) RETURNS DECIMAL(18,6) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Function to process NFT purchase with BCC unlock
CREATE OR REPLACE FUNCTION public.process_nft_purchase_with_unlock(
    p_wallet_address VARCHAR(42),
    p_nft_level INTEGER,
    p_payment_amount_usdc DECIMAL(18,6),
    p_transaction_hash VARCHAR(66)
) RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to activate new user with 500 BCC + 10,450 locked BCC
CREATE OR REPLACE FUNCTION public.activate_new_user(
    p_wallet_address VARCHAR(42)
) RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. VIEWS FOR FRONTEND
-- =============================================

-- Complete pricing view with platform fees
CREATE OR REPLACE VIEW public.nft_complete_pricing AS
SELECT 
    nl.level,
    nl.token_id,
    nl.level_name,
    nl.price_usdc as nft_price,
    nl.bcc_reward as bcc_unlock_amount,
    
    -- Platform fee (only Level 1)
    CASE 
        WHEN nl.level = 1 THEN COALESCE(pf.fee_amount_usdc, 0)
        ELSE 0
    END as platform_fee,
    
    -- Total cost
    CASE 
        WHEN nl.level = 1 THEN nl.price_usdc + COALESCE(pf.fee_amount_usdc, 0)
        ELSE nl.price_usdc
    END as total_cost,
    
    nl.benefits,
    nl.is_active
    
FROM public.nft_levels nl
LEFT JOIN public.platform_fees pf ON pf.nft_level = nl.level AND pf.is_active = true
ORDER BY nl.level;

-- User BCC balance overview
CREATE OR REPLACE VIEW public.user_bcc_balance_overview AS
SELECT 
    ub.wallet_address,
    ub.bcc_transferable as transferable_bcc,
    ub.bcc_locked_total as total_locked_bcc,
    ub.bcc_unlocked_balance as unlocked_bcc,
    (ub.bcc_locked_total - ub.bcc_unlocked_balance) as remaining_locked_bcc,
    
    -- Calculate progress
    ROUND((ub.bcc_unlocked_balance / ub.bcc_locked_total) * 100, 2) as unlock_progress_percent,
    
    ub.updated_at
FROM public.user_balances ub
ORDER BY ub.wallet_address;

-- Matrix reward summary per layer
CREATE OR REPLACE VIEW public.matrix_reward_summary AS
SELECT 
    rr.layer,
    lr.layer_name,
    lr.positions_per_layer,
    rr.fixed_amount_usdc as reward_per_member_usdc,
    (lr.positions_per_layer * rr.fixed_amount_usdc) as max_layer_rewards_usdc,
    rr.max_claims_per_user
FROM public.reward_rules rr
JOIN public.layer_rules lr ON rr.layer = lr.layer
WHERE rr.rule_type = 'layer_reward' AND rr.is_active = true
ORDER BY rr.layer;

-- =============================================
-- 6. GRANT PERMISSIONS
-- =============================================

GRANT SELECT ON public.platform_fees TO authenticated;
GRANT SELECT ON public.nft_complete_pricing TO authenticated;
GRANT SELECT ON public.user_bcc_balance_overview TO authenticated;
GRANT SELECT ON public.matrix_reward_summary TO authenticated;

-- Enable RLS on platform_fees
ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All users can view platform fees
CREATE POLICY "Users can view platform fees" ON public.platform_fees
    FOR SELECT TO authenticated
    USING (is_active = true);

-- =============================================
-- 7. COMMENTS AND DOCUMENTATION
-- =============================================

COMMENT ON TABLE public.platform_fees IS 'Platform fees - Only applies to Level 1 Bronze Bee NFT ($30 activation fee)';
COMMENT ON FUNCTION public.calculate_total_nft_cost IS 'Calculate total NFT cost: Level 1 = NFT price + $30 fee, all others = NFT price only';
COMMENT ON FUNCTION public.process_nft_purchase_with_unlock IS 'Process NFT purchase and unlock corresponding BCC amount';
COMMENT ON FUNCTION public.activate_new_user IS 'Activate new user with 500 BCC transferable + 10,450 BCC locked';

-- Final structure summary
DO $$
BEGIN
    RAISE NOTICE '=== BEEHIVE PLATFORM FINAL STRUCTURE ===';
    RAISE NOTICE 'NFT Pricing: Level 1 = $100 + $30 fee = $130, Level 2 = $150, Level 3 = $200, etc. (+$50 each)';
    RAISE NOTICE 'BCC Unlock: Level 1 = 100 BCC, Level 2 = 150 BCC, Level 3 = 200 BCC, etc. (+50 each)';
    RAISE NOTICE 'Total Locked BCC: 10,450 BCC per user (sum of all 19 level unlocks)';
    RAISE NOTICE 'Matrix Rewards: Full NFT price paid to root member per layer in USDC';
    RAISE NOTICE 'New User Bonus: 500 BCC transferable upon activation';
    RAISE NOTICE '=== DEPLOYMENT COMPLETE ===';
END $$;
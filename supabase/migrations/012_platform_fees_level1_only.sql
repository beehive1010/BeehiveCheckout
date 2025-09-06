-- =============================================
-- Beehive Platform - Platform Fees Level 1 Only
-- Supabase Migration - Platform fees only apply to Level 1 NFT
-- =============================================

-- Clear existing platform fees that apply to all levels
DELETE FROM public.platform_fees WHERE applies_to = 'all_levels';

-- Insert platform activation fee for Level 1 only
INSERT INTO public.platform_fees (fee_type, nft_level, fee_amount_usdc, applies_to, description) VALUES
('activation_fee', 1, 30.00, 'specific_level', 'Platform activation fee for Level 1 Bronze Bee NFT only');

-- Update nft_pricing_with_fees view to reflect Level 1 only fees
DROP VIEW IF EXISTS public.nft_pricing_with_fees;

CREATE VIEW public.nft_pricing_with_fees AS
SELECT 
    nl.level,
    nl.token_id,
    nl.level_name,
    nl.price_usdc as nft_price_usdc,
    nl.bcc_reward,
    nl.unlock_layer,
    
    -- Platform fees only apply to Level 1
    CASE 
        WHEN nl.level = 1 THEN COALESCE(activation_fee.fee_amount_usdc, 0)
        ELSE 0
    END as activation_fee_usdc,
    
    0 as transaction_fee_usdc,  -- No transaction fees
    0 as upgrade_fee_usdc,      -- No upgrade fees
    
    -- Total costs breakdown
    nl.price_usdc as nft_cost,
    CASE 
        WHEN nl.level = 1 THEN COALESCE(activation_fee.fee_amount_usdc, 0)
        ELSE 0
    END as total_fees,
    
    -- Total price calculation (NFT price + fees for Level 1 only)
    CASE 
        WHEN nl.level = 1 THEN nl.price_usdc + COALESCE(activation_fee.fee_amount_usdc, 0)
        ELSE nl.price_usdc
    END as total_price_usdc,
    
    -- Display price (what users see)
    CASE 
        WHEN nl.level = 1 THEN nl.price_usdc + COALESCE(activation_fee.fee_amount_usdc, 0)
        ELSE nl.price_usdc
    END as display_price_usdc,
    
    -- Benefits and metadata
    nl.benefits,
    nl.metadata_uri,
    nl.is_active,
    nl.created_at,
    nl.updated_at

FROM public.nft_levels nl
LEFT JOIN public.platform_fees activation_fee ON 
    activation_fee.fee_type = 'activation_fee' AND 
    activation_fee.is_active = true AND
    activation_fee.nft_level = nl.level AND
    nl.level = 1  -- Only join for Level 1
ORDER BY nl.level;

-- Update platform_fees_summary view
DROP VIEW IF EXISTS public.platform_fees_summary;

CREATE VIEW public.platform_fees_summary AS
SELECT 
    pf.fee_type,
    pf.fee_amount_usdc,
    pf.fee_percentage,
    pf.applies_to,
    pf.nft_level,
    pf.level_range_start,
    pf.level_range_end,
    pf.description,
    pf.is_active,
    pf.created_at,
    pf.updated_at,
    
    -- Calculate total with fee (Level 1 only)
    CASE 
        WHEN pf.nft_level = 1 THEN 
            nl.price_usdc + pf.fee_amount_usdc
        ELSE NULL
    END as total_with_fee,
    
    -- Level details
    nl.level_name,
    nl.price_usdc as nft_price,
    
    -- Fee status
    CASE 
        WHEN pf.is_active THEN 'Active'
        ELSE 'Inactive'
    END as status

FROM public.platform_fees pf
LEFT JOIN public.nft_levels nl ON pf.nft_level = nl.level
ORDER BY pf.fee_type, pf.nft_level;

-- Update admin_platform_fees view
DROP VIEW IF EXISTS public.admin_platform_fees;

CREATE VIEW public.admin_platform_fees AS
SELECT 
    'Platform Fee Management - Level 1 Only' as section,
    pf.fee_type,
    pf.fee_amount_usdc,
    pf.applies_to,
    'Level 1 Bronze Bee Only' as applies_to_description,
    
    -- Only Level 1 is affected
    1 as affected_levels,
    
    pf.description,
    pf.is_active,
    pf.created_at,
    pf.updated_at
    
FROM public.platform_fees pf
WHERE pf.nft_level = 1
ORDER BY pf.fee_type, pf.created_at;

-- Update functions to reflect Level 1 only fees
CREATE OR REPLACE FUNCTION public.calculate_nft_total_price(
    p_level INTEGER
) RETURNS DECIMAL(18,6) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_nft_price DECIMAL(18,6);
    v_activation_fee DECIMAL(18,6) := 0;
    v_total_price DECIMAL(18,6);
BEGIN
    -- Get NFT base price
    SELECT price_usdc INTO v_nft_price
    FROM public.nft_levels 
    WHERE level = p_level AND is_active = true;
    
    IF v_nft_price IS NULL THEN
        RAISE EXCEPTION 'NFT level % not found or inactive', p_level;
    END IF;
    
    -- Get activation fee only for Level 1
    IF p_level = 1 THEN
        SELECT fee_amount_usdc INTO v_activation_fee
        FROM public.platform_fees 
        WHERE fee_type = 'activation_fee' 
        AND is_active = true 
        AND nft_level = 1
        LIMIT 1;
    END IF;
    
    -- Calculate total
    v_total_price := v_nft_price + COALESCE(v_activation_fee, 0);
    
    RETURN v_total_price;
END;
$$;

-- Update fee breakdown function
CREATE OR REPLACE FUNCTION public.get_nft_fee_breakdown(
    p_level INTEGER
) RETURNS TABLE(
    nft_price DECIMAL(18,6),
    activation_fee DECIMAL(18,6),
    transaction_fee DECIMAL(18,6),
    upgrade_fee DECIMAL(18,6),
    total_fees DECIMAL(18,6),
    total_price DECIMAL(18,6)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        nl.price_usdc as nft_price,
        CASE WHEN nl.level = 1 THEN COALESCE(af.fee_amount_usdc, 0) ELSE 0 END as activation_fee,
        0::DECIMAL(18,6) as transaction_fee,  -- No transaction fees
        0::DECIMAL(18,6) as upgrade_fee,      -- No upgrade fees
        CASE WHEN nl.level = 1 THEN COALESCE(af.fee_amount_usdc, 0) ELSE 0 END as total_fees,
        nl.price_usdc + 
        CASE WHEN nl.level = 1 THEN COALESCE(af.fee_amount_usdc, 0) ELSE 0 END as total_price
    FROM public.nft_levels nl
    LEFT JOIN public.platform_fees af ON af.fee_type = 'activation_fee' AND af.is_active = true AND af.nft_level = 1
    WHERE nl.level = p_level AND nl.is_active = true;
END;
$$;

-- Update reward structure explanation
DROP VIEW IF EXISTS public.reward_structure_explanation;

CREATE VIEW public.reward_structure_explanation AS
SELECT 
    'Dual Reward System' as system_name,
    'The Beehive Platform operates a dual reward system with two distinct reward types:' as description,
    
    -- USDC Matrix Rewards
    '1. USDC Matrix Rewards' as reward_type_1,
    'Full NFT purchase price (in USDC) paid to root member for each layer placement' as reward_1_description,
    'Requires root to be at Level X+1 to receive Layer X rewards (except first 2 Layer 1 rewards)' as reward_1_rules,
    
    -- BCC Token Rewards  
    '2. BCC Token Rewards (Two Components)' as reward_type_2,
    'a) BCC Locked Rewards: Tiered system (10,450 BCC for tier 1, halved for each tier)' as reward_2a_description,
    'b) New Member BCC: 500 BCC transferable upon activation + level-specific BCC rewards' as reward_2b_description,
    
    -- Platform Fees (Level 1 Only)
    '3. Platform Fees (Level 1 Only)' as fee_structure,
    'Activation fee: $30 USDC for Level 1 Bronze Bee NFT only | All other levels have no platform fees' as fee_details
    
LIMIT 1;

-- Grant permissions
GRANT SELECT ON public.nft_pricing_with_fees TO authenticated;
GRANT SELECT ON public.platform_fees_summary TO authenticated;
GRANT SELECT ON public.admin_platform_fees TO authenticated;
GRANT SELECT ON public.reward_structure_explanation TO authenticated;

-- Add comments for clarity
COMMENT ON TABLE public.platform_fees IS 'Platform fees configuration - Currently only applies to Level 1 Bronze Bee NFT';
COMMENT ON VIEW public.nft_pricing_with_fees IS 'Complete NFT pricing view showing Level 1 with platform fees, all other levels show base price only';

-- End of platform fees Level 1 only migration
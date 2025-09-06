-- =============================================
-- Beehive Platform - Currency Correction (USDT → USDC)
-- Supabase Migration - Update all currency references from USDT to USDC
-- =============================================

-- NOTE: Previous migrations already created columns with correct USDC names
-- Migration 008: nft_levels.price_usdc, reward_rules.fixed_amount_usdc  
-- Migration 009: platform_fees.fee_amount_usdc
-- Only rename columns that actually exist with USDT names

-- Check if user_balances has USDT column and rename if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'user_balances' AND column_name = 'total_usdt_earned') THEN
        ALTER TABLE public.user_balances RENAME COLUMN total_usdt_earned TO total_usdc_earned;
    END IF;
END $$;

-- Update all views to use USDC terminology
-- Drop and recreate nft_pricing_with_fees view
DROP VIEW IF EXISTS public.nft_pricing_with_fees;

CREATE VIEW public.nft_pricing_with_fees AS
SELECT 
    nl.level,
    nl.token_id,
    nl.level_name,
    nl.price_usdc as nft_price_usdc,
    nl.bcc_reward,
    nl.unlock_layer,
    
    -- Calculate platform fees
    COALESCE(activation_fee.fee_amount_usdc, 0) as activation_fee_usdc,
    COALESCE(transaction_fee.fee_amount_usdc, 0) as transaction_fee_usdc,
    COALESCE(upgrade_fee.fee_amount_usdc, 0) as upgrade_fee_usdc,
    
    -- Total costs breakdown
    nl.price_usdc as nft_cost,
    COALESCE(activation_fee.fee_amount_usdc, 0) + 
    COALESCE(transaction_fee.fee_amount_usdc, 0) as total_fees,
    
    nl.price_usdc + 
    COALESCE(activation_fee.fee_amount_usdc, 0) + 
    COALESCE(transaction_fee.fee_amount_usdc, 0) as total_price_usdc,
    
    -- Special case for Level 1 with activation fee
    CASE 
        WHEN nl.level = 1 THEN 
            nl.price_usdc + COALESCE(activation_fee.fee_amount_usdc, 0)
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
    (activation_fee.applies_to = 'all_levels' OR 
     (activation_fee.applies_to = 'specific_level' AND activation_fee.nft_level = nl.level))
LEFT JOIN public.platform_fees transaction_fee ON 
    transaction_fee.fee_type = 'transaction_fee' AND 
    transaction_fee.is_active = true AND
    (transaction_fee.applies_to = 'all_levels' OR 
     (transaction_fee.applies_to = 'specific_level' AND transaction_fee.nft_level = nl.level))
LEFT JOIN public.platform_fees upgrade_fee ON 
    upgrade_fee.fee_type = 'upgrade_fee' AND 
    upgrade_fee.is_active = true AND
    (upgrade_fee.applies_to = 'all_levels' OR 
     (upgrade_fee.applies_to = 'specific_level' AND upgrade_fee.nft_level = nl.level))
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
    
    -- Calculate total fees for specific levels
    CASE 
        WHEN pf.applies_to = 'specific_level' THEN 
            nl.price_usdc + pf.fee_amount_usdc
        WHEN pf.applies_to = 'all_levels' THEN 
            pf.fee_amount_usdc
        ELSE NULL
    END as total_with_fee,
    
    -- Level details if applicable
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
    'Platform Fee Management' as section,
    pf.fee_type,
    pf.fee_amount_usdc,
    pf.applies_to,
    CASE 
        WHEN pf.applies_to = 'all_levels' THEN 'All NFT Levels'
        WHEN pf.applies_to = 'specific_level' THEN 'Level ' || pf.nft_level::text
        WHEN pf.applies_to = 'level_range' THEN 'Levels ' || pf.level_range_start::text || '-' || pf.level_range_end::text
    END as applies_to_description,
    
    -- Calculate impact on pricing
    (SELECT COUNT(*) FROM public.nft_levels WHERE 
        CASE 
            WHEN pf.applies_to = 'all_levels' THEN true
            WHEN pf.applies_to = 'specific_level' THEN level = pf.nft_level
            WHEN pf.applies_to = 'level_range' THEN level BETWEEN pf.level_range_start AND pf.level_range_end
            ELSE false
        END
    ) as affected_levels,
    
    pf.description,
    pf.is_active,
    pf.created_at,
    pf.updated_at
    
FROM public.platform_fees pf
ORDER BY pf.fee_type, pf.created_at;

-- Update functions to use USDC
CREATE OR REPLACE FUNCTION public.calculate_nft_total_price(
    p_level INTEGER
) RETURNS DECIMAL(18,6) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Add clarifying comment about reward structure
COMMENT ON TABLE public.user_balances IS 'User balance tracking for both USDC rewards (from matrix) and BCC token rewards (locked + transferable)';
COMMENT ON COLUMN public.user_balances.total_usdc_earned IS 'Total USDC earned from matrix placement rewards';
COMMENT ON COLUMN public.user_balances.bcc_transferable IS 'BCC tokens that can be transferred/traded (500 initial + rewards)';
COMMENT ON COLUMN public.user_balances.bcc_locked IS 'BCC tokens locked based on membership tier (10,450 for tier 1, halved for each tier)';

-- Create comprehensive reward structure view
CREATE OR REPLACE VIEW public.reward_structure_explanation AS
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
    
    -- Platform Fees
    '3. Platform Fees (in USDC)' as fee_structure,
    'Activation fee: $30 USDC per level | Transaction fee: $5 USDC | Upgrade bonuses at levels 5, 10, 15, 19' as fee_details
    
LIMIT 1;

-- Grant permissions
GRANT SELECT ON public.nft_pricing_with_fees TO authenticated;
GRANT SELECT ON public.platform_fees_summary TO authenticated;
GRANT SELECT ON public.admin_platform_fees TO authenticated;
GRANT SELECT ON public.reward_structure_explanation TO authenticated;

-- End of currency correction migration
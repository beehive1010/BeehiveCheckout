-- =============================================
-- Beehive Platform - Platform Fees System
-- Supabase Migration - Add platform fees and update Level 1 pricing
-- =============================================

-- Add missing columns to platform_fees table (created in migration 009)
ALTER TABLE public.platform_fees 
ADD COLUMN IF NOT EXISTS applies_to TEXT CHECK (applies_to IN ('all_levels', 'specific_level', 'level_range')),
ADD COLUMN IF NOT EXISTS level_range_start INTEGER,
ADD COLUMN IF NOT EXISTS level_range_end INTEGER,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add constraints for the new columns
ALTER TABLE public.platform_fees 
ADD CONSTRAINT platform_fees_nft_level_fkey FOREIGN KEY (nft_level) REFERENCES public.nft_levels(level);

-- Note: Cannot add CHECK constraint with OR conditions in ALTER TABLE, will be enforced in application logic

-- Insert platform activation fee ($30 USDC for all levels)
INSERT INTO public.platform_fees (fee_type, fee_amount_usdc, applies_to, description) VALUES
('activation_fee', 30.00, 'all_levels', 'Platform activation fee applied to all NFT level purchases'),
('transaction_fee', 0.00, 'all_levels', 'Standard transaction processing fee'),
('upgrade_fee', 0.00, 'all_levels', 'Fee for upgrading between membership levels');

-- Update Level 1 Bronze Bee NFT price to include activation fee
-- Original: $100 NFT + $30 activation = $130 total
-- We'll keep the NFT price at $100 and show the activation fee separately
-- This allows for transparency and separate fee tracking

-- Create platform fees view for admin dashboard
CREATE OR REPLACE VIEW public.platform_fees_summary AS
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

-- Create comprehensive pricing view that shows total costs
CREATE OR REPLACE VIEW public.nft_pricing_with_fees AS
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

-- Create admin view for fee management
CREATE OR REPLACE VIEW public.admin_platform_fees AS
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

-- =============================================
-- Grant permissions for platform fees
-- =============================================

-- Grant SELECT permissions to authenticated users (with RLS)
GRANT SELECT ON public.platform_fees TO authenticated;
GRANT SELECT ON public.platform_fees_summary TO authenticated;
GRANT SELECT ON public.nft_pricing_with_fees TO authenticated;
GRANT SELECT ON public.admin_platform_fees TO authenticated;

-- Enable RLS on platform_fees table
ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can view active platform fees
CREATE POLICY "Users can view active platform fees" ON public.platform_fees
    FOR SELECT TO authenticated
    USING (is_active = true);

-- RLS Policy: Only admins can view all platform fees (including inactive)
CREATE POLICY "Admins can view all platform fees" ON public.platform_fees
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.wallet_address = get_current_wallet_address()
            AND u.is_admin = true
        )
    );

-- Create function to calculate total price including fees
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

-- Create function to get fee breakdown for a specific level
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

-- End of platform fees migration
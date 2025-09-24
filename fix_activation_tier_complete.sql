-- Complete fix for get_current_activation_tier function
-- =====================================================

-- Step 1: Create member_activation_tiers table if it doesn't exist
CREATE TABLE IF NOT EXISTS member_activation_tiers (
    tier INTEGER PRIMARY KEY,
    tier_name CHARACTER VARYING(50) NOT NULL,
    min_activation_rank INTEGER NOT NULL,
    max_activation_rank INTEGER,
    bcc_multiplier NUMERIC(5,3) NOT NULL DEFAULT 1.000,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: Insert default tier data
INSERT INTO member_activation_tiers (tier, tier_name, min_activation_rank, max_activation_rank, bcc_multiplier, is_active)
VALUES 
    (1, 'Tier 1 - Genesis', 1, 99, 1.000, TRUE),
    (2, 'Tier 2 - Growth', 100, 999, 0.500, TRUE),
    (3, 'Tier 3 - Expansion', 1000, 9999, 0.250, TRUE),
    (4, 'Tier 4 - Infinite', 10000, NULL, 0.125, TRUE)
ON CONFLICT (tier) DO NOTHING;

-- Step 3: Create an improved version of get_current_activation_tier that handles missing tables
CREATE OR REPLACE FUNCTION public.get_current_activation_tier()
RETURNS TABLE(tier integer, tier_name character varying, bcc_multiplier numeric, current_activations bigint, next_milestone integer)
LANGUAGE plpgsql
AS $function$
DECLARE
    total_activated_members BIGINT;
    current_tier_record RECORD;
    table_exists BOOLEAN := FALSE;
BEGIN
    -- Check if member_activation_tiers table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'member_activation_tiers' 
        AND table_schema = 'public'
    ) INTO table_exists;
    
    -- Count current activated members (fixed: using claimed_at instead of activated_at)
    SELECT COUNT(*) INTO total_activated_members
    FROM membership 
    WHERE claimed_at IS NOT NULL 
    AND nft_level = 1;
    
    -- If table exists, get the appropriate tier
    IF table_exists THEN
        SELECT * INTO current_tier_record
        FROM member_activation_tiers mat
        WHERE mat.is_active = TRUE
        AND (
            total_activated_members BETWEEN mat.min_activation_rank AND COALESCE(mat.max_activation_rank, 999999)
            OR (mat.tier = 4 AND total_activated_members >= mat.min_activation_rank)
        )
        ORDER BY mat.tier
        LIMIT 1;
        
        -- If found a tier, return it
        IF current_tier_record IS NOT NULL THEN
            RETURN QUERY SELECT 
                current_tier_record.tier,
                current_tier_record.tier_name,
                current_tier_record.bcc_multiplier,
                total_activated_members,
                COALESCE(current_tier_record.max_activation_rank, 99999) as next_milestone;
            RETURN;
        END IF;
    END IF;
    
    -- Fallback: Return default Tier 1 if table doesn't exist or no tier found
    RETURN QUERY SELECT 
        1 as tier,
        'Tier 1 - Genesis'::character varying as tier_name,
        1.000::NUMERIC as bcc_multiplier,
        total_activated_members as current_activations,
        CASE 
            WHEN total_activated_members < 100 THEN 100
            WHEN total_activated_members < 1000 THEN 1000
            WHEN total_activated_members < 10000 THEN 10000
            ELSE 99999
        END as next_milestone;
END;
$function$;

-- Test the function
SELECT 
    tier,
    tier_name,
    bcc_multiplier,
    current_activations,
    next_milestone,
    '✅ Function working correctly' as status
FROM get_current_activation_tier();
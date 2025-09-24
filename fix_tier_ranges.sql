-- Fix member activation tier ranges
-- =================================
-- Correct the tier ranges according to user specification:
-- Tier 1: 1-9999
-- Tier 2: 10000-29999

-- Update the tier ranges
UPDATE member_activation_tiers SET
    min_activation_rank = 1,
    max_activation_rank = 9999,
    tier_name = 'Tier 1 - Genesis'
WHERE tier = 1;

UPDATE member_activation_tiers SET
    min_activation_rank = 10000,
    max_activation_rank = 29999,
    tier_name = 'Tier 2 - Growth'
WHERE tier = 2;

UPDATE member_activation_tiers SET
    min_activation_rank = 30000,
    max_activation_rank = 49999,
    tier_name = 'Tier 3 - Expansion'
WHERE tier = 3;

UPDATE member_activation_tiers SET
    min_activation_rank = 50000,
    max_activation_rank = NULL,
    tier_name = 'Tier 4 - Infinite'
WHERE tier = 4;

-- Show updated tier configuration
SELECT 
    tier,
    tier_name,
    min_activation_rank,
    max_activation_rank,
    bcc_multiplier,
    is_active
FROM member_activation_tiers
ORDER BY tier;

-- Test the corrected function
SELECT 
    tier,
    tier_name,
    bcc_multiplier,
    current_activations,
    next_milestone,
    '✅ Corrected tier ranges' as status
FROM get_current_activation_tier();
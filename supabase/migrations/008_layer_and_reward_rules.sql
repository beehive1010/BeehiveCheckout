 -- =============================================
-- Beehive Platform - Layer Rules & Reward Configuration
-- Supabase Migration - Complete rules for 19-level NFT membership system
-- =============================================

-- Create configuration tables for layer rules and rewards
CREATE TABLE IF NOT EXISTS public.layer_rules (
    layer INTEGER PRIMARY KEY CHECK (layer >= 1 AND layer <= 19),
    positions_per_layer INTEGER NOT NULL,
    total_positions INTEGER NOT NULL,
    matrix_width INTEGER DEFAULT 3,
    requires_previous_layer BOOLEAN DEFAULT true,
    spillover_enabled BOOLEAN DEFAULT true,
    activation_delay_hours INTEGER DEFAULT 0,
    layer_name TEXT NOT NULL,
    description TEXT,
    
    -- New columns for referral requirements
    requires_direct_referrals BOOLEAN DEFAULT false,
    direct_referrals_needed INTEGER DEFAULT 0,
    has_special_upgrade_rule BOOLEAN DEFAULT false,
    special_rule_description TEXT,
    
    -- Placement order (L=1, M=2, R=3)
    placement_priority TEXT[] DEFAULT ARRAY['L', 'M', 'R'],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create NFT level configuration table
CREATE TABLE IF NOT EXISTS public.nft_levels (
    level INTEGER PRIMARY KEY CHECK (level >= 1 AND level <= 19),
    token_id INTEGER UNIQUE NOT NULL,
    level_name TEXT NOT NULL,
    price_usdc DECIMAL(18,6) NOT NULL,
    bcc_reward DECIMAL(18,8) NOT NULL,
    unlock_layer INTEGER NOT NULL CHECK (unlock_layer >= 1 AND unlock_layer <= 19),
    required_previous_level BOOLEAN DEFAULT true,
    max_supply INTEGER,
    current_supply INTEGER DEFAULT 0,
    benefits JSONB DEFAULT '[]'::JSONB,
    metadata_uri TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key to layer rules
    FOREIGN KEY (unlock_layer) REFERENCES public.layer_rules(layer)
);

-- Create reward rules configuration table
CREATE TABLE IF NOT EXISTS public.reward_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_type TEXT NOT NULL CHECK (rule_type IN ('direct_referral', 'matrix_placement', 'layer_reward', 'upgrade_bonus', 'spillover_reward')),
    layer INTEGER CHECK (layer >= 1 AND layer <= 19),
    nft_level INTEGER CHECK (nft_level >= 1 AND nft_level <= 19),
    reward_percentage DECIMAL(5,2), -- Percentage of purchase price
    fixed_amount_usdc DECIMAL(18,6), -- Fixed USDC amount
    bcc_multiplier DECIMAL(8,4) DEFAULT 1.0000, -- BCC token multiplier
    requires_activation BOOLEAN DEFAULT true,
    max_claims_per_user INTEGER,
    claim_window_hours INTEGER, -- Time window to claim reward
    auto_claim BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CHECK (reward_percentage IS NOT NULL OR fixed_amount_usdc IS NOT NULL),
    FOREIGN KEY (layer) REFERENCES public.layer_rules(layer),
    FOREIGN KEY (nft_level) REFERENCES public.nft_levels(level)
);

-- =============================================
-- INSERT LAYER RULES (1-19 layers, 3x3 matrix)
-- =============================================

INSERT INTO public.layer_rules (
    layer, positions_per_layer, total_positions, matrix_width, layer_name, description, 
    spillover_enabled, activation_delay_hours, requires_direct_referrals, direct_referrals_needed, 
    has_special_upgrade_rule, special_rule_description, placement_priority
) VALUES
-- Layer 1: Direct referrals - REQUIRES direct referrals, special 3rd reward rule
(1, 3, 3, 3, 'Direct Referrals', 'Your first-level direct referrals', 
 true, 0, true, 3, true, '3rd Layer 1 reward requires root to upgrade to Level 2+', ARRAY['L', 'M', 'R']),

-- Layer 2: Second level - REQUIRES direct referrals, normal level requirement
(2, 9, 12, 3, 'Second Level', 'Referrals of your direct referrals', 
 true, 0, true, 3, false, 'Root must be Level 2+ to receive rewards', ARRAY['L', 'M', 'R']),

-- Layer 3-19: NO direct referral requirement, only root level >= layer level
(3, 27, 39, 3, 'Third Level', 'Third level matrix positions', 
 true, 24, false, 0, false, 'Root must be Level 3+ to receive rewards', ARRAY['L', 'M', 'R']),
(4, 81, 120, 3, 'Fourth Level', 'Fourth level matrix positions', 
 true, 24, false, 0, false, 'Root must be Level 4+ to receive rewards', ARRAY['L', 'M', 'R']),
(5, 243, 363, 3, 'Fifth Level', 'Fifth level matrix positions', 
 true, 48, false, 0, false, 'Root must be Level 5+ to receive rewards', ARRAY['L', 'M', 'R']),
(6, 729, 1092, 3, 'Sixth Level', 'Sixth level matrix positions', 
 true, 48, false, 0, false, 'Root must be Level 6+ to receive rewards', ARRAY['L', 'M', 'R']),
(7, 2187, 3279, 3, 'Seventh Level', 'Seventh level matrix positions', 
 true, 72, false, 0, false, 'Root must be Level 7+ to receive rewards', ARRAY['L', 'M', 'R']),
(8, 6561, 9840, 3, 'Eighth Level', 'Eighth level matrix positions', 
 true, 72, false, 0, false, 'Root must be Level 8+ to receive rewards', ARRAY['L', 'M', 'R']),
(9, 19683, 29523, 3, 'Ninth Level', 'Ninth level matrix positions', 
 true, 96, false, 0, false, 'Root must be Level 9+ to receive rewards', ARRAY['L', 'M', 'R']),
(10, 59049, 88572, 3, 'Tenth Level', 'Tenth level matrix positions', 
 true, 96, false, 0, false, 'Root must be Level 10+ to receive rewards', ARRAY['L', 'M', 'R']),
(11, 177147, 265719, 3, 'Eleventh Level', 'Eleventh level matrix positions', 
 true, 120, false, 0, false, 'Root must be Level 11+ to receive rewards', ARRAY['L', 'M', 'R']),
(12, 531441, 797160, 3, 'Twelfth Level', 'Twelfth level matrix positions', 
 true, 120, false, 0, false, 'Root must be Level 12+ to receive rewards', ARRAY['L', 'M', 'R']),
(13, 1594323, 2391483, 3, 'Thirteenth Level', 'Thirteenth level matrix positions', 
 true, 144, false, 0, false, 'Root must be Level 13+ to receive rewards', ARRAY['L', 'M', 'R']),
(14, 4782969, 7174452, 3, 'Fourteenth Level', 'Fourteenth level matrix positions', 
 true, 144, false, 0, false, 'Root must be Level 14+ to receive rewards', ARRAY['L', 'M', 'R']),
(15, 14348907, 21522359, 3, 'Fifteenth Level', 'Fifteenth level matrix positions', 
 true, 168, false, 0, false, 'Root must be Level 15+ to receive rewards', ARRAY['L', 'M', 'R']),
(16, 43046721, 64569080, 3, 'Sixteenth Level', 'Sixteenth level matrix positions', 
 true, 168, false, 0, false, 'Root must be Level 16+ to receive rewards', ARRAY['L', 'M', 'R']),
(17, 129140163, 193709243, 3, 'Seventeenth Level', 'Seventeenth level matrix positions', 
 true, 192, false, 0, false, 'Root must be Level 17+ to receive rewards', ARRAY['L', 'M', 'R']),
(18, 387420489, 581129732, 3, 'Eighteenth Level', 'Eighteenth level matrix positions', 
 true, 192, false, 0, false, 'Root must be Level 18+ to receive rewards', ARRAY['L', 'M', 'R']),
(19, 1162261467, 1743391199, 3, 'Nineteenth Level', 'Final matrix level - maximum reach', 
 true, 216, false, 0, false, 'Root must be Level 19 to receive rewards', ARRAY['L', 'M', 'R']);

-- =============================================
-- INSERT NFT LEVEL CONFIGURATION (Token IDs 1-19)
-- =============================================

INSERT INTO public.nft_levels (level, token_id, level_name, price_usdc, bcc_reward, unlock_layer, benefits, metadata_uri) VALUES
-- Pricing: Level 1 = $100, then +$50 each level
-- BCC Unlock: Level 1 = 100 BCC, then +50 BCC each level
-- Total Locked BCC = Sum of all level unlock amounts (10,450 BCC total)

(1, 1, 'Warrior Level 1', 100.00, 100.0000, 1, 
 '["Access to basic courses", "Entry to community", "Unlocks 100 BCC when purchased"]',
 'ipfs://QmWarriorLevel1MetadataHash'),

(2, 2, 'Guardian Level 2', 150.00, 150.0000, 2,
 '["All Warrior benefits", "Level 2 course access", "Unlocks 150 BCC when purchased"]',
 'ipfs://QmGuardianLevel2MetadataHash'),

(3, 3, 'Knight Level 3', 200.00, 200.0000, 3,
 '["All Guardian benefits", "Priority support", "Unlocks 200 BCC when purchased"]',
 'ipfs://QmKnightLevel3MetadataHash'),

(4, 4, 'Champion Level 4', 250.00, 250.0000, 4,
 '["All Knight benefits", "VIP community access", "Unlocks 250 BCC when purchased"]',
 'ipfs://QmChampionLevel4MetadataHash'),

(5, 5, 'Master Level 5', 300.00, 300.0000, 5,
 '["All Champion benefits", "Personal mentorship", "Unlocks 300 BCC when purchased"]',
 'ipfs://QmMasterLevel5MetadataHash'),

(6, 6, 'Elite Level 6', 350.00, 350.0000, 6,
 '["All Master benefits", "Elite-level training", "Unlocks 350 BCC when purchased"]',
 'ipfs://QmEliteLevel6MetadataHash'),

(7, 7, 'Legend Level 7', 400.00, 400.0000, 7,
 '["All Elite benefits", "Legendary networking", "Unlocks 400 BCC when purchased"]',
 'ipfs://QmLegendLevel7MetadataHash'),

(8, 8, 'Mythic Level 8', 450.00, 450.0000, 8,
 '["All Legend benefits", "Mythical tools access", "Unlocks 450 BCC when purchased"]',
 'ipfs://QmMythicLevel8MetadataHash'),

(9, 9, 'Divine Level 9', 500.00, 500.0000, 9,
 '["All Mythic benefits", "Divine level access", "Unlocks 500 BCC when purchased"]',
 'ipfs://QmDivineLevel9MetadataHash'),

(10, 10, 'Immortal Level 10', 550.00, 550.0000, 10,
 '["All Divine benefits", "Immortal tier benefits", "Unlocks 550 BCC when purchased"]',
 'ipfs://QmImmortalLevel10MetadataHash'),

(11, 11, 'Cosmic Level 11', 600.00, 600.0000, 11,
 '["All Immortal benefits", "Cosmic tier access", "Unlocks 600 BCC when purchased"]',
 'ipfs://QmCosmicLevel11MetadataHash'),

(12, 12, 'Galactic Level 12', 650.00, 650.0000, 12,
 '["All Cosmic benefits", "Galactic-level power", "Unlocks 650 BCC when purchased"]',
 'ipfs://QmGalacticLevel12MetadataHash'),

(13, 13, 'Universal Level 13', 700.00, 700.0000, 13,
 '["All Galactic benefits", "Universal insights", "Unlocks 700 BCC when purchased"]',
 'ipfs://QmUniversalLevel13MetadataHash'),

(14, 14, 'Infinite Level 14', 750.00, 750.0000, 14,
 '["All Universal benefits", "Infinite possibilities", "Unlocks 750 BCC when purchased"]',
 'ipfs://QmInfiniteLevel14MetadataHash'),

(15, 15, 'Eternal Level 15', 800.00, 800.0000, 15,
 '["All Infinite benefits", "Eternal status", "Unlocks 800 BCC when purchased"]',
 'ipfs://QmEternalLevel15MetadataHash'),

(16, 16, 'Supreme Level 16', 850.00, 850.0000, 16,
 '["All Eternal benefits", "Supreme authority", "Unlocks 850 BCC when purchased"]',
 'ipfs://QmSupremeLevel16MetadataHash'),

(17, 17, 'Transcendent Level 17', 900.00, 900.0000, 17,
 '["All Supreme benefits", "Transcendent powers", "Unlocks 900 BCC when purchased"]',
 'ipfs://QmTranscendentLevel17MetadataHash'),

(18, 18, 'Omnipotent Level 18', 950.00, 950.0000, 18,
 '["All Transcendent benefits", "Omnipotent abilities", "Unlocks 950 BCC when purchased"]',
 'ipfs://QmOmnipotentLevel18MetadataHash'),

(19, 19, 'Apex Level 19', 1000.00, 1000.0000, 19,
 '["All Omnipotent benefits", "Apex mastery", "Unlocks 1000 BCC when purchased"]',
 'ipfs://QmApexLevel19MetadataHash');

-- =============================================
-- REWARD RULES CONFIGURATION
-- =============================================

-- NOTE: Reward rules will be configured in migration 014_correct_reward_system.sql
-- This migration only sets up the basic table structure
-- The correct reward system uses:
-- - ONLY layer rewards (no direct referral rewards)
-- - 100% NFT price to root member when member upgrades to same layer level
-- - 72-hour pending system with rollup mechanism

-- All reward rules and bonus systems will be implemented in migration 014
-- Migration 008 only creates the basic table structure

-- Migration 008 only creates basic table structures
-- All reward logic, claims, and functions will be in migration 014

-- =============================================
-- BASIC PERMISSIONS
-- =============================================

GRANT SELECT ON public.layer_rules TO authenticated;
GRANT SELECT ON public.nft_levels TO authenticated;
GRANT SELECT ON public.reward_rules TO authenticated;

GRANT SELECT ON public.layer_rules TO anon;
GRANT SELECT ON public.nft_levels TO anon;

-- End of layer and reward rules migration (basic structure only)
-- ========================================
-- 19-Layer Matrix System Deployment
-- Complete Schema + Migrated Data
-- ========================================

BEGIN;

-- Step 1: Create new 19-layer matrix tables
CREATE TABLE IF NOT EXISTS member_referral_tree (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    root_wallet VARCHAR(42) NOT NULL,
    member_wallet VARCHAR(42) NOT NULL,
    layer INTEGER NOT NULL,
    position INTEGER NOT NULL,
    zone TEXT NOT NULL,
    parent_wallet VARCHAR(42),
    parent_position INTEGER,
    placer_wallet VARCHAR(42) NOT NULL,
    placement_type TEXT NOT NULL,
    is_active_position BOOLEAN DEFAULT true NOT NULL,
    member_activated BOOLEAN DEFAULT false NOT NULL,
    registration_order INTEGER NOT NULL,
    placed_at TIMESTAMP DEFAULT NOW() NOT NULL,
    activated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS layer_rewards (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    root_wallet VARCHAR(42) NOT NULL,
    recipient_wallet VARCHAR(42) NOT NULL,
    trigger_wallet VARCHAR(42) NOT NULL,
    trigger_level INTEGER NOT NULL,
    layer_number INTEGER NOT NULL,
    reward_amount_usdt INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    requires_level INTEGER NOT NULL,
    current_recipient_level INTEGER NOT NULL,
    pending_expires_at TIMESTAMP NOT NULL,
    claimed_at TIMESTAMP,
    rolled_up_at TIMESTAMP,
    rollup_to_wallet VARCHAR(42),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS roll_up_records (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    original_recipient VARCHAR(42) NOT NULL,
    final_recipient VARCHAR(42) NOT NULL,
    trigger_wallet VARCHAR(42) NOT NULL,
    trigger_level INTEGER NOT NULL,
    reward_amount_usdt INTEGER NOT NULL,
    rollup_reason TEXT NOT NULL,
    original_pending_id VARCHAR,
    rollup_path JSONB NOT NULL,
    rollup_layer INTEGER NOT NULL,
    processed_at TIMESTAMP DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS member_matrix_summary (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    root_wallet VARCHAR(42) NOT NULL,
    total_members INTEGER DEFAULT 0 NOT NULL,
    activated_members INTEGER DEFAULT 0 NOT NULL,
    deepest_layer INTEGER DEFAULT 0 NOT NULL,
    layer_stats JSONB DEFAULT '[]' NOT NULL,
    next_placement_layer INTEGER DEFAULT 1 NOT NULL,
    next_placement_position INTEGER DEFAULT 0 NOT NULL,
    next_placement_zone TEXT DEFAULT 'L' NOT NULL,
    last_updated TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS member_referral_tree_root_layer_idx ON member_referral_tree(root_wallet, layer);
CREATE INDEX IF NOT EXISTS member_referral_tree_member_idx ON member_referral_tree(member_wallet);
CREATE INDEX IF NOT EXISTS member_referral_tree_root_active_idx ON member_referral_tree(root_wallet, is_active_position);
CREATE INDEX IF NOT EXISTS member_referral_tree_layer_position_idx ON member_referral_tree(root_wallet, layer, position);
CREATE INDEX IF NOT EXISTS member_referral_tree_placement_order_idx ON member_referral_tree(root_wallet, registration_order);

-- Step 3: Migrate existing referral data to new structure
-- (Only if referrals table exists and has data)
DO $$
DECLARE
    migration_count INTEGER;
BEGIN
    -- Check if old referrals table exists and has data
    SELECT COUNT(*) INTO migration_count 
    FROM information_schema.tables 
    WHERE table_name = 'referrals' AND table_schema = 'public';
    
    IF migration_count > 0 THEN
        -- Check if there's data to migrate
        SELECT COUNT(*) INTO migration_count FROM referrals;
        
        IF migration_count > 0 THEN
            -- Migrate data with position conversion
            INSERT INTO member_referral_tree (
                id, root_wallet, member_wallet, layer, position, zone,
                parent_wallet, parent_position, placer_wallet, placement_type,
                is_active_position, member_activated, registration_order, placed_at, activated_at
            )
            SELECT 
                r.id,
                r.root_wallet,
                r.member_wallet,
                r.layer,
                CASE 
                    -- Layer 1 position mapping
                    WHEN r.layer = 1 AND r.position = 'L' THEN 0
                    WHEN r.layer = 1 AND r.position = 'M' THEN 1
                    WHEN r.layer = 1 AND r.position = 'R' THEN 2
                    -- Layer 2 position mapping (3×3 = 9 positions)
                    WHEN r.layer = 2 AND r.position = 'L-L' THEN 0
                    WHEN r.layer = 2 AND r.position = 'L-M' THEN 1
                    WHEN r.layer = 2 AND r.position = 'L-R' THEN 2
                    WHEN r.layer = 2 AND r.position = 'M-L' THEN 3
                    WHEN r.layer = 2 AND r.position = 'M-M' THEN 4
                    WHEN r.layer = 2 AND r.position = 'M-R' THEN 5
                    WHEN r.layer = 2 AND r.position = 'R-L' THEN 6
                    WHEN r.layer = 2 AND r.position = 'R-M' THEN 7
                    WHEN r.layer = 2 AND r.position = 'R-R' THEN 8
                    -- Layer 3 and beyond - simple numeric conversion
                    ELSE CAST(REGEXP_REPLACE(r.position, '[^0-9]', '', 'g') AS INTEGER)
                END as position,
                CASE 
                    WHEN r.position LIKE '%L%' OR r.position = 'L' THEN 'L'
                    WHEN r.position LIKE '%M%' OR r.position = 'M' THEN 'M'
                    WHEN r.position LIKE '%R%' OR r.position = 'R' THEN 'R'
                    ELSE 'L'
                END as zone,
                r.parent_wallet,
                CASE 
                    WHEN r.layer = 1 THEN NULL
                    WHEN r.layer = 2 AND r.position LIKE 'L-%' THEN 0
                    WHEN r.layer = 2 AND r.position LIKE 'M-%' THEN 1
                    WHEN r.layer = 2 AND r.position LIKE 'R-%' THEN 2
                    ELSE NULL
                END as parent_position,
                r.placer_wallet,
                r.placement_type,
                r.is_active,
                true, -- Assume existing referrals are activated
                ROW_NUMBER() OVER (ORDER BY r.placed_at, r.id),
                r.placed_at,
                r.placed_at
            FROM referrals r
            WHERE NOT EXISTS (
                SELECT 1 FROM member_referral_tree mrt 
                WHERE mrt.id = r.id
            )
            ORDER BY r.placed_at, r.id;
            
            RAISE NOTICE 'Migrated % records from referrals to member_referral_tree', migration_count;
        END IF;
    END IF;
END $$;

-- Step 4: Initialize member_matrix_summary for migrated data
INSERT INTO member_matrix_summary (
    root_wallet, total_members, activated_members, deepest_layer, last_updated
)
SELECT 
    root_wallet,
    COUNT(*) as total_members,
    COUNT(CASE WHEN member_activated THEN 1 END) as activated_members,
    MAX(layer) as deepest_layer,
    NOW() as last_updated
FROM member_referral_tree
GROUP BY root_wallet
ON CONFLICT (root_wallet) DO UPDATE SET
    total_members = EXCLUDED.total_members,
    activated_members = EXCLUDED.activated_members,
    deepest_layer = EXCLUDED.deepest_layer,
    last_updated = EXCLUDED.last_updated;

-- Step 5: Add constraints and foreign keys (if referenced tables exist)
DO $$
BEGIN
    -- Only add foreign key constraints if referenced tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        -- Add foreign key constraints
        ALTER TABLE member_referral_tree 
        ADD CONSTRAINT fk_member_referral_tree_root 
        FOREIGN KEY (root_wallet) REFERENCES users(wallet_address) 
        ON DELETE CASCADE;
        
        ALTER TABLE member_referral_tree 
        ADD CONSTRAINT fk_member_referral_tree_member 
        FOREIGN KEY (member_wallet) REFERENCES users(wallet_address) 
        ON DELETE CASCADE;
        
        ALTER TABLE member_referral_tree 
        ADD CONSTRAINT fk_member_referral_tree_placer 
        FOREIGN KEY (placer_wallet) REFERENCES users(wallet_address) 
        ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Constraints already exist
END $$;

COMMIT;

-- Final verification
SELECT 
    'member_referral_tree' as table_name,
    COUNT(*) as record_count
FROM member_referral_tree
UNION ALL
SELECT 
    'layer_rewards' as table_name,
    COUNT(*) as record_count
FROM layer_rewards
UNION ALL
SELECT 
    'member_matrix_summary' as table_name,
    COUNT(*) as record_count
FROM member_matrix_summary;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ 19-Layer Matrix System Successfully Deployed!';
    RAISE NOTICE '🔧 Tables created: member_referral_tree, layer_rewards, roll_up_records, member_matrix_summary';
    RAISE NOTICE '📊 Existing data migrated from referrals table (if available)';
    RAISE NOTICE '🚀 System ready for 19-layer matrix operations';
END $$;
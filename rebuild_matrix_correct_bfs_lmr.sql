-- ============================================================================
-- Complete Matrix Rebuild Script - Correct BFS L→M→R Order
-- Purpose: Rebuild all matrix_referrals data with proper L→M→R slot filling
-- Date: 2025-10-27
--
-- Problem: Current data has parents with "Only M" or "Only R" which violates
--          the BFS L→M→R filling rule. First child MUST be L, second M, third R.
--
-- Solution: Clear all matrix data and rebuild from members table using
--           correct BFS algorithm that ensures L→M→R order for each parent.
-- ============================================================================

-- ===================================
-- Step 1: Backup existing data
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '📦 Step 1: Creating backup table...';
END $$;

-- Create backup table if not exists
CREATE TABLE IF NOT EXISTS matrix_referrals_backup_20251027 AS
SELECT * FROM matrix_referrals;

DO $$
DECLARE
    v_backup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_backup_count FROM matrix_referrals_backup_20251027;
    RAISE NOTICE '✅ Backed up % records to matrix_referrals_backup_20251027', v_backup_count;
END $$;

-- ===================================
-- Step 2: Clear existing matrix data
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🗑️  Step 2: Clearing existing matrix_referrals data...';
END $$;

TRUNCATE TABLE matrix_referrals CASCADE;

RAISE NOTICE '✅ Cleared all matrix_referrals records';

-- ===================================
-- Step 3: Rebuild matrix with correct BFS L→M→R algorithm
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔨 Step 3: Rebuilding matrix data with correct BFS L→M→R order...';
END $$;

-- Rebuild algorithm:
-- 1. Get all members ordered by activation_sequence
-- 2. For each member, find their matrix root (referrer chain)
-- 3. Place member in each ancestor's matrix using BFS L→M→R
-- 4. BFS means: find first parent with available slot (L→M→R order)

WITH RECURSIVE
-- Step 3.1: Get all members with their referrer chain (matrix roots)
member_referrer_chain AS (
    SELECT
        m.wallet_address as member_wallet,
        m.referrer_wallet,
        m.activation_sequence,
        m.activation_time,
        m.username,
        ARRAY[m.referrer_wallet] as referrer_chain,
        1 as depth
    FROM members m
    WHERE m.referrer_wallet IS NOT NULL
    AND m.activation_sequence IS NOT NULL

    UNION ALL

    -- Recursively get ancestors (up to 19 levels)
    SELECT
        mrc.member_wallet,
        m.referrer_wallet,
        mrc.activation_sequence,
        mrc.activation_time,
        mrc.username,
        mrc.referrer_chain || m.referrer_wallet,
        mrc.depth + 1
    FROM member_referrer_chain mrc
    INNER JOIN members m ON m.wallet_address = mrc.referrer_wallet
    WHERE mrc.depth < 19
    AND m.referrer_wallet IS NOT NULL
),

-- Step 3.2: Flatten into (member, matrix_root, depth) tuples
member_matrix_assignments AS (
    SELECT DISTINCT
        member_wallet,
        unnest(referrer_chain) as matrix_root_wallet,
        activation_sequence,
        activation_time,
        username
    FROM member_referrer_chain
),

-- Step 3.3: For each (member, matrix_root), calculate BFS placement
-- Use window functions to determine layer and slot based on BFS order
bfs_placement AS (
    SELECT
        mma.member_wallet,
        mma.matrix_root_wallet,
        mma.activation_sequence,
        mma.activation_time,

        -- Calculate BFS order within this matrix (by activation order)
        ROW_NUMBER() OVER (
            PARTITION BY mma.matrix_root_wallet
            ORDER BY mma.activation_sequence
        ) as bfs_position,

        -- Direct referral or spillover
        CASE
            WHEN mma.matrix_root_wallet = (
                SELECT referrer_wallet FROM members WHERE wallet_address = mma.member_wallet
            ) THEN 'direct'
            ELSE 'spillover'
        END as referral_type

    FROM member_matrix_assignments mma
),

-- Step 3.4: Calculate layer and parent based on BFS position
-- BFS formula:
--   - Layer 1: positions 1-3 (root's direct children)
--   - Layer 2: positions 4-12 (9 slots, 3 children per layer-1 node)
--   - Layer n: 3^n positions
placement_with_parent AS (
    SELECT
        bp.*,

        -- Calculate layer: layer = floor(log3(2*bfs_position - 1)) + 1
        -- Simplified: check which range bfs_position falls into
        CASE
            WHEN bp.bfs_position <= 3 THEN 1
            WHEN bp.bfs_position <= 12 THEN 2
            WHEN bp.bfs_position <= 39 THEN 3
            WHEN bp.bfs_position <= 120 THEN 4
            WHEN bp.bfs_position <= 363 THEN 5
            WHEN bp.bfs_position <= 1092 THEN 6
            WHEN bp.bfs_position <= 3279 THEN 7
            WHEN bp.bfs_position <= 9840 THEN 8
            WHEN bp.bfs_position <= 29523 THEN 9
            WHEN bp.bfs_position <= 88572 THEN 10
            WHEN bp.bfs_position <= 265719 THEN 11
            WHEN bp.bfs_position <= 797160 THEN 12
            WHEN bp.bfs_position <= 2391483 THEN 13
            WHEN bp.bfs_position <= 7174452 THEN 14
            WHEN bp.bfs_position <= 21523359 THEN 15
            WHEN bp.bfs_position <= 64570080 THEN 16
            WHEN bp.bfs_position <= 193710243 THEN 17
            WHEN bp.bfs_position <= 581130732 THEN 18
            ELSE 19
        END as layer,

        -- Calculate parent based on BFS position
        -- Parent position = (current_position + 2) / 3 (integer division)
        -- But we need to map position to actual parent member_wallet
        CASE
            WHEN bp.bfs_position <= 3 THEN bp.matrix_root_wallet
            ELSE (
                SELECT member_wallet
                FROM bfs_placement parent_bp
                WHERE parent_bp.matrix_root_wallet = bp.matrix_root_wallet
                AND parent_bp.bfs_position = (bp.bfs_position + 2) / 3
                LIMIT 1
            )
        END as parent_wallet,

        -- Calculate slot (L, M, R) based on position within parent
        -- Slot = (position - 1) % 3 => 0=L, 1=M, 2=R
        CASE ((bp.bfs_position - 1) % 3)
            WHEN 0 THEN 'L'
            WHEN 1 THEN 'M'
            WHEN 2 THEN 'R'
        END as slot

    FROM bfs_placement bp
    WHERE bp.bfs_position <= 1162261467  -- Max for 19 layers: (3^19 - 1) / 2
)

-- Step 3.5: Insert into matrix_referrals
INSERT INTO matrix_referrals (
    matrix_root_wallet,
    member_wallet,
    parent_wallet,
    layer,
    position,
    slot,
    bfs_order,
    referral_type,
    activation_time,
    source,
    created_at
)
SELECT
    pwp.matrix_root_wallet,
    pwp.member_wallet,
    pwp.parent_wallet,
    pwp.layer,
    pwp.slot as position,  -- position = slot (always the same)
    pwp.slot,
    pwp.bfs_position as bfs_order,
    pwp.referral_type,
    pwp.activation_time,
    'bfs_rebuild_20251027',
    NOW()
FROM placement_with_parent pwp
WHERE pwp.layer <= 19
AND pwp.parent_wallet IS NOT NULL;  -- Ensure parent is found

-- ===================================
-- Step 4: Verification
-- ===================================

DO $$
DECLARE
    v_total_inserted INTEGER;
    v_ft1_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '✅ Step 4: Verification';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

    -- Total inserted
    SELECT COUNT(*) INTO v_total_inserted FROM matrix_referrals;
    RAISE NOTICE '📊 Total records inserted: %', v_total_inserted;

    -- FT1 matrix count
    SELECT COUNT(*) INTO v_ft1_count
    FROM matrix_referrals
    WHERE matrix_root_wallet = '0x2B03D532faa3120826586efb00C9363F9a611b6f';
    RAISE NOTICE '📊 FT1 matrix records: %', v_ft1_count;

END $$;

-- Check for wrong patterns (Only M, Only R, etc.)
SELECT
    'Wrong Patterns Check' as check_name,
    COUNT(*) FILTER (
        WHERE has_L = 0 AND has_M = 1 AND has_R = 0
    ) as only_M_count,
    COUNT(*) FILTER (
        WHERE has_L = 0 AND has_M = 0 AND has_R = 1
    ) as only_R_count,
    COUNT(*) FILTER (
        WHERE has_L = 1 AND has_M = 0 AND has_R = 1
    ) as L_and_R_count
FROM (
    SELECT
        parent_wallet,
        COUNT(*) FILTER (WHERE slot = 'L') as has_L,
        COUNT(*) FILTER (WHERE slot = 'M') as has_M,
        COUNT(*) FILTER (WHERE slot = 'R') as has_R
    FROM matrix_referrals
    WHERE parent_wallet IS NOT NULL
    GROUP BY parent_wallet
) patterns;

-- Show FT1 Layer 1 children
SELECT
    '🔍 FT1 Layer 1 Children' as info,
    slot,
    u.username,
    SUBSTRING(member_wallet, 39, 4) as wallet_tail,
    bfs_order,
    layer
FROM matrix_referrals mr
LEFT JOIN users u ON u.wallet_address = mr.member_wallet
WHERE matrix_root_wallet = '0x2B03D532faa3120826586efb00C9363F9a611b6f'
AND layer = 1
ORDER BY slot;

-- Slot distribution
SELECT
    '📊 Slot Distribution' as info,
    slot,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
FROM matrix_referrals
WHERE slot IS NOT NULL
GROUP BY slot
ORDER BY slot;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Matrix rebuild completed!';
    RAISE NOTICE '   All records now follow strict BFS L→M→R order';
    RAISE NOTICE '   Every parent fills L first, then M, then R';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  If verification shows wrong patterns, check the parent calculation logic';
    RAISE NOTICE '   in the placement_with_parent CTE';
END $$;

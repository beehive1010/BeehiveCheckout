-- ============================================================================
-- Matrix Placement Fix Verification Script
-- Purpose: Verify that matrix placement function and data are correct
-- Date: 2025-10-27
-- ============================================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔍 VERIFICATION 1: Check position and slot field consistency'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

-- Check if position and slot are always the same
SELECT
    'Position vs Slot Mismatch Check' as check_name,
    COUNT(*) FILTER (WHERE position IS NOT NULL AND slot IS NOT NULL AND position != slot) as mismatched_count,
    COUNT(*) FILTER (WHERE position IS NOT NULL AND slot IS NULL) as slot_null_count,
    COUNT(*) FILTER (WHERE position IS NULL AND slot IS NOT NULL) as position_null_count,
    COUNT(*) as total_records
FROM matrix_referrals;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔍 VERIFICATION 2: Check bfs_order field is set for all records'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
    'BFS Order Check' as check_name,
    COUNT(*) FILTER (WHERE bfs_order IS NULL) as null_bfs_order_count,
    COUNT(*) FILTER (WHERE bfs_order IS NOT NULL) as valid_bfs_order_count,
    COUNT(*) as total_records
FROM matrix_referrals;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔍 VERIFICATION 3: Check duplicate slots (should be 0)'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
    'Duplicate Slots Check' as check_name,
    COUNT(*) as duplicate_parent_nodes,
    SUM(dup_count - 1) as total_duplicate_records
FROM (
    SELECT matrix_root_wallet, parent_wallet, slot, COUNT(*) as dup_count
    FROM matrix_referrals
    WHERE slot IS NOT NULL AND parent_wallet IS NOT NULL
    GROUP BY matrix_root_wallet, parent_wallet, slot
    HAVING COUNT(*) > 1
) duplicates;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔍 VERIFICATION 4: FT1 Matrix Tree Structure (First 3 Layers)'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

-- Show FT1's matrix structure with proper L/M/R ordering
WITH RECURSIVE tree AS (
    -- Layer 0: FT1 as root
    SELECT
        mr.matrix_root_wallet,
        mr.member_wallet,
        u.username,
        mr.layer,
        mr.slot,
        mr.bfs_order,
        '🌳 ' || COALESCE(u.username, SUBSTRING(mr.member_wallet, 39, 4)) as display_name,
        ''::TEXT as indent,
        0 as sort_order
    FROM matrix_referrals mr
    LEFT JOIN users u ON u.wallet_address = mr.member_wallet
    WHERE mr.matrix_root_wallet = '0x2B03D532faa3120826586efb00C9363F9a611b6f'
    AND mr.layer = 1  -- Start from layer 1 (FT1's direct children)
    AND mr.parent_wallet = mr.matrix_root_wallet

    UNION ALL

    -- Recursive: Get children
    SELECT
        child.matrix_root_wallet,
        child.member_wallet,
        child_u.username,
        child.layer,
        child.slot,
        child.bfs_order,
        tree.indent || '  ' ||
        CASE child.slot
            WHEN 'L' THEN '├─ L: '
            WHEN 'M' THEN '├─ M: '
            WHEN 'R' THEN '└─ R: '
        END || COALESCE(child_u.username, SUBSTRING(child.member_wallet, 39, 4)) as display_name,
        tree.indent || '  ' as indent,
        -- Sort order: parent's bfs_order * 1000 + slot priority (L=1, M=2, R=3)
        tree.bfs_order * 1000 + CASE child.slot WHEN 'L' THEN 1 WHEN 'M' THEN 2 WHEN 'R' THEN 3 ELSE 4 END
    FROM tree
    JOIN matrix_referrals child ON child.parent_wallet = tree.member_wallet
        AND child.matrix_root_wallet = tree.matrix_root_wallet
    LEFT JOIN users child_u ON child_u.wallet_address = child.member_wallet
    WHERE tree.layer < 3  -- Limit to first 3 layers for display
)
SELECT
    layer,
    slot,
    display_name,
    bfs_order,
    SUBSTRING(member_wallet, 39, 4) as wallet_tail
FROM tree
ORDER BY sort_order;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔍 VERIFICATION 5: FT1 Layer 1 Children (Expected: FT2, FT3, FT4)'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
    mr.layer,
    mr.slot,
    mr.position,
    u.username,
    SUBSTRING(mr.member_wallet, 39, 4) as wallet_tail,
    mr.bfs_order,
    mr.referral_type,
    mr.created_at
FROM matrix_referrals mr
LEFT JOIN users u ON u.wallet_address = mr.member_wallet
WHERE mr.matrix_root_wallet = '0x2B03D532faa3120826586efb00C9363F9a611b6f'
AND mr.layer = 1
ORDER BY mr.slot;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔍 VERIFICATION 6: Slot Distribution (Should be roughly 1:1:1 for L:M:R)'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
    slot,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
FROM matrix_referrals
WHERE slot IS NOT NULL
GROUP BY slot
ORDER BY slot;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔍 VERIFICATION 7: Sample Members with All 3 Children Filled'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
    u.username as parent_name,
    SUBSTRING(mr.parent_wallet, 39, 4) as parent_wallet_tail,
    COUNT(*) FILTER (WHERE mr.slot = 'L') as has_L,
    COUNT(*) FILTER (WHERE mr.slot = 'M') as has_M,
    COUNT(*) FILTER (WHERE mr.slot = 'R') as has_R,
    COUNT(*) as total_children
FROM matrix_referrals mr
LEFT JOIN users u ON u.wallet_address = mr.parent_wallet
WHERE mr.matrix_root_wallet = '0x2B03D532faa3120826586efb00C9363F9a611b6f'
AND mr.parent_wallet IS NOT NULL
GROUP BY mr.parent_wallet, u.username
HAVING COUNT(*) = 3
ORDER BY mr.parent_wallet
LIMIT 10;

\echo ''
\echo '✅ VERIFICATION COMPLETE'
\echo ''

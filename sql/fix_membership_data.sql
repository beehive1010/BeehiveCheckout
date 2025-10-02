-- Fix missing membership data
-- Create member records for users who don't have them
-- and initialize matrix_stats for each member

\echo '🔧 Fixing missing membership and matrix_stats data...'

-- Step 1: Create member records for users who don't have them
INSERT INTO members (wallet_address, current_level, levels_owned, has_pending_rewards, referrer_wallet)
SELECT 
    u.wallet_address,
    0 as current_level,
    '[]'::jsonb as levels_owned,
    false as has_pending_rewards,
    u.referrer_wallet
FROM users u
LEFT JOIN members m ON u.wallet_address = m.wallet_address
WHERE m.wallet_address IS NULL;

\echo '✅ Created member records for users without membership data'

-- Step 2: Initialize matrix_stats for all members (layers 1-19)
-- Only create stats for members who don't have them yet
INSERT INTO matrix_stats (root_wallet, layer_number, total_positions, filled_positions, available_positions)
SELECT 
    m.wallet_address as root_wallet,
    layer.layer_number,
    -- Calculate total positions for this layer (2^layer_number)
    POWER(2, layer.layer_number)::integer as total_positions,
    0 as filled_positions,
    POWER(2, layer.layer_number)::integer as available_positions
FROM members m
CROSS JOIN (
    SELECT generate_series(1, 19) as layer_number
) layer
LEFT JOIN matrix_stats ms ON ms.root_wallet = m.wallet_address AND ms.layer_number = layer.layer_number
WHERE ms.id IS NULL;

\echo '✅ Initialized matrix_stats for all members (layers 1-19)'

-- Step 3: Verify the fixes
\echo ''
\echo '📊 Verification Results:'
SELECT 'Total users:' as metric, COUNT(*)::text as count FROM users
UNION ALL
SELECT 'Total members:', COUNT(*)::text FROM members
UNION ALL
SELECT 'Total matrix_stats records:', COUNT(*)::text FROM matrix_stats
UNION ALL
SELECT 'Users without member records:', COUNT(*)::text 
FROM users u LEFT JOIN members m ON u.wallet_address = m.wallet_address WHERE m.wallet_address IS NULL
UNION ALL
SELECT 'Members without matrix_stats:', COUNT(*)::text
FROM members m LEFT JOIN matrix_stats ms ON m.wallet_address = ms.root_wallet WHERE ms.id IS NULL;

-- Step 4: Show sample data
\echo ''
\echo '📋 Sample member data:'
SELECT wallet_address, current_level, 
       jsonb_array_length(levels_owned) as levels_count,
       has_pending_rewards, created_at
FROM members 
ORDER BY created_at DESC 
LIMIT 5;

\echo ''
\echo '📋 Sample matrix_stats data:'
SELECT root_wallet, layer_number, total_positions, filled_positions, available_positions
FROM matrix_stats 
WHERE root_wallet IN (SELECT wallet_address FROM members LIMIT 2)
AND layer_number <= 3
ORDER BY root_wallet, layer_number;

\echo ''
\echo '✅ Membership and matrix_stats data fix completed!'
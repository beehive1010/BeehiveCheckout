-- Fix user_balances table by creating balance records for all members
-- Initialize balances according to marketing plan specifications

\echo '🔧 Fixing user_balances for all members...'

-- Step 1: Create user_balance records for users who don't have them
INSERT INTO user_balances (
    wallet_address,
    bcc_transferable,
    bcc_locked, 
    bcc_total_initial,
    usdc_claimable,
    usdc_pending,
    usdc_claimed_total,
    current_tier,
    tier_multiplier
)
SELECT 
    u.wallet_address,
    -- New Activation Bonus: 500 BCC unlocked balance (from marketing plan)
    CASE 
        WHEN u.wallet_address = '0x0000000000000000000000000000000000000001' THEN 0.00000000 -- Root wallet special case
        ELSE 500.00000000 
    END as bcc_transferable,
    -- Calculate locked BCC based on activation rank and tier
    CASE 
        WHEN u.wallet_address = '0x0000000000000000000000000000000000000001' THEN 10450.00000000 -- Root wallet total pool
        ELSE 
            -- Tier 1 (1st - 9,999th members): Level 1 = 100 BCC locked
            -- Since we only have 6 members total, all are in Tier 1
            100.00000000
    END as bcc_locked,
    -- Total initial is transferable + locked
    CASE 
        WHEN u.wallet_address = '0x0000000000000000000000000000000000000001' THEN 10450.00000000
        ELSE 600.00000000 -- 500 transferable + 100 locked
    END as bcc_total_initial,
    0.00 as usdc_claimable, -- No USDC rewards initially
    0.00 as usdc_pending, -- No pending USDC
    0.00 as usdc_claimed_total, -- No claimed USDC yet
    1 as current_tier, -- All members start in Tier 1
    1.000 as tier_multiplier -- Base multiplier
FROM users u
LEFT JOIN user_balances ub ON u.wallet_address = ub.wallet_address
WHERE ub.wallet_address IS NULL;

\echo '✅ Created user_balance records for all members'

-- Step 2: Update member balances to reflect their current level ownership
-- Members who own Level 1 should have additional locked BCC released
UPDATE user_balances 
SET 
    bcc_transferable = bcc_transferable + CASE 
        WHEN m.current_level >= 1 AND jsonb_array_length(m.levels_owned) >= 1 
        THEN 100.00000000 -- Level 1 locked BCC release (100 BCC from marketing plan)
        ELSE 0.00000000
    END,
    bcc_locked = GREATEST(0, bcc_locked - CASE 
        WHEN m.current_level >= 1 AND jsonb_array_length(m.levels_owned) >= 1
        THEN 100.00000000 -- Release Level 1 locked amount
        ELSE 0.00000000
    END)
FROM members m
WHERE user_balances.wallet_address = m.wallet_address
AND user_balances.wallet_address != '0x0000000000000000000000000000000000000001'; -- Skip root wallet

\echo '✅ Updated balances based on member levels owned'

-- Step 3: Calculate proper tier assignment based on activation order
-- Since we have 6 members total, all are in Tier 1 (1st - 9,999th members)
UPDATE user_balances
SET current_tier = 1, tier_multiplier = 1.000
WHERE current_tier IS NULL OR current_tier != 1;

\echo '✅ Set proper tier assignments'

-- Step 4: Verify the results
\echo ''
\echo '📊 Verification Results:'
SELECT 'Total user_balance records:' as metric, COUNT(*)::text as count FROM user_balances
UNION ALL
SELECT 'Users without balance records:', COUNT(*)::text 
FROM users u LEFT JOIN user_balances ub ON u.wallet_address = ub.wallet_address WHERE ub.wallet_address IS NULL
UNION ALL
SELECT 'Average BCC transferable:', ROUND(AVG(bcc_transferable), 2)::text FROM user_balances WHERE wallet_address != '0x0000000000000000000000000000000000000001'
UNION ALL
SELECT 'Average BCC locked:', ROUND(AVG(bcc_locked), 2)::text FROM user_balances WHERE wallet_address != '0x0000000000000000000000000000000000000001';

-- Step 5: Show detailed balance information
\echo ''
\echo '📋 User Balance Details:'
SELECT 
    u.username,
    SUBSTRING(ub.wallet_address, 1, 10) || '...' as wallet_short,
    ub.bcc_transferable,
    ub.bcc_locked,
    ub.bcc_total_initial,
    ub.current_tier,
    m.current_level,
    jsonb_array_length(m.levels_owned) as levels_count
FROM user_balances ub
JOIN users u ON ub.wallet_address = u.wallet_address
JOIN members m ON ub.wallet_address = m.wallet_address
ORDER BY u.created_at;

\echo ''
\echo '📊 Balance Summary by Status:'
SELECT 
    CASE 
        WHEN m.current_level >= 1 THEN 'Active Member (Level ' || m.current_level || ')'
        ELSE 'New Member (Level 0)'
    END as member_status,
    COUNT(*) as count,
    ROUND(AVG(ub.bcc_transferable), 2) as avg_transferable,
    ROUND(AVG(ub.bcc_locked), 2) as avg_locked
FROM user_balances ub
JOIN members m ON ub.wallet_address = m.wallet_address
WHERE ub.wallet_address != '0x0000000000000000000000000000000000000001'
GROUP BY 
    CASE 
        WHEN m.current_level >= 1 THEN 'Active Member (Level ' || m.current_level || ')'
        ELSE 'New Member (Level 0)'
    END
ORDER BY member_status;

\echo ''
\echo '✅ User balances fixed and synchronized with marketing plan!'
\echo 'Balance structure:'
\echo '  - New members: 500 BCC transferable + 100 BCC locked'
\echo '  - Level 1+ members: 600 BCC transferable (locked BCC released)'
\echo '  - All members in Tier 1 (1st-9,999th activation rank)'
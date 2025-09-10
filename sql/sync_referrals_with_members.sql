-- Sync referrals table with members table to build complete 3x3 matrix structure
-- Missing members should be added to referrals table with proper spillover placement

\echo '🔧 Syncing referrals table with members table...'

-- Step 1: Check current state
\echo 'Current members:'
SELECT u.username, m.wallet_address, m.referrer_wallet, 'in_members' as source
FROM members m 
JOIN users u ON m.wallet_address = u.wallet_address
ORDER BY m.wallet_address;

\echo ''
\echo 'Current referrals:'
SELECT member_wallet, referrer_wallet, matrix_parent, matrix_position, matrix_layer
FROM referrals
ORDER BY matrix_layer, member_wallet;

-- Step 2: Insert missing members into referrals table with proper matrix placement
-- Function to calculate proper matrix placement based on spillover rules

-- First, let's add the missing members one by one with proper spillover logic
DO $$
DECLARE
    missing_member RECORD;
    parent_wallet TEXT;
    position_char TEXT;
    layer_num INTEGER;
    root_wallet TEXT;
    children_count INTEGER;
BEGIN
    -- Find members not in referrals table (except root)
    FOR missing_member IN
        SELECT m.wallet_address, m.referrer_wallet, u.username
        FROM members m
        JOIN users u ON m.wallet_address = u.wallet_address
        LEFT JOIN referrals r ON m.wallet_address = r.member_wallet
        WHERE r.member_wallet IS NULL 
        AND m.wallet_address != '0x0000000000000000000000000000000000000001' -- Skip root
        ORDER BY m.wallet_address
    LOOP
        RAISE NOTICE 'Processing missing member: % (%)', missing_member.username, missing_member.wallet_address;
        
        -- Set root (for now, use the main root wallet)
        root_wallet := '0x0000000000000000000000000000000000000001';
        
        -- Start with referrer as potential parent
        parent_wallet := missing_member.referrer_wallet;
        layer_num := 1;
        
        -- Check if referrer has space (less than 3 children)
        SELECT COUNT(*) INTO children_count
        FROM referrals 
        WHERE matrix_parent = parent_wallet;
        
        -- If referrer is full, find spillover placement
        WHILE children_count >= 3 LOOP
            -- Find first child of current parent that has space
            SELECT r.member_wallet INTO parent_wallet
            FROM referrals r
            WHERE r.matrix_parent = parent_wallet
            AND (
                SELECT COUNT(*) 
                FROM referrals child 
                WHERE child.matrix_parent = r.member_wallet
            ) < 3
            ORDER BY r.member_wallet
            LIMIT 1;
            
            -- If no available child found, break
            IF parent_wallet IS NULL THEN
                parent_wallet := missing_member.referrer_wallet;
                EXIT;
            END IF;
            
            layer_num := layer_num + 1;
            
            -- Recheck children count for new parent
            SELECT COUNT(*) INTO children_count
            FROM referrals 
            WHERE matrix_parent = parent_wallet;
        END LOOP;
        
        -- Determine position (L, M, R based on available spots)
        SELECT CASE 
            WHEN NOT EXISTS (SELECT 1 FROM referrals WHERE matrix_parent = parent_wallet AND matrix_position = 'L') THEN 'L'
            WHEN NOT EXISTS (SELECT 1 FROM referrals WHERE matrix_parent = parent_wallet AND matrix_position = 'M') THEN 'M'
            WHEN NOT EXISTS (SELECT 1 FROM referrals WHERE matrix_parent = parent_wallet AND matrix_position = 'R') THEN 'R'
            ELSE 'L' -- Fallback
        END INTO position_char;
        
        -- Insert the referral record
        INSERT INTO referrals (
            member_wallet,
            referrer_wallet, 
            matrix_parent,
            matrix_position,
            matrix_layer,
            matrix_root,
            is_active,
            activation_rank,
            placed_at
        ) VALUES (
            missing_member.wallet_address,
            missing_member.referrer_wallet,
            parent_wallet,
            position_char,
            layer_num,
            root_wallet,
            true,
            (SELECT COALESCE(MAX(activation_rank), 0) + 1 FROM referrals),
            now()
        );
        
        RAISE NOTICE 'Added member % at Layer %, Position %, Parent %', 
                     missing_member.username, layer_num, position_char, parent_wallet;
    END LOOP;
END;
$$;

-- Step 3: Verify the results
\echo ''
\echo '📊 Updated referrals structure:'
SELECT 
    u.username,
    r.member_wallet,
    r.referrer_wallet,
    r.matrix_parent,
    r.matrix_position,
    r.matrix_layer,
    r.activation_rank
FROM referrals r
JOIN users u ON r.member_wallet = u.wallet_address
ORDER BY r.matrix_layer, r.activation_rank;

-- Step 4: Test matrix_stats view with complete data
\echo ''
\echo '📊 Updated matrix_stats (should show more filled positions):'
SELECT 
    root_wallet,
    layer_number,
    total_positions,
    filled_positions,
    available_positions,
    ROUND((filled_positions::numeric / total_positions::numeric * 100), 1) as fill_percentage
FROM matrix_stats 
WHERE layer_number <= 3
ORDER BY root_wallet, layer_number;

-- Step 5: Show the matrix structure tree
\echo ''
\echo '📊 Matrix tree structure:'
WITH RECURSIVE matrix_tree AS (
    -- Root level (referrers who are matrix parents but not children)
    SELECT 
        r.member_wallet,
        u.username,
        r.matrix_parent,
        r.matrix_position,
        r.matrix_layer,
        r.member_wallet as path,
        u.username as path_names
    FROM referrals r
    JOIN users u ON r.member_wallet = u.wallet_address
    WHERE r.matrix_layer = 1
    
    UNION ALL
    
    -- Children
    SELECT 
        r.member_wallet,
        u.username,
        r.matrix_parent,
        r.matrix_position,
        r.matrix_layer,
        mt.path || ' > ' || r.member_wallet,
        mt.path_names || ' > ' || u.username
    FROM referrals r
    JOIN users u ON r.member_wallet = u.wallet_address
    JOIN matrix_tree mt ON r.matrix_parent = mt.member_wallet
    WHERE r.matrix_layer <= 3  -- Limit depth for readability
)
SELECT 
    matrix_layer,
    username + ' (' + matrix_position + ')' as member_info,
    path_names as full_path
FROM matrix_tree
ORDER BY matrix_layer, matrix_position;

\echo ''
\echo '✅ Referrals table synced with members - matrix structure complete!'
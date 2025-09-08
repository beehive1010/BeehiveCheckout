-- Manual User Registration and Membership Activation
-- For wallet: 0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab
-- Since NFT was already claimed on-chain but database records are missing

-- Step 1: Insert user record into users table
INSERT INTO users (
    wallet_address,
    username, 
    email,
    referrer_wallet,
    is_upgraded,
    upgrade_timer_enabled,
    created_at,
    updated_at
) VALUES (
    '0x479abda60f8c62a7c3fba411ab948a8be0e616ab', -- wallet address (lowercase)
    'USER_TO_REPLACE', -- Replace with desired username
    'EMAIL_TO_REPLACE', -- Replace with desired email
    '0x0000000000000000000000000000000000000001', -- Default referrer (root)
    false,
    false,
    now(),
    now()
) ON CONFLICT (wallet_address) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    updated_at = now();

-- Step 2: Insert member record into members table (since NFT was already claimed)
INSERT INTO members (
    wallet_address,
    current_level,
    levels_owned,
    has_pending_rewards,
    referrer_wallet,
    activation_rank,
    tier_level,
    created_at,
    updated_at
) VALUES (
    '0x479abda60f8c62a7c3fba411ab948a8be0e616ab', -- wallet address (lowercase)
    1, -- Level 1 NFT
    ARRAY[1], -- Owns Level 1
    false, -- No pending rewards initially
    '0x0000000000000000000000000000000000000001', -- Default referrer (root)
    1, -- First activation rank
    1, -- Tier 1
    now(),
    now()
) ON CONFLICT (wallet_address) DO UPDATE SET
    current_level = EXCLUDED.current_level,
    levels_owned = EXCLUDED.levels_owned,
    updated_at = now();

-- Step 3: Verify the records were created
SELECT 
    'users' as table_name,
    wallet_address,
    username,
    email,
    referrer_wallet,
    created_at
FROM users 
WHERE wallet_address = '0x479abda60f8c62a7c3fba411ab948a8be0e616ab'

UNION ALL

SELECT 
    'members' as table_name,
    wallet_address,
    current_level::text as username,
    levels_owned::text as email,
    referrer_wallet,
    created_at
FROM members 
WHERE wallet_address = '0x479abda60f8c62a7c3fba411ab948a8be0e616ab';
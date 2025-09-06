-- =============================================
-- Create Root Member for Default Referrals
-- This member will be the default referrer for users without referral links
-- Uses custom users table + members table + Supabase auth.users
-- =============================================

-- Step 1: Insert root user record (required for foreign key references)
INSERT INTO public.users (
    wallet_address,
    referrer_wallet,
    username,
    email,
    current_level,
    supabase_user_id,
    pending_enabled,
    pending_hours,
    pending_until,
    created_at,
    updated_at
) VALUES (
    '0x0000000000000000000000000000000000000001', -- Root wallet address
    NULL,                                             -- No referrer (this is the root)
    'Beehive Root',                                   -- Username
    'root@beehive-platform.com',                     -- Email
    19,                                               -- Max level (Level 19)
    NULL,                                             -- No Supabase user (system account)
    false,                                            -- Pending disabled
    NULL,                                             -- No pending hours
    NULL,                                             -- No pending until
    NOW(),                                            -- Created now
    NOW()                                             -- Updated now
);

-- Step 2: Insert root member record
INSERT INTO public.members (
    wallet_address,
    referrer_wallet,
    username,
    email,
    is_activated,
    activated_at,
    current_level,
    max_layer,
    levels_owned,
    has_pending_rewards,
    upgrade_reminder_enabled,
    total_direct_referrals,
    total_team_size,
    created_at,
    updated_at
) VALUES (
    '0x0000000000000000000000000000000000000001', -- Root wallet address
    NULL,                                             -- No referrer (this is the root)
    'Beehive Root',                                   -- Username
    'root@beehive-platform.com',                     -- Email
    true,                                             -- Already activated
    NOW(),                                            -- Activated now
    19,                                               -- Max level (Level 19)
    19,                                               -- Max layer reached
    '[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]'::JSONB, -- Owns all levels
    false,                                            -- No pending rewards
    false,                                            -- No upgrade reminders needed
    0,                                                -- Will be updated as people join
    0,                                                -- Will be updated as team grows
    NOW(),                                            -- Created now
    NOW()                                             -- Updated now
);

-- Step 3: Insert root user balance record
INSERT INTO public.user_balances (
    wallet_address,
    bcc_transferable,
    bcc_locked,
    created_at,
    updated_at
) VALUES (
    '0x0000000000000000000000000000000000000001', -- Same root wallet
    0,                                               -- Starting balance
    0,                                               -- No locked tokens
    NOW(),                                           -- Created now
    NOW()                                            -- Updated now
);

-- Optional: Add some initial system settings for the platform
INSERT INTO public.system_settings (key, value, description, updated_at) VALUES
('default_referrer_wallet', '"0x0000000000000000000000000000000000000001"', 'Default referrer wallet for users without referral links', NOW()),
('platform_fee_percentage', '5', 'Platform fee percentage for transactions', NOW()),
('max_referral_levels', '19', 'Maximum referral levels in the system', NOW())
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- Step 4: Display confirmation
SELECT 
    'Root member created successfully!' as message,
    wallet_address,
    username,
    referrer_wallet,
    is_activated,
    current_level,
    levels_owned
FROM public.members 
WHERE wallet_address = '0x0000000000000000000000000000000000000001';
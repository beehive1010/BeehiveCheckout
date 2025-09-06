-- =============================================
-- Create Root User and Member for Default Referrals
-- This user will be the default referrer for users without referral links
-- =============================================

-- Step 1: Insert root user in users table first (required for foreign key)
INSERT INTO public.users (
    wallet_address,
    referrer_wallet,
    username,
    email,
    is_upgraded,
    upgrade_timer_enabled,
    current_level,
    created_at,
    updated_at
) VALUES (
    '0x0000000000000000000000000000000000000001', -- Root wallet address
    NULL,                                             -- No referrer (this is the root)
    'Beehive Root',                                   -- Username
    'root@beehive-platform.com',                     -- Email
    true,                                             -- Fully upgraded
    false,                                            -- No timer needed
    19,                                               -- Max level
    NOW(),                                            -- Created now
    NOW()                                             -- Updated now
);

-- Step 2: Insert root member record
INSERT INTO public.members (
    wallet_address,
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
    '0x0000000000000000000000000000000000000001', -- Same root wallet address
    true,                                              -- Already activated
    NOW(),                                             -- Activated now
    19,                                                -- Max level (Level 19)
    19,                                                -- Max layer reached
    '[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]'::JSONB, -- Owns all levels
    false,                                             -- No pending rewards
    false,                                             -- No upgrade reminders needed
    0,                                                 -- Will be updated as people join
    0,                                                 -- Will be updated as team grows
    NOW(),                                             -- Created now
    NOW()                                              -- Updated now
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
    'Root user and member created successfully!' as message,
    u.wallet_address,
    u.username,
    u.current_level as user_level,
    m.is_activated,
    m.current_level as member_level,
    m.levels_owned
FROM public.users u
JOIN public.members m ON u.wallet_address = m.wallet_address
WHERE u.wallet_address = '0x0000000000000000000000000000000000000001';
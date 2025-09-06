-- =============================================
-- Create Root Member for Default Referrals
-- This member will be the default referrer for users without referral links
-- Uses public.users table to store comprehensive user information
-- =============================================

-- Step 1: Check if root user already exists and create if needed
DO $$
DECLARE
    existing_user_count INTEGER;
BEGIN
    -- Check if root user already exists
    SELECT COUNT(*) INTO existing_user_count 
    FROM public.users 
    WHERE wallet_address = '0x0000000000000000000000000000000000000001';
    
    IF existing_user_count > 0 THEN
        RAISE NOTICE 'Root user already exists, skipping creation';
        RETURN;
    END IF;
    
    -- Insert comprehensive root user record in public.users
    INSERT INTO public.users (
        wallet_address,
        referrer_wallet,
        username,
        email,
        current_level,
        is_upgraded,
        upgrade_timer_enabled,
        created_at
    ) VALUES (
        '0x0000000000000000000000000000000000000001', -- Root wallet address
        NULL,                                             -- No referrer (this is the root)
        'Beehive Root',                                   -- Username
        'root@beehive-platform.com',                     -- Email
        19,                                               -- Max level (Level 19)
        true,                                             -- Already upgraded
        false,                                            -- No upgrade timer needed
        NOW()                                             -- Created now
    );
    
    RAISE NOTICE 'Root user created successfully';
END $$;

-- Step 2: Insert root member record (with conflict handling)
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
    '0x0000000000000000000000000000000000000001', -- Root wallet address
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
)
ON CONFLICT (wallet_address) DO UPDATE SET
    updated_at = NOW();

-- Step 3: Insert root user balance record
INSERT INTO public.user_balances (
    wallet_address,
    bcc_transferable,
    bcc_locked,
    total_usdt_earned
) VALUES (
    '0x0000000000000000000000000000000000000001', -- Same root wallet
    0,                                               -- Starting balance
    0,                                               -- No locked tokens
    0                                                -- No USDT earned yet
)
ON CONFLICT (wallet_address) DO UPDATE SET
    last_updated = NOW();

-- Step 4: Create initial referral structure for root (self-referral)
-- First disable RLS temporarily to allow root creation
SET LOCAL row_security = off;
INSERT INTO public.referrals (
    root_wallet,
    member_wallet,
    layer,
    position,
    parent_wallet,
    placer_wallet,
    placement_type,
    is_active
) VALUES (
    '0x0000000000000000000000000000000000000001', -- Root wallet
    '0x0000000000000000000000000000000000000001', -- Member wallet (self)
    1,                                                -- Layer 1
    'L',                                              -- Left position
    NULL,                                             -- No parent (this is root)
    '0x0000000000000000000000000000000000000001', -- Placer wallet (self)
    'direct',                                         -- Direct placement (root case)
    true                                              -- Active position
);
-- Re-enable RLS
SET LOCAL row_security = on;

-- Step 5: Add some initial system settings for the platform
INSERT INTO public.admin_settings (setting_key, setting_value, description, updated_at) VALUES
('default_referrer_wallet', '0x0000000000000000000000000000000000000001', 'Default referrer wallet for users without referral links', NOW()),
('platform_fee_percentage', '5', 'Platform fee percentage for transactions', NOW()),
('max_referral_levels', '19', 'Maximum referral levels in the system', NOW())
ON CONFLICT (setting_key) DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- Step 6: Display confirmation
SELECT 
    'Root member created successfully!' as message,
    u.wallet_address,
    u.username,
    u.referrer_wallet,
    m.is_activated,
    m.current_level,
    m.levels_owned
FROM public.users u
JOIN public.members m ON u.wallet_address = m.wallet_address
WHERE u.wallet_address = '0x0000000000000000000000000000000000000001';
-- =============================================
-- Beehive Platform - Admin Control Views
-- Supabase Migration - Views that depend on admin control columns
-- This migration must run AFTER 005_admin_controls.sql
-- =============================================

-- Update user dashboard view to include admin control columns
-- Drop and recreate due to column structure changes
DROP VIEW IF EXISTS public.user_dashboard;

CREATE VIEW public.user_dashboard AS
SELECT 
    u.wallet_address,
    u.username,
    u.email,
    u.referrer_wallet,
    u.current_level,
    u.created_at as user_created_at,
    u.updated_at as user_updated_at,
    
    -- Member data
    m.is_activated,
    m.activated_at,
    m.current_level as member_level,
    m.max_layer,
    m.levels_owned,
    m.has_pending_rewards,
    m.upgrade_reminder_enabled,
    m.last_upgrade_at,
    m.last_reward_claim_at,
    m.total_direct_referrals,
    m.total_team_size,
    m.pending_activation_hours,
    m.activation_expires_at,
    m.admin_set_pending,
    m.admin_wallet,
    
    -- Balance data
    b.bcc_transferable,
    b.bcc_locked,
    b.total_usdt_earned,
    b.pending_upgrade_rewards,
    b.rewards_claimed,
    b.updated_at as balance_updated_at,
    
    -- Derived fields
    CASE 
        WHEN m.is_activated THEN 'activated'
        WHEN m.pending_activation_hours > 0 AND m.activation_expires_at > NOW() THEN 'pending'
        ELSE 'inactive'
    END as activation_status,
    
    -- Time remaining for pending activation
    CASE 
        WHEN m.pending_activation_hours > 0 AND m.activation_expires_at > NOW() 
        THEN m.activation_expires_at - NOW()
        ELSE INTERVAL '0'
    END as pending_time_remaining,
    
    (b.bcc_transferable + b.bcc_locked) as total_bcc_balance
    
FROM public.users u
LEFT JOIN public.members m ON u.wallet_address = m.wallet_address
LEFT JOIN public.user_balances b ON u.wallet_address = b.wallet_address;

-- Admin pending members view
CREATE OR REPLACE VIEW public.admin_pending_members AS
SELECT 
    m.wallet_address,
    u.username,
    u.email,
    u.referrer_wallet,
    m.pending_activation_hours,
    m.activation_expires_at,
    m.admin_set_pending,
    m.admin_wallet,
    u.created_at as member_joined,
    m.created_at as member_record_created,
    
    -- Time remaining
    CASE 
        WHEN m.activation_expires_at > NOW() THEN m.activation_expires_at - NOW()
        ELSE INTERVAL '0'
    END as time_remaining,
    
    -- Status
    CASE 
        WHEN m.activation_expires_at <= NOW() THEN 'expired'
        WHEN m.activation_expires_at > NOW() THEN 'active'
        ELSE 'inactive'
    END as pending_status,
    
    -- Admin who set the pending status
    admin_u.username as admin_username
    
FROM public.members m
LEFT JOIN public.users u ON m.wallet_address = u.wallet_address
LEFT JOIN public.users admin_u ON m.admin_wallet = admin_u.wallet_address
WHERE m.pending_activation_hours > 0 
  AND m.is_activated = false
ORDER BY m.activation_expires_at ASC;

-- Admin actions summary view
CREATE OR REPLACE VIEW public.admin_actions_summary AS
SELECT 
    aa.admin_wallet,
    u.username as admin_username,
    aa.action_type,
    COUNT(*) as total_actions,
    MAX(aa.created_at) as last_action,
    MIN(aa.created_at) as first_action,
    
    -- All logged actions are considered successful
    COUNT(*) as successful_actions,
    100.00 as success_rate
    
FROM public.admin_actions aa
LEFT JOIN public.users u ON aa.admin_wallet = u.wallet_address
GROUP BY aa.admin_wallet, u.username, aa.action_type
ORDER BY aa.admin_wallet, aa.action_type;

-- Global settings view for admin dashboard
CREATE OR REPLACE VIEW public.admin_global_settings AS
SELECT 
    ss.key as setting_name,
    ss.value->>'$' as setting_value,
    'string' as data_type,
    ss.description,
    true as is_active,
    ss.updated_at as created_at,
    ss.updated_at,
    
    -- Parsed values for common settings
    CASE 
        WHEN ss.key = 'activation_pending_enabled' THEN 
            CASE WHEN ss.value->>0 = 'true' THEN 'Enabled' ELSE 'Disabled' END
        WHEN ss.key = 'default_pending_hours' THEN 
            (ss.value->>0) || ' hours'
        ELSE ss.value->>0
    END as formatted_value
    
FROM public.system_settings ss
WHERE ss.key LIKE '%pending%' OR ss.key LIKE '%admin%'
ORDER BY 
    CASE ss.key
        WHEN 'activation_pending_enabled' THEN 1
        WHEN 'default_pending_hours' THEN 2
        WHEN 'max_pending_hours' THEN 3
        ELSE 99
    END,
    ss.key;

-- =============================================
-- Grant permissions for admin views
-- =============================================

-- Grant SELECT permissions to authenticated users (with RLS)
GRANT SELECT ON public.user_dashboard TO authenticated;
GRANT SELECT ON public.admin_pending_members TO authenticated;
GRANT SELECT ON public.admin_actions_summary TO authenticated;
GRANT SELECT ON public.admin_global_settings TO authenticated;

-- Create RLS policies for admin views
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
-- Note: system_settings RLS policies handled elsewhere

-- Note: Views don't support RLS policies - access control handled by underlying tables
-- The following policies would be applied if these were tables instead of views:

-- RLS Policy: Users can only see their own dashboard data (applied to underlying tables)
-- CREATE POLICY "Users can view their own dashboard" ON public.user_dashboard
--     FOR SELECT TO authenticated
--     USING (wallet_address = get_current_wallet_address());

-- RLS Policy: Only admins can see pending members and admin data (applied to underlying tables)
-- CREATE POLICY "Admins can view pending members" ON public.admin_pending_members
--     FOR SELECT TO authenticated
--     USING (
--         EXISTS (
--             SELECT 1 FROM public.users u 
--             WHERE u.wallet_address = get_current_wallet_address()
--             AND (u.is_admin = true OR u.wallet_address = admin_wallet)
--         )
--     );

-- CREATE POLICY "Admins can view admin actions" ON public.admin_actions_summary
--     FOR SELECT TO authenticated
--     USING (
--         EXISTS (
--             SELECT 1 FROM public.users u 
--             WHERE u.wallet_address = get_current_wallet_address()
--             AND u.is_admin = true
--         )
--     );

-- Note: admin_global_settings is a view, RLS handled by underlying system_settings table
-- Views don't support RLS policies - the underlying tables handle access control
-- CREATE POLICY "Admins can view global settings" ON public.admin_global_settings
--     FOR SELECT TO authenticated
--     USING (
--         EXISTS (
--             SELECT 1 FROM public.users u 
--             WHERE u.wallet_address = get_current_wallet_address()
--             AND u.is_admin = true
--         )
--     );

-- End of admin views migration
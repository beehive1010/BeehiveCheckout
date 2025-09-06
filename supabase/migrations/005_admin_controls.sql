-- =============================================
-- Beehive Platform - Admin Controls for Membership Activation
-- Supabase Migration - Admin controls for pending activation periods
-- =============================================

-- Add admin controls to system_settings table
INSERT INTO public.system_settings (key, value, description, updated_at) VALUES
-- Global activation pending control
('activation_pending_enabled', '"false"'::jsonb, 'Enable/disable activation pending periods for new members', NOW()),
('default_pending_hours', '"48"'::jsonb, 'Default number of hours for activation pending period', NOW()),

-- Admin override settings
('admin_can_override_pending', '"true"'::jsonb, 'Allow admins to manually set pending periods for specific users', NOW()),
('max_pending_hours', '"168"'::jsonb, 'Maximum allowed pending hours (1 week)', NOW()),
('min_pending_hours', '"1"'::jsonb, 'Minimum allowed pending hours', NOW()),

-- Notification settings for pending activations
('notify_pending_expiry', '"true"'::jsonb, 'Send notifications when pending activation is about to expire', NOW()),
('pending_expiry_warning_hours', '"24"'::jsonb, 'Send warning notification X hours before expiry', NOW())

ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Add missing admin column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Update members table to include pending activation controls
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS pending_activation_hours INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS activation_expires_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS admin_set_pending BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_wallet VARCHAR(42) NULL;

-- Create index for pending activation queries
CREATE INDEX IF NOT EXISTS idx_members_pending_activation 
ON public.members (activation_expires_at) 
WHERE pending_activation_hours > 0 AND activation_expires_at IS NOT NULL;

-- Create admin actions log table
CREATE TABLE IF NOT EXISTS public.admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_wallet VARCHAR(42) NOT NULL REFERENCES public.users(wallet_address),
    action_type VARCHAR(50) NOT NULL,
    target_wallet VARCHAR(42) REFERENCES public.users(wallet_address),
    action_data JSONB DEFAULT '{}',
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON public.admin_actions (admin_wallet);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON public.admin_actions (target_wallet);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type ON public.admin_actions (action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON public.admin_actions (created_at);

-- Function to check if activation pending is enabled
CREATE OR REPLACE FUNCTION public.is_activation_pending_enabled()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT value::boolean FROM public.system_settings WHERE key = 'activation_pending_enabled');
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get default pending hours
CREATE OR REPLACE FUNCTION public.get_default_pending_hours()
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT value::integer FROM public.system_settings WHERE key = 'default_pending_hours');
EXCEPTION WHEN OTHERS THEN
    RETURN 48; -- Default fallback
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set activation pending period for a member (admin only)
CREATE OR REPLACE FUNCTION public.set_member_activation_pending(
    p_admin_wallet VARCHAR(42),
    p_target_wallet VARCHAR(42),
    p_pending_hours INTEGER,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_is_admin BOOLEAN := false;
    v_max_hours INTEGER;
    v_min_hours INTEGER;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Check if requesting user is admin
    SELECT is_admin INTO v_is_admin 
    FROM public.users 
    WHERE wallet_address = p_admin_wallet;
    
    IF NOT COALESCE(v_is_admin, false) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Admin privileges required'
        );
    END IF;
    
    -- Check if admin override is enabled
    IF NOT (SELECT value::boolean FROM public.system_settings WHERE key = 'admin_can_override_pending') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Admin pending override is disabled'
        );
    END IF;
    
    -- Validate pending hours range
    SELECT value::integer INTO v_max_hours FROM public.system_settings WHERE key = 'max_pending_hours';
    SELECT value::integer INTO v_min_hours FROM public.system_settings WHERE key = 'min_pending_hours';
    
    IF p_pending_hours < COALESCE(v_min_hours, 1) OR p_pending_hours > COALESCE(v_max_hours, 168) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Pending hours must be between %s and %s', COALESCE(v_min_hours, 1), COALESCE(v_max_hours, 168))
        );
    END IF;
    
    -- Calculate expiry time
    v_expires_at := NOW() + (p_pending_hours || ' hours')::INTERVAL;
    
    -- Update member record
    UPDATE public.members SET
        pending_activation_hours = p_pending_hours,
        activation_expires_at = v_expires_at,
        admin_set_pending = true,
        admin_wallet = p_admin_wallet,
        updated_at = NOW()
    WHERE wallet_address = p_target_wallet;
    
    -- Log admin action
    INSERT INTO public.admin_actions (
        admin_wallet,
        action_type,
        target_wallet,
        action_data,
        reason
    ) VALUES (
        p_admin_wallet,
        'set_activation_pending',
        p_target_wallet,
        jsonb_build_object(
            'pending_hours', p_pending_hours,
            'expires_at', v_expires_at
        ),
        p_reason
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'pending_hours', p_pending_hours,
        'expires_at', v_expires_at,
        'message', format('Activation pending set to %s hours for %s', p_pending_hours, p_target_wallet)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear activation pending period (admin only)
CREATE OR REPLACE FUNCTION public.clear_member_activation_pending(
    p_admin_wallet VARCHAR(42),
    p_target_wallet VARCHAR(42),
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_is_admin BOOLEAN := false;
BEGIN
    -- Check if requesting user is admin
    SELECT is_admin INTO v_is_admin 
    FROM public.users 
    WHERE wallet_address = p_admin_wallet;
    
    IF NOT COALESCE(v_is_admin, false) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Admin privileges required'
        );
    END IF;
    
    -- Clear pending activation
    UPDATE public.members SET
        pending_activation_hours = 0,
        activation_expires_at = NULL,
        admin_set_pending = false,
        admin_wallet = NULL,
        updated_at = NOW()
    WHERE wallet_address = p_target_wallet;
    
    -- Log admin action
    INSERT INTO public.admin_actions (
        admin_wallet,
        action_type,
        target_wallet,
        reason
    ) VALUES (
        p_admin_wallet,
        'clear_activation_pending',
        p_target_wallet,
        p_reason
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', format('Activation pending cleared for %s', p_target_wallet)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle global activation pending setting (admin only)
CREATE OR REPLACE FUNCTION public.toggle_activation_pending_global(
    p_admin_wallet VARCHAR(42),
    p_enabled BOOLEAN,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_is_admin BOOLEAN := false;
BEGIN
    -- Check if requesting user is admin
    SELECT is_admin INTO v_is_admin 
    FROM public.users 
    WHERE wallet_address = p_admin_wallet;
    
    IF NOT COALESCE(v_is_admin, false) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Admin privileges required'
        );
    END IF;
    
    -- Update global setting
    UPDATE public.system_settings SET
        value = p_enabled::text,
        updated_at = NOW()
    WHERE key = 'activation_pending_enabled';
    
    -- Log admin action
    INSERT INTO public.admin_actions (
        admin_wallet,
        action_type,
        action_data,
        reason
    ) VALUES (
        p_admin_wallet,
        'toggle_activation_pending_global',
        jsonb_build_object(
            'enabled', p_enabled
        ),
        p_reason
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'enabled', p_enabled,
        'message', format('Global activation pending %s', CASE WHEN p_enabled THEN 'enabled' ELSE 'disabled' END)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get members with pending activation
CREATE OR REPLACE FUNCTION public.get_pending_activations(
    p_admin_wallet VARCHAR(42) DEFAULT NULL
)
RETURNS TABLE (
    wallet_address VARCHAR(42),
    username VARCHAR(100),
    pending_hours INTEGER,
    expires_at TIMESTAMPTZ,
    admin_set_pending BOOLEAN,
    admin_wallet VARCHAR(42),
    created_at TIMESTAMPTZ,
    time_remaining INTERVAL
) AS $$
BEGIN
    -- If admin wallet provided, check admin privileges
    IF p_admin_wallet IS NOT NULL THEN
        IF NOT (SELECT is_admin FROM public.users WHERE wallet_address = p_admin_wallet) THEN
            RAISE EXCEPTION 'Admin privileges required';
        END IF;
    END IF;
    
    RETURN QUERY
    SELECT 
        m.wallet_address,
        u.username,
        m.pending_activation_hours,
        m.activation_expires_at,
        m.admin_set_pending,
        m.admin_wallet,
        u.created_at,
        CASE 
            WHEN m.activation_expires_at > NOW() THEN m.activation_expires_at - NOW()
            ELSE INTERVAL '0'
        END as time_remaining
    FROM public.members m
    LEFT JOIN public.users u ON m.wallet_address = u.wallet_address
    WHERE m.pending_activation_hours > 0 
      AND m.activation_expires_at IS NOT NULL
      AND m.is_activated = false
    ORDER BY m.activation_expires_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the member creation function to handle pending activation
CREATE OR REPLACE FUNCTION public.create_member_with_pending(
    p_wallet_address VARCHAR(42),
    p_use_pending BOOLEAN DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_pending_enabled BOOLEAN;
    v_pending_hours INTEGER := 0;
    v_expires_at TIMESTAMPTZ := NULL;
BEGIN
    -- Check if pending is enabled globally or specifically requested
    v_pending_enabled := is_activation_pending_enabled();
    
    -- Use pending if globally enabled or specifically requested
    IF COALESCE(p_use_pending, v_pending_enabled) THEN
        v_pending_hours := get_default_pending_hours();
        v_expires_at := NOW() + (v_pending_hours || ' hours')::INTERVAL;
    END IF;
    
    -- Create or update member record
    INSERT INTO public.members (
        wallet_address,
        is_activated,
        pending_activation_hours,
        activation_expires_at,
        created_at,
        updated_at
    ) VALUES (
        p_wallet_address,
        false,
        v_pending_hours,
        v_expires_at,
        NOW(),
        NOW()
    )
    ON CONFLICT (wallet_address) DO UPDATE SET
        pending_activation_hours = EXCLUDED.pending_activation_hours,
        activation_expires_at = EXCLUDED.activation_expires_at,
        updated_at = NOW();
    
    RETURN jsonb_build_object(
        'success', true,
        'wallet_address', p_wallet_address,
        'pending_hours', v_pending_hours,
        'expires_at', v_expires_at,
        'has_pending', v_pending_hours > 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies for admin controls
CREATE POLICY "Admins can read all admin actions"
    ON public.admin_actions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE wallet_address = get_current_wallet_address() 
            AND is_admin = true
        )
    );

CREATE POLICY "Admins can create admin actions"
    ON public.admin_actions FOR INSERT
    WITH CHECK (
        admin_wallet = get_current_wallet_address() AND
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE wallet_address = get_current_wallet_address() 
            AND is_admin = true
        )
    );

-- Enable RLS on admin actions table
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Grant permissions on new functions
GRANT EXECUTE ON FUNCTION public.is_activation_pending_enabled() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_default_pending_hours() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_member_activation_pending(VARCHAR, VARCHAR, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_member_activation_pending(VARCHAR, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_activation_pending_global(VARCHAR, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_activations(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_member_with_pending(VARCHAR, BOOLEAN) TO authenticated;

-- Create a trigger to automatically expire pending activations
CREATE OR REPLACE FUNCTION public.check_pending_activation_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- If activation_expires_at has passed, clear the pending status
    IF NEW.activation_expires_at IS NOT NULL 
       AND NEW.activation_expires_at <= NOW() 
       AND NEW.pending_activation_hours > 0 THEN
        
        NEW.pending_activation_hours := 0;
        NEW.activation_expires_at := NULL;
        NEW.admin_set_pending := false;
        NEW.admin_wallet := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_pending_expiry
    BEFORE UPDATE ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION public.check_pending_activation_expiry();

-- End of admin controls migration
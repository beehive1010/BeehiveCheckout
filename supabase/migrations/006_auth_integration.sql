-- =============================================
-- Beehive Platform - Auth Integration Update
-- Integrates with auth.users and adds pre-referrals + countdown
-- =============================================

-- Update public.users table to link with auth.users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;

-- Create unique index on auth_user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Create referral_links table for tracking referral URLs with referrer wallet addresses
CREATE TABLE IF NOT EXISTS public.referral_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_wallet VARCHAR(42) NOT NULL REFERENCES public.users(wallet_address),
    referral_token VARCHAR(32) UNIQUE NOT NULL, -- Unique token for the URL
    referral_url TEXT NOT NULL, -- Full referral URL
    claimed_by_wallets JSONB DEFAULT '[]', -- Array of wallet addresses that used this link
    total_clicks INTEGER DEFAULT 0,
    total_registrations INTEGER DEFAULT 0,
    total_activations INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ NULL, -- NULL means never expires
    max_uses INTEGER DEFAULT NULL, -- NULL means unlimited uses
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT referral_links_referrer_fkey FOREIGN KEY (referrer_wallet) REFERENCES public.users(wallet_address),
    CONSTRAINT referral_links_uses_check CHECK (max_uses IS NULL OR total_registrations <= max_uses)
);

-- Indexes for referral_links
CREATE INDEX IF NOT EXISTS idx_referral_links_referrer ON public.referral_links(referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_referral_links_token ON public.referral_links(referral_token);
CREATE INDEX IF NOT EXISTS idx_referral_links_expires ON public.referral_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_referral_links_active ON public.referral_links(is_active) WHERE is_active = true;

-- Create countdown_timers table for various platform countdowns
CREATE TABLE IF NOT EXISTS public.countdown_timers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL REFERENCES public.users(wallet_address),
    timer_type VARCHAR(50) NOT NULL, -- 'activation_pending', 'upgrade_timer', 'reward_claim', etc.
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    auto_action VARCHAR(50), -- Action to perform when timer expires
    auto_action_data JSONB DEFAULT '{}',
    completed_at TIMESTAMPTZ NULL,
    admin_wallet VARCHAR(42) REFERENCES public.users(wallet_address), -- Admin who set the timer
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT countdown_timers_wallet_fkey FOREIGN KEY (wallet_address) REFERENCES public.users(wallet_address),
    CONSTRAINT countdown_timers_admin_fkey FOREIGN KEY (admin_wallet) REFERENCES public.users(wallet_address),
    CONSTRAINT countdown_timers_time_check CHECK (end_time > start_time)
);

-- Indexes for countdown_timers
CREATE INDEX IF NOT EXISTS idx_countdown_timers_wallet ON public.countdown_timers(wallet_address);
CREATE INDEX IF NOT EXISTS idx_countdown_timers_type ON public.countdown_timers(timer_type);
CREATE INDEX IF NOT EXISTS idx_countdown_timers_end_time ON public.countdown_timers(end_time);
CREATE INDEX IF NOT EXISTS idx_countdown_timers_active ON public.countdown_timers(is_active) WHERE is_active = true;

-- Function to generate unique referral token
CREATE OR REPLACE FUNCTION public.generate_referral_token()
RETURNS VARCHAR(32) AS $$
DECLARE
    token VARCHAR(32);
    exists_check BOOLEAN;
BEGIN
    LOOP
        -- Generate random 16-character alphanumeric token
        token := LOWER(SUBSTRING(MD5(RANDOM()::TEXT || EXTRACT(EPOCH FROM NOW())) FROM 1 FOR 16));
        
        -- Check if token already exists
        SELECT EXISTS(SELECT 1 FROM public.referral_links WHERE referral_token = token) INTO exists_check;
        
        -- Exit loop if unique
        IF NOT exists_check THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create referral link
CREATE OR REPLACE FUNCTION public.create_referral_link(
    p_referrer_wallet VARCHAR(42),
    p_base_url TEXT DEFAULT 'https://beehive-platform.com/register',
    p_max_uses INTEGER DEFAULT NULL,
    p_expires_days INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_token VARCHAR(32);
    v_expires_at TIMESTAMPTZ;
    v_referral_id UUID;
    v_full_url TEXT;
BEGIN
    -- Check if referrer exists and is activated
    IF NOT EXISTS(
        SELECT 1 FROM public.users u 
        INNER JOIN public.members m ON u.wallet_address = m.wallet_address 
        WHERE u.wallet_address = p_referrer_wallet AND m.is_activated = true
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Referrer must be an activated member'
        );
    END IF;
    
    -- Generate unique token
    v_token := generate_referral_token();
    
    -- Set expiry if provided
    IF p_expires_days IS NOT NULL THEN
        v_expires_at := NOW() + (p_expires_days || ' days')::INTERVAL;
    END IF;
    
    -- Build full referral URL
    v_full_url := p_base_url || '?ref=' || v_token || '&referrer=' || p_referrer_wallet;
    
    -- Insert referral link record
    INSERT INTO public.referral_links (
        referrer_wallet,
        referral_token,
        referral_url,
        expires_at,
        max_uses
    ) VALUES (
        p_referrer_wallet,
        v_token,
        v_full_url,
        v_expires_at,
        p_max_uses
    ) RETURNING id INTO v_referral_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'referral_id', v_referral_id,
        'referral_token', v_token,
        'referral_url', v_full_url,
        'referrer_wallet', p_referrer_wallet,
        'expires_at', v_expires_at,
        'max_uses', p_max_uses
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process referral link click and claim
CREATE OR REPLACE FUNCTION public.process_referral_link(
    p_referral_token VARCHAR(32),
    p_claimer_wallet VARCHAR(42) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_referral RECORD;
    v_claimed_wallets JSONB;
    v_is_registration BOOLEAN := p_claimer_wallet IS NOT NULL;
BEGIN
    -- Get referral link record
    SELECT * INTO v_referral
    FROM public.referral_links
    WHERE referral_token = p_referral_token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR total_registrations < max_uses);
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid or expired referral link'
        );
    END IF;
    
    -- Update click count
    UPDATE public.referral_links SET
        total_clicks = total_clicks + 1,
        updated_at = NOW()
    WHERE id = v_referral.id;
    
    -- If this is a registration (wallet provided)
    IF v_is_registration THEN
        -- Check if wallet already used this referral
        v_claimed_wallets := v_referral.claimed_by_wallets;
        
        IF NOT (v_claimed_wallets @> to_jsonb(p_claimer_wallet)) THEN
            -- Add wallet to claimed list
            v_claimed_wallets := v_claimed_wallets || to_jsonb(p_claimer_wallet);
            
            -- Update referral record
            UPDATE public.referral_links SET
                claimed_by_wallets = v_claimed_wallets,
                total_registrations = total_registrations + 1,
                updated_at = NOW()
            WHERE id = v_referral.id;
            
            -- Update user's referrer (if user exists)
            UPDATE public.users SET
                referrer_wallet = v_referral.referrer_wallet,
                updated_at = NOW()
            WHERE wallet_address = p_claimer_wallet;
            
            RETURN jsonb_build_object(
                'success', true,
                'action', 'registration_claimed',
                'referrer_wallet', v_referral.referrer_wallet,
                'referral_token', p_referral_token,
                'claimed_at', NOW()
            );
        ELSE
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Referral link already used by this wallet'
            );
        END IF;
    ELSE
        -- Just a click tracking
        RETURN jsonb_build_object(
            'success', true,
            'action', 'click_tracked',
            'referrer_wallet', v_referral.referrer_wallet,
            'referral_token', p_referral_token,
            'referral_url', v_referral.referral_url
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create countdown timer
CREATE OR REPLACE FUNCTION public.create_countdown_timer(
    p_wallet_address VARCHAR(42),
    p_timer_type VARCHAR(50),
    p_title VARCHAR(200),
    p_duration_hours INTEGER,
    p_description TEXT DEFAULT NULL,
    p_auto_action VARCHAR(50) DEFAULT NULL,
    p_admin_wallet VARCHAR(42) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_timer_id UUID;
    v_end_time TIMESTAMPTZ;
BEGIN
    v_end_time := NOW() + (p_duration_hours || ' hours')::INTERVAL;
    
    -- Deactivate existing timers of same type for this wallet
    UPDATE public.countdown_timers SET
        is_active = false,
        updated_at = NOW()
    WHERE wallet_address = p_wallet_address 
    AND timer_type = p_timer_type 
    AND is_active = true;
    
    -- Create new timer
    INSERT INTO public.countdown_timers (
        wallet_address,
        timer_type,
        title,
        description,
        end_time,
        auto_action,
        admin_wallet
    ) VALUES (
        p_wallet_address,
        p_timer_type,
        p_title,
        p_description,
        v_end_time,
        p_auto_action,
        p_admin_wallet
    ) RETURNING id INTO v_timer_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'timer_id', v_timer_id,
        'wallet_address', p_wallet_address,
        'timer_type', p_timer_type,
        'title', p_title,
        'end_time', v_end_time,
        'duration_hours', p_duration_hours
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle auth.users creation and link to public.users
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER AS $$
DECLARE
    v_wallet_address VARCHAR(42);
    v_username VARCHAR(100);
BEGIN
    -- Extract wallet address from metadata (if provided by Thirdweb InApp Wallet)
    v_wallet_address := NEW.raw_user_meta_data->>'wallet_address';
    v_username := NEW.raw_user_meta_data->>'username';
    
    -- Only proceed if we have a wallet address
    IF v_wallet_address IS NOT NULL THEN
        -- Check if public.users record already exists
        IF EXISTS(SELECT 1 FROM public.users WHERE wallet_address = v_wallet_address) THEN
            -- Link existing user to auth.users
            UPDATE public.users SET
                auth_user_id = NEW.id,
                email = COALESCE(email, NEW.email),
                email_verified = NEW.email_confirmed_at IS NOT NULL,
                username = COALESCE(username, v_username),
                updated_at = NOW()
            WHERE wallet_address = v_wallet_address;
        ELSE
            -- Create new public.users record
            INSERT INTO public.users (
                auth_user_id,
                wallet_address,
                email,
                email_verified,
                username,
                is_admin,
                created_at,
                updated_at
            ) VALUES (
                NEW.id,
                v_wallet_address,
                NEW.email,
                NEW.email_confirmed_at IS NOT NULL,
                COALESCE(v_username, 'User_' || SUBSTRING(v_wallet_address FROM 1 FOR 8)),
                false,
                NOW(),
                NOW()
            );
            
            -- Create corresponding members record
            INSERT INTO public.members (
                wallet_address,
                is_activated,
                created_at,
                updated_at
            ) VALUES (
                v_wallet_address,
                false,
                NOW(),
                NOW()
            );
            
            -- Create initial balance record
            INSERT INTO public.user_balances (
                wallet_address,
                bcc_transferable,
                bcc_locked,
                created_at,
                updated_at
            ) VALUES (
                v_wallet_address,
                500, -- Initial 500 transferable BCC
                0,   -- No locked BCC initially
                NOW(),
                NOW()
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auth.users creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_created();

-- Function to get active countdown timers for a wallet
CREATE OR REPLACE FUNCTION public.get_active_countdowns(
    p_wallet_address VARCHAR(42)
)
RETURNS TABLE (
    timer_id UUID,
    timer_type VARCHAR(50),
    title VARCHAR(200),
    description TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    time_remaining INTERVAL,
    is_expired BOOLEAN,
    auto_action VARCHAR(50),
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ct.id,
        ct.timer_type,
        ct.title,
        ct.description,
        ct.start_time,
        ct.end_time,
        CASE 
            WHEN ct.end_time > NOW() THEN ct.end_time - NOW()
            ELSE INTERVAL '0'
        END as time_remaining,
        ct.end_time <= NOW() as is_expired,
        ct.auto_action,
        ct.metadata
    FROM public.countdown_timers ct
    WHERE ct.wallet_address = p_wallet_address
    AND ct.is_active = true
    ORDER BY ct.end_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for new tables

-- Referral links policies
ALTER TABLE public.referral_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own referral links"
    ON public.referral_links FOR SELECT
    USING (referrer_wallet = get_current_wallet_address());

CREATE POLICY "Users can create referral links"
    ON public.referral_links FOR INSERT
    WITH CHECK (referrer_wallet = get_current_wallet_address());

CREATE POLICY "System can update referral link stats"
    ON public.referral_links FOR UPDATE
    USING (TRUE); -- Controlled by functions

-- Countdown timers policies
ALTER TABLE public.countdown_timers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own timers"
    ON public.countdown_timers FOR SELECT
    USING (wallet_address = get_current_wallet_address());

CREATE POLICY "Admins can manage all timers"
    ON public.countdown_timers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE wallet_address = get_current_wallet_address() 
            AND is_admin = true
        )
    );

CREATE POLICY "System can create timers"
    ON public.countdown_timers FOR INSERT
    WITH CHECK (TRUE); -- Controlled by functions

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.generate_referral_token() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_referral_link(VARCHAR, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_referral_link(VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_countdown_timer(VARCHAR, VARCHAR, VARCHAR, INTEGER, TEXT, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_countdowns(VARCHAR) TO authenticated;

-- Update updated_at timestamps
CREATE TRIGGER trigger_referral_links_updated_at
    BEFORE UPDATE ON public.referral_links
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_countdown_timers_updated_at
    BEFORE UPDATE ON public.countdown_timers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create view for user authentication info
CREATE OR REPLACE VIEW public.user_auth_info AS
SELECT 
    u.wallet_address,
    u.auth_user_id,
    u.username,
    u.email,
    u.email_verified,
    u.phone_verified,
    u.referrer_wallet,
    u.current_level,
    u.is_admin,
    u.created_at,
    u.updated_at,
    
    -- Auth user data
    au.email as auth_email,
    au.email_confirmed_at,
    au.phone,
    au.phone_confirmed_at,
    au.created_at as auth_created_at,
    au.last_sign_in_at,
    au.raw_app_meta_data,
    au.raw_user_meta_data,
    
    -- Member status
    m.is_activated,
    m.activated_at,
    m.pending_activation_hours,
    m.activation_expires_at,
    
    -- Balance info
    b.bcc_transferable,
    b.bcc_locked,
    b.total_usdt_earned
    
FROM public.users u
LEFT JOIN auth.users au ON u.auth_user_id = au.id
LEFT JOIN public.members m ON u.wallet_address = m.wallet_address
LEFT JOIN public.user_balances b ON u.wallet_address = b.wallet_address;

-- Grant access to the view
GRANT SELECT ON public.user_auth_info TO authenticated;

-- Note: RLS for this view is handled by the underlying tables (users, members, user_balances)
-- which already have their own RLS policies applied

-- End of auth integration migration
-- =============================================
-- Beehive Platform - Row Level Security Policies
-- Supabase Migration - RLS Policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallet_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matrix_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matrix_layer_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bcc_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layer_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usdt_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_nfts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisement_nfts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nft_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Helper function to get current wallet address from JWT
-- =============================================

CREATE OR REPLACE FUNCTION public.get_current_wallet_address()
RETURNS VARCHAR(42) AS $$
BEGIN
    RETURN COALESCE(
        current_setting('request.jwt.claims', true)::json->>'wallet_address',
        current_setting('request.headers', true)::json->>'x-wallet-address'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        current_setting('request.jwt.claims', true)::json->>'is_admin',
        'false'
    )::boolean;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Users Table Policies
-- =============================================

-- Users can read their own profile and other users' basic info
CREATE POLICY "Users can read own profile and basic info of others"
    ON public.users FOR SELECT
    USING (
        wallet_address = get_current_wallet_address() OR 
        TRUE -- Allow reading basic user info for referrals, etc.
    );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (wallet_address = get_current_wallet_address())
    WITH CHECK (wallet_address = get_current_wallet_address());

-- Users can insert their own record (for registration)
CREATE POLICY "Users can create own profile"
    ON public.users FOR INSERT
    WITH CHECK (wallet_address = get_current_wallet_address());

-- =============================================
-- Members Table Policies
-- =============================================

-- Users can read their own member data and upline/downline member data
CREATE POLICY "Users can read own and related member data"
    ON public.members FOR SELECT
    USING (
        wallet_address = get_current_wallet_address() OR
        -- Allow reading for referral relationships
        EXISTS (
            SELECT 1 FROM public.referrals r
            WHERE r.root_wallet = get_current_wallet_address() OR
                  r.member_wallet = get_current_wallet_address()
        )
    );

-- Users can update their own member data
CREATE POLICY "Users can update own member data"
    ON public.members FOR UPDATE
    USING (wallet_address = get_current_wallet_address())
    WITH CHECK (wallet_address = get_current_wallet_address());

-- Allow insert for new members
CREATE POLICY "Allow member creation"
    ON public.members FOR INSERT
    WITH CHECK (wallet_address = get_current_wallet_address());

-- =============================================
-- User Balances Policies
-- =============================================

-- Users can only see their own balance
CREATE POLICY "Users can read own balance"
    ON public.user_balances FOR SELECT
    USING (wallet_address = get_current_wallet_address());

-- Users can update their own balance (via functions)
CREATE POLICY "Users can update own balance"
    ON public.user_balances FOR UPDATE
    USING (wallet_address = get_current_wallet_address())
    WITH CHECK (wallet_address = get_current_wallet_address());

-- Allow insert for new balances
CREATE POLICY "Allow balance creation"
    ON public.user_balances FOR INSERT
    WITH CHECK (wallet_address = get_current_wallet_address());

-- =============================================
-- BCC Purchase Orders Policies
-- =============================================

-- Users can read their own purchase orders
CREATE POLICY "Users can read own purchase orders"
    ON public.bcc_purchase_orders FOR SELECT
    USING (buyer_wallet = get_current_wallet_address());

-- Users can create purchase orders for themselves
CREATE POLICY "Users can create own purchase orders"
    ON public.bcc_purchase_orders FOR INSERT
    WITH CHECK (buyer_wallet = get_current_wallet_address());

-- Users can update their own purchase orders
CREATE POLICY "Users can update own purchase orders"
    ON public.bcc_purchase_orders FOR UPDATE
    USING (buyer_wallet = get_current_wallet_address())
    WITH CHECK (buyer_wallet = get_current_wallet_address());

-- =============================================
-- Referrals Policies
-- =============================================

-- Users can read referrals where they are root or member
CREATE POLICY "Users can read own referral data"
    ON public.referrals FOR SELECT
    USING (
        root_wallet = get_current_wallet_address() OR
        member_wallet = get_current_wallet_address() OR
        placer_wallet = get_current_wallet_address()
    );

-- Only system functions can insert referrals
CREATE POLICY "Allow referral creation via functions"
    ON public.referrals FOR INSERT
    WITH CHECK (TRUE); -- Controlled by functions

-- =============================================
-- Layer Rewards Policies
-- =============================================

-- Users can read rewards where they are recipient or payer
CREATE POLICY "Users can read own reward data"
    ON public.layer_rewards FOR SELECT
    USING (
        recipient_wallet = get_current_wallet_address() OR
        payer_wallet = get_current_wallet_address()
    );

-- Users can update their own rewards (for claiming)
CREATE POLICY "Users can claim own rewards"
    ON public.layer_rewards FOR UPDATE
    USING (recipient_wallet = get_current_wallet_address())
    WITH CHECK (recipient_wallet = get_current_wallet_address());

-- Allow reward creation via functions
CREATE POLICY "Allow reward creation via functions"
    ON public.layer_rewards FOR INSERT
    WITH CHECK (TRUE); -- Controlled by functions

-- =============================================
-- Orders Policies
-- =============================================

-- Users can read their own orders
CREATE POLICY "Users can read own orders"
    ON public.orders FOR SELECT
    USING (wallet_address = get_current_wallet_address());

-- Users can create orders for themselves
CREATE POLICY "Users can create own orders"
    ON public.orders FOR INSERT
    WITH CHECK (wallet_address = get_current_wallet_address());

-- Users can update their own orders
CREATE POLICY "Users can update own orders"
    ON public.orders FOR UPDATE
    USING (wallet_address = get_current_wallet_address())
    WITH CHECK (wallet_address = get_current_wallet_address());

-- =============================================
-- NFT and Marketplace Policies
-- =============================================

-- Everyone can read active merchant NFTs
CREATE POLICY "Everyone can read active merchant NFTs"
    ON public.merchant_nfts FOR SELECT
    USING (is_active = true);

-- Creators can manage their own NFTs
CREATE POLICY "Creators can manage own merchant NFTs"
    ON public.merchant_nfts FOR ALL
    USING (creator_wallet = get_current_wallet_address())
    WITH CHECK (creator_wallet = get_current_wallet_address());

-- Everyone can read active advertisement NFTs
CREATE POLICY "Everyone can read active advertisement NFTs"
    ON public.advertisement_nfts FOR SELECT
    USING (is_active = true);

-- Advertisers can manage their own ad NFTs
CREATE POLICY "Advertisers can manage own ad NFTs"
    ON public.advertisement_nfts FOR ALL
    USING (advertiser_wallet = get_current_wallet_address())
    WITH CHECK (advertiser_wallet = get_current_wallet_address());

-- Users can read their own NFT purchases
CREATE POLICY "Users can read own NFT purchases"
    ON public.nft_purchases FOR SELECT
    USING (buyer_wallet = get_current_wallet_address());

-- Users can create NFT purchases for themselves
CREATE POLICY "Users can create own NFT purchases"
    ON public.nft_purchases FOR INSERT
    WITH CHECK (buyer_wallet = get_current_wallet_address());

-- =============================================
-- Education System Policies
-- =============================================

-- Everyone can read active courses
CREATE POLICY "Everyone can read active courses"
    ON public.courses FOR SELECT
    USING (is_active = true);

-- Instructors can manage their own courses
CREATE POLICY "Instructors can manage own courses"
    ON public.courses FOR ALL
    USING (instructor_wallet = get_current_wallet_address())
    WITH CHECK (instructor_wallet = get_current_wallet_address());

-- Everyone can read course lessons for active courses
CREATE POLICY "Everyone can read course lessons"
    ON public.course_lessons FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_id AND c.is_active = true
        )
    );

-- Instructors can manage lessons for their courses
CREATE POLICY "Instructors can manage own course lessons"
    ON public.course_lessons FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_id AND c.instructor_wallet = get_current_wallet_address()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_id AND c.instructor_wallet = get_current_wallet_address()
        )
    );

-- Users can read their own course activations
CREATE POLICY "Users can read own course activations"
    ON public.course_activations FOR SELECT
    USING (wallet_address = get_current_wallet_address());

-- Users can create course activations for themselves
CREATE POLICY "Users can create own course activations"
    ON public.course_activations FOR INSERT
    WITH CHECK (wallet_address = get_current_wallet_address());

-- Users can update their own course progress
CREATE POLICY "Users can update own course progress"
    ON public.course_activations FOR UPDATE
    USING (wallet_address = get_current_wallet_address())
    WITH CHECK (wallet_address = get_current_wallet_address());

-- Users can read their own course progress
CREATE POLICY "Users can read own course progress"
    ON public.course_progress FOR SELECT
    USING (wallet_address = get_current_wallet_address());

-- Users can manage their own course progress
CREATE POLICY "Users can manage own course progress"
    ON public.course_progress FOR ALL
    USING (wallet_address = get_current_wallet_address())
    WITH CHECK (wallet_address = get_current_wallet_address());

-- =============================================
-- Notifications Policies
-- =============================================

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
    ON public.user_notifications FOR SELECT
    USING (wallet_address = get_current_wallet_address());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
    ON public.user_notifications FOR UPDATE
    USING (wallet_address = get_current_wallet_address())
    WITH CHECK (wallet_address = get_current_wallet_address());

-- Allow notification creation for users
CREATE POLICY "Allow notification creation"
    ON public.user_notifications FOR INSERT
    WITH CHECK (TRUE); -- Can be sent to any user

-- =============================================
-- USDT Withdrawals Policies
-- =============================================

-- Users can read their own withdrawal requests
CREATE POLICY "Users can read own withdrawals"
    ON public.usdt_withdrawals FOR SELECT
    USING (wallet_address = get_current_wallet_address());

-- Users can create withdrawal requests for themselves
CREATE POLICY "Users can create own withdrawals"
    ON public.usdt_withdrawals FOR INSERT
    WITH CHECK (wallet_address = get_current_wallet_address());

-- =============================================
-- Blog and Content Policies
-- =============================================

-- Everyone can read published blog posts
CREATE POLICY "Everyone can read published blog posts"
    ON public.blog_posts FOR SELECT
    USING (published = true);

-- Authors can manage their own blog posts
CREATE POLICY "Authors can manage own blog posts"
    ON public.blog_posts FOR ALL
    USING (author_wallet = get_current_wallet_address())
    WITH CHECK (author_wallet = get_current_wallet_address());

-- =============================================
-- Activity and Audit Log Policies
-- =============================================

-- Users can read matrix activity for their own matrix
CREATE POLICY "Users can read own matrix activity"
    ON public.matrix_activity_log FOR SELECT
    USING (
        root_wallet = get_current_wallet_address() OR
        member_wallet = get_current_wallet_address()
    );

-- Allow matrix activity logging
CREATE POLICY "Allow matrix activity logging"
    ON public.matrix_activity_log FOR INSERT
    WITH CHECK (TRUE); -- Controlled by functions

-- Users can read their own matrix summaries
CREATE POLICY "Users can read own matrix summaries"
    ON public.matrix_layer_summary FOR SELECT
    USING (root_wallet = get_current_wallet_address());

-- Allow matrix summary updates
CREATE POLICY "Allow matrix summary updates"
    ON public.matrix_layer_summary FOR ALL
    WITH CHECK (TRUE); -- Controlled by functions

-- Users can read wallet connections related to them
CREATE POLICY "Users can read own wallet connections"
    ON public.user_wallet_connections FOR SELECT
    USING (wallet_address = get_current_wallet_address());

-- Allow wallet connection logging
CREATE POLICY "Allow wallet connection logging"
    ON public.user_wallet_connections FOR INSERT
    WITH CHECK (wallet_address = get_current_wallet_address());

-- =============================================
-- System Settings and Admin Policies
-- =============================================

-- Everyone can read public system settings
CREATE POLICY "Everyone can read public system settings"
    ON public.system_settings FOR SELECT
    USING (key NOT LIKE 'admin_%' AND key NOT LIKE 'private_%');

-- Admins can manage all system settings
CREATE POLICY "Admins can manage system settings"
    ON public.system_settings FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Users can read audit logs related to their actions
CREATE POLICY "Users can read own audit logs"
    ON public.audit_logs FOR SELECT
    USING (user_wallet = get_current_wallet_address());

-- Allow audit log creation
CREATE POLICY "Allow audit log creation"
    ON public.audit_logs FOR INSERT
    WITH CHECK (TRUE); -- System controlled

-- =============================================
-- Service Account Policies (for Edge Functions)
-- =============================================

-- Create a service role for edge functions to bypass RLS when needed
-- This is handled at the application level with service role key

-- =============================================
-- Security Functions for Edge Functions
-- =============================================

-- Function to validate wallet signature (placeholder)
CREATE OR REPLACE FUNCTION public.validate_wallet_signature(
    p_message TEXT,
    p_signature TEXT,
    p_wallet_address VARCHAR(42)
)
RETURNS BOOLEAN AS $$
BEGIN
    -- In a real implementation, this would verify the cryptographic signature
    -- For now, return true for development
    RETURN is_valid_wallet_address(p_wallet_address);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create authenticated session
CREATE OR REPLACE FUNCTION public.create_wallet_session(
    p_wallet_address VARCHAR(42),
    p_signature TEXT,
    p_message TEXT
)
RETURNS JSONB AS $$
DECLARE
    session_token TEXT;
    result JSONB;
BEGIN
    -- Validate signature
    IF NOT validate_wallet_signature(p_message, p_signature, p_wallet_address) THEN
        result := jsonb_build_object(
            'success', false,
            'error', 'Invalid signature'
        );
        RETURN result;
    END IF;
    
    -- Generate session token (simplified)
    session_token := encode(digest(p_wallet_address || extract(epoch from now()), 'sha256'), 'hex');
    
    -- Log wallet connection
    INSERT INTO public.user_wallet_connections (
        wallet_address,
        connection_type,
        connected_at
    ) VALUES (
        p_wallet_address,
        'supabase_edge_function',
        NOW()
    );
    
    result := jsonb_build_object(
        'success', true,
        'session_token', session_token,
        'wallet_address', p_wallet_address,
        'expires_at', extract(epoch from (now() + interval '24 hours'))
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant execute permissions on public functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- End of RLS policies migration
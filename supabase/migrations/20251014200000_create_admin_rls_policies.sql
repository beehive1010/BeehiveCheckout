-- Create RLS policies to allow admins full access to all data
-- This enables admin users (authenticated via admins table) to manage all platform data

-- Helper function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.admins
        WHERE id = auth.uid()
            AND is_active = true
    );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_user_admin() TO authenticated;

COMMENT ON FUNCTION public.is_user_admin() IS 'Checks if the current authenticated user is an active admin by looking up their ID in the admins table';

-- Add admin access policies to key tables

-- users table
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Admins can manage all users"
    ON public.users
    FOR ALL
    USING (is_user_admin());

-- members table
DROP POLICY IF EXISTS "Admins can manage all members" ON public.members;
CREATE POLICY "Admins can manage all members"
    ON public.members
    FOR ALL
    USING (is_user_admin());

-- user_balances table
DROP POLICY IF EXISTS "Admins can manage all balances" ON public.user_balances;
CREATE POLICY "Admins can manage all balances"
    ON public.user_balances
    FOR ALL
    USING (is_user_admin());

-- member_balance table
DROP POLICY IF EXISTS "Admins can manage all member balances" ON public.member_balance;
CREATE POLICY "Admins can manage all member balances"
    ON public.member_balance
    FOR ALL
    USING (is_user_admin());

-- layer_rewards table
DROP POLICY IF EXISTS "Admins can manage all rewards" ON public.layer_rewards;
CREATE POLICY "Admins can manage all rewards"
    ON public.layer_rewards
    FOR ALL
    USING (is_user_admin());

-- usdt_withdrawals table
DROP POLICY IF EXISTS "Admins can manage all withdrawals" ON public.usdt_withdrawals;
CREATE POLICY "Admins can manage all withdrawals"
    ON public.usdt_withdrawals
    FOR ALL
    USING (is_user_admin());

-- direct_referral_rewards table
DROP POLICY IF EXISTS "Admins can manage all referral rewards" ON public.direct_referral_rewards;
CREATE POLICY "Admins can manage all referral rewards"
    ON public.direct_referral_rewards
    FOR ALL
    USING (is_user_admin());

-- matrix_referrals table (if exists)
DROP POLICY IF EXISTS "Admins can manage all matrix referrals" ON public.matrix_referrals;
CREATE POLICY "Admins can manage all matrix referrals"
    ON public.matrix_referrals
    FOR ALL
    USING (is_user_admin());

-- referrals table (if exists)
DROP POLICY IF EXISTS "Admins can manage all referrals" ON public.referrals;
CREATE POLICY "Admins can manage all referrals"
    ON public.referrals
    FOR ALL
    USING (is_user_admin());

-- Admin notification
DO $$
BEGIN
    RAISE NOTICE 'Admin RLS policies created successfully. Admin users can now access all platform data through Supabase client.';
END $$;

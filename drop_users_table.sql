-- =============================================
-- Remove custom users table and fix foreign keys
-- Use Supabase auth.users + members table instead
-- =============================================

-- Step 1: Drop foreign key constraints that reference the custom users table
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_wallet_address_fkey;
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_root_wallet_fkey;
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_member_wallet_fkey;
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_parent_wallet_fkey;
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_placer_wallet_fkey;
ALTER TABLE public.user_balances DROP CONSTRAINT IF EXISTS user_balances_wallet_address_fkey;

-- Step 2: Drop the custom users table
DROP TABLE IF EXISTS public.users CASCADE;

-- Step 3: Add referrer_wallet to members table since we don't have users table
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS referrer_wallet VARCHAR(42);
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS email TEXT;

-- Step 4: Create index for referrer lookups
CREATE INDEX IF NOT EXISTS idx_members_referrer ON public.members(referrer_wallet);

-- Confirmation
SELECT 'Custom users table removed. Using auth.users + members table structure.' as message;
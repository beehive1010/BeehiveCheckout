-- Fix RLS policies for nft_purchases table
-- ========================================
-- This fixes the "new row violates row-level security policy" error
-- when users try to purchase NFTs
-- ========================================

SELECT '=== Fixing nft_purchases RLS policies ===' as fix_section;

-- Check if RLS is enabled and policies exist
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'nft_purchases'
UNION ALL
SELECT 
  schemaname,
  tablename,
  rowsecurity::text,
  'NO_POLICIES' as policyname,
  null as permissive,
  null as roles,
  null as cmd,
  null as qual,
  null as with_check
FROM pg_tables 
WHERE tablename = 'nft_purchases' 
  AND schemaname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'nft_purchases'
  );

-- Step 1: Ensure RLS is enabled on nft_purchases
ALTER TABLE nft_purchases ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies if they exist (to avoid conflicts)
DO $$
BEGIN
    -- Drop all existing policies on nft_purchases table
    EXECUTE 'DROP POLICY IF EXISTS "Users can read own purchases" ON nft_purchases';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create own purchases" ON nft_purchases';
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access nft_purchases" ON nft_purchases';
    EXECUTE 'DROP POLICY IF EXISTS "Public can read purchases" ON nft_purchases';
    EXECUTE 'DROP POLICY IF EXISTS "Allow NFT purchases" ON nft_purchases';
    RAISE NOTICE '✅ Dropped existing nft_purchases policies';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Some policies may not have existed: %', SQLERRM;
END $$;

-- Step 3: Create new RLS policies for nft_purchases table

-- Allow users to read their own purchase records
CREATE POLICY "Users can read own purchases" ON nft_purchases
    FOR SELECT 
    USING (buyer_wallet::text = current_setting('request.jwt.claims', true)::json ->> 'wallet_address'::text);

-- Allow users to insert their own purchase records
CREATE POLICY "Users can create own purchases" ON nft_purchases
    FOR INSERT 
    WITH CHECK (buyer_wallet::text = current_setting('request.jwt.claims', true)::json ->> 'wallet_address'::text);

-- Allow service role full access (for admin operations and edge functions)
CREATE POLICY "Service role full access nft_purchases" ON nft_purchases
    FOR ALL 
    TO service_role
    USING (true) 
    WITH CHECK (true);

-- Allow anon users to insert purchases (for wallet-based auth)
-- This is needed since our app uses wallet authentication, not Supabase auth
CREATE POLICY "Allow NFT purchases for wallet users" ON nft_purchases
    FOR INSERT 
    TO anon, authenticated
    WITH CHECK (true);

-- Allow reading purchase records for public display/verification
CREATE POLICY "Public can read purchases" ON nft_purchases
    FOR SELECT 
    TO anon, authenticated
    USING (true);

-- Step 4: Verify policies are created
SELECT '=== Verifying nft_purchases policies ===' as verification_section;

SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'nft_purchases'
ORDER BY policyname;

SELECT '=== nft_purchases RLS fix completed ===' as completion_message;

-- Test insert capability (this should work now)
-- Note: This is just a test comment, actual testing should be done from the frontend

/*
Example test query that should work after this fix:
INSERT INTO nft_purchases (
    buyer_wallet, 
    nft_id, 
    nft_type, 
    price_bcc, 
    price_usdt, 
    payment_method
) VALUES (
    '0xTestWallet', 
    'uuid-test', 
    'merchant', 
    100, 
    50, 
    'bcc'
);
*/
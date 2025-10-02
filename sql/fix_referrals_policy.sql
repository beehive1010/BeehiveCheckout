-- Fix referrals table RLS policy with correct column name
-- The referrals table uses 'matrix_root' not 'root_wallet'

DO $$
BEGIN
    -- Users can view referrals in their matrix (using correct column name)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'referrals' AND policyname = 'authenticated_select_referrals') THEN
        CREATE POLICY "authenticated_select_referrals" ON referrals
            FOR SELECT TO authenticated
            USING (
                matrix_root = (current_setting('request.jwt.claims')::json->>'wallet_address') OR
                member_wallet = (current_setting('request.jwt.claims')::json->>'wallet_address') OR
                referrer_wallet = (current_setting('request.jwt.claims')::json->>'wallet_address')
            );
        RAISE NOTICE '✅ Created policy: authenticated_select_referrals (with matrix_root)';
    ELSE
        RAISE NOTICE '⚠️  Policy authenticated_select_referrals already exists';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error creating referrals policy: %', SQLERRM;
END;
$$;
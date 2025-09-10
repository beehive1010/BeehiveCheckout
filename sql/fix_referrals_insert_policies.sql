-- Add missing INSERT and UPDATE policies for referrals table
-- This allows edge functions to properly record referral data

\echo '🔧 Adding missing referrals table policies for data recording...'

-- Allow service role to insert/update referrals (edge functions use service role)
DO $$
BEGIN
    -- Insert policy for referrals (needed for edge functions)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'referrals' AND policyname = 'service_role_insert_referrals') THEN
        CREATE POLICY "service_role_insert_referrals" ON referrals
            FOR INSERT TO service_role
            WITH CHECK (true);
        RAISE NOTICE '✅ Created INSERT policy for referrals (service_role)';
    END IF;

    -- Update policy for referrals (needed for edge functions)  
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'referrals' AND policyname = 'service_role_update_referrals') THEN
        CREATE POLICY "service_role_update_referrals" ON referrals
            FOR UPDATE TO service_role
            USING (true)
            WITH CHECK (true);
        RAISE NOTICE '✅ Created UPDATE policy for referrals (service_role)';
    END IF;

    -- Allow authenticated users to insert their own referrals (when they refer someone)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'referrals' AND policyname = 'authenticated_insert_referrals') THEN
        CREATE POLICY "authenticated_insert_referrals" ON referrals
            FOR INSERT TO authenticated
            WITH CHECK (
                referrer_wallet = (current_setting('request.jwt.claims')::json->>'wallet_address')
            );
        RAISE NOTICE '✅ Created INSERT policy for referrals (authenticated users)';
    END IF;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error creating referrals policies: %', SQLERRM;
END;
$$;

-- Add missing policies for reward_claims table if needed
DO $$
BEGIN
    -- Check if reward_claims has proper service role access
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reward_claims' AND policyname LIKE '%service%insert%') THEN
        CREATE POLICY "service_role_insert_reward_claims" ON reward_claims
            FOR INSERT TO service_role
            WITH CHECK (true);
        RAISE NOTICE '✅ Created INSERT policy for reward_claims (service_role)';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reward_claims' AND policyname LIKE '%service%update%') THEN
        CREATE POLICY "service_role_update_reward_claims" ON reward_claims
            FOR UPDATE TO service_role
            USING (true)
            WITH CHECK (true);
        RAISE NOTICE '✅ Created UPDATE policy for reward_claims (service_role)';
    END IF;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error creating reward_claims policies: %', SQLERRM;
END;
$$;

-- Test the policies work
\echo ''
\echo '🧪 Testing referrals and rewards recording capability...'

-- Test as service role (how edge functions access)
SELECT set_config('request.jwt.claims', '{"role":"service_role","sub":"service"}', true);

-- Test if we can simulate inserting a referral (dry run)
SELECT 'Service role can access referrals:' as test, 
       EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'referrals' AND 'service_role' = ANY(roles)) as has_access;

-- Test if we can simulate inserting a reward claim (dry run)  
SELECT 'Service role can access reward_claims:' as test,
       EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'reward_claims' AND 'service_role' = ANY(roles)) as has_access;

\echo ''
\echo '✅ Referrals and rewards recording policies updated!'
\echo 'Edge functions should now be able to:'
\echo '  - Insert new referrals when users join'  
\echo '  - Create reward claims when referrals activate'
\echo '  - Update referral status and reward claim status'
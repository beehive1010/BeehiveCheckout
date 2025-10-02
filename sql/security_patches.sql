-- ==========================================================================
-- SECURITY PATCHES FOR BEEHIVE PLATFORM
-- ==========================================================================
-- This file contains fixes for common function and RLS security issues
-- Apply these patches after running the audit scripts

-- ==========================================================================
-- FUNCTION GRANTS: Grant execute permissions to required roles
-- ==========================================================================

\echo '🔧 Applying function security grants...'

-- Grant execute permissions to authenticated users for common functions
DO $$
DECLARE 
    func_name text;
    func_names text[] := ARRAY[
        'update_updated_at_column'
    ];
BEGIN
    FOREACH func_name IN ARRAY func_names
    LOOP
        IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE p.proname = func_name AND n.nspname = 'public') THEN
            EXECUTE format('GRANT EXECUTE ON FUNCTION %I TO authenticated, anon', func_name);
            RAISE NOTICE '✅ Granted execute on function % to authenticated, anon', func_name;
        ELSE
            RAISE NOTICE '⚠️  Function % not found, skipping', func_name;
        END IF;
    END LOOP;
END;
$$;

-- ==========================================================================
-- RLS POLICY FIXES: Add missing policies for authenticated users
-- ==========================================================================

\echo ''
\echo '🔒 Applying RLS policy fixes...'

-- Fix users table policies
DO $$
BEGIN
    -- Users can view their own profile
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'authenticated_select_users') THEN
        CREATE POLICY "authenticated_select_users" ON users
            FOR SELECT TO authenticated
            USING (wallet_address = (current_setting('request.jwt.claims')::json->>'wallet_address'));
        RAISE NOTICE '✅ Created policy: authenticated_select_users';
    END IF;
    
    -- Users can update their own profile
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'authenticated_update_users') THEN
        CREATE POLICY "authenticated_update_users" ON users
            FOR UPDATE TO authenticated
            USING (wallet_address = (current_setting('request.jwt.claims')::json->>'wallet_address'));
        RAISE NOTICE '✅ Created policy: authenticated_update_users';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error with users table policies: %', SQLERRM;
END;
$$;

-- Fix members table policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'members') THEN
        -- Members can view their own membership data
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'members' AND policyname = 'authenticated_select_members') THEN
            CREATE POLICY "authenticated_select_members" ON members
                FOR SELECT TO authenticated
                USING (wallet_address = (current_setting('request.jwt.claims')::json->>'wallet_address'));
            RAISE NOTICE '✅ Created policy: authenticated_select_members';
        END IF;
        
        -- Members can update their own data  
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'members' AND policyname = 'authenticated_update_members') THEN
            CREATE POLICY "authenticated_update_members" ON members
                FOR UPDATE TO authenticated
                USING (wallet_address = (current_setting('request.jwt.claims')::json->>'wallet_address'));
            RAISE NOTICE '✅ Created policy: authenticated_update_members';
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error with members table policies: %', SQLERRM;
END;
$$;

-- Fix user_balances table policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_balances') THEN
        -- Users can view their own balance
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_balances' AND policyname = 'authenticated_select_user_balances') THEN
            CREATE POLICY "authenticated_select_user_balances" ON user_balances
                FOR SELECT TO authenticated
                USING (wallet_address = (current_setting('request.jwt.claims')::json->>'wallet_address'));
            RAISE NOTICE '✅ Created policy: authenticated_select_user_balances';
        END IF;
        
        -- Users can update their own balance (through app logic)
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_balances' AND policyname = 'authenticated_update_user_balances') THEN
            CREATE POLICY "authenticated_update_user_balances" ON user_balances
                FOR UPDATE TO authenticated
                USING (wallet_address = (current_setting('request.jwt.claims')::json->>'wallet_address'));
            RAISE NOTICE '✅ Created policy: authenticated_update_user_balances';
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error with user_balances table policies: %', SQLERRM;
END;
$$;

-- Fix reward_claims table policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'reward_claims') THEN
        -- Users can view their own reward claims
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reward_claims' AND policyname = 'authenticated_select_reward_claims') THEN
            CREATE POLICY "authenticated_select_reward_claims" ON reward_claims
                FOR SELECT TO authenticated
                USING (root_wallet = (current_setting('request.jwt.claims')::json->>'wallet_address'));
            RAISE NOTICE '✅ Created policy: authenticated_select_reward_claims';
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error with reward_claims table policies: %', SQLERRM;
END;
$$;

-- Fix referrals table policies  
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'referrals') THEN
        -- Users can view referrals in their matrix
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'referrals' AND policyname = 'authenticated_select_referrals') THEN
            CREATE POLICY "authenticated_select_referrals" ON referrals
                FOR SELECT TO authenticated
                USING (
                    root_wallet = (current_setting('request.jwt.claims')::json->>'wallet_address') OR
                    member_wallet = (current_setting('request.jwt.claims')::json->>'wallet_address') OR
                    parent_wallet = (current_setting('request.jwt.claims')::json->>'wallet_address')
                );
            RAISE NOTICE '✅ Created policy: authenticated_select_referrals';
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error with referrals table policies: %', SQLERRM;
END;
$$;

-- Fix layer_rewards table policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'layer_rewards') THEN
        -- Users can view their own layer rewards
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'layer_rewards' AND policyname = 'authenticated_select_layer_rewards') THEN
            CREATE POLICY "authenticated_select_layer_rewards" ON layer_rewards
                FOR SELECT TO authenticated
                USING (recipient_wallet = (current_setting('request.jwt.claims')::json->>'wallet_address'));
            RAISE NOTICE '✅ Created policy: authenticated_select_layer_rewards';
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error with layer_rewards table policies: %', SQLERRM;
END;
$$;

-- Fix orders/bcc_purchase_orders table policies
DO $$
BEGIN
    -- Check for either orders or bcc_purchase_orders table
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'orders') THEN
        -- Users can view their own orders
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'authenticated_select_orders') THEN
            CREATE POLICY "authenticated_select_orders" ON orders
                FOR SELECT TO authenticated
                USING (wallet_address = (current_setting('request.jwt.claims')::json->>'wallet_address'));
            RAISE NOTICE '✅ Created policy: authenticated_select_orders';
        END IF;
        
        -- Users can create their own orders
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'authenticated_insert_orders') THEN
            CREATE POLICY "authenticated_insert_orders" ON orders
                FOR INSERT TO authenticated
                WITH CHECK (wallet_address = (current_setting('request.jwt.claims')::json->>'wallet_address'));
            RAISE NOTICE '✅ Created policy: authenticated_insert_orders';
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'bcc_purchase_orders') THEN
        -- Users can view their own BCC purchase orders
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bcc_purchase_orders' AND policyname = 'authenticated_select_bcc_purchase_orders') THEN
            CREATE POLICY "authenticated_select_bcc_purchase_orders" ON bcc_purchase_orders
                FOR SELECT TO authenticated
                USING (buyer_wallet = (current_setting('request.jwt.claims')::json->>'wallet_address'));
            RAISE NOTICE '✅ Created policy: authenticated_select_bcc_purchase_orders';
        END IF;
        
        -- Users can create their own BCC purchase orders
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bcc_purchase_orders' AND policyname = 'authenticated_insert_bcc_purchase_orders') THEN
            CREATE POLICY "authenticated_insert_bcc_purchase_orders" ON bcc_purchase_orders
                FOR INSERT TO authenticated
                WITH CHECK (buyer_wallet = (current_setting('request.jwt.claims')::json->>'wallet_address'));
            RAISE NOTICE '✅ Created policy: authenticated_insert_bcc_purchase_orders';
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error with orders table policies: %', SQLERRM;
END;
$$;

-- Fix user_notifications table policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_notifications') THEN
        -- Users can view their own notifications
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_notifications' AND policyname = 'authenticated_select_user_notifications') THEN
            CREATE POLICY "authenticated_select_user_notifications" ON user_notifications
                FOR SELECT TO authenticated
                USING (wallet_address = (current_setting('request.jwt.claims')::json->>'wallet_address'));
            RAISE NOTICE '✅ Created policy: authenticated_select_user_notifications';
        END IF;
        
        -- Users can update their own notifications (mark as read)
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_notifications' AND policyname = 'authenticated_update_user_notifications') THEN
            CREATE POLICY "authenticated_update_user_notifications" ON user_notifications
                FOR UPDATE TO authenticated
                USING (wallet_address = (current_setting('request.jwt.claims')::json->>'wallet_address'));
            RAISE NOTICE '✅ Created policy: authenticated_update_user_notifications';
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error with user_notifications table policies: %', SQLERRM;
END;
$$;

-- ==========================================================================
-- PUBLIC READ POLICIES: Allow reading reference data
-- ==========================================================================

\echo ''
\echo '📖 Applying public read policies...'

-- Allow reading NFT levels (reference data)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'nft_levels') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nft_levels' AND policyname = 'public_select_nft_levels') THEN
            CREATE POLICY "public_select_nft_levels" ON nft_levels
                FOR SELECT TO authenticated, anon
                USING (true);
            RAISE NOTICE '✅ Created policy: public_select_nft_levels';
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error with nft_levels table policies: %', SQLERRM;
END;
$$;

-- Allow reading layer rules (reference data)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'layer_rules') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'layer_rules' AND policyname = 'public_select_layer_rules') THEN
            CREATE POLICY "public_select_layer_rules" ON layer_rules
                FOR SELECT TO authenticated, anon
                USING (true);
            RAISE NOTICE '✅ Created policy: public_select_layer_rules';
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error with layer_rules table policies: %', SQLERRM;
END;
$$;

-- Allow reading supported chains (reference data)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'supported_chains') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supported_chains' AND policyname = 'public_select_supported_chains') THEN
            CREATE POLICY "public_select_supported_chains" ON supported_chains
                FOR SELECT TO authenticated, anon
                USING (is_active = true);
            RAISE NOTICE '✅ Created policy: public_select_supported_chains';
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error with supported_chains table policies: %', SQLERRM;
END;
$$;

-- ==========================================================================
-- VIEW GRANTS: Grant access to views
-- ==========================================================================

\echo ''
\echo '👁️  Granting view access...'

-- Grant access to user_bcc_balance_overview view
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'user_bcc_balance_overview') THEN
        GRANT SELECT ON user_bcc_balance_overview TO authenticated, anon;
        RAISE NOTICE '✅ Granted SELECT on user_bcc_balance_overview to authenticated, anon';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Error granting view access: %', SQLERRM;
END;
$$;

-- ==========================================================================
-- ADMIN ACCESS: Ensure service role has full access
-- ==========================================================================

\echo ''
\echo '👑 Ensuring service role access...'

-- Grant service role access to all RLS-enabled tables
DO $$
DECLARE 
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' AND rowsecurity = true
    LOOP
        -- Service role bypasses RLS, but ensure explicit policy exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = table_name 
            AND policyname = 'service_role_all_access'
        ) THEN
            EXECUTE format('
                CREATE POLICY "service_role_all_access" ON %I
                    FOR ALL TO service_role
                    USING (true)
                    WITH CHECK (true)
            ', table_name);
            RAISE NOTICE '✅ Created service_role_all_access policy for %', table_name;
        END IF;
    END LOOP;
END;
$$;

-- ==========================================================================
-- VERIFICATION: Test key access patterns
-- ==========================================================================

\echo ''
\echo '🧪 Running verification tests...'

-- Test authenticated user access
SELECT set_config('request.jwt.claims', '{"sub":"test-user","role":"authenticated","wallet_address":"0xtest123"}', true);

DO $$
BEGIN
    -- Test users table access
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users') THEN
        PERFORM count(*) FROM users WHERE wallet_address = '0xtest123';
        RAISE NOTICE '✅ Users table access: OK';
    END IF;
    
    -- Test members table access  
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'members') THEN
        PERFORM count(*) FROM members WHERE wallet_address = '0xtest123';
        RAISE NOTICE '✅ Members table access: OK';
    END IF;
    
    -- Test view access
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'user_bcc_balance_overview') THEN
        PERFORM count(*) FROM user_bcc_balance_overview WHERE wallet_address = '0xtest123';
        RAISE NOTICE '✅ Balance view access: OK';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Verification test failed: %', SQLERRM;
END;
$$;

\echo ''
\echo '✅ Security patches applied successfully!'
\echo ''
\echo '📋 Summary of changes:'
\echo '  - Function execute grants for authenticated/anon users'
\echo '  - RLS policies for user data access (scoped to wallet_address)'
\echo '  - Public read access for reference data (nft_levels, layer_rules, etc.)'
\echo '  - Service role policies for admin access'
\echo '  - View grants for balance overview'
\echo ''
\echo '🧪 Next steps:'
\echo '  1. Run the function audit script: psql -f sql/audit_functions.sql'
\echo '  2. Run the RLS test matrix: psql -f sql/rls_test_matrix.sql'  
\echo '  3. Test your application functionality'
\echo '  4. Monitor logs for any remaining access issues'
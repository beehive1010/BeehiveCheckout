-- Step 3: RLS Policies & Security
-- Execute this against your Supabase database

-- Enable RLS on new tables
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE multi_chain_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE supported_chains ENABLE ROW LEVEL SECURITY;

-- Admin policies
DROP POLICY IF EXISTS "Service role can manage admins" ON admins;
CREATE POLICY "Service role can manage admins" ON admins
    FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Admins can view themselves" ON admins;
CREATE POLICY "Admins can view themselves" ON admins
    FOR SELECT USING (wallet_address = current_setting('request.jwt.claims')::json->>'wallet_address');

-- Multi-chain payments policies
DROP POLICY IF EXISTS "Users can view their own payments" ON multi_chain_payments;
CREATE POLICY "Users can view their own payments" ON multi_chain_payments
    FOR SELECT USING (payer_address = current_setting('request.jwt.claims')::json->>'wallet_address');

DROP POLICY IF EXISTS "Service role can manage all payments" ON multi_chain_payments;
CREATE POLICY "Service role can manage all payments" ON multi_chain_payments
    FOR ALL TO service_role USING (true);

-- Bridge requests policies  
DROP POLICY IF EXISTS "Users can view their own bridge requests" ON bridge_requests;
CREATE POLICY "Users can view their own bridge requests" ON bridge_requests
    FOR SELECT USING (payer_address = current_setting('request.jwt.claims')::json->>'wallet_address');

DROP POLICY IF EXISTS "Service role can manage all bridge requests" ON bridge_requests;
CREATE POLICY "Service role can manage all bridge requests" ON bridge_requests
    FOR ALL TO service_role USING (true);

-- Supported chains policies (read-only for users)
DROP POLICY IF EXISTS "Anyone can view active chains" ON supported_chains;
CREATE POLICY "Anyone can view active chains" ON supported_chains
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Service role can manage chain configs" ON supported_chains;
CREATE POLICY "Service role can manage chain configs" ON supported_chains
    FOR ALL TO service_role USING (true);

-- Verification query
-- SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('admins', 'multi_chain_payments');
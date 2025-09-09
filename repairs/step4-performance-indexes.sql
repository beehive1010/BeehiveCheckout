-- Step 4: Performance Indexes
-- Execute this against your Supabase database

-- Create indexes concurrently (safe for production)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admins_role ON admins(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admins_is_active ON admins(is_active) WHERE is_active = true;

-- Multi-chain payment indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_multi_chain_payments_payer ON multi_chain_payments(payer_address);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_multi_chain_payments_chain ON multi_chain_payments(chain_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_multi_chain_payments_status ON multi_chain_payments(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_multi_chain_payments_purpose ON multi_chain_payments(payment_purpose);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_multi_chain_payments_created ON multi_chain_payments(created_at DESC);

-- Bridge request indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bridge_requests_status ON bridge_requests(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bridge_requests_payer ON bridge_requests(payer_address);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bridge_requests_source_chain ON bridge_requests(source_chain_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bridge_requests_target_chain ON bridge_requests(target_chain_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bridge_requests_created ON bridge_requests(created_at DESC);

-- Supported chains index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supported_chains_active ON supported_chains(is_active) WHERE is_active = true;

-- Add triggers for updated_at columns
CREATE TRIGGER IF NOT EXISTS update_admins_updated_at 
    BEFORE UPDATE ON admins 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_multi_chain_payments_updated_at 
    BEFORE UPDATE ON multi_chain_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_bridge_requests_updated_at 
    BEFORE UPDATE ON bridge_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_supported_chains_updated_at 
    BEFORE UPDATE ON supported_chains 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
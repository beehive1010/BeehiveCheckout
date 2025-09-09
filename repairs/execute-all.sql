-- COMPLETE DATABASE REPAIR MIGRATION
-- Execute this entire script against your Supabase database
-- Connection: postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres

-- ==========================================================================
-- STEP 1: SAFE OBJECTS (VIEWS & FUNCTIONS)
-- ==========================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Update view
DROP VIEW IF EXISTS user_bcc_balance_overview;
CREATE VIEW user_bcc_balance_overview AS
SELECT 
    ub.wallet_address,
    COALESCE(ub.bcc_transferable, 0) as bcc_transferable,
    COALESCE(ub.bcc_locked, 0) as bcc_locked,
    COALESCE(ub.bcc_earned_rewards, 0) as bcc_earned_rewards,
    COALESCE(ub.bcc_pending_activation, 0) as bcc_pending_activation,
    COALESCE(ub.bcc_locked_staking, 0) as bcc_locked_staking,
    (COALESCE(ub.bcc_transferable, 0) + COALESCE(ub.bcc_locked, 0) + COALESCE(ub.bcc_earned_rewards, 0) + COALESCE(ub.bcc_pending_activation, 0) + COALESCE(ub.bcc_locked_staking, 0)) as total_bcc_balance,
    COALESCE(ub.tier_phase, 1) as tier_phase,
    COALESCE(mat.unlock_per_level, 100.0) as tier_multiplier,
    COALESCE(mat.tier_name, 'Tier 1') as tier_name,
    COALESCE(m.current_level, 0) as current_level,
    COALESCE(m.is_activated, false) as is_activated,
    COALESCE(m.levels_owned, '[]'::jsonb) as levels_owned,
    0 as pending_reward_claims,
    0::DECIMAL(20,8) as pending_bcc_rewards
FROM user_balances ub
LEFT JOIN member_activation_tiers mat ON mat.tier = COALESCE(ub.tier_phase, 1)
LEFT JOIN members m ON m.wallet_address = ub.wallet_address;

-- ==========================================================================
-- STEP 2: CRITICAL MISSING TABLES
-- ==========================================================================

-- Create missing admin table
CREATE TABLE IF NOT EXISTS admins (
    wallet_address VARCHAR(42) PRIMARY KEY,
    username VARCHAR(100),
    role VARCHAR(50) DEFAULT 'admin',
    permissions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Add foreign key safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admins_wallet_address_fkey') THEN
        ALTER TABLE admins ADD CONSTRAINT admins_wallet_address_fkey 
        FOREIGN KEY (wallet_address) REFERENCES users(wallet_address);
    END IF;
END
$$;

-- Create multi-chain payment tables if missing
CREATE TABLE IF NOT EXISTS multi_chain_payments (
    id BIGSERIAL PRIMARY KEY,
    transaction_hash TEXT NOT NULL UNIQUE,
    chain_id INTEGER NOT NULL,
    amount_usdc DECIMAL(20,6) NOT NULL,
    payer_address TEXT NOT NULL,
    payment_purpose TEXT NOT NULL,
    network_fee DECIMAL(20,6) DEFAULT 0,
    platform_fee DECIMAL(20,6) DEFAULT 0,
    bridge_fee DECIMAL(20,6) DEFAULT 0,
    total_fee DECIMAL(20,6) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    level INTEGER,
    reference_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    block_number BIGINT,
    gas_used BIGINT,
    gas_price DECIMAL(30,0),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS bridge_requests (
    id BIGSERIAL PRIMARY KEY,
    bridge_transaction_id TEXT NOT NULL UNIQUE,
    source_chain_id INTEGER NOT NULL,
    target_chain_id INTEGER NOT NULL,
    amount_usdc DECIMAL(20,6) NOT NULL,
    source_transaction_hash TEXT NOT NULL,
    target_transaction_hash TEXT,
    payer_address TEXT NOT NULL,
    payment_purpose TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS supported_chains (
    chain_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    is_testnet BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    rpc_url TEXT NOT NULL,
    usdc_address TEXT NOT NULL,
    bridge_wallet_address TEXT NOT NULL,
    average_gas_fee DECIMAL(20,6) DEFAULT 0,
    block_time INTEGER DEFAULT 12,
    confirmation_blocks INTEGER DEFAULT 1,
    explorer_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================================
-- STEP 3: RLS POLICIES & SECURITY
-- ==========================================================================

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

-- ==========================================================================
-- STEP 4: PERFORMANCE INDEXES & TRIGGERS
-- ==========================================================================

-- Admin table indexes
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON admins(is_active) WHERE is_active = true;

-- Multi-chain payment indexes
CREATE INDEX IF NOT EXISTS idx_multi_chain_payments_payer ON multi_chain_payments(payer_address);
CREATE INDEX IF NOT EXISTS idx_multi_chain_payments_chain ON multi_chain_payments(chain_id);
CREATE INDEX IF NOT EXISTS idx_multi_chain_payments_status ON multi_chain_payments(status);
CREATE INDEX IF NOT EXISTS idx_multi_chain_payments_purpose ON multi_chain_payments(payment_purpose);
CREATE INDEX IF NOT EXISTS idx_multi_chain_payments_created ON multi_chain_payments(created_at DESC);

-- Bridge request indexes
CREATE INDEX IF NOT EXISTS idx_bridge_requests_status ON bridge_requests(status);
CREATE INDEX IF NOT EXISTS idx_bridge_requests_payer ON bridge_requests(payer_address);
CREATE INDEX IF NOT EXISTS idx_bridge_requests_source_chain ON bridge_requests(source_chain_id);
CREATE INDEX IF NOT EXISTS idx_bridge_requests_target_chain ON bridge_requests(target_chain_id);
CREATE INDEX IF NOT EXISTS idx_bridge_requests_created ON bridge_requests(created_at DESC);

-- Supported chains index
CREATE INDEX IF NOT EXISTS idx_supported_chains_active ON supported_chains(is_active) WHERE is_active = true;

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_admins_updated_at ON admins;
CREATE TRIGGER update_admins_updated_at 
    BEFORE UPDATE ON admins 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_multi_chain_payments_updated_at ON multi_chain_payments;
CREATE TRIGGER update_multi_chain_payments_updated_at 
    BEFORE UPDATE ON multi_chain_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bridge_requests_updated_at ON bridge_requests;
CREATE TRIGGER update_bridge_requests_updated_at 
    BEFORE UPDATE ON bridge_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_supported_chains_updated_at ON supported_chains;
CREATE TRIGGER update_supported_chains_updated_at 
    BEFORE UPDATE ON supported_chains 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================================================
-- STEP 5: INSERT INITIAL DATA
-- ==========================================================================

-- Insert supported chain configurations
INSERT INTO supported_chains (chain_id, name, symbol, is_testnet, rpc_url, usdc_address, bridge_wallet_address, average_gas_fee, block_time, confirmation_blocks, explorer_url)
VALUES 
    -- Arbitrum One (Mainnet)
    (42161, 'Arbitrum One', 'ARB', false, 'https://arb1.arbitrum.io/rpc', '0xaf88d065e77c8cc2239327c5edb3a432268e5831', '0x0000000000000000000000000000000000000001', 0.001, 1, 1, 'https://arbiscan.io'),
    
    -- Arbitrum Sepolia (Testnet)
    (421614, 'Arbitrum Sepolia', 'ETH', true, 'https://sepolia-rollup.arbitrum.io/rpc', '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', '0x0000000000000000000000000000000000000002', 0.001, 1, 1, 'https://sepolia.arbiscan.io'),
    
    -- Ethereum Mainnet
    (1, 'Ethereum', 'ETH', false, 'https://mainnet.infura.io/v3/YOUR_KEY', '0xa0b86a33e6c3163d01b73c69c87b1c68a4a6c5db', '0x0000000000000000000000000000000000000003', 20.0, 12, 3, 'https://etherscan.io'),
    
    -- Binance Smart Chain
    (56, 'BSC', 'BNB', false, 'https://bsc-dataseed1.binance.org', '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', '0x0000000000000000000000000000000000000004', 5.0, 3, 3, 'https://bscscan.com'),
    
    -- Optimism
    (10, 'Optimism', 'OP', false, 'https://mainnet.optimism.io', '0x7f5c764cbc14f9669b88837ca1490cca17c31607', '0x0000000000000000000000000000000000000005', 1.0, 2, 1, 'https://optimistic.etherscan.io'),
    
    -- Polygon
    (137, 'Polygon', 'MATIC', false, 'https://polygon-rpc.com', '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', '0x0000000000000000000000000000000000000006', 2.0, 2, 5, 'https://polygonscan.com'),
    
    -- Base
    (8453, 'Base', 'ETH', false, 'https://mainnet.base.org', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', '0x0000000000000000000000000000000000000007', 1.0, 2, 1, 'https://basescan.org')

ON CONFLICT (chain_id) DO UPDATE SET
    name = EXCLUDED.name,
    symbol = EXCLUDED.symbol,
    is_testnet = EXCLUDED.is_testnet,
    rpc_url = EXCLUDED.rpc_url,
    usdc_address = EXCLUDED.usdc_address,
    bridge_wallet_address = EXCLUDED.bridge_wallet_address,
    average_gas_fee = EXCLUDED.average_gas_fee,
    block_time = EXCLUDED.block_time,
    confirmation_blocks = EXCLUDED.confirmation_blocks,
    explorer_url = EXCLUDED.explorer_url,
    updated_at = NOW();

-- ==========================================================================
-- VERIFICATION QUERIES
-- ==========================================================================

-- Check all expected tables exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admins') 
        THEN '✅ admins table exists'
        ELSE '❌ admins table missing'
    END as admin_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'multi_chain_payments') 
        THEN '✅ multi_chain_payments exists'
        ELSE '❌ multi_chain_payments missing'
    END as payments_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'user_bcc_balance_overview') 
        THEN '✅ user_bcc_balance_overview exists'
        ELSE '❌ user_bcc_balance_overview missing'
    END as view_check;

-- END OF MIGRATION SCRIPT
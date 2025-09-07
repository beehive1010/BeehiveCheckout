-- Multi-Chain Payment and Bridge Tables
-- Comprehensive schema for cross-chain USDC payment handling

-- Multi-chain payments table
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

-- Bridge requests table for cross-chain operations
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

-- Chain configurations table for supported networks
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_multi_chain_payments_payer ON multi_chain_payments(payer_address);
CREATE INDEX IF NOT EXISTS idx_multi_chain_payments_chain ON multi_chain_payments(chain_id);
CREATE INDEX IF NOT EXISTS idx_multi_chain_payments_status ON multi_chain_payments(status);
CREATE INDEX IF NOT EXISTS idx_multi_chain_payments_purpose ON multi_chain_payments(payment_purpose);
CREATE INDEX IF NOT EXISTS idx_multi_chain_payments_created ON multi_chain_payments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bridge_requests_status ON bridge_requests(status);
CREATE INDEX IF NOT EXISTS idx_bridge_requests_payer ON bridge_requests(payer_address);
CREATE INDEX IF NOT EXISTS idx_bridge_requests_source_chain ON bridge_requests(source_chain_id);
CREATE INDEX IF NOT EXISTS idx_bridge_requests_target_chain ON bridge_requests(target_chain_id);
CREATE INDEX IF NOT EXISTS idx_bridge_requests_created ON bridge_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_supported_chains_active ON supported_chains(is_active) WHERE is_active = true;

-- RLS Policies for security
ALTER TABLE multi_chain_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE supported_chains ENABLE ROW LEVEL SECURITY;

-- Multi-chain payments policies
CREATE POLICY "Users can view their own payments" ON multi_chain_payments
    FOR SELECT USING (payer_address = current_setting('request.jwt.claims')::json->>'wallet_address');

CREATE POLICY "Service role can manage all payments" ON multi_chain_payments
    FOR ALL TO service_role USING (true);

-- Bridge requests policies  
CREATE POLICY "Users can view their own bridge requests" ON bridge_requests
    FOR SELECT USING (payer_address = current_setting('request.jwt.claims')::json->>'wallet_address');

CREATE POLICY "Service role can manage all bridge requests" ON bridge_requests
    FOR ALL TO service_role USING (true);

-- Supported chains policies (read-only for users)
CREATE POLICY "Anyone can view active chains" ON supported_chains
    FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage chain configs" ON supported_chains
    FOR ALL TO service_role USING (true);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_multi_chain_payments_updated_at 
    BEFORE UPDATE ON multi_chain_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bridge_requests_updated_at 
    BEFORE UPDATE ON bridge_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supported_chains_updated_at 
    BEFORE UPDATE ON supported_chains 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

-- Comments for documentation
COMMENT ON TABLE multi_chain_payments IS 'Records all cross-chain USDC payments processed through the platform';
COMMENT ON TABLE bridge_requests IS 'Tracks cross-chain bridge operations for USDC transfers';
COMMENT ON TABLE supported_chains IS 'Configuration for all supported blockchain networks';

COMMENT ON COLUMN multi_chain_payments.transaction_hash IS 'Unique blockchain transaction hash';
COMMENT ON COLUMN multi_chain_payments.chain_id IS 'EIP-155 chain identifier';
COMMENT ON COLUMN multi_chain_payments.amount_usdc IS 'Payment amount in USDC (6 decimal precision)';
COMMENT ON COLUMN multi_chain_payments.payment_purpose IS 'Purpose: membership_activation, nft_upgrade, token_purchase';

COMMENT ON COLUMN bridge_requests.bridge_transaction_id IS 'Unique identifier for bridge operation';
COMMENT ON COLUMN bridge_requests.status IS 'Status: pending, processing, completed, failed';
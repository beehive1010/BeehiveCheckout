-- Step 2: Critical Missing Tables
-- Execute this against your Supabase database

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

-- Verification queries
-- \d admins
-- \d multi_chain_payments
-- SELECT count(*) as admin_count FROM admins;
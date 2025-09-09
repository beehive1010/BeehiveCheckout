-- Database Drift Analysis for Beehive Platform
-- Generated: 2025-01-09
-- Analysis based on local migration files vs expected production state

-- DETECTED ISSUES:
-- 1. Table name conflicts: 'courses' table defined in multiple migrations
-- 2. Missing admin-related tables that edge functions expect
-- 3. Potential foreign key constraint conflicts
-- 4. Duplicate function definitions

-- ============================================================================
-- SECTION 1: SAFE OPERATIONS (Views, Functions, Extensions)
-- ============================================================================

-- Ensure uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create or update the user_bcc_balance_overview view (from levels_owned fix)
DROP VIEW IF EXISTS user_bcc_balance_overview;

CREATE OR REPLACE VIEW user_bcc_balance_overview AS
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

-- Update the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- SECTION 2: COURSES TABLE CONFLICT RESOLUTION
-- ============================================================================

-- RISK: HIGH - Two different course table schemas exist
-- Strategy: Keep the more comprehensive courses_schema.sql version

-- Drop the simpler courses table from initial_schema if it exists
-- and replace with the comprehensive education system version

-- First, check if we need to migrate any existing data
-- This should be done manually after reviewing actual production data

-- ============================================================================
-- SECTION 3: MISSING ADMIN TABLES
-- ============================================================================

-- Edge functions expect an 'admins' table, but we have references to 'admin_users'
-- The initial_schema.sql doesn't include admin_users table definition
-- This needs to be resolved

-- Create admins table if it doesn't exist (based on edge function requirements)
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

-- Add foreign key constraint to users table
ALTER TABLE admins 
ADD CONSTRAINT admins_wallet_address_fkey 
FOREIGN KEY (wallet_address) REFERENCES users(wallet_address);

-- ============================================================================
-- SECTION 4: MULTI-CHAIN PAYMENT TABLES VERIFICATION
-- ============================================================================

-- Ensure multi-chain payment tables from 20240907_multi_chain_payment_tables.sql exist
-- These are required by the multi-chain-payment edge function

-- Check if tables exist, create if missing
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

-- ============================================================================
-- SECTION 5: INDEXES AND PERFORMANCE OPTIMIZATIONS
-- ============================================================================

-- Add missing indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_multi_chain_payments_payer ON multi_chain_payments(payer_address);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_multi_chain_payments_chain ON multi_chain_payments(chain_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_multi_chain_payments_status ON multi_chain_payments(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bridge_requests_status ON bridge_requests(status);

-- ============================================================================
-- SECTION 6: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on tables that need it
ALTER TABLE multi_chain_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE supported_chains ENABLE ROW LEVEL SECURITY;

-- Add policies for multi_chain_payments
DROP POLICY IF EXISTS "Users can view their own payments" ON multi_chain_payments;
CREATE POLICY "Users can view their own payments" ON multi_chain_payments
    FOR SELECT USING (payer_address = current_setting('request.jwt.claims')::json->>'wallet_address');

DROP POLICY IF EXISTS "Service role can manage all payments" ON multi_chain_payments;
CREATE POLICY "Service role can manage all payments" ON multi_chain_payments
    FOR ALL TO service_role USING (true);

-- Add policies for bridge_requests
DROP POLICY IF EXISTS "Users can view their own bridge requests" ON bridge_requests;
CREATE POLICY "Users can view their own bridge requests" ON bridge_requests
    FOR SELECT USING (payer_address = current_setting('request.jwt.claims')::json->>'wallet_address');

DROP POLICY IF EXISTS "Service role can manage all bridge requests" ON bridge_requests;
CREATE POLICY "Service role can manage all bridge requests" ON bridge_requests
    FOR ALL TO service_role USING (true);

-- ============================================================================
-- SECTION 7: TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Ensure triggers exist for all tables with updated_at columns
CREATE TRIGGER IF NOT EXISTS update_multi_chain_payments_updated_at 
    BEFORE UPDATE ON multi_chain_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_bridge_requests_updated_at 
    BEFORE UPDATE ON bridge_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_supported_chains_updated_at 
    BEFORE UPDATE ON supported_chains 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_admins_updated_at 
    BEFORE UPDATE ON admins 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- POST-APPLICATION VERIFICATION QUERIES
-- ============================================================================

-- These queries should be run after applying the migration to verify success:

-- 1. Check if all expected tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- 2. Verify admin table structure:
-- \d admins

-- 3. Check multi-chain payment tables:
-- SELECT count(*) FROM multi_chain_payments;
-- SELECT count(*) FROM bridge_requests;
-- SELECT count(*) FROM supported_chains;

-- 4. Verify view works correctly:
-- SELECT * FROM user_bcc_balance_overview LIMIT 5;

-- ============================================================================
-- IDENTIFIED RISKS SUMMARY:
-- ============================================================================

-- HIGH RISK:
-- - Courses table schema conflict (two different definitions)
-- - Missing admin_users vs admins table mismatch

-- MEDIUM RISK: 
-- - Potential data loss if courses table is dropped
-- - Foreign key constraint conflicts during migration

-- LOW RISK:
-- - Index creation may take time on large tables
-- - RLS policy updates are generally safe

-- MANUAL REVIEW REQUIRED:
-- 1. Check production courses table and decide which schema to keep
-- 2. Verify admin users exist and map them to new admins table
-- 3. Backup data before applying destructive changes
-- 4. Test all edge functions after migration
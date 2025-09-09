-- Address Normalization Script
-- Ensures all wallet addresses are stored in lowercase for consistency
-- Run this script to fix any existing case sensitivity issues

-- Enable case-insensitive unique constraint for wallet addresses
BEGIN;

-- 1. Create lowercase indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_wallet_address_lower ON users (LOWER(wallet_address));
CREATE INDEX IF NOT EXISTS idx_members_wallet_address_lower ON members (LOWER(wallet_address));
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_wallet_lower ON referrals (LOWER(referrer_wallet));
CREATE INDEX IF NOT EXISTS idx_referrals_referred_wallet_lower ON referrals (LOWER(referred_wallet));
CREATE INDEX IF NOT EXISTS idx_user_balances_wallet_lower ON user_balances (LOWER(wallet_address));

-- 2. Update all wallet addresses to lowercase
UPDATE users SET wallet_address = LOWER(wallet_address) WHERE wallet_address != LOWER(wallet_address);
UPDATE members SET wallet_address = LOWER(wallet_address) WHERE wallet_address != LOWER(wallet_address);
UPDATE referrals SET referrer_wallet = LOWER(referrer_wallet) WHERE referrer_wallet != LOWER(referrer_wallet);
UPDATE referrals SET referred_wallet = LOWER(referred_wallet) WHERE referred_wallet != LOWER(referred_wallet);
UPDATE user_balances SET wallet_address = LOWER(wallet_address) WHERE wallet_address != LOWER(wallet_address);
UPDATE bcc_transactions SET wallet_address = LOWER(wallet_address) WHERE wallet_address != LOWER(wallet_address);
UPDATE bcc_transactions SET from_wallet = LOWER(from_wallet) WHERE from_wallet IS NOT NULL AND from_wallet != LOWER(from_wallet);
UPDATE bcc_transactions SET to_wallet = LOWER(to_wallet) WHERE to_wallet IS NOT NULL AND to_wallet != LOWER(to_wallet);

-- 3. Update other tables with wallet addresses
UPDATE audit_logs SET user_wallet = LOWER(user_wallet) WHERE user_wallet IS NOT NULL AND user_wallet != LOWER(user_wallet);
UPDATE nft_claim_records SET wallet_address = LOWER(wallet_address) WHERE wallet_address != LOWER(wallet_address);
UPDATE user_activities SET wallet_address = LOWER(wallet_address) WHERE wallet_address != LOWER(wallet_address);
UPDATE reward_claims SET wallet_address = LOWER(wallet_address) WHERE wallet_address != LOWER(wallet_address);
UPDATE reward_distributions SET wallet_address = LOWER(wallet_address) WHERE wallet_address != LOWER(wallet_address);
UPDATE layer_rewards SET wallet_address = LOWER(wallet_address) WHERE wallet_address != LOWER(wallet_address);

-- 4. Create triggers to ensure all new wallet addresses are lowercase
CREATE OR REPLACE FUNCTION normalize_wallet_address()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize wallet_address column
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.wallet_address IS NOT NULL THEN
      NEW.wallet_address = LOWER(NEW.wallet_address);
    END IF;
  END IF;
  
  -- Handle referrer_wallet column (for referrals table)
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'referrals' AND NEW.referrer_wallet IS NOT NULL THEN
      NEW.referrer_wallet = LOWER(NEW.referrer_wallet);
    END IF;
    IF TG_TABLE_NAME = 'referrals' AND NEW.referred_wallet IS NOT NULL THEN
      NEW.referred_wallet = LOWER(NEW.referred_wallet);
    END IF;
  END IF;
  
  -- Handle from_wallet and to_wallet columns (for bcc_transactions table)
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'bcc_transactions' THEN
      IF NEW.from_wallet IS NOT NULL THEN
        NEW.from_wallet = LOWER(NEW.from_wallet);
      END IF;
      IF NEW.to_wallet IS NOT NULL THEN
        NEW.to_wallet = LOWER(NEW.to_wallet);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Apply triggers to all relevant tables
DROP TRIGGER IF EXISTS normalize_wallet_address_trigger ON users;
DROP TRIGGER IF EXISTS normalize_wallet_address_trigger ON members;
DROP TRIGGER IF EXISTS normalize_wallet_address_trigger ON referrals;
DROP TRIGGER IF EXISTS normalize_wallet_address_trigger ON user_balances;
DROP TRIGGER IF EXISTS normalize_wallet_address_trigger ON bcc_transactions;
DROP TRIGGER IF EXISTS normalize_wallet_address_trigger ON nft_claim_records;
DROP TRIGGER IF EXISTS normalize_wallet_address_trigger ON user_activities;
DROP TRIGGER IF EXISTS normalize_wallet_address_trigger ON reward_claims;
DROP TRIGGER IF EXISTS normalize_wallet_address_trigger ON reward_distributions;
DROP TRIGGER IF EXISTS normalize_wallet_address_trigger ON layer_rewards;

CREATE TRIGGER normalize_wallet_address_trigger
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION normalize_wallet_address();

CREATE TRIGGER normalize_wallet_address_trigger
  BEFORE INSERT OR UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION normalize_wallet_address();

CREATE TRIGGER normalize_wallet_address_trigger
  BEFORE INSERT OR UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION normalize_wallet_address();

CREATE TRIGGER normalize_wallet_address_trigger
  BEFORE INSERT OR UPDATE ON user_balances
  FOR EACH ROW EXECUTE FUNCTION normalize_wallet_address();

CREATE TRIGGER normalize_wallet_address_trigger
  BEFORE INSERT OR UPDATE ON bcc_transactions
  FOR EACH ROW EXECUTE FUNCTION normalize_wallet_address();

CREATE TRIGGER normalize_wallet_address_trigger
  BEFORE INSERT OR UPDATE ON nft_claim_records
  FOR EACH ROW EXECUTE FUNCTION normalize_wallet_address();

CREATE TRIGGER normalize_wallet_address_trigger
  BEFORE INSERT OR UPDATE ON user_activities
  FOR EACH ROW EXECUTE FUNCTION normalize_wallet_address();

CREATE TRIGGER normalize_wallet_address_trigger
  BEFORE INSERT OR UPDATE ON reward_claims
  FOR EACH ROW EXECUTE FUNCTION normalize_wallet_address();

CREATE TRIGGER normalize_wallet_address_trigger
  BEFORE INSERT OR UPDATE ON reward_distributions
  FOR EACH ROW EXECUTE FUNCTION normalize_wallet_address();

CREATE TRIGGER normalize_wallet_address_trigger
  BEFORE INSERT OR UPDATE ON layer_rewards
  FOR EACH ROW EXECUTE FUNCTION normalize_wallet_address();

COMMIT;

-- 6. Verification query to check for any remaining case mismatches
SELECT 
  'users' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE wallet_address != LOWER(wallet_address)) as case_mismatches
FROM users
UNION ALL
SELECT 
  'members',
  COUNT(*),
  COUNT(*) FILTER (WHERE wallet_address != LOWER(wallet_address))
FROM members
UNION ALL
SELECT 
  'user_balances',
  COUNT(*),
  COUNT(*) FILTER (WHERE wallet_address != LOWER(wallet_address))
FROM user_balances;

-- Display results
\echo 'Address normalization completed.'
\echo 'All wallet addresses have been converted to lowercase.'
\echo 'Triggers have been added to ensure future addresses are automatically normalized.'
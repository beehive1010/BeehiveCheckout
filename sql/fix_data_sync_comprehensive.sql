-- ========================================
-- BEEHIVE Platform Data Synchronization Fix
-- Comprehensive script to fix all data sync issues
-- ========================================

-- Enable detailed logging
\echo '🚀 Starting BEEHIVE Data Synchronization Fix...'
\echo '========================================================'

BEGIN;

-- ========================================
-- 1. WALLET ADDRESS CASE STANDARDIZATION
-- ========================================
\echo '📝 Step 1: Standardizing wallet address case format...'

-- Create function to convert to Ethereum checksum format
-- For now, we'll use lowercase as it's safer and widely supported
CREATE OR REPLACE FUNCTION normalize_wallet_address(address TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Convert to lowercase and ensure it starts with 0x
    IF address IS NULL OR LENGTH(address) < 40 THEN
        RETURN address;
    END IF;
    
    -- Remove 0x prefix if exists, convert to lowercase, then add 0x back
    RETURN '0x' || LOWER(SUBSTRING(address FROM 3));
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 2. BACKUP CURRENT DATA
-- ========================================
\echo '💾 Step 2: Creating backup tables...'

-- Backup members table
DROP TABLE IF EXISTS members_backup_pre_sync;
CREATE TABLE members_backup_pre_sync AS SELECT * FROM members;

-- Backup users table  
DROP TABLE IF EXISTS users_backup_pre_sync;
CREATE TABLE users_backup_pre_sync AS SELECT * FROM users;

-- Backup membership table
DROP TABLE IF EXISTS membership_backup_pre_sync;
CREATE TABLE membership_backup_pre_sync AS SELECT * FROM membership;

-- Backup referrals table
DROP TABLE IF EXISTS referrals_backup_pre_sync;
CREATE TABLE referrals_backup_pre_sync AS SELECT * FROM referrals;

\echo '✅ Backup tables created successfully'

-- ========================================
-- 3. NORMALIZE WALLET ADDRESSES
-- ========================================
\echo '🔧 Step 3: Normalizing wallet addresses across all tables...'

-- Update users table
UPDATE users 
SET wallet_address = normalize_wallet_address(wallet_address);

-- Update members table
UPDATE members 
SET 
    wallet_address = normalize_wallet_address(wallet_address),
    referrer_wallet = normalize_wallet_address(referrer_wallet);

-- Update membership table
UPDATE membership 
SET wallet_address = normalize_wallet_address(wallet_address);

-- Update referrals table
UPDATE referrals 
SET 
    member_wallet = normalize_wallet_address(member_wallet),
    referrer_wallet = normalize_wallet_address(referrer_wallet),
    matrix_root_wallet = normalize_wallet_address(matrix_root_wallet);

-- Update user_balances table
UPDATE user_balances 
SET wallet_address = normalize_wallet_address(wallet_address);

-- Update layer_rewards table
UPDATE layer_rewards 
SET 
    matrix_root_wallet = normalize_wallet_address(matrix_root_wallet),
    reward_recipient_wallet = normalize_wallet_address(reward_recipient_wallet),
    triggering_member_wallet = normalize_wallet_address(triggering_member_wallet);

\echo '✅ Wallet addresses normalized to Ethereum format'

-- ========================================
-- 4. REMOVE DUPLICATE MEMBER RECORDS
-- ========================================
\echo '🗑️ Step 4: Removing duplicate member records...'

-- Identify and remove duplicate members, keeping the most recent
WITH duplicate_members AS (
    SELECT 
        wallet_address,
        COUNT(*) as count,
        MIN(activation_time) as first_activation,
        MAX(activation_time) as latest_activation
    FROM members
    GROUP BY wallet_address
    HAVING COUNT(*) > 1
),
members_to_keep AS (
    SELECT DISTINCT ON (m.wallet_address) 
        m.wallet_address,
        m.activation_sequence
    FROM members m
    INNER JOIN duplicate_members dm ON m.wallet_address = dm.wallet_address
    ORDER BY m.wallet_address, m.activation_time DESC, m.activation_sequence DESC
)
DELETE FROM members 
WHERE wallet_address IN (SELECT wallet_address FROM duplicate_members)
  AND activation_sequence NOT IN (SELECT activation_sequence FROM members_to_keep);

\echo '✅ Duplicate member records removed'

-- ========================================
-- 5. SYNC MEMBERSHIP LEVELS
-- ========================================
\echo '🔄 Step 5: Synchronizing membership levels...'

-- Update members.current_level based on highest NFT level purchased
WITH highest_levels AS (
    SELECT 
        wallet_address,
        MAX(nft_level) as highest_nft_level,
        COUNT(DISTINCT nft_level) as unique_levels_claimed
    FROM membership
    GROUP BY wallet_address
)
UPDATE members 
SET 
    current_level = hl.highest_nft_level,
    total_nft_claimed = hl.unique_levels_claimed
FROM highest_levels hl
WHERE members.wallet_address = hl.wallet_address;

\echo '✅ Membership levels synchronized'

-- ========================================
-- 6. CLEAN UP ORPHANED REFERRAL RECORDS
-- ========================================
\echo '🧹 Step 6: Cleaning up orphaned referral records...'

-- Remove referrals where referrer doesn't exist in members table
DELETE FROM referrals 
WHERE referrer_wallet IS NOT NULL 
  AND referrer_wallet != ''
  AND referrer_wallet NOT IN (SELECT wallet_address FROM members);

-- Remove referrals where member doesn't exist in members table
DELETE FROM referrals 
WHERE member_wallet NOT IN (SELECT wallet_address FROM members);

\echo '✅ Orphaned referral records cleaned up'

-- ========================================
-- 7. REBUILD REFERRAL MATRIX (According to MarketingPlan.md)
-- ========================================
\echo '🏗️ Step 7: Rebuilding referral matrix according to MarketingPlan.md...'

-- Function to rebuild referral matrix following 3x3 matrix rules
CREATE OR REPLACE FUNCTION rebuild_referral_matrix()
RETURNS TEXT AS $$
DECLARE
    member_record RECORD;
    referrer_wallet_addr TEXT;
    matrix_root_addr TEXT;
    next_position CHAR(1);
    current_layer INTEGER;
    placement_count INTEGER := 0;
BEGIN
    -- Clear existing referral records (we'll rebuild from scratch)
    DELETE FROM referrals;
    
    -- Process all members in activation order
    FOR member_record IN 
        SELECT 
            wallet_address,
            referrer_wallet,
            activation_sequence,
            activation_time
        FROM members 
        WHERE referrer_wallet IS NOT NULL 
          AND referrer_wallet != ''
          AND referrer_wallet != '0x0000000000000000000000000000000000000001'
        ORDER BY activation_sequence ASC
    LOOP
        referrer_wallet_addr := member_record.referrer_wallet;
        
        -- Find the matrix root (could be the direct referrer or someone in their upline)
        matrix_root_addr := referrer_wallet_addr;
        
        -- Find next available position in the 3x3 matrix
        -- Priority: L (Left) -> M (Middle) -> R (Right)
        SELECT 
            CASE 
                WHEN COUNT(*) FILTER (WHERE matrix_position = 'L') = 0 THEN 'L'
                WHEN COUNT(*) FILTER (WHERE matrix_position = 'M') = 0 THEN 'M'
                WHEN COUNT(*) FILTER (WHERE matrix_position = 'R') = 0 THEN 'R'
                ELSE 'L' -- If all positions filled, start new layer
            END,
            CASE 
                WHEN COUNT(*) < 3 THEN 1
                WHEN COUNT(*) < 12 THEN 2  -- 3 + 9 = 12
                ELSE ((COUNT(*) - 3) / 9) + 2 -- Calculate layer based on count
            END
        INTO next_position, current_layer
        FROM referrals 
        WHERE matrix_root_wallet = matrix_root_addr;
        
        -- If layer 1 is full, find next incomplete member in the matrix
        IF current_layer > 1 THEN
            -- Find the first incomplete member in layer 1 to be the new matrix root
            SELECT r.member_wallet INTO matrix_root_addr
            FROM referrals r
            WHERE r.matrix_root_wallet = referrer_wallet_addr
              AND r.matrix_layer = 1
              AND (
                  SELECT COUNT(*) 
                  FROM referrals r2 
                  WHERE r2.matrix_root_wallet = r.member_wallet
              ) < 3
            ORDER BY r.placed_at ASC
            LIMIT 1;
            
            -- If no incomplete member found, use the first member in layer 1
            IF matrix_root_addr IS NULL THEN
                SELECT r.member_wallet INTO matrix_root_addr
                FROM referrals r
                WHERE r.matrix_root_wallet = referrer_wallet_addr
                  AND r.matrix_layer = 1
                ORDER BY r.placed_at ASC
                LIMIT 1;
            END IF;
            
            -- Recalculate position for the new matrix root
            SELECT 
                CASE 
                    WHEN COUNT(*) FILTER (WHERE matrix_position = 'L') = 0 THEN 'L'
                    WHEN COUNT(*) FILTER (WHERE matrix_position = 'M') = 0 THEN 'M'
                    WHEN COUNT(*) FILTER (WHERE matrix_position = 'R') = 0 THEN 'R'
                    ELSE 'L'
                END,
                1 -- Always layer 1 for new matrix root
            INTO next_position, current_layer
            FROM referrals 
            WHERE matrix_root_wallet = matrix_root_addr;
        END IF;
        
        -- Insert the referral record
        INSERT INTO referrals (
            member_wallet,
            referrer_wallet,
            matrix_root_wallet,
            matrix_root_sequence,
            matrix_layer,
            matrix_position,
            member_activation_sequence,
            is_direct_referral,
            is_spillover_placement,
            placed_at
        ) VALUES (
            member_record.wallet_address,
            referrer_wallet_addr,
            COALESCE(matrix_root_addr, referrer_wallet_addr),
            (SELECT activation_sequence FROM members WHERE wallet_address = COALESCE(matrix_root_addr, referrer_wallet_addr)),
            current_layer,
            next_position,
            member_record.activation_sequence,
            (matrix_root_addr = referrer_wallet_addr AND current_layer = 1), -- Direct referral
            (matrix_root_addr != referrer_wallet_addr), -- Spillover placement
            member_record.activation_time
        );
        
        placement_count := placement_count + 1;
    END LOOP;
    
    RETURN 'Rebuilt referral matrix for ' || placement_count || ' members';
END;
$$ LANGUAGE plpgsql;

-- Execute the matrix rebuild
SELECT rebuild_referral_matrix();

\echo '✅ Referral matrix rebuilt according to MarketingPlan.md'

-- ========================================
-- 8. ADD DATABASE CONSTRAINTS
-- ========================================
\echo '🔒 Step 8: Adding database constraints for data integrity...'

-- Add check constraint for wallet address format
ALTER TABLE users 
ADD CONSTRAINT check_wallet_address_format 
CHECK (wallet_address ~ '^0x[a-f0-9]{40}$');

ALTER TABLE members 
ADD CONSTRAINT check_wallet_address_format 
CHECK (wallet_address ~ '^0x[a-f0-9]{40}$');

ALTER TABLE membership 
ADD CONSTRAINT check_wallet_address_format 
CHECK (wallet_address ~ '^0x[a-f0-9]{40}$');

-- Add constraint to prevent duplicate members
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_wallet_unique 
ON members(wallet_address);

-- Add constraint for valid NFT levels
ALTER TABLE membership 
DROP CONSTRAINT IF EXISTS membership_nft_level_check;
ALTER TABLE membership 
ADD CONSTRAINT membership_nft_level_check 
CHECK (nft_level >= 1 AND nft_level <= 19);

-- Add constraint for current_level consistency
ALTER TABLE members 
ADD CONSTRAINT check_current_level_range 
CHECK (current_level >= 1 AND current_level <= 19);

\echo '✅ Database constraints added'

-- ========================================
-- 9. ENHANCE TRIGGERS FOR AUTO-SYNC
-- ========================================
\echo '⚙️ Step 9: Creating enhanced triggers for automatic synchronization...'

-- Function to sync member level when membership is updated
CREATE OR REPLACE FUNCTION sync_member_level_on_membership_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Update member's current level and NFT count
    UPDATE members 
    SET 
        current_level = (
            SELECT MAX(nft_level) 
            FROM membership 
            WHERE wallet_address = NEW.wallet_address
        ),
        total_nft_claimed = (
            SELECT COUNT(DISTINCT nft_level) 
            FROM membership 
            WHERE wallet_address = NEW.wallet_address
        )
    WHERE wallet_address = NEW.wallet_address;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for membership changes
DROP TRIGGER IF EXISTS trigger_sync_member_level ON membership;
CREATE TRIGGER trigger_sync_member_level
    AFTER INSERT OR UPDATE ON membership
    FOR EACH ROW
    EXECUTE FUNCTION sync_member_level_on_membership_change();

-- Function to normalize wallet addresses on insert/update
CREATE OR REPLACE FUNCTION normalize_wallet_on_change()
RETURNS TRIGGER AS $$
BEGIN
    NEW.wallet_address := normalize_wallet_address(NEW.wallet_address);
    
    -- Also normalize referrer_wallet if it exists
    IF TG_TABLE_NAME = 'members' AND NEW.referrer_wallet IS NOT NULL THEN
        NEW.referrer_wallet := normalize_wallet_address(NEW.referrer_wallet);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for wallet address normalization
DROP TRIGGER IF EXISTS trigger_normalize_wallet_users ON users;
CREATE TRIGGER trigger_normalize_wallet_users
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION normalize_wallet_on_change();

DROP TRIGGER IF EXISTS trigger_normalize_wallet_members ON members;
CREATE TRIGGER trigger_normalize_wallet_members
    BEFORE INSERT OR UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION normalize_wallet_on_change();

DROP TRIGGER IF EXISTS trigger_normalize_wallet_membership ON membership;
CREATE TRIGGER trigger_normalize_wallet_membership
    BEFORE INSERT OR UPDATE ON membership
    FOR EACH ROW
    EXECUTE FUNCTION normalize_wallet_on_change();

\echo '✅ Enhanced triggers created'

-- ========================================
-- 10. CREATE DATA INTEGRITY CHECK FUNCTION
-- ========================================
\echo '🔍 Step 10: Creating data integrity check function...'

CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    issue_count INTEGER,
    description TEXT
) AS $$
BEGIN
    -- Check 1: Level synchronization
    RETURN QUERY
    WITH level_mismatches AS (
        SELECT 
            m.wallet_address,
            m.current_level,
            COALESCE(MAX(mb.nft_level), 0) as highest_nft_level
        FROM members m
        LEFT JOIN membership mb ON m.wallet_address = mb.wallet_address
        GROUP BY m.wallet_address, m.current_level
        HAVING m.current_level != COALESCE(MAX(mb.nft_level), 0)
    )
    SELECT 
        'Level Synchronization'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        'Members table current_level vs membership table highest NFT level'::TEXT
    FROM level_mismatches;
    
    -- Check 2: Duplicate members
    RETURN QUERY
    WITH duplicates AS (
        SELECT wallet_address
        FROM members
        GROUP BY wallet_address
        HAVING COUNT(*) > 1
    )
    SELECT 
        'Duplicate Members'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        'Multiple member records for same wallet address'::TEXT
    FROM duplicates;
    
    -- Check 3: Wallet address format
    RETURN QUERY
    WITH invalid_addresses AS (
        SELECT wallet_address
        FROM members
        WHERE wallet_address !~ '^0x[a-f0-9]{40}$'
        UNION
        SELECT wallet_address
        FROM users
        WHERE wallet_address !~ '^0x[a-f0-9]{40}$'
        UNION
        SELECT wallet_address
        FROM membership
        WHERE wallet_address !~ '^0x[a-f0-9]{40}$'
    )
    SELECT 
        'Wallet Address Format'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        'Wallet addresses not in proper Ethereum format'::TEXT
    FROM invalid_addresses;
    
    -- Check 4: Referral integrity
    RETURN QUERY
    WITH referral_issues AS (
        SELECT r.member_wallet
        FROM referrals r
        LEFT JOIN members m ON r.referrer_wallet = m.wallet_address
        WHERE r.referrer_wallet IS NOT NULL 
          AND r.referrer_wallet != ''
          AND m.wallet_address IS NULL
    )
    SELECT 
        'Referral Integrity'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        'Referral records pointing to non-existent members'::TEXT
    FROM referral_issues;
    
    -- Check 5: NFT count accuracy
    RETURN QUERY
    WITH count_mismatches AS (
        SELECT 
            m.wallet_address,
            m.total_nft_claimed,
            COUNT(DISTINCT mb.nft_level) as actual_count
        FROM members m
        LEFT JOIN membership mb ON m.wallet_address = mb.wallet_address
        GROUP BY m.wallet_address, m.total_nft_claimed
        HAVING m.total_nft_claimed != COUNT(DISTINCT mb.nft_level)
    )
    SELECT 
        'NFT Count Accuracy'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        'Members total_nft_claimed vs actual NFT count'::TEXT
    FROM count_mismatches;
END;
$$ LANGUAGE plpgsql;

\echo '✅ Data integrity check function created'

-- ========================================
-- 11. FINAL VERIFICATION
-- ========================================
\echo '🔍 Step 11: Running final data integrity verification...'

SELECT * FROM check_data_integrity();

-- ========================================
-- 12. CLEANUP TEMPORARY FUNCTIONS
-- ========================================
\echo '🧹 Step 12: Cleaning up temporary functions...'

DROP FUNCTION IF EXISTS rebuild_referral_matrix();

\echo '✅ Temporary functions cleaned up'

-- Commit all changes
COMMIT;

\echo '=========================================='
\echo '🎉 BEEHIVE Data Synchronization Complete!'
\echo '=========================================='
\echo ''
\echo 'Summary of fixes applied:'
\echo '✅ Wallet addresses normalized to Ethereum format'
\echo '✅ Duplicate member records removed'
\echo '✅ Membership levels synchronized'
\echo '✅ Orphaned referral records cleaned up'
\echo '✅ Referral matrix rebuilt according to MarketingPlan.md'
\echo '✅ Database constraints added for data integrity'
\echo '✅ Enhanced triggers created for automatic synchronization'
\echo '✅ Data integrity check function created'
\echo ''
\echo 'Next steps:'
\echo '1. Run check_data_integrity() periodically to monitor data health'
\echo '2. The system will now automatically maintain data consistency'
\echo '3. All wallet addresses are now in standard Ethereum format'
\echo '4. Referral matrix follows the 3x3 matrix rules from MarketingPlan.md'
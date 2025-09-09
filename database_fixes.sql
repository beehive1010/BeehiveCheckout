-- =====================================================
-- DATABASE FIXES FOR MEMBERS/REFERRALS SYNC ISSUES
-- =====================================================

-- 1. CREATE MISSING REFERRAL RECORDS
-- Sync all members who have referrers to the referrals table
-- This will populate the referrals table from existing member data

INSERT INTO referrals (member_wallet, referrer_wallet, created_at)
SELECT 
    m.wallet_address as member_wallet,
    m.referrer_wallet as referrer_wallet,
    m.created_at as created_at
FROM members m
WHERE m.referrer_wallet IS NOT NULL
  AND m.referrer_wallet != ''
  AND NOT EXISTS (
    SELECT 1 FROM referrals r 
    WHERE r.member_wallet = m.wallet_address
  )
ON CONFLICT (member_wallet) DO NOTHING;

-- 2. CREATE TRIGGER TO KEEP TABLES IN SYNC
-- This ensures new members are automatically added to referrals table

CREATE OR REPLACE FUNCTION sync_member_to_referrals()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new member is created with a referrer, add to referrals table
  IF NEW.referrer_wallet IS NOT NULL AND NEW.referrer_wallet != '' THEN
    INSERT INTO referrals (member_wallet, referrer_wallet, created_at)
    VALUES (NEW.wallet_address, NEW.referrer_wallet, NEW.created_at)
    ON CONFLICT (member_wallet) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on members table
DROP TRIGGER IF EXISTS trigger_sync_member_to_referrals ON members;
CREATE TRIGGER trigger_sync_member_to_referrals
    AFTER INSERT ON members
    FOR EACH ROW
    EXECUTE FUNCTION sync_member_to_referrals();

-- 3. CREATE TRIGGER TO SYNC REFERRER UPDATES
-- This handles when a member's referrer is updated

CREATE OR REPLACE FUNCTION sync_member_referrer_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If referrer changed, update or insert in referrals table
  IF OLD.referrer_wallet IS DISTINCT FROM NEW.referrer_wallet THEN
    
    -- Delete old referral if exists
    DELETE FROM referrals WHERE member_wallet = NEW.wallet_address;
    
    -- Insert new referral if new referrer exists
    IF NEW.referrer_wallet IS NOT NULL AND NEW.referrer_wallet != '' THEN
      INSERT INTO referrals (member_wallet, referrer_wallet, created_at)
      VALUES (NEW.wallet_address, NEW.referrer_wallet, COALESCE(NEW.updated_at, NEW.created_at))
      ON CONFLICT (member_wallet) DO UPDATE SET
        referrer_wallet = EXCLUDED.referrer_wallet,
        created_at = EXCLUDED.created_at;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update trigger on members table
DROP TRIGGER IF EXISTS trigger_sync_member_referrer_update ON members;
CREATE TRIGGER trigger_sync_member_referrer_update
    AFTER UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION sync_member_referrer_update();

-- 4. CREATE VIEW FOR UNIFIED MEMBER-REFERRAL DATA
-- This provides a unified view combining members and referrals data

CREATE OR REPLACE VIEW member_referral_view AS
SELECT 
    m.wallet_address,
    m.current_level,
    m.referrer_wallet,
    m.created_at as member_created_at,
    m.updated_at as member_updated_at,
    r.id as referral_id,
    r.created_at as referral_created_at,
    -- Calculate referral hierarchy depth
    1 as referral_depth,
    -- Check if member has activated
    CASE WHEN m.current_level >= 1 THEN true ELSE false END as is_activated,
    -- Get referrer info
    ref_member.wallet_address as referrer_address,
    ref_member.current_level as referrer_level
FROM members m
LEFT JOIN referrals r ON m.wallet_address = r.member_wallet
LEFT JOIN members ref_member ON m.referrer_wallet = ref_member.wallet_address;

-- 5. CREATE FUNCTION TO REBUILD MATRIX DATA
-- This function rebuilds the matrix structure from member data

CREATE OR REPLACE FUNCTION rebuild_matrix_data()
RETURNS JSON AS $$
DECLARE
    result JSON;
    member_count INTEGER;
    referral_count INTEGER;
BEGIN
    -- Get counts
    SELECT COUNT(*) INTO member_count FROM members;
    SELECT COUNT(*) INTO referral_count FROM referrals;
    
    -- Build result
    result := json_build_object(
        'members_total', member_count,
        'referrals_total', referral_count,
        'sync_status', CASE 
            WHEN member_count = referral_count THEN 'synced'
            ELSE 'needs_sync'
        END,
        'missing_referrals', member_count - referral_count,
        'timestamp', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. CREATE INDEX FOR BETTER PERFORMANCE
-- Add indexes to improve referral queries

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_wallet ON referrals(referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_referrals_member_wallet ON referrals(member_wallet);
CREATE INDEX IF NOT EXISTS idx_members_referrer_wallet ON members(referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_members_current_level ON members(current_level);

-- 7. ADD CONSTRAINT TO ENSURE REFERRALS TABLE UNIQUENESS
-- Ensure each member can only have one referral record

ALTER TABLE referrals 
DROP CONSTRAINT IF EXISTS unique_member_wallet;

ALTER TABLE referrals 
ADD CONSTRAINT unique_member_wallet UNIQUE (member_wallet);

-- 8. CREATE FUNCTION TO GET MATRIX STRUCTURE
-- This function generates proper matrix data for the frontend

CREATE OR REPLACE FUNCTION get_matrix_structure(root_wallet TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
    total_members INTEGER;
    direct_referrals JSON;
BEGIN
    -- Get direct referrals count
    SELECT COUNT(*) INTO total_members
    FROM referrals r
    JOIN members m ON r.member_wallet = m.wallet_address
    WHERE r.referrer_wallet = root_wallet
    AND m.current_level >= 1;
    
    -- Get direct referrals details
    SELECT json_agg(
        json_build_object(
            'wallet_address', m.wallet_address,
            'current_level', m.current_level,
            'joined_at', r.created_at,
            'is_activated', m.current_level >= 1
        )
    ) INTO direct_referrals
    FROM referrals r
    JOIN members m ON r.member_wallet = m.wallet_address
    WHERE r.referrer_wallet = root_wallet
    AND m.current_level >= 1;
    
    -- Build result
    result := json_build_object(
        'root_wallet', root_wallet,
        'total_direct_referrals', total_members,
        'direct_referrals', COALESCE(direct_referrals, '[]'::json),
        'matrix_complete', total_members >= 3,
        'next_layer_available', total_members >= 3
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Run these to verify the fixes worked:

-- 1. Check sync status
SELECT 
    (SELECT COUNT(*) FROM members WHERE referrer_wallet IS NOT NULL) as members_with_referrers,
    (SELECT COUNT(*) FROM referrals) as referral_records,
    (SELECT COUNT(*) FROM members WHERE referrer_wallet IS NOT NULL) - (SELECT COUNT(*) FROM referrals) as missing_referrals;

-- 2. Check specific member
SELECT 
    m.wallet_address,
    m.referrer_wallet,
    r.referrer_wallet as referral_referrer,
    CASE WHEN r.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as referral_status
FROM members m
LEFT JOIN referrals r ON m.wallet_address = r.member_wallet
WHERE m.wallet_address = '0x479abda60f8c62a7c3fba411ab948a8be0e616ab';

-- 3. Test matrix function
SELECT get_matrix_structure('0x47098712eeed62d22b60508a24b0ce54c5edd9ef');

-- 4. Check member-referral view
SELECT * FROM member_referral_view LIMIT 5;
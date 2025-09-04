-- ================================================================================================
-- CREATE TEST USER DATA
-- ================================================================================================
-- This creates test user data to bypass database connection timeouts for testing
-- ================================================================================================

SET search_path TO public;
SET client_min_messages TO NOTICE;

-- ================================================================================================
-- SECTION 1: CREATE TEST USER DATA
-- ================================================================================================

-- Create a test user to bypass database timeout issues
INSERT INTO users (
    wallet_address,
    username,
    email,
    current_level,
    is_upgraded,
    created_at,
    updated_at
) VALUES (
    '0x1234567890123456789012345678901234567890',
    'TestUser001',
    'test@example.com',
    0,
    FALSE,
    NOW(),
    NOW()
) ON CONFLICT (wallet_address) DO UPDATE SET
    username = EXCLUDED.username,
    updated_at = NOW();

-- Create corresponding member record
INSERT INTO members (
    wallet_address,
    current_level,
    is_activated,
    activated_at,
    created_at,
    updated_at
) VALUES (
    '0x1234567890123456789012345678901234567890',
    0,
    FALSE,
    NULL,
    NOW(),
    NOW()
) ON CONFLICT (wallet_address) DO UPDATE SET
    updated_at = NOW();

-- Create initial BCC balance record
INSERT INTO bcc_balances (
    wallet_address,
    transferable_balance,
    restricted_balance,
    created_at,
    updated_at
) VALUES (
    '0x1234567890123456789012345678901234567890',
    0,
    0,
    NOW(),
    NOW()
) ON CONFLICT (wallet_address) DO UPDATE SET
    updated_at = NOW();

-- Verify the test data was created
DO $$
DECLARE
    user_exists BOOLEAN;
    member_exists BOOLEAN;
    bcc_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM users WHERE wallet_address = '0x1234567890123456789012345678901234567890') INTO user_exists;
    SELECT EXISTS(SELECT 1 FROM members WHERE wallet_address = '0x1234567890123456789012345678901234567890') INTO member_exists;
    SELECT EXISTS(SELECT 1 FROM bcc_balances WHERE wallet_address = '0x1234567890123456789012345678901234567890') INTO bcc_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 TEST USER DATA VERIFICATION:';
    RAISE NOTICE '✅ User record exists: %', user_exists;
    RAISE NOTICE '✅ Member record exists: %', member_exists;
    RAISE NOTICE '✅ BCC balance record exists: %', bcc_exists;
    
    IF user_exists AND member_exists AND bcc_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 Test user data created successfully!';
        RAISE NOTICE 'Wallet: 0x1234567890123456789012345678901234567890';
        RAISE NOTICE '';
        RAISE NOTICE 'Now the API should work without "User not found" errors.';
    ELSE
        RAISE WARNING '⚠️  Some test data creation failed - check table structures';
    END IF;
END $$;
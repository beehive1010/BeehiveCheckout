-- =============================================
-- Simple User Registration Function
-- =============================================

-- Create register_user_simple function that matches frontend expectations
CREATE OR REPLACE FUNCTION register_user_simple(
    p_email VARCHAR(255),
    p_referrer_wallet VARCHAR(42),
    p_username VARCHAR(50),
    p_wallet_address VARCHAR(42)
)
RETURNS JSONB AS $$
DECLARE
    result_json JSONB;
    referrer_username VARCHAR(50);
BEGIN
    -- Validate required parameters
    IF p_wallet_address IS NULL OR LENGTH(TRIM(p_wallet_address)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Wallet address is required');
    END IF;
    
    IF p_username IS NULL OR LENGTH(TRIM(p_username)) < 3 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Username must be at least 3 characters');
    END IF;
    
    -- Normalize wallet address to lowercase
    p_wallet_address := LOWER(p_wallet_address);
    p_referrer_wallet := CASE WHEN p_referrer_wallet IS NOT NULL THEN LOWER(p_referrer_wallet) ELSE NULL END;
    
    -- Check if user already exists
    IF EXISTS (SELECT 1 FROM users WHERE wallet_address = p_wallet_address) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Wallet address already registered');
    END IF;
    
    -- Check if username is taken
    IF EXISTS (SELECT 1 FROM users WHERE LOWER(username) = LOWER(p_username)) THEN
        RETURN jsonb_build_object('success', false, 'error', format('Username "%s" is already taken', p_username));
    END IF;
    
    -- Check if email is taken (if provided)
    IF p_email IS NOT NULL AND LENGTH(TRIM(p_email)) > 0 THEN
        IF EXISTS (SELECT 1 FROM users WHERE LOWER(email) = LOWER(TRIM(p_email))) THEN
            RETURN jsonb_build_object('success', false, 'error', format('Email "%s" is already registered', p_email));
        END IF;
    END IF;
    
    -- Validate referrer (if provided)
    IF p_referrer_wallet IS NOT NULL THEN
        -- Check if referrer exists and is an active member
        IF NOT EXISTS (
            SELECT 1 FROM membership 
            WHERE wallet_address = p_referrer_wallet 
            AND current_level > 0
        ) THEN
            -- Try to find referrer in users table if not a member yet
            IF NOT EXISTS (SELECT 1 FROM users WHERE wallet_address = p_referrer_wallet) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Referrer wallet not found');
            END IF;
        END IF;
        
        -- Get referrer username
        SELECT username INTO referrer_username 
        FROM users 
        WHERE wallet_address = p_referrer_wallet
        LIMIT 1;
    END IF;
    
    -- Insert user record
    INSERT INTO users (
        wallet_address,
        username,
        email,
        referrer_wallet,
        role,
        profile_completed,
        registration_source,
        is_active,
        created_at
    ) VALUES (
        p_wallet_address,
        TRIM(p_username),
        CASE WHEN p_email IS NOT NULL THEN LOWER(TRIM(p_email)) ELSE NULL END,
        p_referrer_wallet,
        'user',
        true,
        'frontend',
        true,
        NOW()
    );
    
    -- Build success response
    result_json := jsonb_build_object(
        'success', true,
        'message', 'User registered successfully',
        'action', 'new_user',
        'isRegistered', true,
        'isMember', false,
        'data', jsonb_build_object(
            'wallet_address', p_wallet_address,
            'username', TRIM(p_username),
            'email', CASE WHEN p_email IS NOT NULL THEN LOWER(TRIM(p_email)) ELSE NULL END,
            'referrer_wallet', p_referrer_wallet,
            'referrer_username', referrer_username,
            'registration_source', 'frontend',
            'status', 'registered',
            'created_at', NOW()
        )
    );
    
    RETURN result_json;
    
EXCEPTION
    WHEN unique_violation THEN
        IF SQLERRM LIKE '%username%' THEN
            RETURN jsonb_build_object('success', false, 'error', format('Username "%s" is already taken', p_username));
        ELSIF SQLERRM LIKE '%email%' THEN
            RETURN jsonb_build_object('success', false, 'error', format('Email "%s" is already registered', p_email));
        ELSIF SQLERRM LIKE '%wallet_address%' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Wallet address is already registered');
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Registration failed: duplicate entry');
        END IF;
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Registration failed: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION register_user_simple TO authenticated;
GRANT EXECUTE ON FUNCTION register_user_simple TO service_role;

-- Test the function
SELECT 'register_user_simple function created successfully' as status;
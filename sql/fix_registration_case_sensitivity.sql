-- Fix registration function case sensitivity issue
-- The problem: function converts addresses to lowercase but database stores mixed case

CREATE OR REPLACE FUNCTION register_user_simple(
    p_email character varying,
    p_referrer_wallet character varying,
    p_username character varying,
    p_wallet_address character varying
) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
AS $$
DECLARE
    result_json JSONB;
    referrer_username VARCHAR(50);
    user_existed BOOLEAN := false;
    member_created BOOLEAN := false;
BEGIN
    -- Validate required parameters
    IF p_wallet_address IS NULL OR LENGTH(TRIM(p_wallet_address)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Wallet address is required');
    END IF;

    IF p_username IS NULL OR LENGTH(TRIM(p_username)) < 3 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Username must be at least 3 characters');
    END IF;

    -- DO NOT convert wallet addresses to lowercase - preserve original case
    -- Just normalize referrer input but search case-insensitively
    
    -- Check if user already exists (case-insensitive search)
    IF EXISTS (SELECT 1 FROM users WHERE LOWER(wallet_address) = LOWER(p_wallet_address)) THEN
        user_existed := true;
        -- Update existing user data if needed
        UPDATE users SET
            username = CASE WHEN username IS NULL THEN TRIM(p_username) ELSE username END,
            email = CASE WHEN email IS NULL AND p_email IS NOT NULL THEN LOWER(TRIM(p_email)) ELSE email END,
            referrer_wallet = CASE WHEN referrer_wallet IS NULL THEN p_referrer_wallet ELSE referrer_wallet END,
            updated_at = NOW()
        WHERE LOWER(wallet_address) = LOWER(p_wallet_address);
    ELSE
        -- Check if username is taken by another user
        IF EXISTS (SELECT 1 FROM users WHERE LOWER(username) = LOWER(p_username) AND LOWER(wallet_address) <> LOWER(p_wallet_address)) THEN
            RETURN jsonb_build_object('success', false, 'error', format('Username "%s" is already taken', p_username));
        END IF;

        -- Check if email is taken by another user (if provided)
        IF p_email IS NOT NULL AND LENGTH(TRIM(p_email)) > 0 THEN
            IF EXISTS (SELECT 1 FROM users WHERE LOWER(email) = LOWER(TRIM(p_email)) AND LOWER(wallet_address) <> LOWER(p_wallet_address)) THEN
                RETURN jsonb_build_object('success', false, 'error', format('Email "%s" is already registered', p_email));
            END IF;
        END IF;

        -- Validate referrer (if provided) - CASE-INSENSITIVE search
        IF p_referrer_wallet IS NOT NULL THEN
            -- Check if referrer exists in users table (case-insensitive)
            IF NOT EXISTS (SELECT 1 FROM users WHERE LOWER(wallet_address) = LOWER(p_referrer_wallet)) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Referrer wallet not found');
            END IF;
            
            -- Get the actual referrer wallet address from database (preserve original case)
            SELECT wallet_address INTO p_referrer_wallet 
            FROM users 
            WHERE LOWER(wallet_address) = LOWER(p_referrer_wallet) 
            LIMIT 1;
        END IF;

        -- Insert new user record preserving original wallet address case
        INSERT INTO users (
            wallet_address,
            username,
            email,
            referrer_wallet,
            role,
            created_at,
            updated_at
        ) VALUES (
            p_wallet_address,  -- Keep original case
            TRIM(p_username),
            CASE WHEN p_email IS NOT NULL THEN LOWER(TRIM(p_email)) ELSE NULL END,
            p_referrer_wallet,  -- Use case-preserved referrer address
            'user',
            NOW(),
            NOW()
        );
    END IF;

    -- Get referrer username if exists (case-insensitive search)
    IF p_referrer_wallet IS NOT NULL THEN
        SELECT username INTO referrer_username
        FROM users
        WHERE LOWER(wallet_address) = LOWER(p_referrer_wallet)
        LIMIT 1;
    END IF;

    -- Build success response
    result_json := jsonb_build_object(
        'success', true,
        'message', CASE WHEN user_existed THEN 'User already exists' ELSE 'User registered successfully' END,
        'action', CASE WHEN user_existed THEN 'existing_user' ELSE 'new_user' END,
        'user_existed', user_existed,
        'member_created', member_created,
        'isRegistered', true,
        'isMember', false,
        'data', jsonb_build_object(
            'wallet_address', p_wallet_address,  -- Return original case
            'username', TRIM(p_username),
            'email', CASE WHEN p_email IS NOT NULL THEN LOWER(TRIM(p_email)) ELSE NULL END,
            'referrer_wallet', p_referrer_wallet,
            'referrer_username', referrer_username,
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
$$;
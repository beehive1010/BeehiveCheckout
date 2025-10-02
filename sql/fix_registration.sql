-- Fix registration by creating a simple SQL function that handles user registration
-- This bypasses the Edge Function deployment issues

CREATE OR REPLACE FUNCTION register_user_simple(
    p_wallet_address VARCHAR(42),
    p_username VARCHAR(50) DEFAULT NULL,
    p_email VARCHAR(255) DEFAULT NULL,
    p_referrer_wallet VARCHAR(42) DEFAULT NULL
) 
RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_user_exists BOOLEAN := FALSE;
    v_member_exists BOOLEAN := FALSE;
    v_activation_sequence INTEGER;
BEGIN
    -- Check if user already exists
    SELECT EXISTS(SELECT 1 FROM users WHERE wallet_address = p_wallet_address) INTO v_user_exists;
    SELECT EXISTS(SELECT 1 FROM members WHERE wallet_address = p_wallet_address) INTO v_member_exists;
    
    -- If user doesn't exist, create user record
    IF NOT v_user_exists THEN
        INSERT INTO users (
            wallet_address, 
            username, 
            email, 
            role,
            created_at,
            updated_at
        ) VALUES (
            p_wallet_address,
            COALESCE(p_username, 'User_' || RIGHT(p_wallet_address, 6)),
            p_email,
            'member',
            NOW(),
            NOW()
        );
    ELSE
        -- Update existing user if needed
        UPDATE users SET
            username = COALESCE(p_username, username),
            email = COALESCE(p_email, email),
            updated_at = NOW()
        WHERE wallet_address = p_wallet_address;
    END IF;
    
    -- If member doesn't exist and has referrer, create basic member record
    IF NOT v_member_exists AND p_referrer_wallet IS NOT NULL THEN
        -- Get next activation sequence
        SELECT COALESCE(MAX(activation_sequence), 0) + 1 
        INTO v_activation_sequence 
        FROM members;
        
        INSERT INTO members (
            wallet_address,
            current_level,
            referrer_wallet,
            activation_sequence,
            activation_time
        ) VALUES (
            p_wallet_address,
            0,  -- Not activated yet
            p_referrer_wallet,
            v_activation_sequence,
            NOW()
        );
    END IF;
    
    -- Return success result
    v_result := json_build_object(
        'success', TRUE,
        'message', 'User registered successfully',
        'user_existed', v_user_exists,
        'member_created', (NOT v_member_exists AND p_referrer_wallet IS NOT NULL),
        'wallet_address', p_wallet_address
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    -- Return error result
    RETURN json_build_object(
        'success', FALSE,
        'error', SQLERRM,
        'message', 'Registration failed'
    );
END;
$$ LANGUAGE plpgsql;
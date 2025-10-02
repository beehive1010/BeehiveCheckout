-- Create a more reliable activation function that can handle Edge Function failures
-- This function will be used as a fallback when the Edge Function fails

CREATE OR REPLACE FUNCTION activate_membership_fallback(
    p_wallet_address text,
    p_referrer_wallet text DEFAULT NULL,
    p_transaction_hash text DEFAULT NULL,
    p_level integer DEFAULT 1
) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
AS $$
DECLARE
    result_json JSONB;
    activation_result JSONB;
BEGIN
    -- Log the fallback activation attempt
    RAISE NOTICE 'Fallback activation for wallet: %, referrer: %, level: %', 
        p_wallet_address, p_referrer_wallet, p_level;

    -- Check if user exists in users table
    IF NOT EXISTS (SELECT 1 FROM users WHERE LOWER(wallet_address) = LOWER(p_wallet_address)) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found in users table - please register first'
        );
    END IF;

    -- Check if user is already activated
    IF EXISTS (SELECT 1 FROM members WHERE LOWER(wallet_address) = LOWER(p_wallet_address)) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User is already activated'
        );
    END IF;

    -- Use the existing activation function
    IF p_level = 1 THEN
        SELECT activate_nft_level1_membership(p_wallet_address, p_referrer_wallet) INTO activation_result;
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Only Level 1 fallback activation is currently supported'
        );
    END IF;

    -- Build the response
    result_json := jsonb_build_object(
        'success', true,
        'method', 'fallback_activation',
        'message', 'Membership activated via fallback method',
        'activation_result', activation_result,
        'level', p_level,
        'transaction_hash', COALESCE(p_transaction_hash, 'fallback'),
        'timestamp', NOW()
    );

    RETURN result_json;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Fallback activation failed: ' || SQLERRM,
            'error_detail', SQLSTATE
        );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION activate_membership_fallback TO authenticated, anon;

-- Create a logging table for activation issues
CREATE TABLE IF NOT EXISTS activation_issues (
    id SERIAL PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    transaction_hash TEXT,
    error_message TEXT,
    error_details JSONB,
    attempt_method TEXT DEFAULT 'edge_function',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant permissions on the table
GRANT ALL ON activation_issues TO authenticated, anon;
GRANT ALL ON SEQUENCE activation_issues_id_seq TO authenticated, anon;

-- Create function to log activation issues
CREATE OR REPLACE FUNCTION log_activation_issue(
    p_wallet_address text,
    p_transaction_hash text,
    p_error_message text,
    p_error_details jsonb DEFAULT NULL,
    p_method text DEFAULT 'edge_function'
) RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO activation_issues (
        wallet_address,
        transaction_hash, 
        error_message,
        error_details,
        attempt_method
    ) VALUES (
        p_wallet_address,
        p_transaction_hash,
        p_error_message,
        p_error_details,
        p_method
    );
END;
$$;

GRANT EXECUTE ON FUNCTION log_activation_issue TO authenticated, anon;
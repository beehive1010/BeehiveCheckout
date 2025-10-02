-- =============================================
-- NFT Purchase Functions for BCC Payment System
-- =============================================

-- 1. Create spend_bcc_tokens function for general BCC spending
CREATE OR REPLACE FUNCTION spend_bcc_tokens(
    p_wallet_address VARCHAR(42),
    p_amount DECIMAL(18,6),
    p_purpose TEXT,
    p_item_reference TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    current_balance DECIMAL(18,6);
    new_balance DECIMAL(18,6);
    result JSON;
BEGIN
    -- Check if user balance record exists
    SELECT bcc_balance INTO current_balance
    FROM user_balances
    WHERE wallet_address = LOWER(p_wallet_address);
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User balance record not found'
        );
    END IF;
    
    -- Check if sufficient balance
    IF current_balance < p_amount THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Insufficient BCC balance. Available: %s, Required: %s', current_balance, p_amount)
        );
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance - p_amount;
    
    -- Update user balance
    UPDATE user_balances 
    SET bcc_balance = new_balance,
        updated_at = NOW()
    WHERE wallet_address = LOWER(p_wallet_address);
    
    -- Log the transaction
    INSERT INTO bcc_transactions (
        wallet_address,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description,
        reference_id
    ) VALUES (
        LOWER(p_wallet_address),
        'spend',
        p_amount,
        current_balance,
        new_balance,
        p_purpose,
        p_item_reference::UUID
    );
    
    RETURN json_build_object(
        'success', true,
        'new_balance', new_balance,
        'amount_spent', p_amount,
        'transaction_id', (SELECT id FROM bcc_transactions WHERE wallet_address = LOWER(p_wallet_address) ORDER BY created_at DESC LIMIT 1)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- 2. Create purchase_nft_with_bcc function for NFT purchases
CREATE OR REPLACE FUNCTION purchase_nft_with_bcc(
    p_buyer_wallet VARCHAR(42),
    p_nft_id TEXT,
    p_nft_type TEXT,
    p_price_bcc DECIMAL(18,6)
)
RETURNS JSON AS $$
DECLARE
    current_balance DECIMAL(18,6);
    new_balance DECIMAL(18,6);
    nft_exists BOOLEAN := false;
    nft_supply INTEGER;
    result JSON;
BEGIN
    -- Normalize wallet address
    p_buyer_wallet := LOWER(p_buyer_wallet);
    
    -- Check if user balance record exists
    SELECT bcc_balance INTO current_balance
    FROM user_balances
    WHERE wallet_address = p_buyer_wallet;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User balance record not found'
        );
    END IF;
    
    -- Check if sufficient balance
    IF current_balance < p_price_bcc THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Insufficient BCC balance. Available: %s, Required: %s', current_balance, p_price_bcc)
        );
    END IF;
    
    -- Verify NFT exists and is available
    IF p_nft_type = 'advertisement' THEN
        SELECT COUNT(*) > 0 INTO nft_exists
        FROM advertisement_nfts
        WHERE id = p_nft_id AND is_active = true;
    ELSIF p_nft_type = 'merchant' THEN
        SELECT COUNT(*) > 0, COALESCE(supply_available, 0) INTO nft_exists, nft_supply
        FROM merchant_nfts
        WHERE id = p_nft_id AND is_active = true;
        
        -- Check supply for merchant NFTs
        IF nft_exists AND nft_supply <= 0 THEN
            RETURN json_build_object(
                'success', false,
                'error', 'NFT is sold out'
            );
        END IF;
    ELSE
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid NFT type'
        );
    END IF;
    
    IF NOT nft_exists THEN
        RETURN json_build_object(
            'success', false,
            'error', 'NFT not found or not available'
        );
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance - p_price_bcc;
    
    -- Update user balance
    UPDATE user_balances 
    SET bcc_balance = new_balance,
        updated_at = NOW()
    WHERE wallet_address = p_buyer_wallet;
    
    -- Update NFT supply for merchant NFTs
    IF p_nft_type = 'merchant' THEN
        UPDATE merchant_nfts 
        SET supply_available = GREATEST(0, supply_available - 1),
            updated_at = NOW()
        WHERE id = p_nft_id;
    END IF;
    
    -- Log the transaction
    INSERT INTO bcc_transactions (
        wallet_address,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description,
        reference_id
    ) VALUES (
        p_buyer_wallet,
        'spend',
        p_price_bcc,
        current_balance,
        new_balance,
        format('NFT Purchase: %s (%s)', p_nft_id, p_nft_type),
        p_nft_id::UUID
    );
    
    RETURN json_build_object(
        'success', true,
        'new_balance', new_balance,
        'amount_spent', p_price_bcc,
        'nft_id', p_nft_id,
        'nft_type', p_nft_type,
        'transaction_id', (SELECT id FROM bcc_transactions WHERE wallet_address = p_buyer_wallet ORDER BY created_at DESC LIMIT 1)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- 3. Create purchase_course_with_bcc function for course purchases
CREATE OR REPLACE FUNCTION purchase_course_with_bcc(
    p_wallet_address VARCHAR(42),
    p_course_id TEXT,
    p_price_bcc DECIMAL(18,6)
)
RETURNS JSON AS $$
DECLARE
    current_balance DECIMAL(18,6);
    new_balance DECIMAL(18,6);
    course_exists BOOLEAN := false;
    result JSON;
BEGIN
    -- Normalize wallet address
    p_wallet_address := LOWER(p_wallet_address);
    
    -- Check if user balance record exists
    SELECT bcc_balance INTO current_balance
    FROM user_balances
    WHERE wallet_address = p_wallet_address;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User balance record not found'
        );
    END IF;
    
    -- Check if sufficient balance
    IF current_balance < p_price_bcc THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Insufficient BCC balance. Available: %s, Required: %s', current_balance, p_price_bcc)
        );
    END IF;
    
    -- Verify course exists (assuming we have a courses table)
    -- Note: Replace with actual course verification logic
    course_exists := true; -- Placeholder - implement actual course checking
    
    IF NOT course_exists THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Course not found or not available'
        );
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance - p_price_bcc;
    
    -- Update user balance
    UPDATE user_balances 
    SET bcc_balance = new_balance,
        updated_at = NOW()
    WHERE wallet_address = p_wallet_address;
    
    -- Log the transaction
    INSERT INTO bcc_transactions (
        wallet_address,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description,
        reference_id
    ) VALUES (
        p_wallet_address,
        'spend',
        p_price_bcc,
        current_balance,
        new_balance,
        format('Course Purchase: %s', p_course_id),
        p_course_id::UUID
    );
    
    RETURN json_build_object(
        'success', true,
        'new_balance', new_balance,
        'amount_spent', p_price_bcc,
        'course_id', p_course_id,
        'transaction_id', (SELECT id FROM bcc_transactions WHERE wallet_address = p_wallet_address ORDER BY created_at DESC LIMIT 1)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- 4. Grant execute permissions
GRANT EXECUTE ON FUNCTION spend_bcc_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION purchase_nft_with_bcc TO authenticated;
GRANT EXECUTE ON FUNCTION purchase_course_with_bcc TO authenticated;
GRANT EXECUTE ON FUNCTION spend_bcc_tokens TO service_role;
GRANT EXECUTE ON FUNCTION purchase_nft_with_bcc TO service_role;
GRANT EXECUTE ON FUNCTION purchase_course_with_bcc TO service_role;

SELECT 'NFT Purchase Functions Created Successfully' as status;
-- Implement BCC Release Mechanism for Level Upgrades
-- According to docs: Each level upgrade unlocks corresponding BCC amount
-- Level 1: 100 BCC, Level 2: 150 BCC, Level 3: 200 BCC, etc.

-- 1. Create BCC release function
CREATE OR REPLACE FUNCTION unlock_bcc_for_level(
    p_wallet_address TEXT,
    p_level INTEGER
) RETURNS JSON AS $$
DECLARE
    current_balance RECORD;
    release_amount NUMERIC;
    new_available NUMERIC;
    new_locked NUMERIC;
BEGIN
    -- Calculate BCC release amount based on level
    -- Level 1: 100 BCC, Level 2: 150 BCC, Level 3: 200 BCC, etc.
    -- Formula: Level * 50 + 50
    release_amount := p_level * 50.0 + 50.0;
    
    -- Get current balance
    SELECT bcc_balance, bcc_locked, bcc_total_unlocked
    INTO current_balance
    FROM user_balances
    WHERE wallet_address = p_wallet_address;
    
    -- Check if user exists
    IF current_balance IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User balance not found'
        );
    END IF;
    
    -- Check if enough locked BCC available
    IF current_balance.bcc_locked < release_amount THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Insufficient locked BCC',
            'available_locked', current_balance.bcc_locked,
            'requested_release', release_amount
        );
    END IF;
    
    -- Calculate new balances
    new_available := current_balance.bcc_balance + release_amount;
    new_locked := current_balance.bcc_locked - release_amount;
    
    -- Update balances
    UPDATE user_balances
    SET 
        bcc_balance = new_available,
        bcc_locked = new_locked,
        bcc_total_unlocked = COALESCE(bcc_total_unlocked, 0) + release_amount,
        last_updated = NOW()
    WHERE wallet_address = p_wallet_address;
    
    -- Log the BCC release
    INSERT INTO audit_logs (user_wallet, action, new_values)
    VALUES (p_wallet_address, 'bcc_released_for_level', json_build_object(
        'level', p_level,
        'release_amount', release_amount,
        'new_available', new_available,
        'new_locked', new_locked,
        'total_unlocked', current_balance.bcc_total_unlocked + release_amount
    ));
    
    RETURN json_build_object(
        'success', true,
        'message', 'BCC released successfully',
        'level', p_level,
        'release_amount', release_amount,
        'new_available_balance', new_available,
        'new_locked_balance', new_locked,
        'total_unlocked', current_balance.bcc_total_unlocked + release_amount
    );
    
END;
$$ LANGUAGE plpgsql;

-- 2. Test the BCC release function
SELECT 'Testing BCC Release Function' as test_section;
SELECT unlock_bcc_for_level('0xTEST001000000000000000000000000000TEST01', 1) as test_result;

-- 3. Create improved auto balance creation with proper initial amounts
CREATE OR REPLACE FUNCTION auto_create_user_balance_with_initial() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_balances (
        wallet_address,
        bcc_balance,
        bcc_locked,
        activation_tier,
        tier_multiplier,
        last_updated
    ) VALUES (
        NEW.wallet_address,
        500.0,      -- 500 BCC immediate available balance
        10450.0,    -- Tier 1 locked amount (total: 10450 BCC)
        1,          -- Tier 1
        1.0,        -- Full reward rate
        NOW()
    )
    ON CONFLICT (wallet_address) DO UPDATE SET
        -- If balance already exists but has zeros, update it
        bcc_balance = CASE 
            WHEN user_balances.bcc_balance = 0 THEN 500.0 
            ELSE user_balances.bcc_balance 
        END,
        bcc_locked = CASE 
            WHEN user_balances.bcc_locked = 0 THEN 10450.0 
            ELSE user_balances.bcc_locked 
        END,
        activation_tier = CASE 
            WHEN user_balances.activation_tier = 0 THEN 1 
            ELSE user_balances.activation_tier 
        END,
        tier_multiplier = CASE 
            WHEN user_balances.tier_multiplier = 0 THEN 1.0 
            ELSE user_balances.tier_multiplier 
        END,
        last_updated = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Replace the old trigger with the new one
DROP TRIGGER IF EXISTS trigger_auto_create_balance ON members;
CREATE TRIGGER trigger_auto_create_balance_with_initial
    AFTER INSERT ON members
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_user_balance_with_initial();

-- 5. Show current status
SELECT 'Current BCC Release Implementation Status' as status_section;
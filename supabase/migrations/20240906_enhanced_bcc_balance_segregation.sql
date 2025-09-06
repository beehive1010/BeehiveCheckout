-- Enhanced BCC Balance Segregation and Tier-Based Unlock System
-- Supports transferable vs locked BCC with tier-based unlock amounts and comprehensive tracking

-- Update user_balances table to support enhanced segregation
ALTER TABLE user_balances 
ADD COLUMN IF NOT EXISTS bcc_transferable DECIMAL(20, 8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bcc_locked DECIMAL(20, 8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bcc_earned_rewards DECIMAL(20, 8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bcc_pending_activation DECIMAL(20, 8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bcc_locked_staking DECIMAL(20, 8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tier_phase INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS unlock_tier_multiplier DECIMAL(5, 3) DEFAULT 1.0;

-- Create BCC tier configuration table
CREATE TABLE IF NOT EXISTS bcc_tier_config (
    phase_id INTEGER PRIMARY KEY,
    phase_name VARCHAR(50) NOT NULL,
    max_members INTEGER NOT NULL,
    multiplier DECIMAL(5, 3) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert tier configuration data
INSERT INTO bcc_tier_config (phase_id, phase_name, max_members, multiplier) VALUES
(1, 'Phase 1', 9999, 1.0),
(2, 'Phase 2', 9999, 0.5),
(3, 'Phase 3', 19999, 0.25),
(4, 'Phase 4', 999999999, 0.125)
ON CONFLICT (phase_id) DO UPDATE SET
    phase_name = EXCLUDED.phase_name,
    max_members = EXCLUDED.max_members,
    multiplier = EXCLUDED.multiplier,
    is_active = EXCLUDED.is_active;

-- Create BCC level unlock amounts table
CREATE TABLE IF NOT EXISTS bcc_level_unlock_amounts (
    level INTEGER PRIMARY KEY CHECK (level >= 1 AND level <= 19),
    base_amount DECIMAL(20, 8) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert base unlock amounts for each level
INSERT INTO bcc_level_unlock_amounts (level, base_amount, description) VALUES
(1, 100, 'Level 1 activation unlock'),
(2, 150, 'Level 2 upgrade unlock'),
(3, 200, 'Level 3 upgrade unlock'),
(4, 250, 'Level 4 upgrade unlock'),
(5, 300, 'Level 5 upgrade unlock'),
(6, 350, 'Level 6 upgrade unlock'),
(7, 400, 'Level 7 upgrade unlock'),
(8, 450, 'Level 8 upgrade unlock'),
(9, 500, 'Level 9 upgrade unlock'),
(10, 550, 'Level 10 upgrade unlock'),
(11, 600, 'Level 11 upgrade unlock'),
(12, 650, 'Level 12 upgrade unlock'),
(13, 700, 'Level 13 upgrade unlock'),
(14, 750, 'Level 14 upgrade unlock'),
(15, 800, 'Level 15 upgrade unlock'),
(16, 850, 'Level 16 upgrade unlock'),
(17, 900, 'Level 17 upgrade unlock'),
(18, 950, 'Level 18 upgrade unlock'),
(19, 1000, 'Level 19 upgrade unlock')
ON CONFLICT (level) DO UPDATE SET
    base_amount = EXCLUDED.base_amount,
    description = EXCLUDED.description;

-- Create BCC transactions table for comprehensive tracking
CREATE TABLE IF NOT EXISTS bcc_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    balance_type VARCHAR(50) NOT NULL, -- 'transferable', 'locked_rewards', 'locked_level', 'pending_activation'
    transaction_type VARCHAR(50) NOT NULL, -- 'transfer', 'unlock', 'claim', 'purchase', 'reward'
    purpose TEXT,
    from_wallet TEXT,
    to_wallet TEXT,
    metadata JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Add constraints
    CHECK (amount > 0),
    CHECK (balance_type IN ('transferable', 'locked_rewards', 'locked_level', 'locked_staking', 'pending_activation')),
    CHECK (transaction_type IN ('transfer', 'unlock', 'claim', 'purchase', 'reward', 'level_unlock', 'reward_claim', 'activation_unlock', 'spend')),
    CHECK (status IN ('pending', 'completed', 'failed', 'cancelled'))
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_bcc_transactions_wallet ON bcc_transactions (wallet_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bcc_transactions_type ON bcc_transactions (transaction_type, status);
CREATE INDEX IF NOT EXISTS idx_bcc_transactions_balance_type ON bcc_transactions (balance_type, created_at DESC);

-- Function to get current tier phase based on activated members
CREATE OR REPLACE FUNCTION get_current_tier_phase()
RETURNS INTEGER AS $$
DECLARE
    total_activated INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_activated 
    FROM members 
    WHERE is_activated = true;
    
    IF total_activated <= 9999 THEN
        RETURN 1;
    ELSIF total_activated <= 19998 THEN
        RETURN 2;
    ELSIF total_activated <= 39997 THEN
        RETURN 3;
    ELSE
        RETURN 4;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate tier-adjusted BCC unlock amount
CREATE OR REPLACE FUNCTION calculate_bcc_unlock_amount(p_level INTEGER)
RETURNS DECIMAL(20, 8) AS $$
DECLARE
    base_amount DECIMAL(20, 8);
    tier_multiplier DECIMAL(5, 3);
    adjusted_amount DECIMAL(20, 8);
BEGIN
    -- Get base amount for level
    SELECT base_amount INTO base_amount
    FROM bcc_level_unlock_amounts 
    WHERE level = p_level;
    
    IF base_amount IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Get current tier multiplier
    SELECT multiplier INTO tier_multiplier
    FROM bcc_tier_config
    WHERE phase_id = get_current_tier_phase()
    AND is_active = true;
    
    IF tier_multiplier IS NULL THEN
        tier_multiplier := 1.0;
    END IF;
    
    adjusted_amount := base_amount * tier_multiplier;
    
    RETURN FLOOR(adjusted_amount);
END;
$$ LANGUAGE plpgsql;

-- Function to transfer BCC with segregated balance types
CREATE OR REPLACE FUNCTION transfer_bcc_segregated(
    p_from_wallet TEXT,
    p_to_wallet TEXT,
    p_amount DECIMAL(20, 8),
    p_purpose TEXT DEFAULT 'BCC Transfer',
    p_balance_type TEXT DEFAULT 'transferable'
)
RETURNS JSONB AS $$
DECLARE
    sender_balance DECIMAL(20, 8);
    recipient_balance DECIMAL(20, 8);
    transaction_id UUID;
    result JSONB;
BEGIN
    -- Validate balance type
    IF p_balance_type NOT IN ('transferable') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only transferable BCC can be transferred');
    END IF;
    
    -- Check sender balance
    SELECT bcc_transferable INTO sender_balance
    FROM user_balances 
    WHERE wallet_address = p_from_wallet;
    
    IF sender_balance IS NULL OR sender_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Insufficient transferable BCC balance',
            'available', COALESCE(sender_balance, 0),
            'requested', p_amount
        );
    END IF;
    
    -- Create transaction record
    INSERT INTO bcc_transactions (
        wallet_address, amount, balance_type, transaction_type, purpose,
        from_wallet, to_wallet, status
    ) VALUES (
        p_from_wallet, p_amount, p_balance_type, 'transfer', p_purpose,
        p_from_wallet, p_to_wallet, 'completed'
    ) RETURNING transaction_id INTO transaction_id;
    
    -- Update sender balance
    UPDATE user_balances 
    SET bcc_transferable = bcc_transferable - p_amount,
        updated_at = NOW()
    WHERE wallet_address = p_from_wallet;
    
    -- Update or insert recipient balance
    INSERT INTO user_balances (wallet_address, bcc_transferable, updated_at)
    VALUES (p_to_wallet, p_amount, NOW())
    ON CONFLICT (wallet_address) 
    DO UPDATE SET 
        bcc_transferable = user_balances.bcc_transferable + p_amount,
        updated_at = NOW();
    
    -- Get new balances
    SELECT bcc_transferable INTO sender_balance FROM user_balances WHERE wallet_address = p_from_wallet;
    SELECT bcc_transferable INTO recipient_balance FROM user_balances WHERE wallet_address = p_to_wallet;
    
    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', transaction_id,
        'new_sender_balance', sender_balance,
        'new_recipient_balance', recipient_balance
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Function to claim locked BCC rewards
CREATE OR REPLACE FUNCTION claim_locked_bcc_rewards(p_wallet_address TEXT)
RETURNS JSONB AS $$
DECLARE
    total_claimed DECIMAL(20, 8) := 0;
    rewards_processed INTEGER := 0;
    new_balance DECIMAL(20, 8);
    reward_record RECORD;
BEGIN
    -- Get claimable rewards (expired pending rewards)
    FOR reward_record IN 
        SELECT id, reward_amount_bcc
        FROM reward_claims 
        WHERE recipient_wallet = p_wallet_address 
        AND status = 'pending'
        AND expires_at <= NOW()
    LOOP
        -- Update reward status to claimed
        UPDATE reward_claims 
        SET status = 'claimed',
            claimed_at = NOW()
        WHERE id = reward_record.id;
        
        -- Add to totals
        total_claimed := total_claimed + COALESCE(reward_record.reward_amount_bcc, 0);
        rewards_processed := rewards_processed + 1;
        
        -- Create transaction record
        INSERT INTO bcc_transactions (
            wallet_address, amount, balance_type, transaction_type, 
            purpose, status
        ) VALUES (
            p_wallet_address, reward_record.reward_amount_bcc, 'transferable', 'reward_claim',
            'Claimed locked BCC reward', 'completed'
        );
    END LOOP;
    
    IF total_claimed > 0 THEN
        -- Add claimed amount to transferable balance
        INSERT INTO user_balances (wallet_address, bcc_transferable, updated_at)
        VALUES (p_wallet_address, total_claimed, NOW())
        ON CONFLICT (wallet_address)
        DO UPDATE SET 
            bcc_transferable = user_balances.bcc_transferable + total_claimed,
            updated_at = NOW();
    END IF;
    
    -- Get new balance
    SELECT bcc_transferable INTO new_balance 
    FROM user_balances 
    WHERE wallet_address = p_wallet_address;
    
    RETURN jsonb_build_object(
        'success', true,
        'total_claimed', total_claimed,
        'rewards_processed', rewards_processed,
        'new_transferable_balance', COALESCE(new_balance, 0)
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Function to unlock level-based BCC rewards
CREATE OR REPLACE FUNCTION unlock_level_bcc_rewards(
    p_wallet_address TEXT,
    p_level INTEGER
)
RETURNS JSONB AS $$
DECLARE
    member_data RECORD;
    unlock_amount DECIMAL(20, 8);
    tier_phase INTEGER;
    new_balance DECIMAL(20, 8);
BEGIN
    -- Verify member eligibility
    SELECT current_level, is_activated, levels_owned
    INTO member_data
    FROM members 
    WHERE wallet_address = p_wallet_address;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Member not found');
    END IF;
    
    IF NOT member_data.is_activated THEN
        RETURN jsonb_build_object('success', false, 'error', 'Member not activated');
    END IF;
    
    IF member_data.current_level < p_level THEN
        RETURN jsonb_build_object('success', false, 'error', 'Level not yet reached');
    END IF;
    
    -- Check if level unlock already processed
    IF EXISTS (
        SELECT 1 FROM bcc_transactions 
        WHERE wallet_address = p_wallet_address 
        AND transaction_type = 'level_unlock'
        AND metadata->>'level' = p_level::TEXT
        AND status = 'completed'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Level unlock already processed');
    END IF;
    
    -- Calculate unlock amount based on current tier
    tier_phase := get_current_tier_phase();
    unlock_amount := calculate_bcc_unlock_amount(p_level);
    
    IF unlock_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid level or unlock amount');
    END IF;
    
    -- Add unlocked amount to transferable balance
    INSERT INTO user_balances (wallet_address, bcc_transferable, tier_phase, updated_at)
    VALUES (p_wallet_address, unlock_amount, tier_phase, NOW())
    ON CONFLICT (wallet_address)
    DO UPDATE SET 
        bcc_transferable = user_balances.bcc_transferable + unlock_amount,
        tier_phase = tier_phase,
        updated_at = NOW();
    
    -- Create transaction record
    INSERT INTO bcc_transactions (
        wallet_address, amount, balance_type, transaction_type, 
        purpose, metadata, status
    ) VALUES (
        p_wallet_address, unlock_amount, 'transferable', 'level_unlock',
        format('Level %s BCC unlock', p_level),
        jsonb_build_object('level', p_level, 'tier_phase', tier_phase),
        'completed'
    );
    
    -- Get new balance
    SELECT bcc_transferable INTO new_balance 
    FROM user_balances 
    WHERE wallet_address = p_wallet_address;
    
    RETURN jsonb_build_object(
        'success', true,
        'amount_unlocked', unlock_amount,
        'tier_phase', tier_phase,
        'new_transferable_balance', new_balance
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Update user_balances table constraints
ALTER TABLE user_balances 
DROP CONSTRAINT IF EXISTS check_non_negative_bcc_balances;

ALTER TABLE user_balances 
ADD CONSTRAINT check_non_negative_bcc_balances 
CHECK (
    bcc_transferable >= 0 AND 
    bcc_locked >= 0 AND 
    bcc_earned_rewards >= 0 AND 
    bcc_pending_activation >= 0 AND
    bcc_locked_staking >= 0
);

-- Create view for comprehensive balance overview
CREATE OR REPLACE VIEW user_bcc_balance_overview AS
SELECT 
    ub.wallet_address,
    ub.bcc_transferable,
    ub.bcc_locked,
    ub.bcc_earned_rewards,
    ub.bcc_pending_activation,
    ub.bcc_locked_staking,
    (ub.bcc_transferable + ub.bcc_locked + ub.bcc_earned_rewards + ub.bcc_pending_activation + ub.bcc_locked_staking) as total_bcc_balance,
    ub.tier_phase,
    tc.multiplier as tier_multiplier,
    tc.phase_name as tier_name,
    m.current_level,
    m.is_activated,
    m.levels_owned,
    COALESCE(pending_rewards.reward_count, 0) as pending_reward_claims,
    COALESCE(pending_rewards.total_pending_bcc, 0) as pending_bcc_rewards
FROM user_balances ub
LEFT JOIN bcc_tier_config tc ON tc.phase_id = ub.tier_phase
LEFT JOIN members m ON m.wallet_address = ub.wallet_address
LEFT JOIN (
    SELECT 
        recipient_wallet,
        COUNT(*) as reward_count,
        SUM(reward_amount_bcc) as total_pending_bcc
    FROM reward_claims 
    WHERE status = 'pending'
    GROUP BY recipient_wallet
) pending_rewards ON pending_rewards.recipient_wallet = ub.wallet_address;

-- Add indexes for the view
CREATE INDEX IF NOT EXISTS idx_user_balances_comprehensive 
ON user_balances (wallet_address, tier_phase) 
INCLUDE (bcc_transferable, bcc_locked, bcc_earned_rewards, bcc_pending_activation, bcc_locked_staking);

-- Grant permissions
GRANT SELECT ON user_bcc_balance_overview TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON bcc_transactions TO authenticated, anon;
GRANT SELECT ON bcc_tier_config TO authenticated, anon;
GRANT SELECT ON bcc_level_unlock_amounts TO authenticated, anon;

COMMENT ON TABLE bcc_transactions IS 'Comprehensive BCC transaction tracking with segregated balance types';
COMMENT ON TABLE bcc_tier_config IS 'BCC tier configuration with halving mechanism for unlock amounts';
COMMENT ON TABLE bcc_level_unlock_amounts IS 'Base unlock amounts for each NFT level, adjusted by tier multiplier';
COMMENT ON VIEW user_bcc_balance_overview IS 'Comprehensive view of user BCC balances with tier and reward information';
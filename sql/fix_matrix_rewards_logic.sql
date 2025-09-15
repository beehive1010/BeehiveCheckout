-- Fix Matrix Rewards Logic
-- Each member activation should only create ONE Layer 1 reward for their matrix root
-- Current system incorrectly creates rewards for multiple layers

-- 1. First, let's see the current incorrect state
SELECT 
    '=== CURRENT INCORRECT REWARDS ===' as section;

SELECT 
    reward_recipient_wallet as matrix_root,
    COUNT(*) as total_rewards,
    SUM(reward_amount) as total_amount,
    STRING_AGG(DISTINCT matrix_layer::text, ',') as layers_rewarded
FROM layer_rewards 
WHERE reward_recipient_wallet = '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C'
GROUP BY reward_recipient_wallet;

-- 2. Delete all incorrect rewards for this user to start fresh
DELETE FROM layer_rewards 
WHERE reward_recipient_wallet = '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C';

-- 3. Also delete from reward_timers
DELETE FROM reward_timers 
WHERE recipient_wallet = '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C';

SELECT '=== DELETED INCORRECT REWARDS ===' as section;

-- 4. Create correct rewards: Only Layer 1 members of this matrix should trigger rewards
-- Matrix root: 0x781665DaeD20238fFA341085aA77d31b8c0Cf68C (username: 1234)
-- Layer 1 members should each trigger ONE $100 reward

-- Get Layer 1 members of user 1234's matrix
SELECT 
    '=== LAYER 1 MEMBERS WHO SHOULD TRIGGER REWARDS ===' as section;

SELECT 
    member_wallet,
    matrix_position,
    placed_at
FROM referrals 
WHERE matrix_root_wallet = '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C'
  AND matrix_layer = 1
ORDER BY matrix_position;

-- 5. Create correct rewards - Only ONE reward per Layer 1 member activation
-- Each Layer 1 member activation creates exactly one $100 reward for the matrix root

INSERT INTO layer_rewards (
    reward_recipient_wallet,
    triggering_member_wallet, 
    matrix_root_wallet,
    triggering_nft_level,
    matrix_layer,
    reward_amount,
    status,
    recipient_required_level,
    recipient_current_level,
    created_at,
    expires_at
)
SELECT 
    r.matrix_root_wallet as reward_recipient_wallet,
    r.member_wallet as triggering_member_wallet,
    r.matrix_root_wallet,
    1 as triggering_nft_level, -- Level 1 NFT triggers this reward
    1 as matrix_layer, -- Always Layer 1 reward regardless of member's actual layer
    100.00 as reward_amount,
    CASE 
        -- Special rule: R position Layer 1 rewards require matrix root to be Level 2+
        WHEN r.matrix_position = 'R' AND r.matrix_layer = 1 THEN
            CASE 
                WHEN m_root.current_level >= 2 THEN 'claimable'
                ELSE 'pending'
            END
        ELSE 'claimable'
    END as status,
    CASE 
        -- Special rule: R position Layer 1 rewards require matrix root to be Level 2+
        WHEN r.matrix_position = 'R' AND r.matrix_layer = 1 THEN 2
        ELSE 1
    END as recipient_required_level,
    m_root.current_level as recipient_current_level,
    r.placed_at as created_at,
    CASE 
        WHEN r.matrix_position = 'R' AND r.matrix_layer = 1 AND m_root.current_level < 2 THEN
            r.placed_at + INTERVAL '72 hours'
        ELSE NULL
    END as expires_at
FROM referrals r
JOIN members m_root ON m_root.wallet_address = r.matrix_root_wallet
WHERE r.matrix_root_wallet = '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C'
  AND r.matrix_layer = 1  -- Only Layer 1 members trigger rewards
ORDER BY r.matrix_position;

-- 6. Create timers for pending rewards
INSERT INTO reward_timers (
    recipient_wallet,
    reward_id,
    timer_type,
    expires_at,
    is_active,
    created_at
)
SELECT 
    lr.reward_recipient_wallet,
    lr.id,
    'pending_upgrade' as timer_type,
    lr.expires_at,
    true as is_active,
    lr.created_at
FROM layer_rewards lr
WHERE lr.reward_recipient_wallet = '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C'
  AND lr.status = 'pending'
  AND lr.expires_at IS NOT NULL;

-- 7. Show the corrected results
SELECT 
    '=== CORRECTED REWARDS ===' as section;

SELECT 
    reward_recipient_wallet as matrix_root,
    triggering_member_wallet as layer1_member,
    matrix_layer as reward_layer,
    reward_amount,
    status,
    expires_at
FROM layer_rewards 
WHERE reward_recipient_wallet = '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C'
ORDER BY created_at;

SELECT 
    '=== SUMMARY ===' as section;

SELECT 
    COUNT(*) as total_rewards,
    SUM(reward_amount) as total_amount,
    COUNT(CASE WHEN status = 'claimable' THEN 1 END) as claimable_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
FROM layer_rewards 
WHERE reward_recipient_wallet = '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C';

-- 8. Update the trigger function to prevent future incorrect rewards
-- Create the correct trigger function
CREATE OR REPLACE FUNCTION trigger_layer_rewards_on_upgrade_correct(
    p_upgrading_member_wallet TEXT,
    p_new_level INTEGER,
    p_nft_price NUMERIC
) RETURNS JSON AS $$
DECLARE
    matrix_root_info RECORD;
    root_current_level INTEGER;
    required_level INTEGER;
    reward_status TEXT;
    expires_timestamp TIMESTAMP;
    new_reward_id UUID;
BEGIN
    -- Get matrix information for the upgrading member
    SELECT
        matrix_root_wallet,
        matrix_layer,
        matrix_position
    INTO matrix_root_info
    FROM referrals
    WHERE member_wallet = p_upgrading_member_wallet;

    -- If not in matrix, exit
    IF matrix_root_info.matrix_root_wallet IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Member not found in any matrix'
        );
    END IF;

    -- Check if this is the matrix root upgrading themselves (no self-rewards)
    IF matrix_root_info.matrix_root_wallet = p_upgrading_member_wallet THEN
        RETURN json_build_object(
            'success', true,
            'message', 'No reward for matrix root upgrading themselves',
            'rewards_created', 0
        );
    END IF;

    -- CRITICAL: Only create rewards if this member is in Layer 1 of their matrix
    -- Members in deeper layers do not trigger new rewards for their matrix root
    IF matrix_root_info.matrix_layer != 1 THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Only Layer 1 members trigger matrix root rewards',
            'member_layer', matrix_root_info.matrix_layer,
            'rewards_created', 0
        );
    END IF;

    -- Check if reward already exists to prevent duplicates
    IF EXISTS (
        SELECT 1 FROM layer_rewards 
        WHERE triggering_member_wallet = p_upgrading_member_wallet
          AND reward_recipient_wallet = matrix_root_info.matrix_root_wallet
    ) THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Reward already exists for this member activation',
            'rewards_created', 0
        );
    END IF;

    -- Get matrix root's current level
    SELECT current_level INTO root_current_level
    FROM members
    WHERE wallet_address = matrix_root_info.matrix_root_wallet;

    -- Determine required level (special rule for R position Layer 1)
    IF p_new_level = 1 AND matrix_root_info.matrix_position = 'R' AND matrix_root_info.matrix_layer = 1 THEN
        required_level := 2;
    ELSE
        required_level := p_new_level;
    END IF;

    -- Determine reward status and expiration
    IF root_current_level >= required_level THEN
        reward_status := 'claimable';
        expires_timestamp := NULL;
    ELSE
        reward_status := 'pending';
        expires_timestamp := NOW() + INTERVAL '72 hours';
    END IF;

    -- Create the Layer 1 reward (always Layer 1, regardless of member's actual layer)
    INSERT INTO layer_rewards (
        reward_recipient_wallet,
        triggering_member_wallet,
        matrix_root_wallet,
        matrix_layer,
        reward_amount,
        status,
        created_at,
        expires_at
    ) VALUES (
        matrix_root_info.matrix_root_wallet,
        p_upgrading_member_wallet,
        matrix_root_info.matrix_root_wallet,
        1, -- Always Layer 1 reward
        p_nft_price,
        reward_status,
        NOW(),
        expires_timestamp
    )
    RETURNING id INTO new_reward_id;

    -- Create timer for pending rewards
    IF reward_status = 'pending' THEN
        INSERT INTO reward_timers (
            recipient_wallet,
            reward_id,
            timer_type,
            expires_at,
            is_active
        ) VALUES (
            matrix_root_info.matrix_root_wallet,
            new_reward_id,
            'pending_upgrade',
            expires_timestamp,
            true
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', 'Layer 1 reward created successfully',
        'matrix_root', matrix_root_info.matrix_root_wallet,
        'reward_amount', p_nft_price,
        'status', reward_status,
        'expires_at', expires_timestamp,
        'rewards_created', 1
    );
END;
$$ LANGUAGE plpgsql;
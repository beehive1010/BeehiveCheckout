-- Fix missing layer rewards based on matrix_referrals_tree_view
-- For wallet: 0xa212A85f7434A5EBAa5b468971EC3972cE72a544 (Level 1)

BEGIN;

-- Get the recipient current level for status determination
WITH recipient_info AS (
    SELECT current_level 
    FROM members 
    WHERE wallet_address = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
),
reward_rules AS (
    SELECT 
        1 as layer, 100.00 as reward_amount, 1 as required_level
    UNION ALL
    SELECT 
        2 as layer, 150.00 as reward_amount, 2 as required_level
    UNION ALL
    SELECT 
        3 as layer, 200.00 as reward_amount, 3 as required_level
    UNION ALL
    SELECT 
        4 as layer, 200.00 as reward_amount, 4 as required_level
    UNION ALL
    SELECT 
        5 as layer, 200.00 as reward_amount, 5 as required_level
    UNION ALL
    SELECT 
        6 as layer, 200.00 as reward_amount, 6 as required_level
    UNION ALL
    SELECT 
        7 as layer, 200.00 as reward_amount, 7 as required_level
    UNION ALL
    SELECT 
        8 as layer, 200.00 as reward_amount, 8 as required_level
    UNION ALL
    SELECT 
        9 as layer, 200.00 as reward_amount, 9 as required_level
)

-- Insert missing layer rewards
INSERT INTO layer_rewards (
    triggering_member_wallet,
    reward_recipient_wallet, 
    matrix_root_wallet,
    triggering_nft_level,
    reward_amount,
    layer_position,
    matrix_layer,
    status,
    recipient_required_level,
    recipient_current_level,
    created_at
)
SELECT 
    mtv.member_wallet as triggering_member_wallet,
    mtv.matrix_root_wallet as reward_recipient_wallet,
    mtv.matrix_root_wallet as matrix_root_wallet,
    mtv.current_level as triggering_nft_level,
    rr.reward_amount,
    mtv.position as layer_position,
    mtv.layer as matrix_layer,
    CASE 
        WHEN ri.current_level >= rr.required_level THEN 'claimable'
        ELSE 'pending'
    END as status,
    rr.required_level as recipient_required_level,
    ri.current_level as recipient_current_level,
    mtv.activation_time as created_at
FROM matrix_referrals_tree_view mtv
CROSS JOIN recipient_info ri
JOIN reward_rules rr ON rr.layer = mtv.layer
WHERE mtv.matrix_root_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
AND mtv.is_activated = true
AND NOT EXISTS (
    -- Don't create duplicate rewards
    SELECT 1 FROM layer_rewards lr 
    WHERE lr.matrix_root_wallet = mtv.matrix_root_wallet
    AND lr.triggering_member_wallet = mtv.member_wallet
    AND lr.matrix_layer = mtv.layer
);

-- Verify the results
SELECT 
    'Layer Rewards Summary' as description,
    matrix_layer,
    status,
    COUNT(*) as count,
    SUM(reward_amount) as total_amount
FROM layer_rewards 
WHERE matrix_root_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
GROUP BY matrix_layer, status
ORDER BY matrix_layer, status;

COMMIT;
-- Fix layer reward status based on level requirements
-- Each layer requires the corresponding level to be claimable
-- Layer 1 requires Level 1, Layer 2 requires Level 2, etc.

BEGIN;

-- Show current status before update
SELECT 
    'Before Update' as status,
    matrix_layer,
    status as reward_status,
    COUNT(*) as count,
    SUM(reward_amount) as total_amount,
    recipient_required_level,
    recipient_current_level
FROM layer_rewards 
WHERE matrix_root_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
GROUP BY matrix_layer, status, recipient_required_level, recipient_current_level
ORDER BY matrix_layer;

-- Update layer rewards status based on correct logic:
-- Only Layer 1 should be claimable (since wallet is Level 1)
-- Layers 2-9 should be pending (since wallet needs Level 2-9 respectively)
UPDATE layer_rewards 
SET 
    status = CASE 
        WHEN matrix_layer = 1 AND recipient_current_level >= 1 THEN 'claimable'
        WHEN matrix_layer = 2 AND recipient_current_level >= 2 THEN 'claimable'
        WHEN matrix_layer = 3 AND recipient_current_level >= 3 THEN 'claimable'
        WHEN matrix_layer = 4 AND recipient_current_level >= 4 THEN 'claimable'
        WHEN matrix_layer = 5 AND recipient_current_level >= 5 THEN 'claimable'
        WHEN matrix_layer = 6 AND recipient_current_level >= 6 THEN 'claimable'
        WHEN matrix_layer = 7 AND recipient_current_level >= 7 THEN 'claimable'
        WHEN matrix_layer = 8 AND recipient_current_level >= 8 THEN 'claimable'
        WHEN matrix_layer = 9 AND recipient_current_level >= 9 THEN 'claimable'
        ELSE 'pending'
    END,
    recipient_required_level = matrix_layer
WHERE matrix_root_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
AND status != 'claimed'; -- Don't update already claimed rewards

-- Show results after update
SELECT 
    'After Update' as status,
    matrix_layer,
    status as reward_status,
    COUNT(*) as count,
    SUM(reward_amount) as total_amount,
    recipient_required_level,
    recipient_current_level
FROM layer_rewards 
WHERE matrix_root_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
GROUP BY matrix_layer, status, recipient_required_level, recipient_current_level
ORDER BY matrix_layer;

-- Summary by status
SELECT 
    'Final Summary' as description,
    status,
    COUNT(*) as total_rewards,
    SUM(reward_amount) as total_amount
FROM layer_rewards 
WHERE matrix_root_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
GROUP BY status
ORDER BY 
    CASE status 
        WHEN 'claimable' THEN 1 
        WHEN 'pending' THEN 2 
        WHEN 'claimed' THEN 3 
        ELSE 4 
    END;

COMMIT;
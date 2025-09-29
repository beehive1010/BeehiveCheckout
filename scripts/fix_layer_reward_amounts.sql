-- Fix layer reward amounts according to correct rules:
-- Layer 1: 100, Layer 2: 150, Layer 3: 200, Layer 4: 250, ...
-- Each layer increases by 50 USDT up to Layer 19: 1000 USDT

BEGIN;

-- First, let's see current wrong amounts
SELECT 
    'Before Update' as status,
    matrix_layer,
    COUNT(*) as reward_count,
    AVG(reward_amount) as current_avg_amount,
    SUM(reward_amount) as total_amount
FROM layer_rewards 
WHERE matrix_root_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
GROUP BY matrix_layer
ORDER BY matrix_layer;

-- Update rewards with correct amounts based on layer
-- Formula: Layer N = 50 + (N * 50) = 50 * (N + 1)
-- But Layer 1 = 100, so it's actually 50 * N + 50

UPDATE layer_rewards 
SET reward_amount = 
    CASE 
        WHEN matrix_layer = 1 THEN 100.00
        WHEN matrix_layer = 2 THEN 150.00
        WHEN matrix_layer = 3 THEN 200.00
        WHEN matrix_layer = 4 THEN 250.00
        WHEN matrix_layer = 5 THEN 300.00
        WHEN matrix_layer = 6 THEN 350.00
        WHEN matrix_layer = 7 THEN 400.00
        WHEN matrix_layer = 8 THEN 450.00
        WHEN matrix_layer = 9 THEN 500.00
        WHEN matrix_layer = 10 THEN 550.00
        WHEN matrix_layer = 11 THEN 600.00
        WHEN matrix_layer = 12 THEN 650.00
        WHEN matrix_layer = 13 THEN 700.00
        WHEN matrix_layer = 14 THEN 750.00
        WHEN matrix_layer = 15 THEN 800.00
        WHEN matrix_layer = 16 THEN 850.00
        WHEN matrix_layer = 17 THEN 900.00
        WHEN matrix_layer = 18 THEN 950.00
        WHEN matrix_layer = 19 THEN 1000.00
        ELSE reward_amount -- Keep existing for any edge cases
    END
WHERE matrix_root_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
AND status != 'claimed'; -- Don't update already claimed rewards

-- Show results after update
SELECT 
    'After Update' as status,
    matrix_layer,
    COUNT(*) as reward_count,
    AVG(reward_amount) as new_avg_amount,
    SUM(reward_amount) as total_amount,
    status
FROM layer_rewards 
WHERE matrix_root_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
GROUP BY matrix_layer, status
ORDER BY matrix_layer, status;

-- Final summary
SELECT 
    'Total Summary' as description,
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
-- Fix Layer 2 position distribution from all L positions to proper L/M/R distribution
-- Current issue: All 12 Layer 2 members are in "L" position
-- Target: 3L, 3M, 3R, 3L (next cycle starts)

BEGIN;

-- Step 1: Show current Layer 2 distribution
SELECT 
    'BEFORE FIX - Layer 2 Position Distribution' as info,
    matrix_position,
    COUNT(*) as count
FROM referrals 
WHERE matrix_root = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E' 
  AND matrix_layer = 2
GROUP BY matrix_position
ORDER BY matrix_position;

-- Step 2: Fix Layer 2 positions using ROW_NUMBER for proper L/M/R distribution
WITH layer2_fix AS (
    SELECT 
        id,
        member_wallet,
        placed_at,
        -- Calculate proper position based on chronological order
        CASE ((ROW_NUMBER() OVER (
            ORDER BY placed_at ASC, member_wallet ASC
        ) - 1) % 3)
            WHEN 0 THEN 'L'
            WHEN 1 THEN 'M' 
            WHEN 2 THEN 'R'
        END as new_position
    FROM referrals 
    WHERE matrix_root = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E' 
      AND matrix_layer = 2
)
UPDATE referrals 
SET 
    matrix_position = layer2_fix.new_position,
    updated_at = NOW()
FROM layer2_fix
WHERE referrals.id = layer2_fix.id;

-- Step 3: Show fixed Layer 2 distribution
SELECT 
    'AFTER FIX - Layer 2 Position Distribution' as info,
    matrix_position,
    COUNT(*) as count
FROM referrals 
WHERE matrix_root = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E' 
  AND matrix_layer = 2
GROUP BY matrix_position
ORDER BY matrix_position;

-- Step 4: Show detailed Layer 2 members with their new positions
SELECT 
    'Layer 2 Members with Fixed Positions' as info,
    matrix_position,
    member_wallet,
    placed_at
FROM referrals 
WHERE matrix_root = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E' 
  AND matrix_layer = 2
ORDER BY placed_at ASC;

COMMIT;
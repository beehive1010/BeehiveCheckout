-- ============================================================================
-- Test Calculate Placement Function
-- ============================================================================

-- Test 1: Test placement for a new member under Genesis
-- Genesis has 3 children at Layer 1, each with 3 children at Layer 2, etc.
SELECT fn_calculate_member_placement(
    '0xTestNewMember001',
    '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
);

-- Test 2: Test placement under a Layer 1 member
SELECT fn_calculate_member_placement(
    '0xTestNewMember002',
    '0xfd91667229a122265aF123a75bb624A9C35B5032'  -- First L child of Genesis
);

-- Test 3: Check current Layer 8 state (where next placement should go)
SELECT
    layer_level,
    COUNT(*) as current_count,
    POWER(3, layer_level)::INTEGER as theoretical_capacity,
    (POWER(3, layer_level)::INTEGER - COUNT(*)) as available_slots
FROM members
WHERE matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
  AND layer_level = 8
GROUP BY layer_level;

-- Test 4: Find the next parent that should receive a child in Layer 8
-- Layer 8 currently has 797 members, next member should be in position...
WITH layer7_parents AS (
    SELECT
        wallet_address,
        activation_sequence,
        ROW_NUMBER() OVER (ORDER BY activation_sequence) as parent_seq
    FROM members
    WHERE matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
      AND layer_level = 7
),
layer8_children AS (
    SELECT
        parent_wallet,
        COUNT(*) as children_count
    FROM members
    WHERE matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
      AND layer_level = 8
    GROUP BY parent_wallet
)
SELECT
    p.wallet_address,
    p.parent_seq,
    p.activation_sequence,
    COALESCE(c.children_count, 0) as current_children,
    CASE
        WHEN COALESCE(c.children_count, 0) < 3 THEN 'HAS_SPACE'
        ELSE 'FULL'
    END as status
FROM layer7_parents p
LEFT JOIN layer8_children c ON c.parent_wallet = p.wallet_address
WHERE COALESCE(c.children_count, 0) < 3
ORDER BY p.activation_sequence
LIMIT 5;

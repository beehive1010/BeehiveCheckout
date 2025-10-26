-- Check specific member: 0x623F77138f688933b5d03e39511F982b6B0FdF08

-- Part 1: Member basic information
SELECT 
    '=== MEMBER INFORMATION ===' as section,
    wallet_address,
    referrer_wallet,
    current_level,
    activation_sequence,
    activation_time,
    total_nft_claimed,
    created_at
FROM members
WHERE wallet_address = '0x623F77138f688933b5d03e39511F982b6B0FdF08';

-- Part 2: This member's placements in other matrices
SELECT 
    '=== PLACEMENTS IN UPLINE MATRICES ===' as section,
    matrix_root_wallet,
    parent_wallet,
    layer,
    position,
    referral_type,
    source,
    created_at as placed_at
FROM matrix_referrals
WHERE member_wallet = '0x623F77138f688933b5d03e39511F982b6B0FdF08'
ORDER BY layer, created_at;

-- Part 3: This member's own matrix (layer 1 children)
SELECT 
    '=== OWN MATRIX - LAYER 1 CHILDREN ===' as section,
    mr.member_wallet,
    mr.position,
    mr.referral_type,
    m.activation_time,
    m.activation_sequence,
    mr.created_at as placed_at,
    u.username
FROM matrix_referrals mr
LEFT JOIN members m ON mr.member_wallet = m.wallet_address
LEFT JOIN users u ON mr.member_wallet = u.wallet_address
WHERE mr.matrix_root_wallet = '0x623F77138f688933b5d03e39511F982b6B0FdF08'
  AND mr.layer = 1
ORDER BY mr.position;

-- Part 4: Full matrix tree (all layers)
SELECT 
    '=== FULL MATRIX TREE ===' as section,
    mr.layer,
    mr.position,
    mr.member_wallet,
    mr.parent_wallet,
    mr.referral_type,
    m.activation_time,
    mr.created_at as placed_at
FROM matrix_referrals mr
LEFT JOIN members m ON mr.member_wallet = m.wallet_address
WHERE mr.matrix_root_wallet = '0x623F77138f688933b5d03e39511F982b6B0FdF08'
ORDER BY mr.layer, mr.position;

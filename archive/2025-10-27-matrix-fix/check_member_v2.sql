-- Check specific member with correct table names

-- Part 1: Member basic information from members_v2
SELECT 
    '=== MEMBER INFORMATION ===' as info,
    wallet_address,
    referrer_wallet,
    current_level,
    activation_sequence,
    activation_time,
    total_nft_claimed
FROM members_v2
WHERE wallet_address = '0x623F77138f688933b5d03e39511F982b6B0FdF08';

-- Also check old members table
SELECT 
    '=== MEMBER INFO (old table) ===' as info,
    wallet_address,
    referrer_wallet,
    current_level,
    activation_sequence,
    activation_time,
    total_nft_claimed
FROM members
WHERE wallet_address = '0x623F77138f688933b5d03e39511F982b6B0FdF08';

-- Part 2: Count of placements
SELECT 
    '=== PLACEMENT SUMMARY ===' as info,
    COUNT(*) as total_placements,
    MIN(layer) as min_layer,
    MAX(layer) as max_layer,
    COUNT(DISTINCT matrix_root_wallet) as unique_roots,
    STRING_AGG(DISTINCT referral_type, ', ') as types
FROM matrix_referrals
WHERE member_wallet = '0x623F77138f688933b5d03e39511F982b6B0FdF08';

-- Part 3: Check if this member has any children in their own matrix
SELECT 
    '=== OWN MATRIX STATUS ===' as info,
    COUNT(*) as total_children,
    COUNT(CASE WHEN layer = 1 THEN 1 END) as layer1_count,
    COUNT(CASE WHEN layer = 2 THEN 1 END) as layer2_count,
    COUNT(CASE WHEN layer = 3 THEN 1 END) as layer3_count
FROM matrix_referrals
WHERE matrix_root_wallet = '0x623F77138f688933b5d03e39511F982b6B0FdF08';

-- Part 4: Check referrer's matrix to see this member's position
SELECT 
    '=== POSITION IN REFERRER MATRIX ===' as info,
    mr.matrix_root_wallet as referrer,
    mr.parent_wallet,
    mr.layer,
    mr.position,
    mr.referral_type,
    mr.source
FROM matrix_referrals mr
WHERE mr.member_wallet = '0x623F77138f688933b5d03e39511F982b6B0FdF08'
  AND mr.layer = 1  -- Direct under referrer
LIMIT 5;

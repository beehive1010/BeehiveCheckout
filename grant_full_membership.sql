-- Create Full Membership Records (Level 1-19)
-- Target: 0xfd91667229a122265aF123a75bb624A9C35B5032

BEGIN;

-- Create membership records for all 19 levels
WITH level_pricing AS (
    SELECT level, price FROM (VALUES
        (1, 130), (2, 150), (3, 200), (4, 250), (5, 300), (6, 350), (7, 400), (8, 450), (9, 500),
        (10, 550), (11, 600), (12, 650), (13, 700), (14, 750), (15, 800), (16, 850), (17, 900), (18, 950), (19, 1000)
    ) AS t(level, price)
)
INSERT INTO membership (
    wallet_address,
    nft_level,
    is_member,
    claimed_at,
    network,
    claim_price,
    total_cost,
    unlock_membership_level,
    platform_activation_fee,
    transaction_hash
)
SELECT
    '0xfd91667229a122265aF123a75bb624A9C35B5032',
    lp.level,
    true,
    NOW(),
    'mainnet',
    lp.price,
    lp.price,
    CASE WHEN lp.level < 19 THEN lp.level + 1 ELSE 19 END,
    CASE WHEN lp.level = 1 THEN 30 ELSE 0 END,
    'admin_grant_' || lp.level || '_' || EXTRACT(EPOCH FROM NOW())::TEXT
FROM level_pricing lp
ON CONFLICT (wallet_address, nft_level) DO UPDATE
SET
    is_member = true,
    claimed_at = NOW(),
    unlock_membership_level = CASE WHEN EXCLUDED.nft_level < 19 THEN EXCLUDED.nft_level + 1 ELSE 19 END,
    updated_at = NOW();

-- Update member's current_level to 19
UPDATE members
SET current_level = 19, updated_at = NOW()
WHERE wallet_address ILIKE '0xfd91667229a122265aF123a75bb624A9C35B5032';

-- Verification
SELECT 'Membership Records:' as info, COUNT(*) as total_levels
FROM membership
WHERE wallet_address ILIKE '0xfd91667229a122265aF123a75bb624A9C35B5032';

SELECT 'Member Level:' as info, current_level
FROM members
WHERE wallet_address ILIKE '0xfd91667229a122265aF123a75bb624A9C35B5032';

COMMIT;

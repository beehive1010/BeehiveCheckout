-- Convert matrix_stats table to view and fix matrix_layer_summary 
-- Based on marketing plan: 3x3 matrix spillover system showing actual member placement

\echo '🔧 Converting matrix_stats to dynamic view and fixing matrix_layer_summary...'

-- Step 1: Drop existing matrix_stats table (backup data first if needed)
DROP TABLE IF EXISTS matrix_stats CASCADE;

-- Step 2: Create matrix_stats as a VIEW based on actual referral placement data
CREATE VIEW matrix_stats AS
SELECT 
    -- Generate unique ID for each root-layer combination
    (row_number() OVER (ORDER BY root_wallet, layer_number))::bigint as id,
    root_wallet,
    layer_number,
    -- Total positions available for this layer (3^layer)
    POWER(3, layer_number)::integer as total_positions,
    -- Actually filled positions from referrals table
    COALESCE(actual_filled.filled_count, 0) as filled_positions,
    -- Available positions = total - filled
    (POWER(3, layer_number)::integer - COALESCE(actual_filled.filled_count, 0)) as available_positions,
    now() as last_updated
FROM 
    -- Generate all root-layer combinations
    (SELECT DISTINCT matrix_root as root_wallet FROM referrals WHERE matrix_root IS NOT NULL) roots
    CROSS JOIN (SELECT generate_series(1, 19) as layer_number) layers
    -- Join with actual placement data
    LEFT JOIN (
        SELECT 
            matrix_root,
            matrix_layer,
            COUNT(*) as filled_count
        FROM referrals 
        WHERE matrix_root IS NOT NULL 
        AND matrix_layer IS NOT NULL
        AND is_active = true
        GROUP BY matrix_root, matrix_layer
    ) actual_filled ON roots.root_wallet = actual_filled.matrix_root 
                   AND layers.layer_number = actual_filled.matrix_layer;

\echo '✅ Created matrix_stats as dynamic view showing actual spillover placement'

-- Step 3: Fix matrix_layer_summary with correct NFT pricing from marketing plan
DELETE FROM matrix_layer_summary;

INSERT INTO matrix_layer_summary (
    root_wallet,
    layer,
    title,
    description,
    price_usdt,
    price_bcc,
    category,
    supply_total,
    supply_available,
    is_active,
    metadata
)
SELECT 
    m.wallet_address as root_wallet,
    layer.layer_number,
    'Level ' || layer.layer_number || ' NFT' as title,
    'Membership NFT Level ' || layer.layer_number || ' - grants access to ' || POWER(3, layer.layer_number) || ' matrix positions and layer rewards' as description,
    -- Correct NFT pricing from marketing plan: Level 1 = 100 USDC, then +50 USDC each level
    (50 + (layer.layer_number * 50))::numeric(18,6) as price_usdt,
    -- BCC price is for spending, not related to NFT purchase (NFTs bought with USDC)
    0::numeric(18,8) as price_bcc,
    CASE 
        WHEN layer.layer_number <= 5 THEN 'Basic'
        WHEN layer.layer_number <= 10 THEN 'Advanced' 
        WHEN layer.layer_number <= 15 THEN 'Professional'
        ELSE 'Elite'
    END as category,
    -- Supply based on actual matrix positions that can be filled
    POWER(3, layer.layer_number)::integer as supply_total,
    POWER(3, layer.layer_number)::integer as supply_available,
    true as is_active,
    jsonb_build_object(
        'nft_level', layer.layer_number,
        'matrix_positions', POWER(3, layer.layer_number),
        'layer_reward_usdt', (50 + (layer.layer_number * 50)), -- Reward = NFT price
        'bcc_release_amount', (50 + (layer.layer_number * 50)), -- BCC released per level (from marketing plan)
        'activation_fee_usdt', CASE WHEN layer.layer_number = 1 THEN 30 ELSE 0 END,
        'upgrade_requirements', CASE 
            WHEN layer.layer_number = 2 THEN 'Requires 3 direct referrals'
            ELSE 'Sequential upgrade only'
        END
    ) as metadata
FROM members m
CROSS JOIN (
    SELECT generate_series(1, 19) as layer_number
) layer;

\echo '✅ Fixed matrix_layer_summary with correct NFT pricing and marketing plan data'

-- Step 4: Create enhanced view for frontend display
CREATE OR REPLACE VIEW matrix_dashboard_view AS
SELECT 
    ms.root_wallet,
    u.username as root_username,
    ms.layer_number,
    mls.title as nft_title,
    mls.price_usdt as nft_price,
    mls.category,
    ms.total_positions,
    ms.filled_positions,
    ms.available_positions,
    ROUND((ms.filled_positions::numeric / ms.total_positions::numeric * 100), 2) as fill_percentage,
    -- Position details (L, M, R breakdown)
    pos_breakdown.l_positions,
    pos_breakdown.m_positions, 
    pos_breakdown.r_positions,
    -- Member level info
    m.current_level as root_current_level,
    CASE 
        WHEN m.current_level >= ms.layer_number THEN 'eligible'
        ELSE 'need_upgrade'
    END as reward_eligibility,
    ms.last_updated
FROM matrix_stats ms
JOIN users u ON ms.root_wallet = u.wallet_address
JOIN members m ON ms.root_wallet = m.wallet_address  
JOIN matrix_layer_summary mls ON ms.root_wallet = mls.root_wallet AND ms.layer_number = mls.layer
-- Add position breakdown
LEFT JOIN (
    SELECT 
        matrix_root,
        matrix_layer,
        COUNT(*) FILTER (WHERE matrix_position = 'L') as l_positions,
        COUNT(*) FILTER (WHERE matrix_position = 'M') as m_positions,
        COUNT(*) FILTER (WHERE matrix_position = 'R') as r_positions
    FROM referrals 
    WHERE is_active = true
    GROUP BY matrix_root, matrix_layer
) pos_breakdown ON ms.root_wallet = pos_breakdown.matrix_root 
                AND ms.layer_number = pos_breakdown.matrix_layer
ORDER BY ms.root_wallet, ms.layer_number;

\echo '✅ Created matrix_dashboard_view for frontend display'

-- Step 5: Test the views
\echo ''
\echo '📊 Testing matrix_stats view (showing actual spillover data):'
SELECT root_wallet, layer_number, total_positions, filled_positions, available_positions
FROM matrix_stats 
WHERE layer_number <= 3
ORDER BY root_wallet, layer_number
LIMIT 10;

\echo ''
\echo '📊 Testing matrix_layer_summary (correct NFT pricing):'
SELECT layer, title, price_usdt, category, supply_total
FROM matrix_layer_summary 
WHERE root_wallet = (SELECT wallet_address FROM members LIMIT 1)
AND layer <= 5
ORDER BY layer;

\echo ''
\echo '📊 Testing matrix_dashboard_view (frontend ready):'
SELECT root_username, layer_number, nft_title, nft_price, filled_positions, total_positions, 
       fill_percentage, reward_eligibility
FROM matrix_dashboard_view
WHERE layer_number <= 3
ORDER BY root_wallet, layer_number
LIMIT 10;

\echo ''
\echo '✅ Matrix system converted to dynamic views based on marketing plan!'
\echo 'Key improvements:'
\echo '  - matrix_stats is now a VIEW showing real spillover placement data'
\echo '  - matrix_layer_summary has correct NFT pricing (Level 1: 100 USDC, +50 each level)'
\echo '  - matrix_dashboard_view provides frontend-ready data with fill percentages'
\echo '  - All data reflects actual 3x3 matrix spillover system'
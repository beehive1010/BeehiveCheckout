-- Initialize matrix_layer_summary data for all members
-- Create layer summary records for each member across all 19 layers

\echo '🔧 Initializing matrix_layer_summary data...'

-- Insert layer summary records for all members and all layers (1-19)
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
    'Layer ' || layer.layer_number || ' Matrix Position' as title,
    'Matrix layer ' || layer.layer_number || ' with ' || POWER(2, layer.layer_number) || ' total positions available for referral rewards' as description,
    -- Price increases exponentially with layer (base: $10 USDT)
    (10 * POWER(1.5, layer.layer_number - 1))::numeric(18,6) as price_usdt,
    -- BCC price is USDT price * 100 (assuming 1 BCC = $0.01)
    (1000 * POWER(1.5, layer.layer_number - 1))::numeric(18,8) as price_bcc,
    CASE 
        WHEN layer.layer_number <= 5 THEN 'Starter'
        WHEN layer.layer_number <= 10 THEN 'Advanced' 
        WHEN layer.layer_number <= 15 THEN 'Professional'
        ELSE 'Elite'
    END as category,
    POWER(2, layer.layer_number)::integer as supply_total,
    POWER(2, layer.layer_number)::integer as supply_available,
    true as is_active,
    jsonb_build_object(
        'matrix_positions', POWER(2, layer.layer_number),
        'reward_multiplier', layer.layer_number * 0.1,
        'difficulty_tier', 
        CASE 
            WHEN layer.layer_number <= 5 THEN 1
            WHEN layer.layer_number <= 10 THEN 2 
            WHEN layer.layer_number <= 15 THEN 3
            ELSE 4
        END
    ) as metadata
FROM members m
CROSS JOIN (
    SELECT generate_series(1, 19) as layer_number
) layer
WHERE NOT EXISTS (
    SELECT 1 FROM matrix_layer_summary mls 
    WHERE mls.root_wallet = m.wallet_address 
    AND mls.layer = layer.layer_number
);

\echo '✅ Created matrix_layer_summary records for all members and layers'

-- Verify the results
\echo ''
\echo '📊 Verification Results:'
SELECT 'Total matrix_layer_summary records:' as metric, COUNT(*)::text as count FROM matrix_layer_summary
UNION ALL
SELECT 'Unique root wallets:', COUNT(DISTINCT root_wallet)::text FROM matrix_layer_summary
UNION ALL
SELECT 'Layers covered:', COUNT(DISTINCT layer)::text FROM matrix_layer_summary
UNION ALL
SELECT 'Average price per layer (USDT):', ROUND(AVG(price_usdt), 2)::text FROM matrix_layer_summary;

-- Show sample data by category
\echo ''
\echo '📋 Sample layer summary data by category:'
SELECT category, 
       COUNT(*) as layer_count,
       MIN(layer) as min_layer,
       MAX(layer) as max_layer,
       ROUND(MIN(price_usdt), 2) as min_price_usdt,
       ROUND(MAX(price_usdt), 2) as max_price_usdt
FROM matrix_layer_summary
GROUP BY category
ORDER BY MIN(layer);

-- Show detailed sample for first member
\echo ''
\echo '📋 Sample detailed records (first 5 layers for one member):'
SELECT root_wallet, layer, title, price_usdt, price_bcc, category, supply_total, supply_available
FROM matrix_layer_summary 
WHERE root_wallet = (SELECT wallet_address FROM members LIMIT 1)
AND layer <= 5
ORDER BY layer;

\echo ''
\echo '✅ Matrix layer summary initialization completed!'
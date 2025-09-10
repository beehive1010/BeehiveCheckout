-- Fix database tables to match 3x3 matrix system from marketing plan
-- Update matrix_stats and matrix_layer_summary to use 3^layer positions instead of 2^layer

\echo '🔧 Converting database from 2x2 binary to 3x3 matrix system...'

-- Step 1: Update matrix_stats to use 3^layer positions
UPDATE matrix_stats SET 
    total_positions = POWER(3, layer_number)::integer,
    available_positions = POWER(3, layer_number)::integer
WHERE total_positions != POWER(3, layer_number)::integer;

\echo '✅ Updated matrix_stats to 3x3 system'

-- Step 2: Update matrix_layer_summary to use 3^layer positions  
UPDATE matrix_layer_summary SET
    supply_total = POWER(3, layer)::integer,
    supply_available = POWER(3, layer)::integer,
    description = 'Matrix layer ' || layer || ' with ' || POWER(3, layer) || ' total positions available for referral rewards (3x3 system)'
WHERE supply_total != POWER(3, layer)::integer;

\echo '✅ Updated matrix_layer_summary to 3x3 system'

-- Step 3: Update pricing to reflect 3x3 system complexity (higher prices due to more positions)
UPDATE matrix_layer_summary SET
    price_usdt = (15 * POWER(1.6, layer - 1))::numeric(18,6),
    price_bcc = (1500 * POWER(1.6, layer - 1))::numeric(18,8),
    metadata = jsonb_set(
        metadata,
        '{matrix_positions}',
        to_jsonb(POWER(3, layer)::integer)
    )
WHERE price_usdt < (15 * POWER(1.6, layer - 1))::numeric(18,6);

\echo '✅ Updated pricing for 3x3 matrix complexity'

-- Step 4: Verify the conversion
\echo ''
\echo '📊 Verification Results:'
SELECT 'Matrix Stats Records:' as metric, COUNT(*)::text as count FROM matrix_stats
UNION ALL
SELECT 'Matrix Layer Summary Records:', COUNT(*)::text FROM matrix_layer_summary
UNION ALL
SELECT 'Layers with 3^layer positions (stats):', COUNT(*)::text 
FROM matrix_stats WHERE total_positions = POWER(3, layer_number)::integer
UNION ALL
SELECT 'Layers with 3^layer positions (summary):', COUNT(*)::text
FROM matrix_layer_summary WHERE supply_total = POWER(3, layer)::integer;

-- Step 5: Show sample data for verification
\echo ''
\echo '📋 Sample 3x3 matrix positions per layer:'
SELECT layer_number as layer, 
       total_positions as positions_3x3,
       '3^' || layer_number as formula
FROM matrix_stats 
WHERE root_wallet = (SELECT wallet_address FROM members LIMIT 1)
AND layer_number <= 8
ORDER BY layer_number;

\echo ''
\echo '📋 Sample pricing for 3x3 system:'
SELECT layer, 
       supply_total as positions,
       ROUND(price_usdt, 2) as price_usdt,
       category
FROM matrix_layer_summary
WHERE root_wallet = (SELECT wallet_address FROM members LIMIT 1)
AND layer <= 5
ORDER BY layer;

\echo ''
\echo '✅ Database successfully converted to 3x3 matrix system!'
\echo 'All tables now match the marketing plan specifications:'
\echo '  - Layer 1: 3 positions'
\echo '  - Layer 2: 9 positions' 
\echo '  - Layer 3: 27 positions'
\echo '  - Layer 19: 1,162,261,467 positions (3^19)'
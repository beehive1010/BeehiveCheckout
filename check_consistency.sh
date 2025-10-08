#!/bin/bash

DATABASE_URL="postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres?sslmode=require"

echo "=== Checking activate-membership data consistency ==="
echo ""

# Check recent activations
echo "Recent Level 1 Activations (Last 7 days):"
psql "$DATABASE_URL" -t -c "
SELECT
  COUNT(DISTINCT m.wallet_address) as members,
  COUNT(DISTINCT ms.wallet_address) as memberships,
  COUNT(DISTINCT ub.wallet_address) as balances
FROM members m
LEFT JOIN membership ms ON LOWER(m.wallet_address) = LOWER(ms.wallet_address) AND ms.nft_level = 1
LEFT JOIN user_balances ub ON LOWER(m.wallet_address) = LOWER(ub.wallet_address)
WHERE m.current_level >= 1
  AND m.activation_time >= NOW() - INTERVAL '7 days';
"

echo ""
echo "Members without membership records:"
psql "$DATABASE_URL" -t -c "
SELECT
  m.wallet_address,
  m.current_level,
  m.activation_time
FROM members m
LEFT JOIN membership ms ON LOWER(m.wallet_address) = LOWER(ms.wallet_address) AND ms.nft_level = m.current_level
WHERE ms.wallet_address IS NULL
ORDER BY m.activation_time DESC
LIMIT 10;
"

echo ""
echo "=== Checking claimed_at field coverage ==="
psql "$DATABASE_URL" -t -c "
SELECT
  COUNT(*) as total_claimed,
  COUNT(claimed_at) as with_claimed_at,
  ROUND(COUNT(claimed_at)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as coverage_pct
FROM layer_rewards
WHERE status = 'claimed';
"

echo ""
echo "=== Checking claim sync queue ==="
psql "$DATABASE_URL" -t -c "
SELECT
  COALESCE(source, 'NONE') as source,
  COALESCE(status, 'NONE') as status,
  COUNT(*) as count
FROM claim_sync_queue
GROUP BY source, status
ORDER BY source, status;
"

echo ""
echo "=== Checking database triggers ==="
psql "$DATABASE_URL" -t -c "
SELECT
  event_object_table || '.' || trigger_name as trigger,
  event_manipulation as event
FROM information_schema.triggers
WHERE event_object_table IN ('members', 'membership', 'layer_rewards')
  AND trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
"

echo ""
echo "=== Recent activation samples ==="
psql "$DATABASE_URL" -t -c "
SELECT
  m.wallet_address,
  m.current_level,
  TO_CHAR(m.activation_time, 'YYYY-MM-DD HH24:MI') as activated,
  CASE WHEN ms.wallet_address IS NOT NULL THEN 'YES' ELSE 'NO' END as has_membership,
  CASE WHEN ub.wallet_address IS NOT NULL THEN 'YES' ELSE 'NO' END as has_balance
FROM members m
LEFT JOIN membership ms ON LOWER(m.wallet_address) = LOWER(ms.wallet_address) AND ms.nft_level = m.current_level
LEFT JOIN user_balances ub ON LOWER(m.wallet_address) = LOWER(ub.wallet_address)
WHERE m.activation_time >= NOW() - INTERVAL '7 days'
ORDER BY m.activation_time DESC
LIMIT 10;
"

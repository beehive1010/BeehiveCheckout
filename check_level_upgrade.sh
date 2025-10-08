#!/bin/bash

DATABASE_URL="postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres?sslmode=require"

echo "=== Checking level-upgrade data consistency ==="
echo ""

# Check upgrades by level
echo "Members by level with membership consistency:"
psql "$DATABASE_URL" -t -c "
SELECT
  m.current_level,
  COUNT(DISTINCT m.wallet_address) as total_members,
  COUNT(DISTINCT ms.wallet_address) as with_membership,
  ROUND(COUNT(DISTINCT ms.wallet_address)::NUMERIC / NULLIF(COUNT(DISTINCT m.wallet_address), 0) * 100, 2) as consistency_pct
FROM members m
LEFT JOIN membership ms ON LOWER(m.wallet_address) = LOWER(ms.wallet_address) AND ms.nft_level = m.current_level
WHERE m.current_level >= 1
GROUP BY m.current_level
ORDER BY m.current_level;
"

echo ""
echo "Recent upgrades (Level 2+) in last 30 days:"
psql "$DATABASE_URL" -t -c "
SELECT
  m.wallet_address,
  m.current_level,
  TO_CHAR(m.activation_time, 'YYYY-MM-DD HH24:MI') as first_activated,
  CASE WHEN ms.wallet_address IS NOT NULL THEN 'YES' ELSE 'NO' END as has_membership
FROM members m
LEFT JOIN membership ms ON LOWER(m.wallet_address) = LOWER(ms.wallet_address) AND ms.nft_level = m.current_level
WHERE m.current_level >= 2
  AND m.activation_time >= NOW() - INTERVAL '30 days'
ORDER BY m.current_level DESC, m.activation_time DESC
LIMIT 15;
"

echo ""
echo "Checking reward triggers for upgrades:"
psql "$DATABASE_URL" -t -c "
SELECT
  source_level,
  COUNT(*) as reward_count,
  COUNT(DISTINCT triggering_member_wallet) as unique_members
FROM layer_rewards
WHERE source_level >= 2
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY source_level
ORDER BY source_level;
"

echo ""
echo "Checking upgrade data integrity (missing records):"
psql "$DATABASE_URL" -t -c "
SELECT
  m.current_level,
  COUNT(*) as members_missing_membership
FROM members m
LEFT JOIN membership ms ON LOWER(m.wallet_address) = LOWER(ms.wallet_address) AND ms.nft_level = m.current_level
WHERE m.current_level >= 1
  AND ms.wallet_address IS NULL
GROUP BY m.current_level
ORDER BY m.current_level;
"

echo ""
echo "=== Checking reward retry queue (if exists) ==="
psql "$DATABASE_URL" -t -c "
SELECT
  COALESCE(status, 'NONE') as status,
  COUNT(*) as count
FROM reward_retry_queue
GROUP BY status
ORDER BY status;
" 2>/dev/null || echo "reward_retry_queue table not yet in use"

echo ""
echo "=== Checking manual review queue (if exists) ==="
psql "$DATABASE_URL" -t -c "
SELECT
  COALESCE(status, 'NONE') as status,
  COUNT(*) as count
FROM manual_review_queue
GROUP BY status
ORDER BY status;
" 2>/dev/null || echo "manual_review_queue table not yet in use"

echo ""
echo "=== Checking v_level_upgrade_health (if exists) ==="
psql "$DATABASE_URL" -t -c "
SELECT * FROM v_level_upgrade_health;
" 2>/dev/null || echo "v_level_upgrade_health view not created"

echo ""
echo "=== Sample: User with highest level ==="
psql "$DATABASE_URL" -t -c "
SELECT
  m.wallet_address,
  m.current_level,
  COUNT(DISTINCT ms.nft_level) as membership_levels,
  COUNT(DISTINCT lr.id) as total_rewards,
  m.total_nft_claimed
FROM members m
LEFT JOIN membership ms ON LOWER(m.wallet_address) = LOWER(ms.wallet_address)
LEFT JOIN layer_rewards lr ON LOWER(m.wallet_address) = LOWER(lr.triggering_member_wallet)
WHERE m.current_level = (SELECT MAX(current_level) FROM members)
GROUP BY m.wallet_address, m.current_level, m.total_nft_claimed
LIMIT 1;
"

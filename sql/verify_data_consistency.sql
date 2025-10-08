-- =====================================================
-- 数据一致性验证 - activate-membership & level-upgrade
-- =====================================================

-- 1. 验证 activate-membership 流程数据完整性
SELECT
  '=== Activate-Membership Flow Verification ===' as section;

SELECT
  'Recent Level 1 Activations (Last 7 Days)' as check_name,
  COUNT(DISTINCT m.wallet_address) as members_activated,
  COUNT(DISTINCT ms.wallet_address) as membership_records,
  COUNT(DISTINCT ub.wallet_address) as user_balances_created,
  COUNT(DISTINCT lr.id) as layer_rewards_created,
  ROUND(COUNT(DISTINCT ms.wallet_address)::NUMERIC / NULLIF(COUNT(DISTINCT m.wallet_address), 0) * 100, 2) as membership_rate,
  ROUND(COUNT(DISTINCT ub.wallet_address)::NUMERIC / NULLIF(COUNT(DISTINCT m.wallet_address), 0) * 100, 2) as balance_rate
FROM members m
LEFT JOIN membership ms ON LOWER(m.wallet_address) = LOWER(ms.wallet_address) AND ms.nft_level = 1
LEFT JOIN user_balances ub ON LOWER(m.wallet_address) = LOWER(ub.wallet_address)
LEFT JOIN layer_rewards lr ON LOWER(m.wallet_address) = LOWER(lr.triggering_member_wallet) AND lr.source_level = 1
WHERE m.current_level >= 1
  AND m.activation_time >= NOW() - INTERVAL '7 days';

-- 检查数据不一致的情况
SELECT
  'Data Inconsistencies for Level 1' as check_name,
  COUNT(*) as members_without_membership
FROM members m
LEFT JOIN membership ms ON LOWER(m.wallet_address) = LOWER(ms.wallet_address) AND ms.nft_level = 1
WHERE m.current_level >= 1
  AND m.activation_time >= NOW() - INTERVAL '7 days'
  AND ms.wallet_address IS NULL;

-- 2. 验证 level-upgrade 流程数据完整性
SELECT '' as separator;
SELECT '=== Level-Upgrade Flow Verification ===' as section;

SELECT
  'Upgrades by Level (Last 7 Days)' as check_name,
  m.current_level,
  COUNT(DISTINCT m.wallet_address) as members_count,
  COUNT(DISTINCT ms.wallet_address) as membership_records,
  COUNT(DISTINCT lr.id) as layer_rewards_created,
  ROUND(COUNT(DISTINCT ms.wallet_address)::NUMERIC / NULLIF(COUNT(DISTINCT m.wallet_address), 0) * 100, 2) as membership_rate
FROM members m
LEFT JOIN membership ms ON LOWER(m.wallet_address) = LOWER(ms.wallet_address) AND ms.nft_level = m.current_level
LEFT JOIN layer_rewards lr ON LOWER(m.wallet_address) = LOWER(lr.triggering_member_wallet) AND lr.source_level = m.current_level
WHERE m.current_level >= 2
  AND m.activation_time >= NOW() - INTERVAL '30 days'
GROUP BY m.current_level
ORDER BY m.current_level;

-- 检查升级后没有 membership 记录的
SELECT
  'Members Missing Membership Records' as check_name,
  m.current_level,
  COUNT(*) as count
FROM members m
LEFT JOIN membership ms ON LOWER(m.wallet_address) = LOWER(ms.wallet_address) AND ms.nft_level = m.current_level
WHERE m.current_level >= 2
  AND ms.wallet_address IS NULL
GROUP BY m.current_level
ORDER BY m.current_level;

-- 3. 验证 claimed_at 字段是否正常工作
SELECT '' as separator;
SELECT '=== Claimed_at Field Verification ===' as section;

SELECT
  'Claimed Rewards Statistics' as check_name,
  COUNT(*) as total_claimed_rewards,
  COUNT(claimed_at) as rewards_with_claimed_at,
  COUNT(CASE WHEN status = 'claimed' AND claimed_at IS NULL THEN 1 END) as missing_claimed_at,
  ROUND(COUNT(claimed_at)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as claimed_at_coverage_pct
FROM layer_rewards
WHERE status = 'claimed';

-- 最近一周的 claimed_at 覆盖率
SELECT
  'Recent Week Claimed_at Coverage' as check_name,
  DATE(created_at) as date,
  COUNT(*) as claims,
  COUNT(claimed_at) as with_claimed_at,
  ROUND(COUNT(claimed_at)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as coverage_pct
FROM layer_rewards
WHERE status = 'claimed'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC;

-- 4. 检查 claim_sync_queue 使用情况
SELECT '' as separator;
SELECT '=== Claim Sync Queue Status ===' as section;

SELECT
  COALESCE(source, 'TOTAL') as source,
  COALESCE(status, 'ALL') as status,
  COUNT(*) as count,
  MAX(created_at) as last_created
FROM claim_sync_queue
GROUP BY ROLLUP(source, status)
ORDER BY source NULLS LAST, status NULLS LAST;

-- 查看队列健康状态
SELECT * FROM v_claim_sync_health;

-- 5. 检查数据库触发器状态
SELECT '' as separator;
SELECT '=== Database Triggers Status ===' as section;

SELECT
  event_object_table as table_name,
  trigger_name,
  event_manipulation as event,
  action_timing as timing
FROM information_schema.triggers
WHERE event_object_table IN ('members', 'membership', 'layer_rewards', 'user_balances')
  AND trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 6. 最新激活/升级记录样本
SELECT '' as separator;
SELECT '=== Recent Activation/Upgrade Samples ===' as section;

SELECT
  'Latest 5 Activations' as sample_type,
  m.wallet_address,
  m.current_level,
  m.activation_time,
  CASE WHEN ms.wallet_address IS NOT NULL THEN '✓' ELSE '✗' END as has_membership,
  CASE WHEN ub.wallet_address IS NOT NULL THEN '✓' ELSE '✗' END as has_balance,
  COUNT(lr.id) as reward_count
FROM members m
LEFT JOIN membership ms ON LOWER(m.wallet_address) = LOWER(ms.wallet_address) AND ms.nft_level = m.current_level
LEFT JOIN user_balances ub ON LOWER(m.wallet_address) = LOWER(ub.wallet_address)
LEFT JOIN layer_rewards lr ON LOWER(m.wallet_address) = LOWER(lr.triggering_member_wallet) AND lr.source_level = m.current_level
WHERE m.activation_time >= NOW() - INTERVAL '7 days'
GROUP BY m.wallet_address, m.current_level, m.activation_time, ms.wallet_address, ub.wallet_address
ORDER BY m.activation_time DESC
LIMIT 5;

-- 显示总结
SELECT '' as separator;
SELECT '=== Verification Summary ===' as section;

SELECT
  'Overall Data Consistency Rate' as metric,
  ROUND(
    (SELECT COUNT(DISTINCT ms.wallet_address)::NUMERIC
     FROM members m
     JOIN membership ms ON LOWER(m.wallet_address) = LOWER(ms.wallet_address) AND ms.nft_level = m.current_level
     WHERE m.activation_time >= NOW() - INTERVAL '7 days')
    /
    NULLIF((SELECT COUNT(*) FROM members WHERE activation_time >= NOW() - INTERVAL '7 days'), 0)
    * 100, 2
  ) as consistency_percentage;

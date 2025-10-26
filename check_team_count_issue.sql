-- ====================================================================
-- 检查团队递归人数数据问题
-- ====================================================================
-- 目的：检查超级根会员的团队人数统计是否正确
-- 问题：0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab 应该有很多下线，但显示很少
-- ====================================================================

-- 1. 检查目标会员的基本信息
SELECT '=== 目标会员基本信息 ===' AS section;
SELECT
  wallet_address,
  current_level,
  activation_sequence,
  created_at
FROM members
WHERE wallet_address = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab';

-- 2. 检查v_referral_statistics视图中的数据
SELECT '=== v_referral_statistics 视图数据 ===' AS section;
SELECT
  member_wallet,
  direct_referral_count,
  max_spillover_layer,
  total_team_count,
  matrix_19_layer_count,
  activation_rate_percentage
FROM v_referral_statistics
WHERE member_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab';

-- 3. 直接统计直推人数（应该与视图一致）
SELECT '=== 直接推荐人数统计 ===' AS section;
SELECT
  referrer_wallet,
  COUNT(*) AS direct_referral_count
FROM members
WHERE referrer_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
GROUP BY referrer_wallet;

-- 4. 统计该会员的matrix_referrals数据（19层内）
SELECT '=== Matrix 19层数据统计 ===' AS section;
SELECT
  matrix_root_wallet,
  COUNT(DISTINCT member_wallet) AS matrix_member_count,
  MAX(layer) AS max_layer,
  COUNT(*) FILTER (WHERE slot = 'L') AS l_count,
  COUNT(*) FILTER (WHERE slot = 'M') AS m_count,
  COUNT(*) FILTER (WHERE slot = 'R') AS r_count
FROM matrix_referrals
WHERE matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
  AND layer >= 1 AND layer <= 19
GROUP BY matrix_root_wallet;

-- 5. 按层级统计matrix数据
SELECT '=== Matrix 按层级统计 ===' AS section;
SELECT
  layer,
  COUNT(*) AS member_count,
  COUNT(*) FILTER (WHERE referral_type = 'direct') AS direct_count,
  COUNT(*) FILTER (WHERE referral_type = 'spillover') AS spillover_count
FROM matrix_referrals
WHERE matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
  AND layer >= 1 AND layer <= 19
GROUP BY layer
ORDER BY layer;

-- 6. 使用递归CTE统计完整团队人数（包括所有层级）
SELECT '=== 完整递归团队人数统计 ===' AS section;
WITH RECURSIVE team_members AS (
  -- 起始点：目标会员
  SELECT
    wallet_address,
    referrer_wallet,
    1 AS depth
  FROM members
  WHERE wallet_address = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'

  UNION ALL

  -- 递归：所有下线
  SELECT
    m.wallet_address,
    m.referrer_wallet,
    tm.depth + 1
  FROM members m
  INNER JOIN team_members tm ON m.referrer_wallet = tm.wallet_address
  WHERE tm.depth < 100  -- 防止无限递归，设置最大深度
)
SELECT
  COUNT(*) - 1 AS total_team_count,  -- 减1因为包含了自己
  MAX(depth) AS max_depth,
  COUNT(*) FILTER (WHERE depth <= 20) AS within_20_levels
FROM team_members;

-- 7. 检查v_referral_statistics视图的定义是否正确
SELECT '=== v_referral_statistics 视图定义检查 ===' AS section;
SELECT pg_get_viewdef('v_referral_statistics', true);

-- 8. 抽样检查：统计前10个最大团队的数据
SELECT '=== 前10个最大团队统计 ===' AS section;
SELECT
  member_wallet,
  direct_referral_count,
  total_team_count,
  matrix_19_layer_count,
  activation_rate_percentage
FROM v_referral_statistics
WHERE total_team_count > 0
ORDER BY total_team_count DESC
LIMIT 10;

-- 9. 检查总会员数
SELECT '=== 系统总会员数统计 ===' AS section;
SELECT
  COUNT(*) AS total_members,
  COUNT(*) FILTER (WHERE referrer_wallet IS NOT NULL) AS members_with_referrer,
  COUNT(*) FILTER (WHERE referrer_wallet IS NULL) AS root_members
FROM members;

-- 10. 检查matrix_referrals总记录数
SELECT '=== Matrix总记录数统计 ===' AS section;
SELECT
  COUNT(*) AS total_matrix_records,
  COUNT(DISTINCT matrix_root_wallet) AS total_matrix_roots,
  COUNT(DISTINCT member_wallet) AS total_unique_members_in_matrix
FROM matrix_referrals
WHERE layer >= 1 AND layer <= 19;

-- 11. 检查是否有referrer链断裂的情况
SELECT '=== Referrer链完整性检查 ===' AS section;
SELECT
  COUNT(*) AS broken_referrer_links
FROM members m
WHERE m.referrer_wallet IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM members m2
    WHERE m2.wallet_address = m.referrer_wallet
  );

-- 12. 对比members表的推荐关系和matrix_referrals的数据
SELECT '=== Members vs Matrix_referrals 数据对比 ===' AS section;
SELECT
  'members表推荐人数' AS source,
  COUNT(*) AS count
FROM members
WHERE referrer_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'

UNION ALL

SELECT
  'matrix_referrals中Layer 1人数' AS source,
  COUNT(*) AS count
FROM matrix_referrals
WHERE matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
  AND layer = 1;

-- 13. 检查该会员作为referrer的所有下线是否都在matrix中
SELECT '=== 检查下线是否都被正确放入matrix ===' AS section;
SELECT
  m.wallet_address,
  m.activation_sequence,
  mr.layer,
  mr.slot,
  CASE
    WHEN mr.member_wallet IS NULL THEN 'NOT IN MATRIX'
    ELSE 'IN MATRIX'
  END AS matrix_status
FROM members m
LEFT JOIN matrix_referrals mr
  ON mr.member_wallet = m.wallet_address
  AND mr.matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
WHERE m.referrer_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
ORDER BY m.activation_sequence
LIMIT 20;

-- 14. 诊断建议
SELECT '=== 诊断建议 ===' AS section;
SELECT
  CASE
    WHEN (SELECT COUNT(*) FROM members WHERE referrer_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab') = 0
      THEN '✗ 问题：该会员没有直推下线'
    WHEN (SELECT COUNT(*) FROM matrix_referrals WHERE matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab' AND layer = 1) = 0
      THEN '✗ 问题：该会员的matrix记录为空'
    WHEN (SELECT COUNT(*) FROM members WHERE referrer_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab') >
         (SELECT COUNT(*) FROM matrix_referrals WHERE matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab' AND layer = 1)
      THEN '✗ 问题：部分直推下线未被放入matrix'
    ELSE '✓ 数据看起来正常'
  END AS diagnosis;

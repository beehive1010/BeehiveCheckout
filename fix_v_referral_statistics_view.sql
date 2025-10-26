-- ====================================================================
-- 修复 v_referral_statistics 视图
-- ====================================================================
-- 问题：total_team_count 只统计了 matrix_referrals 的19层数据
-- 解决：使用递归CTE统计 members 表中的所有递归下线
-- ====================================================================

BEGIN;

SELECT '=== 备份旧视图定义 ===' AS step;
-- 备份旧定义（如果需要回滚）
CREATE TABLE IF NOT EXISTS view_backups (
  view_name TEXT,
  view_definition TEXT,
  backed_up_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO view_backups (view_name, view_definition)
SELECT 'v_referral_statistics', pg_get_viewdef('v_referral_statistics', true);

SELECT '=== 删除旧视图 ===' AS step;
DROP VIEW IF EXISTS v_referral_statistics CASCADE;

SELECT '=== 创建新的正确视图 ===' AS step;
CREATE OR REPLACE VIEW v_referral_statistics AS
WITH
  -- 1. 直推人数统计
  direct_referrals AS (
    SELECT
      referrer_wallet,
      COUNT(*) AS direct_count
    FROM members
    WHERE referrer_wallet IS NOT NULL
    GROUP BY referrer_wallet
  ),
  -- 2. Matrix 19层数据统计
  matrix_stats AS (
    SELECT
      matrix_root_wallet,
      COUNT(DISTINCT member_wallet) AS matrix_member_count,
      MAX(layer) AS max_spillover_layer
    FROM matrix_referrals
    WHERE layer >= 1 AND layer <= 19
    GROUP BY matrix_root_wallet
  ),
  -- 3. 完整递归团队人数统计（使用 members 表）
  recursive_team AS (
    WITH RECURSIVE team_tree AS (
      -- 起点：所有会员
      SELECT
        wallet_address AS root_wallet,
        wallet_address,
        1 AS depth
      FROM members

      UNION ALL

      -- 递归：查找所有下线
      SELECT
        tt.root_wallet,
        m.wallet_address,
        tt.depth + 1
      FROM members m
      INNER JOIN team_tree tt ON m.referrer_wallet = tt.wallet_address
      WHERE tt.depth < 100  -- 防止无限递归
    )
    SELECT
      root_wallet,
      COUNT(*) - 1 AS total_team_count  -- 减1因为包含了自己
    FROM team_tree
    GROUP BY root_wallet
  ),
  -- 4. 激活会员统计（19层矩阵内）
  activated_members AS (
    SELECT
      matrix_root_wallet,
      COUNT(DISTINCT member_wallet) AS activated_count
    FROM matrix_referrals
    WHERE layer >= 1 AND layer <= 19
    GROUP BY matrix_root_wallet
  )
-- 最终组合
SELECT
  m.wallet_address AS member_wallet,
  COALESCE(dr.direct_count, 0) AS direct_referral_count,
  COALESCE(ms.max_spillover_layer, 0) AS max_spillover_layer,
  COALESCE(rt.total_team_count, 0) AS total_team_count,  -- 使用递归统计的完整团队人数
  COALESCE(ms.matrix_member_count, 0) AS matrix_19_layer_count,
  CASE
    WHEN COALESCE(rt.total_team_count, 0) = 0 THEN 0
    ELSE ROUND(
      (COALESCE(am.activated_count, 0)::NUMERIC / NULLIF(rt.total_team_count, 0)) * 100,
      2
    )
  END AS activation_rate_percentage
FROM members m
LEFT JOIN direct_referrals dr ON dr.referrer_wallet = m.wallet_address
LEFT JOIN matrix_stats ms ON ms.matrix_root_wallet = m.wallet_address
LEFT JOIN recursive_team rt ON rt.root_wallet = m.wallet_address
LEFT JOIN activated_members am ON am.matrix_root_wallet = m.wallet_address;

SELECT '=== 创建索引以提升性能 ===' AS step;
-- 由于视图使用了递归CTE，建议在members表上创建索引
CREATE INDEX IF NOT EXISTS idx_members_referrer_wallet
  ON members(referrer_wallet)
  WHERE referrer_wallet IS NOT NULL;

SELECT '=== 测试新视图 ===' AS step;
-- 测试目标会员的数据
SELECT
  member_wallet,
  direct_referral_count,
  max_spillover_layer,
  total_team_count,
  matrix_19_layer_count,
  activation_rate_percentage
FROM v_referral_statistics
WHERE member_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab';

SELECT '=== 对比修复前后的数据 ===' AS step;
SELECT
  '修复后数据' AS source,
  COUNT(*) AS total_rows,
  SUM(total_team_count) AS sum_team_count,
  AVG(total_team_count) AS avg_team_count,
  MAX(total_team_count) AS max_team_count
FROM v_referral_statistics
WHERE total_team_count > 0;

COMMIT;

SELECT '=== 修复完成 ✓ ===' AS status;
SELECT '注意：递归CTE可能会影响查询性能，建议监控视图查询速度' AS note;

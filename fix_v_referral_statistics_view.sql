-- 修复 v_referral_statistics 视图
-- 使用新的 v_matrix_tree_19_layers 视图来计算 matrix_19_layer_count

BEGIN;

DROP VIEW IF EXISTS v_referral_statistics CASCADE;

CREATE OR REPLACE VIEW v_referral_statistics AS
WITH
-- 直推人数统计
direct_referrals AS (
  SELECT
    referrer_wallet,
    COUNT(*) as direct_count
  FROM members
  WHERE referrer_wallet IS NOT NULL
  GROUP BY referrer_wallet
),
-- ✅ 使用 v_matrix_tree_19_layers 视图计算 19 层矩阵统计
matrix_stats_from_view AS (
  SELECT
    matrix_root_wallet,
    COUNT(DISTINCT member_wallet) as matrix_member_count,
    MAX(layer) as max_layer
  FROM v_matrix_tree_19_layers
  WHERE layer >= 1 AND layer <= 19
  GROUP BY matrix_root_wallet
),
-- 全局层级统计（从 members 表）
global_layer_stats AS (
  SELECT
    wallet_address,
    layer_level as max_spillover_layer
  FROM members
  WHERE layer_level IS NOT NULL
),
-- 递归团队统计（所有推荐层级，无 19 层限制）
recursive_team AS (
  WITH RECURSIVE team_tree AS (
    -- Base case: 每个会员作为自己的 root
    SELECT
      wallet_address as root_wallet,
      wallet_address,
      1 as depth
    FROM members

    UNION ALL

    -- Recursive: 找到所有通过 referrer_wallet 连接的下线
    SELECT
      tt.root_wallet,
      m.wallet_address,
      tt.depth + 1
    FROM members m
    JOIN team_tree tt ON m.referrer_wallet = tt.wallet_address
    WHERE tt.depth < 100  -- 防止无限递归
  )
  SELECT
    root_wallet,
    COUNT(*) - 1 as total_team_count  -- 减去自己
  FROM team_tree
  GROUP BY root_wallet
),
-- 激活成员统计（在 19 层矩阵内）
activated_members AS (
  SELECT
    matrix_root_wallet,
    COUNT(DISTINCT member_wallet) as activated_count
  FROM v_matrix_tree_19_layers
  WHERE layer >= 1 AND layer <= 19
  GROUP BY matrix_root_wallet
)
SELECT
  m.wallet_address as member_wallet,
  COALESCE(dr.direct_count, 0) as direct_referral_count,
  COALESCE(gls.max_spillover_layer, 0) as max_spillover_layer,
  COALESCE(rt.total_team_count, 0) as total_team_count,
  COALESCE(ms.matrix_member_count, 0) as matrix_19_layer_count,  -- ✅ 现在使用 v_matrix_tree_19_layers
  CASE
    WHEN COALESCE(rt.total_team_count, 0) = 0 THEN 0
    ELSE ROUND(
      COALESCE(am.activated_count, 0)::NUMERIC /
      NULLIF(rt.total_team_count, 0)::NUMERIC * 100,
      2
    )
  END as activation_rate_percentage
FROM members m
LEFT JOIN direct_referrals dr ON dr.referrer_wallet = m.wallet_address
LEFT JOIN matrix_stats_from_view ms ON ms.matrix_root_wallet = m.wallet_address  -- ✅ 使用新的 CTE
LEFT JOIN global_layer_stats gls ON gls.wallet_address = m.wallet_address
LEFT JOIN recursive_team rt ON rt.root_wallet = m.wallet_address
LEFT JOIN activated_members am ON am.matrix_root_wallet = m.wallet_address;

-- 验证修复
SELECT '=== View Recreated Successfully ===' as status;

-- 测试查询：系统 root 的统计
SELECT
  direct_referral_count,
  total_team_count,
  matrix_19_layer_count,
  max_spillover_layer
FROM v_referral_statistics
WHERE LOWER(member_wallet) = LOWER('0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab');

COMMIT;

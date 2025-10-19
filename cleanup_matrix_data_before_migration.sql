-- ============================================================================
-- 数据清理脚本 - 在应用 Branch-First BFS 迁移之前执行
-- ============================================================================

-- 1. 备份当前数据到临时表
DROP TABLE IF EXISTS matrix_referrals_backup_20251019;
CREATE TABLE matrix_referrals_backup_20251019 AS
SELECT * FROM matrix_referrals;

-- 2. 执行数据清理
DO $$
DECLARE
  backup_count INTEGER;
  deleted_over_19 INTEGER;
  updated_layer_0 INTEGER;
  deleted_duplicates INTEGER;
  total_records INTEGER;
  layer_0_count INTEGER;
  layer_over_19_count INTEGER;
  duplicate_count INTEGER;
BEGIN
  -- 统计备份记录数
  SELECT COUNT(*) INTO backup_count FROM matrix_referrals_backup_20251019;
  RAISE NOTICE '✅ 已备份 % 条记录到 matrix_referrals_backup_20251019', backup_count;

  -- 删除超过19层的记录（Layer 20-27）
  SELECT COUNT(*) INTO deleted_over_19 FROM matrix_referrals WHERE layer > 19;
  DELETE FROM matrix_referrals WHERE layer > 19;
  RAISE NOTICE '🗑️  已删除 % 条超过19层的记录', deleted_over_19;

  -- 处理 Layer 0 的记录 - 将其移到 Layer 1
  SELECT COUNT(*) INTO updated_layer_0 FROM matrix_referrals WHERE layer = 0;
  UPDATE matrix_referrals SET layer = 1 WHERE layer = 0;
  RAISE NOTICE '🔧 已将 % 条 Layer 0 记录移到 Layer 1', updated_layer_0;

  -- 删除重复的 placement 记录（保留最早创建的）
  WITH duplicates AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY member_wallet, matrix_root_wallet
        ORDER BY created_at ASC, id ASC
      ) as rn
    FROM matrix_referrals
  ),
  to_delete AS (
    DELETE FROM matrix_referrals
    WHERE id IN (SELECT id FROM duplicates WHERE rn > 1)
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_duplicates FROM to_delete;
  RAISE NOTICE '🗑️  已删除 % 条重复的 placement 记录', deleted_duplicates;

  -- 验证清理后的数据
  SELECT COUNT(*) INTO total_records FROM matrix_referrals;
  SELECT COUNT(*) INTO layer_0_count FROM matrix_referrals WHERE layer = 0;
  SELECT COUNT(*) INTO layer_over_19_count FROM matrix_referrals WHERE layer > 19;

  WITH dups AS (
    SELECT member_wallet, matrix_root_wallet, COUNT(*) as cnt
    FROM matrix_referrals
    GROUP BY member_wallet, matrix_root_wallet
    HAVING COUNT(*) > 1
  )
  SELECT COUNT(*) INTO duplicate_count FROM dups;

  RAISE NOTICE '===============================================';
  RAISE NOTICE '数据清理完成统计：';
  RAISE NOTICE '  总记录数: %', total_records;
  RAISE NOTICE '  Layer 0 记录: %', layer_0_count;
  RAISE NOTICE '  Layer > 19 记录: %', layer_over_19_count;
  RAISE NOTICE '  重复记录: %', duplicate_count;
  RAISE NOTICE '===============================================';

  IF layer_0_count = 0 AND layer_over_19_count = 0 AND duplicate_count = 0 THEN
    RAISE NOTICE '✅ 数据清理成功！可以安全应用迁移。';
  ELSE
    RAISE EXCEPTION '❌ 数据清理未完成，请检查上述统计。';
  END IF;
END $$;

-- 提示：如果需要回滚，使用以下命令
-- DROP TABLE matrix_referrals;
-- ALTER TABLE matrix_referrals_backup_20251019 RENAME TO matrix_referrals;

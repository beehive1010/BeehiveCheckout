-- ============================================================================
-- 修复 position 到 slot 的数据迁移
-- 处理 ROOT 等特殊值
-- ============================================================================

-- 将 position 复制到 slot，ROOT 转为 NULL
UPDATE matrix_referrals
SET slot = CASE
  WHEN position = 'ROOT' THEN NULL
  WHEN position IN ('L', 'M', 'R') THEN position
  ELSE NULL
END
WHERE slot IS NULL;

-- 验证结果
SELECT
  'slot_distribution' as report,
  slot,
  COUNT(*) as count
FROM matrix_referrals
GROUP BY slot
ORDER BY slot;

SELECT
  'position_distribution' as report,
  position,
  COUNT(*) as count
FROM matrix_referrals
GROUP BY position
ORDER BY position;

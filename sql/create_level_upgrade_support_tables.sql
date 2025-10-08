-- =====================================================
-- Level-Upgrade 辅助表 - 支持保证同步机制
-- =====================================================

-- 1. 奖励重试队列
CREATE TABLE IF NOT EXISTS reward_retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本信息
  wallet_address VARCHAR(42) NOT NULL,
  level INTEGER NOT NULL,
  tx_hash VARCHAR(66),

  -- 错误信息
  error_message TEXT,
  last_error_at TIMESTAMP,

  -- 重试控制
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  status VARCHAR(20) DEFAULT 'pending',

  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  last_retry_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- 约束
  CONSTRAINT valid_retry_status CHECK (status IN ('pending', 'retrying', 'completed', 'failed'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_reward_retry_status
ON reward_retry_queue(status)
WHERE status IN ('pending', 'retrying');

CREATE INDEX IF NOT EXISTS idx_reward_retry_wallet
ON reward_retry_queue(wallet_address);

CREATE INDEX IF NOT EXISTS idx_reward_retry_created
ON reward_retry_queue(created_at DESC);

COMMENT ON TABLE reward_retry_queue IS '奖励重试队列 - 记录升级时奖励创建失败的情况,支持自动重试';

-- 2. 人工审核队列
CREATE TABLE IF NOT EXISTS manual_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本信息
  wallet_address VARCHAR(42) NOT NULL,
  issue_type VARCHAR(50) NOT NULL,

  -- 问题详情
  details JSONB,

  -- 状态管理
  status VARCHAR(20) DEFAULT 'pending',
  priority VARCHAR(10) DEFAULT 'normal',
  assigned_to VARCHAR(100),

  -- 解决信息
  resolution_notes TEXT,

  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  assigned_at TIMESTAMP,
  resolved_at TIMESTAMP,

  -- 约束
  CONSTRAINT valid_review_status CHECK (status IN ('pending', 'assigned', 'in_progress', 'resolved', 'cancelled')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'critical'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_manual_review_status
ON manual_review_queue(status)
WHERE status IN ('pending', 'assigned', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_manual_review_wallet
ON manual_review_queue(wallet_address);

CREATE INDEX IF NOT EXISTS idx_manual_review_priority
ON manual_review_queue(priority DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_manual_review_type
ON manual_review_queue(issue_type);

COMMENT ON TABLE manual_review_queue IS '人工审核队列 - 记录需要人工介入的升级问题,如部分升级失败';

-- 3. 视图: 待重试的奖励
CREATE OR REPLACE VIEW v_pending_reward_retries AS
SELECT
  rr.*,
  u.username,
  m.current_level,
  CASE
    WHEN rr.retry_count >= rr.max_retries THEN 'Max retries reached'
    WHEN rr.status = 'pending' THEN 'Ready to retry'
    WHEN rr.status = 'retrying' THEN 'Retrying now'
    ELSE rr.status
  END as retry_status_desc
FROM reward_retry_queue rr
LEFT JOIN users u ON LOWER(rr.wallet_address) = LOWER(u.wallet_address)
LEFT JOIN members m ON LOWER(rr.wallet_address) = LOWER(m.wallet_address)
WHERE rr.status IN ('pending', 'retrying')
  AND rr.retry_count < rr.max_retries
ORDER BY rr.created_at ASC;

-- 4. 视图: 待审核的问题
CREATE OR REPLACE VIEW v_pending_manual_reviews AS
SELECT
  mr.*,
  u.username,
  m.current_level,
  CASE
    WHEN mr.priority = 'critical' THEN '🔴 Critical'
    WHEN mr.priority = 'high' THEN '🟠 High'
    WHEN mr.priority = 'normal' THEN '🟡 Normal'
    ELSE '🟢 Low'
  END as priority_display,
  CASE
    WHEN mr.created_at < NOW() - INTERVAL '1 day' THEN '⚠️ Overdue (>24h)'
    WHEN mr.created_at < NOW() - INTERVAL '4 hours' THEN '⏰ Urgent (>4h)'
    ELSE '✓ Recent'
  END as urgency
FROM manual_review_queue mr
LEFT JOIN users u ON LOWER(mr.wallet_address) = LOWER(u.wallet_address)
LEFT JOIN members m ON LOWER(mr.wallet_address) = LOWER(m.wallet_address)
WHERE mr.status IN ('pending', 'assigned', 'in_progress')
ORDER BY
  CASE mr.priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'normal' THEN 3
    ELSE 4
  END,
  mr.created_at ASC;

-- 5. 函数: 自动重试奖励
CREATE OR REPLACE FUNCTION retry_failed_rewards()
RETURNS TABLE(
  processed INTEGER,
  successful INTEGER,
  failed INTEGER
) AS $$
DECLARE
  v_processed INTEGER := 0;
  v_successful INTEGER := 0;
  v_failed INTEGER := 0;
  v_record RECORD;
BEGIN
  -- 获取待重试的记录
  FOR v_record IN
    SELECT *
    FROM reward_retry_queue
    WHERE status = 'pending'
      AND retry_count < max_retries
    ORDER BY created_at ASC
    LIMIT 10
  LOOP
    v_processed := v_processed + 1;

    -- 更新状态为 retrying
    UPDATE reward_retry_queue
    SET status = 'retrying',
        last_retry_at = NOW()
    WHERE id = v_record.id;

    BEGIN
      -- 调用奖励触发函数
      IF v_record.level = 1 THEN
        PERFORM trigger_direct_referral_rewards(
          v_record.wallet_address::VARCHAR,
          v_record.level::INTEGER,
          100::NUMERIC
        );
      ELSE
        PERFORM trigger_layer_rewards_on_upgrade(
          v_record.wallet_address::VARCHAR,
          v_record.level::INTEGER,
          (100 + (v_record.level - 1) * 50)::NUMERIC
        );
      END IF;

      -- 成功,更新状态
      UPDATE reward_retry_queue
      SET status = 'completed',
          completed_at = NOW()
      WHERE id = v_record.id;

      v_successful := v_successful + 1;

    EXCEPTION WHEN OTHERS THEN
      -- 失败,增加重试次数
      UPDATE reward_retry_queue
      SET status = CASE
            WHEN retry_count + 1 >= max_retries THEN 'failed'
            ELSE 'pending'
          END,
          retry_count = retry_count + 1,
          error_message = SQLERRM,
          last_error_at = NOW()
      WHERE id = v_record.id;

      v_failed := v_failed + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT v_processed, v_successful, v_failed;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION retry_failed_rewards IS '自动重试失败的奖励创建';

-- 6. 统计视图
CREATE OR REPLACE VIEW v_level_upgrade_health AS
SELECT
  -- Reward retry queue stats
  (SELECT COUNT(*) FROM reward_retry_queue WHERE status = 'pending') as pending_reward_retries,
  (SELECT COUNT(*) FROM reward_retry_queue WHERE status = 'failed') as failed_reward_retries,
  (SELECT COUNT(*) FROM reward_retry_queue WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '24 hours') as rewards_retried_24h,

  -- Manual review queue stats
  (SELECT COUNT(*) FROM manual_review_queue WHERE status = 'pending') as pending_reviews,
  (SELECT COUNT(*) FROM manual_review_queue WHERE status = 'pending' AND priority = 'critical') as critical_reviews,
  (SELECT COUNT(*) FROM manual_review_queue WHERE status = 'pending' AND created_at < NOW() - INTERVAL '24 hours') as overdue_reviews,

  -- Claim sync queue stats (level_upgrade only)
  (SELECT COUNT(*) FROM claim_sync_queue WHERE source = 'level_upgrade' AND status = 'pending') as pending_level_upgrades,
  (SELECT COUNT(*) FROM claim_sync_queue WHERE source = 'level_upgrade' AND status = 'failed') as failed_level_upgrades;

-- RLS 策略
ALTER TABLE reward_retry_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_review_queue ENABLE ROW LEVEL SECURITY;

-- Service role 完全访问
CREATE POLICY "Service role full access to reward_retry_queue"
ON reward_retry_queue TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to manual_review_queue"
ON manual_review_queue TO service_role
USING (true) WITH CHECK (true);

-- 用户只读自己的记录
CREATE POLICY "Users can read own reward retries"
ON reward_retry_queue FOR SELECT
USING (LOWER(wallet_address) = LOWER(current_setting('request.jwt.claims', true)::json->>'wallet_address'));

CREATE POLICY "Users can read own manual reviews"
ON manual_review_queue FOR SELECT
USING (LOWER(wallet_address) = LOWER(current_setting('request.jwt.claims', true)::json->>'wallet_address'));

-- 显示创建结果
SELECT '=== Level-Upgrade Support Tables Created ===' as status;

SELECT
  'Table' as object_type,
  'reward_retry_queue' as name,
  'Created' as status
UNION ALL
SELECT 'Table', 'manual_review_queue', 'Created'
UNION ALL
SELECT 'View', 'v_pending_reward_retries', 'Created'
UNION ALL
SELECT 'View', 'v_pending_manual_reviews', 'Created'
UNION ALL
SELECT 'View', 'v_level_upgrade_health', 'Created'
UNION ALL
SELECT 'Function', 'retry_failed_rewards()', 'Created';

-- 显示健康状态
SELECT * FROM v_level_upgrade_health;

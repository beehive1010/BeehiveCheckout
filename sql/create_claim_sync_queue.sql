-- =====================================================
-- Claim 同步队列表 - 保证链上 claim 100% 同步到数据库
-- =====================================================

CREATE TABLE IF NOT EXISTS claim_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Claim 信息
  wallet_address VARCHAR(42) NOT NULL,
  level INTEGER NOT NULL,
  tx_hash VARCHAR(66) NOT NULL UNIQUE,

  -- 状态追踪
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,

  -- 错误信息
  error_message TEXT,
  last_error_at TIMESTAMP,

  -- 来源追踪
  source VARCHAR(50),

  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,

  -- 元数据
  metadata JSONB DEFAULT '{}'::jsonb,

  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_claim_sync_queue_status ON claim_sync_queue(status)
WHERE status IN ('pending', 'retrying', 'failed');

CREATE INDEX IF NOT EXISTS idx_claim_sync_queue_wallet ON claim_sync_queue(wallet_address);
CREATE INDEX IF NOT EXISTS idx_claim_sync_queue_created_at ON claim_sync_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claim_sync_queue_tx_hash ON claim_sync_queue(tx_hash);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_claim_sync_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_claim_sync_queue_timestamp ON claim_sync_queue;

CREATE TRIGGER trigger_update_claim_sync_queue_timestamp
BEFORE UPDATE ON claim_sync_queue
FOR EACH ROW
EXECUTE FUNCTION update_claim_sync_queue_timestamp();

-- RLS 策略
ALTER TABLE claim_sync_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service role full access to claim_sync_queue" ON claim_sync_queue;
DROP POLICY IF EXISTS "Users can read own claim sync records" ON claim_sync_queue;

CREATE POLICY "Allow service role full access to claim_sync_queue"
ON claim_sync_queue
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can read own claim sync records"
ON claim_sync_queue
FOR SELECT
USING (LOWER(wallet_address) = LOWER(current_setting('request.jwt.claims', true)::json->>'wallet_address'));

-- 监控视图
CREATE OR REPLACE VIEW v_claim_sync_health AS
SELECT
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'retrying') as retrying_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) FILTER (
    WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '30 minutes'
  ) as stuck_pending_count,
  AVG(
    CASE WHEN status = 'completed'
    THEN EXTRACT(EPOCH FROM (completed_at - created_at))
    END
  ) as avg_completion_time_seconds,
  MAX(created_at) as last_claim_at,
  MIN(created_at) FILTER (WHERE status IN ('pending', 'retrying')) as oldest_pending_at
FROM claim_sync_queue
WHERE created_at > NOW() - INTERVAL '24 hours';

-- 待处理视图
CREATE OR REPLACE VIEW v_pending_claim_syncs AS
SELECT
  csq.*,
  u.username,
  CASE WHEN m.wallet_address IS NOT NULL THEN true ELSE false END as has_member_record,
  CASE WHEN ms.wallet_address IS NOT NULL THEN true ELSE false END as has_membership_record
FROM claim_sync_queue csq
LEFT JOIN users u ON LOWER(csq.wallet_address) = LOWER(u.wallet_address)
LEFT JOIN members m ON LOWER(csq.wallet_address) = LOWER(m.wallet_address)
LEFT JOIN membership ms ON LOWER(csq.wallet_address) = LOWER(ms.wallet_address)
  AND ms.nft_level = csq.level
WHERE csq.status IN ('pending', 'retrying', 'failed')
ORDER BY csq.created_at ASC;

-- 失败视图
CREATE OR REPLACE VIEW v_failed_claims AS
SELECT
  csq.*,
  u.username,
  m.current_level as db_level,
  ms.nft_level as db_nft_level
FROM claim_sync_queue csq
LEFT JOIN users u ON LOWER(csq.wallet_address) = LOWER(u.wallet_address)
LEFT JOIN members m ON LOWER(csq.wallet_address) = LOWER(m.wallet_address)
LEFT JOIN membership ms ON LOWER(csq.wallet_address) = LOWER(ms.wallet_address)
WHERE csq.status = 'failed'
ORDER BY csq.created_at DESC;

-- 告警函数
CREATE OR REPLACE FUNCTION alert_claim_sync_issues()
RETURNS void AS $$
DECLARE
  v_failed_count INTEGER;
  v_stuck_count INTEGER;
BEGIN
  SELECT failed_count, stuck_pending_count
  INTO v_failed_count, v_stuck_count
  FROM v_claim_sync_health;

  IF v_failed_count > 0 THEN
    RAISE NOTICE '🚨 ALERT: % failed claim syncs detected', v_failed_count;
  END IF;

  IF v_stuck_count > 0 THEN
    RAISE NOTICE '⚠️ WARNING: % claims stuck in pending for >30 minutes', v_stuck_count;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE claim_sync_queue IS 'NFT claim 同步队列 - 确保链上 claim 100% 同步到数据库';

-- 显示创建结果
SELECT
  '=== Claim Sync Queue Created ===' as status;

SELECT
  'Table' as object_type,
  'claim_sync_queue' as name,
  'Created' as status
UNION ALL
SELECT 'Index', 'idx_claim_sync_queue_status', 'Created'
UNION ALL
SELECT 'Index', 'idx_claim_sync_queue_wallet', 'Created'
UNION ALL
SELECT 'Index', 'idx_claim_sync_queue_tx_hash', 'Created'
UNION ALL
SELECT 'View', 'v_claim_sync_health', 'Created'
UNION ALL
SELECT 'View', 'v_pending_claim_syncs', 'Created'
UNION ALL
SELECT 'View', 'v_failed_claims', 'Created'
UNION ALL
SELECT 'Function', 'alert_claim_sync_issues()', 'Created';

SELECT * FROM v_claim_sync_health;

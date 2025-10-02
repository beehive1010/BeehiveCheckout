-- 创建ThirdWeb Webhook处理系统
-- 用于跟踪和处理来自ThirdWeb Dashboard的链上事件

-- 1. 创建webhook处理日志表
CREATE TABLE IF NOT EXISTS webhook_processing_log (
    id SERIAL PRIMARY KEY,
    transaction_hash VARCHAR(66) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'nft_mint', 'transfer', etc.
    recipient_wallet VARCHAR(42) NOT NULL,
    nft_level INTEGER,
    amount INTEGER DEFAULT 1,
    block_number BIGINT,
    event_timestamp TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'skipped'
    error_message TEXT,
    activation_result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 防止重复处理相同交易
    UNIQUE(transaction_hash, event_type)
);

-- 2. 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_webhook_log_tx_hash ON webhook_processing_log(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_webhook_log_recipient ON webhook_processing_log(recipient_wallet);
CREATE INDEX IF NOT EXISTS idx_webhook_log_status ON webhook_processing_log(status);
CREATE INDEX IF NOT EXISTS idx_webhook_log_timestamp ON webhook_processing_log(event_timestamp);

-- 3. 创建webhook统计视图
CREATE OR REPLACE VIEW webhook_stats AS
SELECT 
    COUNT(*) as total_events,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_activations,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_activations,
    COUNT(CASE WHEN status = 'skipped' THEN 1 END) as skipped_events,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_events,
    ROUND(
        COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 
        2
    ) as success_rate,
    MAX(processed_at) as last_processed,
    MIN(processed_at) as first_processed
FROM webhook_processing_log;

-- 4. 创建最近webhook事件视图
CREATE OR REPLACE VIEW recent_webhook_events AS
SELECT 
    wpl.transaction_hash,
    wpl.event_type,
    wpl.recipient_wallet,
    COALESCE(u.username, 'User_' || RIGHT(wpl.recipient_wallet, 4)) as recipient_name,
    wpl.nft_level,
    wpl.status,
    wpl.event_timestamp,
    wpl.processed_at,
    wpl.error_message,
    -- 检查是否成功激活
    CASE 
        WHEN m.wallet_address IS NOT NULL THEN true 
        ELSE false 
    END as membership_activated
FROM webhook_processing_log wpl
LEFT JOIN users u ON wpl.recipient_wallet = u.wallet_address
LEFT JOIN members m ON wpl.recipient_wallet = m.wallet_address
ORDER BY wpl.processed_at DESC
LIMIT 100;

-- 5. 创建webhook处理函数
CREATE OR REPLACE FUNCTION get_webhook_dashboard_stats()
RETURNS TABLE(
    stat_name TEXT,
    stat_value TEXT,
    stat_description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Total Events'::TEXT,
        total_events::TEXT,
        'Total webhook events processed'::TEXT
    FROM webhook_stats
    UNION ALL
    SELECT 
        'Success Rate'::TEXT,
        success_rate::TEXT || '%',
        'Percentage of successful activations'::TEXT
    FROM webhook_stats
    UNION ALL
    SELECT 
        'Failed Events'::TEXT,
        failed_activations::TEXT,
        'Events that failed to process'::TEXT
    FROM webhook_stats
    UNION ALL
    SELECT 
        'Last Activity'::TEXT,
        COALESCE(
            last_processed::TEXT,
            'No events yet'
        ),
        'Timestamp of last processed event'::TEXT
    FROM webhook_stats;
END;
$$ LANGUAGE plpgsql;

-- 6. 授权Edge Function访问
GRANT ALL ON webhook_processing_log TO authenticated, anon;
GRANT ALL ON SEQUENCE webhook_processing_log_id_seq TO authenticated, anon;
GRANT SELECT ON webhook_stats TO authenticated, anon;
GRANT SELECT ON recent_webhook_events TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_webhook_dashboard_stats TO authenticated, anon;

-- 7. 启用RLS (Row Level Security)
ALTER TABLE webhook_processing_log ENABLE ROW LEVEL SECURITY;

-- 允许服务角色完全访问
CREATE POLICY "Service role can manage webhook logs" ON webhook_processing_log
    FOR ALL USING (auth.role() = 'service_role');

-- 允许认证用户查看自己的webhook事件
CREATE POLICY "Users can view own webhook events" ON webhook_processing_log
    FOR SELECT USING (recipient_wallet = auth.jwt() ->> 'wallet_address');

-- 8. 清理旧记录的函数 (可选 - 用于定期清理)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM webhook_processing_log 
    WHERE processed_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION cleanup_old_webhook_logs TO authenticated, service_role;

-- 输出创建完成信息
SELECT 
    'Webhook System Created Successfully' as status,
    'Tables: webhook_processing_log' as tables_created,
    'Views: webhook_stats, recent_webhook_events' as views_created,
    'Functions: get_webhook_dashboard_stats, cleanup_old_webhook_logs' as functions_created;
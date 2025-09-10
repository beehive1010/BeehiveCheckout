-- 修复reward_records表数据同步问题
-- 确保layer_rewards创建时同时填充reward_records

\echo '🔧 Fixing reward_records table data synchronization...'

-- 首先检查reward_records表是否存在
DO $$
BEGIN
    -- 尝试查询reward_records表
    PERFORM 1 FROM reward_records LIMIT 1;
    RAISE NOTICE '✅ reward_records table exists';
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE '❌ reward_records table does not exist, will create it';
        
        -- 创建reward_records表
        CREATE TABLE IF NOT EXISTS reward_records (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            wallet_address VARCHAR(42) NOT NULL,
            source_wallet VARCHAR(42), -- 触发奖励的钱包
            record_type VARCHAR(50) NOT NULL, -- 'layer_reward', 'bonus', 'commission', etc.
            amount DECIMAL(18,6) NOT NULL DEFAULT 0,
            currency VARCHAR(10) NOT NULL DEFAULT 'USDT',
            layer INTEGER,
            position VARCHAR(10), -- L, M, R
            status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'earned', 'claimed'
            is_claimed BOOLEAN DEFAULT FALSE,
            transaction_hash VARCHAR(66),
            details JSONB DEFAULT '{}',
            recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            claimed_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- 创建索引
        CREATE INDEX IF NOT EXISTS idx_reward_records_wallet ON reward_records(wallet_address);
        CREATE INDEX IF NOT EXISTS idx_reward_records_source ON reward_records(source_wallet);
        CREATE INDEX IF NOT EXISTS idx_reward_records_type ON reward_records(record_type);
        CREATE INDEX IF NOT EXISTS idx_reward_records_status ON reward_records(status);
        CREATE INDEX IF NOT EXISTS idx_reward_records_date ON reward_records(recorded_at);
        
        RAISE NOTICE '✅ Created reward_records table with indexes';
END
$$;

-- 创建trigger函数，在layer_rewards插入时自动创建reward_records
CREATE OR REPLACE FUNCTION sync_layer_rewards_to_reward_records()
RETURNS TRIGGER AS $$
BEGIN
    -- 当layer_rewards表有新记录时，自动在reward_records中创建对应记录
    INSERT INTO reward_records (
        wallet_address,
        source_wallet,
        record_type,
        amount,
        currency,
        layer,
        status,
        is_claimed,
        details,
        recorded_at,
        created_at,
        updated_at
    ) VALUES (
        NEW.recipient_wallet,
        NEW.payer_wallet,
        CASE 
            WHEN NEW.reward_type = 'layer_reward' THEN 'layer_reward'
            WHEN NEW.reward_type = 'pending_layer_reward' THEN 'pending_layer_reward'
            ELSE NEW.reward_type
        END,
        NEW.amount_usdt,
        'USDT',
        NEW.layer,
        CASE 
            WHEN NEW.reward_type = 'layer_reward' THEN 'earned'
            WHEN NEW.reward_type = 'pending_layer_reward' THEN 'pending'
            ELSE 'unknown'
        END,
        NEW.is_claimed,
        jsonb_build_object(
            'layer_reward_id', NEW.id,
            'amount_bcc', NEW.amount_bcc,
            'reward_type', NEW.reward_type,
            'layer', NEW.layer
        ),
        NEW.created_at,
        NEW.created_at,
        NEW.updated_at
    );
    
    RAISE NOTICE 'Created reward_records entry for layer_reward ID: %', NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建trigger
DROP TRIGGER IF EXISTS trigger_sync_layer_rewards_to_reward_records ON layer_rewards;
CREATE TRIGGER trigger_sync_layer_rewards_to_reward_records
    AFTER INSERT ON layer_rewards
    FOR EACH ROW
    EXECUTE FUNCTION sync_layer_rewards_to_reward_records();

\echo '✅ Created trigger to sync layer_rewards to reward_records'

-- 回填现有的layer_rewards数据到reward_records
\echo ''
\echo '🔄 Syncing existing layer_rewards to reward_records...'

-- 清理现有reward_records数据避免重复
DELETE FROM reward_records WHERE record_type IN ('layer_reward', 'pending_layer_reward');

-- 回填所有现有的layer_rewards
INSERT INTO reward_records (
    wallet_address,
    source_wallet,
    record_type,
    amount,
    currency,
    layer,
    status,
    is_claimed,
    details,
    recorded_at,
    created_at,
    updated_at
)
SELECT 
    lr.recipient_wallet,
    lr.payer_wallet,
    CASE 
        WHEN lr.reward_type = 'layer_reward' THEN 'layer_reward'
        WHEN lr.reward_type = 'pending_layer_reward' THEN 'pending_layer_reward'
        ELSE lr.reward_type
    END,
    lr.amount_usdt,
    'USDT',
    lr.layer,
    CASE 
        WHEN lr.reward_type = 'layer_reward' THEN 'earned'
        WHEN lr.reward_type = 'pending_layer_reward' THEN 'pending'
        ELSE 'unknown'
    END,
    lr.is_claimed,
    jsonb_build_object(
        'layer_reward_id', lr.id,
        'amount_bcc', lr.amount_bcc,
        'reward_type', lr.reward_type,
        'layer', lr.layer
    ),
    lr.created_at,
    lr.created_at,
    lr.updated_at
FROM layer_rewards lr;

-- 显示同步结果
\echo ''
\echo '📊 Synchronization Results:'

SELECT 'layer_rewards' as table_name, COUNT(*) as record_count FROM layer_rewards
UNION ALL
SELECT 'reward_records', COUNT(*) FROM reward_records
ORDER BY table_name;

\echo ''
\echo '📋 Reward Records Sample:'
SELECT 
    rr.wallet_address,
    u.username as recipient_name,
    rr.record_type,
    rr.amount,
    rr.currency,
    rr.layer,
    rr.status,
    rr.recorded_at
FROM reward_records rr
LEFT JOIN users u ON rr.wallet_address = u.wallet_address
ORDER BY rr.recorded_at DESC
LIMIT 10;

\echo ''
\echo '📈 Reward Summary by User:'
SELECT 
    u.username,
    COUNT(*) as total_records,
    SUM(rr.amount) as total_amount,
    SUM(CASE WHEN rr.status = 'earned' THEN rr.amount ELSE 0 END) as earned_amount,
    SUM(CASE WHEN rr.status = 'pending' THEN rr.amount ELSE 0 END) as pending_amount
FROM reward_records rr
LEFT JOIN users u ON rr.wallet_address = u.wallet_address
GROUP BY u.username, rr.wallet_address
ORDER BY total_amount DESC;

\echo ''
\echo '✅ reward_records table sync completed!'
\echo 'Features added:'
\echo '  - reward_records table created if missing'
\echo '  - Auto-sync trigger from layer_rewards'
\echo '  - Backfilled all existing layer_rewards data'
\echo '  - Proper indexing for performance'
\echo ''
\echo '🎯 Future layer_rewards will automatically create reward_records entries'
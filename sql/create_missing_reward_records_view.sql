-- 创建缺失的reward_records视图和相关结构

\echo '📊 Creating missing reward_records view and structure...'

-- 创建reward_records视图，基于layer_rewards表
CREATE OR REPLACE VIEW reward_records AS
SELECT 
    lr.id as record_id,
    lr.recipient_wallet as wallet_address,
    lr.payer_wallet as source_wallet,
    lr.layer,
    lr.amount_usdt as amount,
    'USDT' as currency,
    lr.reward_type as record_type,
    CASE 
        WHEN lr.reward_type = 'layer_reward' THEN 'earned'
        WHEN lr.reward_type = 'pending_layer_reward' THEN 'pending'
        ELSE 'unknown'
    END as status,
    lr.is_claimed,
    lr.created_at as recorded_at,
    lr.updated_at,
    -- 额外信息
    u_recipient.username as recipient_name,
    u_payer.username as payer_name,
    CASE lr.layer
        WHEN 1 THEN 'Layer 1 Direct'
        WHEN 2 THEN 'Layer 2 Spillover' 
        ELSE 'Layer ' || lr.layer::text
    END as reward_description
FROM layer_rewards lr
LEFT JOIN users u_recipient ON lr.recipient_wallet = u_recipient.wallet_address
LEFT JOIN users u_payer ON lr.payer_wallet = u_payer.wallet_address
WHERE lr.amount_usdt > 0;

\echo '✅ Created reward_records view'

-- 创建补充的reward统计视图
CREATE OR REPLACE VIEW reward_summary AS
SELECT 
    wallet_address,
    recipient_name,
    COUNT(*) as total_rewards,
    SUM(amount) as total_amount,
    SUM(CASE WHEN status = 'earned' THEN amount ELSE 0 END) as earned_amount,
    SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
    SUM(CASE WHEN is_claimed THEN amount ELSE 0 END) as claimed_amount,
    COUNT(CASE WHEN status = 'earned' THEN 1 END) as earned_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
    MIN(recorded_at) as first_reward_date,
    MAX(recorded_at) as latest_reward_date
FROM reward_records
GROUP BY wallet_address, recipient_name;

\echo '✅ Created reward_summary view'

-- 创建matrix reward详情视图  
CREATE OR REPLACE VIEW matrix_reward_details AS
SELECT 
    rr.*,
    imp.matrix_owner,
    imp.layer_in_owner_matrix,
    imp.position_in_layer,
    u_owner.username as matrix_owner_name,
    'Reward for ' || rr.payer_name || ' activation in ' || 
    u_owner.username || ' matrix (Layer ' || imp.layer_in_owner_matrix || ' ' || imp.position_in_layer || ')' as reward_context
FROM reward_records rr
LEFT JOIN individual_matrix_placements imp ON rr.source_wallet = imp.member_wallet
LEFT JOIN users u_owner ON imp.matrix_owner = u_owner.wallet_address;

\echo '✅ Created matrix_reward_details view'

-- 测试视图是否工作
\echo ''
\echo '🧪 Testing reward_records view...'

SELECT 'reward_records' as view_name, COUNT(*) as record_count 
FROM reward_records
UNION ALL
SELECT 'reward_summary', COUNT(*) 
FROM reward_summary
UNION ALL  
SELECT 'matrix_reward_details', COUNT(*)
FROM matrix_reward_details;

\echo ''
\echo '📊 Sample reward_records data:'
SELECT 
    recipient_name,
    payer_name, 
    layer,
    amount,
    status,
    reward_description,
    recorded_at
FROM reward_records 
ORDER BY recorded_at 
LIMIT 10;

\echo ''
\echo '📈 Reward summary by recipient:'
SELECT 
    recipient_name,
    total_rewards,
    earned_amount,
    pending_amount,
    claimed_amount
FROM reward_summary
ORDER BY total_amount DESC;

\echo ''
\echo '✅ reward_records view and related structures created successfully!'
\echo 'Available views:'
\echo '  - reward_records: Complete reward transaction log'
\echo '  - reward_summary: Aggregated reward statistics per user'  
\echo '  - matrix_reward_details: Rewards with matrix context'
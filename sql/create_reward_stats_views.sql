-- 创建奖励统计视图系统 - 验证同步奖励记录
-- ========================================
-- 为前端和管理员提供奖励数据的统计分析视图
-- ========================================

-- 第1步：创建会员奖励概览视图
-- ========================================

SELECT '=== 创建奖励统计视图系统 ===' as status;

-- 会员奖励总览视图
CREATE OR REPLACE VIEW member_rewards_overview AS
SELECT 
    m.wallet_address,
    m.activation_id,
    m.username,
    m.current_level,
    nml.level_name,
    
    -- 奖励统计
    COALESCE(reward_stats.total_rewards, 0) as total_rewards_count,
    COALESCE(reward_stats.pending_rewards, 0) as pending_rewards_count,
    COALESCE(reward_stats.claimable_rewards, 0) as claimable_rewards_count,
    COALESCE(reward_stats.claimed_rewards, 0) as claimed_rewards_count,
    COALESCE(reward_stats.expired_rewards, 0) as expired_rewards_count,
    
    -- 金额统计
    COALESCE(reward_stats.total_amount_usdt, 0) as total_amount_usdt,
    COALESCE(reward_stats.pending_amount_usdt, 0) as pending_amount_usdt,
    COALESCE(reward_stats.claimable_amount_usdt, 0) as claimable_amount_usdt,
    COALESCE(reward_stats.claimed_amount_usdt, 0) as claimed_amount_usdt,
    COALESCE(reward_stats.expired_amount_usdt, 0) as expired_amount_usdt,
    
    -- 层级分布
    COALESCE(reward_stats.max_layer_earned, 0) as max_layer_earned,
    COALESCE(reward_stats.avg_layer_earned, 0) as avg_layer_earned,
    
    -- 资格统计
    COALESCE(reward_stats.qualified_rewards, 0) as qualified_rewards,
    COALESCE(reward_stats.unqualified_rewards, 0) as unqualified_rewards,
    ROUND(COALESCE(reward_stats.qualification_rate, 0), 2) as qualification_rate_percent,
    
    -- 时间统计
    reward_stats.latest_reward_time,
    reward_stats.latest_claim_time

FROM membership m
LEFT JOIN nft_membership_levels nml ON m.current_level = nml.level
LEFT JOIN (
    SELECT 
        mr.member_wallet,
        
        -- 数量统计
        COUNT(*) as total_rewards,
        COUNT(*) FILTER (WHERE mr.reward_status = 'pending') as pending_rewards,
        COUNT(*) FILTER (WHERE mr.reward_status = 'claimable') as claimable_rewards,
        COUNT(*) FILTER (WHERE mr.reward_status = 'claimed') as claimed_rewards,
        COUNT(*) FILTER (WHERE mr.reward_status = 'expired') as expired_rewards,
        
        -- 金额统计
        SUM(mr.reward_amount_usdt) as total_amount_usdt,
        SUM(mr.reward_amount_usdt) FILTER (WHERE mr.reward_status = 'pending') as pending_amount_usdt,
        SUM(mr.reward_amount_usdt) FILTER (WHERE mr.reward_status = 'claimable') as claimable_amount_usdt,
        SUM(mr.reward_amount_usdt) FILTER (WHERE mr.reward_status = 'claimed') as claimed_amount_usdt,
        SUM(mr.reward_amount_usdt) FILTER (WHERE mr.reward_status = 'expired') as expired_amount_usdt,
        
        -- 层级统计
        MAX(mr.layer_number) as max_layer_earned,
        ROUND(AVG(mr.layer_number), 2) as avg_layer_earned,
        
        -- 资格统计
        COUNT(*) FILTER (WHERE mr.qualification_met = true) as qualified_rewards,
        COUNT(*) FILTER (WHERE mr.qualification_met = false) as unqualified_rewards,
        ROUND(COUNT(*) FILTER (WHERE mr.qualification_met = true) * 100.0 / COUNT(*), 2) as qualification_rate,
        
        -- 时间统计
        MAX(mr.created_at) as latest_reward_time,
        MAX(mr.claimed_at) as latest_claim_time
        
    FROM member_rewards mr
    GROUP BY mr.member_wallet
) reward_stats ON m.wallet_address = reward_stats.member_wallet
ORDER BY m.activation_id;

-- 第2步：创建层级奖励分析视图
-- ========================================

-- 层级奖励详细分析视图
CREATE OR REPLACE VIEW layer_rewards_analysis AS
WITH layer_breakdown AS (
    SELECT 
        mr.layer_number,
        mr.reward_status,
        mr.qualification_met,
        
        -- 每层统计
        COUNT(*) as reward_count,
        COUNT(DISTINCT mr.member_wallet) as unique_recipients,
        COUNT(DISTINCT mr.reward_source_wallet) as unique_sources,
        
        -- 金额统计
        SUM(mr.reward_amount_usdt) as total_amount,
        AVG(mr.reward_amount_usdt) as avg_amount,
        MIN(mr.reward_amount_usdt) as min_amount,
        MAX(mr.reward_amount_usdt) as max_amount,
        
        -- 资格统计
        COUNT(*) FILTER (WHERE mr.qualification_met = true) as qualified_count,
        COUNT(*) FILTER (WHERE mr.qualification_met = false) as unqualified_count,
        
        -- 时间统计
        MIN(mr.created_at) as first_reward_time,
        MAX(mr.created_at) as latest_reward_time,
        COUNT(*) FILTER (WHERE mr.claimed_at IS NOT NULL) as claimed_count
        
    FROM member_rewards mr
    WHERE mr.reward_type = 'layer_reward'
    GROUP BY mr.layer_number, mr.reward_status, mr.qualification_met
)
SELECT 
    layer_number,
    reward_status,
    qualification_met,
    reward_count,
    unique_recipients,
    unique_sources,
    total_amount,
    avg_amount,
    qualified_count,
    unqualified_count,
    ROUND(qualified_count * 100.0 / NULLIF(reward_count, 0), 2) as qualification_rate_percent,
    claimed_count,
    first_reward_time,
    latest_reward_time
FROM layer_breakdown
ORDER BY layer_number, reward_status, qualification_met;

-- 第3步：创建奖励同步验证视图
-- ========================================

-- 奖励记录同步验证视图（检查数据一致性）
CREATE OR REPLACE VIEW reward_sync_verification AS
WITH member_placement_count AS (
    -- 统计每个会员的实际placement数量
    SELECT 
        mp.member_wallet,
        COUNT(*) as actual_placements,
        MIN(mp.placed_at) as first_placement_time,
        MAX(mp.placed_at) as latest_placement_time
    FROM matrix_placements mp
    GROUP BY mp.member_wallet
),
reward_trigger_count AS (
    -- 统计每个会员触发的奖励数量
    SELECT 
        mr.reward_source_wallet,
        COUNT(*) as triggered_rewards,
        COUNT(DISTINCT mr.member_wallet) as affected_members,
        MIN(mr.created_at) as first_reward_time,
        MAX(mr.created_at) as latest_reward_time
    FROM member_rewards mr
    GROUP BY mr.reward_source_wallet
),
expected_vs_actual AS (
    -- 计算预期vs实际的奖励数量
    SELECT 
        m.wallet_address,
        m.username,
        m.activation_id,
        mpc.actual_placements,
        rtc.triggered_rewards,
        
        -- 预期每次placement应该触发19层奖励
        mpc.actual_placements * 19 as expected_rewards,
        COALESCE(rtc.triggered_rewards, 0) as actual_rewards,
        
        -- 计算差异
        (mpc.actual_placements * 19) - COALESCE(rtc.triggered_rewards, 0) as reward_deficit,
        
        -- 时间比较
        mpc.first_placement_time,
        rtc.first_reward_time,
        ABS(EXTRACT(EPOCH FROM (mpc.first_placement_time - rtc.first_reward_time))) as time_diff_seconds
        
    FROM membership m
    LEFT JOIN member_placement_count mpc ON m.wallet_address = mpc.member_wallet
    LEFT JOIN reward_trigger_count rtc ON m.wallet_address = rtc.reward_source_wallet
    WHERE mpc.actual_placements IS NOT NULL OR rtc.triggered_rewards IS NOT NULL
)
SELECT 
    wallet_address,
    username,
    activation_id,
    actual_placements,
    expected_rewards,
    actual_rewards,
    reward_deficit,
    
    -- 同步状态判断
    CASE 
        WHEN reward_deficit = 0 THEN 'SYNCED'
        WHEN reward_deficit > 0 THEN 'MISSING_REWARDS'
        WHEN reward_deficit < 0 THEN 'EXCESS_REWARDS'
        ELSE 'UNKNOWN'
    END as sync_status,
    
    -- 触发时间延迟（秒）
    time_diff_seconds,
    CASE 
        WHEN time_diff_seconds <= 5 THEN 'IMMEDIATE'
        WHEN time_diff_seconds <= 60 THEN 'FAST'
        WHEN time_diff_seconds <= 300 THEN 'NORMAL'
        ELSE 'SLOW'
    END as trigger_speed,
    
    first_placement_time,
    first_reward_time
    
FROM expected_vs_actual
ORDER BY ABS(reward_deficit) DESC, activation_id;

-- 第4步：创建奖励数据质量监控视图
-- ========================================

-- 奖励数据质量监控视图
CREATE OR REPLACE VIEW reward_data_quality AS
SELECT 
    'Data Quality Checks' as category,
    check_name,
    status,
    count_value,
    details,
    severity
FROM (
    -- 检查1：孤儿奖励记录（member不存在）
    SELECT 
        'orphan_rewards' as check_name,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ERROR' END as status,
        COUNT(*) as count_value,
        CASE WHEN COUNT(*) = 0 THEN 'No orphan reward records' 
             ELSE COUNT(*)::TEXT || ' reward records reference non-existent members' END as details,
        'HIGH' as severity
    FROM member_rewards mr
    LEFT JOIN membership m ON mr.member_wallet = m.wallet_address
    WHERE m.wallet_address IS NULL
    
    UNION ALL
    
    -- 检查2：奖励金额异常
    SELECT 
        'amount_anomalies',
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END,
        COUNT(*),
        CASE WHEN COUNT(*) = 0 THEN 'All reward amounts are reasonable' 
             ELSE COUNT(*)::TEXT || ' rewards have unusual amounts (>10000 or <=0)' END,
        'MEDIUM'
    FROM member_rewards mr
    WHERE mr.reward_amount_usdt > 10000 OR mr.reward_amount_usdt <= 0
    
    UNION ALL
    
    -- 检查3：过期未处理的奖励
    SELECT 
        'expired_unprocessed',
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END,
        COUNT(*),
        CASE WHEN COUNT(*) = 0 THEN 'No expired unprocessed rewards' 
             ELSE COUNT(*)::TEXT || ' rewards expired without being claimed' END,
        'MEDIUM'
    FROM member_rewards mr
    WHERE mr.reward_status = 'expired' AND mr.claimed_at IS NULL
    
    UNION ALL
    
    -- 检查4：资格状态不一致
    SELECT 
        'qualification_inconsistency',
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END,
        COUNT(*),
        CASE WHEN COUNT(*) = 0 THEN 'Qualification status is consistent' 
             ELSE COUNT(*)::TEXT || ' rewards have inconsistent qualification status' END,
        'LOW'
    FROM member_rewards mr
    WHERE (mr.qualification_met = true AND mr.reward_status = 'pending' AND mr.claimable_at <= NOW())
       OR (mr.qualification_met = false AND mr.reward_status = 'claimable')
    
    UNION ALL
    
    -- 检查5：72小时timer异常
    SELECT 
        'timer_anomalies',
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END,
        COUNT(*),
        CASE WHEN COUNT(*) = 0 THEN 'All timers are set correctly' 
             ELSE COUNT(*)::TEXT || ' rewards have incorrect timer settings' END,
        'LOW'
    FROM member_rewards mr
    WHERE mr.claimable_at < mr.created_at 
       OR mr.expires_at < mr.claimable_at
       OR (mr.claimed_at IS NOT NULL AND mr.claimed_at < mr.claimable_at)
) quality_checks
ORDER BY 
    CASE severity WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
    check_name;

-- 第5步：创建奖励统计API函数
-- ========================================

-- 获取会员奖励摘要
CREATE OR REPLACE FUNCTION get_member_reward_summary(p_wallet VARCHAR(42))
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'member_info', jsonb_build_object(
            'wallet_address', mro.wallet_address,
            'username', mro.username,
            'activation_id', mro.activation_id,
            'current_level', mro.current_level,
            'level_name', mro.level_name
        ),
        'reward_summary', jsonb_build_object(
            'total_rewards', mro.total_rewards_count,
            'pending_rewards', mro.pending_rewards_count,
            'claimable_rewards', mro.claimable_rewards_count,
            'claimed_rewards', mro.claimed_rewards_count,
            'expired_rewards', mro.expired_rewards_count
        ),
        'amount_summary', jsonb_build_object(
            'total_amount_usdt', mro.total_amount_usdt,
            'pending_amount_usdt', mro.pending_amount_usdt,
            'claimable_amount_usdt', mro.claimable_amount_usdt,
            'claimed_amount_usdt', mro.claimed_amount_usdt,
            'expired_amount_usdt', mro.expired_amount_usdt
        ),
        'qualification_info', jsonb_build_object(
            'qualified_rewards', mro.qualified_rewards,
            'unqualified_rewards', mro.unqualified_rewards,
            'qualification_rate_percent', mro.qualification_rate_percent,
            'max_layer_earned', mro.max_layer_earned
        ),
        'timing_info', jsonb_build_object(
            'latest_reward_time', mro.latest_reward_time,
            'latest_claim_time', mro.latest_claim_time
        )
    ) INTO result
    FROM member_rewards_overview mro
    WHERE mro.wallet_address = p_wallet;
    
    RETURN COALESCE(result, jsonb_build_object('error', 'Member not found'));
END;
$$ LANGUAGE plpgsql;

-- 获取系统奖励统计
CREATE OR REPLACE FUNCTION get_system_reward_stats()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH system_stats AS (
        SELECT 
            COUNT(*) as total_rewards,
            COUNT(DISTINCT member_wallet) as unique_recipients,
            COUNT(DISTINCT reward_source_wallet) as unique_triggers,
            SUM(reward_amount_usdt) as total_amount_usdt,
            
            -- 按状态统计
            COUNT(*) FILTER (WHERE reward_status = 'pending') as pending_count,
            COUNT(*) FILTER (WHERE reward_status = 'claimable') as claimable_count,
            COUNT(*) FILTER (WHERE reward_status = 'claimed') as claimed_count,
            COUNT(*) FILTER (WHERE reward_status = 'expired') as expired_count,
            
            SUM(reward_amount_usdt) FILTER (WHERE reward_status = 'pending') as pending_amount,
            SUM(reward_amount_usdt) FILTER (WHERE reward_status = 'claimable') as claimable_amount,
            SUM(reward_amount_usdt) FILTER (WHERE reward_status = 'claimed') as claimed_amount,
            SUM(reward_amount_usdt) FILTER (WHERE reward_status = 'expired') as expired_amount,
            
            -- 资格统计
            COUNT(*) FILTER (WHERE qualification_met = true) as qualified_count,
            COUNT(*) FILTER (WHERE qualification_met = false) as unqualified_count,
            
            -- 时间统计
            MIN(created_at) as first_reward_time,
            MAX(created_at) as latest_reward_time,
            MAX(claimed_at) as latest_claim_time
            
        FROM member_rewards
    )
    SELECT jsonb_build_object(
        'system_overview', jsonb_build_object(
            'total_rewards', ss.total_rewards,
            'unique_recipients', ss.unique_recipients,
            'unique_triggers', ss.unique_triggers,
            'total_amount_usdt', ss.total_amount_usdt
        ),
        'status_breakdown', jsonb_build_object(
            'pending', jsonb_build_object('count', ss.pending_count, 'amount', ss.pending_amount),
            'claimable', jsonb_build_object('count', ss.claimable_count, 'amount', ss.claimable_amount),
            'claimed', jsonb_build_object('count', ss.claimed_count, 'amount', ss.claimed_amount),
            'expired', jsonb_build_object('count', ss.expired_count, 'amount', ss.expired_amount)
        ),
        'qualification_stats', jsonb_build_object(
            'qualified_count', ss.qualified_count,
            'unqualified_count', ss.unqualified_count,
            'qualification_rate', ROUND(ss.qualified_count * 100.0 / NULLIF(ss.total_rewards, 0), 2)
        ),
        'timing_info', jsonb_build_object(
            'first_reward_time', ss.first_reward_time,
            'latest_reward_time', ss.latest_reward_time,
            'latest_claim_time', ss.latest_claim_time
        )
    ) INTO result
    FROM system_stats ss;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 第6步：创建索引优化查询性能
-- ========================================

-- 为统计视图创建必要索引
CREATE INDEX IF NOT EXISTS idx_member_rewards_composite_stats 
ON member_rewards(member_wallet, reward_status, qualification_met);

CREATE INDEX IF NOT EXISTS idx_member_rewards_layer_analysis 
ON member_rewards(layer_number, reward_type, reward_status);

CREATE INDEX IF NOT EXISTS idx_member_rewards_time_range 
ON member_rewards(created_at, reward_status) WHERE reward_status IN ('pending', 'claimable');

-- 第7步：显示统计视图创建结果
-- ========================================

SELECT '=== 奖励统计视图系统创建完成 ===' as status;

-- 显示创建的视图列表
SELECT '=== 创建的统计视图 ===' as section;
SELECT 
    schemaname,
    viewname,
    definition IS NOT NULL as has_definition
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('member_rewards_overview', 'layer_rewards_analysis', 'reward_sync_verification', 'reward_data_quality')
ORDER BY viewname;

-- 显示API函数列表
SELECT '=== 创建的统计函数 ===' as section;
SELECT 'get_member_reward_summary(wallet) - 获取会员奖励摘要' as function1,
       'get_system_reward_stats() - 获取系统奖励统计' as function2,
       'update_reward_status_by_timer() - 更新72小时timer状态' as function3;
-- 创建前端展示用的奖励查询函数

BEGIN;

SELECT '=== 创建奖励展示函数 ===' as step;

-- 1. 获取用户可领取奖励
CREATE OR REPLACE FUNCTION get_claimable_rewards_by_wallet(
    p_wallet_address TEXT
)
RETURNS TABLE(
    id uuid,
    layer INTEGER,
    reward_amount_usdc NUMERIC,
    nft_level INTEGER,
    triggering_member_wallet character varying,
    status character varying,
    created_at timestamp with time zone,
    expires_at timestamp with time zone,
    reward_type character varying,
    trigger_info JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rc.id,
        rc.layer,
        rc.reward_amount_usdc,
        rc.nft_level,
        rc.triggering_member_wallet,
        rc.status,
        rc.created_at,
        rc.expires_at,
        COALESCE(rc.reward_type, 'layer_reward') as reward_type,
        jsonb_build_object(
            'trigger_member_name', COALESCE(u.username, 'Member_' || RIGHT(rc.triggering_member_wallet, 4)),
            'layer_position', sm.matrix_position,
            'earned_by_level', rc.nft_level,
            'earned_at_layer', rc.layer
        ) as trigger_info
    FROM reward_claims rc
    LEFT JOIN users u ON rc.triggering_member_wallet = u.wallet_address
    LEFT JOIN spillover_matrix sm ON rc.triggering_member_wallet = sm.member_wallet 
        AND rc.root_wallet = sm.matrix_root
    WHERE rc.root_wallet = p_wallet_address
    AND rc.status IN ('claimable', 'available')
    ORDER BY rc.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 2. 获取用户pending奖励（等待条件满足）
CREATE OR REPLACE FUNCTION get_pending_rewards_by_wallet(
    p_wallet_address TEXT
)
RETURNS TABLE(
    id uuid,
    layer INTEGER,
    reward_amount_usdc NUMERIC,
    nft_level INTEGER,
    triggering_member_wallet character varying,
    status character varying,
    created_at timestamp with time zone,
    expires_at timestamp with time zone,
    pending_reason TEXT,
    required_level INTEGER,
    current_level INTEGER,
    time_remaining_hours INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rc.id,
        rc.layer,
        rc.reward_amount_usdc,
        rc.nft_level,
        rc.triggering_member_wallet,
        rc.status,
        rc.created_at,
        rc.expires_at,
        CASE 
            WHEN COALESCE(m.current_level, 1) < rc.layer THEN 
                'Need Level ' || rc.layer || ' to claim Layer ' || rc.layer || ' reward'
            ELSE 'Other conditions not met'
        END as pending_reason,
        rc.layer as required_level,
        COALESCE(m.current_level, 1) as current_level,
        GREATEST(0, EXTRACT(EPOCH FROM (rc.expires_at - now()))/3600)::INTEGER as time_remaining_hours
    FROM reward_claims rc
    LEFT JOIN members m ON rc.root_wallet = m.wallet_address
    WHERE rc.root_wallet = p_wallet_address
    AND rc.status = 'pending'
    ORDER BY rc.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 3. 获取用户Matrix位置摘要（用于前端展示）
CREATE OR REPLACE FUNCTION get_user_matrix_summary(
    p_wallet_address TEXT
)
RETURNS TABLE(
    as_member_in_matrices INTEGER,
    as_root_total_members INTEGER,
    highest_layer_reached INTEGER,
    current_nft_level INTEGER,
    layer_level_status JSONB
) AS $$
DECLARE
    member_matrices INTEGER;
    root_members INTEGER;
    highest_layer INTEGER;
    current_level INTEGER;
    status_info JSONB;
BEGIN
    -- 计算作为成员参与的矩阵数量
    SELECT COUNT(DISTINCT matrix_root) INTO member_matrices
    FROM spillover_matrix
    WHERE member_wallet = p_wallet_address;
    
    -- 计算作为根用户的团队成员数量
    SELECT COUNT(*) INTO root_members
    FROM spillover_matrix
    WHERE matrix_root = p_wallet_address;
    
    -- 计算到达的最高层级
    SELECT COALESCE(MAX(matrix_layer), 0) INTO highest_layer
    FROM spillover_matrix
    WHERE member_wallet = p_wallet_address;
    
    -- 获取当前NFT等级
    SELECT COALESCE(current_level, 1) INTO current_level
    FROM members
    WHERE wallet_address = p_wallet_address;
    
    -- 创建Layer-Level状态信息
    status_info := jsonb_build_object(
        'can_earn_rewards_at_layers', 
        (SELECT array_agg(matrix_layer) 
         FROM spillover_matrix sm
         LEFT JOIN members m ON sm.matrix_root = m.wallet_address
         WHERE sm.member_wallet = p_wallet_address
         AND COALESCE(m.current_level, 1) >= sm.matrix_layer),
        'pending_rewards_at_layers',
        (SELECT array_agg(matrix_layer)
         FROM spillover_matrix sm  
         LEFT JOIN members m ON sm.matrix_root = m.wallet_address
         WHERE sm.member_wallet = p_wallet_address
         AND COALESCE(m.current_level, 1) < sm.matrix_layer)
    );
    
    RETURN QUERY SELECT 
        member_matrices,
        root_members,
        highest_layer,
        current_level,
        status_info;
END;
$$ LANGUAGE plpgsql;

-- 4. 获取奖励统计
CREATE OR REPLACE FUNCTION get_reward_stats_by_wallet(
    p_wallet_address TEXT
)
RETURNS TABLE(
    total_earned NUMERIC,
    total_claimable NUMERIC,
    total_pending NUMERIC,
    total_claimed NUMERIC,
    claimable_count INTEGER,
    pending_count INTEGER,
    claimed_count INTEGER,
    last_reward_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(rc.reward_amount_usdc), 0) as total_earned,
        COALESCE(SUM(CASE WHEN rc.status IN ('claimable', 'available') THEN rc.reward_amount_usdc ELSE 0 END), 0) as total_claimable,
        COALESCE(SUM(CASE WHEN rc.status = 'pending' THEN rc.reward_amount_usdc ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN rc.status = 'claimed' THEN rc.reward_amount_usdc ELSE 0 END), 0) as total_claimed,
        COUNT(CASE WHEN rc.status IN ('claimable', 'available') THEN 1 END)::INTEGER as claimable_count,
        COUNT(CASE WHEN rc.status = 'pending' THEN 1 END)::INTEGER as pending_count,
        COUNT(CASE WHEN rc.status = 'claimed' THEN 1 END)::INTEGER as claimed_count,
        MAX(rc.created_at) as last_reward_at
    FROM reward_claims rc
    WHERE rc.root_wallet = p_wallet_address;
END;
$$ LANGUAGE plpgsql;

SELECT '=== 测试新的奖励展示函数 ===' as test_step;

-- 测试函数（如果有数据的话）
SELECT 'Testing claimable rewards:' as info;
SELECT * FROM get_claimable_rewards_by_wallet('0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC') LIMIT 3;

SELECT 'Testing reward stats:' as info;
SELECT * FROM get_reward_stats_by_wallet('0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC');

SELECT 'Testing matrix summary:' as info;
SELECT * FROM get_user_matrix_summary('0x310053286b025De2a0816faEcBCaeB61B5f17aa1');

SELECT '=== 奖励展示函数创建完成 ===' as final_status;

COMMIT;
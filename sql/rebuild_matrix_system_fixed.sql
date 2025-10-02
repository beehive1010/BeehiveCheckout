-- 修复版：重建matrix系统，避免保留字冲突

-- 清理后重新创建函数和视图
-- 1. 创建获取会员matrix位置的函数
CREATE OR REPLACE FUNCTION get_member_spillover_position(
    p_member_wallet TEXT,
    p_matrix_root TEXT
)
RETURNS TABLE(
    layer_num INTEGER,
    position_char TEXT,
    was_spillover BOOLEAN,
    original_layer_num INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.matrix_layer as layer_num,
        sm.matrix_position as position_char,
        (sm.matrix_layer != sm.original_layer) as was_spillover,
        sm.original_layer as original_layer_num
    FROM spillover_matrix sm
    WHERE sm.member_wallet = p_member_wallet
    AND sm.matrix_root = p_matrix_root;
END;
$$ LANGUAGE plpgsql;

-- 2. 获取matrix层级统计的函数
CREATE OR REPLACE FUNCTION get_matrix_layer_stats(p_matrix_root TEXT)
RETURNS TABLE(
    layer_num INTEGER,
    current_count BIGINT,
    max_capacity BIGINT,
    fill_percentage NUMERIC,
    l_count BIGINT,
    m_count BIGINT,
    r_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.matrix_layer as layer_num,
        COUNT(*) as current_count,
        POWER(3, sm.matrix_layer) as max_capacity,
        ROUND((COUNT(*) * 100.0 / POWER(3, sm.matrix_layer)), 2) as fill_percentage,
        COUNT(CASE WHEN sm.matrix_position = 'L' THEN 1 END) as l_count,
        COUNT(CASE WHEN sm.matrix_position = 'M' THEN 1 END) as m_count,
        COUNT(CASE WHEN sm.matrix_position = 'R' THEN 1 END) as r_count
    FROM spillover_matrix sm
    WHERE sm.matrix_root = p_matrix_root
    GROUP BY sm.matrix_layer
    ORDER BY sm.matrix_layer;
END;
$$ LANGUAGE plpgsql;

-- 3. 计算matrix奖励的函数
CREATE OR REPLACE FUNCTION calculate_matrix_rewards(
    p_new_member_wallet TEXT,
    p_matrix_root TEXT
)
RETURNS TABLE(
    reward_recipient TEXT,
    recipient_name TEXT,
    reward_type TEXT,
    reward_layer INTEGER,
    reward_amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH member_position AS (
        SELECT matrix_layer, matrix_position
        FROM spillover_matrix
        WHERE member_wallet = p_new_member_wallet
        AND matrix_root = p_matrix_root
    ),
    reward_calculation AS (
        SELECT 
            p_matrix_root as recipient_wallet,
            COALESCE(u.username, 'Member_' || RIGHT(p_matrix_root, 4)) as recipient_name,
            'Layer ' || mp.matrix_layer || ' Placement' as reward_type,
            mp.matrix_layer as reward_layer,
            -- 基础奖励逻辑
            CASE mp.matrix_layer
                WHEN 1 THEN 10.00
                WHEN 2 THEN 5.00
                ELSE 1.00
            END as amount
        FROM member_position mp
        LEFT JOIN users u ON u.wallet_address = p_matrix_root
    )
    SELECT 
        recipient_wallet,
        recipient_name,
        reward_type,
        reward_layer,
        amount
    FROM reward_calculation;
END;
$$ LANGUAGE plpgsql;

-- 4. 新会员加入时的奖励触发函数
CREATE OR REPLACE FUNCTION trigger_matrix_rewards_on_join(
    p_new_member_wallet TEXT
)
RETURNS void AS $$
DECLARE
    matrix_record RECORD;
    reward_record RECORD;
BEGIN
    RAISE NOTICE '为新会员 % 触发matrix奖励...', 
        (SELECT COALESCE(username, 'Member_' || RIGHT(p_new_member_wallet, 4)) FROM users WHERE wallet_address = p_new_member_wallet);
    
    -- 为新会员在每个matrix中的位置计算奖励
    FOR matrix_record IN 
        SELECT DISTINCT matrix_root 
        FROM spillover_matrix 
        WHERE member_wallet = p_new_member_wallet
    LOOP
        -- 计算并记录奖励
        FOR reward_record IN 
            SELECT * FROM calculate_matrix_rewards(p_new_member_wallet, matrix_record.matrix_root)
        LOOP
            RAISE NOTICE '  奖励触发: % 获得 % 奖励金额: %',
                reward_record.recipient_name,
                reward_record.reward_type,
                reward_record.reward_amount;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
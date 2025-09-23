-- 重建矩阵视图：正确实现 BFS 安置算法
-- 分步实现：推荐递归链 + BFS 矩阵分配

-- Step 1: 重建基础矩阵视图（基于 referral_tree_view 的递归记录）
CREATE VIEW matrix_referrals_view AS
WITH all_team_members AS (
    -- 获取所有团队成员（基于 referrals_tree_view 的递归记录）
    SELECT DISTINCT
        rt.root_wallet as matrix_root_wallet,
        rt.referred_wallet as member_wallet,
        u.username,
        m.current_level,
        m.activation_time,
        m.activation_sequence,
        rt.depth as referral_depth
    FROM referrals_tree_view rt
    JOIN members m ON m.wallet_address = rt.referred_wallet
    LEFT JOIN users u ON u.wallet_address = rt.referred_wallet
    WHERE rt.depth > 0  -- 排除根节点
      AND m.current_level > 0  -- 只包含激活成员
),
ranked_members AS (
    -- 按激活序号排序，应用 BFS 分配
    SELECT 
        matrix_root_wallet,
        member_wallet,
        username,
        current_level,
        activation_time,
        activation_sequence,
        referral_depth,
        ROW_NUMBER() OVER (
            PARTITION BY matrix_root_wallet 
            ORDER BY activation_sequence ASC
        ) as placement_order
    FROM all_team_members
),
matrix_positions AS (
    -- 计算 BFS 位置
    SELECT 
        matrix_root_wallet,
        member_wallet,
        username,
        current_level,
        activation_time,
        activation_sequence,
        placement_order,
        
        -- 计算层级（BFS算法：第1层=3个，第2层=9个，第3层=27个...）
        CASE 
            WHEN placement_order <= 3 THEN 1
            WHEN placement_order <= 12 THEN 2  -- 3 + 9 = 12
            WHEN placement_order <= 39 THEN 3  -- 12 + 27 = 39
            WHEN placement_order <= 120 THEN 4  -- 39 + 81 = 120
            WHEN placement_order <= 363 THEN 5  -- 120 + 243 = 363
            WHEN placement_order <= 1092 THEN 6  -- 363 + 729 = 1092
            ELSE LEAST(7 + FLOOR(LOG(3, GREATEST(1, placement_order - 1092))), 19)
        END as layer,
        
        -- 计算位置（L/M/R）
        CASE 
            WHEN (placement_order - 1) % 3 = 0 THEN 'L'
            WHEN (placement_order - 1) % 3 = 1 THEN 'M'
            WHEN (placement_order - 1) % 3 = 2 THEN 'R'
        END as position,
        
        -- 检测是否为溢出（推荐深度 > BFS 计算层级）
        CASE 
            WHEN referral_depth > CASE 
                WHEN placement_order <= 3 THEN 1
                WHEN placement_order <= 12 THEN 2
                WHEN placement_order <= 39 THEN 3
                WHEN placement_order <= 120 THEN 4
                WHEN placement_order <= 363 THEN 5
                WHEN placement_order <= 1092 THEN 6
                ELSE LEAST(7 + FLOOR(LOG(3, GREATEST(1, placement_order - 1092))), 19)
            END THEN true
            ELSE false
        END as is_spillover,
        true as is_activated
        
    FROM ranked_members
)
SELECT * FROM matrix_positions
ORDER BY matrix_root_wallet, layer, placement_order;

-- Step 2: 创建 matrix_referrals_tree_view（与 matrix_referrals_view 相同）
CREATE VIEW matrix_referrals_tree_view AS
SELECT * FROM matrix_referrals_view;

-- Step 3: 重建 matrix_layers_view
CREATE VIEW matrix_layers_view AS
SELECT 
    matrix_root_wallet,
    layer,
    COUNT(*) as filled_slots,
    POWER(3, layer) as max_slots,
    ROUND((COUNT(*) * 100.0 / POWER(3, layer)), 1) as completion_rate,
    COUNT(CASE WHEN is_activated THEN 1 END) as activated_members,
    COUNT(CASE WHEN position = 'L' THEN 1 END) as left_count,
    COUNT(CASE WHEN position = 'M' THEN 1 END) as middle_count,
    COUNT(CASE WHEN position = 'R' THEN 1 END) as right_count,
    COUNT(CASE WHEN is_spillover THEN 1 END) as spillover_count,
    MIN(activation_sequence) as first_member_sequence,
    MAX(activation_sequence) as last_member_sequence
FROM matrix_referrals_view
GROUP BY matrix_root_wallet, layer
ORDER BY matrix_root_wallet, layer;

-- Step 4: 重建 referrer_stats 视图
CREATE VIEW referrer_stats AS
WITH direct_referrals AS (
    SELECT 
        rn.referrer_wallet as referrer,
        COUNT(*) as direct_referrals
    FROM referrals_new rn
    JOIN members m ON m.wallet_address = rn.referred_wallet
    WHERE m.current_level > 0
    GROUP BY rn.referrer_wallet
),
matrix_stats AS (
    SELECT 
        matrix_root_wallet as referrer,
        COUNT(*) as total_team_size,
        MAX(layer) as max_layer,
        COUNT(CASE WHEN layer = 1 AND position = 'L' THEN 1 END) as l_count,
        COUNT(CASE WHEN layer = 1 AND position = 'M' THEN 1 END) as m_count,
        COUNT(CASE WHEN layer = 1 AND position = 'R' THEN 1 END) as r_count,
        COUNT(CASE WHEN is_spillover THEN 1 END) as spillover_count,
        MIN(CASE WHEN layer = 1 AND position = 'L' THEN activation_sequence END) as l_activation_id,
        MIN(CASE WHEN layer = 1 AND position = 'M' THEN activation_sequence END) as m_activation_id,
        MIN(CASE WHEN layer = 1 AND position = 'R' THEN activation_sequence END) as r_activation_id
    FROM matrix_referrals_view
    GROUP BY matrix_root_wallet
)
SELECT 
    m.wallet_address as referrer,
    m.activation_sequence as activation_id,
    m.current_level,
    COALESCE(dr.direct_referrals, 0) as direct_referrals,
    COALESCE(ms.l_count, 0) as l_count,
    COALESCE(ms.m_count, 0) as m_count,
    COALESCE(ms.r_count, 0) as r_count,
    COALESCE(ms.spillover_count, 0) as spillover_count,
    COALESCE(ms.total_team_size, 0) as total_team_size,
    COALESCE(ms.max_layer, 0) as max_layer,
    ms.l_activation_id,
    ms.m_activation_id,
    ms.r_activation_id
FROM members m
LEFT JOIN direct_referrals dr ON dr.referrer = m.wallet_address
LEFT JOIN matrix_stats ms ON ms.referrer = m.wallet_address
WHERE m.current_level > 0
ORDER BY m.activation_sequence;

\echo '✅ Matrix views rebuilt successfully with BFS algorithm!';
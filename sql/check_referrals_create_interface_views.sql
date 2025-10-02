-- 检查推荐关系记录并创建推荐界面统计视图
-- ========================================
-- 验证matrix_placements表的推荐关系准确性并创建前端所需的统计视图
-- ========================================

-- 第1步：检查当前推荐关系表的状态
-- ========================================

SELECT '=== 检查推荐关系表状态 ===' as status;

-- 检查是否存在referrals表或matrix_placements表
SELECT 
    table_name,
    CASE 
        WHEN table_name = 'referrals' THEN 'OLD - May need migration'
        WHEN table_name = 'matrix_placements' THEN 'CURRENT - Matrix placement records'
        ELSE 'OTHER'
    END as table_status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('referrals', 'matrix_placements')
ORDER BY table_name;

-- 检查matrix_placements表结构
SELECT '=== matrix_placements表结构 ===' as section;
SELECT 
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_name = 'member_wallet' THEN 'CRITICAL - 被推荐/安置的会员'
        WHEN column_name = 'matrix_root' THEN 'CRITICAL - 矩阵根节点（推荐人）'
        WHEN column_name = 'is_direct_referral' THEN 'CRITICAL - 是否直推关系'
        WHEN column_name = 'is_spillover_placed' THEN 'CRITICAL - 是否溢出安置'
        WHEN column_name = 'matrix_layer' THEN 'IMPORTANT - 矩阵层级'
        WHEN column_name = 'matrix_position' THEN 'IMPORTANT - 矩阵位置(L/M/R)'
        ELSE 'OPTIONAL'
    END as importance
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'matrix_placements'
ORDER BY 
    CASE 
        WHEN column_name IN ('member_wallet', 'matrix_root') THEN 1
        WHEN column_name LIKE '%referral%' THEN 2
        WHEN column_name LIKE '%layer%' OR column_name LIKE '%position%' THEN 3
        ELSE 4
    END, column_name;

-- 第2步：分析推荐关系数据的准确性
-- ========================================

-- 检查直推关系统计
SELECT '=== 直推关系统计分析 ===' as section;
WITH direct_referral_stats AS (
    SELECT 
        mp.matrix_root,
        m.username as root_username,
        m.activation_id as root_activation_id,
        COUNT(*) FILTER (WHERE mp.is_direct_referral = true) as direct_referrals,
        COUNT(*) FILTER (WHERE mp.is_spillover_placed = true) as spillover_placements,
        COUNT(*) as total_placements,
        MAX(mp.matrix_layer) as max_layer
    FROM matrix_placements mp
    JOIN membership m ON mp.matrix_root = m.wallet_address
    GROUP BY mp.matrix_root, m.username, m.activation_id
)
SELECT 
    root_activation_id,
    root_username,
    direct_referrals,
    spillover_placements,
    total_placements,
    max_layer as deepest_layer,
    CASE 
        WHEN direct_referrals = 0 THEN 'No direct referrals'
        WHEN direct_referrals <= 3 THEN 'Normal range'
        ELSE 'High referrer'
    END as referrer_category
FROM direct_referral_stats 
WHERE total_placements > 0
ORDER BY direct_referrals DESC, root_activation_id
LIMIT 10;

-- 检查矩阵层级分布
SELECT '=== 矩阵层级分布分析 ===' as section;
SELECT 
    matrix_layer,
    COUNT(*) as placements_count,
    COUNT(DISTINCT matrix_root) as unique_roots,
    COUNT(*) FILTER (WHERE is_direct_referral = true) as direct_referrals,
    COUNT(*) FILTER (WHERE is_spillover_placed = true) as spillover_placements
FROM matrix_placements
GROUP BY matrix_layer
ORDER BY matrix_layer;

-- 检查位置分布（L/M/R）
SELECT '=== 矩阵位置分布分析 ===' as section;
SELECT 
    matrix_layer,
    matrix_position,
    COUNT(*) as position_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY matrix_layer), 2) as percentage
FROM matrix_placements
WHERE matrix_layer <= 3 -- 只看前3层
GROUP BY matrix_layer, matrix_position
ORDER BY matrix_layer, matrix_position;

-- 第3步：修正推荐关系数据（如果需要）
-- ========================================

-- 检查membership表中的referrer_wallet与matrix_placements的一致性
SELECT '=== 推荐关系一致性检查 ===' as section;
WITH referrer_consistency AS (
    SELECT 
        m.activation_id,
        m.username,
        m.wallet_address,
        m.referrer_wallet as membership_referrer,
        
        -- 从matrix_placements中查找直推关系
        (SELECT mp.matrix_root 
         FROM matrix_placements mp 
         WHERE mp.member_wallet = m.wallet_address 
         AND mp.is_direct_referral = true 
         LIMIT 1) as matrix_referrer,
         
        CASE 
            WHEN m.referrer_wallet IS NULL THEN 'No referrer (Root?)'
            WHEN NOT EXISTS (
                SELECT 1 FROM matrix_placements mp 
                WHERE mp.member_wallet = m.wallet_address 
                AND mp.matrix_root = m.referrer_wallet 
                AND mp.is_direct_referral = true
            ) THEN 'INCONSISTENT - Missing matrix placement'
            ELSE 'CONSISTENT'
        END as consistency_status
    FROM membership m
    WHERE m.activation_id IS NOT NULL
)
SELECT 
    consistency_status,
    COUNT(*) as member_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM referrer_consistency
GROUP BY consistency_status
ORDER BY member_count DESC;

-- 第4步：创建推荐界面基础统计视图
-- ========================================

-- 推荐人综合统计视图
CREATE OR REPLACE VIEW referrer_comprehensive_stats AS
WITH referrer_base_stats AS (
    SELECT 
        m.wallet_address as referrer_wallet,
        m.activation_id as referrer_activation_id,
        m.username as referrer_username,
        m.display_name as referrer_display_name,
        m.current_level,
        nml.level_name as referrer_level_name,
        
        -- 直推统计
        COUNT(*) FILTER (WHERE mp.is_direct_referral = true) as direct_referrals_count,
        
        -- 团队统计
        COUNT(*) FILTER (WHERE mp.is_spillover_placed = true) as spillover_count,
        COUNT(*) as total_team_size,
        
        -- 层级统计
        MAX(mp.matrix_layer) as deepest_layer,
        COUNT(DISTINCT mp.matrix_layer) as active_layers,
        
        -- Layer 1 位置统计
        COUNT(*) FILTER (WHERE mp.matrix_layer = 1 AND mp.matrix_position = 'L') as layer1_L_filled,
        COUNT(*) FILTER (WHERE mp.matrix_layer = 1 AND mp.matrix_position = 'M') as layer1_M_filled,
        COUNT(*) FILTER (WHERE mp.matrix_layer = 1 AND mp.matrix_position = 'R') as layer1_R_filled,
        
        -- 激活时间
        m.activation_time as referrer_activated_at
        
    FROM membership m
    LEFT JOIN matrix_placements mp ON m.wallet_address = mp.matrix_root
    LEFT JOIN nft_membership_levels nml ON m.current_level = nml.level
    GROUP BY m.wallet_address, m.activation_id, m.username, m.display_name, 
             m.current_level, nml.level_name, m.activation_time
),
vacant_positions AS (
    SELECT 
        matrix_root,
        CASE 
            WHEN COUNT(*) FILTER (WHERE matrix_layer = 1 AND matrix_position = 'L') = 0 THEN 'L'
            WHEN COUNT(*) FILTER (WHERE matrix_layer = 1 AND matrix_position = 'M') = 0 THEN 'M'
            WHEN COUNT(*) FILTER (WHERE matrix_layer = 1 AND matrix_position = 'R') = 0 THEN 'R'
            ELSE 'FULL'
        END as next_vacant_position,
        3 - COUNT(*) FILTER (WHERE matrix_layer = 1) as layer1_vacant_count
    FROM matrix_placements
    GROUP BY matrix_root
)
SELECT 
    rbs.*,
    COALESCE(vp.next_vacant_position, 'L') as next_vacant_position,
    COALESCE(vp.layer1_vacant_count, 3) as layer1_vacant_slots,
    (rbs.layer1_L_filled + rbs.layer1_M_filled + rbs.layer1_R_filled) as layer1_total_filled,
    
    -- 推荐人等级分类
    CASE 
        WHEN rbs.direct_referrals_count = 0 THEN 'New Member'
        WHEN rbs.direct_referrals_count <= 2 THEN 'Starter'
        WHEN rbs.direct_referrals_count <= 5 THEN 'Active'
        WHEN rbs.direct_referrals_count <= 10 THEN 'Leader' 
        ELSE 'Top Referrer'
    END as referrer_category,
    
    -- 团队活跃度
    CASE 
        WHEN rbs.total_team_size = 0 THEN 'No Team'
        WHEN rbs.total_team_size <= 5 THEN 'Small Team'
        WHEN rbs.total_team_size <= 15 THEN 'Medium Team'
        WHEN rbs.total_team_size <= 50 THEN 'Large Team'
        ELSE 'Mega Team'
    END as team_size_category
    
FROM referrer_base_stats rbs
LEFT JOIN vacant_positions vp ON rbs.referrer_wallet = vp.matrix_root
ORDER BY rbs.referrer_activation_id;

-- 第5步：创建团队成员详情视图
-- ========================================

CREATE OR REPLACE VIEW team_members_details AS
SELECT 
    -- 推荐人信息
    root_m.wallet_address as referrer_wallet,
    root_m.activation_id as referrer_activation_id,
    root_m.username as referrer_username,
    
    -- 团队成员信息
    member_m.wallet_address as member_wallet,
    member_m.activation_id as member_activation_id,
    member_m.username as member_username,
    member_m.display_name as member_display_name,
    member_m.current_level as member_level,
    nml.level_name as member_level_name,
    member_m.activation_time as member_activated_at,
    
    -- 安置信息
    mp.matrix_layer,
    mp.matrix_position,
    mp.is_direct_referral,
    mp.is_spillover_placed,
    mp.placed_at,
    
    -- 关系类型
    CASE 
        WHEN mp.is_direct_referral = true THEN 'Direct Referral'
        WHEN mp.is_spillover_placed = true THEN 'Spillover Placement'
        ELSE 'Matrix Placement'
    END as relationship_type,
    
    -- 层级描述
    CASE 
        WHEN mp.matrix_layer = 1 THEN 'Layer 1 (' || mp.matrix_position || ')'
        WHEN mp.matrix_layer <= 3 THEN 'Layer ' || mp.matrix_layer
        ELSE 'Deep Layer ' || mp.matrix_layer
    END as position_description
    
FROM matrix_placements mp
JOIN membership root_m ON mp.matrix_root = root_m.wallet_address
JOIN membership member_m ON mp.member_wallet = member_m.wallet_address
LEFT JOIN nft_membership_levels nml ON member_m.current_level = nml.level
ORDER BY root_m.activation_id, mp.matrix_layer, mp.matrix_position, member_m.activation_id;

-- 第6步：创建空位信息统计视图
-- ========================================

CREATE OR REPLACE VIEW matrix_vacancy_analysis AS
WITH layer_analysis AS (
    SELECT 
        m.wallet_address as root_wallet,
        m.activation_id as root_activation_id,
        m.username as root_username,
        layer_num,
        
        -- 计算每层的理论容量和实际占用
        POWER(3, layer_num) as theoretical_capacity,
        COALESCE(layer_placements.actual_count, 0) as actual_placements,
        POWER(3, layer_num) - COALESCE(layer_placements.actual_count, 0) as vacant_slots
        
    FROM membership m
    CROSS JOIN generate_series(1, 5) as layer_num -- 分析前5层
    LEFT JOIN (
        SELECT 
            matrix_root,
            matrix_layer,
            COUNT(*) as actual_count
        FROM matrix_placements
        GROUP BY matrix_root, matrix_layer
    ) layer_placements ON m.wallet_address = layer_placements.matrix_root 
                      AND layer_num = layer_placements.matrix_layer
),
position_details AS (
    SELECT 
        m.wallet_address as root_wallet,
        m.activation_id as root_activation_id,
        
        -- Layer 1 具体位置
        MAX(CASE WHEN mp.matrix_layer = 1 AND mp.matrix_position = 'L' THEN member_m.username END) as L_member,
        MAX(CASE WHEN mp.matrix_layer = 1 AND mp.matrix_position = 'M' THEN member_m.username END) as M_member,
        MAX(CASE WHEN mp.matrix_layer = 1 AND mp.matrix_position = 'R' THEN member_m.username END) as R_member,
        
        -- 下一个可用位置
        CASE 
            WHEN COUNT(*) FILTER (WHERE mp.matrix_layer = 1 AND mp.matrix_position = 'L') = 0 THEN 'L'
            WHEN COUNT(*) FILTER (WHERE mp.matrix_layer = 1 AND mp.matrix_position = 'M') = 0 THEN 'M'
            WHEN COUNT(*) FILTER (WHERE mp.matrix_layer = 1 AND mp.matrix_position = 'R') = 0 THEN 'R'
            ELSE 'Layer 2'
        END as next_available_position
        
    FROM membership m
    LEFT JOIN matrix_placements mp ON m.wallet_address = mp.matrix_root
    LEFT JOIN membership member_m ON mp.member_wallet = member_m.wallet_address
    GROUP BY m.wallet_address, m.activation_id
)
SELECT 
    la.root_activation_id,
    la.root_username,
    la.root_wallet,
    
    -- Layer 1 详细信息
    pd.L_member,
    pd.M_member,
    pd.R_member,
    pd.next_available_position,
    
    -- 各层空位统计
    jsonb_object_agg(
        'layer_' || la.layer_num, 
        jsonb_build_object(
            'theoretical_capacity', la.theoretical_capacity,
            'actual_placements', la.actual_placements,
            'vacant_slots', la.vacant_slots,
            'fill_percentage', ROUND(la.actual_placements * 100.0 / NULLIF(la.theoretical_capacity, 0), 2)
        )
    ) as layers_analysis,
    
    -- 总体统计
    SUM(la.theoretical_capacity) as total_theoretical_capacity,
    SUM(la.actual_placements) as total_actual_placements,
    SUM(la.vacant_slots) as total_vacant_slots,
    ROUND(SUM(la.actual_placements) * 100.0 / NULLIF(SUM(la.theoretical_capacity), 0), 2) as overall_fill_percentage
    
FROM layer_analysis la
JOIN position_details pd ON la.root_wallet = pd.root_wallet
GROUP BY la.root_activation_id, la.root_username, la.root_wallet,
         pd.L_member, pd.M_member, pd.R_member, pd.next_available_position
ORDER BY la.root_activation_id;

-- 第7步：创建推荐排行榜视图
-- ========================================

CREATE OR REPLACE VIEW referrer_leaderboard AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY direct_referrals_count DESC, total_team_size DESC, referrer_activation_id) as rank,
    referrer_activation_id,
    referrer_username,
    referrer_display_name,
    referrer_wallet,
    current_level,
    referrer_level_name,
    direct_referrals_count,
    total_team_size,
    deepest_layer,
    layer1_total_filled,
    next_vacant_position,
    referrer_category,
    team_size_category,
    
    -- 计算推荐价值
    direct_referrals_count * 100 + total_team_size * 10 as referrer_score
    
FROM referrer_comprehensive_stats
WHERE direct_referrals_count > 0 OR total_team_size > 0
ORDER BY rank;

-- 第8步：显示分析结果和验证
-- ========================================

SELECT '=== 推荐关系检查和界面视图创建完成 ===' as status;

-- 显示推荐统计概览
SELECT '=== 推荐统计概览 ===' as section;
SELECT 
    COUNT(DISTINCT referrer_wallet) as total_referrers,
    SUM(direct_referrals_count) as total_direct_referrals,
    SUM(total_team_size) as total_team_members,
    MAX(deepest_layer) as system_max_layer,
    AVG(direct_referrals_count) as avg_direct_referrals,
    AVG(total_team_size) as avg_team_size
FROM referrer_comprehensive_stats;

-- 显示推荐排行榜前5名
SELECT '=== 推荐排行榜 TOP 5 ===' as section;
SELECT 
    rank, referrer_username, direct_referrals_count, total_team_size, 
    deepest_layer, referrer_category, referrer_score
FROM referrer_leaderboard 
LIMIT 5;

-- 显示空位分析示例
SELECT '=== 矩阵空位分析示例 ===' as section;
SELECT 
    root_activation_id, root_username, 
    L_member, M_member, R_member, next_available_position,
    total_actual_placements, total_vacant_slots, overall_fill_percentage
FROM matrix_vacancy_analysis 
ORDER BY root_activation_id 
LIMIT 5;

-- 显示团队成员详情示例
SELECT '=== 团队成员详情示例 ===' as section;
SELECT 
    referrer_username, member_username, relationship_type, 
    position_description, member_level_name
FROM team_members_details 
WHERE referrer_activation_id <= 5
ORDER BY referrer_activation_id, matrix_layer, matrix_position 
LIMIT 10;
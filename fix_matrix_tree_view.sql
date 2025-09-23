-- 修复矩阵视图：正确实现 BFS 安置算法
-- Step 1: 构建推荐递归链（纯推荐关系）
-- Step 2: 应用 BFS + 激活时间排序 + L/M/R 槽位填充 + 溢出滑落

-- 删除旧视图
DROP VIEW IF EXISTS matrix_referrals_tree_view CASCADE;
DROP VIEW IF EXISTS matrix_referrals_view CASCADE;

-- Step 1: 创建推荐递归链视图（如果不存在）
CREATE OR REPLACE VIEW referrals_tree_hierarchy AS
WITH RECURSIVE referral_tree AS (
    -- 基础：根节点
    SELECT 
        m.wallet_address as root_wallet,
        m.wallet_address as member_wallet,
        m.wallet_address as referrer_wallet,
        m.activation_time,
        m.activation_sequence,
        m.current_level,
        u.username,
        0 as depth,
        ARRAY[m.wallet_address] as path
    FROM members m
    LEFT JOIN users u ON u.wallet_address = m.wallet_address
    WHERE m.current_level > 0
    
    UNION ALL
    
    -- 递归：推荐链
    SELECT 
        rt.root_wallet,
        rn.referred_wallet as member_wallet,
        rn.referrer_wallet,
        m2.activation_time,
        m2.activation_sequence,
        m2.current_level,
        u2.username,
        rt.depth + 1,
        rt.path || rn.referred_wallet
    FROM referral_tree rt
    JOIN referrals_new rn ON rn.referrer_wallet = rt.member_wallet
    LEFT JOIN members m2 ON m2.wallet_address = rn.referred_wallet
    LEFT JOIN users u2 ON u2.wallet_address = rn.referred_wallet
    WHERE rt.depth < 19
      AND NOT rn.referred_wallet = ANY(rt.path)
      AND m2.current_level > 0
)
SELECT * FROM referral_tree
ORDER BY root_wallet, depth, activation_time NULLS LAST;

-- Step 2: 应用 BFS 安置算法创建矩阵视图
CREATE VIEW matrix_referrals_view AS
WITH matrix_placement AS (
    SELECT 
        root_wallet as matrix_root_wallet,
        member_wallet,
        referrer_wallet,
        username,
        current_level,
        activation_time,
        activation_sequence,
        depth as referral_depth,
        
        -- 按 activation_time 全局排序，应用 BFS 填充算法
        ROW_NUMBER() OVER (
            PARTITION BY root_wallet 
            ORDER BY activation_time NULLS LAST, activation_sequence NULLS LAST
        ) as placement_order,
        
        -- 计算矩阵层级（BFS 深度优先安置）
        CASE 
            WHEN member_wallet = root_wallet THEN 0  -- 根节点
            ELSE
                -- 计算应该放在哪一层（基于 BFS 算法）
                FLOOR(LOG(3, 
                    GREATEST(1, 
                        ROW_NUMBER() OVER (
                            PARTITION BY root_wallet 
                            ORDER BY activation_time NULLS LAST, activation_sequence NULLS LAST
                        ) + 2  -- +2 因为层级从 0 开始，第一个成员在第 1 层
                    )
                )) + 1
        END as layer,
        
        -- 计算矩阵位置（L/M/R）
        CASE 
            WHEN member_wallet = root_wallet THEN 'root'
            ELSE 
                CASE (
                    ROW_NUMBER() OVER (
                        PARTITION BY root_wallet 
                        ORDER BY activation_time NULLS LAST, activation_sequence NULLS LAST
                    ) - 1
                ) % 3
                    WHEN 0 THEN 'L'
                    WHEN 1 THEN 'M'
                    WHEN 2 THEN 'R'
                END
        END as position,
        
        -- 检测是否为溢出安置
        CASE 
            WHEN member_wallet = root_wallet THEN false
            WHEN depth > FLOOR(LOG(3, 
                GREATEST(1, 
                    ROW_NUMBER() OVER (
                        PARTITION BY root_wallet 
                        ORDER BY activation_time NULLS LAST, activation_sequence NULLS LAST
                    ) + 2
                )
            )) + 1 THEN true  -- 实际推荐深度 > BFS 计算深度 = 溢出
            ELSE false
        END as is_spillover
        
    FROM referrals_tree_hierarchy
    WHERE root_wallet IS NOT NULL
),
parent_assignment AS (
    -- 分配每个节点的父级节点（在矩阵中的直接上级）
    SELECT 
        mp.*,
        
        -- 计算父级节点（BFS 算法）
        CASE 
            WHEN layer = 0 THEN NULL  -- 根节点无父级
            WHEN layer = 1 THEN matrix_root_wallet  -- 第一层的父级是根节点
            ELSE (
                -- 其他层级：找到对应的父级位置
                SELECT member_wallet 
                FROM matrix_placement mp2 
                WHERE mp2.matrix_root_wallet = mp.matrix_root_wallet
                  AND mp2.layer = mp.layer - 1
                  AND mp2.placement_order = FLOOR((mp.placement_order - 1) / 3) + 1
                LIMIT 1
            )
        END as parent_wallet
        
    FROM matrix_placement mp
)
SELECT 
    matrix_root_wallet,
    member_wallet,
    parent_wallet,
    referrer_wallet,
    username,
    current_level,
    activation_time,
    activation_sequence,
    referral_depth,
    layer,
    position,
    is_spillover,
    placement_order,
    CASE WHEN current_level > 0 THEN true ELSE false END as is_activated
FROM parent_assignment
ORDER BY matrix_root_wallet, layer, placement_order;

-- Step 3: 创建完整的矩阵树视图
CREATE VIEW matrix_referrals_tree_view AS
SELECT 
    matrix_root_wallet,
    member_wallet,
    parent_wallet,
    referrer_wallet,
    username,
    current_level,
    activation_time,
    activation_sequence,
    layer,
    position,
    is_spillover,
    is_activated
FROM matrix_referrals_view
ORDER BY matrix_root_wallet, layer, placement_order;

-- 创建优化的矩阵层级统计视图
CREATE OR REPLACE VIEW matrix_layers_view AS
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
FROM matrix_referrals_tree_view
WHERE layer > 0  -- 排除root层
GROUP BY matrix_root_wallet, layer
ORDER BY matrix_root_wallet, layer;

-- 测试新视图
\echo '🔍 测试新的 matrix_referrals_tree_view...';
SELECT 
    matrix_root_wallet,
    layer,
    COUNT(*) as members_count,
    COUNT(CASE WHEN position = 'L' THEN 1 END) as L_count,
    COUNT(CASE WHEN position = 'M' THEN 1 END) as M_count,
    COUNT(CASE WHEN position = 'R' THEN 1 END) as R_count
FROM matrix_referrals_tree_view 
WHERE matrix_root_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
GROUP BY matrix_root_wallet, layer
ORDER BY layer
LIMIT 10;

\echo '✅ Matrix views 重建完成!';
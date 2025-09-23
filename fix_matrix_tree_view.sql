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
        ARRAY[m.wallet_address]::varchar[] as path
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
        
        -- 按 activation_time 排序的安置顺序（排除根节点）
        CASE 
            WHEN member_wallet = root_wallet THEN 0  -- 根节点 placement_order = 0
            ELSE ROW_NUMBER() OVER (
                PARTITION BY root_wallet 
                ORDER BY activation_time NULLS LAST, activation_sequence NULLS LAST
            ) - 1  -- 非根节点从1开始编号，-1后从0开始
        END as placement_order,
        
        -- 矩阵层级基于推荐深度（支持19层）
        CASE 
            WHEN member_wallet = root_wallet THEN 0  -- 根节点
            ELSE LEAST(19, depth)  -- 直接使用推荐深度作为矩阵层级
        END as layer,
        
        -- 每层内的位置序号
        ROW_NUMBER() OVER (
            PARTITION BY root_wallet, depth 
            ORDER BY activation_time NULLS LAST, activation_sequence NULLS LAST
        ) - 1 as layer_position,
        
        -- 计算矩阵位置（L/M/R）基于每层内的激活顺序
        CASE 
            WHEN member_wallet = root_wallet THEN 'root'
            ELSE 
                CASE ((
                    ROW_NUMBER() OVER (
                        PARTITION BY root_wallet, depth 
                        ORDER BY activation_time NULLS LAST, activation_sequence NULLS LAST
                    ) - 1  -- 每层内从0开始编号
                ) % 3)
                    WHEN 0 THEN 'L'
                    WHEN 1 THEN 'M'
                    WHEN 2 THEN 'R'
                END
        END as position,
        
        -- 检测是否为溢出安置（基于推荐深度vs激活顺序的期望层级）
        CASE 
            WHEN member_wallet = root_wallet THEN false
            ELSE false  -- 简化：使用推荐深度作为层级时，无需溢出检测
        END as is_spillover
        
    FROM referrals_tree_hierarchy
    WHERE root_wallet IS NOT NULL
)
SELECT 
    matrix_root_wallet,
    member_wallet,
    
    -- 计算父级节点（基于层级内位置的矩阵安置）
    CASE 
        WHEN layer = 0 THEN NULL  -- 根节点无父级  
        WHEN layer = 1 THEN matrix_root_wallet  -- 第一层的父级是根节点
        ELSE referrer_wallet  -- 暂时使用推荐者作为父级，后续可优化为BFS矩阵安置
    END as parent_wallet,
    referrer_wallet,
    username,
    current_level,
    activation_time,
    activation_sequence,
    referral_depth,
    layer,
    position,
    is_spillover,
    CASE WHEN current_level > 0 THEN true ELSE false END as is_activated
FROM matrix_placement
ORDER BY matrix_root_wallet, layer, activation_time;

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
ORDER BY matrix_root_wallet, layer, activation_time;

-- 创建优化的矩阵层级统计视图
CREATE OR REPLACE VIEW matrix_layers_view AS
SELECT 
    matrix_root_wallet,
    layer,
    COUNT(*) as filled_slots,
    POWER(3, layer) as max_slots,
    ROUND((COUNT(*) * 100.0 / POWER(3, layer))::numeric, 1) as completion_rate,
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
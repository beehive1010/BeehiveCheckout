-- =============================================
-- Create Matrix Test View for MatrixTestPage.tsx
-- 匹配前端组件期望的字段名和数据结构
-- =============================================

-- Drop existing view if exists
DROP VIEW IF EXISTS matrix_referrals_tree_view CASCADE;

-- Create updated view with correct field names for MatrixTestPage.tsx
CREATE OR REPLACE VIEW matrix_referrals_tree_view AS
SELECT
    -- 🎯 匹配前端期望的字段名
    layer as matrix_layer,
    position as matrix_position,
    member_wallet,
    matrix_root_wallet,
    parent_wallet,
    referrer_wallet,

    -- 🎯 前端期望的激活状态字段
    COALESCE(is_activated, false) as is_active,

    -- 🎯 前端期望的放置时间字段 (使用created_at)
    created_at as placed_at,

    -- 🔍 其他有用的字段
    activation_sequence,
    activation_time,
    current_level,
    is_spillover,
    referral_depth,
    username,

    -- 📊 添加统计友好的字段
    CASE
        WHEN layer = 1 THEN 'Layer 1 - Direct'
        WHEN layer = 2 THEN 'Layer 2 - First Spillover'
        WHEN layer >= 3 THEN 'Layer ' || layer || ' - Deep Spillover'
        ELSE 'Unknown Layer'
    END as layer_description,

    -- 🎯 Position的详细信息
    CASE
        WHEN position = 'L' THEN 'Left'
        WHEN position = 'M' THEN 'Middle'
        WHEN position = 'R' THEN 'Right'
        WHEN position LIKE '%.L' THEN 'Left Branch'
        WHEN position LIKE '%.M' THEN 'Middle Branch'
        WHEN position LIKE '%.R' THEN 'Right Branch'
        ELSE position
    END as position_description

FROM (
    -- 🔗 联合所有matrix数据源
    SELECT
        matrix_root_wallet,
        member_wallet,
        layer,
        matrix_position as position,
        parent_wallet,
        referrer_wallet,
        created_at,

        -- 📈 从members表获取激活信息
        CASE
            WHEN m.current_level >= 1 THEN true
            ELSE false
        END as is_activated,

        -- 🎯 从members表获取其他信息
        m.activation_sequence,
        m.activation_time,
        m.current_level,

        -- 🔍 从users表获取用户名
        u.username,

        -- 📊 是否为spillover
        CASE
            WHEN mr.source = 'spillover' THEN true
            ELSE false
        END as is_spillover,

        -- 🎯 推荐深度计算
        layer as referral_depth

    FROM matrix_referrals mr
    LEFT JOIN members m ON m.wallet_address = mr.member_wallet
    LEFT JOIN users u ON u.wallet_address = mr.member_wallet

    WHERE mr.matrix_root_wallet IS NOT NULL
    AND mr.member_wallet IS NOT NULL

) combined_data

ORDER BY
    matrix_root_wallet,
    matrix_layer,
    CASE
        -- 🎯 确保L,M,R的正确排序
        WHEN matrix_position = 'L' THEN 1
        WHEN matrix_position = 'M' THEN 2
        WHEN matrix_position = 'R' THEN 3
        WHEN matrix_position LIKE '%.L' THEN 1
        WHEN matrix_position LIKE '%.M' THEN 2
        WHEN matrix_position LIKE '%.R' THEN 3
        ELSE 4
    END,
    matrix_position;

-- =============================================
-- 创建索引优化查询性能
-- =============================================

-- 为matrix_referrals表创建必要的索引
CREATE INDEX IF NOT EXISTS idx_matrix_referrals_root_layer
ON matrix_referrals(matrix_root_wallet, layer);

CREATE INDEX IF NOT EXISTS idx_matrix_referrals_member
ON matrix_referrals(member_wallet);

CREATE INDEX IF NOT EXISTS idx_matrix_referrals_position
ON matrix_referrals(matrix_position);

-- =============================================
-- 授权访问视图
-- =============================================

-- 允许应用程序访问新视图
GRANT SELECT ON matrix_referrals_tree_view TO public;

-- =============================================
-- 测试数据验证
-- =============================================

-- 验证视图是否正确创建并包含期望的字段
SELECT
    'matrix_referrals_tree_view' as view_name,
    count(*) as total_records,
    count(DISTINCT matrix_root_wallet) as unique_roots,
    max(matrix_layer) as max_layer,
    count(DISTINCT matrix_position) as unique_positions
FROM matrix_referrals_tree_view;

-- 显示字段结构验证
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'matrix_referrals_tree_view'
ORDER BY ordinal_position;
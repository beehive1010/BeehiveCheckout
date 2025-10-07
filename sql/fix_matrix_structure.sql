-- =============================================
-- Fix Matrix Database Structure for Component Compatibility
-- 修复matrix数据库结构以支持所有前端组件
-- =============================================

-- Step 1: 为matrix_referrals表添加缺失的layer字段
-- =============================================

-- 🚨 重要：matrix_referrals表必须有layer字段支持所有组件
-- 添加layer字段 (如果不存在)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'matrix_referrals' AND column_name = 'layer'
    ) THEN
        -- 添加layer字段，允许NULL以便先计算值
        ALTER TABLE matrix_referrals ADD COLUMN layer INTEGER;

        -- 📊 根据position字符串精确计算layer值
        -- Layer计算逻辑: 数position中'.'的数量 + 1
        UPDATE matrix_referrals SET layer = (
            CASE
                -- Layer 1: 单字符位置 L, M, R
                WHEN position ~ '^[LMR]$' THEN 1

                -- Layer 2: L.L, L.M, L.R, M.L, M.M, M.R, R.L, R.M, R.R
                WHEN position ~ '^[LMR]\.[LMR]$' THEN 2

                -- Layer 3-19: 根据点号数量计算
                ELSE (LENGTH(position) - LENGTH(REPLACE(position, '.', ''))) + 1
            END
        )
        WHERE layer IS NULL;

        -- 🔧 处理特殊情况和验证
        -- 确保layer值在合理范围内 (1-19)
        UPDATE matrix_referrals SET layer = 1
        WHERE layer IS NULL OR layer < 1 OR layer > 19;

        -- 🎯 设置layer字段约束
        ALTER TABLE matrix_referrals ALTER COLUMN layer SET NOT NULL;
        ALTER TABLE matrix_referrals ALTER COLUMN layer SET DEFAULT 1;

        -- 添加检查约束
        ALTER TABLE matrix_referrals ADD CONSTRAINT chk_layer_range
        CHECK (layer >= 1 AND layer <= 19);

        RAISE NOTICE 'Added layer column to matrix_referrals table with range constraint (1-19)';
    ELSE
        -- 如果layer字段已存在，确保所有记录都有正确的layer值
        UPDATE matrix_referrals SET layer = (
            CASE
                WHEN position ~ '^[LMR]$' THEN 1
                WHEN position ~ '^[LMR]\.[LMR]$' THEN 2
                ELSE (LENGTH(position) - LENGTH(REPLACE(position, '.', ''))) + 1
            END
        )
        WHERE layer IS NULL OR layer < 1 OR layer > 19;

        RAISE NOTICE 'Updated existing layer values in matrix_referrals table';
    END IF;
END $$;

-- 🔍 创建函数用于自动计算layer值 (用于新插入的记录)
CREATE OR REPLACE FUNCTION calculate_matrix_layer(position_str TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- 计算position字符串中的层级
    IF position_str ~ '^[LMR]$' THEN
        RETURN 1;
    ELSIF position_str ~ '^[LMR]\.[LMR]$' THEN
        RETURN 2;
    ELSE
        -- 通过点号数量计算层级
        RETURN (LENGTH(position_str) - LENGTH(REPLACE(position_str, '.', ''))) + 1;
    END IF;
END;
$$;

-- 🎯 创建触发器自动设置layer值
CREATE OR REPLACE FUNCTION trigger_set_matrix_layer()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- 自动计算并设置layer值
    NEW.layer := calculate_matrix_layer(NEW.position);

    -- 确保layer值在有效范围内
    IF NEW.layer < 1 OR NEW.layer > 19 THEN
        NEW.layer := 1;
    END IF;

    RETURN NEW;
END;
$$;

-- 删除旧触发器(如果存在)并创建新的
DROP TRIGGER IF EXISTS trg_matrix_referrals_set_layer ON matrix_referrals;

CREATE TRIGGER trg_matrix_referrals_set_layer
    BEFORE INSERT OR UPDATE OF position
    ON matrix_referrals
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_matrix_layer();

-- 添加source字段用于tracking (如果不存在)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'matrix_referrals' AND column_name = 'source'
    ) THEN
        ALTER TABLE matrix_referrals ADD COLUMN source VARCHAR(50) DEFAULT 'manual';
        RAISE NOTICE 'Added source column to matrix_referrals table';
    END IF;
END $$;

-- Step 2: 创建标准化的matrix views
-- =============================================

-- 删除现有views (如果存在)
DROP VIEW IF EXISTS matrix_referrals_tree_view CASCADE;
DROP VIEW IF EXISTS matrix_referrals_view CASCADE;
DROP VIEW IF EXISTS matrix_referrals_unified_view CASCADE;

-- 创建统一的标准matrix view
CREATE OR REPLACE VIEW matrix_referrals_tree_view AS
SELECT
    -- 🎯 组件期望的标准字段名
    mr.layer as matrix_layer,                    -- 标准layer字段
    mr.position as matrix_position,              -- 标准position字段
    mr.member_wallet,                            -- 成员钱包地址
    mr.member_wallet as wallet_address,          -- 组件期望的字段名
    mr.matrix_root_wallet,                       -- matrix根钱包
    mr.parent_wallet,                            -- 直接parent

    -- 🔍 从users表获取referrer和用户信息
    COALESCE(u.referrer_wallet, mr.parent_wallet) as referrer_wallet,
    u.username,                                  -- 用户名显示

    -- 📊 从members表获取激活状态
    CASE
        WHEN m.current_level >= 1 THEN true
        ELSE false
    END as is_active,                            -- 组件期望的字段名
    CASE
        WHEN m.current_level >= 1 THEN true
        ELSE false
    END as is_activated,                         -- 备用字段名

    -- ⏰ 时间字段
    COALESCE(mr.created_at, m.activation_time) as placed_at,  -- 组件期望的字段名
    mr.created_at,                               -- 原始创建时间
    m.activation_time,                           -- 激活时间

    -- 📈 其他重要字段
    m.activation_sequence,                       -- 激活序号
    m.current_level,                            -- 当前等级
    mr.parent_depth as referral_depth,          -- 推荐深度

    -- 🎯 spillover状态判断
    CASE
        WHEN mr.source = 'spillover' THEN true
        WHEN mr.referral_type = 'spillover' THEN true
        ELSE false
    END as is_spillover,

    -- 📋 额外的统计友好字段
    CASE
        WHEN mr.layer = 1 THEN 'Direct'
        WHEN mr.layer = 2 THEN 'Second Level'
        WHEN mr.layer >= 3 THEN 'Deep Level ' || mr.layer
        ELSE 'Unknown'
    END as layer_description,

    CASE
        WHEN mr.position = 'L' THEN 'Left'
        WHEN mr.position = 'M' THEN 'Middle'
        WHEN mr.position = 'R' THEN 'Right'
        WHEN mr.position LIKE '%.L' THEN 'Left Branch'
        WHEN mr.position LIKE '%.M' THEN 'Middle Branch'
        WHEN mr.position LIKE '%.R' THEN 'Right Branch'
        ELSE mr.position
    END as position_description

FROM matrix_referrals mr
LEFT JOIN members m ON m.wallet_address = mr.member_wallet
LEFT JOIN users u ON u.wallet_address = mr.member_wallet

WHERE mr.matrix_root_wallet IS NOT NULL
AND mr.member_wallet IS NOT NULL

ORDER BY
    mr.matrix_root_wallet,
    mr.layer,
    CASE mr.position
        WHEN 'L' THEN 1
        WHEN 'M' THEN 2
        WHEN 'R' THEN 3
        ELSE 4
    END,
    mr.position;

-- Step 3: 创建matrix统计视图
-- =============================================

CREATE OR REPLACE VIEW matrix_layer_stats_view AS
SELECT
    matrix_root_wallet,
    matrix_layer as layer,

    -- 总计数
    COUNT(*) as total_members,
    COUNT(CASE WHEN is_active THEN 1 END) as active_members,

    -- 位置分布
    COUNT(CASE WHEN matrix_position = 'L' OR matrix_position LIKE 'L.%' THEN 1 END) as left_members,
    COUNT(CASE WHEN matrix_position = 'M' OR matrix_position LIKE 'M.%' THEN 1 END) as middle_members,
    COUNT(CASE WHEN matrix_position = 'R' OR matrix_position LIKE 'R.%' THEN 1 END) as right_members,

    -- 容量计算
    POWER(3, matrix_layer) as max_capacity,
    ROUND(
        (COUNT(*)::decimal / POWER(3, matrix_layer)) * 100, 2
    ) as fill_percentage,

    -- 激活率
    ROUND(
        (COUNT(CASE WHEN is_active THEN 1 END)::decimal / COUNT(*)) * 100, 2
    ) as activation_rate,

    -- 状态
    CASE
        WHEN COUNT(*) = POWER(3, matrix_layer) THEN 'completed'
        WHEN COUNT(*) > 0 THEN 'ActiveMember'
        ELSE 'empty'
    END as layer_status

FROM matrix_referrals_tree_view
GROUP BY matrix_root_wallet, matrix_layer
ORDER BY matrix_root_wallet, matrix_layer;

-- Step 4: 创建索引优化性能
-- =============================================

-- 为新字段创建索引
CREATE INDEX IF NOT EXISTS idx_matrix_referrals_layer
ON matrix_referrals(layer);

CREATE INDEX IF NOT EXISTS idx_matrix_referrals_root_layer
ON matrix_referrals(matrix_root_wallet, layer);

CREATE INDEX IF NOT EXISTS idx_matrix_referrals_member_layer
ON matrix_referrals(member_wallet, layer);

CREATE INDEX IF NOT EXISTS idx_matrix_referrals_position_layer
ON matrix_referrals(position, layer);

-- Step 5: 授权和安全
-- =============================================

-- 授权新视图访问
GRANT SELECT ON matrix_referrals_tree_view TO public;
GRANT SELECT ON matrix_layer_stats_view TO public;

-- Step 6: 数据验证和测试
-- =============================================

-- 验证数据完整性
SELECT
    'matrix_referrals_tree_view' as view_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT matrix_root_wallet) as unique_roots,
    MIN(matrix_layer) as min_layer,
    MAX(matrix_layer) as max_layer,
    COUNT(DISTINCT matrix_position) as unique_positions,
    COUNT(CASE WHEN is_active THEN 1 END) as active_members
FROM matrix_referrals_tree_view;

-- 验证layer分布
SELECT
    matrix_layer,
    COUNT(*) as members_count,
    POWER(3, matrix_layer) as max_capacity,
    ROUND((COUNT(*)::decimal / POWER(3, matrix_layer)) * 100, 2) as fill_rate
FROM matrix_referrals_tree_view
GROUP BY matrix_layer
ORDER BY matrix_layer;

-- 验证position分布
SELECT
    CASE
        WHEN matrix_position ~ '^[LMR]$' THEN 'Level 1: ' || matrix_position
        WHEN matrix_position ~ '^[LMR]\.[LMR]$' THEN 'Level 2: ' || matrix_position
        ELSE 'Other: ' || matrix_position
    END as position_type,
    COUNT(*) as count
FROM matrix_referrals_tree_view
GROUP BY
    CASE
        WHEN matrix_position ~ '^[LMR]$' THEN 'Level 1: ' || matrix_position
        WHEN matrix_position ~ '^[LMR]\.[LMR]$' THEN 'Level 2: ' || matrix_position
        ELSE 'Other: ' || matrix_position
    END
ORDER BY position_type;

RAISE NOTICE 'Matrix structure fix completed successfully';
RAISE NOTICE 'Views created: matrix_referrals_tree_view, matrix_layer_stats_view';
RAISE NOTICE 'Indexes created for performance optimization';
RAISE NOTICE 'Data validation completed';
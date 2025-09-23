-- 🔧 修正Matrix安置逻辑
-- 问题：当前的L-M-R分配不符合3x3矩阵规则
-- 正确规则：Layer 1只能有3个位置，满了才滑落到Layer 2

-- 第一步：创建正确的安置位置分配函数
CREATE OR REPLACE FUNCTION calculate_correct_matrix_position(
    root_wallet text,
    member_sequence integer
) RETURNS TABLE(layer integer, position text) AS $$
DECLARE
    remaining_sequence integer := member_sequence - 1; -- 从0开始计数
    current_layer integer := 1;
    layer_capacity integer;
    accumulated_capacity integer := 0;
BEGIN
    -- 找到正确的层级
    WHILE remaining_sequence >= accumulated_capacity LOOP
        layer_capacity := POWER(3, current_layer)::integer;
        
        IF remaining_sequence < accumulated_capacity + layer_capacity THEN
            -- 找到了正确的层级
            EXIT;
        END IF;
        
        accumulated_capacity := accumulated_capacity + layer_capacity;
        current_layer := current_layer + 1;
        
        -- 安全限制：最多19层
        IF current_layer > 19 THEN
            current_layer := 19;
            EXIT;
        END IF;
    END LOOP;
    
    -- 计算在当前层级中的位置
    DECLARE
        position_in_layer integer := remaining_sequence - accumulated_capacity;
        positions_per_section integer := POWER(3, current_layer - 1)::integer;
        position_result text;
    BEGIN
        IF position_in_layer < positions_per_section THEN
            position_result := 'L';
        ELSIF position_in_layer < positions_per_section * 2 THEN
            position_result := 'M';
        ELSE
            position_result := 'R';
        END IF;
        
        RETURN QUERY SELECT current_layer, position_result;
    END;
END;
$$ LANGUAGE plpgsql;

-- 第二步：创建修正后的递归推荐树视图
DROP VIEW IF EXISTS recursive_referral_tree_19_layers CASCADE;

CREATE VIEW recursive_referral_tree_19_layers AS
WITH referral_sequence AS (
    -- 为每个referral分配序号（按时间顺序）
    SELECT 
        referrer_wallet,
        referred_wallet,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY referrer_wallet ORDER BY created_at) as sequence
    FROM referrals_new
    WHERE referred_wallet <> '0x0000000000000000000000000000000000000001'
),
member_positions AS (
    -- 为每个会员计算正确的matrix位置
    SELECT 
        rs.*,
        u.username,
        m.current_level,
        m.activation_time,
        pos.layer,
        pos.position
    FROM referral_sequence rs
    LEFT JOIN users u ON u.wallet_address = rs.referred_wallet
    LEFT JOIN members m ON m.wallet_address = rs.referred_wallet
    CROSS JOIN LATERAL calculate_correct_matrix_position(rs.referrer_wallet, rs.sequence) as pos
),
RECURSIVE referral_tree AS (
    -- Base: 每个激活会员作为root
    SELECT 
        m.wallet_address as tree_root,
        m.wallet_address as member_wallet,
        u.username,
        m.current_level,
        m.activation_time,
        0 as layer,
        'root'::text as position,
        ARRAY[m.wallet_address]::text[] as path
    FROM members m
    LEFT JOIN users u ON u.wallet_address = m.wallet_address
    WHERE m.current_level > 0
    
    UNION ALL
    
    -- Recursive: 使用正确的位置分配
    SELECT 
        rt.tree_root,
        mp.referred_wallet,
        mp.username,
        mp.current_level,
        mp.activation_time,
        mp.layer,
        mp.position,
        rt.path || mp.referred_wallet::text
    FROM referral_tree rt
    JOIN member_positions mp ON mp.referrer_wallet = rt.member_wallet
    WHERE mp.layer <= 19
        AND NOT mp.referred_wallet = ANY(rt.path)
)
SELECT tree_root, member_wallet, username, current_level, activation_time, layer, position 
FROM referral_tree 
ORDER BY tree_root, layer, position;

-- 添加说明
COMMENT ON VIEW recursive_referral_tree_19_layers IS 
'正确的3x3矩阵安置：
- Layer 1: 最多3个位置 (L=1, M=1, R=1)
- Layer 2: 最多9个位置 (L=3, M=3, R=3)  
- Layer n: 最多3^n个位置
- 安置顺序: 先填满当前层，再滑落到下一层';
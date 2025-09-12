-- 基于激活时间顺序的混合安置系统
-- ========================================
-- 核心逻辑：按激活时间处理所有成员，溢出和直推统一排队
-- ========================================

CREATE OR REPLACE FUNCTION rebuild_matrix_by_activation_time()
RETURNS TEXT AS $$
DECLARE
    member_rec RECORD;
    target_matrix_rec RECORD;
    current_layer INTEGER;
    current_position CHAR(1);
    position_count INTEGER;
    parent_wallet VARCHAR(42);
    total_placed INTEGER := 0;
    position_found BOOLEAN;
    positions CHAR(1)[] := ARRAY['L','M','R'];
    pos_idx INTEGER;
    placement_queue RECORD[];
    queue_item RECORD;
BEGIN
    -- 清空现有referrals表
    DELETE FROM referrals;
    
    -- 按激活时间处理每个成员
    FOR member_rec IN
        SELECT 
            m.wallet_address,
            m.referrer_wallet,
            m.current_level,
            m.created_at,
            rr.root_referrer,
            rr.depth_level
        FROM members m
        JOIN recursive_referrals rr ON m.wallet_address = rr.member_wallet
        WHERE m.current_level > 0
        AND m.wallet_address != rr.root_referrer  -- 排除根自己
        ORDER BY m.created_at  -- 关键：按激活时间顺序
    LOOP
        -- 为该成员在所有需要的矩阵中找位置
        -- 1. 在直接推荐人的矩阵中（如果是直推）
        -- 2. 在所有上级的矩阵中（递归安置）
        
        FOR target_matrix_rec IN
            SELECT DISTINCT root_referrer as matrix_root
            FROM recursive_referrals
            WHERE member_wallet = member_rec.wallet_address
        LOOP
            current_layer := 1;
            position_found := false;
            
            -- 在目标矩阵中寻找下一个可用位置
            WHILE current_layer <= 19 AND NOT position_found LOOP
                pos_idx := 1;
                
                WHILE pos_idx <= 3 AND NOT position_found LOOP
                    current_position := positions[pos_idx];
                    
                    -- 检查位置是否已占用
                    SELECT COUNT(*) INTO position_count
                    FROM referrals 
                    WHERE matrix_root = target_matrix_rec.matrix_root
                    AND matrix_layer = current_layer
                    AND matrix_position = current_position;
                    
                    -- 如果位置可用，则安置
                    IF position_count = 0 THEN
                        -- 确定matrix_parent
                        IF current_layer = 1 THEN
                            parent_wallet := target_matrix_rec.matrix_root;
                        ELSE
                            -- 找到上层对应位置的成员作为parent
                            SELECT member_wallet INTO parent_wallet
                            FROM referrals 
                            WHERE matrix_root = target_matrix_rec.matrix_root
                            AND matrix_layer = current_layer - 1
                            AND matrix_position = current_position
                            LIMIT 1;
                            
                            -- 如果没找到对应位置，使用同层其他位置或根
                            IF parent_wallet IS NULL THEN
                                SELECT member_wallet INTO parent_wallet
                                FROM referrals 
                                WHERE matrix_root = target_matrix_rec.matrix_root
                                AND matrix_layer = current_layer - 1
                                LIMIT 1;
                                
                                -- 还是没找到就用根
                                IF parent_wallet IS NULL THEN
                                    parent_wallet := target_matrix_rec.matrix_root;
                                END IF;
                            END IF;
                        END IF;
                        
                        -- 插入矩阵记录
                        INSERT INTO referrals (
                            member_wallet,
                            referrer_wallet,
                            matrix_root,
                            matrix_parent,
                            matrix_layer,
                            matrix_position,
                            is_direct_referral,
                            direct_referrer_wallet,
                            is_spillover_placed,
                            placed_at
                        ) VALUES (
                            member_rec.wallet_address,
                            member_rec.referrer_wallet,
                            target_matrix_rec.matrix_root,
                            parent_wallet,
                            current_layer,
                            current_position,
                            (member_rec.referrer_wallet = target_matrix_rec.matrix_root), -- 是否是该矩阵根的直推
                            CASE 
                                WHEN member_rec.referrer_wallet = target_matrix_rec.matrix_root THEN target_matrix_rec.matrix_root
                                ELSE NULL
                            END,
                            (current_layer > 1 OR member_rec.referrer_wallet != target_matrix_rec.matrix_root), -- 溢出标记
                            member_rec.created_at
                        );
                        
                        total_placed := total_placed + 1;
                        position_found := true;
                        
                        -- 记录安置信息
                        RAISE NOTICE '成员 % 在 % 矩阵的 Layer%-% 位置安置 (激活时间: %)', 
                            SUBSTRING(member_rec.wallet_address, 1, 8),
                            SUBSTRING(target_matrix_rec.matrix_root, 1, 8),
                            current_layer,
                            current_position,
                            member_rec.created_at;
                    END IF;
                    
                    pos_idx := pos_idx + 1;
                END LOOP;
                
                current_layer := current_layer + 1;
            END LOOP;
        END LOOP;
    END LOOP;
    
    RETURN format('按激活时间重新安置了%s个矩阵位置', total_placed);
END;
$$ LANGUAGE plpgsql;

-- 执行重建
SELECT rebuild_matrix_by_activation_time() as "激活时间安置结果";

-- 验证结果：Root矩阵的安置顺序
SELECT '=== Root矩阵按激活时间安置验证 ===' as section;

SELECT 
    member_wallet,
    SUBSTRING(member_wallet, 1, 8) || '...' as short_address,
    matrix_layer,
    matrix_position,
    is_direct_referral,
    is_spillover_placed,
    placed_at as activation_time
FROM referrals 
WHERE matrix_root LIKE '0x000%0001'
ORDER BY placed_at;  -- 按激活时间排序，验证安置顺序

-- 验证结果：检查A成员激活后的矩阵状态
SELECT '=== 成员矩阵可用位置状态 ===' as section;

SELECT 
    matrix_root,
    SUBSTRING(matrix_root, 1, 8) || '...' as root_short,
    matrix_layer,
    COUNT(*) FILTER (WHERE matrix_position = 'L') as L_filled,
    COUNT(*) FILTER (WHERE matrix_position = 'M') as M_filled,
    COUNT(*) FILTER (WHERE matrix_position = 'R') as R_filled,
    CASE 
        WHEN COUNT(*) FILTER (WHERE matrix_position = 'L') = 0 THEN 'L'
        WHEN COUNT(*) FILTER (WHERE matrix_position = 'M') = 0 THEN 'M' 
        WHEN COUNT(*) FILTER (WHERE matrix_position = 'R') = 0 THEN 'R'
        ELSE 'FULL'
    END as next_available
FROM referrals
GROUP BY matrix_root, matrix_layer
ORDER BY matrix_root, matrix_layer;

-- 模拟场景验证
SELECT '=== 激活顺序场景分析 ===' as scenario;

WITH activation_sequence AS (
    SELECT 
        wallet_address,
        SUBSTRING(wallet_address, 1, 8) || '...' as member_short,
        referrer_wallet,
        SUBSTRING(referrer_wallet, 1, 8) || '...' as referrer_short,
        created_at,
        ROW_NUMBER() OVER (ORDER BY created_at) as activation_order
    FROM members 
    WHERE current_level > 0
    ORDER BY created_at
)
SELECT 
    activation_order,
    member_short,
    referrer_short,
    created_at,
    '激活' as event
FROM activation_sequence
LIMIT 10;
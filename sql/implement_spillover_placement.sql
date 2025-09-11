-- 实现滑落排放系统 (Spillover Placement System)
-- 基于MarketingPlan.md的规则：L → M → R 优先级，找到第一个不完整的下线层级

-- 清空当前矩阵记录，重新按滑落规则构建
DELETE FROM referrals WHERE matrix_root IS NOT NULL;

CREATE OR REPLACE FUNCTION implement_spillover_placement()
RETURNS TABLE(
    summary text,
    total_placements integer,
    spillover_details text
) AS $$
DECLARE
    member_rec RECORD;
    placement_rec RECORD;
    placement_found BOOLEAN;
    current_layer INTEGER;
    total_placed INTEGER := 0;
    spillover_info TEXT := '';
BEGIN
    RAISE NOTICE '开始实施滑落排放系统...';
    
    -- 按照激活顺序（根据钱包地址排序模拟）处理每个成员
    FOR member_rec IN 
        SELECT wallet_address, referrer_wallet, current_level 
        FROM members 
        WHERE current_level > 0 
        AND referrer_wallet IS NOT NULL
        AND referrer_wallet != wallet_address  -- 避免自引用
        ORDER BY wallet_address  -- 模拟激活顺序
    LOOP
        placement_found := FALSE;
        current_layer := 1;
        
        RAISE NOTICE '正在为成员 % 寻找滑落位置，推荐人: %', 
            member_rec.wallet_address, member_rec.referrer_wallet;
        
        -- 滑落算法：从推荐人开始，找到第一个不完整的位置
        WHILE current_layer <= 19 AND NOT placement_found LOOP
            -- 在当前层级寻找不完整的位置（L → M → R 优先级）
            FOR placement_rec IN
                WITH RECURSIVE spillover_search AS (
                    -- 起点：推荐人作为第0层
                    SELECT 
                        member_rec.referrer_wallet as current_root,
                        0 as search_layer
                    
                    UNION ALL
                    
                    -- 递归：在每一层寻找不完整的成员
                    SELECT DISTINCT
                        r.member_wallet as current_root,
                        ss.search_layer + 1 as search_layer
                    FROM spillover_search ss
                    JOIN referrals r ON r.matrix_root = ss.current_root
                    WHERE ss.search_layer < current_layer - 1
                      AND r.matrix_layer = ss.search_layer + 1
                ),
                -- 找到当前层级中位置不满的成员（优先级：L → M → R）
                incomplete_positions AS (
                    SELECT 
                        ss.current_root,
                        COALESCE(COUNT(r.id), 0) as current_count,
                        CASE 
                            WHEN COUNT(CASE WHEN r.matrix_position = 'L' THEN 1 END) = 0 THEN 'L'
                            WHEN COUNT(CASE WHEN r.matrix_position = 'M' THEN 1 END) = 0 THEN 'M'
                            WHEN COUNT(CASE WHEN r.matrix_position = 'R' THEN 1 END) = 0 THEN 'R'
                            ELSE NULL
                        END as next_position
                    FROM spillover_search ss
                    LEFT JOIN referrals r ON r.matrix_root = ss.current_root AND r.matrix_layer = 1
                    WHERE ss.search_layer = current_layer - 1
                    GROUP BY ss.current_root
                    HAVING COUNT(r.id) < 3  -- 还有空位
                )
                SELECT 
                    current_root as placement_root,
                    next_position,
                    current_count
                FROM incomplete_positions 
                WHERE next_position IS NOT NULL
                ORDER BY current_count ASC  -- 优先填充位置最少的
                LIMIT 1
            LOOP
                -- 找到了滑落位置，执行放置
                INSERT INTO referrals (
                    matrix_root,
                    member_wallet,
                    referrer_wallet,
                    matrix_layer,
                    matrix_position,
                    placed_at,
                    is_active
                ) VALUES (
                    placement_rec.placement_root,
                    member_rec.wallet_address,
                    member_rec.referrer_wallet,
                    1,  -- 总是放在第一层
                    placement_rec.next_position,
                    NOW(),
                    true
                );
                
                placement_found := TRUE;
                total_placed := total_placed + 1;
                
                spillover_info := spillover_info || 
                    format('成员 %s 滑落到 %s 的 %s 位置 | ', 
                        member_rec.wallet_address, 
                        placement_rec.placement_root,
                        placement_rec.next_position);
                
                RAISE NOTICE '成员 % 已放置到矩阵根 % 的 % 位置（第%层搜索）', 
                    member_rec.wallet_address, placement_rec.placement_root, 
                    placement_rec.next_position, current_layer;
                
                EXIT; -- 找到位置后退出循环
            END LOOP;
            
            current_layer := current_layer + 1;
        END LOOP;
        
        -- 如果没有找到滑落位置，直接放在推荐人下面
        IF NOT placement_found THEN
            -- 获取推荐人当前的位置数量
            SELECT COUNT(*) INTO current_layer
            FROM referrals 
            WHERE matrix_root = member_rec.referrer_wallet 
            AND matrix_layer = 1;
            
            INSERT INTO referrals (
                matrix_root,
                member_wallet,
                referrer_wallet,
                matrix_layer,
                matrix_position,
                placed_at,
                is_active
            ) VALUES (
                member_rec.referrer_wallet,
                member_rec.wallet_address,
                member_rec.referrer_wallet,
                1,
                CASE 
                    WHEN current_layer % 3 = 0 THEN 'L'
                    WHEN current_layer % 3 = 1 THEN 'M'
                    ELSE 'R'
                END,
                NOW(),
                true
            );
            
            total_placed := total_placed + 1;
            spillover_info := spillover_info || 
                format('成员 %s 直接放置在推荐人 %s 下 | ', 
                    member_rec.wallet_address, member_rec.referrer_wallet);
                    
            RAISE NOTICE '成员 % 直接放置在推荐人 % 下', 
                member_rec.wallet_address, member_rec.referrer_wallet;
        END IF;
    END LOOP;
    
    -- 生成递归记录
    PERFORM generate_recursive_matrix_from_layer1();
    
    RETURN QUERY SELECT 
        '滑落排放系统实施完成'::text as summary,
        total_placed as total_placements,
        spillover_info::text as spillover_details;
END;
$$ LANGUAGE plpgsql;

-- 辅助函数：从第一层生成递归矩阵记录
CREATE OR REPLACE FUNCTION generate_recursive_matrix_from_layer1()
RETURNS void AS $$
DECLARE
    layer1_rec RECORD;
BEGIN
    -- 为每个第一层成员在其上级矩阵中创建递归记录
    FOR layer1_rec IN
        SELECT DISTINCT member_wallet, matrix_root
        FROM referrals 
        WHERE matrix_layer = 1
    LOOP
        -- 递归向上创建记录
        WITH RECURSIVE upline_path AS (
            -- 找到该成员的推荐链
            SELECT 
                layer1_rec.member_wallet as member_addr,
                m.referrer_wallet as ancestor_addr,
                1 as ancestor_layer
            FROM members m
            WHERE m.wallet_address = layer1_rec.member_wallet
            AND m.referrer_wallet IS NOT NULL
            AND m.referrer_wallet != m.wallet_address
            
            UNION ALL
            
            SELECT 
                up.member_addr,
                m.referrer_wallet as ancestor_addr,
                up.ancestor_layer + 1
            FROM upline_path up
            JOIN members m ON m.wallet_address = up.ancestor_addr
            WHERE up.ancestor_layer < 19
            AND m.referrer_wallet IS NOT NULL
            AND m.referrer_wallet != m.wallet_address
            AND m.referrer_wallet != up.member_addr  -- 避免循环
        )
        INSERT INTO referrals (
            matrix_root,
            member_wallet,
            referrer_wallet,
            matrix_layer,
            matrix_position,
            placed_at,
            is_active
        )
        SELECT DISTINCT
            up.ancestor_addr as matrix_root,
            up.member_addr as member_wallet,
            layer1_rec.matrix_root as referrer_wallet,  -- 直接推荐人
            up.ancestor_layer as matrix_layer,
            CASE 
                WHEN ROW_NUMBER() OVER (PARTITION BY up.ancestor_addr, up.ancestor_layer ORDER BY up.member_addr) % 3 = 1 THEN 'L'
                WHEN ROW_NUMBER() OVER (PARTITION BY up.ancestor_addr, up.ancestor_layer ORDER BY up.member_addr) % 3 = 2 THEN 'M'
                ELSE 'R'
            END,
            NOW(),
            true
        FROM upline_path up
        WHERE up.ancestor_addr != layer1_rec.member_wallet  -- 不包括自己
        ON CONFLICT (member_wallet, matrix_root) DO NOTHING;
        
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 执行滑落排放系统
SELECT * FROM implement_spillover_placement();

-- 验证结果
SELECT 
    '滑落排放验证' as 验证类型,
    COUNT(*) as 总记录数,
    COUNT(DISTINCT matrix_root) as 矩阵根数,
    MAX(matrix_layer) as 最大层级
FROM referrals;
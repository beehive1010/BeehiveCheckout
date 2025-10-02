-- 简化版滑落逻辑 - 避免复杂数组操作
-- 实现真正的三三滑落matrix

-- 1. 清理数据
DELETE FROM referrals;

-- 2. 创建简化的滑落matrix函数
CREATE OR REPLACE FUNCTION build_simple_spillover_matrix()
RETURNS void AS $$
DECLARE
    member_rec RECORD;
    matrix_owner_wallet TEXT;
    target_layer INTEGER;
    current_count INTEGER;
    max_capacity INTEGER;
    position_char TEXT;
    position_count INTEGER;
BEGIN
    RAISE NOTICE '开始构建简化滑落matrix...';
    
    -- 按时间顺序处理每个活跃会员
    FOR member_rec IN 
        SELECT 
            m.wallet_address,
            m.referrer_wallet,
            m.created_at,
            COALESCE(u.username, 'Member_' || RIGHT(m.wallet_address, 4)) as member_name
        FROM members m
        LEFT JOIN users u ON m.wallet_address = u.wallet_address
        WHERE m.referrer_wallet IS NOT NULL
        AND m.wallet_address != m.referrer_wallet
        ORDER BY m.created_at ASC
    LOOP
        RAISE NOTICE '处理会员: %', member_rec.member_name;
        
        -- 为每个matrix owner创建记录
        matrix_owner_wallet := member_rec.referrer_wallet;
        
        WHILE matrix_owner_wallet IS NOT NULL LOOP
            -- 确保matrix_owner是活跃会员
            IF EXISTS (SELECT 1 FROM members WHERE wallet_address = matrix_owner_wallet) THEN
                
                -- 从Layer 1开始查找可用位置
                target_layer := 1;
                
                WHILE target_layer <= 19 LOOP
                    -- 计算该层最大容量 (3^layer)
                    max_capacity := POWER(3, target_layer);
                    
                    -- 计算该层当前成员数
                    SELECT COUNT(*) INTO current_count
                    FROM referrals 
                    WHERE matrix_root = matrix_owner_wallet 
                    AND matrix_layer = target_layer;
                    
                    -- 如果该层有空位
                    IF current_count < max_capacity THEN
                        -- 计算该层的位置分配
                        SELECT COUNT(*) INTO position_count
                        FROM referrals 
                        WHERE matrix_root = matrix_owner_wallet 
                        AND matrix_layer = target_layer;
                        
                        -- 按L→M→R循环分配
                        position_char := CASE (position_count % 3)
                            WHEN 0 THEN 'L'
                            WHEN 1 THEN 'M'
                            WHEN 2 THEN 'R'
                        END;
                        
                        -- 插入matrix记录
                        INSERT INTO referrals (
                            member_wallet,
                            referrer_wallet,
                            matrix_root,
                            matrix_layer,
                            matrix_position,
                            is_active,
                            placed_at
                        ) VALUES (
                            member_rec.wallet_address,
                            member_rec.referrer_wallet,
                            matrix_owner_wallet,
                            target_layer,
                            position_char,
                            true,
                            member_rec.created_at
                        );
                        
                        RAISE NOTICE '  放置在%的matrix Layer%位置% (容量:%/%)', 
                            (SELECT COALESCE(username, 'Member_' || RIGHT(matrix_owner_wallet, 4)) FROM users WHERE wallet_address = matrix_owner_wallet),
                            target_layer,
                            position_char,
                            current_count + 1,
                            max_capacity;
                        
                        EXIT; -- 找到位置后退出层级循环
                    END IF;
                    
                    target_layer := target_layer + 1;
                END LOOP;
                
                -- 移动到下一个matrix owner
                SELECT referrer_wallet INTO matrix_owner_wallet
                FROM members 
                WHERE wallet_address = matrix_owner_wallet
                AND referrer_wallet IS NOT NULL
                AND referrer_wallet != wallet_address;
            ELSE
                EXIT;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '滑落matrix构建完成！';
END;
$$ LANGUAGE plpgsql;

-- 3. 执行构建
SELECT build_simple_spillover_matrix();
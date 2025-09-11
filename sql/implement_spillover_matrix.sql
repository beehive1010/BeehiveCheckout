-- 实现真正的三三滑落逻辑，形成新的递归树表
-- 每个referrer的layer 1只有L/M/R三个位置，满了就滑落到下层

BEGIN;

-- 1. 查看当前原始推荐关系
SELECT '=== 当前原始推荐关系 (未应用滑落) ===' as step;
SELECT 
    'TestUser001' as matrix_owner,
    string_agg(
        COALESCE(u.username, 'Member_' || RIGHT(r.member_wallet, 4)) || 
        '(L' || r.matrix_layer || '-' || r.matrix_position || ')', 
        ', ' ORDER BY r.matrix_layer, r.matrix_position
    ) as current_members
FROM referrals r
LEFT JOIN users u ON r.member_wallet = u.wallet_address
WHERE r.matrix_root = (SELECT wallet_address FROM users WHERE username = 'TestUser001')
GROUP BY matrix_owner;

-- 2. 清理当前数据，准备重建滑落matrix
DELETE FROM referrals;

-- 3. 创建真正的滑落逻辑函数
CREATE OR REPLACE FUNCTION build_spillover_matrix()
RETURNS void AS $$
DECLARE
    member_rec RECORD;
    matrix_owner_wallet TEXT;
    target_layer INTEGER;
    target_position TEXT;
    current_layer_count INTEGER;
    max_layer_capacity INTEGER;
    available_positions TEXT[];
    selected_position TEXT;
BEGIN
    RAISE NOTICE '开始构建真正的滑落matrix...';
    
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
        RAISE NOTICE '处理会员: % (推荐人: %)', 
            member_rec.member_name,
            (SELECT COALESCE(username, 'Member_' || RIGHT(member_rec.referrer_wallet, 4)) FROM users WHERE wallet_address = member_rec.referrer_wallet);
        
        -- 找到该会员应该被放置在哪些matrix中（递归上级链）
        matrix_owner_wallet := member_rec.referrer_wallet;
        target_layer := 1;
        
        WHILE matrix_owner_wallet IS NOT NULL AND target_layer <= 19 LOOP
            -- 确保matrix_owner是活跃会员
            IF EXISTS (SELECT 1 FROM members WHERE wallet_address = matrix_owner_wallet) THEN
                
                -- 从Layer 1开始查找可用位置
                FOR check_layer IN 1..19 LOOP
                    -- 计算该层的最大容量 (3^layer)
                    max_layer_capacity := POWER(3, check_layer);
                    
                    -- 计算该层当前已有成员数
                    SELECT COUNT(*) INTO current_layer_count
                    FROM referrals 
                    WHERE matrix_root = matrix_owner_wallet 
                    AND matrix_layer = check_layer;
                    
                    -- 如果该层还有空位
                    IF current_layer_count < max_layer_capacity THEN
                        -- 查找该层可用的L/M/R位置
                        available_positions := ARRAY[]::TEXT[];
                        
                        -- 检查L位置
                        IF NOT EXISTS (
                            SELECT 1 FROM referrals 
                            WHERE matrix_root = matrix_owner_wallet 
                            AND matrix_layer = check_layer 
                            AND matrix_position = 'L'
                        ) THEN
                            available_positions := available_positions || 'L';
                        END IF;
                        
                        -- 检查M位置
                        IF NOT EXISTS (
                            SELECT 1 FROM referrals 
                            WHERE matrix_root = matrix_owner_wallet 
                            AND matrix_layer = check_layer 
                            AND matrix_position = 'M'
                        ) THEN
                            available_positions := available_positions || 'M';
                        END IF;
                        
                        -- 检查R位置
                        IF NOT EXISTS (
                            SELECT 1 FROM referrals 
                            WHERE matrix_root = matrix_owner_wallet 
                            AND matrix_layer = check_layer 
                            AND matrix_position = 'R'
                        ) THEN
                            available_positions := available_positions || 'R';
                        END IF;
                        
                        -- 如果有可用位置，选择第一个
                        IF array_length(available_positions, 1) > 0 THEN
                            selected_position := available_positions[1];
                            
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
                                check_layer,
                                selected_position,
                                true,
                                member_rec.created_at
                            );
                            
                            RAISE NOTICE '  在%的matrix Layer%位置%放置%', 
                                (SELECT COALESCE(username, 'Member_' || RIGHT(matrix_owner_wallet, 4)) FROM users WHERE wallet_address = matrix_owner_wallet),
                                check_layer,
                                selected_position,
                                member_rec.member_name;
                            
                            EXIT; -- 找到位置后退出层级循环
                        END IF;
                    END IF;
                END LOOP;
                
                -- 移动到下一个matrix owner（上级的推荐人）
                SELECT referrer_wallet INTO matrix_owner_wallet
                FROM members 
                WHERE wallet_address = matrix_owner_wallet
                AND referrer_wallet IS NOT NULL
                AND referrer_wallet != wallet_address;
                
                target_layer := target_layer + 1;
            ELSE
                EXIT; -- 如果不是活跃会员，退出
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '滑落matrix构建完成！';
END;
$$ LANGUAGE plpgsql;

-- 4. 执行滑落matrix构建
SELECT '=== 执行滑落matrix构建 ===' as step;
SELECT build_spillover_matrix();

-- 5. 验证滑落结果
SELECT '=== 验证滑落后的Matrix结构 ===' as step;
SELECT 
    COALESCE(u_root.username, 'Member_' || RIGHT(r.matrix_root, 4)) as "Matrix Root",
    r.matrix_layer as "层级",
    r.matrix_position as "位置",
    COALESCE(u_member.username, 'Member_' || RIGHT(r.member_wallet, 4)) as "会员",
    POWER(3, r.matrix_layer) as "该层容量"
FROM referrals r
LEFT JOIN users u_root ON r.matrix_root = u_root.wallet_address
LEFT JOIN users u_member ON r.member_wallet = u_member.wallet_address
ORDER BY r.matrix_root, r.matrix_layer, 
    CASE r.matrix_position WHEN 'L' THEN 1 WHEN 'M' THEN 2 WHEN 'R' THEN 3 END;

-- 6. 检查每层的容量使用情况
SELECT '=== 检查各层容量使用情况 ===' as step;
SELECT 
    r.matrix_root as "Matrix Root",
    COALESCE(u.username, 'Member_' || RIGHT(r.matrix_root, 4)) as "Root名称",
    r.matrix_layer as "层级",
    COUNT(*) as "当前成员数",
    POWER(3, r.matrix_layer) as "最大容量",
    ROUND(COUNT(*) * 100.0 / POWER(3, r.matrix_layer), 2) as "使用率%"
FROM referrals r
LEFT JOIN users u ON r.matrix_root = u.wallet_address
GROUP BY r.matrix_root, u.username, r.matrix_layer
ORDER BY r.matrix_root, r.matrix_layer;

-- 7. 验证滑落逻辑是否正确
SELECT '=== 验证滑落逻辑是否正确 ===' as step;

-- 检查每层是否超出3^layer的容量限制
WITH layer_capacity_check AS (
    SELECT 
        matrix_root,
        matrix_layer,
        COUNT(*) as actual_count,
        POWER(3, matrix_layer) as max_capacity,
        CASE 
            WHEN COUNT(*) <= POWER(3, matrix_layer) THEN '✅ 正常'
            ELSE '❌ 超出容量'
        END as status
    FROM referrals
    GROUP BY matrix_root, matrix_layer
)
SELECT 
    COALESCE(u.username, 'Member_' || RIGHT(lcc.matrix_root, 4)) as "Matrix Root",
    lcc.matrix_layer as "层级",
    lcc.actual_count as "实际成员数",
    lcc.max_capacity as "最大容量",
    lcc.status as "状态"
FROM layer_capacity_check lcc
LEFT JOIN users u ON lcc.matrix_root = u.wallet_address
ORDER BY lcc.matrix_root, lcc.matrix_layer;

COMMIT;
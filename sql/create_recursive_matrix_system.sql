-- 创建真正的递归推荐树系统
-- 当A推荐B，B推荐C，C推荐D时，每个人都成为其下级的matrix_root

BEGIN;

-- 示例说明：
-- 推荐链: A → B → C → D → E → F
-- 
-- 生成的matrix记录:
-- A为root: B(layer1), C(layer2), D(layer3), E(layer4), F(layer5)
-- B为root: C(layer1), D(layer2), E(layer3), F(layer4) 
-- C为root: D(layer1), E(layer2), F(layer3)
-- D为root: E(layer1), F(layer2)
-- E为root: F(layer1)

-- 创建递归matrix生成函数
CREATE OR REPLACE FUNCTION generate_recursive_matrix_records()
RETURNS void AS $$
DECLARE
    member_record RECORD;
    downline_record RECORD;
    layer_num INTEGER;
    current_position TEXT;
    position_counter INTEGER;
BEGIN
    -- 清空现有的matrix记录（保留直接推荐关系）
    RAISE NOTICE '开始生成递归matrix记录...';
    
    -- 遍历每个会员作为matrix_root
    FOR member_record IN 
        SELECT DISTINCT member_wallet, username, referrer_wallet, created_at
        FROM referrals 
        WHERE member_wallet IS NOT NULL
        ORDER BY created_at ASC
    LOOP
        RAISE NOTICE '处理会员: % 作为matrix_root', member_record.member_wallet;
        layer_num := 1;
        position_counter := 0;
        
        -- 使用递归CTE找到该会员的所有下级（直接和间接）
        WITH RECURSIVE downline_tree AS (
            -- 基础案例：直接推荐的人
            SELECT 
                member_wallet,
                username,
                referrer_wallet,
                created_at,
                1 as level,
                ARRAY[member_wallet] as path
            FROM referrals 
            WHERE referrer_wallet = member_record.member_wallet
            
            UNION ALL
            
            -- 递归案例：下级的下级
            SELECT 
                r.member_wallet,
                r.username,
                r.referrer_wallet,
                r.created_at,
                dt.level + 1,
                dt.path || r.member_wallet
            FROM referrals r
            INNER JOIN downline_tree dt ON r.referrer_wallet = dt.member_wallet
            WHERE dt.level < 19  -- 限制最大层数
              AND NOT r.member_wallet = ANY(dt.path)  -- 防止循环
        )
        INSERT INTO referrals (
            member_wallet,
            username, 
            referrer_wallet,
            matrix_root,
            matrix_layer,
            matrix_position,
            is_active,
            created_at,
            updated_at
        )
        SELECT 
            dt.member_wallet,
            dt.username,
            dt.referrer_wallet,
            member_record.member_wallet as matrix_root,
            dt.level as matrix_layer,
            -- 计算L-M-R位置（按每层顺序分配）
            CASE ((ROW_NUMBER() OVER (PARTITION BY dt.level ORDER BY dt.created_at) - 1) % 3)
                WHEN 0 THEN 'L'
                WHEN 1 THEN 'M' 
                WHEN 2 THEN 'R'
            END as matrix_position,
            true as is_active,
            dt.created_at,
            NOW() as updated_at
        FROM downline_tree dt
        WHERE dt.level <= 19
        ORDER BY dt.level, dt.created_at
        -- 避免重复插入
        ON CONFLICT (member_wallet, matrix_root, matrix_layer) 
        DO UPDATE SET
            matrix_position = EXCLUDED.matrix_position,
            updated_at = NOW();
            
        -- 记录生成的记录数
        GET DIAGNOSTICS position_counter = ROW_COUNT;
        RAISE NOTICE '  为matrix_root % 生成了 % 条记录', member_record.member_wallet, position_counter;
    END LOOP;
    
    RAISE NOTICE '递归matrix记录生成完成！';
END;
$$ LANGUAGE plpgsql;

-- 创建滑落机制处理函数
CREATE OR REPLACE FUNCTION apply_spillover_mechanism()
RETURNS void AS $$
DECLARE
    matrix_root_record RECORD;
    layer_record RECORD;
    spillover_member RECORD;
    available_position TEXT;
    target_layer INTEGER;
BEGIN
    RAISE NOTICE '开始应用滑落机制...';
    
    -- 遍历每个matrix_root
    FOR matrix_root_record IN 
        SELECT DISTINCT matrix_root 
        FROM referrals 
        WHERE matrix_root IS NOT NULL
    LOOP
        -- 检查每一层是否超出容量
        FOR layer_record IN
            SELECT 
                matrix_layer,
                COUNT(*) as member_count,
                POWER(3, matrix_layer) as max_capacity
            FROM referrals 
            WHERE matrix_root = matrix_root_record.matrix_root
            GROUP BY matrix_layer
            HAVING COUNT(*) > POWER(3, matrix_layer)
            ORDER BY matrix_layer
        LOOP
            RAISE NOTICE '  Matrix % Layer % 超出容量: %/%', 
                matrix_root_record.matrix_root, 
                layer_record.matrix_layer,
                layer_record.member_count,
                layer_record.max_capacity;
            
            -- 处理超出的会员，将他们滑落到下一层
            FOR spillover_member IN
                SELECT member_wallet, created_at
                FROM referrals 
                WHERE matrix_root = matrix_root_record.matrix_root
                AND matrix_layer = layer_record.matrix_layer
                ORDER BY created_at DESC
                LIMIT (layer_record.member_count - layer_record.max_capacity)
            LOOP
                -- 找到下一个可用的层和位置
                target_layer := layer_record.matrix_layer + 1;
                
                WHILE target_layer <= 19 LOOP
                    -- 检查目标层是否有空位
                    SELECT COUNT(*) INTO available_position
                    FROM referrals 
                    WHERE matrix_root = matrix_root_record.matrix_root
                    AND matrix_layer = target_layer;
                    
                    IF available_position < POWER(3, target_layer) THEN
                        -- 计算新位置
                        available_position := CASE (available_position % 3)
                            WHEN 0 THEN 'L'
                            WHEN 1 THEN 'M'
                            WHEN 2 THEN 'R'
                        END;
                        
                        -- 更新会员到新层级
                        UPDATE referrals 
                        SET 
                            matrix_layer = target_layer,
                            matrix_position = available_position,
                            updated_at = NOW()
                        WHERE matrix_root = matrix_root_record.matrix_root
                        AND member_wallet = spillover_member.member_wallet
                        AND matrix_layer = layer_record.matrix_layer;
                        
                        RAISE NOTICE '    滑落: % 从Layer%移动到Layer% 位置%', 
                            spillover_member.member_wallet,
                            layer_record.matrix_layer,
                            target_layer,
                            available_position;
                        EXIT;
                    END IF;
                    
                    target_layer := target_layer + 1;
                END LOOP;
            END LOOP;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '滑落机制应用完成！';
END;
$$ LANGUAGE plpgsql;

-- 创建示例数据测试函数
CREATE OR REPLACE FUNCTION create_test_referral_chain()
RETURNS void AS $$
BEGIN
    -- 清空测试数据
    DELETE FROM referrals WHERE member_wallet LIKE '0xTEST%';
    
    -- 创建推荐链: A → B → C → D → E → F
    INSERT INTO referrals (member_wallet, username, referrer_wallet, is_active, created_at) VALUES
    ('0xTEST_A', 'Test_User_A', NULL, true, NOW() - INTERVAL '6 days'),
    ('0xTEST_B', 'Test_User_B', '0xTEST_A', true, NOW() - INTERVAL '5 days'),
    ('0xTEST_C', 'Test_User_C', '0xTEST_B', true, NOW() - INTERVAL '4 days'),
    ('0xTEST_D', 'Test_User_D', '0xTEST_C', true, NOW() - INTERVAL '3 days'),
    ('0xTEST_E', 'Test_User_E', '0xTEST_D', true, NOW() - INTERVAL '2 days'),
    ('0xTEST_F', 'Test_User_F', '0xTEST_E', true, NOW() - INTERVAL '1 day');
    
    RAISE NOTICE '测试推荐链创建完成: A → B → C → D → E → F';
END;
$$ LANGUAGE plpgsql;

-- 验证递归matrix结构的视图
CREATE OR REPLACE VIEW recursive_matrix_verification AS
SELECT 
    matrix_root,
    matrix_layer,
    matrix_position,
    member_wallet,
    username,
    referrer_wallet,
    created_at
FROM referrals 
WHERE matrix_root IS NOT NULL
ORDER BY 
    matrix_root,
    matrix_layer,
    CASE matrix_position 
        WHEN 'L' THEN 1 
        WHEN 'M' THEN 2 
        WHEN 'R' THEN 3 
        ELSE 4 
    END,
    created_at;

-- 执行测试
SELECT '=== 创建测试数据 ===' as step;
SELECT create_test_referral_chain();

SELECT '=== 生成递归matrix记录 ===' as step;
SELECT generate_recursive_matrix_records();

SELECT '=== 应用滑落机制 ===' as step;
SELECT apply_spillover_mechanism();

SELECT '=== 验证结果 ===' as step;
SELECT 
    matrix_root,
    'Layer ' || matrix_layer as layer,
    matrix_position,
    member_wallet,
    username
FROM recursive_matrix_verification 
WHERE matrix_root LIKE '0xTEST%'
ORDER BY matrix_root, matrix_layer, matrix_position;

COMMIT;
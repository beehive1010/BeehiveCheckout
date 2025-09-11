-- 自动生成matrix记录的触发器系统
-- 当新会员被推荐时，自动在所有上级的matrix中创建对应记录

BEGIN;

-- 创建单个会员加入时的matrix记录生成函数
CREATE OR REPLACE FUNCTION generate_matrix_records_for_new_member(
    p_new_member_wallet TEXT,
    p_new_member_username TEXT,
    p_referrer_wallet TEXT
) RETURNS void AS $$
DECLARE
    ancestor_record RECORD;
    layer_in_ancestor_matrix INTEGER;
    position_in_layer TEXT;
    members_in_layer INTEGER;
BEGIN
    RAISE NOTICE '为新会员 % 生成matrix记录，推荐人：%', p_new_member_wallet, p_referrer_wallet;
    
    -- 使用递归CTE找到所有祖先（上级链）
    WITH RECURSIVE ancestor_chain AS (
        -- 基础案例：直接推荐人
        SELECT 
            member_wallet as ancestor_wallet,
            username as ancestor_username,
            referrer_wallet,
            1 as distance_from_new_member
        FROM referrals 
        WHERE member_wallet = p_referrer_wallet
        
        UNION ALL
        
        -- 递归案例：推荐人的推荐人
        SELECT 
            r.member_wallet,
            r.username,
            r.referrer_wallet,
            ac.distance_from_new_member + 1
        FROM referrals r
        INNER JOIN ancestor_chain ac ON r.member_wallet = ac.referrer_wallet
        WHERE ac.distance_from_new_member < 19  -- 限制最大追溯层数
    )
    -- 为每个祖先创建matrix记录
    FOR ancestor_record IN 
        SELECT * FROM ancestor_chain ORDER BY distance_from_new_member
    LOOP
        layer_in_ancestor_matrix := ancestor_record.distance_from_new_member;
        
        -- 计算在该层的位置数量
        SELECT COUNT(*) INTO members_in_layer
        FROM referrals 
        WHERE matrix_root = ancestor_record.ancestor_wallet 
        AND matrix_layer = layer_in_ancestor_matrix;
        
        -- 检查层容量
        IF members_in_layer >= POWER(3, layer_in_ancestor_matrix) THEN
            -- 层已满，查找下一个可用层（滑落机制）
            WHILE layer_in_ancestor_matrix <= 19 LOOP
                layer_in_ancestor_matrix := layer_in_ancestor_matrix + 1;
                
                SELECT COUNT(*) INTO members_in_layer
                FROM referrals 
                WHERE matrix_root = ancestor_record.ancestor_wallet 
                AND matrix_layer = layer_in_ancestor_matrix;
                
                IF members_in_layer < POWER(3, layer_in_ancestor_matrix) THEN
                    EXIT; -- 找到可用层
                END IF;
            END LOOP;
        END IF;
        
        -- 如果找到可用层，计算L-M-R位置
        IF layer_in_ancestor_matrix <= 19 THEN
            position_in_layer := CASE (members_in_layer % 3)
                WHEN 0 THEN 'L'
                WHEN 1 THEN 'M'
                WHEN 2 THEN 'R'
            END;
            
            -- 插入matrix记录
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
            ) VALUES (
                p_new_member_wallet,
                p_new_member_username,
                p_referrer_wallet,
                ancestor_record.ancestor_wallet,
                layer_in_ancestor_matrix,
                position_in_layer,
                true,
                NOW(),
                NOW()
            )
            ON CONFLICT (member_wallet, matrix_root, matrix_layer) 
            DO UPDATE SET
                matrix_position = EXCLUDED.matrix_position,
                updated_at = NOW();
                
            RAISE NOTICE '  在 % 的matrix中添加 % 到Layer% 位置%', 
                ancestor_record.ancestor_wallet,
                p_new_member_wallet,
                layer_in_ancestor_matrix,
                position_in_layer;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器函数，在新推荐发生时自动生成matrix记录
CREATE OR REPLACE FUNCTION trigger_generate_matrix_records()
RETURNS TRIGGER AS $$
BEGIN
    -- 只有当记录有推荐人时才生成matrix记录
    IF NEW.referrer_wallet IS NOT NULL THEN
        PERFORM generate_matrix_records_for_new_member(
            NEW.member_wallet,
            NEW.username,
            NEW.referrer_wallet
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器（如果不存在）
DROP TRIGGER IF EXISTS auto_generate_matrix_on_insert ON referrals;
CREATE TRIGGER auto_generate_matrix_on_insert
    AFTER INSERT ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_matrix_records();

-- 创建手动重建所有matrix记录的函数
CREATE OR REPLACE FUNCTION rebuild_all_matrix_records()
RETURNS void AS $$
DECLARE
    member_record RECORD;
BEGIN
    RAISE NOTICE '开始重建所有matrix记录...';
    
    -- 删除所有现有的matrix记录，保留基础推荐关系
    DELETE FROM referrals WHERE matrix_root IS NOT NULL;
    
    -- 按时间顺序处理每个会员
    FOR member_record IN 
        SELECT member_wallet, username, referrer_wallet, created_at
        FROM referrals 
        WHERE referrer_wallet IS NOT NULL
        ORDER BY created_at ASC
    LOOP
        RAISE NOTICE '重建会员 % 的matrix记录', member_record.member_wallet;
        
        PERFORM generate_matrix_records_for_new_member(
            member_record.member_wallet,
            member_record.username,
            member_record.referrer_wallet
        );
    END LOOP;
    
    RAISE NOTICE 'Matrix记录重建完成！';
END;
$$ LANGUAGE plpgsql;

-- 创建matrix统计视图
CREATE OR REPLACE VIEW matrix_statistics AS
SELECT 
    matrix_root,
    COUNT(*) as total_downlines,
    COUNT(DISTINCT matrix_layer) as active_layers,
    MAX(matrix_layer) as deepest_layer,
    COUNT(CASE WHEN matrix_position = 'L' THEN 1 END) as left_positions,
    COUNT(CASE WHEN matrix_position = 'M' THEN 1 END) as middle_positions,
    COUNT(CASE WHEN matrix_position = 'R' THEN 1 END) as right_positions,
    COUNT(CASE WHEN is_active THEN 1 END) as active_members
FROM referrals 
WHERE matrix_root IS NOT NULL
GROUP BY matrix_root
ORDER BY total_downlines DESC;

-- 创建特定会员matrix查看函数
CREATE OR REPLACE FUNCTION view_member_matrix(p_wallet_address TEXT)
RETURNS TABLE(
    layer INTEGER,
    position TEXT,
    member_wallet TEXT,
    username TEXT,
    join_date TIMESTAMP,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.matrix_layer as layer,
        r.matrix_position as position,
        r.member_wallet,
        r.username,
        r.created_at as join_date,
        r.is_active
    FROM referrals r
    WHERE r.matrix_root = p_wallet_address
    ORDER BY r.matrix_layer, 
        CASE r.matrix_position 
            WHEN 'L' THEN 1 
            WHEN 'M' THEN 2 
            WHEN 'R' THEN 3 
            ELSE 4 
        END,
        r.created_at;
END;
$$ LANGUAGE plpgsql;

-- 测试示例
SELECT '=== 测试递归推荐链和matrix生成 ===' as step;

-- 清空测试数据
DELETE FROM referrals WHERE member_wallet LIKE '0xRECURSIVE%';

-- 手动插入推荐链测试（不触发自动生成，因为我们要看效果）
ALTER TABLE referrals DISABLE TRIGGER auto_generate_matrix_on_insert;

INSERT INTO referrals (member_wallet, username, referrer_wallet, is_active, created_at) VALUES
('0xRECURSIVE_A', 'Recursive_A', NULL, true, NOW() - INTERVAL '6 hours'),
('0xRECURSIVE_B', 'Recursive_B', '0xRECURSIVE_A', true, NOW() - INTERVAL '5 hours'),
('0xRECURSIVE_C', 'Recursive_C', '0xRECURSIVE_B', true, NOW() - INTERVAL '4 hours'),
('0xRECURSIVE_D', 'Recursive_D', '0xRECURSIVE_C', true, NOW() - INTERVAL '3 hours'),
('0xRECURSIVE_E', 'Recursive_E', '0xRECURSIVE_D', true, NOW() - INTERVAL '2 hours'),
('0xRECURSIVE_F', 'Recursive_F', '0xRECURSIVE_E', true, NOW() - INTERVAL '1 hour');

ALTER TABLE referrals ENABLE TRIGGER auto_generate_matrix_on_insert;

-- 使用重建函数生成所有matrix记录
SELECT rebuild_all_matrix_records();

-- 查看结果
SELECT '=== Matrix Statistics ===' as info;
SELECT * FROM matrix_statistics WHERE matrix_root LIKE '0xRECURSIVE%';

SELECT '=== A的Matrix (应该有B,C,D,E,F) ===' as info;
SELECT * FROM view_member_matrix('0xRECURSIVE_A');

SELECT '=== B的Matrix (应该有C,D,E,F) ===' as info;
SELECT * FROM view_member_matrix('0xRECURSIVE_B');

SELECT '=== C的Matrix (应该有D,E,F) ===' as info;
SELECT * FROM view_member_matrix('0xRECURSIVE_C');

COMMIT;
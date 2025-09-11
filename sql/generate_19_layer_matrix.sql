-- Generate Complete 19-Layer Matrix Records
-- 确保每个会员的19层矩阵都被完整记录

-- 清空现有的矩阵记录
DELETE FROM referrals WHERE matrix_root IS NOT NULL;

-- 创建递归函数来生成19层矩阵
CREATE OR REPLACE FUNCTION generate_19_layer_matrix()
RETURNS TABLE(
    summary text,
    total_members integer,
    total_records_created integer,
    layers_completed integer
) AS $$
DECLARE
    member_rec RECORD;
    total_members_count INTEGER := 0;
    total_records_count INTEGER := 0;
    max_layers_found INTEGER := 0;
BEGIN
    -- 获取所有活跃会员数量
    SELECT COUNT(*) INTO total_members_count FROM members WHERE current_level > 0;
    
    -- 为每个活跃会员生成完整的19层矩阵
    FOR member_rec IN 
        SELECT wallet_address, referrer_wallet, current_level 
        FROM members 
        WHERE current_level > 0 
        ORDER BY wallet_address
    LOOP
        -- 为当前会员生成19层矩阵记录
        WITH RECURSIVE member_matrix AS (
            -- 第1层：直接推荐的会员
            SELECT 
                m.wallet_address as descendant_wallet,
                m.referrer_wallet as descendant_referrer,
                member_rec.wallet_address as matrix_root,
                1 as layer_num,
                ROW_NUMBER() OVER (ORDER BY m.wallet_address) as position_num
            FROM members m
            WHERE m.referrer_wallet = member_rec.wallet_address
              AND m.current_level > 0
            
            UNION ALL
            
            -- 第2-19层：递归获取间接推荐的会员
            SELECT 
                m.wallet_address as descendant_wallet,
                m.referrer_wallet as descendant_referrer,
                mm.matrix_root,
                mm.layer_num + 1 as layer_num,
                ROW_NUMBER() OVER (ORDER BY m.wallet_address) as position_num
            FROM members m
            INNER JOIN member_matrix mm ON m.referrer_wallet = mm.descendant_wallet
            WHERE mm.layer_num < 19
              AND m.current_level > 0
        )
        -- 插入矩阵记录
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
            matrix_root,
            descendant_wallet,
            descendant_referrer,
            layer_num,
            CASE 
                WHEN position_num % 3 = 1 THEN 'L'
                WHEN position_num % 3 = 2 THEN 'M'
                ELSE 'R'
            END,
            NOW(),
            true
        FROM member_matrix
        WHERE layer_num <= 19
        ON CONFLICT (member_wallet, matrix_root) DO NOTHING;
        
        -- 更新统计
        GET DIAGNOSTICS total_records_count = ROW_COUNT;
        
        -- 获取当前会员的最深层级
        SELECT COALESCE(MAX(matrix_layer), 0) INTO max_layers_found
        FROM referrals 
        WHERE matrix_root = member_rec.wallet_address;
        
        -- 进度提示
        IF total_records_count % 50 = 0 THEN
            RAISE NOTICE '已处理会员 %, 当前总记录数: %', member_rec.wallet_address, total_records_count;
        END IF;
    END LOOP;
    
    -- 获取最终统计
    SELECT COUNT(*) INTO total_records_count FROM referrals;
    SELECT MAX(matrix_layer) INTO max_layers_found FROM referrals;
    
    RETURN QUERY SELECT 
        '19层矩阵生成完成'::text as summary,
        total_members_count as total_members,
        total_records_count as total_records_created,
        max_layers_found as layers_completed;
END;
$$ LANGUAGE plpgsql;

-- 执行19层矩阵生成
SELECT * FROM generate_19_layer_matrix();

-- 验证结果 - 显示每个矩阵根的层级分布
SELECT 
    '矩阵分布验证' as verification_type,
    COUNT(DISTINCT matrix_root) as 矩阵根数量,
    COUNT(*) as 总记录数,
    MIN(matrix_layer) as 最小层级,
    MAX(matrix_layer) as 最大层级,
    COUNT(DISTINCT matrix_position) as 位置类型数量
FROM referrals;

-- 显示各层级的详细分布
SELECT 
    matrix_layer as 层级,
    COUNT(*) as 记录数,
    COUNT(CASE WHEN matrix_position = 'L' THEN 1 END) as L位置,
    COUNT(CASE WHEN matrix_position = 'M' THEN 1 END) as M位置,
    COUNT(CASE WHEN matrix_position = 'R' THEN 1 END) as R位置
FROM referrals
WHERE matrix_root IS NOT NULL
GROUP BY matrix_layer
ORDER BY matrix_layer;

-- 显示每个矩阵根的19层完整性
SELECT 
    matrix_root as 矩阵根,
    COUNT(*) as 总下级数,
    COUNT(CASE WHEN matrix_layer = 1 THEN 1 END) as 第1层,
    COUNT(CASE WHEN matrix_layer = 2 THEN 1 END) as 第2层,
    COUNT(CASE WHEN matrix_layer = 3 THEN 1 END) as 第3层,
    COUNT(CASE WHEN matrix_layer BETWEEN 4 AND 9 THEN 1 END) as 第4到9层,
    COUNT(CASE WHEN matrix_layer BETWEEN 10 AND 19 THEN 1 END) as 第10到19层,
    MAX(matrix_layer) as 最深层级
FROM referrals
WHERE matrix_root IS NOT NULL
GROUP BY matrix_root
ORDER BY 总下级数 DESC;
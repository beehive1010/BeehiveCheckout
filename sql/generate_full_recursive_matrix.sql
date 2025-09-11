-- 生成完整的递归矩阵记录 - 每个会员都应该在所有上级的矩阵中出现

-- 清空现有记录重新开始
DELETE FROM referrals WHERE matrix_root IS NOT NULL;

CREATE OR REPLACE FUNCTION generate_full_recursive_matrix()
RETURNS TABLE(
    summary text,
    total_members integer,
    total_records_created integer,
    max_depth integer
) AS $$
DECLARE
    member_rec RECORD;
    ancestor_rec RECORD;
    total_members_count INTEGER := 0;
    total_records_count INTEGER := 0;
    max_depth_found INTEGER := 0;
    position_counter INTEGER;
BEGIN
    -- 获取所有活跃会员数量
    SELECT COUNT(*) INTO total_members_count FROM members WHERE current_level > 0;
    RAISE NOTICE '开始为 % 个会员生成完整递归矩阵', total_members_count;
    
    -- 对每个会员，在所有可能的上级矩阵中创建记录
    FOR member_rec IN 
        SELECT wallet_address, referrer_wallet, current_level 
        FROM members 
        WHERE current_level > 0 
        ORDER BY wallet_address
    LOOP
        -- 找到此会员的所有上级（祖先），并在每个祖先的矩阵中创建记录
        FOR ancestor_rec IN
            WITH RECURSIVE ancestor_chain AS (
                -- 起点：会员自己作为第0层
                SELECT 
                    member_rec.wallet_address as member_wallet,
                    member_rec.referrer_wallet as ancestor_wallet,
                    member_rec.referrer_wallet as immediate_referrer,
                    1 as layer_from_ancestor
                FROM members 
                WHERE wallet_address = member_rec.wallet_address
                AND referrer_wallet IS NOT NULL
                AND referrer_wallet != wallet_address -- 避免自引用
                
                UNION ALL
                
                -- 递归：找到更高层的祖先
                SELECT 
                    ac.member_wallet,
                    m.referrer_wallet as ancestor_wallet,
                    ac.immediate_referrer,
                    ac.layer_from_ancestor + 1 as layer_from_ancestor
                FROM ancestor_chain ac
                JOIN members m ON m.wallet_address = ac.ancestor_wallet
                WHERE ac.layer_from_ancestor < 19
                AND m.referrer_wallet IS NOT NULL 
                AND m.referrer_wallet != m.wallet_address -- 避免自引用
                AND m.referrer_wallet != ac.member_wallet -- 避免循环引用
            )
            SELECT DISTINCT
                member_wallet,
                ancestor_wallet as matrix_root,
                immediate_referrer,
                layer_from_ancestor
            FROM ancestor_chain
            WHERE ancestor_wallet IS NOT NULL
              AND layer_from_ancestor <= 19
        LOOP
            -- 计算位置分配
            SELECT 
                COALESCE(COUNT(*), 0) + 1 INTO position_counter
            FROM referrals 
            WHERE matrix_root = ancestor_rec.matrix_root
            AND matrix_layer = ancestor_rec.layer_from_ancestor;
            
            -- 插入矩阵记录
            INSERT INTO referrals (
                matrix_root,
                member_wallet,
                referrer_wallet,
                matrix_layer,
                matrix_position,
                placed_at,
                is_active
            ) VALUES (
                ancestor_rec.matrix_root,
                ancestor_rec.member_wallet,
                ancestor_rec.immediate_referrer,
                ancestor_rec.layer_from_ancestor,
                CASE 
                    WHEN position_counter % 3 = 1 THEN 'L'
                    WHEN position_counter % 3 = 2 THEN 'M'
                    ELSE 'R'
                END,
                NOW(),
                true
            ) ON CONFLICT (member_wallet, matrix_root) DO NOTHING;
            
            -- 更新最大深度
            IF ancestor_rec.layer_from_ancestor > max_depth_found THEN
                max_depth_found := ancestor_rec.layer_from_ancestor;
            END IF;
        END LOOP;
        
        -- 进度报告
        IF total_members_count % 5 = 0 THEN
            RAISE NOTICE '已处理会员: %', member_rec.wallet_address;
        END IF;
    END LOOP;
    
    -- 获取最终统计
    SELECT COUNT(*) INTO total_records_count FROM referrals;
    
    RETURN QUERY SELECT 
        '完整递归矩阵生成完成'::text as summary,
        total_members_count as total_members,
        total_records_count as total_records_created,
        max_depth_found as max_depth;
END;
$$ LANGUAGE plpgsql;

-- 执行完整递归矩阵生成
SELECT * FROM generate_full_recursive_matrix();

-- 验证结果
SELECT 
    '验证：每个会员的递归记录' as 检查类型,
    m.wallet_address as 会员地址,
    COUNT(r.id) as 出现在矩阵中的次数,
    ARRAY_AGG(DISTINCT r.matrix_root ORDER BY r.matrix_root) as 出现在哪些矩阵根中,
    ARRAY_AGG(DISTINCT r.matrix_layer ORDER BY r.matrix_layer) as 出现在哪些层级
FROM members m
LEFT JOIN referrals r ON r.member_wallet = m.wallet_address
WHERE m.current_level > 0
GROUP BY m.wallet_address
ORDER BY COUNT(r.id) DESC, m.wallet_address;

-- 总体统计
SELECT 
    '最终统计' as 统计类型,
    COUNT(DISTINCT matrix_root) as 矩阵根数量,
    COUNT(*) as 总矩阵记录数,
    COUNT(DISTINCT member_wallet) as 参与矩阵的会员数,
    MIN(matrix_layer) as 最小层级,
    MAX(matrix_layer) as 最大层级
FROM referrals;
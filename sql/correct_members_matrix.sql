-- 正确基于members表重建递归matrix
-- 只有active members才能加入matrix tree并触发rewards

-- 1. 清理错误数据
DELETE FROM referrals;

-- 2. 创建基于members表的正确递归matrix生成函数
CREATE OR REPLACE FUNCTION build_members_recursive_matrix()
RETURNS void AS $$
DECLARE
    member_rec RECORD;
    ancestor_wallet TEXT;
    current_layer INTEGER;
    position_char TEXT;
    layer_count INTEGER;
BEGIN
    RAISE NOTICE '开始基于members表构建递归matrix...';
    
    -- 只处理members表中的活跃会员
    FOR member_rec IN 
        SELECT 
            wallet_address,
            referrer_wallet,
            created_at
        FROM members 
        WHERE referrer_wallet IS NOT NULL
        AND wallet_address != referrer_wallet  -- 排除自我推荐
        ORDER BY created_at
    LOOP
        RAISE NOTICE '处理活跃会员: %', 
            (SELECT COALESCE(username, 'Member_' || RIGHT(member_rec.wallet_address, 4)) FROM users WHERE wallet_address = member_rec.wallet_address);
        
        -- 为该活跃会员在其所有上级的matrix中创建记录
        ancestor_wallet := member_rec.referrer_wallet;
        current_layer := 1;
        
        -- 向上遍历最多19层
        WHILE ancestor_wallet IS NOT NULL AND current_layer <= 19 LOOP
            -- 确保ancestor也是活跃会员
            IF EXISTS (SELECT 1 FROM members WHERE wallet_address = ancestor_wallet) THEN
                -- 计算在该祖先的matrix中该层已有多少成员
                SELECT COUNT(*) INTO layer_count
                FROM referrals 
                WHERE matrix_root = ancestor_wallet 
                AND matrix_layer = current_layer;
                
                -- 按L-M-R循环分配位置
                position_char := CASE (layer_count % 3)
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
                    ancestor_wallet,
                    current_layer,
                    position_char,
                    true,
                    member_rec.created_at
                );
                
                RAISE NOTICE '  在活跃会员%的matrix Layer%添加%到位置%', 
                    (SELECT COALESCE(username, 'Member_' || RIGHT(ancestor_wallet, 4)) FROM users WHERE wallet_address = ancestor_wallet),
                    current_layer,
                    (SELECT COALESCE(username, 'Member_' || RIGHT(member_rec.wallet_address, 4)) FROM users WHERE wallet_address = member_rec.wallet_address),
                    position_char;
                
                -- 查找上级的推荐人（必须也是活跃会员）
                SELECT referrer_wallet INTO ancestor_wallet
                FROM members 
                WHERE wallet_address = ancestor_wallet
                AND referrer_wallet IS NOT NULL
                AND referrer_wallet != wallet_address;
            ELSE
                -- 如果ancestor不是活跃会员，停止向上遍历
                EXIT;
            END IF;
            
            current_layer := current_layer + 1;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '基于活跃会员的递归matrix构建完成！';
END;
$$ LANGUAGE plpgsql;

-- 3. 执行基于members的matrix构建
SELECT build_members_recursive_matrix();
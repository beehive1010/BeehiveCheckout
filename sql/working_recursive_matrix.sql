-- 最终工作版本：基于users表重建递归matrix
-- 避免所有数组和复杂递归问题

-- 1. 清理现有数据
DELETE FROM referrals;

-- 2. 创建并执行简单的递归matrix生成
CREATE OR REPLACE FUNCTION build_recursive_matrix()
RETURNS void AS $$
DECLARE
    user_rec RECORD;
    ancestor_wallet TEXT;
    current_layer INTEGER;
    position_char TEXT;
    layer_count INTEGER;
BEGIN
    RAISE NOTICE '开始构建递归matrix...';
    
    -- 处理每个有推荐人的用户
    FOR user_rec IN 
        SELECT 
            wallet_address,
            referrer_wallet,
            username,
            created_at
        FROM users 
        WHERE referrer_wallet IS NOT NULL
        AND wallet_address != referrer_wallet  -- 排除自我推荐
        ORDER BY created_at
    LOOP
        RAISE NOTICE '处理用户: %', COALESCE(user_rec.username, 'User_' || RIGHT(user_rec.wallet_address, 4));
        
        -- 为该用户在其所有上级的matrix中创建记录
        ancestor_wallet := user_rec.referrer_wallet;
        current_layer := 1;
        
        -- 向上遍历最多19层
        WHILE ancestor_wallet IS NOT NULL AND current_layer <= 19 LOOP
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
                user_rec.wallet_address,
                user_rec.referrer_wallet,
                ancestor_wallet,
                current_layer,
                position_char,
                true,
                user_rec.created_at
            );
            
            RAISE NOTICE '  在%的matrix Layer%添加%到位置%', 
                (SELECT COALESCE(username, 'User_' || RIGHT(ancestor_wallet, 4)) FROM users WHERE wallet_address = ancestor_wallet),
                current_layer,
                COALESCE(user_rec.username, 'User_' || RIGHT(user_rec.wallet_address, 4)),
                position_char;
            
            -- 查找上级的推荐人（下一个祖先）
            SELECT referrer_wallet INTO ancestor_wallet
            FROM users 
            WHERE wallet_address = ancestor_wallet
            AND referrer_wallet IS NOT NULL
            AND referrer_wallet != wallet_address;  -- 防止自我推荐
            
            current_layer := current_layer + 1;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '递归matrix构建完成！';
END;
$$ LANGUAGE plpgsql;

-- 3. 执行构建
SELECT build_recursive_matrix();
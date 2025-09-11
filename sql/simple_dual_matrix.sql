-- 简化版：原始归递 + 滑落matrix 双表系统

BEGIN;

-- 1. 重建referrals表为原始归递关系
DELETE FROM referrals;

-- 生成原始归递关系（基于真实推荐链，不考虑容量限制）
DO $$
DECLARE
    member_rec RECORD;
    ancestor_wallet TEXT;
    layer_num INTEGER;
    position_char TEXT;
    layer_count INTEGER;
BEGIN
    -- 处理每个活跃会员
    FOR member_rec IN 
        SELECT wallet_address, referrer_wallet, created_at
        FROM members 
        WHERE referrer_wallet IS NOT NULL
        AND wallet_address != referrer_wallet
        ORDER BY created_at
    LOOP
        -- 在每个祖先的matrix中创建记录
        ancestor_wallet := member_rec.referrer_wallet;
        layer_num := 1;
        
        WHILE ancestor_wallet IS NOT NULL AND layer_num <= 19 LOOP
            IF EXISTS (SELECT 1 FROM members WHERE wallet_address = ancestor_wallet) THEN
                -- 计算位置
                SELECT COUNT(*) INTO layer_count
                FROM referrals 
                WHERE matrix_root = ancestor_wallet 
                AND matrix_layer = layer_num;
                
                position_char := CASE (layer_count % 3)
                    WHEN 0 THEN 'L'
                    WHEN 1 THEN 'M'
                    WHEN 2 THEN 'R'
                END;
                
                -- 插入原始归递记录
                INSERT INTO referrals (
                    member_wallet, referrer_wallet, matrix_root, 
                    matrix_layer, matrix_position, is_active, placed_at
                ) VALUES (
                    member_rec.wallet_address, member_rec.referrer_wallet, ancestor_wallet,
                    layer_num, position_char, true, member_rec.created_at
                );
                
                -- 找下一个祖先
                SELECT referrer_wallet INTO ancestor_wallet
                FROM members 
                WHERE wallet_address = ancestor_wallet
                AND referrer_wallet IS NOT NULL
                AND referrer_wallet != wallet_address;
                
                layer_num := layer_num + 1;
            ELSE
                EXIT;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- 2. 创建滑落matrix表
DROP TABLE IF EXISTS spillover_matrix;
CREATE TABLE spillover_matrix (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_wallet character varying(42) NOT NULL,
    referrer_wallet character varying(42) NOT NULL,
    matrix_root character varying(42) NOT NULL,
    matrix_layer integer NOT NULL,
    matrix_position character varying(1) CHECK (matrix_position IN ('L', 'M', 'R')),
    original_layer integer, -- 原本应该在的层级
    is_active boolean DEFAULT true,
    placed_at timestamp with time zone DEFAULT now()
);

-- 3. 生成滑落matrix数据
DO $$
DECLARE
    member_rec RECORD;
    matrix_owner_wallet TEXT;
    check_layer INTEGER;
    max_capacity INTEGER;
    current_count INTEGER;
    position_char TEXT;
    position_count INTEGER;
    original_layer INTEGER;
BEGIN
    -- 处理每个活跃会员
    FOR member_rec IN 
        SELECT wallet_address, referrer_wallet, created_at
        FROM members 
        WHERE referrer_wallet IS NOT NULL
        AND wallet_address != referrer_wallet
        ORDER BY created_at
    LOOP
        -- 为每个matrix owner创建滑落记录
        matrix_owner_wallet := member_rec.referrer_wallet;
        original_layer := 1;
        
        WHILE matrix_owner_wallet IS NOT NULL LOOP
            IF EXISTS (SELECT 1 FROM members WHERE wallet_address = matrix_owner_wallet) THEN
                
                -- 从Layer 1开始找可用位置（滑落逻辑）
                check_layer := 1;
                
                WHILE check_layer <= 19 LOOP
                    max_capacity := POWER(3, check_layer);
                    
                    SELECT COUNT(*) INTO current_count
                    FROM spillover_matrix 
                    WHERE matrix_root = matrix_owner_wallet 
                    AND matrix_layer = check_layer;
                    
                    -- 如果该层有空位
                    IF current_count < max_capacity THEN
                        position_char := CASE (current_count % 3)
                            WHEN 0 THEN 'L'
                            WHEN 1 THEN 'M'
                            WHEN 2 THEN 'R'
                        END;
                        
                        -- 插入滑落matrix记录
                        INSERT INTO spillover_matrix (
                            member_wallet, referrer_wallet, matrix_root,
                            matrix_layer, matrix_position, original_layer,
                            is_active, placed_at
                        ) VALUES (
                            member_rec.wallet_address, member_rec.referrer_wallet, matrix_owner_wallet,
                            check_layer, position_char, original_layer,
                            true, member_rec.created_at
                        );
                        
                        EXIT; -- 找到位置后退出
                    END IF;
                    
                    check_layer := check_layer + 1;
                END LOOP;
                
                -- 移动到下一个matrix owner
                SELECT referrer_wallet INTO matrix_owner_wallet
                FROM members 
                WHERE wallet_address = matrix_owner_wallet
                AND referrer_wallet IS NOT NULL
                AND referrer_wallet != wallet_address;
                
                original_layer := original_layer + 1;
            ELSE
                EXIT;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- 4. 查看结果
SELECT '=== 原始归递关系表 (referrals) ===' as table_info;
SELECT COUNT(*) || ' 条记录' as count FROM referrals;

SELECT '=== 滑落matrix表 (spillover_matrix) ===' as table_info;
SELECT COUNT(*) || ' 条记录' as count FROM spillover_matrix;

COMMIT;
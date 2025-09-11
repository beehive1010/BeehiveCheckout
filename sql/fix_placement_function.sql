-- 修复安置系统函数 (移除GOTO，使用循环控制)
-- ========================================
CREATE OR REPLACE FUNCTION place_members_with_spillover()
RETURNS TEXT AS $$
DECLARE
    member_rec RECORD;
    root_rec RECORD;
    current_layer INTEGER;
    current_position CHAR(1);
    position_count INTEGER;
    total_placed INTEGER := 0;
    position_found BOOLEAN;
    positions CHAR(1)[] := ARRAY['L','M','R'];
    pos_idx INTEGER;
BEGIN
    -- 为每个root处理其直推成员的安置
    FOR root_rec IN 
        SELECT wallet_address 
        FROM members 
        WHERE current_level > 0
        ORDER BY wallet_address
    LOOP
        -- 获取该root的所有直推成员
        FOR member_rec IN
            SELECT member_wallet, direct_referrer_wallet
            FROM referrals 
            WHERE matrix_root = root_rec.wallet_address
            AND is_direct_referral = true
            ORDER BY placed_at
        LOOP
            current_layer := 1;
            position_found := false;
            
            -- 找到可用的L-M-R位置
            WHILE current_layer <= 19 AND NOT position_found LOOP
                -- 检查当前层的L-M-R位置可用性
                pos_idx := 1;
                WHILE pos_idx <= 3 AND NOT position_found LOOP
                    current_position := positions[pos_idx];
                    
                    -- 检查位置是否已占用
                    SELECT COUNT(*) INTO position_count
                    FROM referrals 
                    WHERE matrix_root = root_rec.wallet_address
                    AND matrix_layer = current_layer
                    AND matrix_position = current_position;
                    
                    -- 如果位置可用，则安置
                    IF position_count = 0 THEN
                        -- 更新成员位置
                        UPDATE referrals 
                        SET 
                            matrix_layer = current_layer,
                            matrix_position = current_position,
                            is_spillover_placed = (current_layer > 1 OR root_rec.wallet_address != member_rec.direct_referrer_wallet)
                        WHERE member_wallet = member_rec.member_wallet
                        AND matrix_root = root_rec.wallet_address;
                        
                        total_placed := total_placed + 1;
                        position_found := true; -- 成功安置，退出循环
                    END IF;
                    
                    pos_idx := pos_idx + 1;
                END LOOP;
                
                current_layer := current_layer + 1;
            END LOOP;
        END LOOP;
    END LOOP;
    
    RETURN format('安置了%s个成员', total_placed);
END;
$$ LANGUAGE plpgsql;

-- 执行成员安置
SELECT place_members_with_spillover() as "成员安置结果";

-- 验证安置后的L-M-R完成情况
SELECT '=== 安置后 L-M-R 完成情况 ===' as section;
SELECT 
    matrix_root,
    matrix_layer,
    left_count,
    middle_count,
    right_count,
    next_available_position,
    layer_complete
FROM matrix_completion_status 
WHERE matrix_layer <= 3 
ORDER BY matrix_root, matrix_layer;
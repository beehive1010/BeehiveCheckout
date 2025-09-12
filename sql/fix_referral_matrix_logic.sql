-- 修复推荐关系和矩阵安置的逻辑错误
-- ========================================

-- 分析当前错误情况
SELECT '=== 当前推荐关系逻辑错误分析 ===' as section;

WITH referral_analysis AS (
    SELECT 
        r.member_wallet,
        r.referrer_wallet,
        r.matrix_layer as member_layer,
        ref_r.matrix_layer as referrer_layer,
        CASE 
            WHEN ref_r.matrix_layer IS NULL THEN '推荐人不在矩阵中'
            WHEN ref_r.matrix_layer >= r.matrix_layer THEN '错误：推荐人层级≥被推荐人'
            WHEN ref_r.matrix_layer < r.matrix_layer THEN '正确：推荐人层级<被推荐人'
            ELSE '未知情况'
        END as logic_status
    FROM referrals r
    LEFT JOIN referrals ref_r ON r.referrer_wallet = ref_r.member_wallet 
        AND r.matrix_root = ref_r.matrix_root
    WHERE r.matrix_root LIKE '0x000%0001'
)
SELECT * FROM referral_analysis ORDER BY member_layer;

-- 重新构建正确的矩阵安置逻辑
-- ========================================

CREATE OR REPLACE FUNCTION rebuild_matrix_with_correct_referral_logic()
RETURNS TEXT AS $$
DECLARE
    member_rec RECORD;
    root_wallet VARCHAR(42);
    total_processed INTEGER := 0;
    current_layer INTEGER;
    current_position CHAR(1);
    position_found BOOLEAN;
    positions CHAR(1)[] := ARRAY['L','M','R'];
    pos_idx INTEGER;
    layer_capacity INTEGER;
    layer_occupied INTEGER;
BEGIN
    -- 获取Root节点
    SELECT wallet_address INTO root_wallet 
    FROM members 
    WHERE current_level = 19 
    LIMIT 1;
    
    -- 清空现有的矩阵记录，重新开始
    DELETE FROM referrals WHERE matrix_root = root_wallet;
    
    -- 按推荐关系的层级顺序重新安置成员
    -- 第一步：安置Root的直推成员到Layer 1
    FOR member_rec IN
        SELECT wallet_address, created_at
        FROM members 
        WHERE referrer_wallet = root_wallet
        AND current_level > 0
        ORDER BY created_at  -- 按激活时间顺序
    LOOP
        current_layer := 1;
        position_found := false;
        
        -- 在第1层找L-M-R位置
        pos_idx := 1;
        WHILE pos_idx <= 3 AND NOT position_found LOOP
            current_position := positions[pos_idx];
            
            -- 检查位置是否已占用
            SELECT COUNT(*) INTO layer_occupied
            FROM referrals 
            WHERE matrix_root = root_wallet
            AND matrix_layer = current_layer
            AND matrix_position = current_position;
            
            -- 如果位置可用，则安置
            IF layer_occupied = 0 THEN
                INSERT INTO referrals (
                    member_wallet,
                    referrer_wallet,
                    matrix_root,
                    matrix_parent,
                    matrix_layer,
                    matrix_position,
                    is_direct_referral,
                    direct_referrer_wallet,
                    is_spillover_placed
                ) VALUES (
                    member_rec.wallet_address,
                    root_wallet,  -- referrer是root
                    root_wallet,
                    root_wallet,  -- parent也是root（第1层）
                    current_layer,
                    current_position,
                    true,
                    root_wallet,
                    false  -- 第1层不算溢出
                );
                
                total_processed := total_processed + 1;
                position_found := true;
            END IF;
            
            pos_idx := pos_idx + 1;
        END LOOP;
        
        -- 如果第1层满了，安置到第2层（溢出）
        IF NOT position_found THEN
            current_layer := 2;
            pos_idx := 1;
            WHILE pos_idx <= 9 AND NOT position_found LOOP  -- 第2层最多9个位置
                current_position := positions[((pos_idx - 1) % 3) + 1];
                
                SELECT COUNT(*) INTO layer_occupied
                FROM referrals 
                WHERE matrix_root = root_wallet
                AND matrix_layer = current_layer
                AND matrix_position = current_position;
                
                -- 找到第2层对应的parent（第1层成员）
                IF layer_occupied = 0 THEN
                    INSERT INTO referrals (
                        member_wallet,
                        referrer_wallet,
                        matrix_root,
                        matrix_parent,
                        matrix_layer,
                        matrix_position,
                        is_direct_referral,
                        direct_referrer_wallet,
                        is_spillover_placed
                    )
                    SELECT 
                        member_rec.wallet_address,
                        root_wallet,
                        root_wallet,
                        r1.member_wallet,  -- parent是第1层对应位置的成员
                        current_layer,
                        current_position,
                        true,
                        root_wallet,
                        true  -- 这是溢出安置
                    FROM referrals r1
                    WHERE r1.matrix_root = root_wallet
                    AND r1.matrix_layer = 1
                    AND r1.matrix_position = current_position
                    LIMIT 1;
                    
                    total_processed := total_processed + 1;
                    position_found := true;
                END IF;
                
                pos_idx := pos_idx + 1;
            END LOOP;
        END IF;
    END LOOP;
    
    -- 第二步：处理其他成员（被Layer1成员推荐的）
    -- 这些成员应该安置到Layer3及以下
    FOR member_rec IN
        SELECT m.wallet_address, m.referrer_wallet, m.created_at
        FROM members m
        WHERE m.referrer_wallet != root_wallet
        AND m.current_level > 0
        AND EXISTS (
            SELECT 1 FROM referrals r 
            WHERE r.member_wallet = m.referrer_wallet 
            AND r.matrix_root = root_wallet
        )
        ORDER BY m.created_at
    LOOP
        -- 找到推荐人在矩阵中的位置
        current_layer := 3;  -- 被Layer1成员推荐的放到Layer3
        position_found := false;
        
        pos_idx := 1;
        WHILE pos_idx <= 27 AND NOT position_found LOOP  -- Layer3最多27个位置
            current_position := positions[((pos_idx - 1) % 3) + 1];
            
            SELECT COUNT(*) INTO layer_occupied
            FROM referrals 
            WHERE matrix_root = root_wallet
            AND matrix_layer = current_layer
            AND matrix_position = current_position;
            
            IF layer_occupied = 0 THEN
                INSERT INTO referrals (
                    member_wallet,
                    referrer_wallet,
                    matrix_root,
                    matrix_parent,
                    matrix_layer,
                    matrix_position,
                    is_direct_referral,
                    direct_referrer_wallet,
                    is_spillover_placed
                )
                SELECT 
                    member_rec.wallet_address,
                    member_rec.referrer_wallet,
                    root_wallet,
                    member_rec.referrer_wallet,  -- parent就是推荐人
                    current_layer,
                    current_position,
                    false,  -- 不是root的直推
                    NULL,
                    false
                LIMIT 1;
                
                total_processed := total_processed + 1;
                position_found := true;
            END IF;
            
            pos_idx := pos_idx + 1;
        END LOOP;
    END LOOP;
    
    RETURN format('重新构建矩阵：处理了%s个成员', total_processed);
END;
$$ LANGUAGE plpgsql;

-- 执行重构
SELECT rebuild_matrix_with_correct_referral_logic() as "矩阵重构结果";

-- 验证结果
SELECT '=== 重构后的矩阵结构 ===' as section;

SELECT 
    member_wallet,
    referrer_wallet,
    matrix_layer,
    matrix_position,
    matrix_parent,
    is_direct_referral
FROM referrals 
WHERE matrix_root LIKE '0x000%0001'
ORDER BY matrix_layer, matrix_position;
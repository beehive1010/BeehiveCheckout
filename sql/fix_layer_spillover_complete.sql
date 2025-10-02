-- 修复Layer 2溢出到Layer 3的问题
-- 问题：12个成员全在Layer 2，应该有3个溢出到Layer 3
-- 根本原因：activation函数硬编码matrix_layer=1，没有正确的溢出逻辑

BEGIN;

-- 1. 分析当前Layer 2的溢出问题
SELECT 
    '=== 当前Layer 2溢出分析 ===' as step,
    matrix_layer,
    COUNT(*) as member_count,
    CASE 
        WHEN matrix_layer = 1 THEN 3  -- Layer 1最大容量 3^1
        WHEN matrix_layer = 2 THEN 9  -- Layer 2最大容量 3^2
        WHEN matrix_layer = 3 THEN 27 -- Layer 3最大容量 3^3
    END as max_capacity,
    COUNT(*) - CASE 
        WHEN matrix_layer = 1 THEN 3
        WHEN matrix_layer = 2 THEN 9  
        WHEN matrix_layer = 3 THEN 27
    END as overflow_count
FROM referrals 
WHERE matrix_root = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
GROUP BY matrix_layer
ORDER BY matrix_layer;

-- 2. 创建正确的矩阵层级计算函数
CREATE OR REPLACE FUNCTION calculate_correct_matrix_layer_and_position(
    p_matrix_root VARCHAR(42),
    p_placement_order INTEGER
) RETURNS TABLE(
    correct_layer INTEGER,
    correct_position VARCHAR(1),
    layer_index INTEGER
) AS $$
DECLARE
    v_current_layer INTEGER := 1;
    v_remaining_members INTEGER := p_placement_order;
    v_layer_capacity INTEGER;
    v_position_index INTEGER;
    v_positions VARCHAR(1)[] := ARRAY['L', 'M', 'R'];
BEGIN
    -- 按层级容量递减剩余成员数，找到正确层级
    WHILE v_remaining_members > 0 LOOP
        v_layer_capacity := POWER(3, v_current_layer)::INTEGER;
        
        IF v_remaining_members <= v_layer_capacity THEN
            -- 找到正确层级
            v_position_index := ((v_remaining_members - 1) % 3) + 1;
            
            correct_layer := v_current_layer;
            correct_position := v_positions[v_position_index];
            layer_index := v_remaining_members;
            RETURN NEXT;
            RETURN;
        ELSE
            -- 当前层级满了，移动到下一层
            v_remaining_members := v_remaining_members - v_layer_capacity;
            v_current_layer := v_current_layer + 1;
        END IF;
        
        -- 防止无限循环
        IF v_current_layer > 19 THEN
            EXIT;
        END IF;
    END LOOP;
    
    -- 如果没有找到合适位置，返回NULL
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- 3. 修复现有的Layer 2溢出数据
-- 首先备份当前错误数据
CREATE TABLE IF NOT EXISTS referrals_backup_layer_fix AS
SELECT * FROM referrals 
WHERE matrix_root = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E';

-- 重新计算所有成员的正确layer和position
WITH member_ordering AS (
    SELECT 
        r.id,
        r.member_wallet,
        r.matrix_root,
        r.placed_at,
        -- 按时间顺序给成员编号 (不包括root自己)
        ROW_NUMBER() OVER (
            PARTITION BY r.matrix_root 
            ORDER BY r.placed_at ASC, r.member_wallet ASC
        ) as placement_order
    FROM referrals r
    WHERE r.matrix_root = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
      AND r.member_wallet != r.matrix_root
),
corrected_placements AS (
    SELECT 
        mo.id,
        mo.member_wallet,
        mo.matrix_root,
        mo.placement_order,
        calc.correct_layer,
        calc.correct_position
    FROM member_ordering mo
    CROSS JOIN LATERAL calculate_correct_matrix_layer_and_position(
        mo.matrix_root, 
        mo.placement_order
    ) calc
)
UPDATE referrals 
SET 
    matrix_layer = cp.correct_layer,
    matrix_position = cp.correct_position,
    updated_at = NOW()
FROM corrected_placements cp
WHERE referrals.id = cp.id;

-- 4. 验证修复后的分布
SELECT 
    '=== 修复后的Layer分布 ===' as step,
    matrix_layer,
    matrix_position,
    COUNT(*) as member_count,
    STRING_AGG(
        RIGHT(member_wallet, 4) || ':' || COALESCE(
            (SELECT username FROM users WHERE wallet_address = referrals.member_wallet), 
            'Unknown'
        ), 
        ', ' 
        ORDER BY placed_at
    ) as members
FROM referrals 
WHERE matrix_root = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
GROUP BY matrix_layer, matrix_position
ORDER BY matrix_layer, matrix_position;

-- 5. 验证Layer容量
SELECT 
    '=== Layer容量验证 ===' as step,
    matrix_layer,
    COUNT(*) as actual_count,
    POWER(3, matrix_layer)::INTEGER as max_capacity,
    CASE 
        WHEN COUNT(*) <= POWER(3, matrix_layer)::INTEGER THEN '✅ 正常'
        ELSE '❌ 超出容量'
    END as status
FROM referrals 
WHERE matrix_root = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
GROUP BY matrix_layer
ORDER BY matrix_layer;

-- 6. 更新activate_nft_level1_membership函数以使用正确的溢出逻辑
CREATE OR REPLACE FUNCTION activate_nft_level1_membership_with_spillover(
    p_wallet_address text,
    p_referrer_wallet text DEFAULT NULL,
    p_transaction_hash text DEFAULT NULL
) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_activation_rank INTEGER;
    v_matrix_root VARCHAR(42);
    v_placement_info RECORD;
    v_membership_id INTEGER;
    v_reward_id INTEGER;
    v_platform_fee NUMERIC := 450.00; -- USDC
    v_reward_amount NUMERIC := 50.00; -- USDC
    v_root_level INTEGER;
    v_reward_status TEXT;
BEGIN
    RAISE NOTICE '🚀 开始Level 1 NFT激活 (带溢出逻辑): %', p_wallet_address;
    
    -- 1. 获取激活序号
    SELECT COALESCE(MAX(activation_sequence), 0) + 1 INTO v_activation_rank
    FROM members;
    
    RAISE NOTICE '激活序号: %', v_activation_rank;
    
    -- 2. 确定matrix root
    IF p_referrer_wallet IS NOT NULL THEN
        v_matrix_root := p_referrer_wallet;
        RAISE NOTICE '直推 - matrix root: %', v_matrix_root;
    ELSE
        v_matrix_root := '0x0000000000000000000000000000000000000001';
        RAISE NOTICE '溢出放置 - matrix root: %', v_matrix_root;
    END IF;
    
    -- 3. 计算正确的matrix placement (layer + position)
    SELECT 
        calc.correct_layer,
        calc.correct_position
    INTO v_placement_info
    FROM calculate_correct_matrix_layer_and_position(
        v_matrix_root, 
        v_activation_rank
    ) calc;
    
    IF v_placement_info IS NULL THEN
        RAISE EXCEPTION '无法为成员 % 找到合适的矩阵位置', p_wallet_address;
    END IF;
    
    RAISE NOTICE '矩阵位置: Layer %, Position %', v_placement_info.correct_layer, v_placement_info.correct_position;
    
    -- 4. 创建成员记录
    INSERT INTO members (
        wallet_address,
        current_level,
        levels_owned,
        has_pending_rewards,
        referrer_wallet,
        activation_sequence,
        activation_time,
        updated_at
    ) VALUES (
        p_wallet_address,
        1,
        ARRAY[1],
        false,
        p_referrer_wallet,
        v_activation_rank,
        NOW(),
        NOW()
    ) RETURNING activation_sequence INTO v_activation_rank;
    
    -- 5. 创建membership记录
    INSERT INTO membership (
        wallet_address,
        nft_level,
        nft_token_id,
        payment_amount_usdc,
        payment_method,
        transaction_hash,
        nft_minted,
        nft_claimed,
        created_at,
        activation_rank,
        current_level,
        bcc_released,
        platform_fee_usdc,
        is_active,
        updated_at,
        claimed_at
    ) VALUES (
        p_wallet_address,
        1,
        1,
        500.00,
        'token_payment',
        COALESCE(p_transaction_hash, 'activation_' || v_activation_rank),
        true,
        true,
        NOW(),
        v_activation_rank,
        1,
        100.00,
        v_platform_fee,
        true,
        NOW(),
        NOW()
    ) RETURNING id INTO v_membership_id;
    
    -- 6. 记录正确的referrals关系 (使用计算出的layer和position)
    INSERT INTO referrals (
        member_wallet,
        referrer_wallet,
        matrix_root,
        matrix_layer,
        matrix_position,
        is_active,
        activation_rank,
        placed_at
    ) VALUES (
        p_wallet_address,
        COALESCE(p_referrer_wallet, v_matrix_root),
        v_matrix_root,
        v_placement_info.correct_layer,  -- 使用计算出的layer
        v_placement_info.correct_position, -- 使用计算出的position
        true,
        v_activation_rank,
        NOW()
    );
    
    -- 7. 其余逻辑保持不变...
    SELECT current_level INTO v_root_level
    FROM members 
    WHERE wallet_address = v_matrix_root;
    
    v_root_level := COALESCE(v_root_level, 19);
    
    IF v_root_level >= 1 THEN
        v_reward_status := 'layer_reward';
    ELSE
        v_reward_status := 'pending_layer_reward';
    END IF;
    
    -- 8. 创建Layer奖励
    INSERT INTO layer_rewards (
        recipient_wallet,
        payer_wallet, 
        layer,
        amount_usdt,
        amount_bcc,
        reward_type,
        is_claimed,
        created_at,
        updated_at
    ) VALUES (
        v_matrix_root,
        p_wallet_address,
        v_placement_info.correct_layer, -- 使用正确的layer
        v_reward_amount,
        v_reward_amount,
        v_reward_status,
        false,
        NOW(),
        NOW()
    ) RETURNING id INTO v_reward_id;
    
    -- 构建结果
    v_result := json_build_object(
        'success', true,
        'membership_id', v_membership_id,
        'activation_rank', v_activation_rank,
        'platform_fee_usdc', v_platform_fee,
        'matrix_root', v_matrix_root,
        'matrix_layer', v_placement_info.correct_layer,
        'matrix_position', v_placement_info.correct_position,
        'reward_id', v_reward_id,
        'reward_amount_usdc', v_reward_amount,
        'reward_status', v_reward_status,
        'message', '成功激活Level 1会员资格 (带正确溢出逻辑)'
    );
    
    RAISE NOTICE '✅ Level 1激活完成: Layer %, Position %', v_placement_info.correct_layer, v_placement_info.correct_position;
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Level 1激活失败: %', SQLERRM;
END;
$$;

-- 7. 授权新函数
GRANT EXECUTE ON FUNCTION activate_nft_level1_membership_with_spillover TO authenticated, anon;
GRANT EXECUTE ON FUNCTION calculate_correct_matrix_layer_and_position TO authenticated, anon;

SELECT '=== 溢出逻辑修复完成 ===' as final_step;

COMMIT;
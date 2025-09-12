-- 重新整理核心数据流程：users → membership → members → referrals → matrix → layer_rewards
-- ========================================
-- 建立完整的数据处理流程和触发器
-- ========================================

SELECT '=== 重新整理核心数据流程 ===' as reorganize_section;

-- 第1步：修复user_balances表RLS策略
-- ========================================

ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own balance" ON user_balances
    FOR SELECT USING (wallet_address::text = get_current_wallet_address()::text);

CREATE POLICY "System can manage balances" ON user_balances
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access user_balances" ON user_balances
    FOR ALL USING (true) WITH CHECK (true);

-- 第2步：创建完整的数据处理函数
-- ========================================

-- 创建用户注册流程函数
CREATE OR REPLACE FUNCTION process_user_registration(
    p_wallet_address VARCHAR(42),
    p_username VARCHAR(50),
    p_referrer_wallet VARCHAR(42) DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_exists BOOLEAN;
    member_exists BOOLEAN;
    next_sequence INTEGER;
    result JSON;
BEGIN
    -- 检查用户是否已存在
    SELECT EXISTS(SELECT 1 FROM users WHERE wallet_address = p_wallet_address) INTO user_exists;
    SELECT EXISTS(SELECT 1 FROM members WHERE wallet_address = p_wallet_address) INTO member_exists;
    
    IF user_exists AND member_exists THEN
        RETURN json_build_object(
            'success', true,
            'message', 'User already exists',
            'action', 'existing_user'
        );
    END IF;
    
    -- 1. 创建或更新users记录
    INSERT INTO users (wallet_address, username, created_at)
    VALUES (p_wallet_address, p_username, NOW())
    ON CONFLICT (wallet_address) 
    DO UPDATE SET 
        username = EXCLUDED.username,
        updated_at = NOW();
    
    -- 2. 创建members记录
    IF NOT member_exists THEN
        -- 获取下一个activation_sequence
        SELECT COALESCE(MAX(activation_sequence), -1) + 1 INTO next_sequence FROM members;
        
        INSERT INTO members (
            wallet_address,
            activation_sequence,
            referrer_wallet,
            current_level,
            created_at
        ) VALUES (
            p_wallet_address,
            next_sequence,
            p_referrer_wallet,
            1,  -- 默认Level 1
            NOW()
        );
        
        -- 3. 创建初始用户余额
        INSERT INTO user_balances (
            wallet_address,
            usdt_balance,
            created_at
        ) VALUES (
            p_wallet_address,
            0.00,
            NOW()
        ) ON CONFLICT (wallet_address) DO NOTHING;
        
        -- 4. 如果有推荐人，创建推荐关系
        IF p_referrer_wallet IS NOT NULL THEN
            INSERT INTO referrals (
                member_wallet,
                member_activation_sequence,
                referrer_wallet,
                is_direct_referral,
                placed_at
            ) VALUES (
                p_wallet_address,
                next_sequence,
                p_referrer_wallet,
                true,
                NOW()
            );
        END IF;
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'User registration completed',
        'activation_sequence', next_sequence,
        'action', 'new_user'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Registration failed: ' || SQLERRM
    );
END;
$$;

-- 第3步：创建membership购买处理函数
-- ========================================

CREATE OR REPLACE FUNCTION process_membership_purchase(
    p_wallet_address VARCHAR(42),
    p_nft_level INTEGER,
    p_claim_price DECIMAL(18,6),
    p_transaction_hash VARCHAR(66)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    member_exists BOOLEAN;
    is_upgrade BOOLEAN;
    membership_id UUID;
    current_member_level INTEGER;
    result JSON;
BEGIN
    -- 检查会员是否存在
    SELECT EXISTS(SELECT 1 FROM members WHERE wallet_address = p_wallet_address) INTO member_exists;
    
    IF NOT member_exists THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Member not found. Please register first.'
        );
    END IF;
    
    -- 获取当前level
    SELECT current_level INTO current_member_level 
    FROM members 
    WHERE wallet_address = p_wallet_address;
    
    -- 判断是否为升级
    is_upgrade := p_nft_level > current_member_level;
    
    -- 1. 创建membership记录
    INSERT INTO membership (
        wallet_address,
        nft_level,
        claim_price,
        transaction_hash,
        is_upgrade,
        claimed_at
    ) VALUES (
        p_wallet_address,
        p_nft_level,
        p_claim_price,
        p_transaction_hash,
        is_upgrade,
        NOW()
    ) RETURNING id INTO membership_id;
    
    -- 2. 更新members的current_level
    UPDATE members 
    SET current_level = GREATEST(current_level, p_nft_level),
        updated_at = NOW()
    WHERE wallet_address = p_wallet_address;
    
    -- 3. 触发matrix安置处理
    PERFORM process_matrix_placement(p_wallet_address);
    
    -- 4. 触发奖励计算
    PERFORM process_membership_rewards(membership_id);
    
    RETURN json_build_object(
        'success', true,
        'message', 'Membership purchase processed',
        'membership_id', membership_id,
        'is_upgrade', is_upgrade
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Purchase processing failed: ' || SQLERRM
    );
END;
$$;

-- 第4步：创建Matrix安置处理函数
-- ========================================

CREATE OR REPLACE FUNCTION process_matrix_placement(
    p_wallet_address VARCHAR(42)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    member_seq INTEGER;
    matrix_root_wallet VARCHAR(42);
    matrix_root_seq INTEGER;
    placement_layer INTEGER;
    placement_position VARCHAR(1);
    placement_result JSON;
BEGIN
    -- 获取成员的activation_sequence
    SELECT activation_sequence INTO member_seq 
    FROM members 
    WHERE wallet_address = p_wallet_address;
    
    -- Super Root (sequence 0) 不参与matrix安置
    IF member_seq = 0 THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Super Root does not participate in matrix placement'
        );
    END IF;
    
    -- 检查是否已有matrix安置
    IF EXISTS(SELECT 1 FROM referrals WHERE member_wallet = p_wallet_address AND matrix_layer > 0) THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Member already has matrix placement'
        );
    END IF;
    
    -- 计算3x3滑落安置
    SELECT * INTO placement_result FROM calculate_3x3_spillover_placement(member_seq);
    
    -- 解析安置结果
    matrix_root_wallet := (placement_result->>'matrix_root_wallet')::VARCHAR(42);
    matrix_root_seq := (placement_result->>'matrix_root_sequence')::INTEGER;
    placement_layer := (placement_result->>'layer')::INTEGER;
    placement_position := (placement_result->>'position')::VARCHAR(1);
    
    -- 更新referrals表的matrix信息
    UPDATE referrals 
    SET matrix_root_wallet = matrix_root_wallet,
        matrix_root_sequence = matrix_root_seq,
        matrix_layer = placement_layer,
        matrix_position = placement_position,
        updated_at = NOW()
    WHERE member_wallet = p_wallet_address;
    
    -- 如果referrals记录不存在，创建一个
    IF NOT FOUND THEN
        INSERT INTO referrals (
            member_wallet,
            member_activation_sequence,
            referrer_wallet,
            matrix_root_wallet,
            matrix_root_sequence,
            matrix_layer,
            matrix_position,
            is_direct_referral,
            placed_at
        ) VALUES (
            p_wallet_address,
            member_seq,
            (SELECT referrer_wallet FROM members WHERE wallet_address = p_wallet_address),
            matrix_root_wallet,
            matrix_root_seq,
            placement_layer,
            placement_position,
            false,  -- Matrix安置不等于直接推荐
            NOW()
        );
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Matrix placement completed',
        'matrix_root_sequence', matrix_root_seq,
        'layer', placement_layer,
        'position', placement_position
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Matrix placement failed: ' || SQLERRM
    );
END;
$$;

-- 第5步：创建3x3滑落计算函数
-- ========================================

CREATE OR REPLACE FUNCTION calculate_3x3_spillover_placement(
    p_member_sequence INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    super_root_wallet VARCHAR(42);
    matrix_root_wallet VARCHAR(42);
    matrix_root_seq INTEGER;
    layer_num INTEGER;
    position_char VARCHAR(1);
    positions VARCHAR(3)[] := ARRAY['L', 'M', 'R'];
    position_index INTEGER;
BEGIN
    -- 获取Super Root地址
    SELECT wallet_address INTO super_root_wallet 
    FROM members 
    WHERE activation_sequence = 0;
    
    -- 3x3滑落逻辑：
    -- Sequence 1,2,3 -> Super Root L,M,R
    -- Sequence 4,5,6 -> Member #1 L,M,R  
    -- Sequence 7,8,9 -> Member #2 L,M,R
    -- Sequence 10,11,12 -> Member #3 L,M,R
    -- 依此类推...
    
    IF p_member_sequence BETWEEN 1 AND 3 THEN
        -- 安置到Super Root
        matrix_root_wallet := super_root_wallet;
        matrix_root_seq := 0;
        layer_num := 1;
        position_index := p_member_sequence;
        position_char := positions[position_index];
        
    ELSIF p_member_sequence BETWEEN 4 AND 12 THEN
        -- 计算应该安置到哪个member的matrix下
        matrix_root_seq := ((p_member_sequence - 4) / 3) + 1;  -- 1,2,3
        
        SELECT wallet_address INTO matrix_root_wallet 
        FROM members 
        WHERE activation_sequence = matrix_root_seq;
        
        layer_num := 1;
        position_index := ((p_member_sequence - 4) % 3) + 1;  -- 1,2,3
        position_char := positions[position_index];
        
    ELSE
        -- 更复杂的滑落逻辑，继续到Layer 2
        -- 简化处理：安置到第一个可用的Matrix Root
        SELECT wallet_address, activation_sequence 
        INTO matrix_root_wallet, matrix_root_seq
        FROM members 
        WHERE activation_sequence > 0 
        ORDER BY activation_sequence 
        LIMIT 1;
        
        layer_num := 2;
        position_char := 'L';  -- 默认L位置
    END IF;
    
    RETURN json_build_object(
        'matrix_root_wallet', matrix_root_wallet,
        'matrix_root_sequence', matrix_root_seq,
        'layer', layer_num,
        'position', position_char
    );
END;
$$;

SELECT '✅ 核心数据流程函数创建完成' as completion_message;
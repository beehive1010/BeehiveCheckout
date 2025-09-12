-- 实现membership奖励触发器和余额更新
-- ========================================
-- 创建完整的奖励计算和余额更新系统
-- ========================================

SELECT '=== 实现membership奖励触发器 ===' as reward_triggers_section;

-- 第1步：创建membership奖励处理函数
-- ========================================

CREATE OR REPLACE FUNCTION process_membership_rewards(
    p_membership_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    membership_rec RECORD;
    matrix_placement RECORD;
    reward_amount DECIMAL(18,6);
    reward_status VARCHAR(20);
    reward_id UUID;
    result JSON;
BEGIN
    -- 获取membership详情
    SELECT 
        m.wallet_address,
        m.nft_level,
        m.claim_price,
        m.is_upgrade,
        mem.activation_sequence,
        u.username
    INTO membership_rec
    FROM membership m
    JOIN members mem ON m.wallet_address = mem.wallet_address
    JOIN users u ON mem.wallet_address = u.wallet_address
    WHERE m.id = p_membership_id;
    
    -- Super Root的membership不触发给别人的奖励
    IF membership_rec.activation_sequence = 0 THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Super Root membership does not trigger rewards to others'
        );
    END IF;
    
    -- 获取该会员的Matrix安置信息
    SELECT 
        r.matrix_root_wallet,
        r.matrix_layer,
        r.matrix_position,
        root_m.activation_sequence as root_sequence,
        root_m.current_level as root_current_level
    INTO matrix_placement
    FROM referrals r
    JOIN members root_m ON r.matrix_root_wallet = root_m.wallet_address
    WHERE r.member_wallet = membership_rec.wallet_address
    AND r.matrix_layer > 0
    ORDER BY r.placed_at DESC
    LIMIT 1;
    
    -- 如果没有找到Matrix安置信息，跳过
    IF matrix_placement IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No matrix placement found for member'
        );
    END IF;
    
    -- 设置奖励金额 = membership的claim_price
    reward_amount := membership_rec.claim_price;
    
    -- 根据Matrix Root的资格确定奖励状态
    IF matrix_placement.root_sequence = 0 THEN
        -- Super Root的奖励：需要升级到Level 2（72小时pending）
        reward_status := CASE 
            WHEN matrix_placement.root_current_level >= 2 THEN 'claimable'
            ELSE 'pending'
        END;
    ELSE
        -- 其他Matrix Root：检查Level和直推要求
        SELECT 
            CASE 
                WHEN matrix_placement.root_current_level >= 2 AND
                     (SELECT COUNT(*) FROM referrals WHERE matrix_root_wallet = matrix_placement.matrix_root_wallet AND is_direct_referral = true) >= 3
                THEN 'claimable'
                ELSE 'pending'
            END
        INTO reward_status;
    END IF;
    
    -- 创建Layer奖励记录
    INSERT INTO layer_rewards (
        triggering_member_wallet,
        reward_recipient_wallet,
        matrix_root_wallet,
        triggering_nft_level,
        reward_amount,
        layer_position,
        matrix_layer,
        status,
        recipient_required_level,
        recipient_current_level,
        requires_direct_referrals,
        direct_referrals_required,
        direct_referrals_current,
        expires_at
    ) VALUES (
        membership_rec.wallet_address,
        matrix_placement.matrix_root_wallet,
        matrix_placement.matrix_root_wallet,
        membership_rec.nft_level,
        reward_amount,
        CASE 
            WHEN membership_rec.is_upgrade THEN 'UPG' || membership_rec.nft_level
            ELSE 'L' || matrix_placement.matrix_layer || matrix_placement.matrix_position
        END,
        matrix_placement.matrix_layer,
        reward_status,
        2,  -- Required level
        matrix_placement.root_current_level,
        CASE WHEN matrix_placement.root_sequence = 0 THEN false ELSE true END,
        CASE WHEN matrix_placement.root_sequence = 0 THEN 0 ELSE 3 END,
        (SELECT COUNT(*) FROM referrals WHERE matrix_root_wallet = matrix_placement.matrix_root_wallet AND is_direct_referral = true)::INTEGER,
        CASE 
            WHEN matrix_placement.root_sequence = 0 AND matrix_placement.root_current_level < 2 
            THEN NOW() + INTERVAL '72 hours'
            ELSE NOW() + INTERVAL '30 days'
        END
    ) RETURNING id INTO reward_id;
    
    -- 如果奖励状态为claimable，立即更新受益者余额
    IF reward_status = 'claimable' THEN
        PERFORM update_member_balance(
            matrix_placement.matrix_root_wallet,
            reward_amount,
            'layer_reward',
            'Layer reward from member ' || membership_rec.username
        );
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Membership reward processed',
        'reward_id', reward_id,
        'reward_amount', reward_amount,
        'reward_status', reward_status,
        'recipient_wallet', matrix_placement.matrix_root_wallet
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Reward processing failed: ' || SQLERRM
    );
END;
$$;

-- 第2步：创建余额更新函数
-- ========================================

CREATE OR REPLACE FUNCTION update_member_balance(
    p_wallet_address VARCHAR(42),
    p_amount DECIMAL(18,6),
    p_transaction_type VARCHAR(50),
    p_description TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_balance DECIMAL(18,6);
    new_balance DECIMAL(18,6);
BEGIN
    -- 获取当前余额
    SELECT COALESCE(usdt_balance, 0) INTO current_balance
    FROM user_balances 
    WHERE wallet_address = p_wallet_address;
    
    -- 如果用户余额记录不存在，创建一个
    IF NOT FOUND THEN
        INSERT INTO user_balances (
            wallet_address,
            usdt_balance,
            created_at
        ) VALUES (
            p_wallet_address,
            0.00,
            NOW()
        );
        current_balance := 0.00;
    END IF;
    
    -- 计算新余额
    new_balance := current_balance + p_amount;
    
    -- 更新用户余额
    UPDATE user_balances 
    SET usdt_balance = new_balance,
        updated_at = NOW()
    WHERE wallet_address = p_wallet_address;
    
    -- 记录余额变化历史（如果有相应的表）
    INSERT INTO reward_records (
        wallet_address,
        amount,
        transaction_type,
        description,
        previous_balance,
        new_balance,
        created_at
    ) VALUES (
        p_wallet_address,
        p_amount,
        p_transaction_type,
        p_description,
        current_balance,
        new_balance,
        NOW()
    ) ON CONFLICT DO NOTHING;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Balance updated successfully',
        'previous_balance', current_balance,
        'new_balance', new_balance,
        'amount_added', p_amount
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Balance update failed: ' || SQLERRM
    );
END;
$$;

-- 第3步：创建奖励领取函数
-- ========================================

CREATE OR REPLACE FUNCTION claim_layer_reward(
    p_reward_id UUID,
    p_claimer_wallet VARCHAR(42)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    reward_rec RECORD;
    claim_result JSON;
BEGIN
    -- 获取奖励详情并验证
    SELECT 
        id,
        reward_recipient_wallet,
        reward_amount,
        status
    INTO reward_rec
    FROM layer_rewards 
    WHERE id = p_reward_id;
    
    -- 检查奖励是否存在
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Reward not found'
        );
    END IF;
    
    -- 验证领取者身份
    IF reward_rec.reward_recipient_wallet != p_claimer_wallet THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Unauthorized: You can only claim your own rewards'
        );
    END IF;
    
    -- 检查奖励状态
    IF reward_rec.status != 'claimable' THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Reward is not claimable yet. Status: ' || reward_rec.status
        );
    END IF;
    
    -- 更新奖励状态为已领取
    UPDATE layer_rewards 
    SET status = 'claimed',
        claimed_at = NOW()
    WHERE id = p_reward_id;
    
    -- 更新用户余额
    SELECT * INTO claim_result FROM update_member_balance(
        p_claimer_wallet,
        reward_rec.reward_amount,
        'reward_claim',
        'Claimed layer reward #' || p_reward_id
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'Reward claimed successfully',
        'reward_amount', reward_rec.reward_amount,
        'balance_update', claim_result
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Reward claim failed: ' || SQLERRM
    );
END;
$$;

-- 第4步：创建membership触发器
-- ========================================

-- 创建触发器函数
CREATE OR REPLACE FUNCTION trigger_membership_processing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    processing_result JSON;
BEGIN
    -- 触发matrix安置处理
    SELECT process_matrix_placement(NEW.wallet_address) INTO processing_result;
    
    -- 触发奖励计算
    SELECT process_membership_rewards(NEW.id) INTO processing_result;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- 记录错误但不阻止插入
    RAISE WARNING 'Membership processing trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 删除已存在的触发器（如果有）
DROP TRIGGER IF EXISTS membership_after_insert_trigger ON membership;

-- 创建触发器
CREATE TRIGGER membership_after_insert_trigger
    AFTER INSERT ON membership
    FOR EACH ROW
    EXECUTE FUNCTION trigger_membership_processing();

-- 第5步：验证奖励触发器设置
-- ========================================

SELECT '=== 奖励触发器验证 ===' as trigger_verification_section;

-- 检查触发器状态
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    trigger_schema
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name = 'membership_after_insert_trigger';

-- 检查相关函数
SELECT 
    proname as function_name,
    pronargs as arg_count
FROM pg_proc 
WHERE proname IN (
    'process_membership_rewards',
    'update_member_balance', 
    'claim_layer_reward',
    'trigger_membership_processing'
)
ORDER BY proname;

SELECT '✅ Membership奖励触发器实现完成' as completion_message;
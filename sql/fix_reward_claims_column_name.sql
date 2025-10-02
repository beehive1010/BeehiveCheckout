-- 修复reward_claims表字段名称不一致问题

BEGIN;

SELECT '=== 修复reward_claims表字段名称 ===' as step;

-- 更新process_nft_purchase_rewards函数，使用正确的字段名
CREATE OR REPLACE FUNCTION process_nft_purchase_rewards(
    p_member_wallet TEXT,
    p_purchased_level INTEGER
)
RETURNS TABLE(
    success BOOLEAN,
    member_bcc_released NUMERIC,
    member_bcc_remaining NUMERIC,
    matrix_rewards_triggered INTEGER,
    available_rewards INTEGER,
    pending_rewards INTEGER,
    total_reward_amount NUMERIC,
    message TEXT
) AS $$
DECLARE
    current_member_level INTEGER;
    current_bcc_locked NUMERIC;
    release_amount NUMERIC;
    new_bcc_locked NUMERIC;
    reward_count INTEGER := 0;
    available_count INTEGER := 0;
    pending_count INTEGER := 0;
    total_rewards NUMERIC := 0;
    result_msg TEXT := '';
    reward_record RECORD;
BEGIN
    -- 获取会员当前Level
    SELECT COALESCE(current_level, 1) INTO current_member_level
    FROM members WHERE wallet_address = p_member_wallet;
    
    IF current_member_level IS NULL THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 0::NUMERIC, 0, 0, 0, 0::NUMERIC, 'Member not found'::TEXT;
        RETURN;
    END IF;
    
    -- 检查是否按顺序购买NFT
    IF p_purchased_level != (current_member_level + 1) THEN
        RETURN QUERY SELECT 
            false, 0::NUMERIC, 0::NUMERIC, 0, 0, 0, 0::NUMERIC,
            ('Invalid NFT purchase: Must buy sequentially from Level ' || current_member_level || ' to Level ' || (current_member_level + 1))::TEXT;
        RETURN;
    END IF;
    
    -- 1. 更新会员Level
    UPDATE members 
    SET current_level = p_purchased_level, updated_at = now()
    WHERE wallet_address = p_member_wallet;
    
    result_msg := result_msg || 'Level updated to ' || p_purchased_level || '; ';
    
    -- 2. 处理会员自身的BCC释放
    SELECT COALESCE(bcc_locked, 0) INTO current_bcc_locked
    FROM user_balances WHERE wallet_address = p_member_wallet;
    
    IF current_bcc_locked > 0 THEN
        release_amount := get_nft_price(p_purchased_level);
        
        IF release_amount > current_bcc_locked THEN
            release_amount := current_bcc_locked;
        END IF;
        
        new_bcc_locked := current_bcc_locked - release_amount;
        
        -- 更新余额
        UPDATE user_balances 
        SET 
            bcc_locked = new_bcc_locked,
            bcc_transferable = bcc_transferable + release_amount,
            updated_at = now()
        WHERE wallet_address = p_member_wallet;
        
        -- 记录BCC释放
        INSERT INTO bcc_release_logs (
            wallet_address, from_level, to_level, bcc_released, 
            bcc_remaining_locked, release_reason
        ) VALUES (
            p_member_wallet, current_member_level, p_purchased_level, 
            release_amount, new_bcc_locked,
            'NFT Level ' || p_purchased_level || ' purchase BCC release'
        );
        
        result_msg := result_msg || 'Released ' || release_amount || ' BCC; ';
    ELSE
        release_amount := 0;
        new_bcc_locked := 0;
        result_msg := result_msg || 'No BCC to release; ';
    END IF;
    
    -- 3. 触发Matrix奖励（基于layer-level匹配）
    FOR reward_record IN 
        SELECT * FROM calculate_layer_based_matrix_rewards(p_member_wallet, p_purchased_level)
    LOOP
        reward_count := reward_count + 1;
        total_rewards := total_rewards + reward_record.reward_amount;
        
        IF reward_record.reward_eligible THEN
            available_count := available_count + 1;
            
            -- 创建可领取的奖励记录 - 使用正确的字段名
            INSERT INTO reward_claims (
                root_wallet, reward_amount_usdc, status, created_at, expires_at,
                layer, nft_level, triggering_member_wallet
            ) VALUES (
                reward_record.matrix_root, reward_record.reward_amount, 'available', now(), now() + interval '30 days',
                reward_record.member_layer, p_purchased_level, p_member_wallet
            );
            
            RAISE NOTICE 'Available: % (Layer %) gets % USDC - %', 
                reward_record.root_name, reward_record.member_layer, reward_record.reward_amount, reward_record.reward_reason;
        ELSE
            pending_count := pending_count + 1;
            
            -- 创建pending奖励记录 - 使用正确的字段名
            INSERT INTO reward_claims (
                root_wallet, reward_amount_usdc, status, created_at, expires_at,
                layer, nft_level, triggering_member_wallet, reward_type
            ) VALUES (
                reward_record.matrix_root, reward_record.reward_amount, 'pending', now(), now() + interval '72 hours',
                reward_record.member_layer, p_purchased_level, p_member_wallet, 'layer_reward'
            );
            
            RAISE NOTICE 'Pending: % (Layer %) gets % USDC - %', 
                reward_record.root_name, reward_record.member_layer, reward_record.reward_amount, reward_record.reward_reason;
        END IF;
    END LOOP;
    
    result_msg := result_msg || 'Matrix rewards: ' || available_count || ' available, ' || pending_count || ' pending';
    
    RETURN QUERY SELECT 
        true,
        COALESCE(release_amount, 0),
        COALESCE(new_bcc_locked, 0),
        reward_count,
        available_count,
        pending_count,
        total_rewards,
        result_msg;
END;
$$ LANGUAGE plpgsql;

-- 测试修复后的函数
SELECT '=== 测试修复后的NFT购买奖励流程 ===' as test_step;

SELECT 'Testing process_nft_purchase_rewards function:' as info;
-- 这个测试应该能正常工作，不会报字段名称错误
SELECT * FROM process_nft_purchase_rewards('0x310053286b025De2a0816faEcBCaeB61B5f17aa1', 2);

SELECT '=== reward_claims表字段名称修复完成 ===' as final_status;

COMMIT;
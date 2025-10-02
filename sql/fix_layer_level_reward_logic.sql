-- 修正奖励触发逻辑：基于layer位置和NFT level匹配

BEGIN;

SELECT '=== 修正Layer-Level奖励逻辑 ===' as step;

-- 1. 创建正确的Matrix奖励计算函数
CREATE OR REPLACE FUNCTION calculate_layer_based_matrix_rewards(
    p_member_wallet TEXT,
    p_member_new_level INTEGER
)
RETURNS TABLE(
    matrix_root character varying,
    root_name TEXT,
    member_layer INTEGER,
    member_position character varying,
    root_current_level INTEGER,
    reward_amount NUMERIC,
    reward_eligible BOOLEAN,
    reward_status TEXT,
    reward_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.matrix_root,
        COALESCE(u.username, 'Member_' || RIGHT(sm.matrix_root, 4)) as root_name,
        sm.matrix_layer as member_layer,
        sm.matrix_position as member_position,
        COALESCE(m.current_level, 1) as root_current_level,
        get_nft_price(p_member_new_level) as reward_amount,
        -- 奖励条件：Root的Level必须 >= Member在该matrix中的Layer
        CASE 
            WHEN COALESCE(m.current_level, 1) >= sm.matrix_layer THEN true
            ELSE false
        END as reward_eligible,
        CASE 
            WHEN COALESCE(m.current_level, 1) >= sm.matrix_layer THEN 'available'
            ELSE 'pending'
        END as reward_status,
        CASE 
            WHEN COALESCE(m.current_level, 1) >= sm.matrix_layer THEN 
                'Root Level ' || COALESCE(m.current_level, 1) || ' >= Member Layer ' || sm.matrix_layer || ', reward available'
            ELSE 
                'Root Level ' || COALESCE(m.current_level, 1) || ' < Member Layer ' || sm.matrix_layer || ', reward pending'
        END as reward_reason
    FROM spillover_matrix sm
    LEFT JOIN users u ON sm.matrix_root = u.wallet_address
    LEFT JOIN members m ON sm.matrix_root = m.wallet_address
    WHERE sm.member_wallet = p_member_wallet
    AND sm.is_active = true
    ORDER BY sm.matrix_root, sm.matrix_layer;
END;
$$ LANGUAGE plpgsql;

-- 2. 创建NFT购买时的完整奖励触发函数
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
            
            -- 创建可领取的奖励记录
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
            
            -- 创建pending奖励记录
            INSERT INTO reward_claims (
                root_wallet, reward_amount_usdc, status, created_at, expires_at,
                layer, nft_level, triggered_by_wallet, reward_type
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

-- 3. 创建查看会员在各matrix中位置的函数
CREATE OR REPLACE FUNCTION get_member_matrix_positions(
    p_member_wallet TEXT
)
RETURNS TABLE(
    matrix_root character varying,
    root_name TEXT,
    root_level INTEGER,
    member_layer INTEGER,
    member_position character varying,
    reward_eligible_for_layer BOOLEAN,
    potential_reward NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.matrix_root,
        COALESCE(u.username, 'Member_' || RIGHT(sm.matrix_root, 4)) as root_name,
        COALESCE(m.current_level, 1) as root_level,
        sm.matrix_layer as member_layer,
        sm.matrix_position as member_position,
        CASE 
            WHEN COALESCE(m.current_level, 1) >= sm.matrix_layer THEN true
            ELSE false
        END as reward_eligible_for_layer,
        get_nft_price(sm.matrix_layer) as potential_reward
    FROM spillover_matrix sm
    LEFT JOIN users u ON sm.matrix_root = u.wallet_address
    LEFT JOIN members m ON sm.matrix_root = m.wallet_address
    WHERE sm.member_wallet = p_member_wallet
    AND sm.is_active = true
    ORDER BY sm.matrix_root, sm.matrix_layer;
END;
$$ LANGUAGE plpgsql;

-- 4. 测试layer-level匹配的奖励逻辑
SELECT '=== 测试Layer-Level奖励逻辑 ===' as test_step;

-- 查看TestBB在各matrix中的位置
SELECT 'TestBB在各matrix中的位置:' as info;
SELECT * FROM get_member_matrix_positions('0x310053286b025De2a0816faEcBCaeB61B5f17aa1');

-- 模拟TestBB购买Level 2 NFT
SELECT 'TestBB购买Level 2 NFT模拟:' as info;
SELECT * FROM calculate_layer_based_matrix_rewards('0x310053286b025De2a0816faEcBCaeB61B5f17aa1', 2);

-- 查看TestABC001在各matrix中的位置
SELECT 'TestABC001在各matrix中的位置:' as info;
SELECT * FROM get_member_matrix_positions('0x9C30721F8EbAe0a68577A83C4fc2F7A698E2a501');

SELECT '=== Layer-Level奖励逻辑修正完成 ===' as final_status;

COMMIT;
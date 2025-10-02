-- 修复奖励系统的format函数问题
CREATE OR REPLACE FUNCTION trigger_member_upgrade_rewards(
    upgraded_member VARCHAR(42),
    new_level INTEGER DEFAULT 1
)
RETURNS TABLE(
    summary TEXT,
    total_rewards INTEGER,
    immediate_rewards INTEGER,
    pending_rewards INTEGER,
    timers_created INTEGER
) AS $$
DECLARE
    reward_rec RECORD;
    root_level INTEGER;
    reward_amount NUMERIC(18,6) := 100.0; -- Level 1 = $100 USDT
    total_count INTEGER := 0;
    immediate_count INTEGER := 0;
    pending_count INTEGER := 0;
    timer_count INTEGER := 0;
    new_timer_id UUID;
    reward_id UUID;
BEGIN
    -- 查找该会员在所有递归矩阵中的位置和对应的root
    FOR reward_rec IN
        SELECT DISTINCT
            r.matrix_root,
            r.matrix_position,
            r.matrix_layer,
            m.current_level as root_current_level
        FROM referrals r
        JOIN members m ON m.wallet_address = r.matrix_root
        WHERE r.member_wallet = upgraded_member
        AND r.matrix_root != upgraded_member -- 不给自己奖励
        ORDER BY r.matrix_layer, r.matrix_root
    LOOP
        total_count := total_count + 1;
        reward_id := gen_random_uuid();
        
        -- L和M位置：直接奖励，无需考核
        IF reward_rec.matrix_position IN ('L', 'M') THEN
            INSERT INTO layer_rewards (
                id,
                recipient_wallet,
                payer_wallet,
                layer,
                reward_type,
                amount_usdt,
                nft_level,
                matrix_position,
                matrix_root,
                status,
                qualification_check,
                is_claimed,
                created_at
            ) VALUES (
                reward_id,
                reward_rec.matrix_root,
                upgraded_member,
                reward_rec.matrix_layer,
                'upgrade_reward',
                reward_amount,
                new_level,
                reward_rec.matrix_position,
                reward_rec.matrix_root,
                'approved',
                true,
                false,
                NOW()
            );
            immediate_count := immediate_count + 1;
            
        -- R位置：需要考核root是否>=level 2
        ELSIF reward_rec.matrix_position = 'R' THEN
            IF reward_rec.root_current_level >= 2 THEN
                -- 直接奖励
                INSERT INTO layer_rewards (
                    id,
                    recipient_wallet,
                    payer_wallet,
                    layer,
                    reward_type,
                    amount_usdt,
                    nft_level,
                    matrix_position,
                    matrix_root,
                    status,
                    qualification_check,
                    is_claimed,
                    created_at
                ) VALUES (
                    reward_id,
                    reward_rec.matrix_root,
                    upgraded_member,
                    reward_rec.matrix_layer,
                    'upgrade_reward',
                    reward_amount,
                    new_level,
                    reward_rec.matrix_position,
                    reward_rec.matrix_root,
                    'approved',
                    true,
                    false,
                    NOW()
                );
                immediate_count := immediate_count + 1;
                
            ELSE
                -- 创建待定奖励
                INSERT INTO layer_rewards (
                    id,
                    recipient_wallet,
                    payer_wallet,
                    layer,
                    reward_type,
                    amount_usdt,
                    nft_level,
                    matrix_position,
                    matrix_root,
                    status,
                    qualification_check,
                    is_claimed,
                    created_at
                ) VALUES (
                    reward_id,
                    reward_rec.matrix_root,
                    upgraded_member,
                    reward_rec.matrix_layer,
                    'upgrade_reward',
                    reward_amount,
                    new_level,
                    reward_rec.matrix_position,
                    reward_rec.matrix_root,
                    'pending',
                    false,
                    false,
                    NOW()
                );
                
                -- 创建30天考核计时器
                new_timer_id := gen_random_uuid();
                INSERT INTO countdown_timers (
                    id,
                    wallet_address,
                    timer_type,
                    title,
                    description,
                    start_time,
                    end_time,
                    is_active,
                    auto_action,
                    auto_action_data,
                    metadata,
                    related_reward_id,
                    created_at
                ) VALUES (
                    new_timer_id,
                    reward_rec.matrix_root,
                    'r_position_qualification',
                    'R Position Reward Qualification',
                    'Upgrade to Level 2 within 30 days to receive reward',
                    NOW(),
                    NOW() + INTERVAL '30 days',
                    true,
                    'check_r_qualification',
                    jsonb_build_object(
                        'reward_id', reward_id,
                        'required_level', 2,
                        'upgrade_member', upgraded_member,
                        'reward_amount', reward_amount
                    ),
                    jsonb_build_object(
                        'matrix_position', reward_rec.matrix_position,
                        'matrix_layer', reward_rec.matrix_layer,
                        'current_level', reward_rec.root_current_level
                    ),
                    reward_id,
                    NOW()
                );
                
                -- 更新奖励记录关联timer
                UPDATE layer_rewards 
                SET timer_id = new_timer_id 
                WHERE id = reward_id;
                
                pending_count := pending_count + 1;
                timer_count := timer_count + 1;
            END IF;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT 
        'Level upgrade rewards processed: ' || total_count::TEXT || ' total, ' || 
        immediate_count::TEXT || ' immediate, ' || pending_count::TEXT || ' pending, ' || 
        timer_count::TEXT || ' timers',
        total_count,
        immediate_count, 
        pending_count,
        timer_count;
END;
$$ LANGUAGE plpgsql;

-- 测试奖励系统
SELECT '=== Testing Member Upgrade Rewards ===' as test_section;
SELECT * FROM trigger_member_upgrade_rewards('0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC', 1);

-- 查看奖励结果
SELECT '=== Reward Results ===' as section;
SELECT reward_id, recipient_wallet, matrix_position, amount_usdt, status, qualification_check 
FROM member_upgrade_rewards_status 
WHERE upgraded_member = '0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC'
LIMIT 5;

-- 查看创建的计时器
SELECT '=== Created Timers ===' as section; 
SELECT wallet_address, timer_type, title, is_active, end_time::DATE as deadline
FROM countdown_timers 
WHERE timer_type = 'r_position_qualification'
AND created_at > NOW() - INTERVAL '1 hour';
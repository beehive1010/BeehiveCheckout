-- ========================================
-- 会员升级Level 1奖励系统
-- 基于安置后的递归root分配layer_reward
-- L-M位置直接奖励，R位置需要考核
-- ========================================

-- 扩展layer_rewards表，添加必要的字段
ALTER TABLE layer_rewards ADD COLUMN IF NOT EXISTS matrix_position CHAR(1);
ALTER TABLE layer_rewards ADD COLUMN IF NOT EXISTS matrix_root VARCHAR(42);
ALTER TABLE layer_rewards ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE layer_rewards ADD COLUMN IF NOT EXISTS qualification_check BOOLEAN DEFAULT false;
ALTER TABLE layer_rewards ADD COLUMN IF NOT EXISTS timer_id UUID;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_layer_rewards_matrix_position ON layer_rewards (matrix_position);
CREATE INDEX IF NOT EXISTS idx_layer_rewards_status ON layer_rewards (status);
CREATE INDEX IF NOT EXISTS idx_layer_rewards_timer ON layer_rewards (timer_id);

-- 扩展countdown_timers表，添加奖励相关字段
ALTER TABLE countdown_timers ADD COLUMN IF NOT EXISTS related_reward_id UUID;
CREATE INDEX IF NOT EXISTS idx_countdown_timers_reward ON countdown_timers (related_reward_id);

-- 创建会员升级奖励触发函数
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
    RAISE NOTICE '开始处理会员 % 的Level %升级奖励', upgraded_member, new_level;
    
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
        
        RAISE NOTICE '处理奖励: Root=% Position=% Layer=% RootLevel=%', 
            reward_rec.matrix_root, reward_rec.matrix_position, 
            reward_rec.matrix_layer, reward_rec.root_current_level;
        
        -- 生成奖励记录ID
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
                'approved', -- 直接批准
                true, -- 通过考核
                false,
                NOW()
            );
            
            immediate_count := immediate_count + 1;
            RAISE NOTICE '  -> 直接奖励 %位置: $% 给 %', reward_rec.matrix_position, reward_amount, reward_rec.matrix_root;
            
        -- R位置：需要考核root是否>=level 2
        ELSIF reward_rec.matrix_position = 'R' THEN
            IF reward_rec.root_current_level >= 2 THEN
                -- Root等级满足要求，直接奖励
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
                    'approved', -- 直接批准
                    true, -- 通过考核
                    false,
                    NOW()
                );
                
                immediate_count := immediate_count + 1;
                RAISE NOTICE '  -> R位置考核通过: $% 给 % (等级%)', reward_amount, reward_rec.matrix_root, reward_rec.root_current_level;
                
            ELSE
                -- Root等级不满足，创建待定奖励和倒计时
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
                    'pending', -- 待定状态
                    false, -- 未通过考核
                    false,
                    NOW()
                );
                
                -- 创建倒计时器 (30天考核期)
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
                    'R位置奖励考核期',
                    format('您需要在30天内升级到Level 2以获得来自%s的$%奖励', upgraded_member, reward_amount),
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
                    new_timer_id,
                    NOW()
                );
                
                -- 更新奖励记录关联timer
                UPDATE layer_rewards 
                SET timer_id = new_timer_id 
                WHERE id = reward_id;
                
                pending_count := pending_count + 1;
                timer_count := timer_count + 1;
                RAISE NOTICE '  -> R位置待定: 创建考核期 % 天 (当前等级%<2)', 30, reward_rec.root_current_level;
            END IF;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT 
        format('Level %升级奖励处理完成，总共%个奖励：%个立即发放，%个待考核，创建%个计时器', 
               new_level, total_count, immediate_count, pending_count, timer_count),
        total_count,
        immediate_count, 
        pending_count,
        timer_count;
END;
$$ LANGUAGE plpgsql;

-- 创建检查R位置考核的函数
CREATE OR REPLACE FUNCTION check_r_position_qualification(timer_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    timer_rec RECORD;
    reward_id UUID;
    required_level INTEGER;
    current_level INTEGER;
BEGIN
    -- 获取计时器信息
    SELECT * INTO timer_rec FROM countdown_timers WHERE id = timer_uuid;
    
    IF NOT FOUND THEN
        RETURN 'Timer not found';
    END IF;
    
    reward_id := (timer_rec.auto_action_data->>'reward_id')::UUID;
    required_level := (timer_rec.auto_action_data->>'required_level')::INTEGER;
    
    -- 获取当前等级
    SELECT current_level INTO current_level 
    FROM members 
    WHERE wallet_address = timer_rec.wallet_address;
    
    IF current_level >= required_level THEN
        -- 通过考核，批准奖励
        UPDATE layer_rewards 
        SET status = 'approved',
            qualification_check = true,
            updated_at = NOW()
        WHERE id = reward_id;
        
        -- 完成计时器
        UPDATE countdown_timers 
        SET is_active = false,
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = timer_uuid;
        
        RETURN format('考核通过：会员%s升级到Level %，奖励已批准', timer_rec.wallet_address, current_level);
    ELSE
        -- 仍未达到要求，保持待定状态
        RETURN format('考核未通过：会员%s当前Level %，需要Level %', timer_rec.wallet_address, current_level, required_level);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 创建定期检查所有待定奖励的函数
CREATE OR REPLACE FUNCTION check_all_pending_r_rewards()
RETURNS TABLE(
    checked_count INTEGER,
    approved_count INTEGER,
    still_pending INTEGER
) AS $$
DECLARE
    checked INTEGER := 0;
    approved INTEGER := 0;
    pending INTEGER := 0;
    timer_rec RECORD;
    result TEXT;
BEGIN
    -- 检查所有活跃的R位置考核计时器
    FOR timer_rec IN
        SELECT id FROM countdown_timers 
        WHERE timer_type = 'r_position_qualification' 
        AND is_active = true
        ORDER BY created_at
    LOOP
        checked := checked + 1;
        result := check_r_position_qualification(timer_rec.id);
        
        IF result LIKE '%考核通过%' THEN
            approved := approved + 1;
        ELSE
            pending := pending + 1;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT checked, approved, pending;
END;
$$ LANGUAGE plpgsql;

-- 创建查看奖励状态的VIEW
CREATE OR REPLACE VIEW member_upgrade_rewards_status AS
SELECT 
    lr.id as reward_id,
    lr.recipient_wallet,
    lr.payer_wallet as upgraded_member,
    lr.layer as matrix_layer,
    lr.matrix_position,
    lr.amount_usdt,
    lr.status,
    lr.qualification_check,
    lr.is_claimed,
    lr.created_at,
    m.current_level as recipient_current_level,
    ct.id as timer_id,
    ct.end_time as qualification_deadline,
    ct.is_active as timer_active,
    CASE 
        WHEN lr.status = 'approved' THEN '已批准'
        WHEN lr.status = 'pending' AND ct.is_active = true THEN '考核期中'
        WHEN lr.status = 'pending' AND ct.is_active = false THEN '考核已结束'
        ELSE '未知状态'
    END as status_chinese
FROM layer_rewards lr
LEFT JOIN members m ON m.wallet_address = lr.recipient_wallet
LEFT JOIN countdown_timers ct ON ct.id = lr.timer_id
WHERE lr.reward_type = 'upgrade_reward'
ORDER BY lr.created_at DESC;

-- 测试函数：处理一个会员的升级
RAISE NOTICE '=== 开始测试会员升级奖励系统 ===';

-- 测试：给一个存在的会员创建升级奖励
SELECT * FROM trigger_member_upgrade_rewards('0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC', 1);

-- 查看奖励状态
SELECT '=== 奖励状态查看 ===' as section;
SELECT * FROM member_upgrade_rewards_status LIMIT 5;

-- 查看创建的计时器
SELECT '=== 创建的计时器 ===' as section;
SELECT wallet_address, timer_type, title, end_time, is_active 
FROM countdown_timers 
WHERE timer_type = 'r_position_qualification'
ORDER BY created_at DESC LIMIT 3;
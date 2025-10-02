-- 创建3x3滑落Matrix层级奖励系统
-- ========================================
-- 基于MarketingPlan.md的奖励机制实现
-- Layer Rewards = NFT price, 需要检查matrix_root资格
-- ========================================

-- 第1步：创建层级奖励记录表
-- ========================================

SELECT '=== 创建层级奖励系统 ===' as status;

-- 创建member_rewards表（替代原有rewards表）
DROP TABLE IF EXISTS member_rewards CASCADE;
CREATE TABLE member_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_wallet VARCHAR(42) NOT NULL,           -- 获得奖励的会员
    reward_source_wallet VARCHAR(42) NOT NULL,    -- 触发奖励的会员
    matrix_root_wallet VARCHAR(42) NOT NULL,      -- Matrix根节点（获得奖励的会员）
    
    -- 奖励基本信息
    reward_type VARCHAR(20) NOT NULL CHECK (reward_type IN ('layer_reward', 'direct_referral', 'spillover_bonus')),
    layer_number INTEGER NOT NULL DEFAULT 1,      -- 层级编号 (1-19)
    reward_amount_usdt DECIMAL(18,6) NOT NULL,    -- 奖励金额(USDT)
    
    -- Matrix位置信息
    matrix_layer INTEGER NOT NULL DEFAULT 1,      -- Matrix层级
    matrix_position CHAR(1) CHECK (matrix_position IN ('L','M','R')),
    
    -- 奖励状态管理
    reward_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (reward_status IN ('pending', 'claimable', 'claimed', 'expired')),
    
    -- 时间管理（72小时timer）
    created_at TIMESTAMP DEFAULT NOW(),
    claimable_at TIMESTAMP,                       -- 可claim时间（72小时后）
    claimed_at TIMESTAMP,                         -- 实际claim时间
    expires_at TIMESTAMP,                         -- 过期时间
    
    -- 资格验证信息
    root_level_required INTEGER NOT NULL,         -- 需要的root member level
    root_level_actual INTEGER NOT NULL,           -- 实际的root member level  
    qualification_met BOOLEAN NOT NULL DEFAULT false, -- 是否满足资格
    qualification_check_time TIMESTAMP DEFAULT NOW(),
    
    -- 外键约束
    FOREIGN KEY (member_wallet) REFERENCES membership(wallet_address) ON DELETE CASCADE,
    FOREIGN KEY (reward_source_wallet) REFERENCES membership(wallet_address) ON DELETE CASCADE,
    FOREIGN KEY (matrix_root_wallet) REFERENCES membership(wallet_address) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX idx_member_rewards_member ON member_rewards(member_wallet);
CREATE INDEX idx_member_rewards_status ON member_rewards(reward_status);
CREATE INDEX idx_member_rewards_layer ON member_rewards(layer_number);
CREATE INDEX idx_member_rewards_created ON member_rewards(created_at);
CREATE INDEX idx_member_rewards_claimable ON member_rewards(claimable_at) WHERE reward_status = 'pending';

-- 第2步：创建层级奖励资格检查函数
-- ========================================

-- 检查matrix_root是否满足层级奖励条件
CREATE OR REPLACE FUNCTION check_layer_reward_qualification(
    p_matrix_root_wallet VARCHAR(42),
    p_layer_number INTEGER
) RETURNS TABLE(
    qualified BOOLEAN,
    current_level INTEGER,
    required_level INTEGER,
    direct_referrals_count BIGINT,
    required_direct_referrals INTEGER,
    qualification_details TEXT
) AS $$
DECLARE
    root_member RECORD;
    required_level_for_layer INTEGER;
    required_direct_refs INTEGER;
    actual_direct_refs BIGINT;
BEGIN
    -- 获取matrix root基础信息
    SELECT m.current_level, m.username, m.activation_id
    INTO root_member
    FROM membership m
    WHERE m.wallet_address = p_matrix_root_wallet;
    
    IF root_member IS NULL THEN
        RETURN QUERY SELECT false, 0, 0, 0::BIGINT, 0, 'Matrix root member not found';
        RETURN;
    END IF;
    
    -- 根据MarketingPlan.md规则确定所需level
    -- Layer 1 Right slot需要Level 2, Level 2需要3个直推
    CASE 
        WHEN p_layer_number = 1 THEN 
            required_level_for_layer := 2;
            required_direct_refs := 3;
        WHEN p_layer_number <= 3 THEN
            required_level_for_layer := 3;
            required_direct_refs := 5;
        WHEN p_layer_number <= 6 THEN
            required_level_for_layer := 5;
            required_direct_refs := 10;
        WHEN p_layer_number <= 10 THEN
            required_level_for_layer := 8;
            required_direct_refs := 20;
        WHEN p_layer_number <= 15 THEN
            required_level_for_layer := 12;
            required_direct_refs := 50;
        ELSE
            required_level_for_layer := 19;
            required_direct_refs := 100;
    END CASE;
    
    -- 计算实际直推数量
    SELECT COUNT(*)
    INTO actual_direct_refs
    FROM matrix_placements mp
    WHERE mp.matrix_root = p_matrix_root_wallet
    AND mp.is_direct_referral = true;
    
    -- 返回资格检查结果
    RETURN QUERY SELECT 
        (root_member.current_level >= required_level_for_layer AND actual_direct_refs >= required_direct_refs),
        root_member.current_level,
        required_level_for_layer,
        actual_direct_refs,
        required_direct_refs,
        CASE 
            WHEN root_member.current_level >= required_level_for_layer AND actual_direct_refs >= required_direct_refs THEN
                'Qualified: Level ' || root_member.current_level || ' with ' || actual_direct_refs || ' direct referrals'
            WHEN root_member.current_level < required_level_for_layer THEN
                'Insufficient level: ' || root_member.current_level || ' < ' || required_level_for_layer
            ELSE
                'Insufficient direct referrals: ' || actual_direct_refs || ' < ' || required_direct_refs
        END;
END;
$$ LANGUAGE plpgsql;

-- 第3步：创建层级奖励计算核心函数
-- ========================================

-- 3x3滑落Matrix层级奖励计算主函数
CREATE OR REPLACE FUNCTION calculate_layer_rewards_3x3(
    p_new_member_wallet VARCHAR(42),
    p_nft_level INTEGER
) RETURNS JSONB AS $$
DECLARE
    placement_record RECORD;
    current_root VARCHAR(42);
    current_layer INTEGER;
    layer_count INTEGER := 0;
    reward_record RECORD;
    nft_price DECIMAL(18,6);
    qualification_check RECORD;
    result JSONB := '[]'::jsonb;
    reward_summary TEXT := '';
BEGIN
    -- 获取新会员的placement信息
    SELECT mp.matrix_root, mp.matrix_layer, mp.matrix_position
    INTO placement_record
    FROM matrix_placements mp
    WHERE mp.member_wallet = p_new_member_wallet
    ORDER BY mp.placed_at DESC
    LIMIT 1;
    
    IF placement_record IS NULL THEN
        RETURN jsonb_build_object('error', 'No placement record found for new member');
    END IF;
    
    -- 获取NFT价格
    SELECT nml.nft_price_usdt
    INTO nft_price
    FROM nft_membership_levels nml
    WHERE nml.level = p_nft_level;
    
    IF nft_price IS NULL THEN
        nft_price := 100.00; -- 默认价格
    END IF;
    
    -- 从placement位置开始向上计算19层奖励
    current_root := placement_record.matrix_root;
    current_layer := placement_record.matrix_layer;
    
    -- 计算19层Layer Rewards
    FOR layer_num IN 1..19 LOOP
        EXIT WHEN current_root IS NULL;
        
        -- 检查当前root的资格
        SELECT * INTO qualification_check
        FROM check_layer_reward_qualification(current_root, layer_num);
        
        -- 创建奖励记录
        INSERT INTO member_rewards (
            member_wallet,
            reward_source_wallet,
            matrix_root_wallet,
            reward_type,
            layer_number,
            reward_amount_usdt,
            matrix_layer,
            matrix_position,
            reward_status,
            claimable_at,
            expires_at,
            root_level_required,
            root_level_actual,
            qualification_met
        ) VALUES (
            current_root,                                    -- 获得奖励的会员
            p_new_member_wallet,                            -- 触发奖励的会员
            current_root,                                   -- Matrix根节点
            'layer_reward',
            layer_num,
            nft_price,                                      -- Layer Reward = NFT price
            current_layer,
            placement_record.matrix_position,
            CASE 
                WHEN qualification_check.qualified THEN 'claimable'
                ELSE 'pending'
            END,
            CASE 
                WHEN qualification_check.qualified THEN NOW()
                ELSE NOW() + INTERVAL '72 hours'
            END,
            NOW() + INTERVAL '30 days',                     -- 30天过期
            qualification_check.required_level,
            qualification_check.current_level,
            qualification_check.qualified
        ) RETURNING * INTO reward_record;
        
        -- 添加到结果
        result := result || jsonb_build_object(
            'layer', layer_num,
            'recipient_wallet', current_root,
            'amount_usdt', nft_price,
            'status', reward_record.reward_status,
            'qualified', qualification_check.qualified,
            'qualification_details', qualification_check.qualification_details
        );
        
        layer_count := layer_count + 1;
        
        -- 寻找上一层的matrix_root
        SELECT mp.matrix_root
        INTO current_root
        FROM matrix_placements mp
        WHERE mp.member_wallet = current_root
        ORDER BY mp.placed_at DESC
        LIMIT 1;
        
        current_layer := current_layer + 1;
    END LOOP;
    
    -- 构建返回结果
    RETURN jsonb_build_object(
        'success', true,
        'new_member', p_new_member_wallet,
        'nft_level', p_nft_level,
        'nft_price_usdt', nft_price,
        'total_layers_processed', layer_count,
        'layer_rewards', result,
        'summary', 'Created ' || layer_count || ' layer rewards, each worth ' || nft_price || ' USDT'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'error', 'Layer reward calculation failed: ' || SQLERRM,
            'new_member', p_new_member_wallet
        );
END;
$$ LANGUAGE plpgsql;

-- 第4步：创建奖励状态管理函数
-- ========================================

-- 更新奖励状态（pending -> claimable，基于72小时timer）
CREATE OR REPLACE FUNCTION update_reward_status_by_timer()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    -- 将符合条件的pending奖励更新为claimable
    WITH qualification_recheck AS (
        SELECT 
            mr.id,
            mr.member_wallet,
            mr.layer_number,
            lrq.qualified
        FROM member_rewards mr
        CROSS JOIN LATERAL check_layer_reward_qualification(mr.member_wallet, mr.layer_number) lrq
        WHERE mr.reward_status = 'pending'
        AND mr.claimable_at <= NOW()
        AND lrq.qualified = true
    )
    UPDATE member_rewards 
    SET reward_status = 'claimable',
        qualification_met = true,
        qualification_check_time = NOW()
    FROM qualification_recheck qr
    WHERE member_rewards.id = qr.id;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- 将过期的奖励标记为expired
    UPDATE member_rewards 
    SET reward_status = 'expired'
    WHERE reward_status IN ('pending', 'claimable')
    AND expires_at <= NOW();
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Claim奖励函数
CREATE OR REPLACE FUNCTION claim_layer_reward(
    p_reward_id UUID,
    p_member_wallet VARCHAR(42)
) RETURNS JSONB AS $$
DECLARE
    reward_record RECORD;
    balance_updated BOOLEAN := false;
BEGIN
    -- 验证奖励记录
    SELECT * INTO reward_record
    FROM member_rewards
    WHERE id = p_reward_id
    AND member_wallet = p_member_wallet
    AND reward_status = 'claimable';
    
    IF reward_record IS NULL THEN
        RETURN jsonb_build_object('error', 'Reward not found or not claimable');
    END IF;
    
    -- 更新member_balances
    INSERT INTO member_balances (
        member_wallet,
        balance_type,
        amount_usdt,
        transaction_type,
        description,
        created_at
    ) VALUES (
        p_member_wallet,
        'earnings',
        reward_record.reward_amount_usdt,
        'layer_reward_claim',
        'Layer ' || reward_record.layer_number || ' reward claimed',
        NOW()
    );
    
    -- 标记奖励为已claim
    UPDATE member_rewards
    SET reward_status = 'claimed',
        claimed_at = NOW()
    WHERE id = p_reward_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'reward_id', p_reward_id,
        'amount_usdt', reward_record.reward_amount_usdt,
        'layer_number', reward_record.layer_number,
        'claimed_at', NOW()
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', 'Claim failed: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 第5步：创建自动触发器（当用户激活时触发层级奖励）
-- ========================================

-- 激活会员时自动触发层级奖励计算
CREATE OR REPLACE FUNCTION trigger_activation_rewards()
RETURNS TRIGGER AS $$
BEGIN
    -- 当新增matrix_placement时，触发层级奖励计算
    IF TG_OP = 'INSERT' THEN
        -- 异步计算层级奖励
        PERFORM calculate_layer_rewards_3x3(
            NEW.member_wallet,
            (SELECT current_level FROM membership WHERE wallet_address = NEW.member_wallet)
        );
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_matrix_placement_rewards ON matrix_placements;
CREATE TRIGGER trigger_matrix_placement_rewards
    AFTER INSERT ON matrix_placements
    FOR EACH ROW
    EXECUTE FUNCTION trigger_activation_rewards();

-- 第6步：验证层级奖励系统
-- ========================================

SELECT '=== 层级奖励系统创建完成 ===' as status;

-- 显示member_rewards表结构
SELECT '=== member_rewards表结构 ===' as section;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE WHEN column_name IN ('member_wallet', 'reward_status', 'layer_number') THEN 'CRITICAL' 
         ELSE 'OPTIONAL' END as importance
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'member_rewards'
ORDER BY ordinal_position;

-- 测试资格检查函数
SELECT '=== 资格检查函数测试 ===' as section;
SELECT layer_number, qualified, current_level, required_level, direct_referrals_count, qualification_details
FROM check_layer_reward_qualification('0x0000000000000000000000000000000000000000', 1)
UNION ALL
SELECT layer_number, qualified, current_level, required_level, direct_referrals_count, qualification_details  
FROM check_layer_reward_qualification('0x0000000000000000000000000000000000000000', 5)
ORDER BY layer_number;

-- 显示系统使用说明
SELECT '=== 层级奖励系统使用说明 ===' as usage_section;
SELECT 'Layer Reward System Functions:' as title,
       'calculate_layer_rewards_3x3(wallet, nft_level) - 计算19层奖励' as function1,
       'claim_layer_reward(reward_id, wallet) - Claim奖励' as function2,
       'update_reward_status_by_timer() - 更新72小时timer状态' as function3,
       'check_layer_reward_qualification(wallet, layer) - 检查资格' as function4;
-- 修复正确的3x3 Matrix Spillover算法
-- 实现全局spillover填满空位的逻辑

-- 创建正确的matrix placement函数
CREATE OR REPLACE FUNCTION find_matrix_placement(
    p_new_member_wallet VARCHAR(42),
    p_referrer_wallet VARCHAR(42) DEFAULT NULL
) 
RETURNS TABLE(
    matrix_owner VARCHAR(42),
    layer INTEGER,
    position VARCHAR(1),
    placement_reason TEXT
) AS $$
DECLARE
    v_root_wallet VARCHAR(42) := '0x0000000000000000000000000000000000000001';
    v_current_layer INTEGER := 1;
    v_current_position VARCHAR(1);
    v_matrix_owner VARCHAR(42);
    v_positions VARCHAR(1)[] := ARRAY['L', 'M', 'R'];
    v_layer_members VARCHAR(42)[];
    v_member_wallet VARCHAR(42);
    v_found_placement BOOLEAN := FALSE;
BEGIN
    -- 首先检查是否有直推关系
    IF p_referrer_wallet IS NOT NULL THEN
        -- 检查推荐人的matrix是否有空位
        FOR v_current_position IN SELECT unnest(v_positions) LOOP
            -- 检查推荐人的Layer 1是否有这个位置的空位
            IF NOT EXISTS (
                SELECT 1 FROM individual_matrix_placements 
                WHERE matrix_owner = p_referrer_wallet 
                AND layer_in_owner_matrix = 1 
                AND position_in_layer = v_current_position
                AND is_active = true
            ) THEN
                -- 找到空位，直接放入
                matrix_owner := p_referrer_wallet;
                layer := 1;
                position := v_current_position;
                placement_reason := 'Direct referral placement in referrer matrix';
                v_found_placement := TRUE;
                RETURN NEXT;
                RETURN;
            END IF;
        END LOOP;
        
        -- 推荐人matrix满了，检查推荐人matrix的成员是否有空位
        FOR v_current_position IN SELECT unnest(v_positions) LOOP
            SELECT member_wallet INTO v_member_wallet
            FROM individual_matrix_placements 
            WHERE matrix_owner = p_referrer_wallet 
            AND layer_in_owner_matrix = 1 
            AND position_in_layer = v_current_position
            AND is_active = true
            LIMIT 1;
            
            IF v_member_wallet IS NOT NULL THEN
                -- 检查这个成员的matrix是否有空位
                FOR v_current_position IN SELECT unnest(v_positions) LOOP
                    IF NOT EXISTS (
                        SELECT 1 FROM individual_matrix_placements 
                        WHERE matrix_owner = v_member_wallet 
                        AND layer_in_owner_matrix = 1 
                        AND position_in_layer = v_current_position
                        AND is_active = true
                    ) THEN
                        -- 找到空位，spillover到这里
                        matrix_owner := v_member_wallet;
                        layer := 1;
                        position := v_current_position;
                        placement_reason := 'Spillover to referrer''s downline matrix';
                        v_found_placement := TRUE;
                        RETURN NEXT;
                        RETURN;
                    END IF;
                END LOOP;
            END IF;
        END LOOP;
    END IF;
    
    -- 如果没有直推或直推满了，进入全局spillover逻辑
    -- 从root开始，按层级和位置顺序查找空位
    v_current_layer := 1;
    v_matrix_owner := v_root_wallet;
    
    WHILE v_current_layer <= 10 AND NOT v_found_placement LOOP -- 最多查找10层
        -- 检查root matrix的当前层是否有空位
        FOR v_current_position IN SELECT unnest(v_positions) LOOP
            IF NOT EXISTS (
                SELECT 1 FROM individual_matrix_placements 
                WHERE matrix_owner = v_root_wallet 
                AND layer_in_owner_matrix = v_current_layer 
                AND position_in_layer = v_current_position
                AND is_active = true
            ) THEN
                -- 找到空位
                matrix_owner := v_root_wallet;
                layer := v_current_layer;
                position := v_current_position;
                placement_reason := 'Global spillover in root matrix layer ' || v_current_layer;
                v_found_placement := TRUE;
                RETURN NEXT;
                RETURN;
            END IF;
        END LOOP;
        
        -- 当前层满了，检查当前层的所有成员的matrix
        SELECT array_agg(member_wallet) INTO v_layer_members
        FROM individual_matrix_placements 
        WHERE matrix_owner = v_root_wallet 
        AND layer_in_owner_matrix = v_current_layer
        AND is_active = true;
        
        -- 遍历当前层的所有成员，检查他们的matrix
        FOR v_member_wallet IN SELECT unnest(v_layer_members) LOOP
            FOR v_current_position IN SELECT unnest(v_positions) LOOP
                IF NOT EXISTS (
                    SELECT 1 FROM individual_matrix_placements 
                    WHERE matrix_owner = v_member_wallet 
                    AND layer_in_owner_matrix = 1 
                    AND position_in_layer = v_current_position
                    AND is_active = true
                ) THEN
                    -- 找到空位，spillover到这个成员的matrix
                    matrix_owner := v_member_wallet;
                    layer := 1;
                    position := v_current_position;
                    placement_reason := 'Global spillover to layer ' || v_current_layer || ' member matrix';
                    v_found_placement := TRUE;
                    RETURN NEXT;
                    RETURN;
                END IF;
            END LOOP;
        END LOOP;
        
        -- 当前层的所有成员matrix都满了，检查下一层
        v_current_layer := v_current_layer + 1;
    END LOOP;
    
    -- 如果还没找到，说明系统有问题，强制放在root的下一层
    IF NOT v_found_placement THEN
        matrix_owner := v_root_wallet;
        layer := v_current_layer;
        position := 'L';
        placement_reason := 'Emergency placement - system capacity reached';
        RETURN NEXT;
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- 创建更新版本的activate_nft_level1_membership函数，使用正确的placement算法
CREATE OR REPLACE FUNCTION activate_nft_level1_membership_correct(
    p_wallet_address VARCHAR(42),
    p_referrer_wallet VARCHAR(42) DEFAULT NULL,
    p_transaction_hash VARCHAR(66) DEFAULT NULL
) 
RETURNS JSON AS $$
DECLARE
    v_membership_id UUID;
    v_activation_rank BIGINT;
    v_platform_fee NUMERIC := 30.00;
    v_reward_amount NUMERIC := 100.00;
    v_matrix_owner VARCHAR(42);
    v_placement_layer INTEGER;
    v_placement_position VARCHAR(1);
    v_placement_reason TEXT;
    v_root_level INTEGER;
    v_reward_status VARCHAR(20);
    v_reward_id UUID;
    v_placement_order INTEGER;
    v_result JSON;
    placement_record RECORD;
BEGIN
    RAISE NOTICE 'Starting correct NFT Level 1 activation for wallet: %', p_wallet_address;
    
    -- 0. 确保user存在
    INSERT INTO users (wallet_address, username, role, created_at)
    VALUES (p_wallet_address, 'Member_' || RIGHT(p_wallet_address, 6), 'member', NOW())
    ON CONFLICT (wallet_address) DO NOTHING;
    
    -- 1. 获取activation_rank
    SELECT COALESCE(MAX(activation_rank), 0) + 1 
    INTO v_activation_rank 
    FROM membership;
    
    -- 2. 使用正确的placement算法找到位置
    SELECT * INTO placement_record 
    FROM find_matrix_placement(p_wallet_address, p_referrer_wallet);
    
    v_matrix_owner := placement_record.matrix_owner;
    v_placement_layer := placement_record.layer;
    v_placement_position := placement_record.position;
    v_placement_reason := placement_record.placement_reason;
    
    RAISE NOTICE 'Matrix placement found: Owner=%, Layer=%, Position=%, Reason=%', 
        v_matrix_owner, v_placement_layer, v_placement_position, v_placement_reason;
    
    -- 3. 创建members记录
    INSERT INTO members (
        wallet_address,
        current_level,
        levels_owned,
        has_pending_rewards,
        created_at,
        updated_at,
        activation_rank,
        bcc_locked_initial,
        bcc_locked_remaining,
        tier_level,
        referrer_wallet
    ) VALUES (
        p_wallet_address,
        1,
        '[1]'::jsonb,
        false,
        NOW(),
        NOW(),
        v_activation_rank,
        100.00,
        100.00,
        1,
        p_referrer_wallet
    ) ON CONFLICT (wallet_address) 
    DO UPDATE SET
        current_level = GREATEST(members.current_level, 1),
        levels_owned = CASE 
            WHEN members.levels_owned ? '1' THEN members.levels_owned
            ELSE members.levels_owned || '[1]'::jsonb
        END,
        updated_at = NOW(),
        activation_rank = COALESCE(members.activation_rank, v_activation_rank),
        tier_level = COALESCE(members.tier_level, 1),
        referrer_wallet = COALESCE(members.referrer_wallet, p_referrer_wallet);
        
    RAISE NOTICE 'Created/updated members record for wallet: %', p_wallet_address;
    
    -- 4. 创建membership记录
    INSERT INTO membership (
        wallet_address,
        referrer_wallet, 
        nft_level,
        claim_transaction_hash,
        claim_status,
        claimed_at,
        activated_at,
        profile_completed,
        payment_verified,
        nft_verified,
        member_created_at,
        activation_rank,
        activation_tier,
        bcc_locked_amount,
        platform_activation_fee,
        member_created,
        created_at,
        updated_at
    ) VALUES (
        p_wallet_address,
        p_referrer_wallet,
        1,
        p_transaction_hash,
        'completed',
        NOW(),
        NOW(),
        true,
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
    
    RAISE NOTICE 'Created membership record with ID: %', v_membership_id;
    
    -- 5. 记录平台费用
    INSERT INTO platform_fees (
        fee_type,
        fee_amount_usdc,
        applies_to,
        nft_level,
        description,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        'level_1_nft_fee',
        v_platform_fee,
        'specific_level',
        1,
        'Platform activation fee collected from Level 1 NFT claim by ' || p_wallet_address,
        true,
        NOW(),
        NOW()
    );
    
    -- 6. 确定奖励接收者和层级
    SELECT current_level INTO v_root_level
    FROM members 
    WHERE wallet_address = v_matrix_owner;
    
    v_root_level := COALESCE(v_root_level, 19); -- root默认level 19
    
    -- 7. 判断奖励状态
    IF v_root_level >= 1 THEN
        v_reward_status := 'layer_reward'; -- claimable
        RAISE NOTICE 'Reward status: CLAIMABLE (matrix owner level % >= 1)', v_root_level;
    ELSE
        v_reward_status := 'pending_layer_reward'; -- pending
        RAISE NOTICE 'Reward status: PENDING (matrix owner level % < 1)', v_root_level;
    END IF;
    
    -- 8. 创建Layer奖励（奖励给matrix owner）
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
        v_matrix_owner,
        p_wallet_address,
        v_placement_layer,
        v_reward_amount,
        v_reward_amount,
        v_reward_status,
        false,
        NOW(),
        NOW()
    ) RETURNING id INTO v_reward_id;
    
    RAISE NOTICE 'Created Layer % reward: % USDC for matrix owner: %', 
        v_placement_layer, v_reward_amount, v_matrix_owner;
    
    -- 9. 记录referrals关系（全局matrix视图）
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
        COALESCE(p_referrer_wallet, '0x0000000000000000000000000000000000000001'),
        '0x0000000000000000000000000000000000000001', -- 全局都是root matrix
        v_placement_layer,
        v_placement_position,
        true,
        v_activation_rank,
        NOW()
    );
    
    -- 10. 获取placement_order
    SELECT COALESCE(MAX(placement_order), 0) + 1 
    INTO v_placement_order 
    FROM individual_matrix_placements 
    WHERE matrix_owner = v_matrix_owner;
    
    -- 11. 创建individual_matrix_placements记录（个人matrix视图）
    INSERT INTO individual_matrix_placements (
        matrix_owner,
        member_wallet,
        layer_in_owner_matrix,
        position_in_layer,
        placement_order,
        placed_at,
        is_active
    ) VALUES (
        v_matrix_owner,
        p_wallet_address,
        v_placement_layer,
        v_placement_position,
        v_placement_order,
        NOW(),
        true
    );
    
    RAISE NOTICE 'Created individual_matrix_placements: % in % matrix (Layer % %)', 
        p_wallet_address, v_matrix_owner, v_placement_layer, v_placement_position;
    
    -- 12. 创建matrix_activity_log记录
    INSERT INTO matrix_activity_log (
        root_wallet,
        member_wallet,
        activity_type,
        layer,
        position,
        details,
        created_at
    ) VALUES (
        '0x0000000000000000000000000000000000000001', -- 全局root
        p_wallet_address,
        'member_placement',
        v_placement_layer,
        v_placement_position,
        jsonb_build_object(
            'activation_rank', v_activation_rank,
            'placement_order', v_placement_order,
            'matrix_owner', v_matrix_owner,
            'placement_reason', v_placement_reason,
            'referrer_wallet', COALESCE(p_referrer_wallet, '0x0000000000000000000000000000000000000001'),
            'transaction_hash', p_transaction_hash,
            'nft_level', 1,
            'reward_triggered', v_reward_status = 'layer_reward'
        ),
        NOW()
    );
    
    -- 13. 更新余额
    IF v_reward_status = 'layer_reward' THEN
        INSERT INTO user_balances (
            wallet_address,
            usdc_claimable,
            usdc_pending,
            usdc_claimed_total,
            bcc_transferable,
            bcc_locked,
            bcc_total_initial,
            created_at,
            updated_at
        ) VALUES (
            v_matrix_owner,
            v_reward_amount,
            0,
            0,
            v_reward_amount,
            0,
            v_reward_amount,
            NOW(),
            NOW()
        ) ON CONFLICT (wallet_address)
        DO UPDATE SET
            usdc_claimable = user_balances.usdc_claimable + v_reward_amount,
            bcc_transferable = user_balances.bcc_transferable + v_reward_amount,
            bcc_total_initial = user_balances.bcc_total_initial + v_reward_amount,
            updated_at = NOW();
            
        RAISE NOTICE 'Updated claimable balance for matrix owner: % USDC', v_reward_amount;
    END IF;
    
    -- 14. 为新用户创建初始BCC余额
    INSERT INTO user_balances (
        wallet_address,
        usdc_claimable,
        usdc_pending,
        usdc_claimed_total,
        bcc_transferable,
        bcc_locked,
        bcc_total_initial,
        created_at,
        updated_at
    ) VALUES (
        p_wallet_address,
        0,
        0,
        0,
        500, -- 初始可转账BCC
        10450, -- 初始锁仓BCC  
        10950, -- 总计
        NOW(),
        NOW()
    ) ON CONFLICT (wallet_address) DO NOTHING;
    
    RAISE NOTICE 'Created initial BCC balance for new member: %', p_wallet_address;
    
    -- 构建结果
    v_result := json_build_object(
        'success', true,
        'membership_id', v_membership_id,
        'activation_rank', v_activation_rank,
        'platform_fee_usdc', v_platform_fee,
        'matrix_owner', v_matrix_owner,
        'placement_layer', v_placement_layer,
        'placement_position', v_placement_position,
        'placement_reason', v_placement_reason,
        'reward_id', v_reward_id,
        'reward_amount_usdc', v_reward_amount,
        'reward_status', v_reward_status,
        'placement_order', v_placement_order,
        'message', 'NFT Level 1 activation completed with correct 3x3 matrix placement'
    );
    
    RAISE NOTICE 'Correct NFT Level 1 activation completed successfully';
    RETURN v_result;
    
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in correct NFT Level 1 activation: %', SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Correct NFT Level 1 activation failed'
        );
END;
$$ LANGUAGE plpgsql;

-- 创建查询函数检验matrix结构
CREATE OR REPLACE FUNCTION check_matrix_structure()
RETURNS TABLE(
    matrix_owner_name TEXT,
    layer INTEGER,
    l_member TEXT,
    m_member TEXT,
    r_member TEXT,
    is_full BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH matrix_data AS (
        SELECT 
            imp.matrix_owner,
            u_owner.username as owner_name,
            imp.layer_in_owner_matrix as layer,
            imp.position_in_layer,
            u_member.username as member_name
        FROM individual_matrix_placements imp
        JOIN users u_owner ON imp.matrix_owner = u_owner.wallet_address
        JOIN users u_member ON imp.member_wallet = u_member.wallet_address
        WHERE imp.is_active = true
    )
    SELECT 
        md.owner_name,
        md.layer,
        MAX(CASE WHEN md.position_in_layer = 'L' THEN md.member_name END) as l_member,
        MAX(CASE WHEN md.position_in_layer = 'M' THEN md.member_name END) as m_member,
        MAX(CASE WHEN md.position_in_layer = 'R' THEN md.member_name END) as r_member,
        COUNT(*) = 3 as is_full
    FROM matrix_data md
    GROUP BY md.owner_name, md.layer
    ORDER BY md.owner_name, md.layer;
END;
$$ LANGUAGE plpgsql;

-- 检查当前的matrix结构
SELECT '🔍 Current Matrix Structure:' as info;
SELECT * FROM check_matrix_structure();

-- 展示正确的3x3 matrix规则说明
SELECT '📋 Correct 3x3 Matrix Rules:' as info;
SELECT 
    'Rule 1: Layer 1 only has 3 positions (L, M, R)' as rule
UNION ALL
SELECT 'Rule 2: 4th member spillover to Layer 1 L member''s matrix L position'
UNION ALL  
SELECT 'Rule 3: Continue L→M→R within each member''s matrix'
UNION ALL
SELECT 'Rule 4: When Layer 1 member matrices full, go to Layer 2'
UNION ALL
SELECT 'Rule 5: Global spillover ensures no gaps in placement'
UNION ALL
SELECT 'Rule 6: Matrix owner gets rewards when their matrix positions fill';
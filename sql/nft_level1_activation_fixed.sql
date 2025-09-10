-- 修复的NFT Level 1 激活函数 - 先确保user存在

CREATE OR REPLACE FUNCTION activate_nft_level1_membership(
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
    v_matrix_root VARCHAR(42);
    v_root_level INTEGER;
    v_reward_status VARCHAR(20);
    v_reward_id UUID;
    v_result JSON;
BEGIN
    RAISE NOTICE 'Starting NFT Level 1 activation for wallet: %', p_wallet_address;
    
    -- 0. 确保user存在
    INSERT INTO users (wallet_address, username, role, created_at)
    VALUES (p_wallet_address, 'Member_' || RIGHT(p_wallet_address, 6), 'member', NOW())
    ON CONFLICT (wallet_address) DO NOTHING;
    
    RAISE NOTICE 'Ensured user exists for wallet: %', p_wallet_address;
    
    -- 1. 获取下一个activation_rank
    SELECT COALESCE(MAX(activation_rank), 0) + 1 
    INTO v_activation_rank 
    FROM membership;
    
    RAISE NOTICE 'Assigned activation_rank: %', v_activation_rank;
    
    -- 2. 创建membership记录
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
    
    -- 3. 更新或创建members记录
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
        
    RAISE NOTICE 'Updated/created members record for wallet: %', p_wallet_address;
    
    -- 4. 记录平台费用
    INSERT INTO admin_platform_fees (
        section,
        fee_type,
        fee_amount_usdc,
        applies_to,
        applies_to_description,
        affected_levels,
        description,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        'NFT_ACTIVATION',
        'level_1_nft_fee',
        v_platform_fee,
        p_wallet_address,
        'Level 1 NFT activation fee for wallet: ' || p_wallet_address,
        1,
        'Platform activation fee collected from Level 1 NFT claim by ' || p_wallet_address,
        true,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'Recorded platform fee: % USDC', v_platform_fee;
    
    -- 5. 确定matrix root
    IF p_referrer_wallet IS NOT NULL THEN
        v_matrix_root := p_referrer_wallet;
        RAISE NOTICE 'Direct referral - matrix root: %', v_matrix_root;
    ELSE
        v_matrix_root := '0x0000000000000000000000000000000000000001';
        RAISE NOTICE 'Spillover placement - matrix root: %', v_matrix_root;
    END IF;
    
    -- 6. 获取matrix root等级
    SELECT current_level INTO v_root_level
    FROM members 
    WHERE wallet_address = v_matrix_root;
    
    v_root_level := COALESCE(v_root_level, 1);
    RAISE NOTICE 'Matrix root level: %', v_root_level;
    
    -- 7. 判断奖励状态
    IF v_root_level >= 1 THEN
        v_reward_status := 'layer_reward'; -- claimable
        RAISE NOTICE 'Reward status: CLAIMABLE (root level % >= 1)', v_root_level;
    ELSE
        v_reward_status := 'pending_layer_reward'; -- pending
        RAISE NOTICE 'Reward status: PENDING (root level % < 1)', v_root_level;
    END IF;
    
    -- 8. 创建Layer 1奖励
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
        1,
        v_reward_amount,
        v_reward_amount,
        v_reward_status,
        false,
        NOW(),
        NOW()
    ) RETURNING id INTO v_reward_id;
    
    RAISE NOTICE 'Created Layer 1 reward: % USDC for root: %', v_reward_amount, v_matrix_root;
    
    -- 9. 记录referrals关系
    INSERT INTO referrals (
        member_wallet,
        referrer_wallet,
        matrix_root,
        matrix_layer,
        matrix_position,
        created_at
    ) VALUES (
        p_wallet_address,
        COALESCE(p_referrer_wallet, v_matrix_root),
        v_matrix_root,
        1,
        'L', -- 简化位置逻辑
        NOW()
    );
    
    RAISE NOTICE 'Created referrals record';
    
    -- 10. 更新余额(如果claimable)
    IF v_reward_status = 'layer_reward' THEN
        INSERT INTO user_balances (
            wallet_address,
            usdc_claimable,
            usdc_pending,
            usdc_claimed_total,
            bcc_transferable,
            bcc_locked,
            created_at,
            updated_at
        ) VALUES (
            v_matrix_root,
            v_reward_amount,
            0,
            0,
            v_reward_amount,
            0,
            NOW(),
            NOW()
        ) ON CONFLICT (wallet_address)
        DO UPDATE SET
            usdc_claimable = user_balances.usdc_claimable + v_reward_amount,
            bcc_transferable = user_balances.bcc_transferable + v_reward_amount,
            updated_at = NOW();
            
        RAISE NOTICE 'Updated claimable balance for root: % USDC', v_reward_amount;
    END IF;
    
    -- 构建结果
    v_result := json_build_object(
        'success', true,
        'membership_id', v_membership_id,
        'activation_rank', v_activation_rank,
        'platform_fee_usdc', v_platform_fee,
        'matrix_root', v_matrix_root,
        'reward_id', v_reward_id,
        'reward_amount_usdc', v_reward_amount,
        'reward_status', v_reward_status,
        'message', 'NFT Level 1 activation completed successfully'
    );
    
    RAISE NOTICE 'NFT Level 1 activation completed successfully';
    RETURN v_result;
    
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in NFT Level 1 activation: %', SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'NFT Level 1 activation failed'
        );
END;
$$ LANGUAGE plpgsql;
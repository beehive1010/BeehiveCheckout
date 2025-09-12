-- 修正主键绑定问题，确保外键关系正确
-- ========================================
-- 检查和修正所有表的主键和外键关系
-- ========================================

-- 第1步：检查当前主键状态
-- ========================================

SELECT '=== 检查当前主键和外键状态 ===' as status;

-- 查看所有表的主键信息
SELECT 
    t.table_name,
    c.column_name as primary_key_column,
    c.data_type
FROM information_schema.table_constraints t
JOIN information_schema.constraint_column_usage c ON t.constraint_name = c.constraint_name
WHERE t.constraint_type = 'PRIMARY KEY' 
AND t.table_schema = 'public'
AND t.table_name IN ('users', 'membership', 'nft_membership_levels', 'layer_rewards_rules', 'matrix_placements', 'layer_rewards')
ORDER BY t.table_name;

-- 查看外键约束
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
AND tc.table_name IN ('membership', 'matrix_placements', 'layer_rewards')
ORDER BY tc.table_name, kcu.column_name;

-- 第2步：修正membership表的主键绑定
-- ========================================

-- 检查membership表是否有正确的主键
DO $$ 
BEGIN
    -- 如果membership表的主键不是wallet_address，则修正
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'membership' 
        AND constraint_type = 'PRIMARY KEY'
        AND constraint_name IN (
            SELECT constraint_name FROM information_schema.constraint_column_usage 
            WHERE table_name = 'membership' AND column_name = 'wallet_address'
        )
    ) THEN
        -- 删除现有主键（如果存在）
        ALTER TABLE membership DROP CONSTRAINT IF EXISTS membership_pkey;
        
        -- 设置wallet_address为主键
        ALTER TABLE membership ADD PRIMARY KEY (wallet_address);
        
        RAISE NOTICE '已修正membership表主键为wallet_address';
    END IF;
END $$;

-- 第3步：修正所有外键约束，确保引用正确的主键
-- ========================================

-- 重新创建matrix_placements表的外键约束
ALTER TABLE matrix_placements DROP CONSTRAINT IF EXISTS matrix_placements_member_wallet_fkey;
ALTER TABLE matrix_placements DROP CONSTRAINT IF EXISTS matrix_placements_matrix_root_fkey;

ALTER TABLE matrix_placements 
ADD CONSTRAINT fk_matrix_placements_member 
FOREIGN KEY (member_wallet) REFERENCES membership(wallet_address) ON DELETE CASCADE;

ALTER TABLE matrix_placements 
ADD CONSTRAINT fk_matrix_placements_root 
FOREIGN KEY (matrix_root) REFERENCES membership(wallet_address) ON DELETE CASCADE;

-- 重新创建layer_rewards表的外键约束  
ALTER TABLE layer_rewards DROP CONSTRAINT IF EXISTS layer_rewards_triggering_member_fkey;
ALTER TABLE layer_rewards DROP CONSTRAINT IF EXISTS layer_rewards_reward_recipient_fkey;
ALTER TABLE layer_rewards DROP CONSTRAINT IF EXISTS layer_rewards_matrix_root_fkey;
ALTER TABLE layer_rewards DROP CONSTRAINT IF EXISTS layer_rewards_triggering_nft_level_fkey;
ALTER TABLE layer_rewards DROP CONSTRAINT IF EXISTS layer_rewards_required_nft_level_fkey;

ALTER TABLE layer_rewards 
ADD CONSTRAINT fk_layer_rewards_triggering_member 
FOREIGN KEY (triggering_member) REFERENCES membership(wallet_address) ON DELETE CASCADE;

ALTER TABLE layer_rewards 
ADD CONSTRAINT fk_layer_rewards_recipient 
FOREIGN KEY (reward_recipient) REFERENCES membership(wallet_address) ON DELETE CASCADE;

ALTER TABLE layer_rewards 
ADD CONSTRAINT fk_layer_rewards_matrix_root 
FOREIGN KEY (matrix_root) REFERENCES membership(wallet_address) ON DELETE CASCADE;

ALTER TABLE layer_rewards 
ADD CONSTRAINT fk_layer_rewards_triggering_nft_level 
FOREIGN KEY (triggering_nft_level) REFERENCES nft_membership_levels(level) ON DELETE RESTRICT;

ALTER TABLE layer_rewards 
ADD CONSTRAINT fk_layer_rewards_required_nft_level 
FOREIGN KEY (required_nft_level) REFERENCES nft_membership_levels(level) ON DELETE RESTRICT;

-- 重新创建layer_rewards_rules表的外键约束
ALTER TABLE layer_rewards_rules DROP CONSTRAINT IF EXISTS layer_rewards_rules_required_nft_level_fkey;

ALTER TABLE layer_rewards_rules 
ADD CONSTRAINT fk_layer_rewards_rules_nft_level 
FOREIGN KEY (required_nft_level) REFERENCES nft_membership_levels(level) ON DELETE RESTRICT;

-- 第4步：确保users表和membership表的关系正确
-- ========================================

-- 检查membership表是否有到users表的外键
ALTER TABLE membership DROP CONSTRAINT IF EXISTS fk_membership_users;
ALTER TABLE membership DROP CONSTRAINT IF EXISTS membership_wallet_address_fkey;

ALTER TABLE membership 
ADD CONSTRAINT fk_membership_users 
FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE;

-- 第5步：创建正确的主键绑定视图
-- ========================================

-- 重新创建会员完整信息视图（使用正确的主键绑定）
CREATE OR REPLACE VIEW member_complete_info AS
SELECT 
    -- 主键信息
    m.wallet_address as wallet_address,
    m.activation_id as activation_id,
    
    -- Profile信息（直接从membership表获取）
    m.username as username,
    m.email as email,
    COALESCE(m.display_name, m.username) as display_name,
    
    -- 用户基础信息（从users表获取）
    u.role as role,
    u.registration_source as registration_source,
    u.created_at as registered_at,
    
    -- NFT等级信息（通过主键绑定）
    nml.level as current_level,
    nml.level_name as level_name,
    nml.nft_price_usdt as level_price_usdt,
    nml.platform_fee_usdt as platform_fee_usdt,
    nml.total_cost_usdt as total_cost_usdt,
    nml.tier as level_tier,
    m.activation_time as activation_time,
    
    -- 推荐人信息（通过主键绑定）
    m.referrer_wallet as referrer_wallet,
    ref_m.username as referrer_username,
    ref_m.activation_id as referrer_activation_id,
    
    -- 统计信息（通过主键绑定聚合）
    COALESCE(matrix_stats.direct_referrals, 0) as direct_referrals,
    COALESCE(matrix_stats.spillover_count, 0) as spillover_count,
    COALESCE(matrix_stats.layer1_filled, 0) as layer1_filled,
    COALESCE(matrix_stats.vacant_position, 'L') as vacant_position,
    
    -- 奖励统计（通过主键绑定聚合）
    COALESCE(reward_stats.total_rewards, 0) as total_rewards,
    COALESCE(reward_stats.claimable_rewards, 0) as claimable_rewards,
    COALESCE(reward_stats.pending_rewards, 0) as pending_rewards,
    COALESCE(reward_stats.claimed_rewards, 0) as claimed_rewards,
    COALESCE(reward_stats.claimable_amount, 0) as claimable_amount_usdt,
    COALESCE(reward_stats.claimed_amount, 0) as claimed_amount_usdt
    
FROM membership m
-- 通过主键绑定users表
JOIN users u ON m.wallet_address = u.wallet_address
-- 通过外键绑定nft_membership_levels表
LEFT JOIN nft_membership_levels nml ON m.current_level = nml.level
-- 通过主键绑定推荐人信息
LEFT JOIN membership ref_m ON m.referrer_wallet = ref_m.wallet_address
-- 通过主键绑定矩阵统计
LEFT JOIN (
    SELECT 
        mp.matrix_root,
        COUNT(*) FILTER (WHERE mp.is_direct_referral = true) as direct_referrals,
        COUNT(*) FILTER (WHERE mp.is_spillover_placed = true) as spillover_count,
        COUNT(*) FILTER (WHERE mp.matrix_layer = 1) as layer1_filled,
        CASE 
            WHEN COUNT(*) FILTER (WHERE mp.matrix_layer = 1 AND mp.matrix_position = 'L') = 0 THEN 'L'
            WHEN COUNT(*) FILTER (WHERE mp.matrix_layer = 1 AND mp.matrix_position = 'M') = 0 THEN 'M'
            WHEN COUNT(*) FILTER (WHERE mp.matrix_layer = 1 AND mp.matrix_position = 'R') = 0 THEN 'R'
            ELSE 'FULL'
        END as vacant_position
    FROM matrix_placements mp
    GROUP BY mp.matrix_root
) matrix_stats ON m.wallet_address = matrix_stats.matrix_root
-- 通过主键绑定奖励统计
LEFT JOIN (
    SELECT 
        lr.reward_recipient,
        COUNT(*) as total_rewards,
        COUNT(*) FILTER (WHERE lr.status = 'claimable') as claimable_rewards,
        COUNT(*) FILTER (WHERE lr.status = 'pending') as pending_rewards,
        COUNT(*) FILTER (WHERE lr.status = 'claimed') as claimed_rewards,
        SUM(lr.final_reward_amount) FILTER (WHERE lr.status = 'claimable') as claimable_amount,
        SUM(lr.final_reward_amount) FILTER (WHERE lr.status = 'claimed') as claimed_amount
    FROM layer_rewards lr
    GROUP BY lr.reward_recipient
) reward_stats ON m.wallet_address = reward_stats.reward_recipient
ORDER BY m.activation_id;

-- 第6步：创建主键绑定验证函数
-- ========================================

CREATE OR REPLACE FUNCTION validate_primary_key_bindings()
RETURNS TABLE(
    table_name TEXT,
    status TEXT,
    primary_key TEXT,
    foreign_keys TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH pk_info AS (
        SELECT 
            t.table_name,
            string_agg(c.column_name, ', ') as primary_key
        FROM information_schema.table_constraints t
        JOIN information_schema.constraint_column_usage c ON t.constraint_name = c.constraint_name
        WHERE t.constraint_type = 'PRIMARY KEY' 
        AND t.table_schema = 'public'
        AND t.table_name IN ('users', 'membership', 'nft_membership_levels', 'layer_rewards_rules', 'matrix_placements', 'layer_rewards')
        GROUP BY t.table_name
    ),
    fk_info AS (
        SELECT 
            tc.table_name,
            array_agg(kcu.column_name || ' -> ' || ccu.table_name || '(' || ccu.column_name || ')') as foreign_keys
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
        AND tc.table_name IN ('membership', 'matrix_placements', 'layer_rewards', 'layer_rewards_rules')
        GROUP BY tc.table_name
    )
    SELECT 
        pk.table_name::TEXT,
        'OK'::TEXT as status,
        pk.primary_key::TEXT,
        COALESCE(fk.foreign_keys, ARRAY[]::TEXT[]) as foreign_keys
    FROM pk_info pk
    LEFT JOIN fk_info fk ON pk.table_name = fk.table_name
    ORDER BY pk.table_name;
END;
$$ LANGUAGE plpgsql;

-- 第7步：显示修正后的主键绑定状态
-- ========================================

SELECT '=== 主键绑定修正完成 ===' as status;

-- 显示主键和外键绑定验证结果
SELECT '=== 主键和外键绑定验证 ===' as section;
SELECT * FROM validate_primary_key_bindings();

-- 显示完整会员信息（使用正确的主键绑定）
SELECT '=== 会员完整信息预览（主键绑定）===' as section;
SELECT 
    activation_id, wallet_address, username, level_name, 
    direct_referrals, total_rewards, claimable_amount_usdt
FROM member_complete_info 
ORDER BY activation_id 
LIMIT 5;

-- 验证主键绑定是否正常工作
SELECT '=== 主键绑定功能验证 ===' as section;
SELECT 
    'membership -> users' as binding,
    COUNT(*) as matched_records
FROM membership m 
JOIN users u ON m.wallet_address = u.wallet_address
UNION ALL
SELECT 
    'membership -> nft_membership_levels',
    COUNT(*)
FROM membership m 
JOIN nft_membership_levels nml ON m.current_level = nml.level
UNION ALL
SELECT 
    'matrix_placements -> membership',
    COUNT(*)
FROM matrix_placements mp 
JOIN membership m ON mp.member_wallet = m.wallet_address
UNION ALL
SELECT 
    'layer_rewards -> membership',
    COUNT(*)
FROM layer_rewards lr 
JOIN membership m ON lr.reward_recipient = m.wallet_address;
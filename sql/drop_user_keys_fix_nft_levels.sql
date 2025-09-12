-- 彻底删除user_keys概念并修正nft_levels相关问题
-- ========================================
-- 清理所有user_keys残留，确保只使用nft_membership_levels
-- ========================================

-- 第1步：搜索并删除所有包含user_keys的内容
-- ========================================

-- 删除任何可能包含user_keys的视图
DROP VIEW IF EXISTS user_keys CASCADE;
DROP VIEW IF EXISTS user_key_mapping CASCADE;
DROP VIEW IF EXISTS user_profile_keys CASCADE;

-- 删除任何可能包含user_keys的函数
DROP FUNCTION IF EXISTS get_user_key(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS get_user_by_key(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS generate_user_keys() CASCADE;

-- 检查是否有包含user_keys的表或列
DO $$ 
DECLARE
    rec RECORD;
BEGIN
    -- 检查是否有表包含user_keys相关列
    FOR rec IN 
        SELECT table_name, column_name
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND (column_name LIKE '%user_key%' OR column_name LIKE '%userkey%')
    LOOP
        EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS %I CASCADE', rec.table_name, rec.column_name);
        RAISE NOTICE '删除表 % 中的列 %', rec.table_name, rec.column_name;
    END LOOP;
END $$;

-- 第2步：检查并删除错误的nft_levels表（如果存在）
-- ========================================

-- 删除可能存在的错误nft_levels表
DROP TABLE IF EXISTS nft_levels CASCADE;
DROP VIEW IF EXISTS nft_levels_view CASCADE;
DROP VIEW IF EXISTS nft_level_config CASCADE;

-- 确认只保留正确的nft_membership_levels表
SELECT '=== 确认NFT等级表状态 ===' as status;
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name LIKE '%nft%'
AND table_name IN ('nft_membership_levels')
ORDER BY table_name, ordinal_position;

-- 第3步：验证nft_membership_levels表的完整性
-- ========================================

-- 检查nft_membership_levels表数据完整性
SELECT '=== NFT等级数据完整性检查 ===' as section;
SELECT 
    COUNT(*) as total_levels,
    MIN(level) as min_level,
    MAX(level) as max_level,
    COUNT(DISTINCT level) as unique_levels,
    CASE WHEN COUNT(*) = COUNT(DISTINCT level) THEN 'OK' ELSE 'ERROR: Duplicates' END as uniqueness_check
FROM nft_membership_levels;

-- 显示NFT等级配置
SELECT '=== NFT等级配置（nft_membership_levels）===' as section;
SELECT 
    level,
    level_name,
    nft_price_usdt,
    platform_fee_usdt,
    total_cost_usdt,
    tier,
    max_layer_members
FROM nft_membership_levels 
ORDER BY level 
LIMIT 10;

-- 第4步：确保所有外键正确引用nft_membership_levels
-- ========================================

-- 检查layer_rewards_rules表的外键
SELECT '=== 检查layer_rewards_rules外键 ===' as section;
SELECT 
    lrr.layer_number,
    lrr.required_nft_level,
    nml.level_name,
    lrr.is_active
FROM layer_rewards_rules lrr
JOIN nft_membership_levels nml ON lrr.required_nft_level = nml.level
WHERE lrr.is_active = true
ORDER BY lrr.layer_number, lrr.matrix_position, lrr.required_nft_level
LIMIT 10;

-- 检查layer_rewards表的外键
SELECT '=== 检查layer_rewards外键 ===' as section;
SELECT COUNT(*) as total_rewards,
       COUNT(nml1.level) as valid_triggering_levels,
       COUNT(nml2.level) as valid_required_levels,
       CASE WHEN COUNT(*) = COUNT(nml1.level) AND COUNT(*) = COUNT(nml2.level) 
            THEN 'OK' ELSE 'ERROR: Invalid foreign keys' END as integrity_check
FROM layer_rewards lr
LEFT JOIN nft_membership_levels nml1 ON lr.triggering_nft_level = nml1.level
LEFT JOIN nft_membership_levels nml2 ON lr.required_nft_level = nml2.level;

-- 检查bcc_unlock_config表的外键
SELECT '=== 检查bcc_unlock_config外键 ===' as section;
SELECT COUNT(*) as total_unlock_configs,
       COUNT(nml.level) as valid_level_references,
       CASE WHEN COUNT(*) = COUNT(nml.level) 
            THEN 'OK' ELSE 'ERROR: Invalid foreign keys' END as integrity_check
FROM bcc_unlock_config buc
LEFT JOIN nft_membership_levels nml ON buc.level = nml.level;

-- 第5步：重新创建不包含user_keys的干净视图
-- ========================================

-- 创建简洁的NFT等级配置视图
CREATE OR REPLACE VIEW nft_config_view AS
SELECT 
    nml.level,
    nml.level_name,
    nml.nft_price_usdt,
    nml.platform_fee_usdt,
    nml.total_cost_usdt,
    nml.tier,
    nml.max_layer_members,
    nml.description,
    
    -- BCC解锁配置
    buc.base_unlock_amount as bcc_unlock_base,
    
    -- Layer奖励规则数量
    COUNT(lrr.id) as reward_rules_count
    
FROM nft_membership_levels nml
LEFT JOIN bcc_unlock_config buc ON nml.level = buc.level
LEFT JOIN layer_rewards_rules lrr ON nml.level = lrr.required_nft_level AND lrr.is_active = true
GROUP BY nml.level, nml.level_name, nml.nft_price_usdt, nml.platform_fee_usdt, 
         nml.total_cost_usdt, nml.tier, nml.max_layer_members, nml.description, buc.base_unlock_amount
ORDER BY nml.level;

-- 创建会员等级状态视图（不包含user_keys）
CREATE OR REPLACE VIEW member_level_status AS
SELECT 
    m.wallet_address,
    m.activation_id,
    m.username,
    
    -- 当前等级信息
    m.current_level,
    nml.level_name as current_level_name,
    nml.nft_price_usdt as current_level_price,
    nml.tier as current_tier,
    
    -- 下一等级信息
    next_nml.level as next_level,
    next_nml.level_name as next_level_name,
    next_nml.nft_price_usdt as next_level_price,
    next_nml.total_cost_usdt as upgrade_cost,
    
    -- 等级进度
    ROUND((m.current_level::DECIMAL / 19) * 100, 2) as level_progress_percent,
    (19 - m.current_level) as levels_to_max,
    
    -- 已claim的NFT等级
    m.nft_claimed_levels,
    array_length(m.nft_claimed_levels, 1) as claimed_levels_count
    
FROM membership m
LEFT JOIN nft_membership_levels nml ON m.current_level = nml.level
LEFT JOIN nft_membership_levels next_nml ON (m.current_level + 1) = next_nml.level
ORDER BY m.activation_id;

-- 第6步：创建系统完整性检查函数
-- ========================================

CREATE OR REPLACE FUNCTION check_system_integrity()
RETURNS TABLE(
    check_category TEXT,
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    RETURN QUERY
    
    -- 检查user_keys残留
    SELECT 
        'user_keys_cleanup'::TEXT,
        'user_keys_columns'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'CLEAN' ELSE 'WARNING' END::TEXT,
        COALESCE(string_agg(table_name || '.' || column_name, ', '), 'No user_keys columns found')::TEXT
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND (column_name LIKE '%user_key%' OR column_name LIKE '%userkey%')
    
    UNION ALL
    
    -- 检查NFT表结构
    SELECT 
        'nft_tables',
        'nft_table_check',
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nft_membership_levels')
                 AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nft_levels')
            THEN 'CORRECT' 
            ELSE 'ERROR' 
        END,
        'Should only have nft_membership_levels table'
    
    UNION ALL
    
    -- 检查外键完整性
    SELECT 
        'foreign_keys',
        'membership_references',
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ERROR' END,
        COALESCE(COUNT(*)::TEXT || ' orphaned records', 'All foreign key references valid')
    FROM (
        SELECT 'matrix_placements' as table_name, COUNT(*) as orphans
        FROM matrix_placements mp
        WHERE NOT EXISTS (SELECT 1 FROM membership m WHERE m.wallet_address = mp.member_wallet)
           OR NOT EXISTS (SELECT 1 FROM membership m WHERE m.wallet_address = mp.matrix_root)
        UNION ALL
        SELECT 'layer_rewards', COUNT(*)
        FROM layer_rewards lr
        WHERE NOT EXISTS (SELECT 1 FROM membership m WHERE m.wallet_address = lr.triggering_member)
           OR NOT EXISTS (SELECT 1 FROM membership m WHERE m.wallet_address = lr.reward_recipient)
        UNION ALL
        SELECT 'members_balance', COUNT(*)
        FROM members_balance mb
        WHERE NOT EXISTS (SELECT 1 FROM membership m WHERE m.wallet_address = mb.wallet_address)
    ) orphan_check
    
    UNION ALL
    
    -- 检查NFT等级引用
    SELECT 
        'nft_references',
        'level_references_integrity',
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ERROR' END,
        COALESCE(COUNT(*)::TEXT || ' invalid level references', 'All NFT level references valid')
    FROM (
        SELECT COUNT(*) FROM layer_rewards lr
        WHERE NOT EXISTS (SELECT 1 FROM nft_membership_levels nml WHERE nml.level = lr.triggering_nft_level)
           OR NOT EXISTS (SELECT 1 FROM nft_membership_levels nml WHERE nml.level = lr.required_nft_level)
        UNION ALL
        SELECT COUNT(*) FROM membership m
        WHERE m.current_level > 0 AND NOT EXISTS (SELECT 1 FROM nft_membership_levels nml WHERE nml.level = m.current_level)
    ) level_check;
END;
$$ LANGUAGE plpgsql;

-- 第7步：清理函数和视图名称，移除任何user_keys引用
-- ========================================

-- 重新创建最终的查询函数（确保没有user_keys概念）
CREATE OR REPLACE FUNCTION get_member_profile(p_identifier VARCHAR(100))
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    target_wallet VARCHAR(42);
BEGIN
    -- 通过钱包地址或用户名查找
    IF p_identifier ~ '^0x[a-fA-F0-9]{40}$' THEN
        target_wallet := p_identifier;
    ELSE
        SELECT wallet_address INTO target_wallet 
        FROM membership 
        WHERE LOWER(username) = LOWER(p_identifier);
    END IF;
    
    IF target_wallet IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Member not found');
    END IF;
    
    -- 构建完整Profile（只使用钱包地址标识）
    SELECT jsonb_build_object(
        'success', true,
        'member', jsonb_build_object(
            'wallet_address', mo.wallet_address,
            'activation_id', mo.activation_id,
            'username', mo.username,
            'display_name', mo.display_name,
            'email', mo.email,
            
            'nft_level', jsonb_build_object(
                'current', mo.current_level,
                'name', mo.level_name,
                'price_usdt', mo.nft_price_usdt,
                'tier', mo.level_tier
            ),
            
            'referrer', jsonb_build_object(
                'wallet_address', mo.referrer_wallet,
                'username', mo.referrer_username,
                'activation_id', mo.referrer_activation_id
            ),
            
            'matrix_stats', jsonb_build_object(
                'direct_referrals', mo.direct_referrals,
                'spillover_count', mo.spillover_count,
                'layer1_filled', mo.layer1_filled,
                'total_downline', mo.total_downline,
                'next_vacant_position', mo.next_vacant_position
            ),
            
            'rewards', jsonb_build_object(
                'total_rewards', mo.total_rewards,
                'claimable_rewards', mo.claimable_rewards,
                'claimable_amount_usdt', mo.claimable_amount_usdt,
                'claimed_amount_usdt', mo.claimed_amount_usdt
            ),
            
            'bcc_balance', jsonb_build_object(
                'available', mo.bcc_balance,
                'locked', mo.bcc_locked,
                'used', mo.bcc_used,
                'total_unlocked', mo.bcc_total_unlocked,
                'tier', mo.bcc_tier,
                'tier_multiplier', mo.bcc_tier_multiplier
            )
        )
    ) INTO result
    FROM member_overview mo
    WHERE mo.wallet_address = target_wallet;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 第8步：显示清理结果
-- ========================================

SELECT '=== user_keys完全清理，nft_levels问题修正完成 ===' as status;

-- 执行系统完整性检查
SELECT '=== 系统完整性检查结果 ===' as section;
SELECT * FROM check_system_integrity();

-- 显示NFT配置状态
SELECT '=== NFT配置状态 ===' as section;
SELECT level, level_name, nft_price_usdt, tier, bcc_unlock_base, reward_rules_count
FROM nft_config_view 
ORDER BY level 
LIMIT 10;

-- 显示会员等级状态
SELECT '=== 会员等级状态预览 ===' as section;
SELECT 
    activation_id, username, current_level, current_level_name, 
    next_level, next_level_name, level_progress_percent
FROM member_level_status 
ORDER BY activation_id 
LIMIT 5;

-- 最终确认：显示当前系统中的所有表
SELECT '=== 当前系统表结构 ===' as final_check;
SELECT 
    table_name,
    CASE 
        WHEN table_name = 'membership' THEN 'PRIMARY - Members data'
        WHEN table_name = 'nft_membership_levels' THEN 'CONFIG - NFT levels (CORRECT)'
        WHEN table_name = 'users' THEN 'SUPPORT - User registration'
        WHEN table_name LIKE '%balance%' THEN 'FEATURE - ' || table_name
        WHEN table_name LIKE '%reward%' THEN 'FEATURE - ' || table_name
        WHEN table_name LIKE '%matrix%' THEN 'FEATURE - ' || table_name
        WHEN table_name LIKE '%bcc%' THEN 'FEATURE - ' || table_name
        ELSE 'OTHER - ' || table_name
    END as table_purpose
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name NOT LIKE 'pg_%'
ORDER BY 
    CASE 
        WHEN table_name = 'membership' THEN 1
        WHEN table_name = 'users' THEN 2
        WHEN table_name = 'nft_membership_levels' THEN 3
        ELSE 4
    END, table_name;
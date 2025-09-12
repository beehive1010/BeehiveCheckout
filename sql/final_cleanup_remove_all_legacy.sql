-- 彻底清理user_keys和nft_levels等遗留概念
-- ========================================
-- 只保留必要的表和视图，移除所有不需要的概念
-- ========================================

-- 第1步：删除所有包含user_keys概念的视图和函数
-- ========================================

DROP VIEW IF EXISTS member_rewards_summary CASCADE;
DROP VIEW IF EXISTS layer_rewards_details CASCADE;
DROP VIEW IF EXISTS member_nft_complete CASCADE;
DROP VIEW IF EXISTS referrals_stats CASCADE;
DROP VIEW IF EXISTS user_complete_profile CASCADE;
DROP VIEW IF EXISTS member_complete_info CASCADE;
DROP VIEW IF EXISTS matrix_structure_view CASCADE;
DROP VIEW IF EXISTS layer_rewards_summary CASCADE;

-- 删除包含user_keys的函数
DROP FUNCTION IF EXISTS get_user_by_username(VARCHAR);
DROP FUNCTION IF EXISTS get_user_by_email(VARCHAR);

-- 第2步：删除nft_levels相关的表（如果存在）
-- ========================================

DROP TABLE IF EXISTS nft_levels CASCADE;
DROP VIEW IF EXISTS nft_levels_view CASCADE;

-- 第3步：重新创建简洁的核心视图（不包含user_keys）
-- ========================================

-- 会员基础统计视图
CREATE OR REPLACE VIEW member_stats AS
WITH reward_summary AS (
    SELECT 
        reward_recipient,
        COUNT(*) as total_rewards,
        COUNT(*) FILTER (WHERE status = 'claimable') as claimable_count,
        COUNT(*) FILTER (WHERE status = 'claimed') as claimed_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        SUM(final_reward_amount) FILTER (WHERE status = 'claimable') as claimable_amount,
        SUM(final_reward_amount) FILTER (WHERE status = 'claimed') as claimed_amount
    FROM layer_rewards
    GROUP BY reward_recipient
),
matrix_summary AS (
    SELECT 
        matrix_root,
        COUNT(*) FILTER (WHERE is_direct_referral = true) as direct_count,
        COUNT(*) FILTER (WHERE is_spillover_placed = true) as spillover_count,
        COUNT(*) FILTER (WHERE matrix_layer = 1) as layer1_count
    FROM matrix_placements
    GROUP BY matrix_root
)
SELECT 
    m.activation_id,
    m.wallet_address,
    m.username,
    m.display_name,
    m.current_level,
    nml.level_name,
    nml.nft_price_usdt,
    m.referrer_wallet,
    ref_m.username as referrer_username,
    COALESCE(ms.direct_count, 0) as direct_referrals,
    COALESCE(ms.spillover_count, 0) as spillover_count,
    COALESCE(ms.layer1_count, 0) as layer1_filled,
    COALESCE(rs.total_rewards, 0) as total_rewards,
    COALESCE(rs.claimable_count, 0) as claimable_rewards,
    COALESCE(rs.claimable_amount, 0) as claimable_amount_usdt,
    COALESCE(rs.claimed_amount, 0) as claimed_amount_usdt
FROM membership m
LEFT JOIN nft_membership_levels nml ON m.current_level = nml.level
LEFT JOIN membership ref_m ON m.referrer_wallet = ref_m.wallet_address
LEFT JOIN matrix_summary ms ON m.wallet_address = ms.matrix_root
LEFT JOIN reward_summary rs ON m.wallet_address = rs.reward_recipient
ORDER BY m.activation_id;

-- 矩阵结构视图
CREATE OR REPLACE VIEW matrix_view AS
SELECT 
    m.activation_id as root_id,
    m.username as root_username,
    m.wallet_address as root_wallet,
    
    -- L位置
    l_mp.activation_id as l_id,
    l_m.username as l_username,
    l_m.wallet_address as l_wallet,
    
    -- M位置  
    m_mp.activation_id as m_id,
    m_m.username as m_username,
    m_m.wallet_address as m_wallet,
    
    -- R位置
    r_mp.activation_id as r_id,
    r_m.username as r_username,
    r_m.wallet_address as r_wallet,
    
    -- 空缺位置
    CASE 
        WHEN l_mp.activation_id IS NULL THEN 'L'
        WHEN m_mp.activation_id IS NULL THEN 'M'
        WHEN r_mp.activation_id IS NULL THEN 'R'
        ELSE 'FULL'
    END as vacant_position
    
FROM membership m
-- L位置
LEFT JOIN matrix_placements l_place ON m.wallet_address = l_place.matrix_root 
    AND l_place.matrix_layer = 1 AND l_place.matrix_position = 'L'
LEFT JOIN membership l_mp ON l_place.member_wallet = l_mp.wallet_address
LEFT JOIN membership l_m ON l_place.member_wallet = l_m.wallet_address
-- M位置
LEFT JOIN matrix_placements m_place ON m.wallet_address = m_place.matrix_root 
    AND m_place.matrix_layer = 1 AND m_place.matrix_position = 'M'
LEFT JOIN membership m_mp ON m_place.member_wallet = m_mp.wallet_address
LEFT JOIN membership m_m ON m_place.member_wallet = m_m.wallet_address
-- R位置
LEFT JOIN matrix_placements r_place ON m.wallet_address = r_place.matrix_root 
    AND r_place.matrix_layer = 1 AND r_place.matrix_position = 'R'
LEFT JOIN membership r_mp ON r_place.member_wallet = r_mp.wallet_address
LEFT JOIN membership r_m ON r_place.member_wallet = r_m.wallet_address
ORDER BY m.activation_id;

-- 奖励详情视图
CREATE OR REPLACE VIEW reward_details AS
SELECT 
    lr.id,
    trigger_m.activation_id as trigger_id,
    trigger_m.username as trigger_username,
    recipient_m.activation_id as recipient_id,
    recipient_m.username as recipient_username,
    lr.layer_number,
    lr.matrix_position,
    nml.level_name as nft_level_name,
    lr.triggering_nft_level as nft_level,
    lr.final_reward_amount,
    lr.status,
    lr.eligibility_met,
    lr.created_at,
    lr.claimed_at
FROM layer_rewards lr
JOIN membership trigger_m ON lr.triggering_member = trigger_m.wallet_address
JOIN membership recipient_m ON lr.reward_recipient = recipient_m.wallet_address
JOIN nft_membership_levels nml ON lr.triggering_nft_level = nml.level
ORDER BY lr.created_at DESC;

-- 第4步：创建简化的查询函数
-- ========================================

-- 根据username查询会员
CREATE OR REPLACE FUNCTION find_member(p_username VARCHAR(50))
RETURNS TABLE(
    activation_id INTEGER,
    username VARCHAR(50),
    wallet_address VARCHAR(42),
    current_level INTEGER,
    level_name VARCHAR(50),
    direct_referrals BIGINT,
    claimable_amount_usdt NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ms.activation_id,
        ms.username,
        ms.wallet_address,
        ms.current_level,
        ms.level_name,
        ms.direct_referrals,
        ms.claimable_amount_usdt
    FROM member_stats ms
    WHERE ms.username = p_username;
END;
$$ LANGUAGE plpgsql;

-- 根据激活ID查询会员
CREATE OR REPLACE FUNCTION find_member_by_id(p_activation_id INTEGER)
RETURNS TABLE(
    activation_id INTEGER,
    username VARCHAR(50),
    wallet_address VARCHAR(42),
    current_level INTEGER,
    level_name VARCHAR(50),
    direct_referrals BIGINT,
    claimable_amount_usdt NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ms.activation_id,
        ms.username,
        ms.wallet_address,
        ms.current_level,
        ms.level_name,
        ms.direct_referrals,
        ms.claimable_amount_usdt
    FROM member_stats ms
    WHERE ms.activation_id = p_activation_id;
END;
$$ LANGUAGE plpgsql;

-- 第5步：删除包含user_keys的触发器和函数
-- ========================================

DROP FUNCTION IF EXISTS trigger_layer_rewards(VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS check_pending_rewards_on_upgrade(VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS daily_reward_maintenance();

-- 重新创建简化的奖励触发函数（已存在trigger_layer_rewards_v2）
-- 这个函数已经在之前的文件中创建，不包含user_keys

-- 第6步：清理配置，只保留必要的表
-- ========================================

-- 核心表保留：
-- ✓ users (基础用户信息)
-- ✓ membership (会员信息，包含profile)
-- ✓ nft_membership_levels (NFT等级配置)
-- ✓ layer_rewards_rules (奖励规则)
-- ✓ matrix_placements (矩阵安置)
-- ✓ layer_rewards (奖励记录)

-- 删除重复或无用的表
DROP TABLE IF EXISTS user_balances CASCADE;
DROP TABLE IF EXISTS withdrawal_records CASCADE;
DROP TABLE IF EXISTS nft_claims CASCADE;

-- 第7步：创建最终的系统概览
-- ========================================

CREATE OR REPLACE VIEW system_overview AS
SELECT 
    'Members' as table_name,
    COUNT(*) as count,
    'Active members with profile info' as description
FROM membership
UNION ALL
SELECT 
    'NFT Levels',
    COUNT(*),
    'Available NFT membership levels'
FROM nft_membership_levels
UNION ALL
SELECT 
    'Reward Rules',
    COUNT(*),
    'Layer reward configuration rules'
FROM layer_rewards_rules
UNION ALL
SELECT 
    'Matrix Placements',
    COUNT(*),
    'Matrix position records'
FROM matrix_placements
UNION ALL
SELECT 
    'Layer Rewards',
    COUNT(*),
    'Reward distribution records'
FROM layer_rewards;

-- 第8步：显示最终系统状态
-- ========================================

SELECT '=== 彻底清理完成，移除所有user_keys和nft_levels ===' as status;

-- 显示系统概览
SELECT '=== 系统概览 ===' as section;
SELECT * FROM system_overview;

-- 显示会员统计
SELECT '=== 会员统计预览 ===' as section;
SELECT 
    activation_id, username, current_level, level_name, 
    direct_referrals, total_rewards, claimable_amount_usdt
FROM member_stats 
ORDER BY activation_id 
LIMIT 5;

-- 显示矩阵结构
SELECT '=== 矩阵结构预览 ===' as section;
SELECT 
    root_id, root_username, 
    l_username, m_username, r_username, 
    vacant_position
FROM matrix_view 
ORDER BY root_id 
LIMIT 5;

-- 显示NFT等级配置
SELECT '=== NFT等级配置 ===' as section;
SELECT level, level_name, nft_price_usdt, tier, max_layer_members
FROM nft_membership_levels 
ORDER BY level 
LIMIT 5;

-- 显示奖励规则配置
SELECT '=== 奖励规则配置 ===' as section;
SELECT layer_number, matrix_position, required_nft_level, direct_referral_minimum
FROM layer_rewards_rules 
WHERE is_active = true 
ORDER BY layer_number, matrix_position 
LIMIT 10;
-- 修正为单一超级根系统并补充完整地址
-- ========================================

-- 第1步：修正0x2C84为超级根的直推
-- ========================================

-- 将0x2C84设为超级根的直推
UPDATE members 
SET referrer_wallet = '0x0000000000000000000000000000000000000001'
WHERE wallet_address = '0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC';

-- 验证修正结果
SELECT '=== 修正后的根节点结构 ===' as section;

SELECT 
    activation_id,
    wallet_address,
    referrer_wallet,
    current_level,
    CASE 
        WHEN referrer_wallet IS NULL THEN '🌟 唯一超级根'
        WHEN referrer_wallet = '0x0000000000000000000000000000000000000001' THEN '超级根直推'
        ELSE '其他推荐'
    END as member_type
FROM members
ORDER BY activation_id;

-- 第2步：重新生成正确的referrals记录
-- ========================================

DELETE FROM referrals;

-- 重新生成基于修正推荐关系的referrals记录
SELECT generate_correct_referrals() as "重新生成referrals结果";

-- 第3步：创建带完整地址的referrals_stats视图
-- ========================================

DROP VIEW IF EXISTS referrals_stats;

CREATE OR REPLACE VIEW referrals_stats AS
WITH member_direct_stats AS (
    -- 计算每个成员作为推荐根的统计
    SELECT 
        m.activation_id,
        m.wallet_address as matrix_root,
        m.referrer_wallet,
        COUNT(r.id) as total_referrals,
        COUNT(r.id) FILTER (WHERE r.matrix_layer = 1) as layer1_count,
        COUNT(r.id) FILTER (WHERE r.matrix_layer > 1) as spillover_count
    FROM members m
    LEFT JOIN referrals r ON m.wallet_address = r.matrix_root
    GROUP BY m.activation_id, m.wallet_address, m.referrer_wallet
),
layer1_positions AS (
    -- 获取Layer 1的L-M-R具体成员完整地址
    SELECT 
        matrix_root,
        MAX(CASE WHEN matrix_position = 'L' THEN member_wallet END) as L_member_wallet,
        MAX(CASE WHEN matrix_position = 'M' THEN member_wallet END) as M_member_wallet,
        MAX(CASE WHEN matrix_position = 'R' THEN member_wallet END) as R_member_wallet,
        MAX(CASE WHEN matrix_position = 'L' THEN activation_id END) as L_activation_id,
        MAX(CASE WHEN matrix_position = 'M' THEN activation_id END) as M_activation_id,
        MAX(CASE WHEN matrix_position = 'R' THEN activation_id END) as R_activation_id
    FROM referrals
    WHERE matrix_layer = 1
    GROUP BY matrix_root
)
SELECT 
    mds.activation_id as 激活序号,
    mds.matrix_root as 会员地址完整,
    CASE 
        WHEN mds.referrer_wallet IS NULL THEN '🌟 唯一超级根节点'
        ELSE mds.referrer_wallet
    END as 推荐人完整地址,
    mds.total_referrals as 直推人数,
    mds.spillover_count as 溢出人数,
    COALESCE(lp.L_member_wallet, '') as L安置会员完整地址,
    COALESCE(lp.M_member_wallet, '') as M安置会员完整地址,
    COALESCE(lp.R_member_wallet, '') as R安置会员完整地址,
    CASE WHEN lp.L_activation_id IS NOT NULL THEN lp.L_activation_id::text ELSE '' END as L安置激活序号,
    CASE WHEN lp.M_activation_id IS NOT NULL THEN lp.M_activation_id::text ELSE '' END as M安置激活序号,
    CASE WHEN lp.R_activation_id IS NOT NULL THEN lp.R_activation_id::text ELSE '' END as R安置激活序号,
    mds.layer1_count || '/3' as Layer1完成度,
    CASE 
        WHEN mds.layer1_count = 0 THEN 'L'
        WHEN mds.layer1_count = 1 THEN 'M'
        WHEN mds.layer1_count = 2 THEN 'R'
        ELSE NULL
    END as 空缺安置位置
FROM member_direct_stats mds
LEFT JOIN layer1_positions lp ON mds.matrix_root = lp.matrix_root
ORDER BY mds.activation_id;

-- 第4步：显示修正后的结果
-- ========================================

SELECT '=== 修正后的referrals_stats（完整地址） ===' as section;
SELECT * FROM referrals_stats;

-- 特别验证超级根的数据
SELECT '=== 超级根 (激活序号0) 详细验证 ===' as super_root_check;
SELECT 
    激活序号,
    会员地址完整,
    推荐人完整地址,
    直推人数,
    溢出人数,
    L安置会员完整地址,
    M安置会员完整地址, 
    R安置会员完整地址,
    Layer1完成度,
    空缺安置位置
FROM referrals_stats 
WHERE 激活序号 = 0;

-- 验证所有推荐关系的完整性
SELECT '=== 推荐关系完整性验证 ===' as integrity_check;
SELECT 
    CASE 
        WHEN referrer_wallet IS NULL THEN '🌟 超级根'
        ELSE referrer_wallet
    END as 推荐人,
    COUNT(*) as 直推数量,
    STRING_AGG(wallet_address, ', ' ORDER BY activation_id) as 直推成员完整地址列表
FROM members
WHERE referrer_wallet IS NOT NULL OR activation_id = 0
GROUP BY referrer_wallet
ORDER BY COUNT(*) DESC;
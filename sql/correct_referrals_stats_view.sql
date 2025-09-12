-- 创建正确的referrals_stats视图
-- ========================================
-- 根据用户要求：每个会员作为推荐根，记录推荐人数、溢出人数、L-M-R填补情况
-- ========================================

-- 第1步：重新修正members表的推荐关系
-- ========================================

-- 使用原始备份数据重新修正推荐关系
UPDATE members SET referrer_wallet = (
    SELECT mb.referrer_wallet
    FROM members_backup mb
    WHERE mb.wallet_address = members.wallet_address
    AND mb.referrer_wallet IS NOT NULL
    AND mb.referrer_wallet <> mb.wallet_address  -- 排除自己推荐自己
);

-- 验证修正结果
SELECT '=== 推荐关系修正验证 ===' as section;
SELECT 
    SUBSTRING(m.referrer_wallet, 1, 10) || '...' as 推荐人,
    COUNT(*) as 直推数量
FROM members m
WHERE m.referrer_wallet IS NOT NULL
GROUP BY m.referrer_wallet
ORDER BY COUNT(*) DESC;

-- 第2步：清空并重新生成正确的referrals记录
-- ========================================

DELETE FROM referrals;

-- 重新生成基于真实推荐关系的referrals记录
CREATE OR REPLACE FUNCTION generate_correct_referrals()
RETURNS TEXT AS $$
DECLARE
    member_rec RECORD;
    referrer_rec RECORD;
    position_char CHAR(1);
    layer_num INTEGER;
    positions CHAR(1)[] := ARRAY['L','M','R'];
    pos_idx INTEGER;
    total_placed INTEGER := 0;
    direct_count INTEGER;
BEGIN
    -- 为每个有推荐人的成员生成referrals记录
    FOR member_rec IN 
        SELECT 
            activation_id,
            wallet_address,
            referrer_wallet,
            activation_time
        FROM members
        WHERE referrer_wallet IS NOT NULL
        ORDER BY activation_id
    LOOP
        -- 在推荐人的矩阵中找位置
        layer_num := 1;
        pos_idx := 1;
        
        -- 计算推荐人已有的直推数量
        SELECT COUNT(*) INTO direct_count
        FROM referrals 
        WHERE matrix_root = member_rec.referrer_wallet
        AND is_direct_referral = true;
        
        -- 确定安置位置
        IF direct_count < 3 THEN
            -- 安置在Layer 1的L-M-R位置
            position_char := positions[direct_count + 1];
            layer_num := 1;
        ELSE
            -- 安置在Layer 2（溢出）
            position_char := positions[((direct_count - 3) % 3) + 1];
            layer_num := 2;
        END IF;
        
        -- 插入referrals记录
        INSERT INTO referrals (
            member_wallet,
            referrer_wallet,
            matrix_root,
            matrix_parent,
            matrix_position,
            matrix_layer,
            activation_id,
            is_direct_referral,
            is_spillover_placed,
            placed_at
        ) VALUES (
            member_rec.wallet_address,
            member_rec.referrer_wallet,
            member_rec.referrer_wallet, -- matrix_root就是推荐人
            member_rec.referrer_wallet, -- 简化parent逻辑
            position_char,
            layer_num,
            member_rec.activation_id,
            true, -- 都是直推关系
            (layer_num > 1), -- Layer 2以上算溢出
            member_rec.activation_time
        );
        
        total_placed := total_placed + 1;
    END LOOP;
    
    RETURN format('生成了%s条正确的referrals记录', total_placed);
END;
$$ LANGUAGE plpgsql;

-- 执行生成
SELECT generate_correct_referrals() as "正确referrals生成结果";

-- 第3步：创建正确的referrals_stats视图
-- ========================================

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
    -- 获取Layer 1的L-M-R具体成员
    SELECT 
        matrix_root,
        MAX(CASE WHEN matrix_position = 'L' THEN activation_id END) as L_activation_id,
        MAX(CASE WHEN matrix_position = 'M' THEN activation_id END) as M_activation_id,
        MAX(CASE WHEN matrix_position = 'R' THEN activation_id END) as R_activation_id
    FROM referrals
    WHERE matrix_layer = 1
    GROUP BY matrix_root
)
SELECT 
    mds.activation_id as 激活序号,
    SUBSTRING(mds.matrix_root, 1, 10) || '...' as 会员地址,
    CASE 
        WHEN mds.referrer_wallet IS NULL THEN '🌟 原始根节点'
        ELSE SUBSTRING(mds.referrer_wallet, 1, 8) || '...'
    END as 推荐人,
    mds.total_referrals as 直推人数,
    mds.spillover_count as 溢出人数,
    CASE WHEN lp.L_activation_id IS NOT NULL THEN lp.L_activation_id::text ELSE NULL END as L安置激活序号,
    CASE WHEN lp.M_activation_id IS NOT NULL THEN lp.M_activation_id::text ELSE NULL END as M安置激活序号,
    CASE WHEN lp.R_activation_id IS NOT NULL THEN lp.R_activation_id::text ELSE NULL END as R安置激活序号,
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

-- 第4步：显示结果
-- ========================================

SELECT '=== 正确的referrals_stats视图 ===' as section;
SELECT * FROM referrals_stats;

-- 验证Root的数据
SELECT '=== Root (激活序号0) 验证 ===' as verification;
SELECT * FROM referrals_stats WHERE 激活序号 = 0;
-- =====================================================
-- 修复地址大小写同步问题
-- Fix address case sensitivity sync issues
-- =====================================================

-- 问题：地址在数据库中存储为小写，但可能有大小写不匹配的问题

-- 1. 检查地址大小写情况
SELECT 
    '🔍 地址大小写检查' as 检查项目,
    '' as 分隔符;

-- 查看members表中的地址格式
SELECT 
    'Members表地址示例' as 表名,
    wallet_address as 存储地址,
    referrer_wallet as 推荐人地址,
    LENGTH(wallet_address) as 地址长度,
    CASE 
        WHEN wallet_address = LOWER(wallet_address) THEN '✅ 全小写'
        WHEN wallet_address = UPPER(wallet_address) THEN '⚠️ 全大写'  
        ELSE '❌ 大小写混合'
    END as 地址格式
FROM members 
WHERE wallet_address = '0x479abda60f8c62a7c3fba411ab948a8be0e616ab'
LIMIT 1;

-- 查看referrals表中的地址格式
SELECT 
    'Referrals表地址示例' as 表名,
    member_wallet as 成员地址,
    referrer_wallet as 推荐人地址,
    LENGTH(member_wallet) as 地址长度,
    CASE 
        WHEN member_wallet = LOWER(member_wallet) THEN '✅ 全小写'
        WHEN member_wallet = UPPER(member_wallet) THEN '⚠️ 全大写'
        ELSE '❌ 大小写混合'
    END as 地址格式
FROM referrals 
LIMIT 1;

-- 2. 统一地址为小写并同步
-- 确保所有地址都是小写格式进行比较和插入

INSERT INTO referrals (member_wallet, referrer_wallet)
SELECT DISTINCT
    LOWER(m.wallet_address) as member_wallet,
    LOWER(m.referrer_wallet) as referrer_wallet
FROM members m
WHERE m.referrer_wallet IS NOT NULL
  AND m.referrer_wallet != ''
  AND NOT EXISTS (
    SELECT 1 FROM referrals r 
    WHERE LOWER(r.member_wallet) = LOWER(m.wallet_address)
  );

-- 3. 验证修复结果
SELECT 
    '📊 修复后验证' as 检查项目,
    '' as 分隔符;

-- 检查总体同步状态
SELECT 
    'Members中有推荐人的记录' as 描述,
    COUNT(*) as 数量
FROM members 
WHERE referrer_wallet IS NOT NULL AND referrer_wallet != ''
UNION ALL
SELECT 
    'Referrals表中的记录' as 描述,
    COUNT(*) as 数量
FROM referrals
UNION ALL
SELECT 
    '仍然缺失的推荐记录' as 描述,
    (SELECT COUNT(*) FROM members WHERE referrer_wallet IS NOT NULL AND referrer_wallet != '') - 
    (SELECT COUNT(*) FROM referrals) as 数量;

-- 4. 检查特定问题地址
SELECT 
    '🎯 测试问题地址' as 测试项目,
    LOWER('0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab') as 测试地址;

SELECT 
    'Members表中的记录' as 来源,
    m.wallet_address as 成员地址,
    m.referrer_wallet as 推荐人地址,
    m.current_level as 等级,
    '✅ 存在' as 状态
FROM members m
WHERE LOWER(m.wallet_address) = LOWER('0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab')
UNION ALL
SELECT 
    'Referrals表中的记录' as 来源,
    r.member_wallet as 成员地址,
    r.referrer_wallet as 推荐人地址,
    NULL as 等级,
    CASE WHEN r.member_wallet IS NOT NULL THEN '✅ 已修复' ELSE '❌ 仍缺失' END as 状态
FROM referrals r
WHERE LOWER(r.member_wallet) = LOWER('0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab');

-- 5. 检查推荐人的网络
SELECT 
    '👥 推荐人网络检查' as 检查项目,
    LOWER('0x47098712eeed62d22b60508a24b0ce54c5edd9ef') as 推荐人地址;

SELECT 
    '推荐网络成员' as 信息,
    r.member_wallet as 成员地址,
    m.current_level as 成员等级,
    CASE WHEN m.current_level >= 1 THEN '✅ 已激活' ELSE '⏳ 未激活' END as 激活状态
FROM referrals r
JOIN members m ON LOWER(r.member_wallet) = LOWER(m.wallet_address)
WHERE LOWER(r.referrer_wallet) = LOWER('0x47098712eeed62d22b60508a24b0ce54c5edd9ef')
ORDER BY m.current_level DESC;

-- 6. 创建大小写不敏感的查询函数
CREATE OR REPLACE FUNCTION get_referrals_case_insensitive(referrer_addr TEXT)
RETURNS TABLE(
    member_wallet TEXT,
    member_level INTEGER,
    activation_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.member_wallet,
        m.current_level as member_level,
        CASE WHEN m.current_level >= 1 THEN '已激活' ELSE '未激活' END as activation_status
    FROM referrals r
    JOIN members m ON LOWER(r.member_wallet) = LOWER(m.wallet_address)
    WHERE LOWER(r.referrer_wallet) = LOWER(referrer_addr)
    ORDER BY m.current_level DESC;
END;
$$ LANGUAGE plpgsql;

-- 测试函数
SELECT 
    '🧪 测试大小写不敏感查询函数' as 测试项目,
    '' as 分隔符;

SELECT * FROM get_referrals_case_insensitive('0x47098712eeed62d22b60508a24b0ce54c5edd9ef');

-- 7. 建议：统一数据库地址格式
SELECT 
    '💡 建议执行的清理操作' as 建议,
    '以下操作可确保所有地址都是小写格式' as 说明;

-- 显示需要执行的清理SQL（不自动执行）
SELECT 
    '-- 统一members表地址为小写
UPDATE members SET 
    wallet_address = LOWER(wallet_address),
    referrer_wallet = LOWER(referrer_wallet)
WHERE wallet_address != LOWER(wallet_address) 
   OR referrer_wallet != LOWER(referrer_wallet);

-- 统一referrals表地址为小写  
UPDATE referrals SET
    member_wallet = LOWER(member_wallet),
    referrer_wallet = LOWER(referrer_wallet)
WHERE member_wallet != LOWER(member_wallet)
   OR referrer_wallet != LOWER(referrer_wallet);' as 清理SQL;
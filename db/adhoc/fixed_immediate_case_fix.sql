-- =====================================================
-- 修复版：立即修复地址大小写同步问题
-- FIXED VERSION: Immediate fix for case sensitivity
-- =====================================================

-- 🎯 问题：地址大小写不匹配导致referrals表缺失记录
-- 🔧 解决：使用大小写不敏感的比较，修复列名歧义

-- 1. 立即同步缺失的推荐记录（大小写不敏感）
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

-- 2. 验证修复结果 - 检查问题地址
SELECT 
    '🎯 问题地址检查' as test_name,
    CASE 
        WHEN r.member_wallet IS NOT NULL THEN '✅ 修复成功 - 地址已在referrals表中'
        ELSE '❌ 仍有问题 - 地址仍缺失'
    END as fix_status,
    m.wallet_address as member_in_members,
    r.member_wallet as member_in_referrals,
    m.referrer_wallet as referrer_in_members,
    r.referrer_wallet as referrer_in_referrals
FROM members m
LEFT JOIN referrals r ON LOWER(r.member_wallet) = LOWER(m.wallet_address)
WHERE LOWER(m.wallet_address) = '0x479abda60f8c62a7c3fba411ab948a8be0e616ab';

-- 3. 显示推荐人的完整网络（避免列名歧义）
SELECT 
    '👥 推荐人网络' as network_info,
    '推荐人地址: 0x47098712eeed62d22b60508a24b0ce54c5edd9ef' as referrer_address;

SELECT 
    r.member_wallet as 成员地址,
    m.current_level as 成员等级,
    CASE WHEN m.current_level >= 1 THEN '✅ 已激活' ELSE '⏳ 未激活' END as 激活状态
FROM referrals r
JOIN members m ON LOWER(r.member_wallet) = LOWER(m.wallet_address)
WHERE LOWER(r.referrer_wallet) = '0x47098712eeed62d22b60508a24b0ce54c5edd9ef'
ORDER BY m.current_level DESC;

-- 4. 总体同步状态检查
SELECT 
    '📊 同步状态总结' as summary,
    members_with_referrers.count as 有推荐人的成员数,
    referral_records.count as 推荐记录数,
    CASE 
        WHEN members_with_referrers.count = referral_records.count
        THEN '✅ 完全同步'
        ELSE CONCAT('⚠️ 还缺少 ', (members_with_referrers.count - referral_records.count), ' 条记录')
    END as 同步状态
FROM 
    (SELECT COUNT(*) as count FROM members WHERE referrer_wallet IS NOT NULL AND referrer_wallet != '') as members_with_referrers,
    (SELECT COUNT(*) as count FROM referrals) as referral_records;

-- 5. 测试Matrix API需要的数据
SELECT 
    '🔧 Matrix API测试数据' as api_test,
    '检查API需要的referrals表数据是否完整' as description;

-- 这个查询模拟matrix API会执行的查询
SELECT 
    '模拟Matrix API查询结果' as query_type,
    COUNT(*) as 找到的推荐记录数
FROM referrals r
WHERE LOWER(r.member_wallet) = '0x479abda60f8c62a7c3fba411ab948a8be0e616ab';

-- 应该返回1条记录，如果返回0则说明同步仍有问题
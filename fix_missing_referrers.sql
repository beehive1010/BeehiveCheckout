-- 修复members表中缺失的referrer_wallet数据
-- 从users表中获取推荐人信息

UPDATE members 
SET referrer_wallet = users.referrer_wallet
FROM users 
WHERE members.wallet_address = users.wallet_address 
  AND members.referrer_wallet IS NULL 
  AND users.referrer_wallet IS NOT NULL
  AND users.referrer_wallet != '';

-- 查看修复结果
SELECT 
  COUNT(*) as total_members,
  COUNT(referrer_wallet) as members_with_referrer,
  COUNT(*) - COUNT(referrer_wallet) as members_without_referrer
FROM members;
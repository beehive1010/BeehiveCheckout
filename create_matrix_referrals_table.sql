-- 创建matrix_referrals表
-- 当有referred（被推荐）和安置的会员出现时，就会排列在这个table中

DROP TABLE IF EXISTS matrix_referrals CASCADE;

CREATE TABLE matrix_referrals (
  id SERIAL PRIMARY KEY,
  matrix_root_wallet TEXT NOT NULL,
  member_wallet TEXT NOT NULL,
  activation_sequence INTEGER NOT NULL,
  activation_time TIMESTAMP NOT NULL,
  referrer_wallet TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(matrix_root_wallet, member_wallet)
);

-- 插入所有的referred（被推荐）和安置的会员
INSERT INTO matrix_referrals (
  matrix_root_wallet,
  member_wallet,
  activation_sequence,
  activation_time,
  referrer_wallet
)
SELECT DISTINCT
  matrix_root.wallet_address as matrix_root_wallet,
  member.wallet_address as member_wallet,
  member.activation_sequence,
  member.activation_time,
  member.referrer_wallet
FROM members matrix_root
CROSS JOIN members member
WHERE matrix_root.current_level > 0
AND member.current_level > 0
AND member.wallet_address != matrix_root.wallet_address -- 不包含自己
AND (
  -- 直接推荐关系（referred）
  member.referrer_wallet = matrix_root.wallet_address
  OR 
  -- 安置关系（在referrals_tree_view中）
  EXISTS (
    SELECT 1 FROM referrals_tree_view rt 
    WHERE rt.root_wallet = matrix_root.wallet_address 
    AND rt.referred_wallet = member.wallet_address
  )
)
ORDER BY matrix_root_wallet, activation_sequence;
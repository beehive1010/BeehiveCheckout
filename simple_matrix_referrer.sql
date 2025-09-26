-- 简化matrix_referrer表：只收集每个matrix_root的成员，不计算layer
DROP TABLE IF EXISTS matrix_referrer CASCADE;

CREATE TABLE matrix_referrer (
  id SERIAL PRIMARY KEY,
  matrix_root_wallet TEXT NOT NULL,
  member_wallet TEXT NOT NULL,
  activation_sequence INTEGER NOT NULL,
  activation_time TIMESTAMP NOT NULL,
  referrer_wallet TEXT,
  is_direct_referral BOOLEAN DEFAULT FALSE, -- 是否是直接推荐关系
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(matrix_root_wallet, member_wallet)
);

-- 为每个matrix_root收集所有相关成员
WITH matrix_members AS (
  SELECT DISTINCT
    matrix_root.wallet_address as matrix_root_wallet,
    member.wallet_address as member_wallet,
    member.activation_sequence,
    member.activation_time,
    member.referrer_wallet,
    -- 判断是否是直接推荐关系
    (member.referrer_wallet = matrix_root.wallet_address) as is_direct_referral
  FROM members matrix_root
  CROSS JOIN members member
  WHERE matrix_root.current_level > 0
  AND member.current_level > 0
  AND member.wallet_address != matrix_root.wallet_address -- 不包含自己
  AND (
    -- 直接推荐关系
    member.referrer_wallet = matrix_root.wallet_address
    OR 
    -- 滑落安置关系（在referrals_tree_view中但不是直推）
    EXISTS (
      SELECT 1 FROM referrals_tree_view rt 
      WHERE rt.root_wallet = matrix_root.wallet_address 
      AND rt.referred_wallet = member.wallet_address
      AND rt.depth > 1
    )
  )
)
INSERT INTO matrix_referrer (
  matrix_root_wallet,
  member_wallet,
  activation_sequence,
  activation_time,
  referrer_wallet,
  is_direct_referral
)
SELECT 
  mm.matrix_root_wallet,
  mm.member_wallet,
  mm.activation_sequence,
  mm.activation_time,
  mm.referrer_wallet,
  mm.is_direct_referral
FROM matrix_members mm
ORDER BY mm.matrix_root_wallet, mm.activation_sequence;
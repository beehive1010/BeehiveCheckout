-- 简化版本：按激活顺序重新设计matrix表
DROP TABLE IF EXISTS matrix_referrer CASCADE;

CREATE TABLE matrix_referrer (
  id SERIAL PRIMARY KEY,
  matrix_root_wallet TEXT NOT NULL,
  member_wallet TEXT NOT NULL,
  matrix_position INTEGER NOT NULL,
  layer INTEGER NOT NULL,
  position TEXT NOT NULL,
  parent_wallet TEXT,
  activation_sequence INTEGER NOT NULL,
  activation_time TIMESTAMP NOT NULL,
  is_spillover BOOLEAN DEFAULT FALSE,
  referral_type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(matrix_root_wallet, matrix_position)
);

-- 1. 插入所有matrix_root作为自己的根节点
INSERT INTO matrix_referrer (
  matrix_root_wallet, member_wallet, matrix_position, layer, position, 
  parent_wallet, activation_sequence, activation_time, is_spillover, referral_type
)
SELECT 
  m.wallet_address, m.wallet_address, 0, 0, 'root',
  NULL, m.activation_sequence, m.activation_time, FALSE, 'root'
FROM members m WHERE m.current_level > 0;

-- 2. 为每个matrix_root按激活顺序添加所有相关成员
INSERT INTO matrix_referrer (
  matrix_root_wallet, member_wallet, matrix_position, layer, position,
  parent_wallet, activation_sequence, activation_time, is_spillover, referral_type
)
WITH matrix_members AS (
  SELECT DISTINCT
    matrix_root.wallet_address as matrix_root_wallet,
    member.wallet_address as member_wallet,
    member.activation_sequence,
    member.activation_time,
    (member.referrer_wallet = matrix_root.wallet_address) as is_direct_referral
  FROM members matrix_root
  CROSS JOIN members member
  WHERE matrix_root.current_level > 0
  AND member.current_level > 0
  AND member.wallet_address != matrix_root.wallet_address
  AND (
    -- 直接推荐
    member.referrer_wallet = matrix_root.wallet_address
    OR 
    -- 滑落安置（在referrals_tree_view中）
    EXISTS (
      SELECT 1 FROM referrals_tree_view rt 
      WHERE rt.root_wallet = matrix_root.wallet_address 
      AND rt.referred_wallet = member.wallet_address
      AND rt.depth > 1
    )
  )
),
positioned AS (
  SELECT 
    mm.*,
    row_number() OVER (
      PARTITION BY mm.matrix_root_wallet 
      ORDER BY mm.activation_sequence, mm.member_wallet
    ) as matrix_position
  FROM matrix_members mm
)
SELECT 
  p.matrix_root_wallet,
  p.member_wallet,
  p.matrix_position,
  -- 计算layer
  CASE 
    WHEN p.matrix_position <= 3 THEN 1
    WHEN p.matrix_position <= 12 THEN 2
    ELSE LEAST(CEIL((p.matrix_position - 3) / 9.0) + 1, 19)
  END as layer,
  -- 计算position
  (ARRAY['L','M','R'])[(p.matrix_position - 1) % 3 + 1] as position,
  -- parent_wallet先设为matrix_root，稍后更新
  p.matrix_root_wallet as parent_wallet,
  p.activation_sequence,
  p.activation_time,
  NOT p.is_direct_referral as is_spillover,
  CASE WHEN p.is_direct_referral THEN 'direct' ELSE 'spillover' END as referral_type
FROM positioned p
WHERE p.matrix_position <= 100;

-- 3. 更新Layer2的parent_wallet
UPDATE matrix_referrer 
SET parent_wallet = (
  SELECT mr2.member_wallet 
  FROM matrix_referrer mr2 
  WHERE mr2.matrix_root_wallet = matrix_referrer.matrix_root_wallet
  AND mr2.layer = 1
  AND mr2.position = (ARRAY['L','M','R'])[((matrix_referrer.matrix_position - 4) / 3)::int + 1]
  LIMIT 1
)
WHERE layer = 2;
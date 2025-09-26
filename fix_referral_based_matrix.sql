-- 重新设计matrix：matrix_root是推荐者，member是下线
-- 每个推荐者的Layer1只有3个位置给直推成员

DROP TABLE IF EXISTS matrix_referrer CASCADE;

CREATE TABLE matrix_referrer (
  id SERIAL PRIMARY KEY,
  matrix_root_wallet TEXT NOT NULL, -- 推荐者
  member_wallet TEXT NOT NULL, -- 下线
  matrix_position INTEGER NOT NULL, -- 在该推荐者matrix中的位置序号
  layer INTEGER NOT NULL, -- 层级
  position TEXT NOT NULL, -- L, M, R, root
  parent_wallet TEXT, -- 在该matrix中的parent
  activation_sequence INTEGER NOT NULL,
  activation_time TIMESTAMP NOT NULL,
  is_spillover BOOLEAN DEFAULT FALSE,
  referral_type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(matrix_root_wallet, matrix_position)
);

-- 1. 插入所有激活成员作为自己的matrix_root（位置0）
INSERT INTO matrix_referrer (
  matrix_root_wallet, 
  member_wallet, 
  matrix_position, 
  layer, 
  position, 
  parent_wallet, 
  activation_sequence, 
  activation_time, 
  is_spillover, 
  referral_type
)
SELECT 
  m.wallet_address as matrix_root_wallet,
  m.wallet_address as member_wallet,
  0 as matrix_position,
  0 as layer,
  'root' as position,
  NULL as parent_wallet,
  m.activation_sequence,
  m.activation_time,
  FALSE as is_spillover,
  'root' as referral_type
FROM members m 
WHERE m.current_level > 0;

-- 2. 为每个推荐者分配他的直推成员到Layer1（只有3个位置）
WITH direct_referrals AS (
  SELECT 
    r.referrer_wallet as matrix_root_wallet,
    r.referred_wallet as member_wallet,
    m.activation_sequence,
    m.activation_time,
    row_number() OVER (
      PARTITION BY r.referrer_wallet 
      ORDER BY m.activation_time, m.activation_sequence
    ) as referral_order
  FROM referrals_new r
  JOIN members m ON m.wallet_address = r.referred_wallet
  WHERE m.current_level > 0
  AND r.referrer_wallet IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM members rm 
    WHERE rm.wallet_address = r.referrer_wallet AND rm.current_level > 0
  )
)
INSERT INTO matrix_referrer (
  matrix_root_wallet,
  member_wallet,
  matrix_position,
  layer,
  position,
  parent_wallet,
  activation_sequence,
  activation_time,
  is_spillover,
  referral_type
)
SELECT 
  dr.matrix_root_wallet,
  dr.member_wallet,
  dr.referral_order as matrix_position, -- 直推顺序就是matrix位置
  CASE 
    WHEN dr.referral_order <= 3 THEN 1 -- 前3个在Layer1
    WHEN dr.referral_order <= 12 THEN 2 -- 4-12在Layer2
    ELSE LEAST(CEIL((dr.referral_order - 3) / 9.0) + 1, 19)
  END as layer,
  CASE 
    WHEN dr.referral_order <= 3 THEN 
      (ARRAY['L','M','R'])[dr.referral_order] -- Layer1: 1=L, 2=M, 3=R
    ELSE 
      (ARRAY['L','M','R'])[(dr.referral_order - 4) % 3 + 1] -- Layer2+循环
  END as position,
  CASE 
    WHEN dr.referral_order <= 3 THEN dr.matrix_root_wallet -- Layer1的parent是推荐者
    ELSE (
      -- Layer2+的parent是Layer1对应位置的成员
      SELECT mr.member_wallet 
      FROM matrix_referrer mr 
      WHERE mr.matrix_root_wallet = dr.matrix_root_wallet
      AND mr.layer = 1
      AND mr.position = (ARRAY['L','M','R'])[((dr.referral_order - 4) / 3)::int + 1]
      LIMIT 1
    )
  END as parent_wallet,
  dr.activation_sequence,
  dr.activation_time,
  (dr.referral_order > 3) as is_spillover, -- 超过3个就是spillover
  CASE 
    WHEN dr.referral_order <= 3 THEN 'direct'
    ELSE 'spillover'
  END as referral_type
FROM direct_referrals dr
WHERE dr.referral_order <= 100; -- 限制每个推荐者最多100个下线
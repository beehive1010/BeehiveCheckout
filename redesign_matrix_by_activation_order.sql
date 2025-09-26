-- 重新设计matrix_referrer表：按统一激活顺序排列所有成员（直推+滑落）
DROP TABLE IF EXISTS matrix_referrer CASCADE;

CREATE TABLE matrix_referrer (
  id SERIAL PRIMARY KEY,
  matrix_root_wallet TEXT NOT NULL,
  member_wallet TEXT NOT NULL,
  matrix_position INTEGER NOT NULL, -- 在该matrix中的位置序号：0=root, 1,2,3,4...
  layer INTEGER NOT NULL, -- 层级：0=root, 1=layer1, 2=layer2...
  position TEXT NOT NULL, -- 位置：root, L, M, R
  parent_wallet TEXT, -- 在该matrix中的parent
  activation_sequence INTEGER NOT NULL,
  activation_time TIMESTAMP NOT NULL,
  is_spillover BOOLEAN DEFAULT FALSE, -- 是否是滑落安置
  referral_type TEXT NOT NULL, -- direct, spillover, root
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(matrix_root_wallet, matrix_position)
);

-- 为每个matrix_root按激活顺序统一排列所有应该出现的成员
WITH matrix_members AS (
  -- 收集每个matrix_root应该包含的所有成员（直推 + 滑落安置）
  SELECT DISTINCT
    matrix_root.wallet_address as matrix_root_wallet,
    member.wallet_address as member_wallet,
    member.activation_sequence,
    member.activation_time,
    member.referrer_wallet,
    -- 判断是否是直接推荐关系
    (member.referrer_wallet = matrix_root.wallet_address) as is_direct_referral,
    -- 判断是否是滑落安置（在referrals_tree_view中存在但不是直推）
    EXISTS (
      SELECT 1 FROM referrals_tree_view rt 
      WHERE rt.root_wallet = matrix_root.wallet_address 
      AND rt.referred_wallet = member.wallet_address
    ) as in_referral_tree
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
),
ranked_members AS (
  -- 为成员分配排名
  SELECT 
    mm.*,
    row_number() OVER (
      PARTITION BY mm.matrix_root_wallet 
      ORDER BY mm.activation_sequence, mm.member_wallet
    ) as matrix_position
  FROM matrix_members mm
),
positioned_members AS (
  -- 按激活顺序为每个matrix_root分配位置
  SELECT 
    rm.*,
    -- 计算layer：位置1-3是layer1，4-12是layer2，等等
    CASE 
      WHEN rm.matrix_position <= 3 THEN 1
      WHEN rm.matrix_position <= 12 THEN 2
      ELSE LEAST(CEIL((rm.matrix_position - 3) / 9.0) + 1, 19)
    END as layer,
    -- 计算position：L, M, R循环
    (ARRAY['L','M','R'])[(rm.matrix_position - 1) % 3 + 1] as position
  FROM ranked_members rm
  WHERE rm.matrix_position <= 100 -- 限制每个matrix最多100个成员
)
-- 插入所有matrix_root作为自己的根节点
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

-- 插入按激活顺序排列的所有成员
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
  pm.matrix_root_wallet,
  pm.member_wallet,
  pm.matrix_position,
  pm.layer,
  pm.position,
  -- 计算parent_wallet
  CASE 
    WHEN pm.layer = 1 THEN pm.matrix_root_wallet -- Layer1的parent是matrix_root
    WHEN pm.layer = 2 THEN (
      -- Layer2的parent是Layer1对应位置的成员
      SELECT matrix_referrer.member_wallet 
      FROM matrix_referrer 
      WHERE matrix_referrer.matrix_root_wallet = pm.matrix_root_wallet
      AND matrix_referrer.layer = 1
      AND matrix_referrer.position = (ARRAY['L','M','R'])[((pm.matrix_position - 4) / 3)::int + 1]
      LIMIT 1
    )
    ELSE pm.matrix_root_wallet
  END as parent_wallet,
  pm.activation_sequence,
  pm.activation_time,
  NOT pm.is_direct_referral as is_spillover, -- 非直推就是spillover
  CASE 
    WHEN pm.is_direct_referral THEN 'direct'
    ELSE 'spillover'
  END as referral_type
FROM positioned_members pm
ORDER BY pm.matrix_root_wallet, pm.matrix_position;
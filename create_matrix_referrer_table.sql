-- 创建matrix_referrer表，每个用户都有自己的matrix_root（序号0）
-- 然后按激活顺序分配其他成员到对应位置

DROP TABLE IF EXISTS matrix_referrer CASCADE;

CREATE TABLE matrix_referrer (
  id SERIAL PRIMARY KEY,
  matrix_root_wallet TEXT NOT NULL,
  member_wallet TEXT NOT NULL,
  matrix_position INTEGER NOT NULL, -- 在该matrix中的位置序号：0=root, 1,2,3...
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

-- 插入所有激活成员作为自己的matrix_root（位置0）
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
  0 as matrix_position, -- 自己是位置0
  0 as layer, -- 自己是layer0
  'root' as position,
  NULL as parent_wallet, -- root没有parent
  m.activation_sequence,
  m.activation_time,
  FALSE as is_spillover,
  'root' as referral_type
FROM members m 
WHERE m.current_level > 0
ORDER BY m.activation_sequence;

-- 为每个matrix_root按激活顺序分配其他成员
WITH matrix_assignments AS (
  SELECT 
    root.wallet_address as matrix_root_wallet,
    member.wallet_address as member_wallet,
    member.activation_sequence as member_activation_sequence,
    member.activation_time as member_activation_time,
    -- 计算在该matrix中的位置序号（跳过root自己）
    row_number() OVER (
      PARTITION BY root.wallet_address 
      ORDER BY member.activation_sequence
    ) as matrix_position,
    -- 判断是否是直推关系
    EXISTS (
      SELECT 1 FROM referrals_tree_view rt 
      WHERE rt.root_wallet = root.wallet_address 
      AND rt.referred_wallet = member.wallet_address 
      AND rt.depth = 1
    ) as is_direct_referral
  FROM members root
  CROSS JOIN members member
  WHERE root.current_level > 0
  AND member.current_level > 0
  AND member.wallet_address != root.wallet_address -- 不包含自己
  AND member.activation_sequence > root.activation_sequence -- 只包含在root之后激活的
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
  ma.matrix_root_wallet,
  ma.member_wallet,
  ma.matrix_position,
  -- 计算layer：位置1-3是layer1，4-12是layer2，等等
  CASE 
    WHEN ma.matrix_position <= 3 THEN 1
    WHEN ma.matrix_position <= 12 THEN 2
    ELSE LEAST(CEIL((ma.matrix_position - 3) / 9.0) + 1, 19)
  END as layer,
  -- 计算position：L, M, R循环
  (ARRAY['L','M','R'])[(ma.matrix_position - 1) % 3 + 1] as position,
  -- 计算parent_wallet
  CASE 
    WHEN ma.matrix_position <= 3 THEN ma.matrix_root_wallet -- layer1的parent是root
    ELSE (
      -- layer2+的parent是上一层对应位置的成员
      SELECT mr.member_wallet 
      FROM matrix_referrer mr 
      WHERE mr.matrix_root_wallet = ma.matrix_root_wallet
      AND mr.matrix_position = ((ma.matrix_position - 4) / 3)::int + 1
      LIMIT 1
    )
  END as parent_wallet,
  ma.member_activation_sequence as activation_sequence,
  ma.member_activation_time as activation_time,
  NOT ma.is_direct_referral as is_spillover, -- 非直推就是spillover
  CASE 
    WHEN ma.is_direct_referral THEN 'direct'
    ELSE 'spillover'
  END as referral_type
FROM matrix_assignments ma
WHERE ma.matrix_position <= 1000 -- 限制每个matrix最多1000个成员
ORDER BY ma.matrix_root_wallet, ma.matrix_position;
-- 基于matrix_referrer表创建三三滑落矩阵view
DROP VIEW IF EXISTS matrix_referrals_tree_view CASCADE;

CREATE VIEW matrix_referrals_tree_view AS
WITH matrix_positioned AS (
  -- 为每个matrix_root按该matrix_root的被推荐者激活顺序分配位置序号
  SELECT 
    mr.matrix_root_wallet,
    mr.member_wallet,
    mr.activation_sequence,
    mr.activation_time,
    mr.referrer_wallet,
    mr.is_direct_referral,
    -- 按该matrix_root的被推荐者激活顺序分配序号1,2,3,4...
    row_number() OVER (
      PARTITION BY mr.matrix_root_wallet 
      ORDER BY mr.activation_sequence, mr.member_wallet
    ) as matrix_sequence_number
  FROM matrix_referrer mr
),
matrix_with_layers AS (
  -- 根据该matrix_root的序号计算layer和position
  SELECT 
    mp.*,
    -- 计算layer：序号1-3是layer1，4-12是layer2，13+是layer3...
    CASE 
      WHEN mp.matrix_sequence_number <= 3 THEN 1
      WHEN mp.matrix_sequence_number <= 12 THEN 2
      WHEN mp.matrix_sequence_number <= 39 THEN 3
      ELSE LEAST(CEIL((mp.matrix_sequence_number - 3) / 9.0) + 1, 19)
    END as layer,
    -- 计算position：L, M, R循环
    (ARRAY['L','M','R'])[(mp.matrix_sequence_number - 1) % 3 + 1] as position,
    -- 滑落标识
    (NOT mp.is_direct_referral) as is_spillover
  FROM matrix_positioned mp
),
matrix_with_parent AS (
  -- 计算parent_wallet
  SELECT 
    mwl.*,
    CASE 
      WHEN mwl.layer = 1 THEN mwl.matrix_root_wallet -- Layer1的parent是matrix_root
      WHEN mwl.layer >= 2 THEN (
        -- Layer2+的parent是上一层对应位置的成员
        -- 每3个成员对应上一层的一个成员
        SELECT mwl_parent.member_wallet
        FROM matrix_with_layers mwl_parent
        WHERE mwl_parent.matrix_root_wallet = mwl.matrix_root_wallet
        AND mwl_parent.layer = mwl.layer - 1
        AND mwl_parent.matrix_sequence_number = ((mwl.matrix_sequence_number - 4) / 3)::int + 1
        LIMIT 1
      )
      ELSE mwl.matrix_root_wallet
    END as parent_wallet
  FROM matrix_with_layers mwl
)
-- 主查询：所有matrix成员
SELECT 
  matrix_root_wallet,
  member_wallet,
  parent_wallet,
  referrer_wallet,
  (SELECT username FROM users WHERE wallet_address = mwp.member_wallet LIMIT 1) as username,
  (SELECT current_level FROM members WHERE wallet_address = mwp.member_wallet LIMIT 1) as current_level,
  activation_time,
  activation_sequence,
  -- 添加matrix内部序号，让用户看到排列
  matrix_sequence_number,
  -- referral_depth从referrals_tree_view获取
  COALESCE((
    SELECT rt.depth 
    FROM referrals_tree_view rt 
    WHERE rt.root_wallet = mwp.matrix_root_wallet 
    AND rt.referred_wallet = mwp.member_wallet
    LIMIT 1
  ), 0) as referral_depth,
  layer,
  position,
  is_spillover,
  true as is_activated,
  activation_time as child_activation_time,
  CASE 
    WHEN is_direct_referral THEN 'direct'
    ELSE 'spillover'
  END as referral_type
FROM matrix_with_parent mwp

UNION ALL

-- 添加所有matrix根节点
SELECT 
  m.wallet_address as matrix_root_wallet,
  m.wallet_address as member_wallet,
  NULL as parent_wallet,
  m.referrer_wallet,
  u.username,
  m.current_level,
  m.activation_time,
  m.activation_sequence,
  0 as matrix_sequence_number, -- root的序号是0
  0 as referral_depth,
  0 as layer,
  'root' as position,
  false as is_spillover,
  true as is_activated,
  m.activation_time as child_activation_time,
  'root' as referral_type
FROM members m
LEFT JOIN users u ON u.wallet_address = m.wallet_address
WHERE m.current_level > 0

ORDER BY matrix_root_wallet, layer, activation_time;
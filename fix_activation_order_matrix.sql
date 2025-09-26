-- 修正Matrix按全局激活顺序分配Layer1位置
DROP VIEW IF EXISTS matrix_referrals_tree_view CASCADE;

CREATE VIEW matrix_referrals_tree_view AS
WITH all_activated_members AS (
  -- 获取所有激活成员，按全局激活顺序排序
  SELECT 
    wallet_address,
    activation_time,
    activation_sequence,
    referrer_wallet,
    current_level,
    row_number() OVER (ORDER BY activation_time, activation_sequence) as global_activation_order
  FROM members 
  WHERE current_level > 0
),
matrix_assignments AS (
  -- 为每个matrix_root分配成员到对应层级
  SELECT 
    matrix_root.wallet_address as matrix_root_wallet,
    member.wallet_address as member_wallet,
    member.referrer_wallet,
    u.username,
    member.current_level,
    member.activation_time,
    member.activation_sequence,
    member.global_activation_order,
    -- 在该matrix中的序号（按全局激活顺序）
    row_number() OVER (
      PARTITION BY matrix_root.wallet_address 
      ORDER BY member.global_activation_order
    ) as matrix_position_order,
    -- 判断是否在该matrix的推荐树中
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM referrals_tree_view rt 
        WHERE rt.root_wallet = matrix_root.wallet_address 
        AND rt.referred_wallet = member.wallet_address
      ) THEN true
      ELSE false
    END as in_referral_tree
  FROM all_activated_members matrix_root
  CROSS JOIN all_activated_members member
  LEFT JOIN users u ON u.wallet_address = member.wallet_address
  WHERE member.global_activation_order > matrix_root.global_activation_order  -- 只包含在matrix_root之后激活的成员
),
positioned_members AS (
  SELECT 
    ma.*,
    -- 计算layer
    CASE 
      WHEN ma.matrix_position_order <= 3 THEN 1  -- 前3个成员在Layer1
      WHEN ma.matrix_position_order <= 12 THEN 2  -- 接下来9个在Layer2 
      ELSE LEAST(CEIL((ma.matrix_position_order - 3) / 9.0) + 1, 19)  -- 后续按9个一层分配
    END as layer,
    -- 计算position
    CASE 
      WHEN ma.matrix_position_order <= 3 THEN 
        (ARRAY['L','M','R'])[ma.matrix_position_order]  -- Layer1: 1=L, 2=M, 3=R
      ELSE 
        (ARRAY['L','M','R'])[(ma.matrix_position_order - 4) % 3 + 1]  -- Layer2+: 循环L,M,R
    END as position,
    -- 判断是否spillover（不在推荐树中就是spillover）
    NOT ma.in_referral_tree as is_spillover,
    true as is_activated,
    ma.activation_time as child_activation_time,
    CASE WHEN ma.in_referral_tree THEN 'direct' ELSE 'spillover' END as referral_type
  FROM matrix_assignments ma
  WHERE ma.matrix_position_order <= 1000  -- 限制每个matrix最多1000个成员
),
members_with_parent AS (
  SELECT 
    pm.*,
    CASE 
      WHEN pm.layer = 1 THEN pm.matrix_root_wallet  -- Layer1的parent是matrix_root
      WHEN pm.layer = 2 THEN (
        -- Layer2的parent是Layer1对应位置的成员
        SELECT pm_layer1.member_wallet
        FROM positioned_members pm_layer1
        WHERE pm_layer1.matrix_root_wallet = pm.matrix_root_wallet
        AND pm_layer1.layer = 1
        AND pm_layer1.position = (ARRAY['L','M','R'])[((pm.matrix_position_order - 4) / 3)::int + 1]
        LIMIT 1
      )
      ELSE pm.matrix_root_wallet  -- Layer3+用matrix_root作为parent
    END as parent_wallet,
    -- 获取referral depth
    COALESCE((
      SELECT rt.depth 
      FROM referrals_tree_view rt 
      WHERE rt.root_wallet = pm.matrix_root_wallet 
      AND rt.referred_wallet = pm.member_wallet
      LIMIT 1
    ), 0) as referral_depth
  FROM positioned_members pm
)
SELECT 
  matrix_root_wallet,
  member_wallet,
  parent_wallet,
  referrer_wallet,
  username,
  current_level,
  activation_time,
  activation_sequence,
  referral_depth,
  layer,
  position,
  is_spillover,
  is_activated,
  child_activation_time,
  referral_type
FROM members_with_parent

UNION ALL

-- 添加matrix根节点
SELECT 
  m.wallet_address as matrix_root_wallet,
  m.wallet_address as member_wallet,
  NULL as parent_wallet,  -- matrix_root没有parent
  m.referrer_wallet,
  u.username,
  m.current_level,
  m.activation_time,
  m.activation_sequence,
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
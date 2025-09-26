-- 基于matrix_referrer表重新创建matrix_referrals_tree_view
DROP VIEW IF EXISTS matrix_referrals_tree_view CASCADE;

CREATE VIEW matrix_referrals_tree_view AS
SELECT 
  mr.matrix_root_wallet,
  mr.member_wallet,
  mr.parent_wallet,
  m.referrer_wallet,
  u.username,
  m.current_level,
  m.activation_time,
  mr.activation_sequence,
  -- 计算referral_depth（在推荐树中的深度）
  COALESCE((
    SELECT rt.depth 
    FROM referrals_tree_view rt 
    WHERE rt.root_wallet = mr.matrix_root_wallet 
    AND rt.referred_wallet = mr.member_wallet
    LIMIT 1
  ), 0) as referral_depth,
  mr.layer,
  mr.position,
  mr.is_spillover,
  true as is_activated,
  m.activation_time as child_activation_time,
  mr.referral_type
FROM matrix_referrer mr
JOIN members m ON m.wallet_address = mr.member_wallet
LEFT JOIN users u ON u.wallet_address = mr.member_wallet
ORDER BY mr.matrix_root_wallet, mr.matrix_position;
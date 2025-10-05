-- ============================================================================
-- Script: Recalculate All Rewards (Direct Referral + Layer 2-19)
-- Purpose: Clear and regenerate all historical rewards with proper rollup
-- ============================================================================

-- Step 1: Backup existing data
-- ============================================================================
CREATE TEMP TABLE backup_direct_rewards AS SELECT * FROM direct_referral_rewards;
CREATE TEMP TABLE backup_layer_rewards AS SELECT * FROM layer_rewards;
CREATE TEMP TABLE backup_rollup_history AS SELECT * FROM reward_rollup_history;

SELECT
  'Backed up ' || COUNT(*) || ' direct referral rewards' as status
FROM backup_direct_rewards
UNION ALL
SELECT
  'Backed up ' || COUNT(*) || ' layer rewards' as status
FROM backup_layer_rewards
UNION ALL
SELECT
  'Backed up ' || COUNT(*) || ' rollup history records' as status
FROM backup_rollup_history;

-- Step 2: Clear existing rewards
-- ============================================================================
DELETE FROM reward_rollup_history;
DELETE FROM layer_rewards;
DELETE FROM direct_referral_rewards;

SELECT 'Cleared all existing rewards' as status;

-- Step 3: Calculate Direct Referral Rewards (Layer 1)
-- ============================================================================
-- Layer 1 Left (L) - Requires Level 1
-- Layer 1 Middle (M) - Requires Level 1
-- Layer 1 Right (R) - Requires Level 2 + 3 direct referrals
-- Note: Using matrix_referrals for Layer 1 to capture all 908 placements

WITH direct_referrals AS (
  SELECT
    mr.matrix_root_wallet as referrer_wallet,
    mr.member_wallet as referred_member,
    mr.position as matrix_position,
    mr.created_at as placed_at,
    m_referrer.current_level as referrer_level,
    m_member.current_level as member_level,
    (SELECT COUNT(*) FROM matrix_referrals mr2
     WHERE mr2.matrix_root_wallet = mr.matrix_root_wallet
     AND mr2.layer = 1) as referrer_direct_count
  FROM matrix_referrals mr
  JOIN members m_referrer ON m_referrer.wallet_address = mr.matrix_root_wallet
  JOIN members m_member ON m_member.wallet_address = mr.member_wallet
  WHERE mr.layer = 1
),
reward_calculations AS (
  SELECT
    dr.referrer_wallet,
    dr.referred_member,
    dr.matrix_position,
    dr.placed_at,
    dr.referrer_level,
    dr.referrer_direct_count,
    -- Reward amount based on position
    CASE dr.matrix_position
      WHEN 'L' THEN 50.0  -- Left position: 50 USDT
      WHEN 'M' THEN 50.0  -- Middle position: 50 USDT
      WHEN 'R' THEN 50.0  -- Right position: 50 USDT (3rd reward)
    END as reward_amount,
    -- Check if referrer qualifies
    CASE dr.matrix_position
      WHEN 'L' THEN dr.referrer_level >= 1  -- L: needs Level 1
      WHEN 'M' THEN dr.referrer_level >= 1  -- M: needs Level 1
      WHEN 'R' THEN dr.referrer_level >= 2 AND dr.referrer_direct_count >= 3  -- R: needs Level 2 + 3 directs
    END as qualifies,
    -- Required level for this position
    CASE dr.matrix_position
      WHEN 'L' THEN 1
      WHEN 'M' THEN 1
      WHEN 'R' THEN 2
    END as required_level,
    -- Needs direct referral check for R position
    CASE dr.matrix_position
      WHEN 'R' THEN true
      ELSE false
    END as needs_direct_check
  FROM direct_referrals dr
)
INSERT INTO direct_referral_rewards (
  referrer_wallet,
  referred_member_wallet,
  reward_amount,
  status,
  created_at,
  metadata
)
SELECT
  referrer_wallet,
  referred_member,
  reward_amount,
  -- Historical rewards: claimable if qualified, otherwise skip (will rollup)
  CASE
    WHEN qualifies THEN 'claimable'
    ELSE 'claimable'  -- We'll handle rollup separately
  END as status,
  placed_at as created_at,
  jsonb_build_object(
    'position', matrix_position,
    'referrer_level', referrer_level,
    'required_level', required_level,
    'direct_count', referrer_direct_count,
    'needs_direct_check', needs_direct_check,
    'qualified', qualifies,
    'historical_data', true
  ) as metadata
FROM reward_calculations;

SELECT
  'Inserted ' || COUNT(*) || ' direct referral rewards' as status,
  COUNT(*) FILTER (WHERE (metadata->>'qualified')::boolean = true) as qualified,
  COUNT(*) FILTER (WHERE (metadata->>'qualified')::boolean = false) as need_rollup
FROM direct_referral_rewards;

-- Step 4: Handle Direct Referral Rollups (for R position that didn't qualify)
-- ============================================================================
WITH unqualified_direct_rewards AS (
  SELECT
    drr.id as original_reward_id,
    drr.referrer_wallet as original_recipient,
    drr.reward_amount as original_amount,
    drr.created_at,
    (drr.metadata->>'position')::text as position,
    (drr.metadata->>'referrer_level')::int as referrer_level,
    (drr.metadata->>'required_level')::int as required_level,
    (drr.metadata->>'direct_count')::int as direct_count,
    -- Find upline to rollup to
    r.referrer_wallet as upline_referrer,
    m_upline.current_level as upline_level,
    (SELECT COUNT(*) FROM referrals r2
     WHERE r2.referrer_wallet = r.referrer_wallet
     AND r2.is_direct_referral = true) as upline_direct_count
  FROM direct_referral_rewards drr
  JOIN referrals r ON r.member_wallet = drr.referrer_wallet
  JOIN members m_upline ON m_upline.wallet_address = r.referrer_wallet
  WHERE (drr.metadata->>'qualified')::boolean = false
    AND (drr.metadata->>'position')::text = 'R'  -- Only R position can fail qualification
),
rollup_chain AS (
  -- Find the first qualified upline or root
  SELECT
    udr.original_reward_id,
    udr.original_recipient,
    udr.original_amount,
    udr.created_at,
    COALESCE(
      CASE
        WHEN udr.upline_level >= 2 AND udr.upline_direct_count >= 3
        THEN udr.upline_referrer
        ELSE (SELECT matrix_root_wallet FROM referrals WHERE member_wallet = udr.original_recipient LIMIT 1)
      END,
      udr.original_recipient  -- Fallback to original if no upline
    ) as rolled_up_to,
    CASE
      WHEN udr.referrer_level < udr.required_level
      THEN 'Insufficient NFT level: has Level ' || udr.referrer_level || ', needs Level ' || udr.required_level
      WHEN udr.direct_count < 3
      THEN 'Insufficient direct referrals: has ' || udr.direct_count || ', needs 3'
      ELSE 'Unknown reason'
    END as rollup_reason
  FROM unqualified_direct_rewards udr
)
INSERT INTO reward_rollup_history (
  original_reward_id,
  original_reward_type,
  original_recipient_wallet,
  original_amount,
  rolled_up_to_wallet,
  rollup_reason,
  rollup_processed_at,
  metadata
)
SELECT
  rc.original_reward_id,
  'direct_referral' as original_reward_type,
  rc.original_recipient,
  rc.original_amount,
  rc.rolled_up_to,
  rc.rollup_reason,
  rc.created_at as rollup_processed_at,
  jsonb_build_object(
    'historical_rollup', true,
    'rollup_type', 'level_insufficient'
  ) as metadata
FROM rollup_chain rc
WHERE rc.rolled_up_to != rc.original_recipient;  -- Only rollup if there's an actual upline

SELECT
  'Created ' || COUNT(*) || ' direct referral rollup records' as status
FROM reward_rollup_history
WHERE original_reward_type = 'direct_referral';

-- Step 5: Calculate Layer 2-19 Rewards
-- ============================================================================
-- For each member placement in matrix layers 2-19, create reward for matrix root

WITH layer_placements AS (
  SELECT
    mr.matrix_root_wallet,
    mr.member_wallet as triggering_member,
    mr.layer,
    mr.position,
    mr.created_at as placed_at,
    m_root.current_level as root_current_level,
    m_member.current_level as member_level,
    -- Reward amount = member's NFT level claim price * 50%
    (SELECT claim_price * 0.5
     FROM membership
     WHERE wallet_address = mr.member_wallet
     AND nft_level = m_member.current_level
     LIMIT 1) as reward_amount,
    -- Required level for root = layer number
    mr.layer as required_level
  FROM matrix_referrals mr
  JOIN members m_root ON m_root.wallet_address = mr.matrix_root_wallet
  JOIN members m_member ON m_member.wallet_address = mr.member_wallet
  WHERE mr.layer >= 2 AND mr.layer <= 19
),
reward_with_qualification AS (
  SELECT
    lp.*,
    lp.root_current_level >= lp.required_level as qualifies,
    -- Find upline for rollup if doesn't qualify
    (SELECT referrer_wallet FROM referrals
     WHERE member_wallet = lp.matrix_root_wallet
     LIMIT 1) as upline_wallet
  FROM layer_placements lp
)
INSERT INTO layer_rewards (
  triggering_member_wallet,
  reward_recipient_wallet,
  matrix_root_wallet,
  triggering_nft_level,
  reward_amount,
  layer_position,
  matrix_layer,
  status,
  recipient_required_level,
  recipient_current_level,
  requires_direct_referrals,
  direct_referrals_required,
  direct_referrals_current,
  created_at,
  rolled_up_to,
  roll_up_reason
)
SELECT
  rwq.triggering_member,
  CASE
    WHEN rwq.qualifies THEN rwq.matrix_root_wallet
    ELSE COALESCE(rwq.upline_wallet, rwq.matrix_root_wallet)
  END as reward_recipient_wallet,
  rwq.matrix_root_wallet,
  rwq.member_level as triggering_nft_level,
  rwq.reward_amount,
  rwq.position as layer_position,
  rwq.layer as matrix_layer,
  -- Historical rewards: claimable (no pending for old data)
  'claimable' as status,
  rwq.required_level as recipient_required_level,
  rwq.root_current_level as recipient_current_level,
  false as requires_direct_referrals,
  0 as direct_referrals_required,
  0 as direct_referrals_current,
  rwq.placed_at as created_at,
  CASE
    WHEN NOT rwq.qualifies THEN COALESCE(rwq.upline_wallet, rwq.matrix_root_wallet)
    ELSE NULL
  END as rolled_up_to,
  CASE
    WHEN NOT rwq.qualifies
    THEN 'Level insufficient: has Level ' || rwq.root_current_level || ', needs Level ' || rwq.required_level
    ELSE NULL
  END as roll_up_reason
FROM reward_with_qualification rwq;

SELECT
  'Inserted ' || COUNT(*) || ' layer rewards (Layer 2-19)' as status,
  COUNT(*) FILTER (WHERE rolled_up_to IS NULL) as qualified,
  COUNT(*) FILTER (WHERE rolled_up_to IS NOT NULL) as rolled_up
FROM layer_rewards;

-- Step 6: Create Rollup History for Layer Rewards
-- ============================================================================
INSERT INTO reward_rollup_history (
  original_reward_id,
  original_reward_type,
  original_recipient_wallet,
  original_amount,
  rolled_up_to_wallet,
  rollup_reason,
  rollup_processed_at,
  new_reward_id,
  metadata
)
SELECT
  lr.id as original_reward_id,
  'layer_reward' as original_reward_type,
  lr.matrix_root_wallet as original_recipient,
  lr.reward_amount as original_amount,
  lr.rolled_up_to as rolled_up_to_wallet,
  lr.roll_up_reason as rollup_reason,
  lr.created_at as rollup_processed_at,
  lr.id as new_reward_id,
  jsonb_build_object(
    'historical_rollup', true,
    'matrix_layer', lr.matrix_layer,
    'triggering_member', lr.triggering_member_wallet,
    'rollup_type', 'level_insufficient'
  ) as metadata
FROM layer_rewards lr
WHERE lr.rolled_up_to IS NOT NULL;

SELECT
  'Created ' || COUNT(*) || ' layer reward rollup records' as status
FROM reward_rollup_history
WHERE original_reward_type = 'layer_reward';

-- Step 7: Summary Report
-- ============================================================================
SELECT '════════════════════════════════════════' as separator
UNION ALL
SELECT '  REWARD RECALCULATION SUMMARY' as separator
UNION ALL
SELECT '════════════════════════════════════════' as separator
UNION ALL
SELECT '' as separator
UNION ALL
SELECT '1. DIRECT REFERRAL REWARDS:' as separator
UNION ALL
SELECT '   Total Records: ' || COUNT(*) FROM direct_referral_rewards
UNION ALL
SELECT '   Qualified: ' || COUNT(*) FILTER (WHERE (metadata->>'qualified')::boolean = true) FROM direct_referral_rewards
UNION ALL
SELECT '   Rolled Up: ' || COUNT(*) FROM reward_rollup_history WHERE original_reward_type = 'direct_referral'
UNION ALL
SELECT '' as separator
UNION ALL
SELECT '2. LAYER REWARDS (2-19):' as separator
UNION ALL
SELECT '   Total Records: ' || COUNT(*) FROM layer_rewards
UNION ALL
SELECT '   Qualified: ' || COUNT(*) FILTER (WHERE rolled_up_to IS NULL) FROM layer_rewards
UNION ALL
SELECT '   Rolled Up: ' || COUNT(*) FILTER (WHERE rolled_up_to IS NOT NULL) FROM layer_rewards
UNION ALL
SELECT '' as separator
UNION ALL
SELECT '3. ROLLUP HISTORY:' as separator
UNION ALL
SELECT '   Total Rollups: ' || COUNT(*) FROM reward_rollup_history
UNION ALL
SELECT '   Direct Referral Rollups: ' || COUNT(*) FROM reward_rollup_history WHERE original_reward_type = 'direct_referral'
UNION ALL
SELECT '   Layer Reward Rollups: ' || COUNT(*) FROM reward_rollup_history WHERE original_reward_type = 'layer_reward'
UNION ALL
SELECT '' as separator
UNION ALL
SELECT '4. LAYER BREAKDOWN:' as separator;

-- Layer breakdown
SELECT
  '   Layer ' || matrix_layer || ': ' || COUNT(*) || ' rewards (' ||
  COUNT(*) FILTER (WHERE rolled_up_to IS NULL) || ' qualified, ' ||
  COUNT(*) FILTER (WHERE rolled_up_to IS NOT NULL) || ' rolled up)' as separator
FROM layer_rewards
GROUP BY matrix_layer
ORDER BY matrix_layer;

SELECT '' as separator
UNION ALL
SELECT '════════════════════════════════════════' as separator
UNION ALL
SELECT '  ✅ RECALCULATION COMPLETE' as separator
UNION ALL
SELECT '════════════════════════════════════════' as separator;

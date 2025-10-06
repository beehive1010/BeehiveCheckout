-- =====================================================
-- 执行完整系统同步
-- 数据库: postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres
-- =====================================================

\echo '=========================================='
\echo '🔄 开始完整系统同步'
\echo '=========================================='
\echo ''

-- Step 0: 检查当前状态
\echo '📊 Step 0: 检查当前系统状态'
\echo '------------------------------------------'
SELECT
  'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Members', COUNT(*) FROM members
UNION ALL
SELECT 'Memberships', COUNT(*) FROM memberships
UNION ALL
SELECT 'Referrals', COUNT(*) FROM referrals
UNION ALL
SELECT 'Direct Rewards', COUNT(*) FROM layer_rewards
WHERE reward_type = 'direct' AND status = 'completed'
UNION ALL
SELECT 'Layer Rewards', COUNT(*) FROM layer_rewards
WHERE reward_type = 'layer' AND status = 'completed';

\echo ''
\echo '🔍 数据缺口分析:'
\echo '------------------------------------------'

-- Users without members
SELECT
  'Users without Members' as gap_type,
  COUNT(*) as count
FROM users u
LEFT JOIN members m ON u.wallet_address = m.wallet_address
WHERE m.wallet_address IS NULL
UNION ALL
-- Members without referrals
SELECT
  'Members without Referrals',
  COUNT(*)
FROM members m
LEFT JOIN referrals r ON m.wallet_address = r.member_wallet
WHERE r.member_wallet IS NULL
  AND m.wallet_address != '0x0000000000000000000000000000000000000001';

\echo ''
\echo '=========================================='
\echo '📝 Step 1: 同步 Users → Members/Memberships'
\echo '=========================================='

DO $$
DECLARE
  v_user RECORD;
  v_synced_members INTEGER := 0;
  v_synced_memberships INTEGER := 0;
  v_root_wallet TEXT := '0x0000000000000000000000000000000000000001';
BEGIN
  FOR v_user IN
    SELECT wallet_address, username, pre_referrer, created_at
    FROM users
    WHERE wallet_address IS NOT NULL
  LOOP
    BEGIN
      -- Sync to members table
      INSERT INTO members (
        wallet_address,
        referrer_wallet,
        activation_time,
        current_level,
        has_pending_rewards,
        levels_owned,
        activation_sequence
      ) VALUES (
        v_user.wallet_address,
        COALESCE(v_user.pre_referrer, v_root_wallet),
        v_user.created_at,
        1,
        false,
        ARRAY[1],
        (SELECT COALESCE(MAX(activation_sequence), 0) + 1 FROM members)
      )
      ON CONFLICT (wallet_address) DO NOTHING;

      IF FOUND THEN
        v_synced_members := v_synced_members + 1;
      END IF;

      -- Sync to memberships table
      INSERT INTO memberships (
        wallet_address,
        nft_level,
        activation_tier,
        claim_status,
        activated_at,
        referrer_wallet,
        activation_sequence
      ) VALUES (
        v_user.wallet_address,
        1,
        1,
        'claimed',
        v_user.created_at,
        COALESCE(v_user.pre_referrer, v_root_wallet),
        (SELECT COALESCE(MAX(activation_sequence), 0) + 1 FROM memberships)
      )
      ON CONFLICT (wallet_address) DO NOTHING;

      IF FOUND THEN
        v_synced_memberships := v_synced_memberships + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error syncing %: %', v_user.wallet_address, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '✅ Step 1 完成:';
  RAISE NOTICE '  - 同步 Members: %', v_synced_members;
  RAISE NOTICE '  - 同步 Memberships: %', v_synced_memberships;
END;
$$;

\echo ''
\echo '=========================================='
\echo '🔷 Step 2: 重建矩阵结构 (Members → Referrals)'
\echo '=========================================='

DO $$
DECLARE
  v_member RECORD;
  v_parent TEXT;
  v_position TEXT;
  v_layer INTEGER;
  v_placed INTEGER := 0;
  v_total INTEGER := 0;
  v_root_wallet TEXT := '0x0000000000000000000000000000000000000001';
  v_queue TEXT[];
  v_current_wallet TEXT;
  v_child_count INTEGER;
  v_positions TEXT[];
BEGIN
  -- Get all members ordered by activation sequence
  FOR v_member IN
    SELECT wallet_address, referrer_wallet, activation_sequence, username
    FROM members m
    JOIN users u ON m.wallet_address = u.wallet_address
    WHERE m.wallet_address != v_root_wallet
    ORDER BY m.activation_sequence
  LOOP
    v_total := v_total + 1;

    BEGIN
      -- Check if already in matrix
      IF EXISTS (SELECT 1 FROM referrals WHERE member_wallet = v_member.wallet_address) THEN
        CONTINUE;
      END IF;

      -- Simple BFS to find placement
      v_parent := v_member.referrer_wallet;
      v_layer := 1;

      -- Check if referrer has space
      SELECT COUNT(*) INTO v_child_count
      FROM referrals
      WHERE matrix_parent = v_parent;

      -- If full, find spillover
      WHILE v_child_count >= 3 LOOP
        SELECT member_wallet INTO v_parent
        FROM referrals
        WHERE matrix_parent = v_parent
          AND (
            SELECT COUNT(*)
            FROM referrals child
            WHERE child.matrix_parent = referrals.member_wallet
          ) < 3
        ORDER BY placed_at
        LIMIT 1;

        IF v_parent IS NULL THEN
          v_parent := v_member.referrer_wallet;
          EXIT;
        END IF;

        v_layer := v_layer + 1;

        SELECT COUNT(*) INTO v_child_count
        FROM referrals
        WHERE matrix_parent = v_parent;
      END LOOP;

      -- Determine position (L, M, R)
      SELECT array_agg(matrix_position) INTO v_positions
      FROM referrals
      WHERE matrix_parent = v_parent;

      IF v_positions IS NULL OR NOT ('L' = ANY(v_positions)) THEN
        v_position := 'L';
      ELSIF NOT ('M' = ANY(v_positions)) THEN
        v_position := 'M';
      ELSIF NOT ('R' = ANY(v_positions)) THEN
        v_position := 'R';
      ELSE
        v_position := 'L';
      END IF;

      -- Insert into referrals
      INSERT INTO referrals (
        member_wallet,
        referrer_wallet,
        matrix_parent,
        matrix_position,
        matrix_layer,
        matrix_root,
        is_active,
        placed_at
      ) VALUES (
        v_member.wallet_address,
        v_member.referrer_wallet,
        v_parent,
        v_position,
        v_layer,
        v_root_wallet,
        true,
        NOW()
      );

      v_placed := v_placed + 1;

      IF v_placed % 10 = 0 THEN
        RAISE NOTICE 'Placed % members...', v_placed;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error placing %: %', v_member.wallet_address, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '✅ Step 2 完成:';
  RAISE NOTICE '  - 总 Members: %', v_total;
  RAISE NOTICE '  - 放入矩阵: %', v_placed;
END;
$$;

\echo ''
\echo '=========================================='
\echo '💰 Step 3: 验证直推奖励'
\echo '=========================================='

WITH direct_stats AS (
  SELECT
    m.wallet_address,
    COUNT(m2.wallet_address) as direct_referral_count,
    (
      SELECT COUNT(*)
      FROM layer_rewards lr
      WHERE lr.reward_recipient_wallet = m.wallet_address
        AND lr.reward_type = 'direct'
        AND lr.status = 'completed'
    ) as direct_reward_count
  FROM members m
  LEFT JOIN members m2 ON m2.referrer_wallet = m.wallet_address
  WHERE m.wallet_address != '0x0000000000000000000000000000000000000001'
  GROUP BY m.wallet_address
)
SELECT
  '直推奖励统计' as report_type,
  COUNT(*) as total_members,
  SUM(direct_referral_count) as total_referrals,
  SUM(direct_reward_count) as total_direct_rewards,
  SUM(direct_referral_count) - SUM(direct_reward_count) as mismatch
FROM direct_stats;

\echo ''
\echo '不匹配的直推奖励（前10条）:'
WITH direct_stats AS (
  SELECT
    m.wallet_address,
    u.username,
    COUNT(m2.wallet_address) as direct_referral_count,
    (
      SELECT COUNT(*)
      FROM layer_rewards lr
      WHERE lr.reward_recipient_wallet = m.wallet_address
        AND lr.reward_type = 'direct'
        AND lr.status = 'completed'
    ) as direct_reward_count
  FROM members m
  JOIN users u ON m.wallet_address = u.wallet_address
  LEFT JOIN members m2 ON m2.referrer_wallet = m.wallet_address
  WHERE m.wallet_address != '0x0000000000000000000000000000000000000001'
  GROUP BY m.wallet_address, u.username
)
SELECT
  username,
  wallet_address,
  direct_referral_count as expected,
  direct_reward_count as actual,
  direct_referral_count - direct_reward_count as diff
FROM direct_stats
WHERE direct_referral_count != direct_reward_count
ORDER BY ABS(direct_referral_count - direct_reward_count) DESC
LIMIT 10;

\echo ''
\echo '=========================================='
\echo '✅ Step 4: 验证奖励总数'
\echo '=========================================='

WITH reward_summary AS (
  SELECT
    lr.reward_recipient_wallet,
    COUNT(*) FILTER (WHERE lr.reward_type = 'direct') as direct_count,
    COUNT(*) FILTER (WHERE lr.reward_type = 'layer') as layer_count,
    COUNT(*) as total_count
  FROM layer_rewards lr
  WHERE lr.status = 'completed'
  GROUP BY lr.reward_recipient_wallet
)
SELECT
  '奖励总数验证' as report_type,
  COUNT(*) as total_wallets,
  SUM(direct_count) as total_direct,
  SUM(layer_count) as total_layer,
  SUM(total_count) as grand_total
FROM reward_summary;

\echo ''
\echo '=========================================='
\echo '📊 最终状态汇总'
\echo '=========================================='

SELECT
  'Users' as metric, COUNT(*) as count FROM users
UNION ALL
SELECT 'Members', COUNT(*) FROM members
UNION ALL
SELECT 'Memberships', COUNT(*) FROM memberships
UNION ALL
SELECT 'Referrals', COUNT(*) FROM referrals
UNION ALL
SELECT 'Direct Rewards', COUNT(*) FROM layer_rewards
WHERE reward_type = 'direct' AND status = 'completed'
UNION ALL
SELECT 'Layer Rewards', COUNT(*) FROM layer_rewards
WHERE reward_type = 'layer' AND status = 'completed'
UNION ALL
SELECT 'Total Rewards', COUNT(*) FROM layer_rewards
WHERE status = 'completed';

\echo ''
\echo '矩阵层级分布:'
SELECT
  matrix_layer,
  COUNT(*) as member_count,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*)::numeric FROM referrals) * 100, 1) as percentage
FROM referrals
GROUP BY matrix_layer
ORDER BY matrix_layer;

\echo ''
\echo '=========================================='
\echo '✅ 同步完成！'
\echo '=========================================='

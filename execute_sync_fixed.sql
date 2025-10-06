-- =====================================================
-- 执行完整系统同步 (修正版)
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
SELECT 'Membership', COUNT(*) FROM membership
UNION ALL
SELECT 'Referrals', COUNT(*) FROM referrals
UNION ALL
SELECT 'Layer Rewards (Total)', COUNT(*) FROM layer_rewards;

\echo ''
\echo '🔍 数据缺口分析:'
\echo '------------------------------------------'

SELECT
  'Users without Members' as gap_type,
  COUNT(*) as count
FROM users u
LEFT JOIN members m ON u.wallet_address = m.wallet_address
WHERE m.wallet_address IS NULL
UNION ALL
SELECT
  'Members without Referrals',
  COUNT(*)
FROM members m
LEFT JOIN referrals r ON m.wallet_address = r.member_wallet
WHERE r.member_wallet IS NULL
  AND m.wallet_address != '0x0000000000000000000000000000000000000001';

\echo ''
\echo '=========================================='
\echo '📝 Step 1: 同步 Users → Members'
\echo '=========================================='

DO $$
DECLARE
  v_user RECORD;
  v_synced_members INTEGER := 0;
  v_root_wallet TEXT := '0x0000000000000000000000000000000000000001';
BEGIN
  FOR v_user IN
    SELECT wallet_address, username, referrer_wallet, created_at
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
        activation_sequence,
        total_nft_claimed
      ) VALUES (
        v_user.wallet_address,
        COALESCE(v_user.referrer_wallet, v_root_wallet),
        v_user.created_at,
        1,
        (SELECT COALESCE(MAX(activation_sequence), 0) + 1 FROM members),
        1
      )
      ON CONFLICT (wallet_address) DO NOTHING;

      IF FOUND THEN
        v_synced_members := v_synced_members + 1;
        IF v_synced_members % 100 = 0 THEN
          RAISE NOTICE 'Synced % members...', v_synced_members;
        END IF;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error syncing %: %', v_user.wallet_address, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '✅ Step 1 完成: 同步 % Members', v_synced_members;
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
  v_child_count INTEGER;
  v_positions TEXT[];
BEGIN
  FOR v_member IN
    SELECT m.wallet_address, m.referrer_wallet, m.activation_sequence, u.username
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

      IF v_placed % 100 = 0 THEN
        RAISE NOTICE 'Placed % members in matrix...', v_placed;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error placing %: %', v_member.wallet_address, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '✅ Step 2 完成: 总 Members %, 放入矩阵 %', v_total, v_placed;
END;
$$;

\echo ''
\echo '=========================================='
\echo '💰 Step 3: 验证直推奖励'
\echo '=========================================='
\echo '直推统计（每个member的直接推荐人数）:'

WITH direct_stats AS (
  SELECT
    m.wallet_address,
    u.username,
    COUNT(m2.wallet_address) as direct_referral_count
  FROM members m
  JOIN users u ON m.wallet_address = u.wallet_address
  LEFT JOIN members m2 ON m2.referrer_wallet = m.wallet_address
  WHERE m.wallet_address != '0x0000000000000000000000000000000000000001'
  GROUP BY m.wallet_address, u.username
)
SELECT
  '总统计' as type,
  COUNT(*) as total_members,
  SUM(direct_referral_count) as total_direct_referrals
FROM direct_stats;

\echo ''
\echo '有直推的会员（前20名）:'
WITH direct_stats AS (
  SELECT
    m.wallet_address,
    u.username,
    COUNT(m2.wallet_address) as direct_count
  FROM members m
  JOIN users u ON m.wallet_address = u.wallet_address
  LEFT JOIN members m2 ON m2.referrer_wallet = m.wallet_address
  WHERE m.wallet_address != '0x0000000000000000000000000000000000000001'
  GROUP BY m.wallet_address, u.username
)
SELECT username, wallet_address, direct_count
FROM direct_stats
WHERE direct_count > 0
ORDER BY direct_count DESC
LIMIT 20;

\echo ''
\echo '=========================================='
\echo '✅ Step 4: 奖励统计'
\echo '=========================================='

SELECT
  '奖励总统计' as report_type,
  status,
  COUNT(*) as count,
  SUM(reward_amount) as total_amount
FROM layer_rewards
GROUP BY status
ORDER BY status;

\echo ''
\echo '=========================================='
\echo '📊 最终状态汇总'
\echo '=========================================='

SELECT
  'Users' as metric, COUNT(*) as count FROM users
UNION ALL
SELECT 'Members', COUNT(*) FROM members
UNION ALL
SELECT 'Membership', COUNT(*) FROM membership
UNION ALL
SELECT 'Referrals', COUNT(*) FROM referrals
UNION ALL
SELECT 'Layer Rewards (Total)', COUNT(*) FROM layer_rewards
UNION ALL
SELECT 'Layer Rewards (Pending)', COUNT(*) FROM layer_rewards WHERE status = 'pending'
UNION ALL
SELECT 'Layer Rewards (Claimable)', COUNT(*) FROM layer_rewards WHERE status = 'claimable'
UNION ALL
SELECT 'Layer Rewards (Claimed)', COUNT(*) FROM layer_rewards WHERE status = 'claimed';

\echo ''
\echo '矩阵层级分布:'
SELECT
  matrix_layer,
  COUNT(*) as member_count,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*)::numeric FROM referrals) * 100, 1) || '%' as percentage
FROM referrals
GROUP BY matrix_layer
ORDER BY matrix_layer;

\echo ''
\echo '同步缺口检查:'
SELECT
  'Users without Members' as check_type,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '❌ NEED SYNC' END as status
FROM users u
LEFT JOIN members m ON u.wallet_address = m.wallet_address
WHERE m.wallet_address IS NULL
UNION ALL
SELECT
  'Members without Referrals',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '❌ NEED SYNC' END
FROM members m
LEFT JOIN referrals r ON m.wallet_address = r.member_wallet
WHERE r.member_wallet IS NULL
  AND m.wallet_address != '0x0000000000000000000000000000000000000001';

\echo ''
\echo '=========================================='
\echo '✅ 同步完成！'
\echo '=========================================='

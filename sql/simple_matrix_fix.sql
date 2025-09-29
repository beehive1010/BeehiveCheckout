-- =============================================
-- 简化版矩阵修复 - 手动重新放置孤立成员
-- =============================================

-- 简单放置孤立成员到可用位置
CREATE OR REPLACE FUNCTION simple_place_orphaned_members()
RETURNS JSON AS $$
DECLARE
  v_orphaned_member RECORD;
  v_available_slot RECORD;
  v_placed_count INTEGER := 0;
  v_failed_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 Starting simple orphaned member placement...';

  -- 获取所有孤立成员
  FOR v_orphaned_member IN
    SELECT m.wallet_address, m.activation_sequence
    FROM members m
    LEFT JOIN matrix_referrals mr ON mr.member_wallet = m.wallet_address
    WHERE mr.member_wallet IS NULL
      AND m.current_level >= 1
    ORDER BY m.activation_sequence ASC
    LIMIT 20  -- 限制一次处理20个
  LOOP
    RAISE NOTICE '🔍 Processing orphaned member: %', v_orphaned_member.wallet_address;
    
    -- 查找有空位的matrix root (Layer 1未满的)
    SELECT sub.matrix_root_wallet, sub.missing_position INTO v_available_slot
    FROM (
      SELECT 
        mr.matrix_root_wallet,
        CASE 
          WHEN NOT EXISTS (SELECT 1 FROM matrix_referrals WHERE matrix_root_wallet = mr.matrix_root_wallet AND position = 'L' AND layer = 1) THEN 'L'
          WHEN NOT EXISTS (SELECT 1 FROM matrix_referrals WHERE matrix_root_wallet = mr.matrix_root_wallet AND position = 'M' AND layer = 1) THEN 'M'
          WHEN NOT EXISTS (SELECT 1 FROM matrix_referrals WHERE matrix_root_wallet = mr.matrix_root_wallet AND position = 'R' AND layer = 1) THEN 'R'
          ELSE NULL
        END as missing_position
      FROM matrix_referrals mr
      WHERE mr.layer = 1
      GROUP BY mr.matrix_root_wallet
    ) sub
    WHERE sub.missing_position IS NOT NULL
    LIMIT 1;
    
    IF v_available_slot.matrix_root_wallet IS NOT NULL THEN
      -- 插入到找到的位置
      INSERT INTO matrix_referrals (
        matrix_root_wallet,
        member_wallet,
        parent_wallet,
        parent_depth,
        position,
        layer,
        referral_type,
        source,
        created_at
      ) VALUES (
        v_available_slot.matrix_root_wallet,
        v_orphaned_member.wallet_address,
        v_available_slot.matrix_root_wallet,  -- Layer 1的parent就是root
        1,
        v_available_slot.missing_position,
        1,
        'is_spillover',
        'simple_fix',
        NOW()
      );
      
      v_placed_count := v_placed_count + 1;
      RAISE NOTICE '  ✅ Placed % in position % of matrix %', 
        v_orphaned_member.wallet_address, 
        v_available_slot.missing_position,
        v_available_slot.matrix_root_wallet;
    ELSE
      -- 如果没有Layer 1空位，跳过这个成员等下一轮处理
      v_failed_count := v_failed_count + 1;
      RAISE NOTICE '  ⏸️ No available Layer 1 positions for %, will try next time', v_orphaned_member.wallet_address;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Simple placement completed. Placed: %, Failed: %', v_placed_count, v_failed_count;
  
  RETURN json_build_object(
    'success', true,
    'placed_count', v_placed_count,
    'failed_count', v_failed_count,
    'message', 'Simple orphaned member placement completed'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION simple_place_orphaned_members TO service_role;
GRANT EXECUTE ON FUNCTION simple_place_orphaned_members TO authenticated;
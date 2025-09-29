-- =============================================
-- 修复矩阵数据一致性问题
-- 重新整理matrix_referrals表，确保3x3滑落逻辑正确
-- =============================================

-- 1. 备份当前数据
CREATE TABLE IF NOT EXISTS matrix_referrals_backup AS 
SELECT * FROM matrix_referrals;

-- 2. 清理重复位置数据的函数
CREATE OR REPLACE FUNCTION fix_matrix_position_duplicates()
RETURNS JSON AS $$
DECLARE
  v_matrix_root TEXT;
  v_members_with_position RECORD;
  v_position_count INTEGER;
  v_members_to_move TEXT[];
  v_member TEXT;
  v_result JSON;
  v_fixed_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔧 Starting matrix position duplicate cleanup...';

  -- 遍历每个matrix root
  FOR v_matrix_root IN 
    SELECT DISTINCT matrix_root_wallet 
    FROM matrix_referrals 
    ORDER BY matrix_root_wallet
  LOOP
    RAISE NOTICE '📋 Processing matrix root: %', v_matrix_root;
    
    -- 检查Layer 1的每个位置是否有重复
    FOR v_members_with_position IN
      SELECT position, array_agg(member_wallet) as members, count(*) as member_count
      FROM matrix_referrals 
      WHERE matrix_root_wallet = v_matrix_root AND layer = 1
      GROUP BY position
      HAVING count(*) > 1
    LOOP
      RAISE NOTICE '  ⚠️ Position % has % members: %', 
        v_members_with_position.position, 
        v_members_with_position.member_count, 
        v_members_with_position.members;
      
      -- 保留第一个成员，移动其他成员
      v_members_to_move := v_members_with_position.members[2:];
      
      FOREACH v_member IN ARRAY v_members_to_move LOOP
        -- 先删除这个重复的位置
        DELETE FROM matrix_referrals 
        WHERE matrix_root_wallet = v_matrix_root 
          AND member_wallet = v_member 
          AND layer = 1 
          AND position = v_members_with_position.position;
          
        RAISE NOTICE '    🔄 Removed duplicate member % from position %', 
          v_member, v_members_with_position.position;
        
        v_fixed_count := v_fixed_count + 1;
      END LOOP;
    END LOOP;
  END LOOP;

  RAISE NOTICE '✅ Matrix position cleanup completed. Fixed % duplicates', v_fixed_count;
  
  RETURN json_build_object(
    'success', true,
    'duplicates_fixed', v_fixed_count,
    'message', 'Matrix position duplicates cleaned up'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;

-- 3. 重新放置被移除的成员的函数
CREATE OR REPLACE FUNCTION replace_orphaned_members()
RETURNS JSON AS $$
DECLARE
  v_orphaned_member RECORD;
  v_placement_result JSON;
  v_replaced_count INTEGER := 0;
  v_failed_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 Starting orphaned member replacement...';

  -- 找到所有在members表中但不在matrix_referrals表中的成员
  FOR v_orphaned_member IN
    SELECT m.wallet_address, m.activation_sequence
    FROM members m
    LEFT JOIN matrix_referrals mr ON mr.member_wallet = m.wallet_address
    WHERE mr.member_wallet IS NULL
      AND m.current_level >= 1  -- 只处理已激活的成员
    ORDER BY m.activation_sequence ASC
  LOOP
    RAISE NOTICE '🔍 Found orphaned member: % (sequence: %)', 
      v_orphaned_member.wallet_address, v_orphaned_member.activation_sequence;
    
    -- 尝试找到这个成员的推荐人
    DECLARE
      v_referrer_wallet TEXT;
    BEGIN
      SELECT referrer_wallet INTO v_referrer_wallet
      FROM referrals_new
      WHERE referred_wallet = v_orphaned_member.wallet_address
      LIMIT 1;
      
      IF v_referrer_wallet IS NOT NULL THEN
        -- 使用递归矩阵放置函数重新放置
        SELECT place_member_in_recursive_matrix(
          v_orphaned_member.wallet_address, 
          v_referrer_wallet
        ) INTO v_placement_result;
        
        IF (v_placement_result->>'success')::boolean THEN
          v_replaced_count := v_replaced_count + 1;
          RAISE NOTICE '  ✅ Successfully replaced member %', v_orphaned_member.wallet_address;
        ELSE
          v_failed_count := v_failed_count + 1;
          RAISE NOTICE '  ❌ Failed to replace member %: %', 
            v_orphaned_member.wallet_address, v_placement_result->>'error';
        END IF;
      ELSE
        -- 如果没有找到推荐人，放到系统默认位置
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
          '0x0000000000000000000000000000000000000001', -- 系统默认root
          v_orphaned_member.wallet_address,
          '0x0000000000000000000000000000000000000001',
          1,
          'L', -- 默认L位置
          1,
          'spillover',
          'cleanup_fix',
          NOW()
        );
        
        v_replaced_count := v_replaced_count + 1;
        RAISE NOTICE '  🏠 Placed orphaned member % in system default matrix', 
          v_orphaned_member.wallet_address;
      END IF;
    END;
  END LOOP;

  RAISE NOTICE '✅ Orphaned member replacement completed. Replaced: %, Failed: %', 
    v_replaced_count, v_failed_count;
  
  RETURN json_build_object(
    'success', true,
    'replaced_count', v_replaced_count,
    'failed_count', v_failed_count,
    'message', 'Orphaned member replacement completed'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;

-- 4. 执行修复
-- 注意：这些函数创建后需要手动调用，不会自动执行

-- Grant permissions
GRANT EXECUTE ON FUNCTION fix_matrix_position_duplicates TO service_role;
GRANT EXECUTE ON FUNCTION fix_matrix_position_duplicates TO authenticated;
GRANT EXECUTE ON FUNCTION replace_orphaned_members TO service_role;
GRANT EXECUTE ON FUNCTION replace_orphaned_members TO authenticated;

-- 使用说明
/*
执行修复步骤：
1. SELECT fix_matrix_position_duplicates();  -- 修复重复位置
2. SELECT replace_orphaned_members();        -- 重新放置孤立成员

检查修复结果：
SELECT matrix_root_wallet, layer, position, COUNT(*) as members 
FROM matrix_referrals 
GROUP BY matrix_root_wallet, layer, position 
HAVING COUNT(*) > 1;
*/
-- =============================================
-- 实现真正的3x3矩阵滑落逻辑
-- 当一个matrix root的Layer 1满了(L,M,R都有人)，新成员滑落到Layer 2
-- =============================================

-- 检测并实现3x3滑落的函数
CREATE OR REPLACE FUNCTION trigger_3x3_spillover()
RETURNS JSON AS $$
DECLARE
  v_full_matrix RECORD;
  v_spillover_candidates RECORD;
  v_placement_target RECORD;
  v_processed_count INTEGER := 0;
  v_spillover_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 Starting 3x3 spillover detection and processing...';

  -- 1. 找到所有Layer 1已满(3个成员)但总成员数>3的matrix roots
  FOR v_full_matrix IN
    SELECT 
      matrix_root_wallet,
      COUNT(*) as total_members,
      array_agg(position ORDER BY position) as positions
    FROM matrix_referrals 
    WHERE layer = 1
    GROUP BY matrix_root_wallet
    HAVING COUNT(*) = 3  -- Layer 1满了
  LOOP
    RAISE NOTICE '📋 Checking matrix root: % (Layer 1 full with positions: %)', 
      v_full_matrix.matrix_root_wallet, v_full_matrix.positions;
    
    -- 检查这个matrix是否已经有Layer 2数据
    IF NOT EXISTS (
      SELECT 1 FROM matrix_referrals 
      WHERE matrix_root_wallet = v_full_matrix.matrix_root_wallet 
        AND layer = 2
    ) THEN
      RAISE NOTICE '  💡 Matrix % needs Layer 2 spillover setup', v_full_matrix.matrix_root_wallet;
      
      -- 2. 为Layer 1的每个位置创建Layer 2的3个子位置
      -- Layer 2位置命名：L.L, L.M, L.R, M.L, M.M, M.R, R.L, R.M, R.R
      -- 但由于position字段限制，我们用简化命名：LL, LM, LR, ML, MM, MR, RL, RM, RR
      
      DECLARE
        v_layer1_positions TEXT[] := ARRAY['L', 'M', 'R'];
        v_layer2_positions TEXT[] := ARRAY['L', 'M', 'R'];
        v_l1_pos TEXT;
        v_l2_pos TEXT;
        v_combined_pos TEXT;
        v_parent_member TEXT;
      BEGIN
        FOREACH v_l1_pos IN ARRAY v_layer1_positions LOOP
          -- 获取Layer 1这个位置的成员作为Layer 2的parent
          SELECT member_wallet INTO v_parent_member
          FROM matrix_referrals
          WHERE matrix_root_wallet = v_full_matrix.matrix_root_wallet
            AND layer = 1
            AND position = v_l1_pos;
          
          FOREACH v_l2_pos IN ARRAY v_layer2_positions LOOP
            v_combined_pos := v_l1_pos || v_l2_pos;  -- 例如: LL, LM, LR
            
            RAISE NOTICE '    🔧 Creating Layer 2 position % with parent %', 
              v_combined_pos, v_parent_member;
            
            -- 暂时不插入实际数据，只是准备好位置结构
            -- 实际的滑落将在有新成员加入时触发
          END LOOP;
        END LOOP;
        
        v_processed_count := v_processed_count + 1;
      END;
    ELSE
      RAISE NOTICE '  ✅ Matrix % already has Layer 2 data', v_full_matrix.matrix_root_wallet;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ 3x3 spillover processing completed. Processed % matrices', v_processed_count;
  
  RETURN json_build_object(
    'success', true,
    'processed_matrices', v_processed_count,
    'spillover_members', v_spillover_count,
    'message', '3x3 spillover structure prepared'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;

-- 新成员加入时的滑落放置函数
CREATE OR REPLACE FUNCTION place_member_with_spillover(
  p_member_wallet VARCHAR(42),
  p_matrix_root_wallet VARCHAR(42)
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_layer1_full BOOLEAN;
  v_layer2_position TEXT;
  v_parent_member TEXT;
  v_parent_depth INTEGER;
BEGIN
  RAISE NOTICE '🎯 Placing member % in matrix %', p_member_wallet, p_matrix_root_wallet;

  -- 检查Layer 1是否已满
  SELECT COUNT(*) = 3 INTO v_layer1_full
  FROM matrix_referrals
  WHERE matrix_root_wallet = p_matrix_root_wallet
    AND layer = 1;

  IF NOT v_layer1_full THEN
    -- Layer 1有空位，直接放置
    DECLARE
      v_available_position TEXT;
    BEGIN
      -- 找到第一个空位
      IF NOT EXISTS (SELECT 1 FROM matrix_referrals WHERE matrix_root_wallet = p_matrix_root_wallet AND layer = 1 AND position = 'L') THEN
        v_available_position := 'L';
      ELSIF NOT EXISTS (SELECT 1 FROM matrix_referrals WHERE matrix_root_wallet = p_matrix_root_wallet AND layer = 1 AND position = 'M') THEN
        v_available_position := 'M';
      ELSIF NOT EXISTS (SELECT 1 FROM matrix_referrals WHERE matrix_root_wallet = p_matrix_root_wallet AND layer = 1 AND position = 'R') THEN
        v_available_position := 'R';
      END IF;

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
        p_matrix_root_wallet,
        p_member_wallet,
        p_matrix_root_wallet,
        1,
        v_available_position,
        1,
        'is_direct',
        'spillover_placement',
        NOW()
      );

      RAISE NOTICE '  ✅ Placed in Layer 1 position %', v_available_position;
      
      RETURN json_build_object(
        'success', true,
        'layer', 1,
        'position', v_available_position,
        'matrix_root', p_matrix_root_wallet
      );
    END;
  ELSE
    -- Layer 1已满，需要滑落到Layer 2
    RAISE NOTICE '  📈 Layer 1 full, placing in Layer 2 spillover';
    
    -- 找到Layer 2的第一个可用位置
    DECLARE
      v_layer2_positions TEXT[] := ARRAY['L.L', 'L.M', 'L.R', 'M.L', 'M.M', 'M.R', 'R.L', 'R.M', 'R.R'];
      v_pos TEXT;
      v_parent_pos TEXT;
    BEGIN
      FOREACH v_pos IN ARRAY v_layer2_positions LOOP
        IF NOT EXISTS (
          SELECT 1 FROM matrix_referrals 
          WHERE matrix_root_wallet = p_matrix_root_wallet 
            AND layer = 2 
            AND position = v_pos
        ) THEN
          -- 确定parent（Layer 1的对应成员）
          v_parent_pos := LEFT(v_pos, 1);  -- L.L -> L, M.L -> M, R.L -> R
          
          SELECT member_wallet INTO v_parent_member
          FROM matrix_referrals
          WHERE matrix_root_wallet = p_matrix_root_wallet
            AND layer = 1
            AND position = v_parent_pos;

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
            p_matrix_root_wallet,
            p_member_wallet,
            v_parent_member,
            2,
            v_pos,
            2,
            'is_spillover',
            'spillover_placement',
            NOW()
          );

          RAISE NOTICE '  ✅ Placed in Layer 2 position % with parent %', v_pos, v_parent_member;
          
          RETURN json_build_object(
            'success', true,
            'layer', 2,
            'position', v_pos,
            'parent_member', v_parent_member,
            'matrix_root', p_matrix_root_wallet
          );
        END IF;
      END LOOP;
      
      -- 如果Layer 2也满了，返回错误
      RETURN json_build_object(
        'success', false,
        'error', 'Both Layer 1 and Layer 2 are full',
        'matrix_root', p_matrix_root_wallet
      );
    END;
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION trigger_3x3_spillover TO service_role;
GRANT EXECUTE ON FUNCTION trigger_3x3_spillover TO authenticated;
GRANT EXECUTE ON FUNCTION place_member_with_spillover TO service_role;
GRANT EXECUTE ON FUNCTION place_member_with_spillover TO authenticated;
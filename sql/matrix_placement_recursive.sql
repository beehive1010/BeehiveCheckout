-- =============================================
-- Beehive Platform - 19-Layer Recursive Matrix Placement Algorithm
-- 实现正确的3x3递归Matrix放置逻辑，支持19层深度
-- =============================================

-- 主Matrix放置函数 - 实现19层3x3递归结构
CREATE OR REPLACE FUNCTION place_member_in_recursive_matrix(
  p_member_wallet VARCHAR(42),
  p_referrer_wallet VARCHAR(42)
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_placement_layer INTEGER;
  v_placement_position TEXT;
  v_matrix_root_wallet VARCHAR(42);
  v_member_sequence INTEGER;
  v_root_sequence INTEGER;
  v_error_msg TEXT;
BEGIN
  -- Step 1: 获取member的activation sequence
  SELECT activation_sequence INTO v_member_sequence
  FROM members 
  WHERE wallet_address = p_member_wallet;
  
  IF v_member_sequence IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Member not found in members table',
      'member_wallet', p_member_wallet
    );
  END IF;

  RAISE NOTICE '🎯 Starting recursive matrix placement for member: % (seq: %)', 
    p_member_wallet, v_member_sequence;

  -- Step 2: 找到最佳matrix root (使用spillover逻辑)
  SELECT * INTO v_matrix_root_wallet, v_placement_layer, v_placement_position
  FROM find_optimal_matrix_position(p_referrer_wallet, v_member_sequence);
  
  IF v_matrix_root_wallet IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No available matrix position found',
      'referrer_wallet', p_referrer_wallet
    );
  END IF;

  -- Step 3: 获取matrix root的activation sequence
  SELECT activation_sequence INTO v_root_sequence
  FROM members 
  WHERE wallet_address = v_matrix_root_wallet;

  -- Step 4: 执行实际的matrix placement
  BEGIN
    -- 插入到referrals表 (主要记录表)
    INSERT INTO referrals (
      member_wallet,
      referrer_wallet,
      matrix_root_wallet,
      matrix_root_sequence,
      matrix_layer,
      matrix_position,
      member_activation_sequence,
      is_direct_referral,
      is_spillover_placement,
      placed_at
    ) VALUES (
      p_member_wallet,
      p_referrer_wallet,
      v_matrix_root_wallet,
      v_root_sequence,
      v_placement_layer,
      v_placement_position,
      v_member_sequence,
      (v_matrix_root_wallet = p_referrer_wallet), -- 直推为true
      (v_matrix_root_wallet != p_referrer_wallet), -- 滑落为true
      NOW()
    );

    -- 插入到matrix_referrals表 (视图支持表)
    INSERT INTO matrix_referrals (
      member_wallet,
      matrix_root_wallet,
      layer,
      position,
      referrer_wallet,
      placement_order,
      created_at
    ) VALUES (
      p_member_wallet,
      v_matrix_root_wallet,
      v_placement_layer,
      v_placement_position,
      p_referrer_wallet,
      v_member_sequence,
      NOW()
    );

    RAISE NOTICE '✅ Matrix placement successful: % -> Layer %, Position % in matrix root %', 
      p_member_wallet, v_placement_layer, v_placement_position, v_matrix_root_wallet;

    -- Step 5: 触发层级奖励计算
    PERFORM calculate_layer_rewards(v_matrix_root_wallet, v_placement_layer);

    -- 返回成功结果
    RETURN json_build_object(
      'success', true,
      'member_wallet', p_member_wallet,
      'referrer_wallet', p_referrer_wallet,
      'matrix_root_wallet', v_matrix_root_wallet,
      'placement_layer', v_placement_layer,
      'placement_position', v_placement_position,
      'is_spillover', (v_matrix_root_wallet != p_referrer_wallet),
      'member_sequence', v_member_sequence
    );

  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
    RAISE NOTICE '❌ Matrix placement failed: %', v_error_msg;
    
    RETURN json_build_object(
      'success', false,
      'error', v_error_msg,
      'member_wallet', p_member_wallet,
      'referrer_wallet', p_referrer_wallet
    );
  END;
END;
$$ LANGUAGE plpgsql;

-- 找到最优matrix位置的算法
CREATE OR REPLACE FUNCTION find_optimal_matrix_position(
  p_referrer_wallet VARCHAR(42),
  p_member_sequence INTEGER
)
RETURNS TABLE(
  optimal_root_wallet VARCHAR(42),
  optimal_layer INTEGER,
  optimal_position TEXT
) AS $$
DECLARE
  v_current_root VARCHAR(42);
  v_layer INTEGER;
  v_position TEXT;
  v_found BOOLEAN := false;
BEGIN
  RAISE NOTICE '🔍 Finding optimal matrix position for referrer: %', p_referrer_wallet;

  -- Step 1: 检查referrer的直接Layer 1位置 (L, M, R)
  FOR v_position IN VALUES ('L'), ('M'), ('R') LOOP
    -- 检查位置是否被占用
    IF NOT EXISTS (
      SELECT 1 FROM referrals 
      WHERE matrix_root_wallet = p_referrer_wallet 
        AND matrix_layer = 1 
        AND matrix_position = v_position
    ) THEN
      RAISE NOTICE '✅ Found available Layer 1 position: % in matrix root %', 
        v_position, p_referrer_wallet;
      
      optimal_root_wallet := p_referrer_wallet;
      optimal_layer := 1;
      optimal_position := v_position;
      v_found := true;
      RETURN NEXT;
      RETURN;
    END IF;
  END LOOP;

  -- Step 2: Layer 1满了，寻找spillover位置
  RAISE NOTICE '📈 Layer 1 full, searching for spillover positions...';
  
  -- 按activation_sequence顺序查找未满的matrix
  FOR v_current_root IN (
    SELECT m.wallet_address
    FROM members m
    WHERE m.activation_sequence < p_member_sequence
      AND m.current_level >= 1  -- 必须是已激活的成员
    ORDER BY m.activation_sequence ASC
  ) LOOP
    
    -- 为每个潜在root检查是否有空位
    SELECT * INTO optimal_root_wallet, optimal_layer, optimal_position
    FROM find_next_available_position_in_matrix(v_current_root);
    
    IF optimal_root_wallet IS NOT NULL THEN
      RAISE NOTICE '✅ Found spillover position: Layer %, Position % in matrix root %', 
        optimal_layer, optimal_position, optimal_root_wallet;
      v_found := true;
      RETURN NEXT;
      RETURN;
    END IF;
  END LOOP;

  -- Step 3: 如果没找到位置，返回NULL
  IF NOT v_found THEN
    RAISE NOTICE '❌ No available matrix positions found in entire network';
    optimal_root_wallet := NULL;
    optimal_layer := NULL;
    optimal_position := NULL;
    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 在特定matrix root中找到下一个可用位置
CREATE OR REPLACE FUNCTION find_next_available_position_in_matrix(
  p_matrix_root VARCHAR(42)
)
RETURNS TABLE(
  root_wallet VARCHAR(42),
  next_layer INTEGER,
  next_position TEXT
) AS $$
DECLARE
  v_layer INTEGER;
  v_position TEXT;
  v_max_capacity INTEGER;
  v_current_count INTEGER;
  v_parent_position TEXT;
  v_child_positions TEXT[];
  v_pos TEXT;
BEGIN
  -- 逐层检查从Layer 1到Layer 19
  FOR v_layer IN 1..19 LOOP
    v_max_capacity := POWER(3, v_layer); -- Layer n可容纳3^n个成员
    
    -- 计算当前layer已用位置数
    SELECT COUNT(*) INTO v_current_count
    FROM referrals
    WHERE matrix_root_wallet = p_matrix_root 
      AND matrix_layer = v_layer;
    
    -- 如果当前layer未满
    IF v_current_count < v_max_capacity THEN
      RAISE NOTICE '🎯 Layer % has space: %/% filled', v_layer, v_current_count, v_max_capacity;
      
      -- 找到具体的可用位置
      IF v_layer = 1 THEN
        -- Layer 1: 直接检查L, M, R
        FOR v_position IN VALUES ('L'), ('M'), ('R') LOOP
          IF NOT EXISTS (
            SELECT 1 FROM referrals 
            WHERE matrix_root_wallet = p_matrix_root 
              AND matrix_layer = 1 
              AND matrix_position = v_position
          ) THEN
            root_wallet := p_matrix_root;
            next_layer := 1;
            next_position := v_position;
            RETURN NEXT;
            RETURN;
          END IF;
        END LOOP;
      ELSE
        -- Layer 2+: 实现递归位置计算
        SELECT * INTO root_wallet, next_layer, next_position
        FROM find_recursive_position(p_matrix_root, v_layer);
        
        IF root_wallet IS NOT NULL THEN
          RETURN NEXT;
          RETURN;
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- 如果19层都满了，返回NULL
  root_wallet := NULL;
  next_layer := NULL;
  next_position := NULL;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 计算递归层级位置 (Layer 2-19)
CREATE OR REPLACE FUNCTION find_recursive_position(
  p_matrix_root VARCHAR(42),
  p_target_layer INTEGER
)
RETURNS TABLE(
  matrix_root VARCHAR(42),
  target_layer INTEGER,
  available_position TEXT
) AS $$
DECLARE
  v_parent_layer INTEGER;
  v_parent_positions TEXT[];
  v_parent_pos TEXT;
  v_child_positions TEXT[];
  v_child_pos TEXT;
  v_full_position TEXT;
BEGIN
  v_parent_layer := p_target_layer - 1;
  
  -- 获取上一层的所有已占用位置
  SELECT ARRAY_AGG(matrix_position ORDER BY matrix_position) INTO v_parent_positions
  FROM referrals
  WHERE matrix_root_wallet = p_matrix_root 
    AND matrix_layer = v_parent_layer;

  -- 对每个parent位置，检查其3个子位置
  FOREACH v_parent_pos IN ARRAY v_parent_positions LOOP
    v_child_positions := ARRAY[
      v_parent_pos || '.L',
      v_parent_pos || '.M', 
      v_parent_pos || '.R'
    ];
    
    -- 检查每个子位置是否可用
    FOREACH v_child_pos IN ARRAY v_child_positions LOOP
      IF NOT EXISTS (
        SELECT 1 FROM referrals 
        WHERE matrix_root_wallet = p_matrix_root 
          AND matrix_layer = p_target_layer 
          AND matrix_position = v_child_pos
      ) THEN
        -- 找到可用位置
        matrix_root := p_matrix_root;
        target_layer := p_target_layer;
        available_position := v_child_pos;
        RETURN NEXT;
        RETURN;
      END IF;
    END LOOP;
  END LOOP;

  -- 没找到可用位置
  matrix_root := NULL;
  target_layer := NULL;
  available_position := NULL;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 计算层级奖励分发
CREATE OR REPLACE FUNCTION calculate_layer_rewards(
  p_matrix_root VARCHAR(42),
  p_trigger_layer INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_layer INTEGER;
  v_reward_amount DECIMAL(10,2);
  v_upline_wallet VARCHAR(42);
  v_upline_count INTEGER;
BEGIN
  RAISE NOTICE '💰 Calculating layer rewards for matrix root: %, trigger layer: %', 
    p_matrix_root, p_trigger_layer;

  -- 向上分发奖励到19层
  v_upline_wallet := p_matrix_root;
  
  FOR v_layer IN 1..19 LOOP
    -- 计算当前层级的奖励金额
    v_reward_amount := CASE 
      WHEN v_layer = 1 THEN 100.00
      WHEN v_layer BETWEEN 2 AND 19 THEN 50.00
      ELSE 0.00
    END;
    
    -- 如果有上级且有奖励
    IF v_upline_wallet IS NOT NULL AND v_reward_amount > 0 THEN
      -- 记录奖励到rewards表
      INSERT INTO rewards (
        receiver_wallet,
        amount,
        reward_type,
        source_layer,
        source_member,
        matrix_root,
        created_at,
        status
      ) VALUES (
        v_upline_wallet,
        v_reward_amount,
        'layer_reward',
        v_layer,
        p_matrix_root, -- 触发奖励的member
        p_matrix_root,
        NOW(),
        'pending'
      );
      
      RAISE NOTICE '  💵 Layer % reward: %USDC to %', v_layer, v_reward_amount, v_upline_wallet;
    END IF;
    
    -- 找到下一个上级 (通过referrals表向上追溯)
    SELECT referrer_wallet INTO v_upline_wallet
    FROM referrals
    WHERE member_wallet = v_upline_wallet
    ORDER BY placed_at DESC
    LIMIT 1;
    
    -- 如果没有更高的上级，停止
    IF v_upline_wallet IS NULL THEN
      EXIT;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Layer rewards calculation completed for % layers', v_layer - 1;
END;
$$ LANGUAGE plpgsql;

-- 验证matrix结构完整性的函数
CREATE OR REPLACE FUNCTION validate_matrix_structure(p_matrix_root VARCHAR(42) DEFAULT NULL)
RETURNS TABLE(
  matrix_root VARCHAR(42),
  layer INTEGER,
  total_positions INTEGER,
  filled_positions INTEGER,
  max_capacity INTEGER,
  fill_percentage DECIMAL(5,2),
  structure_valid BOOLEAN
) AS $$
DECLARE
  v_root VARCHAR(42);
BEGIN
  -- 如果指定了root，只检查该root；否则检查所有
  FOR v_root IN (
    SELECT DISTINCT matrix_root_wallet 
    FROM referrals 
    WHERE (p_matrix_root IS NULL OR matrix_root_wallet = p_matrix_root)
  ) LOOP
    
    -- 检查每一层
    FOR layer IN 1..19 LOOP
      SELECT 
        v_root,
        layer,
        POWER(3, layer)::INTEGER,
        COUNT(*)::INTEGER,
        POWER(3, layer)::INTEGER,
        ROUND((COUNT(*)::DECIMAL / POWER(3, layer)) * 100, 2),
        (COUNT(*) <= POWER(3, layer)) -- 验证不能超过最大容量
      INTO 
        matrix_root, layer, max_capacity, filled_positions, total_positions, fill_percentage, structure_valid
      FROM referrals
      WHERE matrix_root_wallet = v_root AND matrix_layer = layer;
      
      -- 如果该层有数据或者是第一层，返回结果
      IF filled_positions > 0 OR layer = 1 THEN
        RETURN NEXT;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 创建matrix统计视图的更新函数
CREATE OR REPLACE FUNCTION refresh_matrix_views()
RETURNS VOID AS $$
BEGIN
  -- 刷新matrix_layers_view等视图
  REFRESH MATERIALIZED VIEW IF EXISTS matrix_layers_view;
  REFRESH MATERIALIZED VIEW IF EXISTS matrix_referrals_tree_view;
  
  RAISE NOTICE '✅ Matrix views refreshed successfully';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Matrix views refresh failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 修复现有matrix数据的函数
CREATE OR REPLACE FUNCTION repair_existing_matrix_data()
RETURNS JSON AS $$
DECLARE
  v_member RECORD;
  v_result JSON;
  v_repaired_count INTEGER := 0;
  v_error_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔧 Starting matrix data repair process...';
  
  -- 按activation_sequence顺序重新处理所有members
  FOR v_member IN (
    SELECT wallet_address, referrer_wallet, activation_sequence
    FROM members 
    WHERE current_level >= 1
    ORDER BY activation_sequence ASC
  ) LOOP
    
    -- 检查是否已有正确的matrix placement
    IF NOT EXISTS (
      SELECT 1 FROM referrals 
      WHERE member_wallet = v_member.wallet_address 
        AND matrix_layer IS NOT NULL 
        AND matrix_position IS NOT NULL
    ) THEN
      -- 重新执行matrix placement
      BEGIN
        SELECT place_member_in_recursive_matrix(
          v_member.wallet_address, 
          COALESCE(v_member.referrer_wallet, '0x0000000000000000000000000000000000000001')
        ) INTO v_result;
        
        IF (v_result->>'success')::BOOLEAN THEN
          v_repaired_count := v_repaired_count + 1;
          RAISE NOTICE '✅ Repaired matrix placement for: %', v_member.wallet_address;
        ELSE
          v_error_count := v_error_count + 1;
          RAISE NOTICE '❌ Failed to repair matrix placement for: % - %', 
            v_member.wallet_address, v_result->>'error';
        END IF;
        
      EXCEPTION WHEN OTHERS THEN
        v_error_count := v_error_count + 1;
        RAISE NOTICE '❌ Exception during repair for: % - %', v_member.wallet_address, SQLERRM;
      END;
    END IF;
  END LOOP;
  
  -- 刷新视图
  PERFORM refresh_matrix_views();
  
  RETURN json_build_object(
    'success', true,
    'repaired_count', v_repaired_count,
    'error_count', v_error_count,
    'total_processed', v_repaired_count + v_error_count
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION place_member_in_recursive_matrix IS '主Matrix放置函数 - 实现19层3x3递归结构';
COMMENT ON FUNCTION find_optimal_matrix_position IS '找到最优matrix位置 - 支持spillover逻辑';
COMMENT ON FUNCTION find_next_available_position_in_matrix IS '在特定matrix中找下一个可用位置';
COMMENT ON FUNCTION find_recursive_position IS '计算递归层级位置 (Layer 2-19)';
COMMENT ON FUNCTION calculate_layer_rewards IS '计算并分发层级奖励';
COMMENT ON FUNCTION validate_matrix_structure IS '验证matrix结构完整性';
COMMENT ON FUNCTION repair_existing_matrix_data IS '修复现有matrix数据的函数';
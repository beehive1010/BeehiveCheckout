-- =============================================
-- Trigger Layer Rewards on Upgrade Function
-- 实现Level 2-19升级时的Layer Reward分发逻辑
-- Layer 1: Direct Referral Reward → Referrer
-- Layer 2-19: Layer Reward → Matrix Root (向上19层)
-- =============================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS trigger_layer_rewards_on_upgrade(VARCHAR, INTEGER, NUMERIC, VARCHAR);

-- Create the function
CREATE OR REPLACE FUNCTION trigger_layer_rewards_on_upgrade(
  p_upgrading_member_wallet VARCHAR(42),
  p_new_level INTEGER,
  p_nft_price NUMERIC(10,2),
  p_reward_type VARCHAR(50) DEFAULT 'layer_reward'
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_matrix_root_wallet VARCHAR(42);
  v_layer_count INTEGER := 0;
  v_total_rewards_created INTEGER := 0;
  v_matrix_layer INTEGER;
  v_current_wallet VARCHAR(42);
  v_upline_wallet VARCHAR(42);
  v_rewards_created INTEGER := 0;
  v_error_msg TEXT;
BEGIN
  RAISE NOTICE '🎯 Starting layer rewards trigger for member: % (Level %)', 
    p_upgrading_member_wallet, p_new_level;

  -- Level 1不触发layer rewards，只有direct referral rewards
  IF p_new_level = 1 THEN
    RAISE NOTICE 'ℹ️ Level 1 upgrade - Layer rewards not triggered (only direct referral rewards)';
    RETURN json_build_object(
      'success', true,
      'message', 'Level 1 does not trigger layer rewards',
      'rewards_created', 0,
      'note', 'Use direct referral reward logic for Level 1'
    );
  END IF;

  -- Level 2-19: 触发layer rewards到matrix root
  RAISE NOTICE '💰 Processing Layer 2-19 rewards for Level % upgrade...', p_new_level;

  -- 找到升级会员的matrix root
  SELECT matrix_root_wallet INTO v_matrix_root_wallet
  FROM referrals
  WHERE member_wallet = p_upgrading_member_wallet
  LIMIT 1;

  IF v_matrix_root_wallet IS NULL THEN
    -- 尝试从matrix_referrals表查找
    SELECT matrix_root_wallet INTO v_matrix_root_wallet
    FROM matrix_referrals
    WHERE member_wallet = p_upgrading_member_wallet
    LIMIT 1;
  END IF;

  IF v_matrix_root_wallet IS NULL THEN
    RAISE NOTICE '⚠️ No matrix root found for member: %', p_upgrading_member_wallet;
    RETURN json_build_object(
      'success', false,
      'error', 'No matrix root found for member',
      'member_wallet', p_upgrading_member_wallet
    );
  END IF;

  RAISE NOTICE '🎯 Found matrix root: % for member: %', v_matrix_root_wallet, p_upgrading_member_wallet;

  -- 从matrix root开始，向上分发19层layer rewards
  v_current_wallet := v_matrix_root_wallet;
  
  FOR v_matrix_layer IN 1..19 LOOP
    -- 检查当前层级是否有会员
    IF v_current_wallet IS NOT NULL THEN
      -- 检查接收者的当前等级是否满足条件
      -- Layer 1-2: 需要达到升级后的等级
      -- Layer 3+: 需要达到升级后等级+1
      DECLARE
        v_recipient_level INTEGER;
        v_required_level INTEGER;
        v_layer_reward_amount NUMERIC(10,2);
      BEGIN
        -- 获取接收者当前等级
        SELECT current_level INTO v_recipient_level
        FROM members
        WHERE wallet_address = v_current_wallet;

        -- 计算所需等级
        IF v_matrix_layer <= 2 THEN
          v_required_level := p_new_level;
        ELSE
          v_required_level := p_new_level + 1;
        END IF;

        -- 计算layer reward金额 (使用NFT价格)
        v_layer_reward_amount := p_nft_price;

        -- 检查等级条件
        IF v_recipient_level >= v_required_level THEN
          -- 创建layer reward记录
          INSERT INTO layer_rewards (
            matrix_layer,
            matrix_root_wallet,
            reward_recipient_wallet,
            reward_amount,
            status,
            triggering_member_wallet,
            triggering_nft_level,
            recipient_current_level,
            recipient_required_level,
            created_at,
            expires_at
          ) VALUES (
            v_matrix_layer,
            v_matrix_root_wallet,
            v_current_wallet,
            v_layer_reward_amount,
            'pending',
            p_upgrading_member_wallet,
            p_new_level,
            v_recipient_level,
            v_required_level,
            NOW(),
            NOW() + INTERVAL '72 hours'
          );

          v_rewards_created := v_rewards_created + 1;
          v_total_rewards_created := v_total_rewards_created + 1;

          RAISE NOTICE '  ✅ Layer % reward: % USDC → % (Level %/%)', 
            v_matrix_layer, v_layer_reward_amount, v_current_wallet, v_recipient_level, v_required_level;
        ELSE
          RAISE NOTICE '  ⏸️ Layer % reward pending: % needs Level % (current: %)', 
            v_matrix_layer, v_current_wallet, v_required_level, v_recipient_level;
        END IF;

      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ⚠️ Error processing layer % reward for %: %', v_matrix_layer, v_current_wallet, SQLERRM;
      END;

      -- 寻找下一层的parent (matrix upline)
      SELECT matrix_root_wallet INTO v_upline_wallet
      FROM referrals
      WHERE member_wallet = v_current_wallet
      AND matrix_root_wallet != v_current_wallet
      LIMIT 1;

      IF v_upline_wallet IS NULL THEN
        -- 尝试从matrix_referrals查找
        SELECT parent_wallet INTO v_upline_wallet
        FROM matrix_referrals
        WHERE member_wallet = v_current_wallet
        AND parent_wallet IS NOT NULL
        LIMIT 1;
      END IF;

      v_current_wallet := v_upline_wallet;
    ELSE
      -- 没有更多上级了
      EXIT;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Layer rewards processing completed. Total rewards created: %', v_total_rewards_created;

  -- 返回结果
  RETURN json_build_object(
    'success', true,
    'upgrading_member', p_upgrading_member_wallet,
    'new_level', p_new_level,
    'nft_price', p_nft_price,
    'matrix_root', v_matrix_root_wallet,
    'total_rewards_created', v_total_rewards_created,
    'layers_processed', LEAST(v_layer_count, 19),
    'message', format('Successfully created %s layer rewards for Level %s upgrade', v_total_rewards_created, p_new_level)
  );

EXCEPTION WHEN OTHERS THEN
  v_error_msg := SQLERRM;
  RAISE NOTICE '❌ Layer rewards trigger failed: %', v_error_msg;
  
  RETURN json_build_object(
    'success', false,
    'error', v_error_msg,
    'upgrading_member', p_upgrading_member_wallet,
    'new_level', p_new_level
  );
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON FUNCTION trigger_layer_rewards_on_upgrade IS '触发Level 2-19升级时的Layer Reward分发，Level 1不触发';

-- Grant permissions
GRANT EXECUTE ON FUNCTION trigger_layer_rewards_on_upgrade TO service_role;
GRANT EXECUTE ON FUNCTION trigger_layer_rewards_on_upgrade TO authenticated;

-- Test the function (optional)
-- SELECT trigger_layer_rewards_on_upgrade('0xTEST123', 2, 150.00, 'layer_reward');
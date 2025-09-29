-- =============================================
-- Direct Referral Reward Function for Level 1
-- 当有人升级到Level 1时，给直接推荐人(referrer)发放direct referral reward
-- 使用matrix_layer = 0 来标识direct rewards，区别于layer rewards
-- =============================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS trigger_direct_referral_rewards(VARCHAR, INTEGER, NUMERIC);

-- Create the function
CREATE OR REPLACE FUNCTION trigger_direct_referral_rewards(
  p_upgrading_member_wallet VARCHAR(42),
  p_new_level INTEGER,
  p_nft_price NUMERIC(10,2)
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_referrer_wallet VARCHAR(42);
  v_direct_reward_amount NUMERIC(10,2);
  v_rewards_created INTEGER := 0;
  v_error_msg TEXT;
BEGIN
  RAISE NOTICE '💰 Starting direct referral reward for member: % (Level %)', 
    p_upgrading_member_wallet, p_new_level;

  -- 只有Level 1升级触发direct referral rewards
  IF p_new_level != 1 THEN
    RAISE NOTICE 'ℹ️ Direct referral rewards only triggered for Level 1 upgrades';
    RETURN json_build_object(
      'success', true,
      'message', 'Direct referral rewards only for Level 1',
      'rewards_created', 0
    );
  END IF;

  -- 找到直接推荐人
  SELECT referrer_wallet INTO v_referrer_wallet
  FROM referrals_new
  WHERE referred_wallet = p_upgrading_member_wallet
  LIMIT 1;

  IF v_referrer_wallet IS NULL THEN
    RAISE NOTICE '⚠️ No direct referrer found for member: %', p_upgrading_member_wallet;
    RETURN json_build_object(
      'success', false,
      'error', 'No direct referrer found for member',
      'member_wallet', p_upgrading_member_wallet
    );
  END IF;

  RAISE NOTICE '🎯 Found direct referrer: % for member: %', v_referrer_wallet, p_upgrading_member_wallet;

  -- 计算direct referral reward金额 (10% of NFT price)
  v_direct_reward_amount := p_nft_price * 0.10;

  -- 获取referrer的当前等级以进行验证
  DECLARE
    v_referrer_level INTEGER;
  BEGIN
    SELECT current_level INTO v_referrer_level
    FROM members
    WHERE wallet_address = v_referrer_wallet;

    -- 检查referrer是否有资格接收奖励 (必须至少是Level 1)
    IF v_referrer_level >= 1 THEN
      -- 创建direct referral reward记录 (使用matrix_layer = 0 标识)
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
        0, -- matrix_layer = 0 标识这是direct referral reward
        v_referrer_wallet, -- matrix_root_wallet存储referrer地址
        v_referrer_wallet, -- reward_recipient_wallet就是referrer
        v_direct_reward_amount,
        'claimable', -- Direct rewards可以立即领取
        p_upgrading_member_wallet,
        p_new_level,
        v_referrer_level,
        1, -- Direct rewards要求referrer至少Level 1
        NOW(),
        NULL -- Direct rewards不过期
      );

      v_rewards_created := v_rewards_created + 1;

      RAISE NOTICE '  ✅ Direct referral reward: % USDC → % (Level %)', 
        v_direct_reward_amount, v_referrer_wallet, v_referrer_level;
    ELSE
      RAISE NOTICE '  ⏸️ Direct referral reward pending: % needs Level 1 (current: %)', 
        v_referrer_wallet, v_referrer_level;
      
      -- 创建pending reward等待referrer升级到Level 1
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
        0, -- matrix_layer = 0 标识这是direct referral reward
        v_referrer_wallet,
        v_referrer_wallet,
        v_direct_reward_amount,
        'pending',
        p_upgrading_member_wallet,
        p_new_level,
        v_referrer_level,
        1,
        NOW(),
        NOW() + INTERVAL '72 hours' -- Pending direct rewards 72小时过期
      );

      v_rewards_created := v_rewards_created + 1;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '  ⚠️ Error processing direct referral reward for %: %', v_referrer_wallet, SQLERRM;
  END;

  RAISE NOTICE '✅ Direct referral rewards processing completed. Total rewards created: %', v_rewards_created;

  -- 返回结果
  RETURN json_build_object(
    'success', true,
    'upgrading_member', p_upgrading_member_wallet,
    'new_level', p_new_level,
    'nft_price', p_nft_price,
    'referrer_wallet', v_referrer_wallet,
    'direct_reward_amount', v_direct_reward_amount,
    'rewards_created', v_rewards_created,
    'message', format('Successfully created %s direct referral reward for Level %s upgrade', v_rewards_created, p_new_level)
  );

EXCEPTION WHEN OTHERS THEN
  v_error_msg := SQLERRM;
  RAISE NOTICE '❌ Direct referral rewards trigger failed: %', v_error_msg;
  
  RETURN json_build_object(
    'success', false,
    'error', v_error_msg,
    'upgrading_member', p_upgrading_member_wallet,
    'new_level', p_new_level
  );
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON FUNCTION trigger_direct_referral_rewards IS 'Level 1升级时给直接推荐人发放Direct Referral Reward (10% of NFT price)';

-- Grant permissions
GRANT EXECUTE ON FUNCTION trigger_direct_referral_rewards TO service_role;
GRANT EXECUTE ON FUNCTION trigger_direct_referral_rewards TO authenticated;

-- Test the function (optional)
-- SELECT trigger_direct_referral_rewards('0xTEST123', 1, 100.00);
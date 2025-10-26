-- 移除 updated_at 引用，因为 layer_rewards 表没有这个字段
-- 核心功能已经部署，这只是清理代码

CREATE OR REPLACE FUNCTION trigger_level_upgrade_rewards()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    nft_price NUMERIC;
    matrix_reward_result JSON;
    updated_rewards_count INTEGER := 0;
    level_num INTEGER;
BEGIN
    IF NEW.current_level > OLD.current_level THEN

        -- ✅ 自动提升符合条件的 pending 奖励为 claimable
        UPDATE layer_rewards
        SET 
            status = 'claimable',
            recipient_current_level = NEW.current_level,
            expires_at = NULL
        WHERE reward_recipient_wallet = NEW.wallet_address
          AND status = 'pending'
          AND expires_at > NOW()
          AND NEW.current_level >= recipient_required_level;
        
        GET DIAGNOSTICS updated_rewards_count = ROW_COUNT;
        
        -- 停用相关的 reward_timers
        IF updated_rewards_count > 0 THEN
            UPDATE reward_timers
            SET 
                is_active = false,
                updated_at = NOW()
            WHERE recipient_wallet = NEW.wallet_address
              AND is_active = true
              AND reward_id IN (
                  SELECT id FROM layer_rewards
                  WHERE reward_recipient_wallet = NEW.wallet_address
                    AND status = 'claimable'
              );
            
            RAISE NOTICE '✅ Auto-promoted % pending rewards to claimable for % (upgraded to Level %)',
                updated_rewards_count, NEW.wallet_address, NEW.current_level;
        END IF;

        -- 原有逻辑
        FOR level_num IN OLD.current_level + 1..NEW.current_level LOOP
            nft_price := get_nft_level_price(level_num);
            SELECT trigger_matrix_layer_rewards(
                NEW.wallet_address,
                level_num,
                nft_price
            ) INTO matrix_reward_result;

            RAISE NOTICE '📊 Level % upgrade rewards: Matrix=%, AutoPromoted=%',
                level_num,
                matrix_reward_result->>'rewards_created',
                updated_rewards_count;
        END LOOP;

        INSERT INTO audit_logs (user_wallet, action, new_values)
        VALUES (NEW.wallet_address, 'member_level_upgraded', json_build_object(
            'from_level', OLD.current_level,
            'to_level', NEW.current_level,
            'upgrade_time', NOW(),
            'matrix_rewards_triggered', true,
            'matrix_rewards_result', matrix_reward_result,
            'auto_promoted_pending_rewards', updated_rewards_count,
            'note', 'Auto-promotion enabled'
        ));
    END IF;

    RETURN NEW;
END;
$$;

-- 修复 process_expired_timers，移除 updated_at
CREATE OR REPLACE FUNCTION public.process_expired_timers()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    expired_timer RECORD;
    processed_count INTEGER := 0;
    promoted_count INTEGER := 0;
    expired_count INTEGER := 0;
BEGIN
    FOR expired_timer IN
        SELECT
            rt.id as timer_id,
            rt.reward_id,
            rt.recipient_wallet,
            rt.timer_type,
            rt.expires_at,
            lr.status as reward_status,
            lr.recipient_required_level,
            lr.reward_amount,
            m.current_level as member_current_level
        FROM reward_timers rt
        JOIN layer_rewards lr ON rt.reward_id = lr.id
        JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
        WHERE rt.is_active = true
        AND rt.expires_at < NOW()
        AND lr.status = 'pending'
        ORDER BY rt.expires_at ASC
        LIMIT 100
    LOOP
        processed_count := processed_count + 1;

        IF expired_timer.member_current_level >= expired_timer.recipient_required_level THEN
            UPDATE layer_rewards
            SET 
                status = 'claimable',
                recipient_current_level = expired_timer.member_current_level,
                expires_at = NULL
            WHERE id = expired_timer.reward_id;

            promoted_count := promoted_count + 1;
        ELSE
            UPDATE layer_rewards
            SET status = 'expired'
            WHERE id = expired_timer.reward_id;

            expired_count := expired_count + 1;

            INSERT INTO reward_rollup_history (
                original_reward_id,
                original_reward_type,
                original_recipient_wallet,
                original_amount,
                rolled_up_to_wallet,
                rollup_reason,
                original_expires_at,
                metadata
            ) VALUES (
                expired_timer.reward_id,
                'layer_reward',
                expired_timer.recipient_wallet,
                expired_timer.reward_amount,
                'expired_pending_rollup',
                'Timer expired, member did not meet level requirement',
                expired_timer.expires_at,
                json_build_object(
                    'timer_type', expired_timer.timer_type,
                    'required_level', expired_timer.recipient_required_level,
                    'member_level', expired_timer.member_current_level
                )
            );
        END IF;

        UPDATE reward_timers
        SET 
            is_active = false,
            updated_at = NOW()
        WHERE id = expired_timer.timer_id;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'processed_timers', processed_count,
        'promoted_rewards', promoted_count,
        'expired_rewards', expired_count,
        'processed_at', NOW()
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Timer processing failed: ' || SQLERRM,
        'processed_at', NOW()
    );
END;
$function$;

-- 测试一下新函数
SELECT process_expired_timers();

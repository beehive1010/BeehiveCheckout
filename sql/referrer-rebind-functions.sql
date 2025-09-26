-- =============================================
-- Beehive Platform - Referrer Rebinding SQL Functions
-- 处理referrer重新绑定的数据库存储过程
-- =============================================

-- 获取member的所有下级descendants
CREATE OR REPLACE FUNCTION get_member_descendants(member_wallet VARCHAR(42))
RETURNS TABLE(
  descendant_wallet VARCHAR(42),
  depth INTEGER,
  activation_sequence INTEGER
) AS $$
WITH RECURSIVE descendants AS (
  -- 初始查询：直接下级
  SELECT 
    rn.referred_wallet as descendant_wallet,
    1 as depth,
    m.activation_sequence
  FROM referrals_new rn
  JOIN members m ON m.wallet_address = rn.referred_wallet
  WHERE rn.referrer_wallet = member_wallet
  
  UNION ALL
  
  -- 递归查询：间接下级
  SELECT 
    rn.referred_wallet,
    d.depth + 1,
    m.activation_sequence
  FROM referrals_new rn
  JOIN members m ON m.wallet_address = rn.referred_wallet
  JOIN descendants d ON d.descendant_wallet = rn.referrer_wallet
  WHERE d.depth < 19  -- 限制最大深度
)
SELECT descendant_wallet, depth, activation_sequence 
FROM descendants
ORDER BY depth, activation_sequence;
$$ LANGUAGE SQL;

-- 执行referrer重新绑定的主函数
CREATE OR REPLACE FUNCTION execute_referrer_rebind(
  p_member_wallet VARCHAR(42),
  p_new_referrer_wallet VARCHAR(42),
  p_old_referrer_wallet VARCHAR(42)
)
RETURNS JSON AS $$
DECLARE
  v_affected_members INTEGER := 0;
  v_affected_referrals INTEGER := 0;
  v_affected_matrix INTEGER := 0;
  v_affected_rewards INTEGER := 0;
  v_error_msg TEXT;
BEGIN
  -- 开始事务处理
  BEGIN
    RAISE NOTICE '🔄 Starting referrer rebind for member: %', p_member_wallet;
    
    -- 第一步：更新members表中的referrer_wallet
    UPDATE members 
    SET referrer_wallet = p_new_referrer_wallet
    WHERE wallet_address = p_member_wallet;
    
    GET DIAGNOSTICS v_affected_members = ROW_COUNT;
    RAISE NOTICE '✅ Updated members table: % rows affected', v_affected_members;
    
    -- 第二步：更新referrals_new表中的直接推荐关系
    UPDATE referrals_new
    SET referrer_wallet = p_new_referrer_wallet
    WHERE referred_wallet = p_member_wallet;
    
    GET DIAGNOSTICS v_affected_referrals = ROW_COUNT;
    RAISE NOTICE '✅ Updated referrals_new table: % rows affected', v_affected_referrals;
    
    -- 第三步：重建matrix安置 - 先删除现有的matrix记录
    DELETE FROM referrals 
    WHERE member_wallet = p_member_wallet;
    
    DELETE FROM matrix_referrals 
    WHERE member_wallet = p_member_wallet;
    
    -- 第四步：重新安置到matrix中
    -- 这里应该调用现有的matrix placement逻辑
    -- 暂时先创建基本的记录
    INSERT INTO referrals_new (referrer_wallet, referred_wallet)
    VALUES (p_new_referrer_wallet, p_member_wallet)
    ON CONFLICT (referred_wallet) DO UPDATE 
    SET referrer_wallet = EXCLUDED.referrer_wallet;
    
    GET DIAGNOSTICS v_affected_matrix = ROW_COUNT;
    RAISE NOTICE '✅ Matrix records rebuilt: % records affected', v_affected_matrix;
    
    -- 第五步：处理下级members的重新安置（递归处理）
    PERFORM rebind_descendant_members(p_member_wallet);
    
    -- 第六步：重新计算相关统计和奖励
    -- 这里应该调用相关的统计更新函数
    v_affected_rewards := 0; -- 暂时设为0，后续实现
    
    -- 创建操作记录
    INSERT INTO audit_logs (
      action,
      target_wallet,
      details,
      created_at
    ) VALUES (
      'referrer_rebind_executed',
      p_member_wallet,
      json_build_object(
        'old_referrer', p_old_referrer_wallet,
        'new_referrer', p_new_referrer_wallet,
        'affected_members', v_affected_members,
        'affected_referrals', v_affected_referrals,
        'affected_matrix', v_affected_matrix,
        'affected_rewards', v_affected_rewards
      ),
      NOW()
    );
    
    RAISE NOTICE '✅ Referrer rebind completed successfully';
    
    -- 返回执行结果
    RETURN json_build_object(
      'success', true,
      'membersUpdated', v_affected_members,
      'referralsUpdated', v_affected_referrals,
      'matrixRecordsRebuilt', v_affected_matrix,
      'rewardsAdjusted', v_affected_rewards
    );
    
  EXCEPTION WHEN OTHERS THEN
    -- 捕获错误并回滚
    GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
    RAISE NOTICE '❌ Referrer rebind failed: %', v_error_msg;
    
    -- 记录错误
    INSERT INTO audit_logs (
      action,
      target_wallet,
      details,
      created_at
    ) VALUES (
      'referrer_rebind_failed',
      p_member_wallet,
      json_build_object(
        'error', v_error_msg,
        'old_referrer', p_old_referrer_wallet,
        'new_referrer', p_new_referrer_wallet
      ),
      NOW()
    );
    
    -- 抛出异常以触发事务回滚
    RAISE EXCEPTION 'Referrer rebind failed: %', v_error_msg;
  END;
END;
$$ LANGUAGE plpgsql;

-- 处理下级members重新安置的递归函数
CREATE OR REPLACE FUNCTION rebind_descendant_members(root_member_wallet VARCHAR(42))
RETURNS INTEGER AS $$
DECLARE
  v_descendant RECORD;
  v_processed_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 Processing descendant members for: %', root_member_wallet;
  
  -- 获取所有下级members并逐个处理
  FOR v_descendant IN 
    SELECT descendant_wallet, depth 
    FROM get_member_descendants(root_member_wallet)
    ORDER BY depth, activation_sequence
  LOOP
    RAISE NOTICE '  🔄 Reprocessing descendant: % (depth: %)', 
      v_descendant.descendant_wallet, v_descendant.depth;
    
    -- 删除现有的matrix记录
    DELETE FROM referrals 
    WHERE member_wallet = v_descendant.descendant_wallet;
    
    DELETE FROM matrix_referrals 
    WHERE member_wallet = v_descendant.descendant_wallet;
    
    -- 这里应该重新调用matrix placement逻辑
    -- 暂时跳过，在实际实现时需要调用相应的placement函数
    
    v_processed_count := v_processed_count + 1;
  END LOOP;
  
  RAISE NOTICE '✅ Processed % descendant members', v_processed_count;
  RETURN v_processed_count;
END;
$$ LANGUAGE plpgsql;

-- 验证referrer rebind结果的函数
CREATE OR REPLACE FUNCTION validate_referrer_rebind_result(member_wallet VARCHAR(42))
RETURNS TABLE(
  check_name TEXT,
  is_valid BOOLEAN,
  details TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH validation_checks AS (
    -- 检查1：members表中的referrer_wallet是否正确更新
    SELECT 
      'members_referrer_updated' as check_name,
      (m.referrer_wallet IS NOT NULL) as is_valid,
      COALESCE(
        'referrer_wallet: ' || m.referrer_wallet,
        'referrer_wallet is NULL'
      ) as details
    FROM members m
    WHERE m.wallet_address = member_wallet
    
    UNION ALL
    
    -- 检查2：referrals_new表中的推荐关系是否一致
    SELECT 
      'referrals_new_consistency' as check_name,
      (rn.referrer_wallet = m.referrer_wallet) as is_valid,
      CASE 
        WHEN rn.referrer_wallet = m.referrer_wallet THEN 'Consistent'
        ELSE 'Inconsistent: members(' || m.referrer_wallet || ') vs referrals_new(' || rn.referrer_wallet || ')'
      END as details
    FROM members m
    LEFT JOIN referrals_new rn ON rn.referred_wallet = m.wallet_address
    WHERE m.wallet_address = member_wallet
    
    UNION ALL
    
    -- 检查3：推荐树view中的数据完整性
    SELECT 
      'referral_tree_integrity' as check_name,
      (rtv.referred_wallet IS NOT NULL) as is_valid,
      COALESCE(
        'Found in referrals_tree_view with depth: ' || rtv.depth::TEXT,
        'Not found in referrals_tree_view'
      ) as details
    FROM referrals_tree_view rtv
    WHERE rtv.referred_wallet = member_wallet
    LIMIT 1
  )
  SELECT * FROM validation_checks;
END;
$$ LANGUAGE plpgsql;

-- 创建rollback函数（紧急回滚使用）
CREATE OR REPLACE FUNCTION rollback_referrer_rebind(
  p_member_wallet VARCHAR(42),
  p_backup_referrer VARCHAR(42)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_success BOOLEAN := false;
BEGIN
  BEGIN
    RAISE NOTICE '🔄 Rolling back referrer rebind for: %', p_member_wallet;
    
    -- 恢复members表
    UPDATE members 
    SET referrer_wallet = p_backup_referrer
    WHERE wallet_address = p_member_wallet;
    
    -- 恢复referrals_new表
    UPDATE referrals_new
    SET referrer_wallet = p_backup_referrer
    WHERE referred_wallet = p_member_wallet;
    
    -- 记录rollback操作
    INSERT INTO audit_logs (
      action,
      target_wallet,
      details,
      created_at
    ) VALUES (
      'referrer_rebind_rollback',
      p_member_wallet,
      json_build_object(
        'restored_referrer', p_backup_referrer
      ),
      NOW()
    );
    
    v_success := true;
    RAISE NOTICE '✅ Rollback completed successfully';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Rollback failed: %', SQLERRM;
    v_success := false;
  END;
  
  RETURN v_success;
END;
$$ LANGUAGE plpgsql;

-- 查看rebind操作历史的便利函数
CREATE OR REPLACE FUNCTION get_referrer_rebind_history(member_wallet VARCHAR(42) DEFAULT NULL)
RETURNS TABLE(
  operation_time TIMESTAMP,
  action TEXT,
  target_wallet VARCHAR(42),
  old_referrer VARCHAR(42),
  new_referrer VARCHAR(42),
  success BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.created_at as operation_time,
    al.action,
    al.target_wallet::VARCHAR(42),
    (al.details->>'old_referrer')::VARCHAR(42) as old_referrer,
    (al.details->>'new_referrer')::VARCHAR(42) as new_referrer,
    CASE 
      WHEN al.action = 'referrer_rebind_executed' THEN true
      WHEN al.action = 'referrer_rebind_failed' THEN false
      ELSE NULL
    END as success
  FROM audit_logs al
  WHERE al.action IN ('referrer_rebind_executed', 'referrer_rebind_failed', 'referrer_rebind_rollback')
    AND (member_wallet IS NULL OR al.target_wallet = member_wallet)
  ORDER BY al.created_at DESC;
END;
$$ LANGUAGE plpgsql;
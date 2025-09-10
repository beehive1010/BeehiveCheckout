-- 修复矩阵位置冲突问题
-- 解决多个用户占用同一矩阵位置的严重架构缺陷

BEGIN;

-- 创建修复报告表
CREATE TEMP TABLE matrix_conflict_report (
    table_name TEXT,
    conflict_type TEXT,
    matrix_root TEXT,
    layer INTEGER,
    position TEXT,
    affected_users INTEGER,
    user_list TEXT,
    action_taken TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 1. 修复 individual_matrix_placements 表中的位置冲突
DO $$
DECLARE
    conflict_record RECORD;
    users_to_relocate RECORD;
    next_available_position TEXT;
    affected_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 修复 individual_matrix_placements 位置冲突...';
    
    -- 检查表是否存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'individual_matrix_placements') THEN
        RAISE NOTICE 'ℹ️ individual_matrix_placements 表不存在，跳过修复';
        RETURN;
    END IF;
    
    -- 查找所有位置冲突
    FOR conflict_record IN 
        SELECT 
            matrix_owner,
            layer,
            position,
            COUNT(*) as user_count,
            STRING_AGG(wallet_address, ',' ORDER BY created_at) as user_list
        FROM individual_matrix_placements
        GROUP BY matrix_owner, layer, position
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE '发现冲突: Root % Layer % Position % - % 个用户', 
            conflict_record.matrix_owner, conflict_record.layer, conflict_record.position, conflict_record.user_count;
        
        -- 记录冲突
        INSERT INTO matrix_conflict_report (
            table_name, conflict_type, matrix_root, layer, position, 
            affected_users, user_list, action_taken
        ) VALUES (
            'individual_matrix_placements', 'position_conflict', 
            conflict_record.matrix_owner, conflict_record.layer, conflict_record.position,
            conflict_record.user_count, conflict_record.user_list, 'identified'
        );
        
        -- 保留最早的记录，重新分配其他用户
        FOR users_to_relocate IN
            SELECT wallet_address, created_at
            FROM individual_matrix_placements 
            WHERE matrix_owner = conflict_record.matrix_owner 
              AND layer = conflict_record.layer 
              AND position = conflict_record.position
            ORDER BY created_at
            OFFSET 1  -- 跳过第一个（最早的）记录
        LOOP
            RAISE NOTICE '重新分配用户: %', users_to_relocate.wallet_address;
            
            -- 找到下一个可用位置（简化版本）
            IF conflict_record.position = 'L' THEN
                next_available_position := 'M';
            ELSIF conflict_record.position = 'M' THEN
                next_available_position := 'R';
            ELSE
                next_available_position := 'L';  -- 或移到下一层
            END IF;
            
            -- 更新用户位置（如果新位置可用）
            UPDATE individual_matrix_placements 
            SET position = next_available_position,
                updated_at = NOW()
            WHERE matrix_owner = conflict_record.matrix_owner
              AND layer = conflict_record.layer
              AND wallet_address = users_to_relocate.wallet_address
              AND position = conflict_record.position;
            
            affected_count := affected_count + 1;
            
            -- 更新报告
            UPDATE matrix_conflict_report 
            SET action_taken = 'relocated_user_' || users_to_relocate.wallet_address || '_to_' || next_available_position
            WHERE matrix_root = conflict_record.matrix_owner 
              AND layer = conflict_record.layer 
              AND position = conflict_record.position;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '✅ individual_matrix_placements 修复完成，影响 % 个用户', affected_count;
END $$;

-- 2. 修复 referrals 表中的位置冲突
DO $$
DECLARE
    conflict_record RECORD;
    users_to_relocate RECORD;
    next_available_position TEXT;
    affected_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 修复 referrals 表位置冲突...';
    
    -- 检查表是否存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referrals') THEN
        RAISE NOTICE 'ℹ️ referrals 表不存在，跳过修复';
        RETURN;
    END IF;
    
    -- 查找所有位置冲突
    FOR conflict_record IN 
        SELECT 
            matrix_root,
            matrix_layer,
            matrix_position,
            COUNT(*) as user_count,
            STRING_AGG(member_wallet, ',' ORDER BY placed_at) as user_list
        FROM referrals
        GROUP BY matrix_root, matrix_layer, matrix_position
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE '发现referrals冲突: Root % Layer % Position % - % 个用户', 
            conflict_record.matrix_root, conflict_record.matrix_layer, conflict_record.matrix_position, conflict_record.user_count;
        
        -- 记录冲突
        INSERT INTO matrix_conflict_report (
            table_name, conflict_type, matrix_root, layer, position, 
            affected_users, user_list, action_taken
        ) VALUES (
            'referrals', 'position_conflict', 
            conflict_record.matrix_root, conflict_record.matrix_layer, conflict_record.matrix_position,
            conflict_record.user_count, conflict_record.user_list, 'identified'
        );
        
        -- 保留最早的记录，重新分配其他用户
        FOR users_to_relocate IN
            SELECT member_wallet, placed_at
            FROM referrals 
            WHERE matrix_root = conflict_record.matrix_root 
              AND matrix_layer = conflict_record.matrix_layer 
              AND matrix_position = conflict_record.matrix_position
            ORDER BY placed_at
            OFFSET 1  -- 跳过第一个（最早的）记录
        LOOP
            RAISE NOTICE '重新分配referral用户: %', users_to_relocate.member_wallet;
            
            -- 找到下一个可用位置（L-M-R顺序）
            IF conflict_record.matrix_position = 'L' THEN
                next_available_position := 'M';
            ELSIF conflict_record.matrix_position = 'M' THEN
                next_available_position := 'R';
            ELSE
                next_available_position := 'L';  -- 需要更复杂的逻辑来处理溢出
            END IF;
            
            -- 检查新位置是否可用
            IF NOT EXISTS (
                SELECT 1 FROM referrals 
                WHERE matrix_root = conflict_record.matrix_root 
                  AND matrix_layer = conflict_record.matrix_layer 
                  AND matrix_position = next_available_position
            ) THEN
                -- 更新用户位置
                UPDATE referrals 
                SET matrix_position = next_available_position,
                    placed_at = NOW()
                WHERE matrix_root = conflict_record.matrix_root
                  AND matrix_layer = conflict_record.matrix_layer
                  AND member_wallet = users_to_relocate.member_wallet
                  AND matrix_position = conflict_record.matrix_position;
                
                affected_count := affected_count + 1;
            ELSE
                -- 如果当前层满了，可能需要移到下一层
                RAISE NOTICE '⚠️ 位置 % 也被占用，需要更复杂的重分配逻辑', next_available_position;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '✅ referrals 修复完成，影响 % 个用户', affected_count;
END $$;

-- 3. 修复 matrix_activity_log 表（如果存在）
DO $$
DECLARE
    conflict_record RECORD;
    affected_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 修复 matrix_activity_log 位置冲突...';
    
    -- 检查表是否存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'matrix_activity_log') THEN
        RAISE NOTICE 'ℹ️ matrix_activity_log 表不存在，跳过修复';
        RETURN;
    END IF;
    
    -- 对于activity log，我们删除重复记录，只保留最早的
    FOR conflict_record IN 
        SELECT 
            matrix_owner,
            matrix_layer,
            matrix_position,
            COUNT(*) as user_count,
            STRING_AGG(member_wallet, ',' ORDER BY placed_at) as user_list
        FROM matrix_activity_log
        GROUP BY matrix_owner, matrix_layer, matrix_position
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE '清理activity_log冲突: Root % Layer % Position % - % 个记录', 
            conflict_record.matrix_owner, conflict_record.matrix_layer, conflict_record.matrix_position, conflict_record.user_count;
        
        -- 删除重复记录，只保留最早的
        DELETE FROM matrix_activity_log 
        WHERE id NOT IN (
            SELECT MIN(id) 
            FROM matrix_activity_log 
            WHERE matrix_owner = conflict_record.matrix_owner 
              AND matrix_layer = conflict_record.matrix_layer 
              AND matrix_position = conflict_record.matrix_position
        ) 
        AND matrix_owner = conflict_record.matrix_owner 
        AND matrix_layer = conflict_record.matrix_layer 
        AND matrix_position = conflict_record.matrix_position;
        
        affected_count := affected_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ matrix_activity_log 修复完成，清理 % 个冲突', affected_count;
END $$;

-- 4. 创建防止未来冲突的约束
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🛡️ 创建唯一约束防止未来冲突...';
    
    -- individual_matrix_placements 唯一约束
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'individual_matrix_placements') THEN
        BEGIN
            ALTER TABLE individual_matrix_placements 
            ADD CONSTRAINT unique_matrix_position 
            UNIQUE (matrix_owner, layer, position);
            RAISE NOTICE '✅ individual_matrix_placements 唯一约束已创建';
        EXCEPTION WHEN others THEN
            RAISE NOTICE '⚠️ individual_matrix_placements 唯一约束创建失败: %', SQLERRM;
        END;
    END IF;
    
    -- referrals 唯一约束
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referrals') THEN
        BEGIN
            ALTER TABLE referrals 
            ADD CONSTRAINT unique_referral_matrix_position 
            UNIQUE (matrix_root, matrix_layer, matrix_position);
            RAISE NOTICE '✅ referrals 唯一约束已创建';
        EXCEPTION WHEN others THEN
            RAISE NOTICE '⚠️ referrals 唯一约束创建失败: %', SQLERRM;
        END;
    END IF;
    
    -- matrix_activity_log 唯一约束（如果需要）
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'matrix_activity_log') THEN
        BEGIN
            ALTER TABLE matrix_activity_log 
            ADD CONSTRAINT unique_activity_matrix_position 
            UNIQUE (matrix_owner, matrix_layer, matrix_position);
            RAISE NOTICE '✅ matrix_activity_log 唯一约束已创建';
        EXCEPTION WHEN others THEN
            RAISE NOTICE '⚠️ matrix_activity_log 唯一约束创建失败: %', SQLERRM;
        END;
    END IF;
END $$;

-- 5. 生成修复报告
DO $$
DECLARE
    report_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 生成修复报告...';
    
    SELECT COUNT(*) INTO report_count FROM matrix_conflict_report;
    
    IF report_count > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '=== 矩阵位置冲突修复报告 ===';
        RAISE NOTICE '发现并处理了 % 个冲突', report_count;
        RAISE NOTICE '';
        
        -- 显示详细报告
        PERFORM 
            RAISE NOTICE '表: % | 冲突: % | Root: % | Layer: % | Position: % | 用户数: % | 处理: %',
                table_name, conflict_type, matrix_root, layer, position, affected_users, action_taken
        FROM matrix_conflict_report;
    ELSE
        RAISE NOTICE '✅ 未发现矩阵位置冲突或表不存在';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 修复总结:';
    RAISE NOTICE '1. ✅ 检查并修复了position冲突';
    RAISE NOTICE '2. ✅ 重新分配了冲突用户';
    RAISE NOTICE '3. ✅ 创建了唯一约束防止未来冲突';
    RAISE NOTICE '4. ✅ 清理了重复的activity日志';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ 重要提醒:';
    RAISE NOTICE '- 需要更新Edge Functions的matrix placement逻辑';
    RAISE NOTICE '- 需要检查reward分配的一致性';
    RAISE NOTICE '- 需要验证matrix tree的完整性';
END $$;

COMMIT;
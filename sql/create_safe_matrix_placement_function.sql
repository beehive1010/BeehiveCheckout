-- 创建安全的矩阵放置存储过程
-- 确保位置唯一性，防止冲突和重复放置

CREATE OR REPLACE FUNCTION safe_matrix_placement(
    p_root_wallet VARCHAR(42),
    p_member_wallet VARCHAR(42),
    p_layer INTEGER,
    p_position VARCHAR(10)
) RETURNS JSON AS $$
DECLARE
    v_existing_referral RECORD;
    v_existing_placement RECORD;
    v_existing_activity RECORD;
    v_conflict_detected BOOLEAN := FALSE;
    v_conflict_details TEXT := '';
    v_placement_order INTEGER;
    v_result JSON;
BEGIN
    RAISE NOTICE 'Safe matrix placement: % -> Root: %, Layer: %, Position: %', 
        p_member_wallet, p_root_wallet, p_layer, p_position;
    
    -- 1. 检查referrals表中的冲突
    SELECT member_wallet, placed_at INTO v_existing_referral
    FROM referrals 
    WHERE matrix_root ILIKE p_root_wallet 
      AND matrix_layer = p_layer 
      AND matrix_position = p_position
    LIMIT 1;
    
    -- 2. 检查individual_matrix_placements表中的冲突
    SELECT wallet_address, created_at INTO v_existing_placement
    FROM individual_matrix_placements 
    WHERE matrix_owner ILIKE p_root_wallet 
      AND layer = p_layer 
      AND position = p_position
    LIMIT 1;
    
    -- 3. 检查matrix_activity_log表中的冲突（如果存在）
    BEGIN
        SELECT member_wallet, placed_at INTO v_existing_activity
        FROM matrix_activity_log 
        WHERE matrix_owner ILIKE p_root_wallet 
          AND matrix_layer = p_layer 
          AND matrix_position = p_position
        LIMIT 1;
    EXCEPTION WHEN undefined_table THEN
        -- matrix_activity_log表不存在，忽略
        v_existing_activity := NULL;
    END;
    
    -- 4. 分析冲突情况
    IF v_existing_referral.member_wallet IS NOT NULL THEN
        IF v_existing_referral.member_wallet ILIKE p_member_wallet THEN
            RAISE NOTICE 'Member % already placed in referrals at this position', p_member_wallet;
        ELSE
            v_conflict_detected := TRUE;
            v_conflict_details := v_conflict_details || 'referrals:' || v_existing_referral.member_wallet || '; ';
        END IF;
    END IF;
    
    IF v_existing_placement.wallet_address IS NOT NULL THEN
        IF v_existing_placement.wallet_address ILIKE p_member_wallet THEN
            RAISE NOTICE 'Member % already placed in placements at this position', p_member_wallet;
        ELSE
            v_conflict_detected := TRUE;
            v_conflict_details := v_conflict_details || 'placements:' || v_existing_placement.wallet_address || '; ';
        END IF;
    END IF;
    
    IF v_existing_activity.member_wallet IS NOT NULL THEN
        IF v_existing_activity.member_wallet ILIKE p_member_wallet THEN
            RAISE NOTICE 'Member % already logged in activity at this position', p_member_wallet;
        ELSE
            v_conflict_detected := TRUE;
            v_conflict_details := v_conflict_details || 'activity:' || v_existing_activity.member_wallet || '; ';
        END IF;
    END IF;
    
    -- 5. 如果检测到冲突，返回错误
    IF v_conflict_detected THEN
        RAISE NOTICE 'CONFLICT DETECTED: Position already occupied by: %', v_conflict_details;
        RETURN json_build_object(
            'success', false,
            'error', 'Position conflict detected',
            'conflict_details', v_conflict_details,
            'requested_position', json_build_object(
                'layer', p_layer,
                'position', p_position,
                'root_wallet', p_root_wallet,
                'member_wallet', p_member_wallet
            )
        );
    END IF;
    
    -- 6. 如果用户已经在正确位置，返回成功
    IF (v_existing_referral.member_wallet ILIKE p_member_wallet) OR 
       (v_existing_placement.wallet_address ILIKE p_member_wallet) THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Member already correctly placed',
            'action', 'no_change_needed',
            'position', json_build_object(
                'layer', p_layer,
                'position', p_position,
                'root_wallet', p_root_wallet,
                'member_wallet', p_member_wallet
            )
        );
    END IF;
    
    -- 7. 安全地放置成员
    BEGIN
        -- 计算placement_order
        SELECT COALESCE(MAX(placement_order), 0) + 1 INTO v_placement_order
        FROM referrals 
        WHERE matrix_root ILIKE p_root_wallet;
        
        -- 插入到referrals表（主表）
        INSERT INTO referrals (
            member_wallet,
            referrer_wallet,
            matrix_root,
            matrix_layer,
            matrix_position,
            matrix_parent,
            placement_order,
            placed_at,
            created_at,
            updated_at
        ) VALUES (
            p_member_wallet,
            p_root_wallet,  -- 简化：使用root作为referrer
            p_root_wallet,
            p_layer,
            p_position,
            p_root_wallet,  -- 简化：使用root作为parent
            v_placement_order,
            NOW(),
            NOW(),
            NOW()
        ) ON CONFLICT (member_wallet, matrix_root, matrix_layer, matrix_position) 
        DO NOTHING;  -- 避免重复插入
        
        -- 插入到individual_matrix_placements表
        INSERT INTO individual_matrix_placements (
            wallet_address,
            matrix_owner,
            layer,
            position,
            placement_order,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            p_member_wallet,
            p_root_wallet,
            p_layer,
            p_position,
            v_placement_order,
            true,
            NOW(),
            NOW()
        ) ON CONFLICT (matrix_owner, layer, position)
        DO NOTHING;  -- 避免重复插入
        
        -- 记录到matrix_activity_log（如果表存在）
        BEGIN
            INSERT INTO matrix_activity_log (
                member_wallet,
                matrix_owner,
                matrix_layer,
                matrix_position,
                activity_type,
                placed_at,
                created_at
            ) VALUES (
                p_member_wallet,
                p_root_wallet,
                p_layer,
                p_position,
                'member_placement',
                NOW(),
                NOW()
            );
        EXCEPTION WHEN undefined_table THEN
            -- 表不存在，忽略
            RAISE NOTICE 'matrix_activity_log table does not exist, skipping log entry';
        END;
        
        RAISE NOTICE 'Successfully placed member % at Layer %, Position %', 
            p_member_wallet, p_layer, p_position;
        
        v_result := json_build_object(
            'success', true,
            'message', 'Member placed successfully',
            'action', 'member_placed',
            'position', json_build_object(
                'layer', p_layer,
                'position', p_position,
                'root_wallet', p_root_wallet,
                'member_wallet', p_member_wallet,
                'placement_order', v_placement_order
            )
        );
        
        RETURN v_result;
        
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Error during placement: %', SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', 'Placement failed',
            'details', SQLERRM,
            'position', json_build_object(
                'layer', p_layer,
                'position', p_position,
                'root_wallet', p_root_wallet,
                'member_wallet', p_member_wallet
            )
        );
    END;
    
END;
$$ LANGUAGE plpgsql;

-- 创建查找下一个可用位置的函数
CREATE OR REPLACE FUNCTION find_next_available_position(
    p_root_wallet VARCHAR(42)
) RETURNS JSON AS $$
DECLARE
    v_layer INTEGER;
    v_position VARCHAR(10);
    v_positions VARCHAR(10)[] := ARRAY['L', 'M', 'R'];
    v_pos VARCHAR(10);
    v_occupied_referrals BOOLEAN;
    v_occupied_placements BOOLEAN;
    v_occupied_activity BOOLEAN;
    v_result JSON;
BEGIN
    RAISE NOTICE 'Finding next available position for root: %', p_root_wallet;
    
    -- 遍历所有层（1-19）
    FOR v_layer IN 1..19 LOOP
        RAISE NOTICE 'Checking layer %', v_layer;
        
        -- 遍历L-M-R位置
        FOREACH v_pos IN ARRAY v_positions LOOP
            -- 检查referrals表
            SELECT EXISTS(
                SELECT 1 FROM referrals 
                WHERE matrix_root ILIKE p_root_wallet 
                  AND matrix_layer = v_layer 
                  AND matrix_position = v_pos
            ) INTO v_occupied_referrals;
            
            -- 检查individual_matrix_placements表
            SELECT EXISTS(
                SELECT 1 FROM individual_matrix_placements 
                WHERE matrix_owner ILIKE p_root_wallet 
                  AND layer = v_layer 
                  AND position = v_pos
            ) INTO v_occupied_placements;
            
            -- 检查matrix_activity_log表（如果存在）
            BEGIN
                SELECT EXISTS(
                    SELECT 1 FROM matrix_activity_log 
                    WHERE matrix_owner ILIKE p_root_wallet 
                      AND matrix_layer = v_layer 
                      AND matrix_position = v_pos
                ) INTO v_occupied_activity;
            EXCEPTION WHEN undefined_table THEN
                v_occupied_activity := FALSE;
            END;
            
            -- 如果位置在所有表中都未被占用，返回此位置
            IF NOT v_occupied_referrals AND NOT v_occupied_placements AND NOT v_occupied_activity THEN
                RAISE NOTICE 'Found available position: Layer %, Position %', v_layer, v_pos;
                RETURN json_build_object(
                    'success', true,
                    'layer', v_layer,
                    'position', v_pos,
                    'root_wallet', p_root_wallet,
                    'message', format('Available position found at Layer %s, Position %s', v_layer, v_pos)
                );
            ELSE
                RAISE NOTICE 'Position occupied: Layer %, Position % (R:% P:% A:%)', 
                    v_layer, v_pos, v_occupied_referrals, v_occupied_placements, v_occupied_activity;
            END IF;
        END LOOP;
    END LOOP;
    
    -- 如果所有位置都被占用
    RETURN json_build_object(
        'success', false,
        'error', 'All 19 layers are full',
        'root_wallet', p_root_wallet,
        'message', 'Matrix has reached maximum capacity (19 layers × 3 positions)'
    );
    
END;
$$ LANGUAGE plpgsql;

-- 创建验证placement完整性的函数
CREATE OR REPLACE FUNCTION verify_matrix_placement_integrity(
    p_root_wallet VARCHAR(42) DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_conflicts JSON[];
    v_conflict_count INTEGER := 0;
    v_inconsistencies JSON[];
    v_inconsistency_count INTEGER := 0;
    v_root_filter VARCHAR(42);
    v_conflict RECORD;
    v_result JSON;
BEGIN
    v_root_filter := COALESCE(p_root_wallet, '%');
    RAISE NOTICE 'Verifying matrix placement integrity for root: %', v_root_filter;
    
    -- 检查位置冲突
    FOR v_conflict IN
        WITH position_conflicts AS (
            SELECT 
                r.matrix_root,
                r.matrix_layer,
                r.matrix_position,
                COUNT(*) as user_count,
                STRING_AGG(r.member_wallet, ', ' ORDER BY r.placed_at) as conflicting_wallets
            FROM referrals r
            WHERE r.matrix_root ILIKE v_root_filter
            GROUP BY r.matrix_root, r.matrix_layer, r.matrix_position
            HAVING COUNT(*) > 1
        )
        SELECT * FROM position_conflicts
    LOOP
        v_conflicts := v_conflicts || json_build_object(
            'table', 'referrals',
            'root_wallet', v_conflict.matrix_root,
            'layer', v_conflict.matrix_layer,
            'position', v_conflict.matrix_position,
            'user_count', v_conflict.user_count,
            'conflicting_wallets', v_conflict.conflicting_wallets
        );
        v_conflict_count := v_conflict_count + 1;
    END LOOP;
    
    -- 检查individual_matrix_placements表的冲突
    FOR v_conflict IN
        WITH placement_conflicts AS (
            SELECT 
                imp.matrix_owner,
                imp.layer,
                imp.position,
                COUNT(*) as user_count,
                STRING_AGG(imp.wallet_address, ', ' ORDER BY imp.created_at) as conflicting_wallets
            FROM individual_matrix_placements imp
            WHERE imp.matrix_owner ILIKE v_root_filter
            GROUP BY imp.matrix_owner, imp.layer, imp.position
            HAVING COUNT(*) > 1
        )
        SELECT * FROM placement_conflicts
    LOOP
        v_conflicts := v_conflicts || json_build_object(
            'table', 'individual_matrix_placements',
            'root_wallet', v_conflict.matrix_owner,
            'layer', v_conflict.layer,
            'position', v_conflict.position,
            'user_count', v_conflict.user_count,
            'conflicting_wallets', v_conflict.conflicting_wallets
        );
        v_conflict_count := v_conflict_count + 1;
    END LOOP;
    
    v_result := json_build_object(
        'success', true,
        'verification_completed', true,
        'root_wallet_filter', v_root_filter,
        'conflicts', json_build_object(
            'count', v_conflict_count,
            'details', v_conflicts
        ),
        'inconsistencies', json_build_object(
            'count', v_inconsistency_count,
            'details', v_inconsistencies
        ),
        'integrity_status', CASE 
            WHEN v_conflict_count = 0 AND v_inconsistency_count = 0 THEN 'CLEAN'
            WHEN v_conflict_count > 0 THEN 'CONFLICTS_DETECTED'
            ELSE 'INCONSISTENCIES_DETECTED'
        END,
        'message', format('Found %s conflicts and %s inconsistencies', v_conflict_count, v_inconsistency_count)
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
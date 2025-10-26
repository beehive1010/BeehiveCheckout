-- ====================================================================
-- 修复后的Branch-First BFS矩阵占位函数
-- ====================================================================
-- 核心修复：实现真正的Branch-First BFS算法
-- 先填所有parent的L，再填所有M，最后填所有R
-- ====================================================================

CREATE OR REPLACE FUNCTION public.fn_place_member_branch_bfs_fixed(
    p_member_wallet VARCHAR(42),
    p_referrer_wallet VARCHAR(42),
    p_activation_time TIMESTAMP DEFAULT NOW(),
    p_tx_hash VARCHAR(66) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_matrix_root VARCHAR(42);
    v_entry_node VARCHAR(42);
    v_parent_wallet VARCHAR(42);
    v_slot VARCHAR(1);
    v_layer INTEGER;
    v_referral_type VARCHAR(20);
    v_result JSONB;
    v_max_depth INTEGER := 19;

    -- Branch-First计算变量
    v_target_layer INTEGER;
    v_parent_count INTEGER;
    v_current_layer_count INTEGER;
    v_layer_fill_seq INTEGER;
    v_parent_index INTEGER;
BEGIN
    -- 检查是否已存在（幂等性）
    IF EXISTS (
        SELECT 1 FROM matrix_referrals
        WHERE member_wallet = p_member_wallet
        AND matrix_root_wallet = p_referrer_wallet
    ) THEN
        SELECT jsonb_build_object(
            'success', true,
            'message', 'Member already placed (idempotent)',
            'parent_wallet', parent_wallet,
            'slot', slot,
            'layer', layer,
            'already_placed', true
        )
        INTO v_result
        FROM matrix_referrals
        WHERE member_wallet = p_member_wallet
        AND matrix_root_wallet = p_referrer_wallet;

        RETURN v_result;
    END IF;

    -- Step 1: 确定matrix_root
    v_matrix_root := p_referrer_wallet;

    -- Step 2: 确定entry node和目标层级
    -- 如果referrer是matrix_root，从Layer 1开始
    -- 否则，从referrer所在层的下一层开始
    IF p_referrer_wallet = v_matrix_root THEN
        v_entry_node := v_matrix_root;
        v_target_layer := 1;
    ELSE
        -- 检查referrer是否已在矩阵中
        SELECT layer INTO v_target_layer
        FROM matrix_referrals
        WHERE member_wallet = p_referrer_wallet
        AND matrix_root_wallet = v_matrix_root;

        IF v_target_layer IS NULL THEN
            -- Referrer还未被放置，需要先递归放置referrer
            v_result := fn_place_member_branch_bfs_fixed(
                p_referrer_wallet,
                v_matrix_root,
                p_activation_time - INTERVAL '1 second',
                p_tx_hash
            );

            IF NOT (v_result->>'success')::BOOLEAN THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'message', 'Failed to place referrer first',
                    'error', v_result
                );
            END IF;

            -- 重新获取referrer的层级
            SELECT layer INTO v_target_layer
            FROM matrix_referrals
            WHERE member_wallet = p_referrer_wallet
            AND matrix_root_wallet = v_matrix_root;
        END IF;

        v_entry_node := p_referrer_wallet;
        v_target_layer := v_target_layer + 1; -- 进入下一层
    END IF;

    -- Step 3: 使用Branch-First算法查找占位
    -- 从目标层开始，逐层向下查找可用位置
    <<layer_loop>>
    WHILE v_target_layer <= v_max_depth LOOP
        -- 计算该层的parent数量（上一层的成员数）
        SELECT COUNT(*)
        INTO v_parent_count
        FROM matrix_referrals
        WHERE matrix_root_wallet = v_matrix_root
        AND layer = v_target_layer - 1;

        -- Layer 1特殊处理：parent就是root自己
        IF v_target_layer = 1 THEN
            v_parent_count := 1;
        END IF;

        -- 如果上一层没有parent，无法填充当前层
        IF v_parent_count = 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'No parents available in layer ' || (v_target_layer - 1),
                'layer', v_target_layer
            );
        END IF;

        -- 计算当前层已有多少成员
        SELECT COUNT(*)
        INTO v_current_layer_count
        FROM matrix_referrals
        WHERE matrix_root_wallet = v_matrix_root
        AND layer = v_target_layer;

        -- 当前层的填充序号（这是当前要加入的成员的序号）
        v_layer_fill_seq := v_current_layer_count + 1;

        -- 检查当前层是否还有空位（每层最多3 * parent_count个位置）
        IF v_layer_fill_seq > v_parent_count * 3 THEN
            -- 当前层已满，进入下一层
            v_target_layer := v_target_layer + 1;
            CONTINUE layer_loop;
        END IF;

        -- Branch-First算法：根据填充序号计算slot和parent_index
        IF v_layer_fill_seq <= v_parent_count THEN
            -- L阶段：第1到parent_count个成员
            v_slot := 'L';
            v_parent_index := v_layer_fill_seq;
        ELSIF v_layer_fill_seq <= v_parent_count * 2 THEN
            -- M阶段：第parent_count+1到parent_count*2个成员
            v_slot := 'M';
            v_parent_index := v_layer_fill_seq - v_parent_count;
        ELSE
            -- R阶段：第parent_count*2+1到parent_count*3个成员
            v_slot := 'R';
            v_parent_index := v_layer_fill_seq - v_parent_count * 2;
        END IF;

        -- 获取对应序号的parent wallet
        IF v_target_layer = 1 THEN
            -- Layer 1的parent就是matrix_root
            v_parent_wallet := v_matrix_root;
        ELSE
            -- 从上一层获取第parent_index个成员（按activation_sequence排序）
            SELECT mr.member_wallet
            INTO v_parent_wallet
            FROM matrix_referrals mr
            INNER JOIN members m ON m.wallet_address = mr.member_wallet
            WHERE mr.matrix_root_wallet = v_matrix_root
            AND mr.layer = v_target_layer - 1
            ORDER BY m.activation_sequence
            LIMIT 1 OFFSET (v_parent_index - 1);
        END IF;

        -- 验证是否找到parent
        IF v_parent_wallet IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Parent not found at index ' || v_parent_index || ' in layer ' || (v_target_layer - 1)
            );
        END IF;

        -- 双重检查：确保该位置未被占用
        IF EXISTS (
            SELECT 1 FROM matrix_referrals
            WHERE matrix_root_wallet = v_matrix_root
            AND parent_wallet = v_parent_wallet
            AND slot = v_slot
        ) THEN
            -- 位置已被占用，这不应该发生（可能是并发冲突）
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Slot conflict detected (concurrent insertion)',
                'parent_wallet', v_parent_wallet,
                'slot', v_slot,
                'layer', v_target_layer
            );
        END IF;

        -- 找到可用位置，跳出循环
        v_layer := v_target_layer;
        EXIT layer_loop;
    END LOOP;

    -- Step 4: 验证结果
    IF v_parent_wallet IS NULL OR v_slot IS NULL OR v_layer IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No available slot found (matrix full or depth limit reached)',
            'max_depth', v_max_depth
        );
    END IF;

    -- 确定referral_type
    v_referral_type := CASE
        WHEN v_parent_wallet = v_matrix_root AND v_layer = 1 THEN 'direct'
        ELSE 'spillover'
    END;

    -- Step 5: 插入记录
    BEGIN
        INSERT INTO matrix_referrals (
            matrix_root_wallet,
            member_wallet,
            parent_wallet,
            layer,
            slot,
            referral_type,
            activation_time,
            tx_hash,
            entry_anchor,
            source,
            created_at
        )
        VALUES (
            v_matrix_root,
            p_member_wallet,
            v_parent_wallet,
            v_layer,
            v_slot,
            v_referral_type,
            p_activation_time,
            p_tx_hash,
            v_entry_node,
            'branch_bfs_fixed',
            NOW()
        );

        -- 记录成功日志
        INSERT INTO matrix_placement_events (
            event_type,
            member_wallet,
            matrix_root_wallet,
            entry_anchor,
            parent_wallet,
            slot,
            layer,
            referral_type,
            activation_time,
            tx_hash
        )
        VALUES (
            'placement_success',
            p_member_wallet,
            v_matrix_root,
            v_entry_node,
            v_parent_wallet,
            v_slot,
            v_layer,
            v_referral_type,
            p_activation_time,
            p_tx_hash
        );

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Member placed successfully using Branch-First BFS',
            'matrix_root', v_matrix_root,
            'parent_wallet', v_parent_wallet,
            'slot', v_slot,
            'layer', v_layer,
            'referral_type', v_referral_type,
            'entry_anchor', v_entry_node
        );

    EXCEPTION
        WHEN unique_violation THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Concurrent placement conflict (retry)',
                'error', SQLERRM
            );
    END;
END;
$$;

-- 添加注释
COMMENT ON FUNCTION fn_place_member_branch_bfs_fixed IS '
修复后的Branch-First BFS矩阵占位函数
核心算法：
1. 每层的parent数量 = 上一层的成员数量
2. 当前成员的layer_fill_seq = 当前层已有成员数 + 1
3. Branch-First规则：
   - 如果 layer_fill_seq <= parent_count：slot = L, parent_index = layer_fill_seq
   - 如果 parent_count < layer_fill_seq <= parent_count * 2：slot = M, parent_index = layer_fill_seq - parent_count
   - 如果 parent_count * 2 < layer_fill_seq <= parent_count * 3：slot = R, parent_index = layer_fill_seq - parent_count * 2
4. parent_index对应的parent = 上一层中按activation_sequence排序的第parent_index个成员

示例：
如果Layer 1有3个parent（A, B, C按激活顺序），Layer 2的填充顺序为：
seq=1 → L slot, parent_index=1 → A的L
seq=2 → L slot, parent_index=2 → B的L
seq=3 → L slot, parent_index=3 → C的L
seq=4 → M slot, parent_index=1 → A的M
seq=5 → M slot, parent_index=2 → B的M
seq=6 → M slot, parent_index=3 → C的M
seq=7 → R slot, parent_index=1 → A的R
seq=8 → R slot, parent_index=2 → B的R
seq=9 → R slot, parent_index=3 → C的R
';

-- ====================================================================
-- 测试Branch-First BFS函数：创建20个随机占位
-- ====================================================================

BEGIN;

-- 创建测试用的matrix_root（如果不存在）
DO $$
BEGIN
    -- 创建test_root用户（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'test_branch_bfs_root') THEN
        INSERT INTO users (wallet_address, username, created_at)
        VALUES ('0xTEST_BFS_ROOT_000000000000000000000000', 'test_branch_bfs_root', NOW());
    END IF;

    -- 创建test_root会员（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM members WHERE wallet_address = '0xTEST_BFS_ROOT_000000000000000000000000') THEN
        INSERT INTO members (wallet_address, referrer_wallet, activation_time, activation_sequence, current_level)
        VALUES (
            '0xTEST_BFS_ROOT_000000000000000000000000',
            NULL,
            NOW() - INTERVAL '1 hour',
            (SELECT COALESCE(MAX(activation_sequence), 0) + 1 FROM members),
            1
        );
    END IF;
END $$;

-- 清理之前的测试数据
DELETE FROM matrix_referrals WHERE matrix_root_wallet = '0xTEST_BFS_ROOT_000000000000000000000000';
DELETE FROM members WHERE wallet_address LIKE '0xTEST_BFS_MEMBER_%';
DELETE FROM users WHERE username LIKE 'test_bfs_member_%';

SELECT '=== 开始创建20个测试会员并使用Branch-First BFS占位 ===' AS status;

-- 创建20个测试会员
DO $$
DECLARE
    v_i INTEGER;
    v_member_wallet VARCHAR(42);
    v_member_username VARCHAR(50);
    v_activation_seq INTEGER;
    v_result JSONB;
    v_referrer VARCHAR(42) := '0xTEST_BFS_ROOT_000000000000000000000000';
BEGIN
    -- 获取当前最大activation_sequence
    SELECT COALESCE(MAX(activation_sequence), 0) INTO v_activation_seq FROM members;

    FOR v_i IN 1..20 LOOP
        v_activation_seq := v_activation_seq + 1;
        v_member_wallet := '0xTEST_BFS_MEMBER_' || LPAD(v_i::TEXT, 20, '0');
        v_member_username := 'test_bfs_member_' || v_i;

        -- 创建用户
        INSERT INTO users (wallet_address, username, created_at)
        VALUES (v_member_wallet, v_member_username, NOW())
        ON CONFLICT (wallet_address) DO NOTHING;

        -- 创建会员
        INSERT INTO members (
            wallet_address,
            referrer_wallet,
            activation_time,
            activation_sequence,
            current_level
        )
        VALUES (
            v_member_wallet,
            v_referrer,
            NOW() + (v_i || ' seconds')::INTERVAL,
            v_activation_seq,
            1
        )
        ON CONFLICT (wallet_address) DO NOTHING;

        -- 使用修复后的函数进行占位
        v_result := fn_place_member_branch_bfs(
            v_member_wallet,
            v_referrer,
            (NOW() + (v_i || ' seconds')::INTERVAL)::TIMESTAMP,
            'test_tx_' || v_i
        );

        -- 检查结果
        IF NOT (v_result->>'success')::BOOLEAN THEN
            RAISE NOTICE 'Member % placement failed: %', v_i, v_result->>'message';
        ELSE
            RAISE NOTICE 'Member % placed: Layer %, Parent %, Slot %',
                v_i,
                v_result->>'layer',
                SUBSTRING(v_result->>'parent_wallet' FROM 1 FOR 20),
                v_result->>'slot';
        END IF;
    END LOOP;

    RAISE NOTICE '=== 完成20个会员占位 ===';
END $$;

-- 查看占位结果
SELECT
    '=== 占位结果总览 ===' AS title;

SELECT
    mr.layer,
    COUNT(*) AS member_count,
    COUNT(CASE WHEN mr.slot = 'L' THEN 1 END) AS L_count,
    COUNT(CASE WHEN mr.slot = 'M' THEN 1 END) AS M_count,
    COUNT(CASE WHEN mr.slot = 'R' THEN 1 END) AS R_count
FROM matrix_referrals mr
WHERE mr.matrix_root_wallet = '0xTEST_BFS_ROOT_000000000000000000000000'
GROUP BY mr.layer
ORDER BY mr.layer;

-- 详细查看每个member的占位
SELECT
    '=== 详细占位列表 ===' AS title;

SELECT
    ROW_NUMBER() OVER (ORDER BY m.activation_sequence) AS seq,
    mr.layer,
    mr.slot,
    SUBSTRING(mr.parent_wallet FROM 1 FOR 25) || '...' AS parent,
    u.username AS member,
    m.activation_sequence,
    CASE
        -- Layer 1验证: 前3个应该在Layer 1的L/M/R
        WHEN m.activation_sequence <= (SELECT MIN(activation_sequence) + 2 FROM members WHERE wallet_address LIKE '0xTEST_BFS_MEMBER_%')
             AND mr.layer = 1 THEN '✓ Layer 1'
        -- Layer 2验证: Branch-First规则
        WHEN mr.layer = 2 THEN
            CASE
                -- 第4-6个成员应该在各parent的L slot
                WHEN ROW_NUMBER() OVER (ORDER BY m.activation_sequence) BETWEEN 4 AND 6 AND mr.slot = 'L' THEN '✓ L (Branch-First)'
                -- 第7-9个成员应该在各parent的M slot
                WHEN ROW_NUMBER() OVER (ORDER BY m.activation_sequence) BETWEEN 7 AND 9 AND mr.slot = 'M' THEN '✓ M (Branch-First)'
                -- 第10-12个成员应该在各parent的R slot
                WHEN ROW_NUMBER() OVER (ORDER BY m.activation_sequence) BETWEEN 10 AND 12 AND mr.slot = 'R' THEN '✓ R (Branch-First)'
                ELSE '? Layer 2'
            END
        -- Layer 3验证
        WHEN mr.layer = 3 THEN
            CASE
                -- 第13-21个成员应该在Layer 3，前9个在L slots
                WHEN ROW_NUMBER() OVER (ORDER BY m.activation_sequence) BETWEEN 13 AND 21 AND mr.slot = 'L' THEN '✓ L (Branch-First)'
                ELSE '? Layer 3'
            END
        ELSE ''
    END AS correctness
FROM matrix_referrals mr
INNER JOIN members m ON m.wallet_address = mr.member_wallet
LEFT JOIN users u ON u.wallet_address = mr.member_wallet
WHERE mr.matrix_root_wallet = '0xTEST_BFS_ROOT_000000000000000000000000'
ORDER BY m.activation_sequence;

-- 验证Branch-First规则
SELECT
    '=== Branch-First规则验证 ===' AS title;

WITH test_data AS (
    SELECT
        mr.layer,
        mr.member_wallet,
        mr.parent_wallet,
        mr.slot,
        m.activation_sequence,
        ROW_NUMBER() OVER (PARTITION BY mr.layer ORDER BY m.activation_sequence) AS layer_fill_seq
    FROM matrix_referrals mr
    INNER JOIN members m ON m.wallet_address = mr.member_wallet
    WHERE mr.matrix_root_wallet = '0xTEST_BFS_ROOT_000000000000000000000000'
    AND mr.layer >= 2
),
parent_counts AS (
    SELECT
        mr.layer + 1 as child_layer,
        COUNT(*) as parent_count
    FROM matrix_referrals mr
    WHERE mr.matrix_root_wallet = '0xTEST_BFS_ROOT_000000000000000000000000'
    GROUP BY mr.layer
),
validations AS (
    SELECT
        td.layer,
        td.layer_fill_seq,
        td.slot AS actual_slot,
        pc.parent_count,
        CASE
            WHEN td.layer_fill_seq <= pc.parent_count THEN 'L'
            WHEN td.layer_fill_seq <= pc.parent_count * 2 THEN 'M'
            ELSE 'R'
        END AS expected_slot
    FROM test_data td
    INNER JOIN parent_counts pc ON pc.child_layer = td.layer
)
SELECT
    COUNT(*) AS total_layer2_plus_members,
    SUM(CASE WHEN actual_slot = expected_slot THEN 1 ELSE 0 END) AS correct_placements,
    SUM(CASE WHEN actual_slot != expected_slot THEN 1 ELSE 0 END) AS violations,
    CASE
        WHEN SUM(CASE WHEN actual_slot != expected_slot THEN 1 ELSE 0 END) = 0 THEN '✓ 所有占位正确！'
        ELSE '✗ 发现违规！'
    END AS result
FROM validations;

-- 如果有违规，显示详情
SELECT
    '=== 违规详情（如果有）===' AS title;

WITH test_data AS (
    SELECT
        mr.layer,
        mr.member_wallet,
        mr.slot,
        m.activation_sequence,
        ROW_NUMBER() OVER (PARTITION BY mr.layer ORDER BY m.activation_sequence) AS layer_fill_seq
    FROM matrix_referrals mr
    INNER JOIN members m ON m.wallet_address = mr.member_wallet
    WHERE mr.matrix_root_wallet = '0xTEST_BFS_ROOT_000000000000000000000000'
    AND mr.layer >= 2
),
parent_counts AS (
    SELECT
        mr.layer + 1 as child_layer,
        COUNT(*) as parent_count
    FROM matrix_referrals mr
    WHERE mr.matrix_root_wallet = '0xTEST_BFS_ROOT_000000000000000000000000'
    GROUP BY mr.layer
)
SELECT
    td.layer,
    td.layer_fill_seq,
    td.slot AS actual_slot,
    CASE
        WHEN td.layer_fill_seq <= pc.parent_count THEN 'L'
        WHEN td.layer_fill_seq <= pc.parent_count * 2 THEN 'M'
        ELSE 'R'
    END AS expected_slot,
    '违规' AS issue
FROM test_data td
INNER JOIN parent_counts pc ON pc.child_layer = td.layer
WHERE td.slot != CASE
    WHEN td.layer_fill_seq <= pc.parent_count THEN 'L'
    WHEN td.layer_fill_seq <= pc.parent_count * 2 THEN 'M'
    ELSE 'R'
END;

ROLLBACK;  -- 测试完成后回滚，不保留测试数据

SELECT '=== 测试完成（已回滚）===' AS final_status;

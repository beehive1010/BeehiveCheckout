-- 同步数据和测试矩阵系统
-- Sync data and test matrix system

BEGIN;

-- ===== 第1步：检查当前激活会员状态 =====
-- Step 1: Check current activated member status

SELECT 'Current System Status:' as status_header;

-- 检查激活会员数量
SELECT 
    'Total Activated Members' as metric,
    COUNT(*) as count
FROM membership 
WHERE activated_at IS NOT NULL AND nft_level = 1;

-- 检查members表中的数据
SELECT 
    'Members Table Count' as metric,
    COUNT(*) as c@@@ount
FROM members;

-- 检查referrals表中的矩阵数据
SELECT 
    'Matrix Placements Count' as metric,
    COUNT(*) as count
FROM referrals WHERE is_active = TRUE;

-- ===== 第2步：同步激活会员到矩阵系统 =====
-- Step 2: Sync activated members to matrix system

-- 为所有已激活但未在矩阵中的会员进行矩阵安置
CREATE OR REPLACE FUNCTION sync_activated_members_to_matrix()
RETURNS TABLE(
    wallet_address VARCHAR(42),
    sync_result TEXT,
    placement_info JSONB
) AS $$
DECLARE
    member_record RECORD;
    placement_result RECORD;
    sync_count INTEGER := 0;
BEGIN
    -- 找到所有已激活但未在矩阵中的会员
    FOR member_record IN 
        SELECT 
            m.wallet_address,
            m.referrer_wallet,
            m.activation_rank,
            m.activated_at
        FROM membership m
        WHERE m.activated_at IS NOT NULL 
        AND m.nft_level = 1
        AND NOT EXISTS (
            SELECT 1 FROM referrals r 
            WHERE r.member_wallet = m.wallet_address
        )
        ORDER BY m.activation_rank ASC
    LOOP
        -- 尝试进行矩阵安置
        BEGIN
            SELECT * INTO placement_result
            FROM process_membership_activation(
                member_record.wallet_address, 
                member_record.referrer_wallet
            );
            
            IF placement_result.success THEN
                sync_count := sync_count + 1;
                
                RETURN QUERY SELECT 
                    member_record.wallet_address,
                    'Successfully placed in matrix' as sync_result,
                    placement_result.placement_info;
            ELSE
                RETURN QUERY SELECT 
                    member_record.wallet_address,
                    'Matrix placement failed: ' || placement_result.message as sync_result,
                    NULL::JSONB;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT 
                member_record.wallet_address,
                'Error during placement: ' || SQLERRM as sync_result,
                NULL::JSONB;
        END;
    END LOOP;
    
    -- 记录同步结果
    RAISE NOTICE 'Matrix sync completed: % members processed', sync_count;
END;
$$ LANGUAGE plpgsql;

-- 执行同步
SELECT 'Syncing Activated Members to Matrix:' as sync_header;
SELECT * FROM sync_activated_members_to_matrix();

-- ===== 第3步：测试推荐链和矩阵结构 =====
-- Step 3: Test referral chains and matrix structure

-- 创建矩阵结构分析函数
CREATE OR REPLACE FUNCTION analyze_matrix_structure()
RETURNS TABLE(
    matrix_root VARCHAR(42),
    root_username VARCHAR(100),
    total_members BIGINT,
    layer_distribution JSONB,
    position_distribution JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.matrix_root,
        u.username as root_username,
        COUNT(*) as total_members,
        
        -- 层级分布
        jsonb_object_agg(
            'Layer_' || r.matrix_layer::TEXT, 
            COUNT(*) FILTER (WHERE r.matrix_layer IS NOT NULL)
        ) as layer_distribution,
        
        -- 位置分布
        jsonb_build_object(
            'L_positions', COUNT(*) FILTER (WHERE r.matrix_position = 'L'),
            'M_positions', COUNT(*) FILTER (WHERE r.matrix_position = 'M'), 
            'R_positions', COUNT(*) FILTER (WHERE r.matrix_position = 'R')
        ) as position_distribution
        
    FROM referrals r
    LEFT JOIN users u ON r.matrix_root = u.wallet_address
    WHERE r.is_active = TRUE
    GROUP BY r.matrix_root, u.username
    ORDER BY total_members DESC;
END;
$$ LANGUAGE plpgsql;

-- 分析当前矩阵结构
SELECT 'Matrix Structure Analysis:' as analysis_header;
SELECT * FROM analyze_matrix_structure();

-- ===== 第4步：检查具体的矩阵树 =====
-- Step 4: Check specific matrix trees

-- 显示前几个矩阵树的详细结构
SELECT 'Detailed Matrix Trees (Top 3 roots):' as tree_header;

WITH top_roots AS (
    SELECT matrix_root, COUNT(*) as member_count
    FROM referrals 
    WHERE is_active = TRUE
    GROUP BY matrix_root
    ORDER BY member_count DESC
    LIMIT 3
)
SELECT 
    r.matrix_root,
    root_u.username as root_name,
    r.member_wallet,
    member_u.username as member_name,
    r.matrix_parent,
    parent_u.username as parent_name,
    r.matrix_position,
    r.matrix_layer,
    r.activation_rank,
    r.placed_at
FROM referrals r
JOIN top_roots tr ON r.matrix_root = tr.matrix_root
LEFT JOIN users root_u ON r.matrix_root = root_u.wallet_address
LEFT JOIN users member_u ON r.member_wallet = member_u.wallet_address
LEFT JOIN users parent_u ON r.matrix_parent = parent_u.wallet_address
WHERE r.is_active = TRUE
ORDER BY r.matrix_root, r.matrix_layer, r.activation_rank;

-- ===== 第5步：测试奖励系统 =====
-- Step 5: Test reward system

-- 检查奖励记录
SELECT 'Reward System Status:' as reward_header;

SELECT 
    'Total Reward Records' as metric,
    COUNT(*) as count
FROM reward_records;

SELECT 
    'Claimable Rewards' as metric,
    COUNT(*) as count,
    SUM(reward_amount) as total_amount
FROM reward_records 
WHERE reward_status = 'claimable';

SELECT 
    'Pending Rewards (72h)' as metric,
    COUNT(*) as count,
    SUM(reward_amount) as total_amount
FROM reward_records 
WHERE reward_status = 'pending';

-- 检查用户奖励余额
SELECT 'User Reward Balances:' as balance_header;

SELECT 
    urb.wallet_address,
    u.username,
    urb.usdc_claimable,
    urb.usdc_pending,
    urb.usdc_claimed
FROM user_reward_balances urb
LEFT JOIN users u ON urb.wallet_address = u.wallet_address
WHERE (urb.usdc_claimable > 0 OR urb.usdc_pending > 0 OR urb.usdc_claimed > 0)
ORDER BY (urb.usdc_claimable + urb.usdc_pending) DESC
LIMIT 10;

-- ===== 第6步：创建测试推荐链函数 =====
-- Step 6: Create test referral chain function

CREATE OR REPLACE FUNCTION create_test_referral_chain(
    p_root_wallet VARCHAR(42),
    p_chain_length INTEGER DEFAULT 5
) RETURNS TABLE(
    step INTEGER,
    wallet_address VARCHAR(42),
    referrer VARCHAR(42),
    placement_result TEXT
) AS $$
DECLARE
    i INTEGER;
    current_referrer VARCHAR(42) := p_root_wallet;
    test_wallet VARCHAR(42);
    activation_result RECORD;
BEGIN
    -- 确保根节点已激活
    IF NOT EXISTS (
        SELECT 1 FROM membership 
        WHERE wallet_address = p_root_wallet 
        AND activated_at IS NOT NULL
    ) THEN
        RETURN QUERY SELECT 
            0,
            p_root_wallet,
            NULL::VARCHAR(42),
            'Root wallet not activated' as placement_result;
        RETURN;
    END IF;
    
    -- 创建推荐链
    FOR i IN 1..p_chain_length LOOP
        test_wallet := 'test_member_' || i::TEXT || '_' || extract(epoch from now())::TEXT;
        
        -- 创建测试用户
        INSERT INTO users (wallet_address, username, pre_referrer)
        VALUES (test_wallet, 'Test Member ' || i, current_referrer)
        ON CONFLICT (wallet_address) DO NOTHING;
        
        -- 激活测试会员
        BEGIN
            SELECT * INTO activation_result
            FROM process_level1_nft_activation(test_wallet, current_referrer);
            
            IF activation_result.success THEN
                RETURN QUERY SELECT 
                    i,
                    test_wallet,
                    current_referrer,
                    'Successfully activated and placed' as placement_result;
                
                -- 下一个会员的推荐者是当前会员
                current_referrer := test_wallet;
            ELSE
                RETURN QUERY SELECT 
                    i,
                    test_wallet,
                    current_referrer,
                    'Activation failed: ' || activation_result.message as placement_result;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT 
                i,
                test_wallet,
                current_referrer,
                'Error: ' || SQLERRM as placement_result;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ===== 第7步：运行矩阵兼容性测试 =====
-- Step 7: Run matrix compatibility test

SELECT 'Matrix Compatibility Test:' as test_header;

-- 检查矩阵安置算法是否正常工作
WITH matrix_test AS (
    SELECT 
        r.matrix_root,
        r.matrix_layer,
        r.matrix_position,
        COUNT(*) as position_count
    FROM referrals r
    WHERE r.is_active = TRUE
    GROUP BY r.matrix_root, r.matrix_layer, r.matrix_position
)
SELECT 
    matrix_root,
    matrix_layer,
    jsonb_object_agg(matrix_position, position_count) as positions_per_layer
FROM matrix_test
GROUP BY matrix_root, matrix_layer
ORDER BY matrix_root, matrix_layer
LIMIT 10;

-- ===== 第8步：检查数据一致性 =====
-- Step 8: Check data consistency

SELECT 'Data Consistency Check:' as consistency_header;

-- 检查membership和members表的一致性
SELECT 
    'Members without membership' as issue,
    COUNT(*) as count
FROM members mem
WHERE NOT EXISTS (
    SELECT 1 FROM membership m 
    WHERE m.wallet_address = mem.wallet_address 
    AND m.activated_at IS NOT NULL
);

-- 检查矩阵中没有members记录的会员
SELECT 
    'Matrix members without members table record' as issue,
    COUNT(*) as count
FROM referrals r
WHERE r.is_active = TRUE
AND NOT EXISTS (
    SELECT 1 FROM members m 
    WHERE m.wallet_address = r.member_wallet
);

-- 检查推荐关系的一致性
SELECT 
    'Referrals with invalid referrer' as issue,
    COUNT(*) as count
FROM referrals r
WHERE r.is_active = TRUE
AND r.referrer_wallet IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM membership m 
    WHERE m.wallet_address = r.referrer_wallet 
    AND m.activated_at IS NOT NULL
);

-- ===== 完成信息 =====
SELECT '🎉 Matrix System Sync and Test Completed!' as completion_status;

COMMIT;
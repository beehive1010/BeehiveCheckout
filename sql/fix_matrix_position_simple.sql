-- 简化的Matrix Position修复脚本
-- 修复所有position都是'L'的问题，重新按L→M→R分布

BEGIN;

-- 1. 修复现有数据的position分配
SELECT '=== 开始修复Matrix Position分配 ===' as step;

-- 重新分配所有的matrix_position为正确的L/M/R分布
WITH position_fix AS (
    SELECT 
        r.id,
        r.matrix_root,
        r.matrix_layer,
        r.member_wallet,
        r.placed_at,
        -- 按每个matrix_root和layer分组，按时间顺序重新分配L/M/R位置
        CASE ((ROW_NUMBER() OVER (
            PARTITION BY r.matrix_root, r.matrix_layer 
            ORDER BY r.placed_at ASC, r.member_wallet ASC
        ) - 1) % 3)
            WHEN 0 THEN 'L'
            WHEN 1 THEN 'M'
            WHEN 2 THEN 'R'
        END as new_position
    FROM referrals r
    WHERE r.matrix_root IS NOT NULL
)
UPDATE referrals 
SET matrix_position = position_fix.new_position
FROM position_fix
WHERE referrals.id = position_fix.id;

SELECT '=== Position分配修复完成，查看新分布 ===' as step;

-- 查看修复后的分布
SELECT 
    matrix_position as "位置",
    COUNT(*) as "数量",
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as "百分比"
FROM referrals 
WHERE matrix_position IS NOT NULL
GROUP BY matrix_position
ORDER BY matrix_position;

-- 2. 查看当前状态
SELECT '=== 当前推荐关系和Matrix结构 ===' as step;

SELECT 
    r.member_wallet as "成员钱包",
    COALESCE(u1.username, 'User_' || RIGHT(r.member_wallet, 4)) as "成员名称",
    r.referrer_wallet as "推荐人钱包", 
    COALESCE(u2.username, 'User_' || RIGHT(r.referrer_wallet, 4)) as "推荐人名称",
    r.matrix_root as "Matrix Root",
    COALESCE(u3.username, 'User_' || RIGHT(r.matrix_root, 4)) as "Root名称",
    r.matrix_layer as "Matrix层级",
    r.matrix_position as "Matrix位置"
FROM referrals r
LEFT JOIN users u1 ON r.member_wallet = u1.wallet_address
LEFT JOIN users u2 ON r.referrer_wallet = u2.wallet_address
LEFT JOIN users u3 ON r.matrix_root = u3.wallet_address
ORDER BY r.matrix_root, r.matrix_layer, r.matrix_position;

-- 3. 检查是否需要创建递归matrix记录
SELECT '=== 检查缺失的递归Matrix记录 ===' as step;

-- 找出应该存在但不存在的递归matrix记录
WITH RECURSIVE should_exist AS (
    -- 找到所有推荐关系链
    SELECT 
        member_wallet,
        referrer_wallet,
        member_wallet as original_member,
        1 as depth,
        ARRAY[member_wallet] as path
    FROM referrals 
    WHERE referrer_wallet IS NOT NULL
    AND matrix_root IS NULL  -- 只看基础推荐关系
    
    UNION ALL
    
    -- 递归找上级
    SELECT 
        r.member_wallet,
        r.referrer_wallet,
        se.original_member,
        se.depth + 1,
        se.path || r.member_wallet
    FROM referrals r
    INNER JOIN should_exist se ON r.member_wallet = se.referrer_wallet
    WHERE se.depth < 5  -- 限制递归深度以避免性能问题
    AND NOT r.member_wallet = ANY(se.path)
)
SELECT 
    se.referrer_wallet as "应该作为Matrix Root",
    COALESCE(u1.username, 'User_' || RIGHT(se.referrer_wallet, 4)) as "Root名称",
    se.original_member as "应该包含的成员",
    COALESCE(u2.username, 'User_' || RIGHT(se.original_member, 4)) as "成员名称",
    se.depth as "应该在层级",
    '缺失' as "状态"
FROM should_exist se
LEFT JOIN users u1 ON se.referrer_wallet = u1.wallet_address
LEFT JOIN users u2 ON se.original_member = u2.wallet_address
WHERE NOT EXISTS (
    SELECT 1 FROM referrals r2 
    WHERE r2.matrix_root = se.referrer_wallet 
    AND r2.member_wallet = se.original_member
)
ORDER BY se.referrer_wallet, se.depth;

-- 4. 显示修复建议
SELECT '=== 修复建议和下一步操作 ===' as step;

SELECT 
    '1. Position分配已修复' as "修复项目",
    '现在L/M/R位置应该正确分布' as "说明",
    (SELECT COUNT(*) FROM referrals WHERE matrix_position = 'L') as "L数量",
    (SELECT COUNT(*) FROM referrals WHERE matrix_position = 'M') as "M数量",
    (SELECT COUNT(*) FROM referrals WHERE matrix_position = 'R') as "R数量"
    
UNION ALL

SELECT 
    '2. 需要创建递归Matrix记录',
    '当前只有直接推荐关系，缺少上级的Matrix记录',
    NULL,
    NULL,
    NULL
    
UNION ALL

SELECT 
    '3. 建议执行递归Matrix生成',
    '为每个会员在其上级链的Matrix中创建记录',
    NULL,
    NULL,
    NULL;

COMMIT;
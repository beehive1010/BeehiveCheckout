-- 简化的矩阵验证查询 - 基于实际数据库结构
-- 查看当前树状滑落逻辑是否正确

-- 1. 当前数据库matrix问题总结
SELECT '=== 当前Matrix数据问题总结 ===' as analysis;

SELECT 
    'Matrix Position Distribution Problem' as issue,
    matrix_position,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM referrals 
WHERE matrix_position IS NOT NULL
GROUP BY matrix_position
ORDER BY matrix_position;

-- 2. 查看当前推荐关系
SELECT '=== 当前推荐关系链 ===' as analysis;

SELECT 
    r.member_wallet as "成员钱包",
    COALESCE(u1.username, 'User_' || RIGHT(r.member_wallet, 4)) as "成员名称",
    r.referrer_wallet as "推荐人钱包", 
    COALESCE(u2.username, 'User_' || RIGHT(r.referrer_wallet, 4)) as "推荐人名称",
    r.matrix_root as "Matrix Root",
    r.matrix_layer as "Matrix层级",
    r.matrix_position as "Matrix位置",
    r.placed_at as "加入时间"
FROM referrals r
LEFT JOIN users u1 ON r.member_wallet = u1.wallet_address
LEFT JOIN users u2 ON r.referrer_wallet = u2.wallet_address
ORDER BY r.placed_at;

-- 3. 按matrix_root分组查看
SELECT '=== 按Matrix Root分组的当前结构 ===' as analysis;

SELECT 
    r.matrix_root as "Matrix Root",
    COALESCE(root_user.username, 'User_' || RIGHT(r.matrix_root, 4)) as "Root用户名",
    COUNT(*) as "下级总数",
    COUNT(CASE WHEN r.matrix_position = 'L' THEN 1 END) as "L位置数量",
    COUNT(CASE WHEN r.matrix_position = 'M' THEN 1 END) as "M位置数量", 
    COUNT(CASE WHEN r.matrix_position = 'R' THEN 1 END) as "R位置数量",
    MAX(r.matrix_layer) as "最深层级"
FROM referrals r
LEFT JOIN users root_user ON r.matrix_root = root_user.wallet_address
WHERE r.matrix_root IS NOT NULL
GROUP BY r.matrix_root, root_user.username
ORDER BY "下级总数" DESC;

-- 4. 理想的递归matrix应该是什么样子
SELECT '=== 理想递归Matrix应该的样子 ===' as analysis;

-- 找出所有推荐关系，展示理想的递归matrix结构
WITH referral_pairs AS (
    SELECT DISTINCT 
        member_wallet,
        referrer_wallet,
        COALESCE(u1.username, 'User_' || RIGHT(member_wallet, 4)) as member_name,
        COALESCE(u2.username, 'User_' || RIGHT(referrer_wallet, 4)) as referrer_name
    FROM referrals r
    LEFT JOIN users u1 ON r.member_wallet = u1.wallet_address
    LEFT JOIN users u2 ON r.referrer_wallet = u2.wallet_address
    WHERE referrer_wallet IS NOT NULL
)
SELECT 
    '理想情况下，每个会员都应该是其下级链的matrix_root' as explanation,
    rp.referrer_wallet as "应该作为Matrix Root",
    rp.referrer_name as "Root用户名",
    rp.member_wallet as "应该在其Matrix中的成员",
    rp.member_name as "成员名称",
    '1' as "应该在Layer",
    'L/M/R轮流分配' as "应该的Position"
FROM referral_pairs rp
ORDER BY rp.referrer_wallet, rp.member_wallet;

-- 5. 检查推荐链深度（看看是否有递归推荐）
SELECT '=== 检查推荐链深度 ===' as analysis;

WITH RECURSIVE referral_depth AS (
    -- 基础：直接推荐关系
    SELECT 
        member_wallet,
        referrer_wallet,
        1 as depth,
        ARRAY[member_wallet] as chain
    FROM referrals 
    WHERE referrer_wallet IS NOT NULL
    
    UNION ALL
    
    -- 递归：多级推荐关系
    SELECT 
        r.member_wallet,
        rd.referrer_wallet,
        rd.depth + 1,
        rd.chain || r.member_wallet
    FROM referrals r
    INNER JOIN referral_depth rd ON r.referrer_wallet = rd.member_wallet
    WHERE rd.depth < 10  -- 限制递归深度
        AND NOT r.member_wallet = ANY(rd.chain)  -- 防止循环
)
SELECT 
    referrer_wallet as "推荐人",
    COUNT(DISTINCT member_wallet) as "总下级数量",
    MAX(depth) as "最深层级",
    COUNT(CASE WHEN depth = 1 THEN 1 END) as "直接推荐数",
    COUNT(CASE WHEN depth = 2 THEN 1 END) as "二级推荐数",
    COUNT(CASE WHEN depth >= 3 THEN 1 END) as "三级及以上推荐数"
FROM referral_depth
GROUP BY referrer_wallet
ORDER BY "总下级数量" DESC;

-- 6. 修复建议
SELECT '=== 修复建议 ===' as analysis;

SELECT 
    '问题1: Position分配错误' as issue,
    '所有matrix_position都是L，应该按L→M→R→L的顺序循环分配' as suggestion,
    '修复方法: 重新计算每个matrix_root下每层的position分配' as solution
    
UNION ALL

SELECT 
    '问题2: 缺少递归matrix记录',
    '目前只有直接推荐关系，缺少递归matrix结构',
    '修复方法: 为每个会员创建其下级链的完整matrix记录'
    
UNION ALL

SELECT 
    '问题3: 层级分配不当',
    '所有记录都在layer 1，应该按推荐深度分配层级',
    '修复方法: 重新计算matrix_layer，实现19层递归结构';
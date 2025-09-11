-- 分析三个表的功能和数据职责，捋顺递归树的形成逻辑
-- 解决users、members、referrals表中referrer数据重复和混乱问题

BEGIN;

-- 1. 分析当前三个表的结构和数据
SELECT '=== 分析users表的referrer数据 ===' as analysis;
SELECT 
    'users表' as table_name,
    wallet_address,
    referrer_wallet,
    username,
    created_at,
    '基础用户信息 + 首次推荐关系' as suggested_purpose
FROM users 
WHERE referrer_wallet IS NOT NULL
ORDER BY created_at;

SELECT '=== 分析members表的referrer数据 ===' as analysis;
SELECT 
    'members表' as table_name,
    wallet_address,
    referrer_wallet,
    current_level,
    created_at,
    '会员等级信息 + 推荐关系' as suggested_purpose
FROM members 
WHERE referrer_wallet IS NOT NULL
ORDER BY created_at;

SELECT '=== 分析referrals表的数据 ===' as analysis;
SELECT 
    'referrals表' as table_name,
    member_wallet,
    referrer_wallet,
    matrix_root,
    matrix_layer,
    matrix_position,
    placed_at,
    '推荐关系 + Matrix结构记录' as suggested_purpose
FROM referrals 
ORDER BY placed_at;

-- 2. 检查三个表中referrer数据的一致性
SELECT '=== 检查三个表中referrer数据一致性 ===' as analysis;

WITH referrer_comparison AS (
    SELECT 
        COALESCE(u.wallet_address, m.wallet_address, r.member_wallet) as wallet,
        u.referrer_wallet as users_referrer,
        m.referrer_wallet as members_referrer,
        r.referrer_wallet as referrals_referrer,
        CASE 
            WHEN u.referrer_wallet = m.referrer_wallet 
                AND m.referrer_wallet = r.referrer_wallet THEN '✅ 一致'
            WHEN u.referrer_wallet IS NULL 
                OR m.referrer_wallet IS NULL 
                OR r.referrer_wallet IS NULL THEN '⚠️ 部分缺失'
            ELSE '❌ 不一致'
        END as consistency_status
    FROM users u
    FULL OUTER JOIN members m ON u.wallet_address = m.wallet_address
    FULL OUTER JOIN (
        SELECT DISTINCT member_wallet, referrer_wallet 
        FROM referrals 
        WHERE matrix_root IS NULL  -- 只看基础推荐关系
    ) r ON COALESCE(u.wallet_address, m.wallet_address) = r.member_wallet
    WHERE u.referrer_wallet IS NOT NULL 
       OR m.referrer_wallet IS NOT NULL 
       OR r.referrer_wallet IS NOT NULL
)
SELECT 
    wallet,
    users_referrer,
    members_referrer, 
    referrals_referrer,
    consistency_status
FROM referrer_comparison
ORDER BY consistency_status, wallet;

-- 3. 建议的表职责划分
SELECT '=== 建议的表职责划分和数据流 ===' as analysis;

CREATE TEMPORARY TABLE table_responsibilities AS
SELECT 
    'users' as table_name,
    '用户基础信息' as primary_purpose,
    'wallet_address, username, email, referrer_wallet' as key_fields,
    '存储用户的基本信息和首次推荐关系' as description,
    '作为推荐关系的主要数据源' as role_in_matrix
UNION ALL
SELECT 
    'members',
    '会员等级和状态',
    'wallet_address, current_level, levels_owned, referrer_wallet',
    '存储会员的等级信息，referrer_wallet应该从users表同步',
    '用于确定会员的等级和权限，不应独立管理推荐关系'
UNION ALL
SELECT 
    'referrals',
    'Matrix结构记录',
    'member_wallet, referrer_wallet, matrix_root, matrix_layer, matrix_position',
    '存储递归matrix的具体结构，所有matrix记录都在这里',
    '根据users表的推荐关系生成递归matrix记录';

SELECT * FROM table_responsibilities;

-- 4. 建议的递归树形成逻辑
SELECT '=== 建议的递归树形成逻辑 ===' as analysis;

CREATE TEMPORARY TABLE recursive_tree_logic AS
SELECT 
    1 as step_order,
    '数据源统一' as step_name,
    '以users表的referrer_wallet为唯一数据源' as description,
    'users表是推荐关系的主表，其他表不应独立管理推荐关系' as details
UNION ALL
SELECT 
    2,
    '同步推荐关系',
    '将users表的推荐关系同步到members表',
    '确保members.referrer_wallet与users.referrer_wallet一致'
UNION ALL
SELECT 
    3,
    '清理referrals表',
    '删除所有matrix记录，只保留基础推荐关系',
    '为重新生成递归matrix做准备'
UNION ALL
SELECT 
    4,
    '生成递归matrix',
    '基于users表的推荐关系，为每个用户生成其下级链的matrix记录',
    '如果A→B→C→D，则A的matrix包含B(L1),C(L2),D(L3)；B的matrix包含C(L1),D(L2)等'
UNION ALL
SELECT 
    5,
    '应用滑落机制',
    '当某层满员时(3^layer)，新成员滑落到下一层',
    '实现1x3矩阵的容量限制和滑落逻辑'
UNION ALL
SELECT 
    6,
    '维护数据一致性',
    '建立触发器确保推荐关系变更时自动更新matrix结构',
    '保证三个表的数据同步和matrix结构的正确性';

SELECT * FROM recursive_tree_logic ORDER BY step_order;

-- 5. 数据一致性修复建议
SELECT '=== 数据一致性修复建议 ===' as analysis;

-- 检查哪些记录需要修复
WITH inconsistent_data AS (
    SELECT 
        u.wallet_address,
        u.referrer_wallet as users_referrer,
        m.referrer_wallet as members_referrer,
        CASE 
            WHEN u.referrer_wallet != m.referrer_wallet THEN 'SYNC_NEEDED'
            WHEN m.referrer_wallet IS NULL THEN 'MEMBERS_MISSING'
            WHEN u.referrer_wallet IS NULL THEN 'USERS_MISSING'
            ELSE 'OK'
        END as fix_action
    FROM users u
    FULL OUTER JOIN members m ON u.wallet_address = m.wallet_address
    WHERE u.wallet_address IS NOT NULL OR m.wallet_address IS NOT NULL
)
SELECT 
    fix_action as "修复动作",
    COUNT(*) as "记录数量",
    CASE fix_action
        WHEN 'SYNC_NEEDED' THEN '需要同步members.referrer_wallet到users.referrer_wallet'
        WHEN 'MEMBERS_MISSING' THEN '需要在members表中添加referrer_wallet'
        WHEN 'USERS_MISSING' THEN '需要在users表中添加referrer_wallet'
        ELSE '数据一致，无需修复'
    END as "修复说明"
FROM inconsistent_data
GROUP BY fix_action, 
    CASE fix_action
        WHEN 'SYNC_NEEDED' THEN '需要同步members.referrer_wallet到users.referrer_wallet'
        WHEN 'MEMBERS_MISSING' THEN '需要在members表中添加referrer_wallet'
        WHEN 'USERS_MISSING' THEN '需要在users表中添加referrer_wallet'
        ELSE '数据一致，无需修复'
    END
ORDER BY fix_action;

-- 6. 推荐的实施步骤
SELECT '=== 推荐的实施步骤 ===' as analysis;

SELECT 
    '第1步：数据一致性修复' as phase,
    '统一三个表的推荐关系数据，以users表为准' as action,
    'UPDATE members SET referrer_wallet = users.referrer_wallet' as example_sql
UNION ALL
SELECT 
    '第2步：清理matrix数据',
    '删除referrals表中所有matrix记录，重新开始',
    'DELETE FROM referrals WHERE matrix_root IS NOT NULL'
UNION ALL
SELECT 
    '第3步：重建递归matrix',
    '基于统一的推荐关系数据重新生成递归matrix结构',
    '执行递归matrix生成函数'
UNION ALL
SELECT 
    '第4步：建立数据同步机制',
    '创建触发器确保后续数据变更时保持一致性',
    'CREATE TRIGGER sync_referrer_data ...'
UNION ALL
SELECT 
    '第5步：验证和测试',
    '验证递归matrix逻辑是否符合用户需求',
    '测试A→B→C→D的递归matrix是否正确生成';

COMMIT;
# 🎯 Matrix Placement Flow - 会员注册后如何加入矩阵

## 📊 数据纠正

您的质疑是对的！让我重新验证数据：

### 实际数据统计

| 指标 | 数值 | 说明 |
|------|------|------|
| **总会员数** | 4,024 | members表中的总记录 |
| **矩阵放置记录总数** | 42,453 | matrix_referrals表中的总记录 |
| **矩阵中唯一会员数** | 4,008 | 在矩阵中被放置的唯一成员 |
| **缺失矩阵放置的会员** | 16 | 4,024 - 4,008 = 16个会员未被放置 |

### 测试钱包数据验证
**测试钱包**: `0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab`

| 指标 | 数值 | 说明 |
|------|------|------|
| 该钱包矩阵中的记录数 | 1,696 | 所有在该钱包矩阵中的placement记录 |
| 该钱包矩阵中的唯一成员 | 1,696 | 去重后的唯一成员数 |
| Layer 1 (直推) | 3 | 直接推荐人数 |

**结论**: ✅ 1,696个矩阵成员是**正确的**，这是该测试钱包作为matrix_root的所有下线成员数。

---

## 🔄 会员注册到矩阵放置完整流程

### 流程图

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: 用户Claim NFT (前端)                                    │
│  ├─ 连接钱包                                                     │
│  ├─ 支付130 USDT (100 NFT + 30 Platform Fee)                   │
│  └─ 获得transactionHash                                         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: 调用 Edge Function: activate-membership               │
│  ├─ 传入: walletAddress, transactionHash, referrerWallet       │
│  └─ 开始激活流程                                                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: 验证NFT所有权 (Edge Function内部)                      │
│  ├─ 查询链上NFT余额                                             │
│  ├─ 验证transactionHash有效性                                   │
│  └─ 确认用户拥有Level 1 NFT                                     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: 创建 members 记录 (核心步骤)                           │
│  ├─ 获取下一个activation_sequence                               │
│  ├─ 从users表获取referrer_wallet                                │
│  └─ INSERT INTO members (...)                                   │
│                                                                  │
│  📝 SQL:                                                         │
│     INSERT INTO members (                                        │
│         wallet_address,                                          │
│         referrer_wallet,                                         │
│         current_level,                                           │
│         activation_sequence,                                     │
│         activation_time,                                         │
│         total_nft_claimed                                        │
│     ) VALUES (                                                   │
│         '0xABC...123',           -- 新成员钱包                   │
│         '0xDEF...456',           -- 推荐人钱包                   │
│         1,                       -- Level 1                      │
│         1234,                    -- 激活序号                     │
│         NOW(),                   -- 激活时间                     │
│         1                        -- NFT数量                      │
│     );                                                           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 5: 自动触发器执行 (AFTER INSERT ON members)               │
│  ├─ Trigger 1: sync_member_to_membership_trigger                │
│  │   └─ 自动创建 membership 记录                                │
│  ├─ Trigger 2: trigger_auto_create_balance_with_initial         │
│  │   └─ 创建 user_balances 并初始化630 BCC                      │
│  └─ Trigger 3: ❌ trigger_recursive_matrix_placement (已禁用)   │
│      └─ 原本会自动放置到矩阵，但因性能问题已禁用                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 6: 手动/批量矩阵放置 (当前方式)                           │
│  ├─ 方式A: 调用 Edge Function (推荐)                            │
│  │   └─ POST /functions/v1/process-matrix-placement             │
│  ├─ 方式B: 后台批量处理                                         │
│  │   └─ SELECT backfill_missing_matrix_placements()             │
│  └─ 方式C: 手动调用函数                                         │
│      └─ SELECT place_new_member_in_matrix_correct(              │
│              member_wallet, referrer_wallet)                     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 7: 矩阵放置逻辑执行                                        │
│  └─ 调用: place_new_member_in_matrix_correct()                 │
│      └─ 内部调用: place_member_recursive_generation_based()     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 8: Generation-Based 矩阵放置算法                          │
│  (详见下方算法说明)                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎲 矩阵放置算法详解

### 核心函数
```sql
place_member_recursive_generation_based(
    p_member_wallet VARCHAR(42),
    p_referrer_wallet VARCHAR(42)
)
```

### 算法步骤

#### Step 1: 收集所有上线 (最多19层)

```sql
WITH RECURSIVE upline_chain AS (
    -- Base: 从推荐人开始
    SELECT p_referrer_wallet as wallet, 1 as depth
    WHERE p_referrer_wallet IS NOT NULL

    UNION ALL

    -- Recursive: 向上查找所有上线
    SELECT m.referrer_wallet, uc.depth + 1
    FROM upline_chain uc
    INNER JOIN members m ON uc.wallet = m.wallet_address
    WHERE uc.depth < 19 AND m.referrer_wallet IS NOT NULL
)
SELECT array_agg(wallet ORDER BY depth) INTO v_upline_wallets
FROM upline_chain;
```

**结果**: 得到一个上线钱包数组，按深度排序
```
v_upline_wallets = [
    '0xReferrer1',      -- depth 1 (直推)
    '0xReferrer2',      -- depth 2 (推荐人的推荐人)
    '0xReferrer3',      -- depth 3
    ...
    '0xReferrerN'       -- depth N (最多19层)
]
```

#### Step 2: 在每个上线的矩阵中放置

**核心逻辑**: 一个新成员会被放置到**所有上线的矩阵**中

```sql
FOR i IN 1..array_length(v_upline_wallets, 1) LOOP
    v_current_root := v_upline_wallets[i];

    -- 在第i个上线的矩阵中，放置在第i层
    SELECT * INTO v_result
    FROM place_member_in_single_matrix_fixed_layer(
        p_member_wallet,
        v_current_root,
        i  -- target_layer = i (关键!)
    );

    IF v_result.success THEN
        v_placements_count := v_placements_count + 1;

        -- 记录放置详情
        INSERT INTO matrix_referrals (
            member_wallet,
            matrix_root_wallet,
            parent_wallet,
            layer,
            position,
            referral_type,
            created_at
        ) VALUES (
            p_member_wallet,
            v_current_root,
            v_result.result_parent_wallet,
            i,
            v_result.result_pos,
            CASE WHEN i = 1 THEN 'direct' ELSE 'spillover' END,
            NOW()
        );

        -- 第一个上线（直推）创建referrals记录
        IF i = 1 THEN
            INSERT INTO referrals (
                referred_wallet,
                referrer_wallet,
                referral_depth,
                created_at
            ) VALUES (
                p_member_wallet,
                v_current_root,
                1,
                NOW()
            );
        END IF;
    END IF;
END LOOP;
```

---

## 📝 实际举例说明

### 场景设置

假设有以下会员结构：

```
Alice (0xAAA)
  └─> Bob (0xBBB)
        └─> Carol (0xCCC)
              └─> David (0xDDD) [新成员]
```

### David 注册并激活时的矩阵放置

#### Step 1: 收集上线
```
David的上线链:
[
  0xCCC (Carol, depth=1),
  0xBBB (Bob, depth=2),
  0xAAA (Alice, depth=3)
]
```

#### Step 2: 在每个上线的矩阵中放置

**放置 1: 在 Carol 的矩阵中 (Layer 1)**

```sql
matrix_referrals record:
{
    member_wallet: '0xDDD' (David),
    matrix_root_wallet: '0xCCC' (Carol),
    parent_wallet: '0xCCC' (Carol),
    layer: 1,
    position: 'L' (假设是第一个位置),
    referral_type: 'direct'
}
```

```
Carol's Matrix (0xCCC):
Layer 1: [David(L), -, -]
```

**同时创建 referrals 记录**:
```sql
referrals record:
{
    referred_wallet: '0xDDD' (David),
    referrer_wallet: '0xCCC' (Carol),
    referral_depth: 1
}
```

**放置 2: 在 Bob 的矩阵中 (Layer 2)**

```sql
matrix_referrals record:
{
    member_wallet: '0xDDD' (David),
    matrix_root_wallet: '0xBBB' (Bob),
    parent_wallet: '0xCCC' (Carol),
    layer: 2,
    position: 'L.L' (Carol的L位置下的L位置),
    referral_type: 'spillover'
}
```

```
Bob's Matrix (0xBBB):
Layer 1: [Carol(L), -, -]
Layer 2: [David(L.L), -, -, -, -, -, -, -, -]
```

**放置 3: 在 Alice 的矩阵中 (Layer 3)**

```sql
matrix_referrals record:
{
    member_wallet: '0xDDD' (David),
    matrix_root_wallet: '0xAAA' (Alice),
    parent_wallet: '0xCCC' (Carol),
    layer: 3,
    position: 'L.L.L' (Bob的L位置 -> Carol的L位置 -> David的L位置),
    referral_type: 'spillover'
}
```

```
Alice's Matrix (0xAAA):
Layer 1: [Bob(L), -, -]
Layer 2: [Carol(L.L), -, -, -, -, -, -, -, -]
Layer 3: [David(L.L.L), -, -, -, -, -, -, -, -, ...]
```

#### 最终结果

David 被放置在 **3个矩阵** 中：
1. ✅ Carol's matrix - Layer 1 (direct)
2. ✅ Bob's matrix - Layer 2 (spillover)
3. ✅ Alice's matrix - Layer 3 (spillover)

总共创建了 **3条 matrix_referrals 记录**。

---

## 🔢 为什么一个会员会产生多条矩阵记录？

### 关键理解

**每个会员都会被放置在所有上线的矩阵中，层数 = 与该上线的距离**

### 数学计算

假设有一个完整的推荐链，从根到新成员有N层：

```
Root (Level 0)
  └─> Upline 1 (Level 1)
        └─> Upline 2 (Level 2)
              └─> ...
                    └─> Upline N-1 (Level N-1)
                          └─> New Member (Level N)
```

**新成员会被放置在:**
- Root's matrix - Layer N
- Upline 1's matrix - Layer N-1
- Upline 2's matrix - Layer N-2
- ...
- Upline N-1's matrix - Layer 1 (direct)

**总放置数 = N** (即上线的数量)

### 实际案例分析

#### 测试钱包统计
```
Total members: 4,024
Total matrix_referrals records: 42,453
Average placements per member: 42,453 / 4,024 ≈ 10.55
```

**解释**: 平均每个会员被放置在约10.55个上线的矩阵中，说明平均推荐深度约为10-11层。

#### 测试钱包的矩阵
```
Test wallet (0x479AB...): 1,696 unique members in matrix
This means: 1,696 members are descendants (at various layers) of this wallet
```

---

## 🎯 关键要点总结

### 1. 矩阵放置的时机

| 时机 | 触发方式 | 状态 |
|------|----------|------|
| **原设计** | `trigger_recursive_matrix_placement` | ❌ 已禁用 (性能问题) |
| **当前方式** | 手动/批量调用函数 | ✅ 使用中 |
| **推荐方式** | Edge Function调用 | ✅ 推荐 |

### 2. 矩阵放置算法

- ✅ **Generation-Based**: 基于代数/层级的放置
- ✅ **Recursive Upline Search**: 递归查找所有上线（最多19层）
- ✅ **Multi-Matrix Placement**: 每个会员被放置在所有上线的矩阵中
- ✅ **Layer = Depth**: 在第i个上线的矩阵中放置在第i层

### 3. 数据结构

#### members 表 (1条记录/会员)
```sql
{
    wallet_address: '0xDDD',
    referrer_wallet: '0xCCC',
    current_level: 1,
    activation_sequence: 1234,
    activation_time: '2025-10-14T12:00:00Z'
}
```

#### matrix_referrals 表 (N条记录/会员，N=上线数量)
```sql
-- Record 1: 在直推的矩阵中
{
    member_wallet: '0xDDD',
    matrix_root_wallet: '0xCCC',
    layer: 1,
    position: 'L',
    referral_type: 'direct'
}

-- Record 2: 在推荐人的推荐人矩阵中
{
    member_wallet: '0xDDD',
    matrix_root_wallet: '0xBBB',
    layer: 2,
    position: 'L.L',
    referral_type: 'spillover'
}

-- Record 3: 在更上级的矩阵中
{
    member_wallet: '0xDDD',
    matrix_root_wallet: '0xAAA',
    layer: 3,
    position: 'L.L.L',
    referral_type: 'spillover'
}
```

#### referrals 表 (1条记录/会员)
```sql
{
    referred_wallet: '0xDDD',
    referrer_wallet: '0xCCC',
    referral_depth: 1
}
```

---

## 🔧 手动触发矩阵放置

### 方式1: SQL函数调用

```sql
-- 单个会员放置
SELECT place_new_member_in_matrix_correct(
    '0xMemberWallet',
    '0xReferrerWallet'
);

-- 批量处理缺失的放置
SELECT * FROM backfill_missing_matrix_placements(false);
```

### 方式2: Edge Function调用

```typescript
// POST /functions/v1/process-matrix-placement
const response = await fetch(SUPABASE_URL + '/functions/v1/process-matrix-placement', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        memberWallet: '0xMemberWallet',
        referrerWallet: '0xReferrerWallet'
    })
});
```

### 方式3: 查找缺失的放置

```sql
-- 查看哪些会员还没有被放置到矩阵
SELECT * FROM v_members_missing_matrix_placement;
```

---

## 📊 验证矩阵放置

### 检查单个会员的放置情况

```sql
-- 查看会员在哪些矩阵中被放置
SELECT
    matrix_root_wallet,
    layer,
    position,
    referral_type,
    created_at
FROM matrix_referrals
WHERE member_wallet = '0xMemberWallet'
ORDER BY layer;
```

### 检查矩阵完整性

```sql
-- 检查会员是否在所有应该在的矩阵中
WITH upline_count AS (
    SELECT
        m.wallet_address,
        COUNT(*) as expected_placements
    FROM members m
    JOIN members upline ON upline.wallet_address IN (
        -- 递归查找所有上线
        WITH RECURSIVE upline_chain AS (
            SELECT m.referrer_wallet as wallet, 1 as depth
            UNION ALL
            SELECT m2.referrer_wallet, uc.depth + 1
            FROM upline_chain uc
            JOIN members m2 ON uc.wallet = m2.wallet_address
            WHERE uc.depth < 19 AND m2.referrer_wallet IS NOT NULL
        )
        SELECT wallet FROM upline_chain
    )
    GROUP BY m.wallet_address
),
actual_placements AS (
    SELECT
        member_wallet,
        COUNT(*) as actual_placements
    FROM matrix_referrals
    GROUP BY member_wallet
)
SELECT
    uc.wallet_address,
    uc.expected_placements,
    COALESCE(ap.actual_placements, 0) as actual_placements,
    uc.expected_placements - COALESCE(ap.actual_placements, 0) as missing_placements
FROM upline_count uc
LEFT JOIN actual_placements ap ON uc.wallet_address = ap.member_wallet
WHERE uc.expected_placements != COALESCE(ap.actual_placements, 0);
```

---

## ⚠️ 常见问题

### Q1: 为什么禁用了自动矩阵放置触发器？

**A**: 性能原因。当一个新成员加入时，自动触发器需要:
- 递归查找所有上线（可能19层）
- 在每个上线的矩阵中找到合适的位置
- 创建多条matrix_referrals记录
- 可能还要创建奖励记录

这个过程在数据库中可能需要30-60秒，导致members INSERT超时。

### Q2: 当前如何保证新会员被放置到矩阵？

**A**: 使用异步批量处理:
1. 新会员INSERT到members表立即返回（快速）
2. 后台定时任务或手动调用批量处理函数
3. Edge Function可以按需触发放置

### Q3: 一个会员被放置多次是否正常？

**A**: ✅ **完全正常！** 这是设计特性，不是bug。
- 每个会员在所有上线的矩阵中都有一个位置
- 这确保了奖励分配的公平性
- 每个上线都能看到自己矩阵中的所有下线

### Q4: 如何验证1,696是正确的数字？

**A**:
```sql
-- 这1,696个成员是所有在测试钱包矩阵中的成员
SELECT COUNT(DISTINCT member_wallet)
FROM matrix_referrals
WHERE matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab';
-- Result: 1,696 ✅

-- 验证: 这些成员在该矩阵的各层分布
SELECT layer, COUNT(DISTINCT member_wallet) as members
FROM matrix_referrals
WHERE matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
GROUP BY layer
ORDER BY layer;
```

---

## 📚 相关函数列表

| 函数名 | 用途 | 状态 |
|--------|------|------|
| `place_new_member_in_matrix_correct` | 主入口函数 | ✅ 推荐使用 |
| `place_member_recursive_generation_based` | Generation-based算法 | ✅ 当前算法 |
| `place_member_in_single_matrix_fixed_layer` | 在单个矩阵的指定层放置 | ✅ 内部使用 |
| `backfill_missing_matrix_placements` | 批量处理缺失的放置 | ✅ 批量处理 |
| `v_members_missing_matrix_placement` | 查找缺失放置的会员 | ✅ 诊断工具 |

---

**Created by**: Claude Code
**Date**: 2025-10-14
**Purpose**: Matrix Placement Flow Documentation

# 数据库矩阵排位状态检查报告

## 📋 概述

**检查日期：** 2025-10-19
**数据库：** Supabase Production
**检查目的：** 验证当前矩阵排位是否正确，以及是否已达到19层矩阵要求

---

## 📊 当前矩阵排位统计

### 总体数据

| 指标 | 数值 | 状态 |
|------|------|------|
| **总矩阵排位数** | 47,300 | ✅ |
| **独立成员数** | 4,061 | ✅ |
| **独立矩阵根数** | 3,856 | ✅ |
| **最早排位时间** | 2025-03-01 00:01:00 | ✅ |
| **最新排位时间** | 2025-10-18 14:20:23 | ✅ |

**结论：** ✅ 已经成功排位 **4,061 人**，超过 4,000 人的目标。

---

## 🔴 严重问题发现

### 问题 1: 层级超过19层限制

**问题描述：**
数据库中存在 **Layer 0 到 Layer 27**，总共 28 层，超过了业务规则规定的 19 层上限。

**层级分布：**

| Layer | 排位数 | 独立成员数 | 矩阵根数 | 状态 |
|-------|--------|-----------|---------|------|
| **0** | 2,310 | 2,310 | 2,310 | 🔴 **不应存在** |
| 1 | 3,760 | 3,728 | 1,546 | ✅ |
| 2 | 3,759 | 3,618 | 811 | ✅ |
| 3 | 3,559 | 3,507 | 524 | ✅ |
| ... | ... | ... | ... | ... |
| 19 | 490 | 490 | 20 | ✅ |
| **20** | 331 | 331 | 17 | 🔴 **超过限制** |
| **21** | 209 | 209 | 14 | 🔴 **超过限制** |
| **22** | 147 | 147 | 11 | 🔴 **超过限制** |
| **23** | 68 | 68 | 9 | 🔴 **超过限制** |
| **24** | 44 | 44 | 7 | 🔴 **超过限制** |
| **25** | 26 | 26 | 5 | 🔴 **超过限制** |
| **26** | 13 | 13 | 3 | 🔴 **超过限制** |
| **27** | 9 | 9 | 1 | 🔴 **超过限制** |

**影响：**
- 🔴 违反业务规则（最大19层）
- 🔴 可能导致奖励计算错误
- 🔴 前端显示可能出现问题

**最深矩阵示例：**

| 矩阵根 | 最深层级 | 总排位数 |
|--------|---------|---------|
| `0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab` | **27** | 2,118 |
| `0xfd91667229a122265aF123a75bb624A9C35B5032` | **26** | 3,058 |
| `0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0` | **26** | 56 |

---

### 问题 2: 存在 Layer 0

**问题描述：**
数据库中有 **2,310 个排位**在 Layer 0，这是不应该存在的。

**业务规则：**
- Layer 应该从 1 开始
- Layer 0 没有业务含义

**可能原因：**
- 旧的排位函数允许 Layer 0（作为根节点）
- 自己作为自己矩阵的根（self-referral）

**referral_type 分布：**

| Referral Type | 数量 | 百分比 | 状态 |
|--------------|------|--------|------|
| spillover | 35,593 | 75.25% | ✅ |
| direct | 9,201 | 19.45% | ✅ |
| **self** | **2,310** | **4.88%** | 🔴 **可能对应 Layer 0** |
| is_direct | 38 | 0.08% | 🟡 旧字段值 |
| is_spillover | 158 | 0.33% | 🟡 旧字段值 |

---

### 问题 3: 使用旧的数据库结构

**当前列名：**
```sql
column_name | data_type
------------+-----------
layer       | integer
position    | character varying  -- ❌ 旧列名
```

**缺少的新列：**
- ❌ `slot` (应该替代 `position`)
- ❌ `entry_anchor` (Branch-First BFS 需要)
- ❌ `bfs_order` (Branch-First BFS 需要)
- ❌ `activation_time` (审计需要)
- ❌ `tx_hash` (审计需要)

**仅有的新列：**
- ✅ `source` (但可能数据不完整)

**结论：**
🔴 **数据库尚未应用 Branch-First BFS 迁移**

---

### 问题 4: 缺少新的 Branch-First BFS 视图

**需要的视图（Migration 创建）：**

| 视图名 | 状态 | 用途 |
|--------|------|------|
| `v_matrix_layer_tree` | ❌ **缺失** | 完整树形结构 |
| `v_matrix_layer_summary` | ❌ **缺失** | 层级容量统计 |
| `v_direct_vs_layer_mismatch` | ❌ **缺失** | 直推vs矩阵审计 |
| `v_matrix_next_open_slots` | ❌ **缺失** | 下一个可用位置预测 |

**现有的旧视图：**

| 视图名 | 状态 | 用途 |
|--------|------|------|
| `v_direct_referrals` | ✅ 存在 | 直推统计 |
| `v_matrix_direct_children` | ✅ 存在 | 直接子节点 |
| `v_matrix_root_summary` | ✅ 存在 | 矩阵根汇总 |
| `v_matrix_layers_v2` | ✅ 存在 | 层级统计（旧版） |
| `v_matrix_overview` | ✅ 存在 | 矩阵概览 |
| `v_member_overview` | ✅ 存在 | 成员概览 |

---

## 🟡 Referrals 页面组件分析

### 组件使用的视图

**1. MatrixLayerStatsView 组件**
```typescript
.from('v_matrix_layers_v2')  // ✅ 存在
```
**状态：** ✅ 正常工作

**2. ReferralMatrixVisualization 组件**
```typescript
.from('v_member_overview')  // ✅ 存在
```
**状态：** ✅ 正常工作

**3. ReferralsStats 组件**
```typescript
.from('v_matrix_overview')  // ✅ 存在
.from('v_matrix_layers')    // ❌ 不存在！
```
**状态：** 🔴 **部分功能可能失败**

**问题：**
`v_matrix_layers` 视图不存在，但代码尝试查询它，可能导致运行时错误。

---

## 📊 19层矩阵达成情况

### ✅ 已达到19层的矩阵根（部分列表）

| 矩阵根钱包 | 最大层级 | 总排位数 | 层级覆盖 |
|-----------|---------|---------|---------|
| `0x479ABda...` | 27 | 2,118 | 1-27 全覆盖 ✅ |
| `0xfd91667...` | 26 | 3,058 | 1-26 全覆盖 ✅ |
| `0x380Fd6A...` | 26 | 56 | 1-26 全覆盖 ✅ |
| `0x3C1FF5B...` | 25 | 1,525 | 1-25 全覆盖 ✅ |
| `0xE38d25F...` | 25 | 50 | 1-25 全覆盖 ✅ |
| `0x9D06929...` | 24 | 2,509 | 1-24 全覆盖 ✅ |
| ... | ... | ... | ... |
| `0xd8b530f...` | **19** | 1,461 | 1-19 全覆盖 ✅ |
| `0xb9aC7D2...` | **19** | 150 | 1-19 全覆盖 ✅ |
| `0x2cFB3D2...` | **19** | 33 | 1-19 全覆盖 ✅ |

**统计：**
- ✅ **20 个矩阵根**达到或超过 19 层
- ✅ 最深矩阵达到 **27 层**（超过规定）
- ✅ 平均每个深度矩阵有 **1,000+ 排位**

**结论：**
✅ **已经成功建立了19层矩阵系统**，甚至超过了19层。

---

## 🔍 数据完整性检查

### 未能完成的查询

由于列名不匹配，以下查询失败：

1. **成员状态查询** - `membership_status` 列不存在
2. **Slot 查询** - `slot` 列不存在（使用 `position` 替代）

### 需要手动检查的问题

```sql
-- 1. 检查有多少成员没有矩阵排位
SELECT COUNT(*) as members_without_placement
FROM members m
LEFT JOIN matrix_referrals mr ON mr.member_wallet = m.wallet_address
WHERE mr.member_wallet IS NULL;

-- 2. 检查 Layer 0 的具体情况
SELECT member_wallet, matrix_root_wallet, parent_wallet, referral_type
FROM matrix_referrals
WHERE layer = 0
LIMIT 10;

-- 3. 检查超过19层的排位
SELECT COUNT(*) as count_over_19
FROM matrix_referrals
WHERE layer > 19;
```

---

## 🚨 关键问题总结

### 🔴 紧急问题

1. **层级超过19层** - 812 个排位超过业务规则上限（Layer 20-27）
2. **存在 Layer 0** - 2,310 个排位在不应存在的 Layer 0
3. **缺少新的 Branch-First BFS 列** - `slot`, `entry_anchor`, `bfs_order` 等
4. **缺少新的视图** - 4 个核心 Branch-First BFS 视图不存在
5. **ReferralsStats 组件错误** - 查询不存在的 `v_matrix_layers` 视图

### 🟡 次要问题

1. **referral_type 混乱** - 存在多种类型值（应该只有 'direct' 和 'spillover'）
2. **旧数据结构** - 仍在使用 `position` 而不是 `slot`

---

## ✅ 正面发现

1. ✅ **成功排位 4,061 人** - 超过目标
2. ✅ **19层矩阵已建立** - 20+ 个矩阵根达到19层
3. ✅ **数据量充足** - 47,300 个矩阵排位
4. ✅ **大部分视图正常** - 旧系统视图正常运行
5. ✅ **直推/滑落比例合理** - 约 20% 直推，75% 滑落

---

## 🔧 修复建议

### 立即执行（高优先级）

#### 1. 应用 Branch-First BFS 迁移

```bash
# 执行5个迁移文件（按顺序）
supabase db push

# 或手动执行
psql -f supabase/migrations/20251019000000_cleanup_old_matrix_system.sql
psql -f supabase/migrations/20251019000001_create_branch_bfs_placement_function.sql
psql -f supabase/migrations/20251019000002_create_matrix_views.sql
psql -f supabase/migrations/20251019000003_create_data_rebuild_functions.sql
psql -f supabase/migrations/20251019000004_create_matrix_triggers.sql
```

#### 2. 重建矩阵数据

```sql
-- 使用 shadow rebuild 功能
SELECT fn_rebuild_matrix_placements(
    p_batch_id := 'rebuild_production_20251019',
    p_dry_run := FALSE
);

-- 比较旧数据 vs 新数据
SELECT fn_compare_matrix_placements();

-- 检查高影响变更
SELECT * FROM matrix_rebuild_comparison
WHERE impact_level = 'high';

-- 如果满意，提交更改
SELECT fn_commit_matrix_rebuild(p_force := TRUE);
```

#### 3. 修复 ReferralsStats 组件

**文件：** `src/components/referrals/ReferralsStats.tsx`

**问题：** 查询不存在的 `v_matrix_layers` 视图

**修复选项 A：** 使用现有视图
```typescript
// 将 v_matrix_layers 改为 v_matrix_layers_v2
.from('v_matrix_layers_v2')
```

**修复选项 B：** 创建缺失视图
```sql
-- 创建 v_matrix_layers 作为 v_matrix_layers_v2 的别名
CREATE OR REPLACE VIEW v_matrix_layers AS
SELECT * FROM v_matrix_layers_v2;
```

### 中期执行（中优先级）

#### 4. 清理 Layer 0 数据

```sql
-- 分析 Layer 0 的数据
SELECT
    member_wallet,
    matrix_root_wallet,
    parent_wallet,
    referral_type,
    source
FROM matrix_referrals
WHERE layer = 0
LIMIT 100;

-- 决策：
-- 选项 A: 删除 Layer 0 数据（如果是错误数据）
-- 选项 B: 转换为 Layer 1（如果是根节点）
-- 选项 C: 保留但标记为特殊类型
```

#### 5. 限制层级深度

```sql
-- 添加约束限制最大层级
ALTER TABLE matrix_referrals DROP CONSTRAINT IF EXISTS matrix_referrals_layer_check;
ALTER TABLE matrix_referrals
ADD CONSTRAINT matrix_referrals_layer_check CHECK (layer >= 1 AND layer <= 19);

-- 注意：需要先清理超过19层的数据
```

#### 6. 统一 referral_type 值

```sql
-- 清理 referral_type 字段
UPDATE matrix_referrals
SET referral_type = CASE
    WHEN referral_type IN ('is_direct', 'direct') THEN 'direct'
    WHEN referral_type IN ('is_spillover', 'spillover') THEN 'spillover'
    WHEN referral_type = 'self' THEN 'self'  -- 或改为 'direct' 或 'spillover'
    ELSE 'spillover'  -- 默认值
END
WHERE referral_type NOT IN ('direct', 'spillover');
```

---

## 📋 验证清单

重建后需要验证：

### 数据完整性
- [ ] 所有 active 成员都有矩阵排位
- [ ] 没有 Layer 0 的排位
- [ ] 没有超过 Layer 19 的排位
- [ ] 所有排位都有 slot (L/M/R)
- [ ] entry_anchor 和 bfs_order 正确填充

### 业务规则
- [ ] Layer 1 的 parent = matrix_root
- [ ] Layer 1 的 referral_type = 'direct'
- [ ] 其他层级的 referral_type = 'spillover'
- [ ] 每个 parent 最多 3 个子节点 (L, M, R)
- [ ] BFS 顺序连续且无间隙

### 视图功能
- [ ] v_matrix_layer_tree 返回正确的树形结构
- [ ] v_matrix_layer_summary 显示正确的层级统计
- [ ] v_direct_vs_layer_mismatch 识别所有不匹配
- [ ] v_matrix_next_open_slots 正确预测下一个位置

### 前端功能
- [ ] Referrals 页面正常显示
- [ ] MatrixLayerStatsView 组件正常工作
- [ ] InteractiveMatrixView 组件正常工作
- [ ] ReferralsStats 组件无错误

---

## 📊 监控指标

重建后监控以下指标：

```sql
-- 1. 重建成功率
SELECT
    event_type,
    COUNT(*) as count,
    ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM matrix_placement_events) * 100, 2) as percentage
FROM matrix_placement_events
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY event_type;

-- 2. 层级分布
SELECT
    layer,
    COUNT(*) as count,
    COUNT(DISTINCT member_wallet) as unique_members
FROM matrix_referrals
GROUP BY layer
ORDER BY layer;

-- 3. 直推 vs 滑落
SELECT
    referral_type,
    COUNT(*) as count,
    ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM matrix_referrals) * 100, 2) as percentage
FROM matrix_referrals
GROUP BY referral_type;

-- 4. BFS 顺序连续性
SELECT
    matrix_root_wallet,
    COUNT(*) as total,
    MIN(bfs_order) as min_order,
    MAX(bfs_order) as max_order,
    CASE
        WHEN COUNT(*) = MAX(bfs_order) - MIN(bfs_order) + 1 THEN 'CONTINUOUS'
        ELSE 'HAS_GAPS'
    END as status
FROM matrix_referrals
GROUP BY matrix_root_wallet
HAVING COUNT(*) != MAX(bfs_order) - MIN(bfs_order) + 1;
```

---

## 📝 总结

### 当前状态

✅ **已达成的目标：**
1. 成功排位 4,061 人（超过 4,000 目标）
2. 建立了19层矩阵系统（甚至达到27层）
3. 47,300 个矩阵排位数据
4. 大部分前端组件正常工作

🔴 **存在的问题：**
1. 数据库使用旧的矩阵系统（未应用 Branch-First BFS 迁移）
2. 层级超过19层限制（违反业务规则）
3. 存在 Layer 0（不应存在）
4. 缺少新的列和视图
5. ReferralsStats 组件有潜在错误

### 推荐行动

**第一步：** 应用 Branch-First BFS 迁移（5个SQL文件）

**第二步：** 重建矩阵数据（使用 shadow rebuild）

**第三步：** 修复 ReferralsStats 组件视图查询

**第四步：** 验证数据完整性和业务规则

**第五步：** 更新 Edge Functions（activate-membership）

---

**报告版本：** 1.0
**创建日期：** 2025-10-19
**创建者：** Claude Code
**状态：** 🔴 **需要立即执行迁移和数据重建**

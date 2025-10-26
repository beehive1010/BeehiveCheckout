# MobileMatrixView 组件数据源分析

**组件**: `src/components/matrix/MobileMatrixView.tsx`
**查询时间**: 2025-10-19

---

## 📊 数据源概览

### ✅ 是的，是 19 层的 Matrix 结构图 VIEW

| 问题 | 答案 |
|------|------|
| **数据源类型** | ✅ **VIEW (视图)**，不是 TABLE |
| **视图名称** | `v_matrix_tree_19_layers` |
| **是否19层** | ✅ **是的**，WHERE 子句限制 `layer >= 1 AND layer <= 19` |
| **基础表** | `matrix_referrals` (JOIN `members`, `users`) |

---

## 🔄 数据流程图

```
┌─────────────────────┐
│ MobileMatrixView    │  (UI Component)
│  Component          │
└──────────┬──────────┘
           │ 调用
           ▼
┌─────────────────────┐
│ useMatrixNodeChildren│ (React Query Hook)
│  Hook               │  Line 178 in MobileMatrixView.tsx
└──────────┬──────────┘
           │ 查询
           ▼
┌─────────────────────┐
│v_matrix_tree_19_layers│ (Database VIEW)
│  View               │  19层 Matrix 结构视图
└──────────┬──────────┘
           │ 来自
           ▼
┌─────────────────────┐
│ matrix_referrals    │ (Database TABLE)
│  Table              │  JOIN members, users
└─────────────────────┘
```

---

## 📋 视图详细信息

### 视图名称: `v_matrix_tree_19_layers`

### 定义位置
- 可能在 `supabase/migrations/` 中的某个迁移文件中

### WHERE 子句
```sql
WHERE (mr.layer >= 1) AND (mr.layer <= 19)
```
✅ **明确限制为 1-19 层**

### 关键特性

1. **完整的19层结构**
   - Layer 1-19 全覆盖
   - 每个节点最多 3 个子节点 (L, M, R)
   - 理论上最多可容纳: 1 + 3 + 9 + 27 + ... + 3^19 个成员

2. **递归查询能力**
   - `has_children`: 是否有子节点
   - `children_count`: 子节点数量
   - `children_slots`: JSON 格式的 L/M/R 子节点钱包地址

3. **关联数据**
   - 用户名 (member_username, parent_username)
   - 等级 (current_level)
   - 激活信息 (activation_sequence, activation_time)
   - 推荐类型 (referral_type: direct/spillover)

---

## 🔍 Hook 使用方式

### 代码位置: `src/hooks/useMatrixTreeData.ts`

```typescript
// Line 212-252
export function useMatrixNodeChildren(
  matrixRootWallet?: string,
  parentWallet?: string
) {
  return useQuery<{
    L: MatrixTreeNode | null;
    M: MatrixTreeNode | null;
    R: MatrixTreeNode | null
  }>({
    queryKey: ['matrix-node-children', matrixRootWallet, parentWallet],
    queryFn: async () => {
      // ...
      const { data, error } = await supabase
        .from('v_matrix_tree_19_layers')  // ← 查询的视图
        .select('*')
        .eq('matrix_root_wallet', matrixRootWallet)
        .eq('parent_wallet', parentWallet)
        .order('slot');

      // 组织成 L, M, R 格式
      return {
        L: data?.find(node => node.slot === 'L') || null,
        M: data?.find(node => node.slot === 'M') || null,
        R: data?.find(node => node.slot === 'R') || null,
      };
    },
    // ...
  });
}
```

### MobileMatrixView 中的使用

```typescript
// Line 178-181
const { data: childrenData, isLoading, error } = useMatrixNodeChildren(
  originalRoot,      // Matrix root wallet
  currentRoot        // Current viewing node wallet
);
```

---

## 📊 视图结构

### 列定义 (18 列)

| 列名 | 数据类型 | 说明 |
|------|----------|------|
| `matrix_root_wallet` | varchar | Matrix 根节点钱包地址 |
| `matrix_root_username` | varchar | 根节点用户名 |
| `layer` | integer | 层级 (1-19) |
| `member_wallet` | varchar | 成员钱包地址 |
| `member_username` | varchar | 成员用户名 |
| `parent_wallet` | varchar | 父节点钱包地址 |
| `parent_username` | varchar | 父节点用户名 |
| `slot` | varchar | 位置 (L/M/R) |
| `referral_type` | varchar | 推荐类型 (direct/spillover) |
| `activation_sequence` | integer | 激活顺序号 |
| `activation_time` | timestamp | 激活时间 |
| `current_level` | integer | 当前等级 |
| `entry_anchor` | varchar | 入口锚点 |
| `layer1_position_num` | integer | Layer 1 位置编号 (1/2/3) |
| `layer_sequence` | bigint | 层内序列号 |
| `has_children` | boolean | 是否有子节点 |
| `children_count` | bigint | 子节点数量 |
| `children_slots` | jsonb | 子节点钱包地址 (L/M/R) |

### children_slots JSON 结构示例

```json
{
  "L": "0x6c4C4E5702ed65c6F0fE84E45771Cb9c2e6196fd",
  "M": "0x0314f6075959B7B3d1b156f693683d3155280F07",
  "R": "0x7E2f17F2C1f6c1dD619B69C641E228EE0455ed6C"
}
```

---

## 🎯 实际查询示例

### 查询根节点 0x479A... 的 Layer 1

```sql
SELECT
  layer,
  member_wallet,
  member_username,
  slot,
  referral_type,
  current_level,
  has_children,
  children_count,
  children_slots
FROM v_matrix_tree_19_layers
WHERE matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
  AND parent_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
  AND layer = 1
ORDER BY
  CASE slot
    WHEN 'L' THEN 1
    WHEN 'M' THEN 2
    WHEN 'R' THEN 3
  END;
```

### 查询结果

| layer | slot | member_wallet | member_username | referral_type | current_level | has_children | children_count |
|-------|------|---------------|-----------------|---------------|---------------|--------------|----------------|
| 1 | L | 0xfd9...5032 | olddata_root | direct | 1 | true | 3 |
| 1 | M | 0x5B3...d0Fd | user_5 | direct | 1 | true | 3 |
| 1 | R | 0x96D...4b1 | user_6 | direct | 1 | true | 3 |

---

## 🔗 相关 Hooks

在 `src/hooks/useMatrixTreeData.ts` 中，还提供了其他相关的 hooks：

### 1. `useMatrixTreeData`
```typescript
// 获取完整的 matrix tree 数据（可指定 layer）
const { data } = useMatrixTreeData('0x1234...', 3);
```

### 2. `useMatrixTreeForMember`
```typescript
// 获取特定成员的 matrix 分支
const { data } = useMatrixTreeForMember('0x5678...', 3);
```

### 3. `useMatrixLayerStats`
```typescript
// 获取 layer 统计数据
const { data } = useMatrixLayerStats('0x1234...');
// 使用视图: v_matrix_layer_statistics
```

### 4. `useReferralStats`
```typescript
// 获取推荐统计数据
const { data } = useReferralStats('0x1234...');
// 使用视图: v_referral_statistics
```

---

## 📈 性能优化

### React Query 缓存策略

```typescript
{
  staleTime: 30000,    // 30 秒内认为数据新鲜
  gcTime: 300000,      // 5 分钟后清除缓存
}
```

### 查询优化
1. **索引优化**: 视图基于 `matrix_referrals` 表，应确保以下列有索引：
   - `matrix_root_wallet`
   - `parent_wallet`
   - `layer`
   - `slot`

2. **数据量控制**:
   - 只查询当前节点的直接子节点 (3个)
   - 不一次性加载整个 tree

3. **Drill-down 导航**:
   - 用户点击子节点时，重新查询该节点的子节点
   - 支持无限层级下钻

---

## 🎨 UI 数据转换

### MobileMatrixView 的数据转换逻辑

```typescript
// Line 293-361
if (childrenData) {
  // 将 L, M, R 位置转换为数组格式
  if (childrenData.L) {
    currentMatrix.push({
      position: 'L',
      member: {
        wallet: childrenData.L.member_wallet,
        username: childrenData.L.member_username,
        level: childrenData.L.current_level,
        layer: childrenData.L.layer,  // ✅ 包含 layer 信息
        joinedAt: childrenData.L.activation_time || '',
        type: childrenData.L.referral_type === 'direct' ? 'is_direct' : 'is_spillover',
        isActivated: true,
        hasChildInL: (childrenData.L.children_slots?.L) !== null,
        hasChildInM: (childrenData.L.children_slots?.M) !== null,
        hasChildInR: (childrenData.L.children_slots?.R) !== null,
        // ...
      }
    });
  }
  // M 和 R 位置类似处理
}
```

---

## ✅ 总结

### 回答您的问题

1. **数据源类型**: ✅ **VIEW (视图)**，不是 TABLE
2. **视图名称**: `v_matrix_tree_19_layers`
3. **是否19层**: ✅ **是的**，明确限制为 1-19 层
4. **基础表**: `matrix_referrals` (JOIN `members`, `users`)

### 数据流程

```
MobileMatrixView
  → useMatrixNodeChildren Hook
    → v_matrix_tree_19_layers View
      → matrix_referrals Table
```

### 关键特性

- ✅ 支持 19 层完整 matrix 结构
- ✅ 包含子节点信息 (children_slots)
- ✅ 支持 drill-down 导航
- ✅ 包含推荐类型 (direct/spillover)
- ✅ 包含等级、激活信息
- ✅ React Query 缓存优化

---

## 📝 推荐做法

### 性能监控

```sql
-- 检查视图查询性能
EXPLAIN ANALYZE
SELECT * FROM v_matrix_tree_19_layers
WHERE matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
  AND parent_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
ORDER BY slot;
```

### 索引建议

```sql
-- 确保 matrix_referrals 有适当的索引
CREATE INDEX IF NOT EXISTS idx_matrix_referrals_root_parent
ON matrix_referrals(matrix_root_wallet, parent_wallet);

CREATE INDEX IF NOT EXISTS idx_matrix_referrals_root_layer
ON matrix_referrals(matrix_root_wallet, layer);
```

---

**文档创建时间**: 2025-10-19
**创建者**: Claude Code
**相关文件**:
- `src/components/matrix/MobileMatrixView.tsx`
- `src/hooks/useMatrixTreeData.ts`
- Database: `v_matrix_tree_19_layers` view

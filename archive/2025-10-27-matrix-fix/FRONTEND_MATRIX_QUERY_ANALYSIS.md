# 前端矩阵查询分析报告

**分析时间**: 2025-10-19
**问题**: FFT1 账号看不到 FFT4 (应该在 L 位置)

---

## 🔍 问题根本原因

### 查询逻辑混淆

当前的 `MobileMatrixView.tsx` 组件有一个**概念混淆**问题：

#### 问题代码 (MobileMatrixView.tsx:158-177)

```typescript
const isViewingOriginalRoot = currentRoot === originalRoot;

// 原始矩阵数据 - 问题在这里！
const { data: originalMatrixData } = useLayeredMatrix(
  originalRoot,     // matrix_root_wallet
  currentLayer,     // layer
  originalRoot      // 原始根
);

// 子节点数据
const { data: childrenData } = useMatrixChildren(
  originalRoot,     // matrix_root_wallet
  currentRoot       // parent_wallet
);

// 合并数据 - 根据是否是原始根来选择
const matrixData = isViewingOriginalRoot ? originalMatrixData : childrenData;
```

### 问题分析

#### 场景 1: 用户以**矩阵根身份**查看

- `rootWalletAddress` = 矩阵根 (0x982282D7...)
- `currentRoot` = 矩阵根
- `isViewingOriginalRoot` = true
- **使用查询**: `useLayeredMatrix(矩阵根, 1, 矩阵根)`

**实际查询**:
```sql
SELECT * FROM v_matrix_direct_children
WHERE matrix_root_wallet = '矩阵根'
  AND layer_index = 1;
```

**结果**: 返回 FFT1, FFTT2, FFTT3 (Layer 1 的成员) ✅ 正确

---

#### 场景 2: 用户以 **FFT1 身份**查看

当用户用 FFT1 账号登录时：
- `rootWalletAddress` = **FFT1** (0x5461467F...)
- `currentRoot` = **FFT1**
- `isViewingOriginalRoot` = true (因为 currentRoot === originalRoot)
- **使用查询**: `useLayeredMatrix(FFT1, 1, FFT1)`

**实际查询**:
```sql
SELECT * FROM v_matrix_direct_children
WHERE matrix_root_wallet = 'FFT1钱包'
  AND layer_index = 1;
```

**结果**: 返回 FFTT11 (L), FFTT12 (M) - 只有 FFT1 **自己作为矩阵根**的直推 ❌

**缺失**: FFT4 (在矩阵根的矩阵中，FFT1 作为 parent 的 L 位置) ❌

---

## 🎯 用户期望 vs 实际情况

### 用户期望 (以 FFT1 身份查看)

用户期望看到 **FFT1 在矩阵根网体中的下线**:

```
FFT1 的子节点（在矩阵根 0x982282D7... 的矩阵中）:
  ├─ L: FFT4      (spillover) ← 应该显示这个！
  ├─ M: FFTT11    (direct)
  └─ R: FFTT12    (direct)
```

**正确查询应该是**:
```sql
SELECT * FROM v_matrix_direct_children
WHERE matrix_root_wallet = '矩阵根' -- 不是 FFT1！
  AND parent_wallet = 'FFT1'
  AND layer_index = 2;              -- Layer 2，因为FFT1在Layer 1
```

### 实际情况 (当前代码)

当前代码查询的是 **FFT1 自己作为矩阵根的直推**:

```
FFT1 自己的矩阵 (FFT1 作为 matrix_root):
  ├─ L: FFTT11    (direct)
  ├─ M: FFTT12    (direct)
  └─ R: 空
```

**实际查询**:
```sql
SELECT * FROM v_matrix_direct_children
WHERE matrix_root_wallet = 'FFT1' -- 错误！应该是矩阵根
  AND layer_index = 1;
```

**结果**: ❌ 看不到 FFT4

---

## 🔧 问题根源

### 设计缺陷: 两种矩阵视图的混淆

系统中存在**两种不同的矩阵概念**，但前端代码混淆了它们：

#### 概念 1: 成员在系统矩阵根中的网体 (Upline Matrix)
- **矩阵根**: 系统矩阵根 (0x982282D7...)
- **查询**: 查找成员在这个矩阵中的下线
- **用途**: 显示成员的"团队网体"（包括滑落成员）

#### 概念 2: 成员自己作为矩阵根的直推 (Own Matrix)
- **矩阵根**: 成员自己的钱包
- **查询**: 查找成员直接推荐的人
- **用途**: 显示成员的"直推团队"

**当前代码问题**: 总是查询"概念 2"（成员自己的矩阵），但用户期望看到"概念 1"（在系统矩阵中的网体）

---

## 📊 数据库验证

### 正确的查询 (FFT1 的下线)

```sql
-- 查询 FFT1 在矩阵根网体中的子节点
SELECT
    position as "位置",
    member_wallet as "成员",
    referral_type as "类型"
FROM matrix_referrals
WHERE matrix_root_wallet = '0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3'
  AND parent_wallet = '0x5461467F2bf7B26Ee3A982a5e126EAa4Fc091dd8'
  AND layer = 2;
```

**结果**:
```
位置 | 成员          | 类型
-----|---------------|----------
L    | 0xD95E2e17... | spillover  ← FFT4 在这里！
M    | 0x8E025b4E... | direct     ← FFTT11
R    | 0x85eB91E1... | direct     ← FFTT12
```

### 错误的查询 (当前代码)

```sql
-- 当前代码查询的是 FFT1 自己作为矩阵根
SELECT
    position as "位置",
    member_wallet as "成员",
    referral_type as "类型"
FROM matrix_referrals
WHERE matrix_root_wallet = '0x5461467F2bf7B26Ee3A982a5e126EAa4Fc091dd8' -- FFT1
  AND layer = 1;
```

**结果**:
```
位置 | 成员          | 类型
-----|---------------|-------
L    | 0x8E025b4E... | direct  ← FFTT11
M    | 0x85eB91E1... | direct  ← FFTT12
```

❌ **缺少 FFT4！**

---

## 💡 解决方案

### 方案 1: 修改查询逻辑（推荐）

修改 `MobileMatrixView.tsx` 以正确查询成员在系统矩阵中的子节点。

#### 修改思路

1. **确定真正的矩阵根**: 需要获取用户所在的系统矩阵根
2. **查询用户的下线**: 使用 `matrix_root_wallet = 系统矩阵根` + `parent_wallet = 用户钱包`

#### 代码修改

```typescript
// 在 MobileMatrixView 组件中添加
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

// 新增：获取用户所在的系统矩阵根
function useUserMatrixRoot(userWallet: string) {
  return useQuery({
    queryKey: ['user-matrix-root', userWallet],
    queryFn: async () => {
      // 查询用户在哪个矩阵中（查找 member_wallet = userWallet 的记录）
      const { data, error } = await supabase
        .from('matrix_referrals')
        .select('matrix_root_wallet, layer')
        .eq('member_wallet', userWallet)
        .order('layer', { ascending: true })
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) {
        // 用户可能就是矩阵根
        return {
          systemMatrixRoot: userWallet,
          userLayer: 0
        };
      }

      return {
        systemMatrixRoot: data[0].matrix_root_wallet,
        userLayer: data[0].layer
      };
    },
    enabled: !!userWallet
  });
}

// 在组件中使用
const MobileMatrixView: React.FC<MobileMatrixViewProps> = ({
  rootWalletAddress,
  rootUser,
  onNavigateToMember
}) => {
  // ... 其他代码

  // 获取用户的系统矩阵根
  const { data: matrixRootInfo } = useUserMatrixRoot(rootWalletAddress);
  const systemMatrixRoot = matrixRootInfo?.systemMatrixRoot || rootWalletAddress;
  const userLayer = matrixRootInfo?.userLayer || 0;

  // 修改查询：使用系统矩阵根 + parent_wallet
  const { data: userDownlineData } = useQuery({
    queryKey: ['user-downline', systemMatrixRoot, rootWalletAddress],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_matrix_direct_children')
        .select('*')
        .eq('matrix_root_wallet', systemMatrixRoot)  // 系统矩阵根
        .eq('parent_wallet', rootWalletAddress)      // 用户作为父节点
        .order('slot_num_seq');

      if (error) throw error;
      return data;
    },
    enabled: !!systemMatrixRoot && !!rootWalletAddress
  });

  // 组织成 L, M, R 格式
  const matrix3x3 = ['L', 'M', 'R'].map(position => {
    const member = userDownlineData?.find(m => m.slot_index === position);
    return {
      position,
      member: member ? {
        wallet: member.member_wallet,
        joinedAt: member.placed_at,
        type: member.referral_type,
        // ... 其他字段
      } : null
    };
  });

  // ... 其余代码
};
```

---

### 方案 2: 提供两种视图切换

允许用户在两种视图之间切换：

1. **团队网体视图** (默认): 显示成员在系统矩阵中的下线（包括滑落）
2. **直推视图**: 显示成员自己直接推荐的人

#### UI 示例

```typescript
const [viewMode, setViewMode] = useState<'team' | 'direct'>('team');

<div className="flex space-x-2 mb-4">
  <Button
    variant={viewMode === 'team' ? 'default' : 'outline'}
    onClick={() => setViewMode('team')}
  >
    团队网体 (包括滑落)
  </Button>
  <Button
    variant={viewMode === 'direct' ? 'default' : 'outline'}
    onClick={() => setViewMode('direct')}
  >
    直推团队
  </Button>
</div>
```

---

### 方案 3: 合并显示（最完整）

在同一视图中显示两种信息：

```typescript
<Card>
  <CardTitle>我的团队网体（在矩阵根 {systemMatrixRoot} 中）</CardTitle>
  <CardContent>
    {/* 显示 FFT4, FFTT11, FFTT12 */}
  </CardContent>
</Card>

<Card>
  <CardTitle>我的直推成员</CardTitle>
  <CardContent>
    {/* 显示 FFTT11, FFTT12 */}
  </CardContent>
</Card>
```

---

## 📝 修复步骤

### Step 1: 确认用户需求

用户登录 FFT1 账号时，期望看到：
- ✅ 选项 A: FFT1 在系统矩阵中的下线（包括滑落的 FFT4）
- ❌ 选项 B: FFT1 自己作为矩阵根的直推（只有 FFTT11, FFTT12）

**推荐**: 选项 A（方案 1）

### Step 2: 修改查询逻辑

1. 添加 `useUserMatrixRoot` hook
2. 修改 `MobileMatrixView` 的数据查询
3. 测试验证

### Step 3: 更新 UI

1. 添加提示信息，说明显示的是"团队网体"
2. 区分 direct 和 spillover 的视觉呈现
3. 添加图例说明

---

## 🎯 预期修复结果

修复后，当 FFT1 登录时应该看到：

```
FFT1 的团队网体 (在矩阵根 0x982282D7... 中):
  ┌─────────┬─────────┬─────────┐
  │    L    │    M    │    R    │
  ├─────────┼─────────┼─────────┤
  │  FFT4   │ FFTT11  │ FFTT12  │
  │ (滑落)  │ (直推)  │ (直推)  │
  │ #4065   │ #4067   │ #4069   │
  └─────────┴─────────┴─────────┘

说明:
- 🟢 直推: 你直接推荐的成员
- 🔵 滑落: 上线滑落到你矩阵中的成员
```

---

## ✅ 数据验证

所有数据都在数据库中，只是查询逻辑错误：

| 检查项 | 数据库中 | 前端显示 | 状态 |
|--------|----------|----------|------|
| FFT4 在矩阵根的 Layer 2 | ✅ 存在 | ❌ 不显示 | 需要修复 |
| FFT4 的 parent_wallet = FFT1 | ✅ 正确 | ❌ 未查询 | 需要修复 |
| FFT4 的 position = L | ✅ 正确 | ❌ 未查询 | 需要修复 |
| FFT4 的 referral_type = spillover | ✅ 正确 | ❌ 未查询 | 需要修复 |

---

**报告生成**: 2025-10-19
**问题**: 前端查询逻辑错误
**影响**: 用户看不到滑落成员
**优先级**: P1 - HIGH
**建议**: 实施方案 1 修改查询逻辑

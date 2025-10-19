# Matrix 数据流架构文档

**目的**: 说明 Referrals 页面如何获取和显示 Matrix 数据
**更新时间**: 2025-10-19

---

## 📋 数据流概览

```
Referrals Page (用户界面)
    ↓
MobileMatrixView / InteractiveMatrixView (组件)
    ↓
useMatrixByLevel Hooks (数据获取层)
    ↓
Supabase Views & Tables (数据库)
    ↓
v_matrix_direct_children (视图)
matrix_referrals (表)
```

---

## 🎯 核心组件

### 1. Referrals 页面
**位置**: `src/pages/Referrals.tsx`

**职责**:
- 显示用户的推荐链接
- 提供 Matrix 和 Stats 两个标签页
- 在移动端使用 `MobileMatrixView`
- 在桌面端使用 `InteractiveMatrixView`

**关键代码**:
```typescript
// Line 99-116: Matrix Tab
<TabsContent value="matrix" className="space-y-6">
  {/* 统计视图 */}
  <MatrixLayerStatsView
    walletAddress={activeWalletAddress || ''}
  />

  {/* 桌面端 Matrix 视图 */}
  <div className="hidden md:block">
    <InteractiveMatrixView
      rootWalletAddress={activeWalletAddress || ''}
      rootUser={{username: userData?.username, currentLevel: userData?.currentLevel}}
    />
  </div>

  {/* 移动端 Matrix 视图 */}
  <div className="block md:hidden">
    <MobileMatrixView
      rootWalletAddress={activeWalletAddress || ''}
      rootUser={{username: userData?.username, currentLevel: userData?.currentLevel}}
    />
  </div>
</TabsContent>
```

---

### 2. MobileMatrixView 组件
**位置**: `src/components/matrix/MobileMatrixView.tsx`

**职责**:
- 移动端优化的 Matrix 3x3 视图
- 支持层级导航 (Layer 1-19)
- 支持 Drill-down（点击成员查看其下线）
- 显示 L/M/R 三个位置的成员

**状态管理**:
```typescript
const [currentRoot, setCurrentRoot] = useState<string>(rootWalletAddress);
const [currentLayer, setCurrentLayer] = useState<number>(1);
const [navigationHistory, setNavigationHistory] = useState<NavigationHistory[]>([]);
```

**数据获取 Hooks**:

#### Hook 1: `useUserMatrixRoot`
```typescript
// Line 159
const { data: matrixRootInfo, isLoading: isLoadingMatrixRoot } = useUserMatrixRoot(currentRoot);
const systemMatrixRoot = matrixRootInfo?.systemMatrixRoot || currentRoot;
const userLayer = matrixRootInfo?.userLayer || 0;
```

**用途**:
- 查找用户所在的系统矩阵根
- 确定用户在矩阵中的层级
- 判断用户是否是矩阵根本身

#### Hook 2: `useUserDownline`
```typescript
// Line 174-177
const { data: userDownlineData, isLoading: isLoadingDownline, error: downlineError } = useUserDownline(
  currentRoot,
  systemMatrixRoot
);
```

**用途**:
- 获取用户在系统矩阵中的下线（包括滑落成员）
- 查询以 `currentRoot` 为 `parent_wallet` 的所有成员
- 返回 L/M/R 位置的成员数据

#### Hook 3: `useMatrixChildren`
```typescript
// Line 180-183
const { data: childrenData, isLoading: isLoadingChildren, error: childrenError } = useMatrixChildren(
  systemMatrixRoot,
  currentRoot
);
```

**用途**:
- 获取特定成员的直接子节点
- 用于 Drill-down 模式
- 查询子节点的 L/M/R 位置

**数据合并逻辑**:
```typescript
// Line 186: 优先使用用户下线数据
const matrixData = userDownlineData || childrenData;
```

---

## 🔧 数据获取 Hooks 详解

### Hook: `useUserMatrixRoot`
**位置**: `src/hooks/useMatrixByLevel.ts:5-49`

**功能**: 查询用户所在的系统矩阵根

**SQL 查询**:
```typescript
const { data, error } = await supabase
  .from('matrix_referrals')
  .select('matrix_root_wallet, layer, parent_wallet, position')
  .eq('member_wallet', userWallet)
  .order('layer', { ascending: true })
  .limit(1);
```

**返回数据**:
```typescript
{
  systemMatrixRoot: string,    // 系统矩阵根钱包
  userLayer: number,            // 用户所在层级
  userParent: string,           // 用户的父节点
  userPosition: string,         // 用户的位置 (L/M/R)
  isMatrixRoot: boolean         // 是否是矩阵根
}
```

**使用场景**:
- 页面初始化时确定用户在哪个矩阵中
- Drill-down 时确定当前查看节点的矩阵根

---

### Hook: `useUserDownline`
**位置**: `src/hooks/useMatrixByLevel.ts:52-116`

**功能**: 获取用户在系统矩阵中的下线（包括滑落成员）

**SQL 查询**:
```typescript
const { data, error } = await supabase
  .from('v_matrix_direct_children')
  .select(`
    layer_index,
    slot_index,
    slot_num_seq,
    member_wallet,
    parent_wallet,
    referral_type,
    placed_at,
    child_level,
    child_nft_count
  `)
  .eq('matrix_root_wallet', systemMatrixRoot)
  .eq('parent_wallet', userWallet)
  .order('slot_num_seq');
```

**关键字段说明**:
- `matrix_root_wallet`: 系统矩阵根
- `parent_wallet`: 父节点钱包（查询条件）
- `slot_index`: 位置标识 (L/M/R)
- `slot_num_seq`: 位置序号（排序用）
- `referral_type`: 推荐类型 (direct/spillover)
- `child_level`: 子成员的等级
- `child_nft_count`: 子成员的NFT数量

**数据组织**:
```typescript
// 组织成 L, M, R 格式
const matrixPositions = ['L', 'M', 'R'];
const matrix3x3 = matrixPositions.map(position => {
  const member = data?.find(m => m.slot_index === position);

  return {
    position: position,
    member: member ? {
      wallet: member.member_wallet,
      joinedAt: member.placed_at,
      type: member.referral_type,
      level: member.child_level,
      nftCount: member.child_nft_count,
      canExpand: false
    } : null
  };
});
```

**返回数据**:
```typescript
{
  userWallet: string,
  systemMatrixRoot: string,
  positions: Array<{           // L, M, R 三个位置
    position: 'L' | 'M' | 'R',
    member: {
      wallet: string,
      joinedAt: string,
      type: 'direct' | 'spillover',
      level: number,
      nftCount: number
    } | null
  }>,
  totalMembers: number,        // 实际成员数量 (0-3)
  rawData: Array               // 原始数据
}
```

**刷新策略**:
```typescript
staleTime: 5000,        // 5秒内使用缓存
refetchInterval: 15000  // 每15秒自动刷新
```

---

### Hook: `useMatrixChildren`
**位置**: `src/hooks/useMatrixByLevel.ts:213-291`

**功能**: 获取特定成员的直接子节点（用于 Drill-down）

**SQL 查询**:
```typescript
const { data: childrenData, error: childrenError } = await supabase
  .from('v_matrix_direct_children')
  .select(`
    layer_index,
    slot_index,
    slot_num_seq,
    member_wallet,
    parent_wallet,
    referral_type,
    placed_at
  `)
  .eq('matrix_root_wallet', matrixRootWallet)
  .eq('parent_wallet', parentWallet)
  .order('slot_num_seq');
```

**与 useUserDownline 的区别**:
- `useUserDownline`: 用于显示用户自己的下线
- `useMatrixChildren`: 用于 Drill-down 时显示其他成员的下线

**返回数据**:
```typescript
{
  parentWallet: string,
  matrixRootWallet: string,
  children: Array<{            // L, M, R 三个位置
    position: 'L' | 'M' | 'R',
    member: {
      wallet: string,
      joinedAt: string,
      type: string,
      fullPosition: string,
      hasChildren: boolean,
      childrenCount: number
    } | null
  }>,
  totalChildren: number
}
```

---

## 🗄️ 数据库视图

### v_matrix_direct_children
**类型**: Supabase View
**用途**: 提供矩阵直接子成员的查询

**字段**:
- `matrix_root_wallet` - 系统矩阵根钱包
- `parent_wallet` - 父节点钱包
- `member_wallet` - 成员钱包
- `layer_index` - 层级索引 (1-19)
- `slot_index` - 位置索引 (L/M/R)
- `slot_num_seq` - 位置序号（排序）
- `referral_type` - 推荐类型 (direct/spillover)
- `placed_at` - 加入时间
- `child_level` - 子成员等级
- `child_nft_count` - 子成员NFT数量

**查询示例**:
```sql
-- 查询特定用户的直接下线
SELECT *
FROM v_matrix_direct_children
WHERE matrix_root_wallet = '0x...'
  AND parent_wallet = '0x...'
ORDER BY slot_num_seq;
```

---

## 🔄 数据流示例

### 场景 1: 用户打开 Referrals 页面

```
1. 页面加载
   ↓
2. 获取 activeWalletAddress (用户钱包地址)
   ↓
3. MobileMatrixView 初始化
   - currentRoot = activeWalletAddress
   - currentLayer = 1
   ↓
4. 调用 useUserMatrixRoot(currentRoot)
   - 查询: matrix_referrals WHERE member_wallet = currentRoot
   - 返回: systemMatrixRoot, userLayer
   ↓
5. 调用 useUserDownline(currentRoot, systemMatrixRoot)
   - 查询: v_matrix_direct_children
     WHERE matrix_root_wallet = systemMatrixRoot
       AND parent_wallet = currentRoot
   - 返回: L/M/R 三个位置的成员数据
   ↓
6. 渲染 3x3 Matrix 视图
   - 显示 L, M, R 三个位置
   - 显示成员信息（头像、用户名、等级）
   - 显示是否有下级（L/M/R 指示器）
```

---

### 场景 2: 用户点击成员进行 Drill-down

```
1. 用户点击 Position L 的成员 (wallet: 0xAAA)
   ↓
2. handleMemberTap('0xAAA') 被调用
   ↓
3. 保存当前根到 navigationHistory
   - { wallet: currentRoot, username: '...', level: 1, layer: 1 }
   ↓
4. 更新状态
   - setCurrentRoot('0xAAA')
   - setCurrentLayer(1)
   ↓
5. 重新获取数据
   - useUserMatrixRoot('0xAAA')
     → 找到 0xAAA 所在的系统矩阵根

   - useUserDownline('0xAAA', systemMatrixRoot)
     → 查询 0xAAA 的直接下线

   - useMatrixChildren(systemMatrixRoot, '0xAAA')
     → 查询 0xAAA 的子节点
   ↓
6. 渲染新的 3x3 Matrix 视图
   - 显示 0xAAA 的 L/M/R 三个下线
   - 显示"返回"按钮
   - 显示导航路径
```

---

### 场景 3: 用户切换层级

```
1. 用户点击 "Layer 2" 按钮
   ↓
2. setCurrentLayer(2) 被调用
   ↓
3. 数据获取 Hook 自动重新查询
   - useUserDownline 使用 currentLayer = 2
   - 查询更深层的数据
   ↓
4. 渲染 Layer 2 的 3x3 视图
```

---

## 🎨 UI 组件渲染逻辑

### MatrixNode 组件
**位置**: `MobileMatrixView.tsx:52-142`

**渲染逻辑**:
```typescript
if (!member) {
  // 空位置
  return (
    <div className="empty-slot">
      <User icon />
      <div>{position}</div> {/* L/M/R */}
      <div>{t('matrix.waitingToJoin')}</div>
    </div>
  );
}

// 有成员
const isSpillover = member.type === 'is_spillover';

return (
  <div className={isSpillover ? 'spillover-style' : 'direct-style'}>
    {/* 头像 */}
    <Avatar>{member.username?.charAt(0)}</Avatar>

    {/* 位置标识 */}
    <div>{position}</div>

    {/* 类型指示器 */}
    {isSpillover ? <ArrowDownLeft /> : <ArrowUpRight />}

    {/* 用户名 */}
    <div>{member.username}</div>

    {/* 等级徽章 */}
    <Badge>L{member.level}</Badge>

    {/* 下级指示器 (L/M/R 小圆点) */}
    <div className="child-indicators">
      <div className={member.hasChildInL ? 'active' : 'inactive'}>L</div>
      <div className={member.hasChildInM ? 'active' : 'inactive'}>M</div>
      <div className={member.hasChildInR ? 'active' : 'inactive'}>R</div>
    </div>
  </div>
);
```

---

## 🐛 调试日志

### 关键日志输出

```typescript
// 1. Matrix root info (Line 163)
console.log('🔍 MobileMatrixView - Matrix root info:', {
  currentRoot,
  systemMatrixRoot,
  userLayer,
  isMatrixRoot: matrixRootInfo?.isMatrixRoot
});

// 2. Current state (Line 191)
console.log('🔍 MobileMatrixView - Current state:', {
  currentRoot,
  currentLayer,
  originalRoot,
  isViewingOriginalRoot,
  isLoading,
  error: error?.message,
  matrixData: matrixData ? 'Data available' : 'No data'
});

// 3. Matrix data details (Line 314)
console.log('🔍 MobileMatrixView - Matrix data details:', {
  hasUserDownlineData: !!userDownlineData,
  hasChildrenData: !!childrenData,
  currentMatrix,
  totalMembers,
  currentMatrixLength: currentMatrix.length,
  systemMatrixRoot,
  currentRoot
});
```

### 日志解读

**正常流程**:
```
🔍 MobileMatrixView - Matrix root info: {
  currentRoot: '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab',
  systemMatrixRoot: '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab',
  userLayer: 0,
  isMatrixRoot: true  // 用户是矩阵根
}

🔍 MobileMatrixView - Current state: {
  currentRoot: '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab',
  currentLayer: 1,
  isLoading: false,
  matrixData: 'Data available'
}

🔍 MobileMatrixView - Matrix data details: {
  hasUserDownlineData: true,
  currentMatrixLength: 3,
  totalMembers: 2
}
```

---

## 🔍 常见问题排查

### 问题 1: 翻译缺失警告
```
Translation missing for key: matrix.loadingData
```

**原因**:
- 翻译键存在于 `src/translations/en.json:2661`
- 但翻译服务可能没有正确加载

**解决方案**:
1. 检查翻译文件是否正确加载
2. 清除浏览器缓存
3. 检查 i18n 初始化

---

### 问题 2: Matrix 数据不显示

**检查步骤**:
1. 查看控制台日志，确认 `isLoading` 状态
2. 检查是否有错误日志 `❌ Error getting user downline`
3. 确认用户钱包地址是否正确
4. 检查 `v_matrix_direct_children` 视图是否有数据

**SQL 检查**:
```sql
-- 检查用户是否在矩阵中
SELECT * FROM matrix_referrals
WHERE member_wallet = '0x...';

-- 检查用户的下线
SELECT * FROM v_matrix_direct_children
WHERE parent_wallet = '0x...'
ORDER BY slot_num_seq;
```

---

### 问题 3: Drill-down 不工作

**检查步骤**:
1. 确认 `handleMemberTap` 是否被调用
2. 查看 `navigationHistory` 是否正确更新
3. 检查 `useMatrixChildren` 是否返回数据
4. 查看控制台日志中的 `currentRoot` 变化

---

## 📊 性能优化

### 1. React Query 缓存
```typescript
staleTime: 5000,        // 5秒内使用缓存
refetchInterval: 15000  // 每15秒自动刷新
```

### 2. 并行查询
```typescript
// 三个 hooks 并行执行
const { data: matrixRootInfo } = useUserMatrixRoot(currentRoot);
const { data: userDownlineData } = useUserDownline(currentRoot, systemMatrixRoot);
const { data: childrenData } = useMatrixChildren(systemMatrixRoot, currentRoot);
```

### 3. 条件查询
```typescript
enabled: !!userWallet && !!systemMatrixRoot
```

---

## 🎯 总结

### 数据流路径
```
User Wallet → Matrix Root → User Downline → L/M/R Positions → UI Display
```

### 关键 Hooks
1. **useUserMatrixRoot** - 确定矩阵根
2. **useUserDownline** - 获取用户下线
3. **useMatrixChildren** - Drill-down 子节点

### 数据库视图
- **v_matrix_direct_children** - 核心数据源

### UI 组件
- **MobileMatrixView** - 移动端视图
- **MatrixNode** - 单个节点渲染

---

**文档版本**: 1.0
**最后更新**: 2025-10-19
**维护者**: Claude Code

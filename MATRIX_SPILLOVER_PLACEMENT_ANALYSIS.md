# Matrix Spillover Placement Design Analysis

## 📋 概述

本文档详细分析Beehive矩阵系统的**滑落安置机制**（Spillover Placement）和**矩阵UI组件设计**。

> **用户请求**: "查看数据库矩阵滑落设计安置怎么方法安置，查看现在的matrix组件在referrals页面的设计"

---

## 🎯 核心概念

### 1. 矩阵放置流程

```
新成员激活
    ↓
place_new_member_in_matrix_correct
    ↓
place_member_recursive_generation_based (收集19层上线链)
    ↓
为每个上线矩阵调用: place_member_in_single_matrix_fixed_layer
    ↓
find_position_at_specific_layer (寻找可用位置)
    ↓
插入 matrix_referrals 表
```

### 2. 滑落类型

系统根据**推荐关系**自动识别两种滑落模式：

#### 模式1: 直接推荐滑落 (Direct Referral Spillover)
- **触发条件**: 成员的referrer在目标层存在（层级 = parent_depth）
- **遍历顺序**: **Parent-first** → 按父节点遍历，每个父节点内 L→M→R
- **中文描述**: "下线自己发展的滑落"
- **排序规则**: `ORDER BY mr.position, m.activation_time, m.activation_sequence`

```
查找顺序:
Parent L 的 (L, M, R)
Parent M 的 (L, M, R)
Parent R 的 (L, M, R)
```

**示例场景**:
```
Layer 2: A推荐B，B被放到A的矩阵Layer 2
→ B的下线C被激活
→ 检测到C的referrer(B)在Layer 2存在
→ 使用 Parent-first 模式
→ 优先填充B的 (L→M→R)，再考虑其他父节点
```

#### 模式2: 矩阵滑落 (Matrix Spillover)
- **触发条件**: 成员的referrer在目标层**不存在**
- **遍历顺序**: **Position-first** → 按位置遍历 L→M→R，每个位置内按父节点BFS顺序
- **中文描述**: "Matrix自身滑落"
- **排序规则**: `ORDER BY m.activation_time, m.activation_sequence`

```
查找顺序:
所有Parent的L位置 (按BFS顺序)
所有Parent的M位置 (按BFS顺序)
所有Parent的R位置 (按BFS顺序)
```

**示例场景**:
```
Layer 3: A推荐B，B应该在Layer 3
→ 但B的referrer(A)不在Layer 2（已满或不存在）
→ 检测为 Matrix spillover
→ 使用 Position-first 模式
→ 遍历Layer 2的所有L，再所有M，最后所有R
→ 填充第一个可用位置
```

---

## 🔍 数据库函数详解

### 函数1: `is_direct_referral_in_matrix`

**作用**: 判断是否为直接推荐滑落模式

```sql
CREATE OR REPLACE FUNCTION is_direct_referral_in_matrix(
    p_member_wallet VARCHAR,
    p_matrix_root VARCHAR,
    p_target_layer INTEGER
) RETURNS BOOLEAN
```

**逻辑**:
1. 获取成员的referrer_wallet
2. Layer 1: 判断 `referrer == matrix_root`
3. Layer 2+: 判断 `referrer` 是否在 `target_layer - 1` 层存在

**返回**:
- `TRUE`: 使用 Parent-first 模式（直接推荐滑落）
- `FALSE`: 使用 Position-first 模式（矩阵滑落）

---

### 函数2: `find_position_at_specific_layer`

**作用**: 在指定层找到下一个可用的 L/M/R 位置

```sql
CREATE OR REPLACE FUNCTION find_position_at_specific_layer(
    p_matrix_root VARCHAR,
    p_target_layer INTEGER,
    p_member_wallet VARCHAR DEFAULT NULL
) RETURNS TABLE(pos VARCHAR, parent VARCHAR)
```

#### Layer 1 特殊处理

```sql
IF p_target_layer = 1 THEN
    FOR v_position IN SELECT unnest(ARRAY['L', 'M', 'R']) LOOP
        IF NOT EXISTS (
            SELECT 1 FROM matrix_referrals
            WHERE matrix_root_wallet = p_matrix_root
              AND parent_wallet = p_matrix_root
              AND layer = 1
              AND position = v_position
        ) THEN
            RETURN QUERY SELECT v_position, p_matrix_root;
            RETURN;
        END IF;
    END LOOP;
END IF;
```

**特点**:
- Layer 1 总是从根节点直接查找 L→M→R
- 不区分模式，始终按 L→M→R 顺序

---

#### Layer 2+ 模式选择

##### MODE 1: Direct Referral Spillover (Parent-first)

```sql
IF v_is_direct_spillover THEN
    -- 按父节点遍历（先按position排序，再BFS）
    FOR v_parent IN
        SELECT mr.member_wallet
        FROM matrix_referrals mr
        INNER JOIN members m ON mr.member_wallet = m.wallet_address
        WHERE mr.matrix_root_wallet = p_matrix_root
          AND mr.layer = p_target_layer - 1
        ORDER BY mr.position, m.activation_time, m.activation_sequence
    LOOP
        -- 对每个父节点，检查 L → M → R
        FOR v_position IN SELECT unnest(ARRAY['L', 'M', 'R']) LOOP
            IF NOT EXISTS (...position taken...) THEN
                RETURN QUERY SELECT v_position, v_parent;
                RETURN;
            END IF;
        END LOOP;
    END LOOP;
END IF;
```

**遍历示例**:
```
假设 Layer 1 有: Parent_L, Parent_M, Parent_R

查找顺序:
1. Parent_L → 检查 L
2. Parent_L → 检查 M
3. Parent_L → 检查 R
4. Parent_M → 检查 L
5. Parent_M → 检查 M
6. Parent_M → 检查 R
7. Parent_R → 检查 L
8. Parent_R → 检查 M
9. Parent_R → 检查 R

找到第一个空位即返回
```

---

##### MODE 2: Matrix Spillover (Position-first)

```sql
ELSE
    -- 按位置遍历（L L L, M M M, R R R）
    FOR v_position IN SELECT unnest(ARRAY['L', 'M', 'R']) LOOP
        FOR v_parent IN
            SELECT mr.member_wallet
            FROM matrix_referrals mr
            INNER JOIN members m ON mr.member_wallet = m.wallet_address
            WHERE mr.matrix_root_wallet = p_matrix_root
              AND mr.layer = p_target_layer - 1
            ORDER BY m.activation_time, m.activation_sequence  -- 纯BFS
        LOOP
            IF NOT EXISTS (...position taken...) THEN
                RETURN QUERY SELECT v_position, v_parent;
                RETURN;
            END IF;
        END LOOP;
    END LOOP;
END IF;
```

**遍历示例**:
```
假设 Layer 1 有: Parent_A, Parent_B, Parent_C (按BFS顺序)

查找顺序:
1. Parent_A → 检查 L
2. Parent_B → 检查 L
3. Parent_C → 检查 L
4. Parent_A → 检查 M
5. Parent_B → 检查 M
6. Parent_C → 检查 M
7. Parent_A → 检查 R
8. Parent_B → 检查 R
9. Parent_C → 检查 R

找到第一个空位即返回
```

---

### 函数3: `place_member_in_single_matrix_fixed_layer`

**作用**: 将成员放置在单个矩阵的指定层，支持滑落

```sql
CREATE OR REPLACE FUNCTION place_member_in_single_matrix_fixed_layer(
    p_member_wallet VARCHAR,
    p_matrix_root VARCHAR,
    p_target_layer INTEGER
) RETURNS TABLE(...)
```

#### 滑落循环

```sql
FOR v_current_layer IN p_target_layer..v_max_layer LOOP
    SELECT bfs_result.pos, bfs_result.parent
    INTO v_position, v_parent
    FROM find_position_at_specific_layer(
        p_matrix_root,
        v_current_layer,
        p_member_wallet  -- 传入member判断模式
    ) bfs_result;

    IF v_position IS NOT NULL AND v_parent IS NOT NULL THEN
        -- 找到位置，插入记录
        INSERT INTO matrix_referrals (
            matrix_root_wallet,
            member_wallet,
            parent_wallet,
            parent_depth,
            layer,  -- 可能 > target_layer (滑落)
            position,
            slot,
            bfs_order,
            referral_type,
            source,
            activation_time
        ) VALUES (
            p_matrix_root,
            p_member_wallet,
            v_parent,
            p_target_layer,  -- 保持原始depth
            v_current_layer, -- 实际layer
            v_position,
            v_position,
            v_bfs_order,
            CASE
                WHEN v_parent = v_referrer_wallet THEN 'direct'
                ELSE 'spillover'
            END,
            'matrix_placement',
            NOW()
        );

        RETURN QUERY ...;
        RETURN;
    END IF;
END LOOP;
```

**滑落机制**:
1. 从 `target_layer` 开始循环
2. 每次尝试找位置
3. 如果 `target_layer` 满了，尝试 `target_layer + 1`
4. 继续滑落到 `target_layer + 2`, `target_layer + 3`...
5. 直到找到可用位置或达到最大层（19层）

**关键点**:
- `parent_depth`: 始终保持为**目标层级**（不变）
- `layer`: 记录**实际放置层级**（会因滑落而增加）
- `referral_type`: 根据 `parent == referrer` 判断（direct/spillover）

---

## 📊 滑落示例场景

### 场景1: 直接推荐滑落

```
Genesis (Layer 0)
├── A (Layer 1, L, direct)
├── B (Layer 1, M, direct)
└── C (Layer 1, R, direct)

A推荐D:
→ D应该在A的矩阵 Layer 1
→ 检测: A的referrer是Genesis，且Genesis在Layer 0存在
→ 模式: Direct Referral Spillover
→ 查找: Genesis的子节点按 L→M→R 遍历
→ 结果: D放在 (Layer 1, parent=Genesis, position=L)
→ 标记: referral_type = 'direct'

继续: A推荐E, F, G, H...
→ 当Layer 1满了(3个位置全满)
→ 滑落到Layer 2
→ 仍使用 Parent-first 模式
→ 优先填充 A 的 (L, M, R)
```

---

### 场景2: 矩阵滑落

```
Genesis (Layer 0)
├── A (Layer 1, L)
│   ├── D (Layer 2, L)
│   ├── E (Layer 2, M)
│   └── F (Layer 2, R)
├── B (Layer 1, M)
│   ├── G (Layer 2, L)
│   ├── H (Layer 2, M)
│   └── (empty)
└── C (Layer 1, R)
    └── (empty)

A推荐X，X应该在Layer 2:
→ 检测: X的referrer是A，A在Layer 1存在（不在Layer 2）
→ 模式: Matrix Spillover
→ 查找: Layer 2的所有父节点，Position-first
→ 遍历顺序:
   1. A-L (已占D) ✗
   2. B-L (已占G) ✗
   3. C-L (空) ✓ 找到!
→ 结果: X放在 (Layer 2, parent=C, position=L)
→ 标记: referral_type = 'spillover'
```

---

## 🎨 Matrix UI组件设计

### 组件架构

```
src/pages/Referrals.tsx
    ├── Desktop: InteractiveMatrixView.tsx
    └── Mobile: MobileMatrixView.tsx
```

---

### 1. Referrals.tsx 页面结构

**文件**: `src/pages/Referrals.tsx`

#### 布局

```tsx
<TabsContent value="matrix" className="space-y-6">
  {/* Layer Stats Card */}
  <MatrixLayerStatsView walletAddress={activeWalletAddress} />

  {/* Desktop Matrix View */}
  <div className="hidden md:block">
    <InteractiveMatrixView
      rootWalletAddress={activeWalletAddress}
      rootUser={{
        username: userData?.username,
        currentLevel: userData?.currentLevel
      }}
    />
  </div>

  {/* Mobile Matrix View */}
  <div className="block md:hidden">
    <MobileMatrixView
      rootWalletAddress={activeWalletAddress}
      rootUser={{
        username: userData?.username,
        currentLevel: userData?.currentLevel
      }}
    />
  </div>
</TabsContent>
```

**响应式设计**:
- **Desktop**: `hidden md:block` - 平板及以上显示InteractiveMatrixView
- **Mobile**: `block md:hidden` - 手机显示MobileMatrixView

---

### 2. InteractiveMatrixView (Desktop)

**文件**: `src/components/matrix/InteractiveMatrixView.tsx`

#### 核心功能

1. **钻取导航 (Drill-down Navigation)**
```tsx
const [currentRoot, setCurrentRoot] = useState<string>(rootWalletAddress);
const [currentLayer, setCurrentLayer] = useState<number>(1);
const [navigationHistory, setNavigationHistory] = useState<NavigationHistory[]>([]);

// 点击节点深入
const handleMemberClick = (memberWallet: string) => {
  // 保存当前位置到历史
  setNavigationHistory(prev => [...prev, {
    wallet: currentRoot,
    layer: currentLayer,
    username: currentRootUser?.username
  }]);

  // 切换到新根
  setCurrentRoot(memberWallet);
  setCurrentLayer(currentLayer + 1);
};

// 返回上一层
const handleGoBack = () => {
  const previous = navigationHistory[navigationHistory.length - 1];
  setCurrentRoot(previous.wallet);
  setCurrentLayer(previous.layer);
  setNavigationHistory(prev => prev.slice(0, -1));
};
```

2. **数据获取**
```tsx
const { data: childrenData, isLoading } = useMatrixNodeChildren(
  originalRoot,  // 始终是最初的根（用于查询权限）
  currentRoot    // 当前查看的节点
);
```

3. **渲染L/M/R节点**
```tsx
const renderMatrixNode = (position: 'L' | 'M' | 'R', member: MatrixMember | null) => {
  if (!member) {
    return (
      <div className="empty-slot">
        <User className="icon" />
        <span>{position}</span>
        <span>Waiting to join</span>
      </div>
    );
  }

  return (
    <div
      className={`matrix-card ${member.referral_type === 'direct' ? 'direct' : 'spillover'}`}
      onClick={() => handleMemberClick(member.wallet)}
    >
      {/* Avatar */}
      <div className="avatar">{member.username?.[0]}</div>

      {/* Position Badge */}
      <Badge>{position}</Badge>

      {/* Type Indicator */}
      {member.referral_type === 'direct' ? (
        <ArrowUpRight className="direct-icon" />
      ) : (
        <ArrowDownLeft className="spillover-icon" />
      )}

      {/* Username & Wallet */}
      <div className="username">{member.username}</div>
      <div className="wallet">{formatWallet(member.wallet)}</div>

      {/* Level & Layer Badges */}
      <Badge>L{member.current_level}</Badge>
      <Badge>Layer {member.layer}</Badge>

      {/* Child Indicators */}
      <div className="child-indicators">
        <div className={member.hasChildInL ? 'filled' : 'empty'}>L</div>
        <div className={member.hasChildInM ? 'filled' : 'empty'}>M</div>
        <div className={member.hasChildInR ? 'filled' : 'empty'}>R</div>
      </div>
    </div>
  );
};
```

4. **面包屑导航**
```tsx
<div className="breadcrumb">
  <Button onClick={handleGoHome}>🏠 My Matrix</Button>
  {navigationHistory.map((nav, i) => (
    <>
      <span>→</span>
      <span>{nav.username}</span>
    </>
  ))}
  <span>→</span>
  <span className="current">Current</span>
</div>
```

---

### 3. MobileMatrixView (Mobile)

**文件**: `src/components/matrix/MobileMatrixView.tsx`

#### 移动端优化

1. **触摸优化**
```tsx
<div
  className="matrix-node"
  onClick={() => handleMemberTap(member.wallet)}
  onTouchStart={(e) => {
    e.currentTarget.style.transform = 'scale(0.95)';
    e.currentTarget.style.borderColor = 'rgba(250, 204, 21, 0.7)';
  }}
  onTouchEnd={(e) => {
    e.currentTarget.style.transform = '';
    e.currentTarget.style.borderColor = '';
  }}
>
  {/* 节点内容 */}
</div>
```

**特点**:
- `touch-manipulation`: 禁用双击缩放
- `gpu-accelerated`: 启用GPU加速动画
- 触摸反馈: 按下缩小，释放恢复

2. **搜索和过滤**
```tsx
const [searchQuery, setSearchQuery] = useState<string>('');
const [filterType, setFilterType] = useState<string>('all'); // all, direct, spillover
const [filterLayer, setFilterLayer] = useState<string>('all'); // all, 1-19
const [filterLevel, setFilterLevel] = useState<string>('all'); // all, 1-19

// 全局搜索（跨19层）
const { data: globalSearchResults } = useMatrixGlobalSearch(
  originalRoot,
  searchQuery
);

// 应用过滤
const filteredMatrix = useMemo(() => {
  return currentMatrix.filter(node => {
    // Search filter
    if (searchQuery && !matchesSearch(node, searchQuery)) return false;

    // Type filter
    if (filterType !== 'all' && !matchesType(node, filterType)) return false;

    // Layer filter
    if (filterLayer !== 'all' && node.layer !== parseInt(filterLayer)) return false;

    // Level filter
    if (filterLevel !== 'all' && node.level !== parseInt(filterLevel)) return false;

    return true;
  });
}, [currentMatrix, searchQuery, filterType, filterLayer, filterLevel]);
```

3. **全局搜索结果**
```tsx
{searchQuery && globalSearchResults?.length > 0 && (
  <div className="search-results">
    <div className="header">
      Found {globalSearchResults.length} member(s) across all layers
    </div>

    {globalSearchResults.map(node => (
      <div
        key={node.member_wallet}
        onClick={() => {
          setCurrentRoot(node.member_wallet);
          setCurrentNodeLayer(node.layer);
          setSearchQuery(''); // 清除搜索
        }}
        className="result-item"
      >
        <div className="member-info">
          <span className="username">{node.member_username}</span>
          <Badge>{node.referral_type}</Badge>
        </div>

        <div className="wallet">{formatWallet(node.member_wallet)}</div>

        <div className="badges">
          <Badge>Layer {node.layer}</Badge>
          <Badge>{node.slot}</Badge>
          <Badge>L{node.current_level}</Badge>
        </div>
      </div>
    ))}
  </div>
)}
```

4. **尺寸自适应**
```tsx
const isMobile = useIsMobile();

const nodeSize = isMobile ? 'p-2' : 'p-3';
const iconSize = isMobile ? 'w-3 h-3' : 'w-4 h-4';
const avatarSize = isMobile ? 'w-6 h-6' : 'w-8 h-8';
const textSize = isMobile ? 'text-[10px]' : 'text-xs';
```

---

### 4. 数据Hook

**文件**: `src/hooks/useMatrixTreeData.ts`

#### useMatrixNodeChildren

```tsx
export function useMatrixNodeChildren(
  originalRoot: string,
  currentRoot: string
) {
  return useQuery({
    queryKey: ['matrix-node-children', originalRoot, currentRoot],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        'get_matrix_node_children',
        {
          p_original_root: originalRoot,
          p_current_node: currentRoot
        }
      );

      if (error) throw error;

      // 返回 { L: {...}, M: {...}, R: {...} }
      return data;
    }
  });
}
```

#### useMatrixGlobalSearch

```tsx
export function useMatrixGlobalSearch(
  rootWallet: string,
  searchQuery: string
) {
  return useQuery({
    queryKey: ['matrix-global-search', rootWallet, searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];

      const { data, error } = await supabase
        .from('v_matrix_overview')
        .select('*')
        .eq('matrix_root_wallet', rootWallet)
        .or(`member_username.ilike.%${searchQuery}%,member_wallet.ilike.%${searchQuery}%`)
        .order('layer', { ascending: true })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: searchQuery.length >= 2
  });
}
```

---

## 🎨 UI视觉设计

### 颜色方案

#### Direct Referral (直接推荐)
- **背景**: `from-yellow-500/20 to-amber-500/30`
- **边框**: `border-yellow-500/50`
- **图标**: `text-green-600` (ArrowUpRight ↗)
- **Badge**: `bg-green-500`

#### Spillover (滑落)
- **背景**: `from-amber-500/20 to-yellow-500/30`
- **边框**: `border-amber-500/50`
- **图标**: `text-blue-400` (ArrowDownLeft ↙)
- **Badge**: `bg-blue-400`

#### Empty Slot (空位)
- **背景**: `from-gray-50 to-gray-100` (light mode)
- **背景**: `from-gray-800 to-gray-900` (dark mode)
- **边框**: `border-dashed border-gray-300`
- **图标**: `text-gray-400`

---

### 动画效果

1. **Hover效果** (Desktop)
```css
.matrix-card:hover {
  transform: scale(1.05);
  box-shadow: 0 10px 30px rgba(250, 204, 21, 0.2);
}
```

2. **Touch效果** (Mobile)
```css
.matrix-card:active {
  transform: scale(0.95);
  border-color: rgba(250, 204, 21, 0.7);
}
```

3. **加载动画**
```tsx
<div className="animate-pulse">
  <Users className="w-12 h-12" />
  <span>Loading matrix data...</span>
</div>
```

---

## 📈 数据流

```
用户交互
    ↓
React Component (InteractiveMatrixView / MobileMatrixView)
    ↓
React Query Hook (useMatrixNodeChildren)
    ↓
Supabase RPC (get_matrix_node_children)
    ↓
Database View (v_matrix_overview)
    ↓
Matrix_referrals Table
    ↓
返回 L/M/R 子节点数据
    ↓
UI渲染 (显示position, referral_type, layer, level等)
```

---

## 🔐 权限控制

### 数据访问权限

```sql
-- get_matrix_node_children RPC函数
-- 只允许查询originalRoot矩阵的数据
WHERE matrix_root_wallet = p_original_root
  AND parent_wallet = p_current_node
```

**限制**:
- 用户只能查看自己矩阵(originalRoot)的数据
- 钻取导航时，currentRoot改变，但originalRoot不变
- 确保用户无法访问其他人的矩阵数据

---

## 🎯 关键特性总结

### 数据库滑落机制

| 特性 | Direct Referral Spillover | Matrix Spillover |
|------|---------------------------|------------------|
| **触发条件** | Referrer在目标层存在 | Referrer在目标层不存在 |
| **遍历顺序** | Parent-first (L→M→R per parent) | Position-first (L L L, M M M, R R R) |
| **应用场景** | 下线自己发展的滑落 | Matrix自身滑落 |
| **referral_type** | Direct (当parent=referrer) | Spillover |
| **优先级** | 优先填充referrer的子节点 | 全局BFS填充 |

### UI组件特点

| 特性 | Desktop (InteractiveMatrixView) | Mobile (MobileMatrixView) |
|------|----------------------------------|---------------------------|
| **导航** | 面包屑 + Back按钮 | 返回按钮 + 导航历史 |
| **搜索** | 无 | 全局搜索（跨19层） |
| **过滤** | 无 | Type/Layer/Level过滤 |
| **交互** | Hover悬停高亮 | Touch触摸反馈 |
| **优化** | 标准响应式 | GPU加速, touch-manipulation |
| **显示** | 完整信息 | 紧凑布局, 自适应字体 |

---

## 📚 相关文件

### 数据库函数
- `is_direct_referral_in_matrix` - 判断滑落模式
- `find_position_at_specific_layer` - 查找可用位置（核心BFS算法）
- `place_member_in_single_matrix_fixed_layer` - 单矩阵放置 + 滑落循环
- `place_member_recursive_generation_based` - 多矩阵递归放置
- `place_new_member_in_matrix_correct` - 总入口

### React组件
- `src/pages/Referrals.tsx` - 推荐页面主入口
- `src/components/matrix/InteractiveMatrixView.tsx` - 桌面矩阵视图
- `src/components/matrix/MobileMatrixView.tsx` - 移动端矩阵视图
- `src/components/matrix/MatrixLayerStatsView.tsx` - 层级统计卡片

### Hooks
- `src/hooks/useMatrixTreeData.ts` - 矩阵数据获取hooks
  - `useMatrixNodeChildren` - 获取L/M/R子节点
  - `useMatrixGlobalSearch` - 全局搜索

### 数据库视图
- `v_matrix_overview` - 矩阵总览视图

---

## 🎓 学习资源

### 滑落算法理解

**关键问题**: 为什么需要两种模式？

**答案**:
1. **Direct Referral Spillover**: 保护直接推荐关系
   - 当A推荐B，B的下线C应该优先放在B的子节点下
   - 保持团队结构清晰，利于激励

2. **Matrix Spillover**: 公平分配资源
   - 当目标层referrer不存在，使用全局BFS
   - 避免特定位置过度拥挤，均衡分布

### BFS vs DFS

- **BFS (Breadth-First Search)**: 广度优先，层级遍历
  - 用于: 查找最近的可用位置
  - 保证: 上层优先填满，再填下层

- **DFS (Depth-First Search)**: 深度优先
  - 用于: MatrixTree.getDescendants (获取所有后代)
  - 保证: 完整遍历子树

---

## 🚀 性能优化建议

### 数据库层面

1. **索引优化**
```sql
CREATE INDEX idx_matrix_parent_layer_position
ON matrix_referrals(matrix_root_wallet, parent_wallet, layer, position);

CREATE INDEX idx_matrix_bfs_order
ON matrix_referrals(matrix_root_wallet, layer, bfs_order);
```

2. **查询优化**
- 使用 `LIMIT 1` 提前返回
- 避免全表扫描
- 使用materialized view缓存层级统计

### 前端层面

1. **React Query缓存**
```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分钟
      cacheTime: 10 * 60 * 1000, // 10分钟
    },
  },
});
```

2. **虚拟滚动** (大型矩阵)
```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: allLayers.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 300,
});
```

3. **懒加载** (按需加载层级)
```tsx
const { data: layer2Data } = useMatrixLayer(2, {
  enabled: currentLayer >= 2, // 只在需要时加载
});
```

---

## 📝 总结

Beehive矩阵系统的滑落机制通过**智能模式选择**和**BFS算法**，实现了：

1. ✅ **公平性**: Position-first模式确保均衡分布
2. ✅ **关系保护**: Parent-first模式维护直接推荐关系
3. ✅ **自动扩展**: 层级滑落自动处理满员情况
4. ✅ **性能优化**: BFS确保O(n)时间复杂度
5. ✅ **用户体验**: 移动/桌面双端优化，搜索/过滤/导航完善

UI组件设计遵循**移动优先**和**响应式**原则，提供直观的矩阵可视化和交互体验。

---

**文档创建时间**: 2025-10-29
**版本**: 1.0.0
**作者**: Beehive Platform Team

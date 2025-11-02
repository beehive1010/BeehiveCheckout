# Matrix Tree Framework Documentation

## 🌳 Overview

完整的19层三叉树（Ternary Tree）数据结构实现，用于Beehive推荐矩阵系统。基于标准树数据结构的最佳实践，支持BFS+LMR（广度优先搜索 + 左中右优先级）放置算法。

## 📚 理论基础

基于GeeksforGeeks的树数据结构原则：

### 树的基本术语
- **Root Node (根节点)**: 树的顶端节点，无父节点
- **Parent Node (父节点)**: 拥有子节点的节点
- **Child Node (子节点)**: 直接连接到父节点的节点
- **Leaf Node (叶节点)**: 没有子节点的节点
- **Ancestor (祖先)**: 从根到特定节点路径上的所有节点
- **Descendant (后代)**: 从给定节点可到达的所有节点
- **Layer/Depth (层/深度)**: 节点到根的路径长度

### 三叉树特性
- 每个节点最多3个子节点（L, M, R）
- 边数 = 节点数 - 1
- 最大层深 = 19层
- 理论最大节点数 = 3^0 + 3^1 + 3^2 + ... + 3^19 = 1,743,392,200节点

## 🏗️ 架构设计

### 核心组件

```
src/lib/
├── MatrixTree.ts              # 核心树数据结构
├── MatrixTree.examples.ts     # 使用示例
└── MatrixTree.test.ts         # 单元测试（待实现）

public/
└── test-matrix-tree.html      # 可视化测试界面
```

### 数据结构

#### MatrixNode (节点接口)

```typescript
interface MatrixNode {
  // 节点身份
  wallet_address: string;
  activation_sequence: number;

  // 树关系
  parent_wallet: string | null;
  position: 'L' | 'M' | 'R' | null;
  layer: number; // 0-19

  // 子节点 (最多3个)
  children: {
    L?: MatrixNode;
    M?: MatrixNode;
    R?: MatrixNode;
  };

  // 矩阵属性
  matrix_root_wallet: string;
  referral_type: 'direct' | 'spillover';
  placed_at: Date;

  // 成员属性
  current_level: number;
  referrer_wallet: string | null;
}
```

#### MatrixTree (树类)

```typescript
class MatrixTree {
  private root: MatrixNode;
  private maxDepth = 19;
  private maxChildrenPerNode = 3;

  // 基本操作
  insertMember(...)         // 插入新成员
  findNode(...)             // 查找节点
  getChildren(...)          // 获取直接子节点
  getDescendants(...)       // 获取所有后代
  getPathToNode(...)        // 获取路径

  // 查询方法
  getNodesAtLayer(...)      // 获取特定层的所有节点
  getTotalNodes()           // 获取总节点数
  getTreeHeight()           // 获取树高度
  getLayerStatistics()      // 获取层统计信息

  // 工具方法
  serialize()               // 序列化为数组
  validate()                // 验证树完整性
  printTree()               // 打印树结构
}
```

## 🚀 核心功能

### 1. 插入成员 (BFS + LMR)

使用广度优先搜索，按L→M→R顺序查找第一个可用位置：

```typescript
const tree = new MatrixTree(genesisWallet, 0);

const placement = tree.insertMember(
  memberWallet,
  activationSequence,
  referrerWallet,
  'direct' // or 'spillover'
);

// 返回: { layer: 1, position: 'L', parentWallet: '0x...' }
```

**插入算法**:
1. 从根节点开始
2. 使用队列进行BFS遍历
3. 对每个节点，按L→M→R顺序检查
4. 找到第一个空位置即插入
5. 不超过19层深度限制

### 2. 查找节点

```typescript
// 根据钱包地址查找
const node = tree.findNode(walletAddress);

if (node) {
  console.log('Layer:', node.layer);
  console.log('Position:', node.position);
  console.log('Parent:', node.parent_wallet);
}
```

### 3. 获取子节点和后代

```typescript
// 获取直接子节点（L, M, R）
const children = tree.getChildren(walletAddress);
console.log('Children count:', children.length);

// 获取所有后代（整个子树）
const descendants = tree.getDescendants(walletAddress);
console.log('Total descendants:', descendants.length);
```

### 4. 层级查询

```typescript
// 获取特定层的所有成员
const layer1 = tree.getNodesAtLayer(1);
const layer2 = tree.getNodesAtLayer(2);

// 获取层统计信息
const stats = tree.getLayerStatistics();
/*
[
  {
    layer: 1,
    nodeCount: 3,
    maxCapacity: 3,
    occupancyRate: 100
  },
  ...
]
*/
```

### 5. 路径查询

```typescript
// 获取从根到某节点的路径（祖先）
const path = tree.getPathToNode(memberWallet);

// 示例输出:
// [genesis] → [layer1_L] → [layer2_M] → [target]
```

### 6. 树验证

```typescript
const validation = tree.validate();

if (validation.isValid) {
  console.log('✅ Tree structure is valid!');
} else {
  console.log('❌ Validation errors:');
  validation.errors.forEach(error => console.log(' -', error));
}
```

验证检查项：
- 父子关系一致性
- 无重复节点
- 层级分配正确
- 位置（L/M/R）正确
- 未超过最大深度

### 7. 序列化

```typescript
// 序列化为平面数组（BFS顺序）
const serialized = tree.serialize();

// 可直接插入数据库
/*
[
  {
    member_wallet: '0x...',
    parent_wallet: null,
    position: null,
    layer: 0,
    matrix_root_wallet: '0x...'
  },
  ...
]
*/
```

## 💾 数据库集成

### 从数据库构建树

```typescript
import { buildMatrixTreeFromDatabase } from './MatrixTree';

// 1. 从Supabase获取数据
const { data: matrixRecords } = await supabase
  .from('matrix_referrals')
  .select('*')
  .eq('matrix_root_wallet', rootWallet);

const { data: members } = await supabase
  .from('members')
  .select('*');

// 2. 合并数据
const enrichedRecords = matrixRecords.map(mr => ({
  ...mr,
  activation_sequence: members.find(m =>
    m.wallet_address === mr.member_wallet
  )?.activation_sequence || 0,
  // ... 其他字段
}));

// 3. 构建树
const tree = buildMatrixTreeFromDatabase(rootWallet, enrichedRecords);

// 4. 使用树
console.log('Total nodes:', tree.getTotalNodes());
console.log('Tree height:', tree.getTreeHeight());
```

### 同步到数据库

```typescript
// 序列化树
const records = tree.serialize();

// 批量插入到 matrix_referrals 表
const { error } = await supabase
  .from('matrix_referrals')
  .upsert(records);
```

## 📊 性能特性

### 时间复杂度

| 操作 | 复杂度 | 说明 |
|------|--------|------|
| insertMember | O(n) | BFS遍历，最坏情况遍历所有节点 |
| findNode | O(n) | BFS查找 |
| getChildren | O(1) | 直接访问子节点 |
| getDescendants | O(n) | DFS遍历子树 |
| getNodesAtLayer | O(n) | BFS到目标层 |
| validate | O(n) | 遍历所有节点 |
| serialize | O(n) | BFS遍历 |

### 空间复杂度

- 树存储: O(n) - n个节点
- BFS队列: O(w) - w为最宽层的节点数
- 递归栈: O(h) - h为树高度（最大19）

### 优化建议

1. **缓存查询结果**: 对于频繁查询的节点，使用Map缓存
2. **批量操作**: 一次插入多个节点时，批量更新
3. **惰性加载**: 对于超大树，按需加载子树
4. **索引**: 在wallet_address上建立索引加速查找

## 🧪 测试

### 运行测试界面

```bash
# 启动开发服务器
npm run dev

# 打开浏览器
http://localhost:5005/test-matrix-tree.html
```

测试界面功能：
- ✅ 从数据库加载真实数据
- ✅ 创建模拟树进行测试
- ✅ 验证树结构完整性
- ✅ 显示层级统计
- ✅ 可视化树结构
- ✅ 查找和遍历节点

### 运行示例代码

```typescript
import { runAllExamples } from './MatrixTree.examples';
import { supabase } from './supabase';

// 运行所有示例
await runAllExamples(supabase);
```

## 🔧 高级用法

### 1. 自定义遍历

```typescript
// 只遍历直接推荐的成员
const directReferrals = tree.getDescendants(wallet)
  .filter(node => node.referral_type === 'direct');

// 按激活顺序排序
const sorted = descendants.sort((a, b) =>
  a.activation_sequence - b.activation_sequence
);
```

### 2. 统计分析

```typescript
// 计算每层的溢出比例
const stats = tree.getLayerStatistics();
stats.forEach(({ layer, nodeCount, maxCapacity }) => {
  const spilloverRate = (1 - nodeCount / maxCapacity) * 100;
  console.log(`Layer ${layer} spillover space: ${spilloverRate.toFixed(2)}%`);
});
```

### 3. 子树操作

```typescript
// 获取某成员的整个团队
const team = tree.getDescendants(memberWallet);

// 统计团队规模
const teamSize = team.length;

// 按层级分组
const byLayer = team.reduce((acc, member) => {
  if (!acc[member.layer]) acc[member.layer] = [];
  acc[member.layer].push(member);
  return acc;
}, {});
```

## 📐 数学模型

### 层容量

```
Layer 1: 3^1 =  3 slots
Layer 2: 3^2 =  9 slots
Layer 3: 3^3 = 27 slots
...
Layer 19: 3^19 = 1,162,261,467 slots
```

### 累积容量

```
Total capacity from Layer 1 to N:
Σ(3^i) for i=1 to N = (3^(N+1) - 3) / 2
```

### 占用率计算

```typescript
occupancyRate = (actualNodes / maxCapacity) * 100
```

## 🛠️ 故障排除

### 常见问题

1. **"Position is null"**
   - 原因: 数据库中position字段未设置
   - 解决: 运行 `fix-matrix-positions-v2.sql` 修复

2. **"Parent not found"**
   - 原因: 父节点记录不完整
   - 解决: 按layer排序，确保父节点先处理

3. **"Duplicate wallet"**
   - 原因: 同一钱包地址出现多次
   - 解决: 使用 `validate()` 检测并清理

4. **"Layer mismatch"**
   - 原因: 节点的layer与实际深度不符
   - 解决: 重新计算并更新layer字段

## 📝 最佳实践

1. **初始化**
   - 始终验证根节点存在
   - 检查activation_sequence的唯一性

2. **插入**
   - 使用事务确保原子性
   - 插入前验证推荐人存在

3. **查询**
   - 缓存频繁访问的节点
   - 使用批量查询减少往返

4. **维护**
   - 定期运行 `validate()` 检查完整性
   - 监控树的增长和容量

5. **性能**
   - 限制单次查询的深度
   - 对大型树使用分页

## 🔗 相关文件

- `src/lib/MatrixTree.ts` - 核心实现
- `src/lib/MatrixTree.examples.ts` - 使用示例
- `public/test-matrix-tree.html` - 测试界面
- `fix-matrix-positions-v2.sql` - 数据库修复脚本
- `supabase/functions/admin-system-check/index.ts` - 系统检查

## 📖 参考资料

- [GeeksforGeeks - Tree Data Structure](https://www.geeksforgeeks.org/dsa/introduction-to-tree-data-structure/)
- [Binary Tree vs Ternary Tree](https://en.wikipedia.org/wiki/Ternary_tree)
- [Breadth-First Search](https://en.wikipedia.org/wiki/Breadth-first_search)
- [Depth-First Search](https://en.wikipedia.org/wiki/Depth-first_search)

## 🎯 下一步

- [ ] 实现单元测试套件
- [ ] 添加树的可视化组件（React）
- [ ] 支持增量更新（不重建整棵树）
- [ ] 实现树的序列化/反序列化（JSON）
- [ ] 添加并发插入支持（锁机制）
- [ ] 性能基准测试

## 👥 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

---

**构建时间**: 2025-10-29
**版本**: 1.0.0
**作者**: Beehive Platform Team

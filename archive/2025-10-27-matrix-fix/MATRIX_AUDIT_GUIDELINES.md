# 矩阵审计指南 - 分布式递归结构

## 核心概念

本项目采用**分布式递归矩阵**结构，不是全局BFS树。每个矩阵root独立管理自己的19层树。

## 正确的矩阵理解

### 1. 19层结构定义

```
Root (根节点)
├─ Layer 1: Root的3个直推子节点 (L, M, R位置)
├─ Layer 2: Layer 1的3个节点各有3个子节点 = 9个节点
├─ Layer 3: Layer 2的9个节点各有3个子节点 = 27个节点
├─ Layer 4: Layer 3的27个节点各有3个子节点 = 81个节点
├─ ...
└─ Layer 19: 第19层节点
```

**重要：**
- Root本身不计入层数，或视为Layer 0
- Layer 1 = Root的直接子节点（3个）
- Layer 2 = Root的孙子节点（9个）
- 依此类推到Layer 19

### 2. 分布式特性

#### 2.1 独立性
- **每个矩阵root有自己独立的19层限制**
- Root A的Layer 19 和 Root B的Layer 19 互不影响
- 系统中可以有1000+个不同的"Layer 1"组，这是**正常且正确的**

#### 2.2 递归性
- 每个referrer按照**自己的层级限制**往下安置新成员
- 下层成员可能已经有自己的直推，形成自己的子树
- 子树的形成是递归的：
  - 成员A在Root X的Layer 5
  - 成员A自己也可以是另一个矩阵的root
  - 成员A的直推会先填充成员A的矩阵
  - 如果成员A矩阵满了，会滑落到Root X的矩阵中

### 3. 激活顺序与滑落机制

#### 3.1 激活顺序
成员的激活时间（membership的created_at）决定了滑落顺序：
- 先激活的成员优先占据上层位置
- 后激活的成员向下滑落

#### 3.2 滑落逻辑
```
1. 新成员B被A推荐
2. 首先尝试放入A的直接位置（L/M/R）
3. 如果A的位置已满：
   - 查找A的子树中最早的可用位置（BFS顺序）
   - 按照L→M→R的优先级
4. 如果A的整个矩阵（19层）都满了：
   - 触发溢出机制
   - 查找A的上级矩阵中的可用位置
```

## 审计检查项

### ✅ 正确的检查

1. **层级限制检查**
   ```sql
   -- 检查每个矩阵root的最大层级
   SELECT
     matrix_root_wallet,
     MAX(layer) as max_layer
   FROM matrix_referrals
   GROUP BY matrix_root_wallet
   HAVING MAX(layer) > 19;
   ```

2. **父子关系完整性**
   ```sql
   -- 验证每个节点的父节点存在于同一矩阵
   SELECT
     child.wallet,
     child.layer,
     parent.wallet as parent_wallet,
     parent.layer as parent_layer
   FROM matrix_referrals child
   LEFT JOIN matrix_referrals parent
     ON child.parent_wallet = parent.wallet
     AND child.matrix_root_wallet = parent.matrix_root_wallet
   WHERE child.parent_wallet IS NOT NULL
     AND parent.wallet IS NULL;
   ```

3. **L/M/R位置完整性**
   ```sql
   -- 检查每个父节点的子节点数（应≤3）
   SELECT
     parent_wallet,
     matrix_root_wallet,
     COUNT(*) as child_count,
     array_agg(position ORDER BY position) as positions
   FROM matrix_referrals
   WHERE parent_wallet IS NOT NULL
   GROUP BY parent_wallet, matrix_root_wallet
   HAVING COUNT(*) > 3;
   ```

4. **层级连续性**
   ```sql
   -- 在单个矩阵内，layer N+1的所有节点的父节点应该在layer N
   SELECT
     child.matrix_root_wallet,
     child.layer as child_layer,
     parent.layer as parent_layer,
     child.wallet
   FROM matrix_referrals child
   JOIN matrix_referrals parent
     ON child.parent_wallet = parent.wallet
     AND child.matrix_root_wallet = parent.matrix_root_wallet
   WHERE child.layer != parent.layer + 1;
   ```

### ❌ 错误的检查

1. **不要检查全局Layer 1只有1个节点**
   - 错误：认为整个系统只能有1个Layer 1
   - 正确：每个矩阵root有自己的Layer 1（3个节点）

2. **不要使用全局BFS验证**
   - 错误：期望整个系统是一棵完整的BFS树
   - 正确：每个矩阵root是独立的BFS树

3. **不要混淆层级计算基准**
   - 错误：认为layer是相对于直接推荐人
   - 正确：layer是相对于matrix_root_wallet

## 代码审计要点

### 1. fn_place_in_matrix 函数

应该检查的要点：
- [ ] 是否正确计算从matrix_root到新成员的层级距离？
- [ ] 是否在超过19层时触发溢出？
- [ ] BFS遍历是否正确实现（按层级、按L→M→R顺序）？
- [ ] 是否正确处理NULL layer的情况？

### 2. 溢出机制

应该检查的要点：
- [ ] 当矩阵达到19层时是否触发？
- [ ] 溢出逻辑是否引用正确的表名？
- [ ] 是否正确查找下一个可用矩阵？
- [ ] 是否记录溢出事件？

### 3. 触发器和约束

应该检查的要点：
- [ ] 是否有约束限制layer <= 19？
- [ ] 是否有约束限制每个父节点最多3个子节点？
- [ ] 是否有触发器验证层级连续性？
- [ ] 是否有触发器验证matrix_root的存在性？

## Agent调用模板

当需要审计矩阵逻辑时，使用以下prompt模板：

```markdown
请审计19层分布式递归矩阵的实现。

**关键理解：**
1. 这是分布式矩阵，不是全局BFS树
2. 每个矩阵root有独立的19层限制
3. Layer计算是相对于matrix_root，不是相对于parent
4. 多个"Layer 1"组是正常的（每个root有自己的Layer 1）

**检查项：**
1. 每个matrix_root的树深度是否超过19层？
2. 父子关系是否在同一矩阵内？
3. 层级连续性是否正确（child.layer = parent.layer + 1）？
4. 每个父节点的子节点数是否≤3？
5. 溢出机制是否正常工作？

**数据库连接：**
postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres?sslmode=require
```

## 常见误解澄清

### 误解1：全局只应该有1个Layer 1
**错误：** 认为整个系统应该只有根节点的3个子节点作为Layer 1
**正确：** 每个矩阵root都有自己的Layer 1（3个节点），系统中有N个root就有N个"Layer 1组"

### 误解2：所有成员在同一棵树上
**错误：** 认为所有成员形成一棵大的全局树
**正确：** 系统由多个独立的19层树组成，每个active membership是一个root

### 误解3：Layer是相对于直接推荐人
**错误：** 认为layer字段表示距离直接parent的距离
**正确：** layer字段表示距离matrix_root_wallet的距离

### 误解4：BFS应该是全局的
**错误：** 期望整个系统按照单一的BFS顺序排列
**正确：** 每个矩阵root内部使用BFS，但矩阵之间是独立的

## 数据示例

### 正确的数据结构示例

```
Matrix Root A (0xAAA...)
├─ Layer 1
│  ├─ 0xB1... (L)
│  ├─ 0xB2... (M)
│  └─ 0xB3... (R)
├─ Layer 2
│  ├─ 0xC1... (parent: B1, pos: L)
│  ├─ 0xC2... (parent: B1, pos: M)
│  ├─ 0xC3... (parent: B1, pos: R)
│  ├─ 0xC4... (parent: B2, pos: L)
│  └─ ... (共9个节点)
└─ ...

Matrix Root B (0xBBB...) - 独立的树
├─ Layer 1
│  ├─ 0xD1... (L)
│  ├─ 0xD2... (M)
│  └─ 0xD3... (R)
└─ ...
```

注意：Matrix Root A的Layer 1和Matrix Root B的Layer 1是**完全独立**的，这是正确的！

---

**文档版本：** 1.0
**最后更新：** 2025-10-12
**维护者：** Backend Team

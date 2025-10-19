# 正确的 BFS 矩阵放置算法设计

**设计时间**: 2025-10-19
**目的**: 修复 generation_based_dual_mode 的错误逻辑
**优先级**: P0 - CRITICAL

---

## 🎯 核心需求

### 1. 三叉树 BFS 结构

```
Matrix Root (0x982282D7...)
│
├─ Layer 1 (最多3个位置)
│   ├─ L (左)
│   ├─ M (中)
│   └─ R (右)
│
├─ Layer 2 (最多9个位置)
│   ├─ L 的子节点
│   │   ├─ L.L
│   │   ├─ L.M
│   │   └─ L.R
│   ├─ M 的子节点
│   │   ├─ M.L
│   │   ├─ M.M
│   │   └─ M.R
│   └─ R 的子节点
│       ├─ R.L
│       ├─ R.M
│       └─ R.R
│
└─ Layer 3 (最多27个位置)
    └─ ... (每个Layer 2成员可以有3个子节点)
```

### 2. 关键规则

1. **Layer = parent_depth**: 矩阵层级必须等于 parent_depth
2. **BFS 顺序**: 按层填充，优先填满上层再填下层
3. **L→M→R 顺序**: 在同一父节点下，按 L、M、R 顺序查找可用位置
4. **双记录机制**:
   - 记录1: 在上线矩阵中（member_wallet = 新成员）
   - 记录2: 在新成员自己的矩阵中（matrix_root_wallet = 新成员）
5. **时间顺序**: 按 activation_time + activation_sequence 确定先后

---

## 📐 算法设计

### 伪代码

```sql
FUNCTION place_member_bfs(
    p_matrix_root_wallet TEXT,      -- 矩阵根钱包
    p_member_wallet TEXT,            -- 新成员钱包
    p_referral_type TEXT             -- 'direct' 或 'spillover'
) RETURNS void AS $$
DECLARE
    v_layer INT;
    v_parent_wallet TEXT;
    v_position TEXT;
    v_found BOOLEAN := FALSE;
BEGIN
    -- Step 1: BFS 搜索第一个可用位置
    FOR v_layer IN 1..19 LOOP
        -- 获取当前层的所有潜在父节点（按BFS顺序）
        FOR v_parent_candidate IN (
            SELECT member_wallet
            FROM get_layer_parents(p_matrix_root_wallet, v_layer)
            ORDER BY placement_order  -- BFS顺序
        ) LOOP
            -- 检查 L, M, R 三个位置
            FOR v_position IN ARRAY['L', 'M', 'R'] LOOP
                -- 检查位置是否可用
                IF NOT position_occupied(
                    p_matrix_root_wallet,
                    v_parent_candidate,
                    v_layer,
                    v_position
                ) THEN
                    -- 找到可用位置！
                    v_parent_wallet := v_parent_candidate;
                    v_found := TRUE;
                    EXIT;  -- 跳出位置循环
                END IF;
            END LOOP;

            EXIT WHEN v_found;  -- 跳出父节点循环
        END LOOP;

        EXIT WHEN v_found;  -- 跳出层级循环
    END LOOP;

    -- Step 2: 插入记录（在上线矩阵中）
    INSERT INTO matrix_referrals (
        matrix_root_wallet,
        member_wallet,
        parent_wallet,
        layer,
        parent_depth,           -- ← 必须等于 layer！
        position,
        referral_type,
        source
    ) VALUES (
        p_matrix_root_wallet,
        p_member_wallet,
        v_parent_wallet,
        v_layer,
        v_layer,                -- ← parent_depth = layer
        v_position,
        p_referral_type,
        'bfs_placement_v2'
    );

    -- Step 3: 创建双记录（新成员自己的矩阵根记录）
    -- 注意：这个是为了未来新成员有下线时使用
    -- 如果新成员还没有下线，这个记录会保持空矩阵状态

END;
$$ LANGUAGE plpgsql;
```

### 辅助函数

#### 1. 获取层级的父节点列表

```sql
FUNCTION get_layer_parents(
    p_matrix_root TEXT,
    p_target_layer INT
) RETURNS TABLE(member_wallet TEXT, placement_order INT) AS $$
BEGIN
    IF p_target_layer = 1 THEN
        -- Layer 1 的父节点就是矩阵根本身
        RETURN QUERY
        SELECT p_matrix_root, 1;
    ELSE
        -- 其他层级的父节点是上一层的所有成员
        RETURN QUERY
        SELECT
            mr.member_wallet,
            ROW_NUMBER() OVER (
                ORDER BY mr.created_at, mr.id
            )::INT as placement_order
        FROM matrix_referrals mr
        WHERE mr.matrix_root_wallet = p_matrix_root
          AND mr.layer = p_target_layer - 1
        ORDER BY placement_order;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

#### 2. 检查位置是否已占用

```sql
FUNCTION position_occupied(
    p_matrix_root TEXT,
    p_parent_wallet TEXT,
    p_layer INT,
    p_position TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM matrix_referrals
        WHERE matrix_root_wallet = p_matrix_root
          AND parent_wallet = p_parent_wallet
          AND layer = p_layer
          AND position = p_position
    );
END;
$$ LANGUAGE plpgsql;
```

---

## 🔄 双记录机制详解

### 概念

每个成员在矩阵系统中有两种身份：

1. **作为子节点** (`member_wallet`): 被放置在上线的矩阵中
2. **作为矩阵根** (`matrix_root_wallet`): 拥有自己的矩阵树

### 实现策略

#### 方案A: 延迟创建（推荐）

**策略**: 只在成员有第一个下线时，才创建 matrix_root 记录

```sql
-- 当新成员注册时
-- 1. 只在上线矩阵中创建记录
INSERT INTO matrix_referrals (
    matrix_root_wallet = '上线钱包',
    member_wallet = '新成员',
    ...
);

-- 2. 当新成员第一次有下线时，才创建自己的 matrix_root 初始记录
-- 这样避免创建大量空矩阵记录
```

**优点**:
- 数据库记录更少
- 只有活跃的矩阵才有记录
- 查询性能更好

**缺点**:
- 需要在插入时检查 matrix_root 是否存在
- 逻辑稍微复杂

#### 方案B: 立即创建

**策略**: 每个成员注册时立即创建自己的 matrix_root 初始记录

```sql
-- 当新成员注册时
-- 1. 在上线矩阵中创建记录
INSERT INTO matrix_referrals (...);

-- 2. 立即创建成员自己的 matrix_root 初始记录
-- （即使还没有下线）
INSERT INTO matrix_referrals (
    matrix_root_wallet = '新成员',
    member_wallet = '新成员',  -- 自己
    parent_wallet = '新成员',
    layer = 0,                  -- 特殊层级表示根
    parent_depth = 0,
    position = 'ROOT',
    referral_type = 'self',
    source = 'auto_root_creation'
);
```

**优点**:
- 逻辑简单
- 所有成员都有完整的 matrix_root 记录
- 方便统计和查询

**缺点**:
- 大量空矩阵记录
- 数据库记录数翻倍
- 可能影响查询性能

### 推荐方案: 方案A（延迟创建）

**原因**:
1. 大部分成员不会发展下线
2. 减少数据库负担
3. 更符合实际业务场景

**实现**:
```sql
FUNCTION ensure_matrix_root_exists(p_member_wallet TEXT) RETURNS void AS $$
BEGIN
    -- 检查是否已经有 matrix_root 记录
    IF NOT EXISTS (
        SELECT 1 FROM matrix_referrals
        WHERE matrix_root_wallet = p_member_wallet
    ) THEN
        -- 创建初始 matrix_root 记录（Layer 0）
        INSERT INTO matrix_referrals (
            matrix_root_wallet,
            member_wallet,
            parent_wallet,
            layer,
            parent_depth,
            position,
            referral_type,
            source
        ) VALUES (
            p_member_wallet,
            p_member_wallet,
            p_member_wallet,
            0,
            0,
            'ROOT',
            'self',
            'auto_root_init'
        );
    END IF;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔧 修复现有数据的步骤

### Step 1: 修复 parent_depth 字段

```sql
-- 修复所有 parent_depth != layer 的记录
UPDATE matrix_referrals
SET parent_depth = layer
WHERE parent_depth != layer;

-- 验证
SELECT
    COUNT(*) as total,
    SUM(CASE WHEN parent_depth = layer THEN 1 ELSE 0 END) as correct,
    SUM(CASE WHEN parent_depth != layer THEN 1 ELSE 0 END) as incorrect
FROM matrix_referrals;
```

### Step 2: 识别缺失的 matrix_root 记录

```sql
-- 找出所有应该有 matrix_root 但缺失的成员
WITH all_members AS (
    SELECT DISTINCT member_wallet
    FROM matrix_referrals
),
has_matrix_root AS (
    SELECT DISTINCT matrix_root_wallet as wallet
    FROM matrix_referrals
)
SELECT
    am.member_wallet as "缺失matrix_root的成员"
FROM all_members am
LEFT JOIN has_matrix_root hmr ON am.member_wallet = hmr.wallet
WHERE hmr.wallet IS NULL
  AND am.member_wallet != '0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3'; -- 排除系统根
```

### Step 3: 创建缺失的 matrix_root 记录

**策略**: 只为已经有下线的成员创建 matrix_root 记录

```sql
-- 为已经有下线的成员创建 matrix_root 初始记录
INSERT INTO matrix_referrals (
    matrix_root_wallet,
    member_wallet,
    parent_wallet,
    layer,
    parent_depth,
    position,
    referral_type,
    source
)
SELECT DISTINCT
    mr.member_wallet,      -- 该成员作为 matrix_root
    mr.member_wallet,      -- 自己
    mr.member_wallet,      -- 父节点是自己
    0,                     -- Layer 0 表示根
    0,
    'ROOT',
    'self',
    'backfill_missing_root'
FROM matrix_referrals mr
WHERE NOT EXISTS (
    SELECT 1 FROM matrix_referrals mr2
    WHERE mr2.matrix_root_wallet = mr.member_wallet
)
  AND mr.member_wallet IN (
      -- 只为已经有下线的成员创建（作为 parent_wallet 出现）
      SELECT DISTINCT parent_wallet
      FROM matrix_referrals
  );
```

---

## 🧪 测试用例

### 测试1: Layer 1 最多3个成员

```sql
-- 测试矩阵根的 Layer 1 只有3个成员
SELECT
    COUNT(*) as layer1_count,
    CASE
        WHEN COUNT(*) <= 3 THEN '✓ 正确'
        ELSE '✗ 错误：超过3个'
    END as status
FROM matrix_referrals
WHERE matrix_root_wallet = '0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3'
  AND layer = 1;
```

### 测试2: Layer 2 的 parent_wallet 必须是 Layer 1 成员

```sql
-- 测试 Layer 2 的所有 parent_wallet 都在 Layer 1 中
WITH layer1_members AS (
    SELECT member_wallet
    FROM matrix_referrals
    WHERE matrix_root_wallet = '0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3'
      AND layer = 1
)
SELECT
    mr.member_wallet,
    mr.parent_wallet,
    CASE
        WHEN mr.parent_wallet IN (SELECT member_wallet FROM layer1_members)
        THEN '✓ 正确'
        ELSE '✗ 错误：parent不在Layer 1'
    END as status
FROM matrix_referrals mr
WHERE mr.matrix_root_wallet = '0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3'
  AND mr.layer = 2;
```

### 测试3: parent_depth = layer

```sql
-- 测试所有记录的 parent_depth 都等于 layer
SELECT
    layer,
    COUNT(*) as total,
    SUM(CASE WHEN parent_depth = layer THEN 1 ELSE 0 END) as correct,
    SUM(CASE WHEN parent_depth != layer THEN 1 ELSE 0 END) as incorrect
FROM matrix_referrals
WHERE matrix_root_wallet = '0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3'
GROUP BY layer
ORDER BY layer;
```

### 测试4: 每个父节点最多3个子节点

```sql
-- 测试每个父节点的子节点数不超过3个
SELECT
    parent_wallet,
    layer,
    COUNT(*) as child_count,
    CASE
        WHEN COUNT(*) <= 3 THEN '✓ 正确'
        ELSE '✗ 错误：超过3个子节点'
    END as status
FROM matrix_referrals
WHERE matrix_root_wallet = '0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3'
GROUP BY parent_wallet, layer
HAVING COUNT(*) > 3;
```

### 测试5: 位置唯一性

```sql
-- 测试同一父节点下的位置不重复
SELECT
    matrix_root_wallet,
    parent_wallet,
    layer,
    position,
    COUNT(*) as duplicate_count,
    CASE
        WHEN COUNT(*) = 1 THEN '✓ 正确'
        ELSE '✗ 错误：位置重复'
    END as status
FROM matrix_referrals
GROUP BY matrix_root_wallet, parent_wallet, layer, position
HAVING COUNT(*) > 1;
```

---

## 📊 数据完整性约束

建议添加以下数据库约束：

```sql
-- 1. parent_depth 必须等于 layer
ALTER TABLE matrix_referrals
ADD CONSTRAINT check_parent_depth_equals_layer
CHECK (parent_depth = layer OR layer = 0);

-- 2. 位置唯一性（同一父节点下不能有重复位置）
CREATE UNIQUE INDEX idx_unique_position
ON matrix_referrals (matrix_root_wallet, parent_wallet, layer, position)
WHERE position IN ('L', 'M', 'R');

-- 3. 位置只能是 L, M, R, ROOT
ALTER TABLE matrix_referrals
ADD CONSTRAINT check_position_values
CHECK (position IN ('L', 'M', 'R', 'ROOT'));

-- 4. Layer 范围检查
ALTER TABLE matrix_referrals
ADD CONSTRAINT check_layer_range
CHECK (layer >= 0 AND layer <= 19);
```

---

## 🚀 实施计划

### Phase 1: 立即修复（今天）
1. ✅ 修复 parent_depth 字段错误
2. ✅ 验证数据完整性

### Phase 2: 创建新函数（明天）
1. 实现 `place_member_bfs_v2()` 函数
2. 实现辅助函数
3. 单元测试

### Phase 3: 数据迁移（后天）
1. 备份现有数据
2. 运行修复脚本
3. 验证修复结果

### Phase 4: 上线（下周）
1. 切换到新函数
2. 监控新注册
3. 验证新数据正确性

---

## ⚠️ 风险评估

### 高风险项
1. **数据一致性**: 修复过程中可能破坏现有数据
   - **缓解**: 完整备份 + 事务回滚
2. **新旧数据混合**: 新算法与旧数据不兼容
   - **缓解**: 全量数据修复后再切换

### 中风险项
1. **性能影响**: BFS 搜索可能较慢
   - **缓解**: 添加索引，优化查询
2. **边界情况**: 19层满了怎么办
   - **缓解**: 添加错误处理和日志

---

**设计完成**: 2025-10-19
**状态**: ✅ 设计完成，等待实施
**下一步**: 创建立即修复 SQL 脚本

# 矩阵系统分析与同步需求

## 📋 基于 MarketingPlan.md 的矩阵系统要求

### 🎯 矩阵结构 (3x3 Matrix System)
- **层级**: 最多19层
- **每层容量**: 
  - 层级1: 3个成员 (L, M, R)
  - 层级2: 9个成员 (3²)
  - 层级3: 27个成员 (3³)
  - ...
  - 层级19: 3¹⁹个成员

### 🔄 放置规则 (Placement Rules)
1. 找到推荐人在推荐树中的位置
2. 定位第一个不完整的下线层级（L → M → R 优先级）
3. 将新成员作为该不完整成员的第一层下线放置

### 📊 当前数据库问题分析

#### ❌ 缺失的字段和表
基于错误信息和系统需求，需要以下结构：

1. **referrals 表缺失字段**:
   - `matrix_parent` - 矩阵父节点
   - `matrix_position` - 矩阵位置 (L, M, R)
   - `matrix_layer` - 矩阵层级 (1-19)
   - `matrix_root` - 矩阵根节点
   - `placement_order` - 放置顺序

2. **可能缺失的表**:
   - `matrix_positions` - 矩阵位置追踪
   - `layer_rewards` - 层级奖励
   - `roll_up_rewards` - 上滚奖励

### 🎯 同步需求

#### 1. **Basic Referral → Matrix 同步**
- 将现有的 referrer → referrals 关系转换为完整的矩阵结构
- 需要计算每个成员的矩阵位置、层级、父节点

#### 2. **Matrix Parent 计算**
- 根据3x3矩阵规则计算每个成员的实际矩阵父节点
- 矩阵父节点可能不等于直接推荐人（spillover效应）

#### 3. **Layer 和 Position 计算**
- 基于放置顺序和矩阵规则计算准确的层级和位置

## 🔧 需要的数据结构

```sql
-- 扩展 referrals 表
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS matrix_parent TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS matrix_position TEXT; -- 'L', 'M', 'R'
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS matrix_layer INTEGER;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS matrix_root TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS placement_order INTEGER;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- 创建矩阵位置表
CREATE TABLE IF NOT EXISTS matrix_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_wallet TEXT NOT NULL,
    matrix_parent TEXT,
    matrix_root TEXT NOT NULL,
    layer_number INTEGER NOT NULL,
    position_in_layer TEXT NOT NULL, -- 'L', 'M', 'R'
    placement_order INTEGER,
    is_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(member_wallet, matrix_root)
);

-- 创建层级奖励表
CREATE TABLE IF NOT EXISTS layer_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    root_member TEXT NOT NULL,
    triggering_member TEXT NOT NULL,
    layer_number INTEGER NOT NULL,
    reward_amount DECIMAL(18,6) NOT NULL,
    reward_currency TEXT DEFAULT 'USDC',
    status TEXT DEFAULT 'pending', -- pending, claimable, claimed, rolled_up
    expires_at TIMESTAMP,
    claimed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 🚀 同步算法

### Phase 1: 基础结构同步
1. 确保所有有推荐人的成员都在 referrals 表中
2. 添加缺失的矩阵字段

### Phase 2: 矩阵位置计算
1. 按照激活顺序重建矩阵结构
2. 实施3x3矩阵放置算法
3. 计算每个成员的实际矩阵父节点和位置

### Phase 3: 奖励系统同步  
1. 基于矩阵结构计算应有的层级奖励
2. 检查待领取/上滚的奖励状态

## 🎯 关键算法：矩阵放置

```
function placeMemberInMatrix(newMember, referrer):
    1. 找到推荐人的矩阵根
    2. 从根开始遍历矩阵，寻找第一个可用位置:
       - 层级1优先级: L → M → R
       - 如果层级1满，检查层级2
       - 使用广度优先搜索
    3. 在找到的位置放置成员
    4. 更新矩阵父节点（可能不是直接推荐人）
    5. 计算层级和位置编码
    6. 检查是否触发层级奖励
```

这个分析为完整的矩阵同步提供了基础。
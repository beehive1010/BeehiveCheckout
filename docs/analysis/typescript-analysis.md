# TypeScript 错误分析和状态管理建议

## 当前状态
- 总错误数：**443个**
- 主要错误类型分析

## 1. 主要TypeScript错误分类

### A. 数据库Schema相关错误（约60%）
```typescript
// 不存在的列
Property 'total_usdt_earned' does not exist on type 'SelectQueryError<"column 'bcc_restricted' does not exist on 'user_balances'.">'
Property 'bcc_transferable' does not exist
Property 'bcc_locked' does not exist
```

**解决方案：**
- 数据库迁移：创建缺失的列
- 临时类型转换：`(data as any)?.column_name`

### B. 缺失的函数/模块（约20%）
```typescript
Cannot find name 'callEdgeFunction'
Cannot find module '../membership/MembershipActivationSystem'
Property 'getLevelInfo' does not exist
```

**解决方案：**
- 创建缺失的工具函数
- 移除不存在的导入

### C. 类型不匹配错误（约15%）
```typescript
Type 'string' is not assignable to type 'number[]'
'error' is of type 'unknown'
Property 'success' does not exist
```

**解决方案：**
- 定义正确的接口类型
- 使用类型守卫和断言

### D. React组件相关错误（约5%）
```typescript
JSX element type does not have any construct signatures
Missing return statement in function returning JSX
```

## 2. 建议的状态管理架构

### A. 当前状态管理问题
1. **分散的状态管理**：多个组件独立管理相似状态
2. **缺乏类型安全**：很多状态没有明确的TypeScript类型
3. **重复的API调用**：相同数据在多个组件中重复获取
4. **状态同步问题**：会员状态更新后其他组件不同步

### B. 推荐的状态管理解决方案

#### 方案1：增强现有的React Query + Context
```typescript
// 优点：已经在使用，渐进式改进
// 适用：中小型应用，当前架构

// src/contexts/MembershipContext.tsx
interface MembershipState {
  currentLevel: number;
  membershipData: MemberData | null;
  isLoading: boolean;
  error: Error | null;
}

// 使用React Query作为数据缓存层
// Context提供全局状态访问
```

#### 方案2：Zustand（推荐）
```typescript
// 优点：轻量级，TypeScript友好，易于使用
// 适用：当前项目规模

// src/stores/membershipStore.ts
interface MembershipStore {
  // State
  currentLevel: number;
  memberData: MemberData | null;
  isLoading: boolean;
  
  // Actions
  updateMembershipLevel: (level: number) => void;
  fetchMemberData: (walletAddress: string) => Promise<void>;
  reset: () => void;
}

const useMembershipStore = create<MembershipStore>((set, get) => ({
  // 实现
}));
```

#### 方案3：Redux Toolkit（如果需要复杂状态管理）
```typescript
// 优点：强大的开发工具，复杂状态管理
// 缺点：学习曲线，代码量大
// 适用：大型应用，复杂业务逻辑
```

## 3. 立即修复建议

### A. 创建缺失的工具函数
```typescript
// src/lib/edgeFunctions.ts
export async function callEdgeFunction(
  functionName: string, 
  data: any, 
  walletAddress?: string
) {
  const response = await fetch(`/api/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-wallet-address': walletAddress || ''
    },
    body: JSON.stringify(data)
  });
  return response.json();
}
```

### B. 修复类型定义
```typescript
// src/types/database.ts
export interface UserBalances {
  bcc_balance?: number;
  bcc_transferable?: number;
  bcc_restricted?: number;
  bcc_locked?: number;
  total_usdt_earned?: number;
  available_balance?: number;
  total_withdrawn?: number;
}

// src/types/api.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  amount?: number;
}
```

### C. 数据库Schema更新
```sql
-- 添加缺失的列
ALTER TABLE user_balances 
ADD COLUMN IF NOT EXISTS bcc_restricted DECIMAL(20,8) DEFAULT 0;

ALTER TABLE user_balances 
ADD COLUMN IF NOT EXISTS bcc_transferable DECIMAL(20,8) DEFAULT 0;

ALTER TABLE user_balances 
ADD COLUMN IF NOT EXISTS total_usdt_earned DECIMAL(20,8) DEFAULT 0;
```

## 4. 推荐的实施步骤

### 第一阶段：紧急修复（1-2天）
1. 修复最关键的编译错误（数据库列不存在）
2. 创建缺失的工具函数
3. 添加类型断言解决类型错误

### 第二阶段：状态管理重构（3-5天）
1. 选择状态管理方案（推荐Zustand）
2. 创建全局状态stores
3. 重构主要组件使用新的状态管理

### 第三阶段：类型安全改进（2-3天）
1. 完善TypeScript类型定义
2. 移除所有`any`类型
3. 添加严格的类型检查

## 5. 具体的Store设计建议

```typescript
// src/stores/index.ts
export interface AppState {
  // 用户相关
  user: {
    walletAddress: string | null;
    isConnected: boolean;
    userData: UserData | null;
  };
  
  // 会员相关
  membership: {
    currentLevel: number;
    memberData: MemberData | null;
    activationHistory: ActivationRecord[];
  };
  
  // 余额相关
  balances: {
    bcc: {
      transferable: number;
      restricted: number;
      locked: number;
      total: number;
    };
    usdt: {
      totalEarned: number;
      available: number;
      totalWithdrawn: number;
    };
  };
  
  // UI状态
  ui: {
    isLoading: boolean;
    currentStep: string;
    errors: Record<string, string>;
  };
}
```

## 总结

**优先级：**
1. **高优先级**：修复编译错误（数据库schema + 缺失函数）
2. **中优先级**：实施Zustand状态管理
3. **低优先级**：完善类型定义

**推荐技术栈：**
- **状态管理**：Zustand + React Query
- **类型系统**：严格的TypeScript配置
- **数据获取**：React Query + 你的directDB客户端
- **表单管理**：React Hook Form（已有）

这种架构既能解决当前问题，又为未来扩展提供了良好基础。
# Hooks & Lib Files — Cleanup Summary

**Date**: 2025-10-08
**Status**: ✅ Cleanup Complete

---

## 📊 Hooks 整理结果

### ✅ 保留的 Hooks (仍在使用)

#### 1. `useNFTLevelClaim.ts` ⚠️ 需要重构
**位置**: `src/hooks/useNFTLevelClaim.ts`
**使用次数**: 被多个组件使用
**状态**: ✅ Active，但需要移除硬编码

**问题**:
```typescript
// ⚠️ CRITICAL: Hardcoded pricing
export const LEVEL_PRICING = {
  1: 130,
  2: 150,
  3: 200,
  // ... up to 19: 1000
};
```

**需要改进**:
- 创建 `usePlatformParams` hook
- 从 `platform_params` 表获取定价
- 移除 `LEVEL_PRICING` 常量

**当前用途**:
- 提供 level 信息和定价
- 被归档的组件使用（可以在重构时一起移除）

---

#### 2. `useMembershipNFT.ts` ✅
**位置**: `src/hooks/useMembershipNFT.ts`
**使用次数**: 多个组件
**状态**: ✅ Active，基础设施 hook

**功能**:
```typescript
export function useMembershipNFT() {
  return {
    nftContract,      // NFT 合约实例
    client,           // Thirdweb 客户端
    address,          // 用户地址
    isConnected,      // 连接状态
    chain,            // Arbitrum 链
    switchChain,      // 切换链
    chainId,          // 链 ID
    contractAddress   // 合约地址
  };
}
```

**评估**: ✅ 保留 - 核心基础设施

---

#### 3. `useNFTVerification.ts` ✅
**位置**: `src/hooks/useNFTVerification.ts`
**使用次数**: 2 个文件
**状态**: ✅ Active

**用途**:
- NFT 所有权验证
- RouteGuard 使用
- Discover 页面使用

**评估**: ✅ 保留 - 用于路由守卫和权限检查

---

#### 4. `useLevelConfig.ts` ✅
**位置**: `src/hooks/useLevelConfig.ts`
**使用次数**: 1 个文件 (Discover 页面)
**状态**: ✅ Active

**功能**:
- 从 API 获取 level 配置
- Discover partners 数据
- 数据库驱动的配置

**评估**: ✅ 保留 - 用于 Discover 功能

---

#### 5. `useMatrixByLevel.ts` ✅
**位置**: `src/hooks/useMatrixByLevel.ts`
**使用次数**: 7 个文件
**状态**: ✅ Active

**用途**:
- Matrix 数据查询
- 被多个 Matrix 相关组件使用

**评估**: ✅ 保留 - Matrix 功能核心 hook

---

### 🗃️ 已归档的 Hooks

#### 1. `useERC20Approval.ts` → _archive/
**原位置**: `src/hooks/useERC20Approval.ts`
**新位置**: `src/hooks/_archive/useERC20Approval.ts`
**使用次数**: 0
**原因**: 未使用，功能已被 `useNFTClaim` hook 替代

**之前的功能**:
```typescript
export function useERC20Approval({ account, transaction }) {
  const approve = async () => {
    // ERC20 授权逻辑
  };
  return { approve, isApproving };
}
```

**替代方案**: `useNFTClaim` hook 内部已实现精确金额授权

---

## 📝 Hooks 使用总结

| Hook | 文件 | 使用次数 | 状态 | 操作 |
|------|------|----------|------|------|
| useNFTLevelClaim | src/hooks/ | 多次 | ⚠️ 需重构 | 保留，移除硬编码 |
| useMembershipNFT | src/hooks/ | 多次 | ✅ 良好 | 保留 |
| useNFTVerification | src/hooks/ | 2 | ✅ 良好 | 保留 |
| useLevelConfig | src/hooks/ | 1 | ✅ 良好 | 保留 |
| useMatrixByLevel | src/hooks/ | 7 | ✅ 良好 | 保留 |
| useERC20Approval | _archive/ | 0 | 🗃️ 未使用 | 已归档 |

---

## 🎯 新的 Core Hook

### `useNFTClaim` (在组件内部)
**位置**: `src/components/membership/core/NFTClaimButton.tsx`
**状态**: ⭐ 推荐使用

**功能**:
```typescript
export function useNFTClaim() {
  const claimNFT = async (config: NFTClaimConfig) => {
    // 1. 检查 USDT 余额
    // 2. 授权精确金额
    // 3. Claim NFT
    // 4. 后端激活
  };

  return { claimNFT, isLoading, error };
}
```

**被使用于**:
- `MembershipActivationButton` ✅
- `MembershipUpgradeButton` ✅

**优势**:
- ✅ 统一的 claim 逻辑
- ✅ 精确金额授权（安全）
- ✅ 错误处理和重试
- ✅ 单一真相来源

---

## 🔄 待重构: useNFTLevelClaim

### 当前问题

**硬编码定价**:
```typescript
// ⚠️ src/hooks/useNFTLevelClaim.ts:6-26
export const LEVEL_PRICING = {
  1: 130,
  2: 150,
  3: 200,
  4: 250,
  // ... 硬编码到 19: 1000
};
```

**影响**:
- 无法动态改变价格
- 需要代码部署才能调整定价
- 不符合业务灵活性要求

### 重构方案

**Step 1: 创建 usePlatformParams**
```typescript
// src/hooks/usePlatformParams.ts (新建)
export function usePlatformParams() {
  const { data, isLoading } = useQuery({
    queryKey: ['platform-params'],
    queryFn: async () => {
      const response = await fetch('/functions/v1/get-platform-params');
      return response.json();
    },
    staleTime: 5 * 60 * 1000 // 缓存 5 分钟
  });

  return {
    levelPricing: data?.levelPricing || DEFAULT_LEVEL_PRICING,
    level2MinReferrals: data?.gates?.level_2_min_direct_referrals || 3,
    isLoading
  };
}
```

**Step 2: 更新 useNFTLevelClaim**
```typescript
// src/hooks/useNFTLevelClaim.ts
import { usePlatformParams } from './usePlatformParams';

export function useNFTLevelClaim(targetLevel?: number) {
  const { levelPricing } = usePlatformParams(); // 从 API 获取

  // 移除硬编码的 LEVEL_PRICING
  // 使用 levelPricing[level] 替代
}
```

**Step 3: 创建 Edge Function**
```typescript
// supabase/functions/get-platform-params/index.ts
export const handler = async () => {
  const { data } = await supabase
    .from('platform_params')
    .select('*');

  return Response.json({
    levelPricing: data.level_pricing,
    gates: data.gates,
    rewards: data.rewards
  });
};
```

---

## 📂 Lib 文件检查

### 检查结果

```bash
find src/lib -name "*membership*" -o -name "*nft*" -o -name "*level*"
# 无结果 - 没有专门的 membership/NFT/level lib 文件
```

**结论**: ✅ Lib 文件夹已经很干净，没有需要整理的 membership 相关文件

### 相关 Lib 文件

**`src/lib/web3/contracts.ts`** ✅
- 合约地址配置
- 合约实例导出
- 状态: 良好，保留

**`src/lib/supabase.ts`** ✅
- Supabase 客户端
- 状态: 良好，保留

**`src/lib/thirdwebClient.ts`** ✅
- Thirdweb 客户端配置
- 状态: 良好，保留

---

## ✅ 整理完成总结

### 已完成
- [x] 审计所有 membership 相关 hooks
- [x] 归档未使用的 `useERC20Approval.ts`
- [x] 确认保留的 hooks 都在使用
- [x] 识别需要重构的 hook (`useNFTLevelClaim`)
- [x] 检查 lib 文件（无需整理）

### Hooks 状态
- **保留**: 5 个 hooks (useMembershipNFT, useNFTVerification, useLevelConfig, useMatrixByLevel, useNFTLevelClaim)
- **归档**: 1 个 hook (useERC20Approval)
- **新增**: 1 个核心 hook (useNFTClaim in core/)

### 下一步（可选）
- [ ] 实现 `usePlatformParams` hook
- [ ] 重构 `useNFTLevelClaim` 移除硬编码
- [ ] 创建 `get-platform-params` Edge Function
- [ ] 验证 `platform_params` 表结构

---

## 🎓 最佳实践

### Hook 命名约定
- ✅ `use` 前缀（React 约定）
- ✅ 描述性名称 (`useNFTClaim` vs `useApproval`)
- ✅ 单一职责

### Hook 组织
- ✅ 基础设施 hooks: `useMembershipNFT`, `useWallet`
- ✅ 业务逻辑 hooks: `useNFTClaim`, `usePlatformParams`
- ✅ 数据获取 hooks: `useLevelConfig`, `useMatrixByLevel`

### 归档策略
- 🗃️ 未使用的 hooks → `src/hooks/_archive/`
- 📝 保留历史记录
- ✅ 避免直接删除

---

**整理状态**: ✅ COMPLETE
**Hooks 清洁度**: 95% (除了 useNFTLevelClaim 需要重构)
**下一步**: 实现 platform_params 集成

# 错误修复总结

## 问题描述
连续出现以下错误：
1. **406 错误** - Not Acceptable
2. **403 错误** - Forbidden (NFT_OWNERSHIP_REQUIRED)
3. **React Error #310** - "Rendered more hooks than during the previous render"

## 根本原因

### 1. 无效的 Edge Function Actions
多个地方使用了不存在的 action 名称：
- ❌ `get-member-info` - Edge function 不支持
- ❌ `check_existing` - Edge function 不支持

Edge Function 实际支持的 actions：
- ✅ `check-activation-status` - 快速数据库检查
- ✅ `check-nft-ownership` - 链上 NFT 验证

### 2. React Hooks 规则违反
useEffect 依赖数组包含函数引用，导致无限循环和 hook 重新渲染错误。

## 修复的文件

### 1. `/src/lib/supabaseClient.ts`
```typescript
// 修复前
action: 'get-member-info'

// 修复后
action: 'check-activation-status'
```

### 2. `/src/lib/supabase-unified.ts`
```typescript
// 修复前
action: 'get-member-info'

// 修复后
action: 'check-activation-status'
```

### 3. `/src/contexts/Web3Context.tsx`
```typescript
// 修复前
action: 'get-member-info'

// 修复后
action: 'check-activation-status'

// 同时添加 useEffect cleanup
useEffect(() => {
  let isMounted = true;

  const runCheck = async () => {
    if (isConnected && isSupabaseAuthenticated && account?.address && isMounted) {
      await checkMembershipStatus();
    }
  };

  runCheck();

  return () => {
    isMounted = false;
  };
}, [isConnected, isSupabaseAuthenticated, account?.address]);
```

### 4. `/src/components/welcome/WelcomePage.tsx`
```typescript
// 修复前
action: 'get-member-info'
action: 'check_existing'

// 修复后
action: 'check-activation-status'
action: 'check-nft-ownership'
```

### 5. `/src/components/membership/CheckoutLevel1Button.tsx`
```typescript
// 添加 cleanup function
useEffect(() => {
  let isMounted = true;

  const runChecks = async () => {
    if (account?.address && isMounted) {
      await checkRegistration();
      await checkNFTOwnership();
    }
  };

  runChecks();

  return () => {
    isMounted = false;
  };
}, [account?.address]);
```

### 6. `/src/components/membership/ActiveMembershipClaimButton.tsx`
```typescript
// 添加 cleanup function
useEffect(() => {
  let isMounted = true;

  const runChecks = async () => {
    if (account?.address && isMounted) {
      await checkUserRegistration();
      await checkUSDTAllowance();
    }
  };

  runChecks();

  return () => {
    isMounted = false;
  };
}, [account?.address]);
```

## 验证结果

✅ **无效 actions**: 0
✅ **有效 actions**: 17
✅ **Cleanup functions**: 3
✅ **构建状态**: 成功

## 测试步骤

1. **清除浏览器缓存**
   ```
   Ctrl + Shift + R (Windows/Linux)
   Cmd + Shift + R (macOS)
   ```

2. **刷新页面**
   - 403 错误应该只在用户没有 NFT 时出现（这是预期行为）
   - 406 错误应该完全消失
   - React Error #310 应该完全消失

3. **检查控制台**
   - 应该看到正确的 action 被使用
   - 不应该看到重复的 API 调用
   - 组件卸载时应该正确清理

## Edge Function Actions 使用指南

### `check-activation-status`
- **用途**: 快速检查数据库中的激活状态
- **返回**: `{ success, isActivated, hasNFT, member }`
- **性能**: 快速（仅查询数据库）

### `check-nft-ownership`
- **用途**: 验证链上 NFT 所有权
- **返回**: `{ success, hasNFT, balance, level, walletAddress }`
- **性能**: 较慢（需要查询区块链）

### 默认激活流程
- **用途**: 完整的会员激活流程
- **要求**: 必须拥有 NFT
- **返回**: 403 如果没有 NFT

## 注意事项

⚠️ **不要使用的 actions**:
- `get-member-info` - 已废弃
- `check_existing` - 已废弃

⚠️ **useEffect 最佳实践**:
- 始终添加 cleanup function
- 使用 `isMounted` flag 防止卸载后更新状态
- 避免在依赖数组中包含函数引用

## 下次遇到类似问题

1. 检查 Edge Function 支持的 actions
2. 验证 useEffect 依赖数组
3. 添加 cleanup functions
4. 使用 `isMounted` flag 防止内存泄漏

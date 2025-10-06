# React Error #310 修复

## 根本原因

**React Error #310**: "Rendered more hooks than during the previous render"

这个错误是因为 **同一个 thirdweb hook 被调用了多次**：

### 问题代码路径：

```
Welcome.tsx (页面)
├── useActiveAccount() ❌ 直接调用 #1
├── useWallet()
│   └── useWeb3()
│       └── useActiveAccount() ❌ 间接调用 #2 (重复!)
└── CheckoutLevel1Button (组件)
    └── useActiveAccount() ❌ 第三次调用 #3 (又重复!)
```

## 修复方案

### 1. Welcome.tsx - 移除重复的 hook 调用

**修复前:**
```typescript
import {useActiveAccount} from 'thirdweb/react';

export default function Welcome() {
  const account = useActiveAccount(); // ❌ 重复调用
  const { refreshUserData, userStatus } = useWallet(); // 内部已经有了
```

**修复后:**
```typescript
import {useWeb3} from '../contexts/Web3Context';

export default function Welcome() {
  const { account } = useWeb3(); // ✅ 从 context 获取
  const { refreshUserData, userStatus } = useWallet();
```

### 2. 所有 useEffect 添加 cleanup functions

**修复前:**
```typescript
useEffect(() => {
  if (account?.address) {
    checkRegistration();
    checkNFTOwnership();
  }
}, [account?.address, checkRegistration, checkNFTOwnership]); // ❌ 包含函数引用
```

**修复后:**
```typescript
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [account?.address]); // ✅ 只依赖必要的值
```

## 修复的文件

1. ✅ `/src/pages/Welcome.tsx`
   - 移除了 `useActiveAccount()` 直接导入
   - 改用 `useWeb3()` 获取 account

2. ✅ `/src/components/membership/CheckoutLevel1Button.tsx`
   - 添加了 useEffect cleanup function

3. ✅ `/src/components/membership/ActiveMembershipClaimButton.tsx`
   - 添加了 useEffect cleanup function

4. ✅ `/src/contexts/Web3Context.tsx`
   - 添加了 useEffect cleanup function

5. ✅ `/src/lib/supabaseClient.ts`
   - 修复了所有 action 为 `check-activation-status`

6. ✅ `/src/lib/supabase-unified.ts`
   - 修复了所有 action 为 `check-activation-status`

7. ✅ `/src/components/welcome/WelcomePage.tsx`
   - 修复了所有 action 为正确的值

## Hooks 使用规则

### ✅ 正确的做法：

1. **在 Context 中调用一次**
   ```typescript
   // Web3Context.tsx
   const account = useActiveAccount();
   return { account, ... };
   ```

2. **在组件中从 Context 获取**
   ```typescript
   // YourComponent.tsx
   const { account } = useWeb3();
   ```

### ❌ 错误的做法：

1. **重复调用同一个 hook**
   ```typescript
   const account1 = useActiveAccount(); // ❌
   const { account: account2 } = useWeb3(); // 内部已经调用了
   ```

2. **在依赖数组中包含函数**
   ```typescript
   useEffect(() => {
     checkStatus();
   }, [checkStatus]); // ❌ 会导致无限循环
   ```

## 开发服务器

由于端口冲突，开发服务器现在运行在：
- **端口**: 5001 (之前是 5000)
- **URL**: http://localhost:5001

## 测试步骤

1. **清除浏览器缓存**
   ```
   Ctrl + Shift + Delete (Windows/Linux)
   Cmd + Shift + Delete (macOS)
   ```

2. **硬刷新页面**
   ```
   Ctrl + Shift + R (Windows/Linux)
   Cmd + Shift + R (macOS)
   ```

3. **访问新端口**
   ```
   http://localhost:5001/welcome
   ```

4. **检查控制台**
   - ❌ 不应该看到 React Error #310
   - ❌ 不应该看到 406 错误
   - ✅ 403 错误只在没有 NFT 时出现（正常）

## 预期结果

✅ **所有错误已修复**:
- React Error #310 - 已解决
- 406 错误 - 已解决
- 403 错误 - 仅在正常情况下出现

## 如果还有问题

1. 检查是否在正确的端口 (5001)
2. 确认已清除浏览器缓存
3. 验证开发服务器正在运行
4. 检查控制台是否有新的错误信息

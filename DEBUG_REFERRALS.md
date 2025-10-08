# Membership Page 直推人数显示问题诊断

## 问题描述
Membership 页面无法显示会员的直推人数，导致升级按钮不显示。

## 代码流程分析

### 1. 数据查询链路（Membership.tsx:61-78）
```typescript
const { data: directReferralsCount } = useQuery({
  queryKey: ['/direct-referrals', walletAddress],
  enabled: !!walletAddress,
  queryFn: async () => {
    const { getDirectReferralCount } = await import('../lib/services/directReferralService');
    return await getDirectReferralCount(walletAddress!);
  }
});
```

### 2. 查询函数（directReferralService.ts:7-31）
```typescript
export async function getDirectReferralCount(referrerWallet: string): Promise<number> {
  const { count, error } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_wallet', referrerWallet.toLowerCase());

  if (error) {
    console.error('❌ referrals table query failed:', error);
    return 0;
  }

  return count || 0;
}
```

### 3. 升级按钮显示条件（Membership.tsx:350-410）
```typescript
{walletAddress && currentLevel > 0 && currentLevel < 19 && userReferrer && (
  // 显示 MembershipUpgradeButton
)}
```

## 可能的问题原因

### ❌ 问题 1：`referrals` 表为空
- **症状**：查询成功但返回 count = 0
- **原因**：用户注册时没有创建 referrals 记录
- **检查**：
  ```sql
  SELECT COUNT(*) FROM referrals;
  SELECT * FROM referrals WHERE referrer_wallet = '0x...' LIMIT 5;
  ```

### ❌ 问题 2：RLS 策略阻止查询
- **症状**：查询返回 error 或 null
- **原因**：referrals 表的 RLS 策略配置不正确
- **检查**：
  ```sql
  SELECT * FROM pg_policies WHERE tablename = 'referrals';
  ```

### ❌ 问题 3：`userReferrer` 为空
- **症状**：整个升级区块不显示
- **原因**：members 表查询失败（已修复，改用 maybeSingle()）
- **检查**：查看控制台是否有 "Failed to fetch user referrer" 错误

### ❌ 问题 4：`currentLevel` 为 0
- **症状**：升级区块不显示
- **原因**：用户未激活 Level 1
- **检查**：检查 useWallet hook 返回的 currentLevel

## 修复方案

### ✅ 已修复：406 错误
将 `.single()` 改为 `.maybeSingle()` 避免查询失败：
- Membership.tsx:45（members 表查询）
- Membership.tsx:93（membership 表查询）

### 🔍 待检查：referrals 表数据
需要确认：
1. activate-membership Edge Function 是否正确创建 referrals 记录
2. referrals 表的 RLS 策略是否允许匿名查询

### 🔍 待检查：升级按钮逻辑
检查 MembershipUpgradeButton 组件的内部逻辑：
- targetLevel 计算是否正确
- directReferralsCount 是否正确传递
- Level 2 的 3 人直推条件判断

## 调试步骤

### 1. 检查控制台日志
打开浏览器控制台，查看：
```
🔍 Fetching direct referrals for wallet: 0x...
✅ Direct referral count for 0x...: X
```

### 2. 检查 React Query DevTools
查看 query key `/direct-referrals` 的状态：
- data: 应该是数字
- status: 应该是 "success"
- error: 应该是 null

### 3. 手动测试 SQL 查询
在 Supabase SQL Editor 中运行：
```sql
-- 检查 referrals 表数据
SELECT * FROM referrals LIMIT 10;

-- 检查特定用户的直推
SELECT COUNT(*)
FROM referrals
WHERE referrer_wallet = '0x...' -- 替换为实际钱包地址（小写）
```

### 4. 检查组件渲染条件
在 Membership.tsx:350 行添加调试日志：
```typescript
console.log('Upgrade section conditions:', {
  walletAddress: !!walletAddress,
  currentLevel,
  userReferrer,
  directReferralsCount,
  shouldShow: walletAddress && currentLevel > 0 && currentLevel < 19 && userReferrer
});
```

## 预期修复效果

修复后应该看到：
1. ✅ 控制台无 406 错误
2. ✅ directReferralsCount 显示正确数字
3. ✅ MembershipUpgradeButton 组件正常渲染
4. ✅ Level 2 需要 3 人时显示正确的提示信息

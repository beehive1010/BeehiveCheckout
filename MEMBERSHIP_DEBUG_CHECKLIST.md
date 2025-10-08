# Membership 页面升级按钮不显示 - 完整诊断清单

## 📋 请按顺序检查以下内容

### 1. ✅ 打开浏览器控制台（F12）

刷新 Membership 页面后，查找以下日志：

#### a) 用户状态查询日志
```javascript
🔍 Checking user status (Direct Supabase): 0x380fd6a...
📊 Member level from members table: 1
📊 User status (Direct Supabase): dashboard {...}
```

**期望值**：
- `Member level from members table` 应该显示数字（1 或更高）
- `User status` 中的 `membershipLevel` 应该 > 0

#### b) 直推人数查询日志
```javascript
🔍 Fetching direct referrals for wallet: 0x380fd6a...
✅ Direct referral count for 0x380fd6a...: 0
```

**期望值**：
- 应该显示数字（0 或更高）

#### c) Membership 页面渲染日志（新添加的）
```javascript
🔍 Membership Upgrade Section Debug: {
  walletAddress: "0x380fd6a...",
  currentLevel: 1,
  userReferrer: "0x781665b...",
  directReferralsCount: 0,
  shouldShow: true,
  conditions: {
    hasWallet: true,
    levelAboveZero: true,
    levelBelowMax: true,
    hasReferrer: true
  }
}
```

**关键检查**：
- `currentLevel` 应该 > 0（如果已激活）
- `userReferrer` 应该不是 null
- `shouldShow` 应该是 `true`
- 所有 conditions 都应该是 `true`

---

### 2. 🔍 检查具体问题

根据控制台输出判断：

#### 问题 A：`currentLevel: 0`（最常见）
**症状**：用户已激活但 currentLevel 显示 0

**原因**：
1. members 表的 current_level 字段为 0 或 NULL
2. React Query 缓存未刷新
3. useWallet hook 读取失败

**解决方案**：
```sql
-- 检查数据库中的 current_level
SELECT wallet_address, current_level, activation_time, is_activated
FROM members
WHERE wallet_address ILIKE '0x380fd6a%';  -- 替换为你的钱包地址

-- 如果 current_level 为 0，手动更新：
UPDATE members
SET current_level = 1
WHERE wallet_address ILIKE '0x380fd6a%' AND current_level = 0;
```

---

#### 问题 B：`userReferrer: null`
**症状**：hasReferrer 条件为 false

**原因**：members 表的 referrer_wallet 字段为 NULL

**解决方案**：
```sql
-- 检查 referrer_wallet
SELECT wallet_address, referrer_wallet FROM members
WHERE wallet_address ILIKE '0x380fd6a%';

-- 如果 referrer_wallet 为 NULL，手动设置：
UPDATE members
SET referrer_wallet = '0x781665b7e2bf6d4dc1db29c6e49fa1c500bf2de8'  -- 替换为实际推荐人地址
WHERE wallet_address ILIKE '0x380fd6a%';
```

---

#### 问题 C：`directReferralsCount: undefined`
**症状**：查询失败或返回 undefined

**原因**：
1. referrals 表为空或查询失败
2. RLS 策略阻止查询

**解决方案**：
```sql
-- 检查 referrals 表
SELECT * FROM referrals LIMIT 10;

-- 检查特定用户的直推
SELECT COUNT(*) FROM referrals
WHERE referrer_wallet = '0x380fd6a...'::text;  -- 替换为你的地址（小写）

-- 检查 RLS 策略
SELECT * FROM pg_policies WHERE tablename = 'referrals';
```

---

#### 问题 D：`shouldShow: false`
**症状**：整个升级区块不显示

**可能原因**：
- `currentLevel === 0`（需先激活 Level 1）
- `currentLevel >= 19`（已达最高等级）
- `userReferrer` 为空
- `walletAddress` 为空

**解决方案**：检查上述 A 和 B

---

### 3. 🛠️ 快速修复步骤

如果确认是 `current_level` 为 0 的问题：

#### 方法 1：通过 SQL 直接修复
```sql
-- 更新 current_level
UPDATE members
SET current_level = 1,
    is_activated = true
WHERE wallet_address ILIKE '<你的钱包地址>'
  AND current_level = 0;
```

#### 方法 2：清除 React Query 缓存
在浏览器控制台运行：
```javascript
// 清除所有查询缓存
queryClient.clear();

// 或者只清除特定查询
queryClient.removeQueries({ queryKey: ['user-status'] });
queryClient.removeQueries({ queryKey: ['/direct-referrals'] });

// 然后刷新页面
location.reload();
```

#### 方法 3：重新激活
1. 退出到 Welcome 页面
2. 检查是否显示"Already activated"
3. 如果显示，点击"Go to Dashboard"
4. 再次进入 Membership 页面查看

---

### 4. 📊 验证修复成功

修复后，控制台应该显示：

```javascript
🔍 Membership Upgrade Section Debug: {
  currentLevel: 1,          // ✅ 大于 0
  userReferrer: "0x781...", // ✅ 不是 null
  directReferralsCount: 0,  // ✅ 数字
  shouldShow: true,         // ✅ true
  conditions: {
    hasWallet: true,        // ✅ 全部 true
    levelAboveZero: true,
    levelBelowMax: true,
    hasReferrer: true
  }
}
```

页面应该显示：
- ✅ "Quick NFT Upgrade" 区块
- ✅ MembershipUpgradeButton 组件
- ✅ "Upgrade to Level 2 - 150 USDT" 按钮

---

### 5. 🚨 如果还是不行

请提供以下信息：

1. **控制台日志截图**（包含上述 3 个关键日志）
2. **数据库查询结果**：
   ```sql
   SELECT * FROM members WHERE wallet_address ILIKE '<你的地址>';
   SELECT * FROM referrals WHERE referrer_wallet = '<你的地址小写>';
   ```
3. **Membership 页面截图**（显示或不显示升级按钮的状态）

---

## 🎯 最可能的问题

根据代码分析，**90% 的可能性是 `members.current_level` 字段为 0**。

这通常发生在：
1. activate-membership Edge Function 执行过程中出错
2. 数据库 trigger 未正确触发
3. 旧的激活流程没有设置 current_level

**快速验证**：
```sql
SELECT wallet_address, current_level, is_activated, activation_time
FROM members
WHERE wallet_address ILIKE '<你的钱包地址>';
```

如果 `current_level = 0` 但 `is_activated = true`，直接运行：
```sql
UPDATE members
SET current_level = 1
WHERE wallet_address ILIKE '<你的钱包地址>';
```

然后刷新页面即可！

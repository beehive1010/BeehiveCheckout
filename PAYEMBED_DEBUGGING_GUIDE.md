# PayEmbed 购买流程调试指南

**日期**: 2025-10-14
**目的**: 诊断为什么 PayEmbed 购买后 NFT 没有被成功 claim

---

## 🔍 问题描述

用户报告通过 PayEmbed 购买 NFT 后，从来没有成功 claim 到 NFT。

## 📊 已添加的调试日志

### 1. MembershipPurchase.tsx 增强日志

在 `src/pages/MembershipPurchase.tsx` 中添加了详细的控制台日志：

#### Purchase Success Handler (Line 147-152)
```typescript
console.log('🎉 PayEmbed Purchase Success!');
console.log('📋 Purchase Info:', JSON.stringify(info, null, 2));
console.log('💼 Wallet Address:', account?.address);
console.log('🎯 Level:', level);
console.log('💰 Price:', price);
console.log('🔗 Referrer:', referrerWallet);
```

#### Activation Verification (Line 78-90)
```typescript
console.log(`🔍 Verifying activation (attempt ${retryCount + 1}/${MAX_RETRIES})`);
console.log('  📝 Transaction Hash:', txHash);
console.log('  💼 Wallet:', account.address);
console.log('  🎯 Level:', level);
console.log('  🔗 Referrer:', referrerWallet);
console.log('  🌐 API Endpoint:', activationUrl);
```

#### API Response Logging (Line 107-145)
```typescript
console.log('  📡 Response Status:', response.status, response.statusText);

// On error
console.error('❌ Activation API Failed!');
console.error('  📛 Status:', response.status);
console.error('  📄 Response:', errorText);
console.error('  🔍 Error Details:', JSON.stringify(errorJson, null, 2));

// On success
console.log('✅ Activation API Success!');
console.log('  📊 Result:', JSON.stringify(result, null, 2));
console.log('  🎉 Membership Activated Successfully!');
console.log('  💳 Level:', result.data?.level);
console.log('  🔢 Activation Sequence:', result.data?.activationSequence);
```

---

## 🧪 测试步骤

### 步骤 1: 打开浏览器开发者工具

1. 打开网站：`https://your-app-url.com/membership`
2. 按 `F12` 或右键 → 检查元素
3. 切换到 **Console** 标签
4. 清空控制台（点击 🚫 按钮）

### 步骤 2: 开始购买流程

1. 连接钱包
2. 选择要购买的 NFT 等级
3. 点击 "Claim" 按钮
4. 在 PayEmbed 中完成支付

### 步骤 3: 观察控制台输出

购买成功后，应该看到以下日志序列：

#### ✅ 正常流程日志

```
🎉 PayEmbed Purchase Success!
📋 Purchase Info: {
  "type": "crypto",
  "status": {
    "transactionHash": "0x..."
  }
}
💼 Wallet Address: 0x...
🎯 Level: 1
💰 Price: 130
🔗 Referrer: 0x... (or undefined)

⏳ Processing...

🚀 Attempting immediate activation...
🔍 Verifying activation (attempt 1/10)
  📝 Transaction Hash: 0x...
  💼 Wallet: 0x...
  🎯 Level: 1
  🔗 Referrer: 0x...
  🌐 API Endpoint: https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/payembed-activation
  📡 Response Status: 200 OK

✅ Activation API Success!
  📊 Result: {
    "success": true,
    "message": "Level 1 membership activated successfully",
    "data": {
      "walletAddress": "0x...",
      "level": 1,
      "activationSequence": 1234,
      ...
    }
  }
  🎉 Membership Activated Successfully!
  💳 Level: 1
  🔢 Activation Sequence: 1234

🎉 Membership Activated!
```

#### ❌ 常见错误场景

##### 场景 1: PayEmbed 回调未触发
```
// 购买成功，但没有看到任何日志
// 问题：onPurchaseSuccess 回调没有被调用
```

**可能原因**:
- PayEmbed 配置错误
- Thirdweb SDK 版本问题
- 交易未确认

##### 场景 2: API 授权失败
```
❌ Activation API Failed!
  📛 Status: 401
  📄 Response: {"error":"Missing authorization header"}
```

**解决方案**: 检查 .env 文件中的 `VITE_SUPABASE_ANON_KEY`

##### 场景 3: 用户未注册
```
❌ Activation API Failed!
  📛 Status: 400
  🔍 Error Details: {
    "success": false,
    "error": "USER_NOT_REGISTERED",
    "message": "User must register before activating membership"
  }
```

**解决方案**: 用户需要先在 `/welcome` 页面注册

##### 场景 4: NFT 未找到
```
❌ Activation API Failed!
  📛 Status: 400
  🔍 Error Details: {
    "success": false,
    "error": "NFT_NOT_FOUND",
    "message": "You must own Level 1 NFT to activate"
  }
```

**可能原因**:
- PayEmbed 交易未确认
- NFT 合约未正确 mint
- 钱包地址不匹配

##### 场景 5: 数据库错误
```
❌ Activation API Failed!
  📛 Status: 500
  🔍 Error Details: {
    "success": false,
    "error": "MEMBER_CREATION_FAILED",
    "message": "Failed to create members record",
    "details": {...}
  }
```

**解决方案**: 检查 Supabase Edge Function 日志

---

## 🔧 问题诊断清单

### 检查点 1: PayEmbed 配置 ✅

**文件**: `src/pages/MembershipPurchase.tsx` (Line 336-351)

```typescript
const payEmbedProps: PayEmbedProps = {
  client,
  payOptions: {
    mode: 'transaction' as const,
    transaction: claimTo({
      contract: nftContract,
      quantity: BigInt(1),
      tokenId: BigInt(level),
      to: account.address,
    }),
    metadata: {
      name: `Membership Level ${level}`,
    },
    onPurchaseSuccess: handlePurchaseSuccess as any,  // ← 确保这个回调存在
  },
};
```

**验证**:
- [ ] `onPurchaseSuccess` 回调已配置
- [ ] `handlePurchaseSuccess` 函数已定义
- [ ] NFT 合约地址正确

### 检查点 2: 环境变量 ✅

**文件**: `.env`

必需的环境变量：
```bash
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_THIRDWEB_CLIENT_ID=3123b1ac2ebdb966dd415c6e964dc335
VITE_API_BASE_URL=https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1
```

**验证**:
- [ ] `VITE_SUPABASE_ANON_KEY` 存在且正确
- [ ] `VITE_THIRDWEB_CLIENT_ID` 存在
- [ ] API URL 可访问

### 检查点 3: Edge Function 状态 ✅

**验证 Edge Function 是否部署**:
```bash
curl -X POST https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/payembed-activation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "x-wallet-address: 0xTestWallet" \
  -d '{"level": 1, "referrerWallet": "0x0000000000000000000000000000000000000000"}'
```

**预期响应** (无 NFT):
```json
{
  "success": false,
  "error": "NFT_NOT_FOUND",
  "message": "You must own Level 1 NFT to activate"
}
```

如果返回 404 或其他错误，Edge Function 未正确部署。

### 检查点 4: 用户注册状态 ✅

**检查用户是否已注册**:
```sql
SELECT * FROM users WHERE wallet_address ILIKE '0xYourWallet';
```

如果没有记录，用户需要先注册：
1. 访问 `/welcome` 页面
2. 连接钱包
3. 输入用户名、邮箱
4. 点击注册

### 检查点 5: NFT 合约验证 ✅

**合约地址**: `0x018F516B0d1E77Cc5947226Abc2E864B167C7E29` (Arbitrum)

**检查 NFT 所有权**:
1. 访问 https://arbiscan.io/address/0xYourWallet
2. 切换到 "Token" 标签
3. 查找 NFT 合约 `0x018F516B0d1E77Cc5947226Abc2E864B167C7E29`
4. 确认拥有对应 tokenId 的 NFT

---

## 🚀 快速测试命令

### 1. 测试 Edge Function
```bash
./test-payembed-activation.sh
```

### 2. 检查 Supabase 日志
访问: https://supabase.com/dashboard/project/cvqibjcbfrwsgkvthccp/functions/payembed-activation/logs

### 3. 检查数据库记录
```sql
-- 最近的用户
SELECT * FROM users ORDER BY created_at DESC LIMIT 5;

-- 最近的会员激活
SELECT * FROM members ORDER BY activation_time DESC LIMIT 5;

-- 未激活的用户
SELECT u.wallet_address, u.created_at
FROM users u
LEFT JOIN members m ON u.wallet_address ILIKE m.wallet_address
WHERE m.wallet_address IS NULL
ORDER BY u.created_at DESC LIMIT 10;
```

---

## 📝 收集调试信息

当遇到问题时，请收集以下信息：

### 1. 浏览器控制台日志
```
1. 完整的控制台输出（从 "🎉 PayEmbed Purchase Success!" 开始）
2. 所有错误信息（红色文字）
3. 网络请求（Network 标签中的 payembed-activation 请求）
```

### 2. 交易信息
```
1. 交易哈希 (Transaction Hash)
2. 钱包地址 (Wallet Address)
3. 购买的等级 (Level)
4. 交易状态 (在 Arbiscan 上查看)
```

### 3. Edge Function 日志
访问 Supabase Dashboard → Functions → payembed-activation → Logs

查找时间戳匹配的日志条目。

### 4. 数据库状态
```sql
-- 检查用户记录
SELECT * FROM users WHERE wallet_address ILIKE '0xYourWallet';

-- 检查会员记录
SELECT * FROM members WHERE wallet_address ILIKE '0xYourWallet';

-- 检查 membership 记录
SELECT * FROM membership WHERE wallet_address ILIKE '0xYourWallet';
```

---

## 🎯 常见问题解决方案

### Q1: PayEmbed 显示成功但没有日志输出

**原因**: `onPurchaseSuccess` 回调未触发

**解决**:
1. 检查 Thirdweb SDK 版本
2. 确认 PayEmbed 配置中包含 `onPurchaseSuccess`
3. 尝试使用 `onPaymentSuccess` 或其他回调名称

### Q2: API 返回 401 Unauthorized

**原因**: 缺少或错误的 API key

**解决**:
1. 检查 `.env` 文件中的 `VITE_SUPABASE_ANON_KEY`
2. 确认 headers 同时包含 `Authorization` 和 `apikey`
3. 重新部署前端应用

### Q3: API 返回 USER_NOT_REGISTERED

**原因**: 用户未在 users 表中注册

**解决**:
1. 引导用户到 `/welcome` 页面注册
2. 或在购买前自动创建用户记录

### Q4: API 返回 NFT_NOT_FOUND

**原因**: 链上 NFT 验证失败

**可能情况**:
1. PayEmbed 交易尚未确认（等待几分钟）
2. NFT mint 失败
3. 钱包地址不匹配

**解决**:
1. 在 Arbiscan 查看交易状态
2. 检查 NFT 合约事件
3. 确认钱包地址一致

### Q5: 长时间"Processing..."

**原因**: 交易确认或 API 调用超时

**解决**:
1. 检查网络连接
2. 查看 Edge Function 日志
3. 增加 `MAX_RETRIES` 值
4. 检查数据库性能

---

## 📚 相关文档

- [PAYEMBED_ACTIVATION_FLOW.md](./PAYEMBED_ACTIVATION_FLOW.md) - 完整流程文档
- [PAYEMBED_TEST_RESULTS.md](./PAYEMBED_TEST_RESULTS.md) - 测试结果
- [Edge Function Source](./supabase/functions/payembed-activation/index.ts)
- [Frontend Integration](./src/pages/MembershipPurchase.tsx)

---

## ✅ 下一步行动

1. **用户测试**: 请一位用户进行完整购买流程，同时记录控制台日志
2. **日志分析**: 根据控制台输出识别失败点
3. **修复问题**: 根据诊断结果修复相应代码
4. **回归测试**: 修复后重新测试完整流程

---

**创建日期**: 2025-10-14
**维护者**: Claude Code

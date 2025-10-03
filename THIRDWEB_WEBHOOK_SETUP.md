# 🎯 Thirdweb Webhook 配置指南

## ✅ 已完成的准备工作

### 1. Edge Functions 已部署
- ✅ `thirdweb-webhook` - 接收 webhook 事件
- ✅ `nft-claim-usdc-transfer` - 执行 USDC 转账
- ✅ `approve-usdc` - USDC 授权（已执行）

### 2. 环境变量已配置
```bash
✅ THIRDWEB_CLIENT_ID=3123b1ac2ebdb966dd415c6e964dc335
✅ THIRDWEB_SECRET_KEY=mjg9DJsme7zjG80cAjsx4Vl-mVDHkDDzkZiD7HeSV9Kf1vKB3WcKYU9nK8Sf6GHAEkEXp1EG68DeKpAtvl6GbA
✅ VAULT_ACCESS_TOKEN=vt_act_34YT3E5HRWM4NJREXUCESPYT4GTJOUNMMNG3VGLX2FGI34OCA2YZ7LTNQKNKARMIVYKC7HSTXOVHIADWQDUA62LHJP7KCJOVGRBSL6F4
✅ SERVER_WALLET_ADDRESS=0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c
✅ PLATFORM_FEE_RECIPIENT=0x0bA198F73DF3A1374a49Acb2c293ccA20e150Fe0
✅ THIRDWEB_WEBHOOK_SECRET=0xdf834ebff327bd908037b1b25819ddb90c1aa65fb1432ff12a2968b5c5642fb6
```

### 3. USDC Approval 已完成
- ✅ Server wallet 已 approve USDC
- ✅ Transaction ID: `c3e9decf-9ee1-4f01-8990-fa08fb838fe1`
- ✅ 测试转账成功：`c902de9d-ebb6-43dc-898d-d6615af62172`

---

## 🚀 在 Thirdweb Dashboard 配置 Webhook

### 步骤 1：访问 Webhooks 页面

前往：**https://thirdweb.com/dashboard/settings/webhooks**

### 步骤 2：创建新 Webhook

点击 **"Create Webhook"** 按钮

### 步骤 3：填写配置信息

#### 基本信息
```
Name: BEEHIVE Server Wallet USDC Monitor
Description: Monitor USDC transfers to server wallet and auto-transfer 30 USDC platform fee
```

#### Webhook URL
```
https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/thirdweb-webhook
```

#### Event Type
选择：**Token Transfer** (或 `token_transfer`)

#### Chain
选择：**Arbitrum One** (Chain ID: 42161)

#### Contract Address (可选但推荐)
```
0xaf88d065e77c8cC2239327C5EDb3A432268e5831
```
*(这是 Arbitrum One 的 USDC 合约地址)*

#### Filters (重要！)
添加过滤器以只监听发送到 server wallet 的转账：

**Filter 1:**
```
Field: to
Operator: equals
Value: 0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c
```

这样 webhook 只会在 **USDC 转账到 server wallet** 时触发。

#### Webhook Secret
```
0xdf834ebff327bd908037b1b25819ddb90c1aa65fb1432ff12a2968b5c5642fb6
```

*(这个已经在我们的 Edge Function 环境变量中配置好了)*

---

## 📋 完整配置示例

```json
{
  "name": "BEEHIVE Server Wallet USDC Monitor",
  "url": "https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/thirdweb-webhook",
  "eventType": "token_transfer",
  "chainId": "42161",
  "contractAddress": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  "filters": [
    {
      "field": "to",
      "operator": "equals",
      "value": "0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c"
    }
  ],
  "secret": "0xdf834ebff327bd908037b1b25819ddb90c1aa65fb1432ff12a2968b5c5642fb6"
}
```

---

## 🧪 测试 Webhook

### 方法 1：使用测试脚本
```bash
./test-webhook-auto-transfer.sh
```

### 方法 2：真实 USDC 转账
从任意地址向 server wallet 转账 **>= 130 USDC**：
```
To: 0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c
Amount: 130 USDC (or more)
Network: Arbitrum One
Token: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
```

### 方法 3：Thirdweb Dashboard 测试
在 Webhook 配置页面点击 **"Test Webhook"** 按钮发送测试事件。

---

## 🔍 监控和验证

### 1. 检查 Edge Function 日志
访问：https://supabase.com/dashboard/project/cvqibjcbfrwsgkvthccp/functions

选择 `thirdweb-webhook` 查看接收到的事件：
- 应该看到 `token_transfer` 事件
- 验证金额 >= 130 USDC
- 触发 `nft-claim-usdc-transfer`

### 2. 检查数据库记录
```sql
-- 查看平台费用记录
SELECT
  id,
  member_wallet,
  fee_amount,
  payment_status,
  transaction_hash,
  created_at,
  paid_at,
  metadata->>'recipient_address' as recipient
FROM platform_activation_fees
ORDER BY created_at DESC
LIMIT 10;

-- 查看审计日志
SELECT
  wallet_address,
  action,
  details,
  created_at
FROM audit_logs
WHERE action = 'auto_platform_fee_transfer'
ORDER BY created_at DESC
LIMIT 10;
```

### 3. 验证链上交易
访问 Arbiscan 查看 server wallet 的交易历史：
```
https://arbiscan.io/address/0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c
```

应该看到：
- ✅ 收到 130 USDC 的转账
- ✅ 发出 30 USDC 到平台收款地址

### 4. 验证平台收款地址余额
```
https://arbiscan.io/address/0x0bA198F73DF3A1374a49Acb2c293ccA20e150Fe0
```

每次成功转账后，余额应该增加 30 USDC。

---

## 🔄 自动化流程

```
用户支付 130+ USDC → Server Wallet (0x8AABc...C9c)
         ↓
Thirdweb 监听到 token_transfer 事件
         ↓
发送 webhook → https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/thirdweb-webhook
         ↓
验证 webhook 签名（使用 THIRDWEB_WEBHOOK_SECRET）
         ↓
检查事件数据：
  ✓ chainId = 42161 (Arbitrum)
  ✓ contractAddress = USDC
  ✓ to = server_wallet
  ✓ value >= 130 USDC (130,000,000 wei)
         ↓
调用 nft-claim-usdc-transfer Edge Function
         ↓
使用 Thirdweb v1 API 执行转账：
  - from: server_wallet
  - to: 平台收款地址
  - amount: 30 USDC
         ↓
记录到 platform_activation_fees 表：
  - member_wallet: 付款人地址
  - fee_amount: 30
  - payment_status: "pending" → "paid"
  - transaction_hash: Thirdweb 交易 ID
         ↓
记录审计日志到 audit_logs 表
         ↓
发送通知到 notifications 表
         ↓
✅ 完成！
```

---

## ⚠️ 重要注意事项

### 1. Webhook Secret 安全
- ✅ Secret 已安全存储在 Supabase 环境变量中
- ✅ Edge Function 会验证每个 webhook 请求的签名
- ❌ 不要在客户端代码中暴露 secret

### 2. USDC Approval
- ✅ Server wallet 已经 approve USDC
- ⚠️ 如果更换 server wallet，需要重新执行 approve
- 💡 使用 `/approve-usdc` Edge Function 执行 approve

### 3. Webhook 触发条件
只有满足以下所有条件时才会触发转账：
- ✅ Event type = `token_transfer`
- ✅ Chain = Arbitrum One (42161)
- ✅ Token = USDC (`0xaf88...831`)
- ✅ Recipient (`to`) = server wallet
- ✅ Amount >= 130 USDC

### 4. 防止重复转账
- ✅ 使用 `platform_activation_fees` 表的唯一约束
- ✅ 检查 `(member_wallet, nft_level)` 组合是否已存在
- ✅ 如果已支付，返回成功但不执行转账

---

## 🐛 故障排查

### Webhook 没有触发？
1. 检查 Thirdweb Dashboard 的 webhook 配置
2. 验证 webhook URL 可访问
3. 检查 filter 条件是否正确
4. 查看 Thirdweb webhook 日志

### 转账失败？
1. 检查 server wallet USDC 余额是否充足
2. 验证 USDC approval 是否仍然有效
3. 查看 Edge Function 日志获取详细错误信息
4. 检查 Thirdweb API 凭证是否有效

### 数据库错误？
1. 检查 `platform_activation_fees` 表结构
2. 验证唯一约束 `(member_wallet, nft_level)`
3. 查看 Supabase 日志

---

## 📊 测试结果

### ✅ Approval 测试
```
Transaction ID: c3e9decf-9ee1-4f01-8990-fa08fb838fe1
Status: Success
Token: USDC (0xaf88d065e77c8cC2239327C5EDb3A432268e5831)
Spender: 0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c
Amount: MAX_UINT256 (unlimited)
```

### ✅ 转账测试
```
Transaction ID: c902de9d-ebb6-43dc-898d-d6615af62172
Status: Success
From: 0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c
To: 0x0bA198F73DF3A1374a49Acb2c293ccA20e150Fe0
Amount: 30 USDC
Fee Record ID: 4f70e262-025a-442f-a8f6-701e346c9941
```

---

## 🎉 系统状态

### ✅ 所有组件已就绪
- [x] Edge Functions 部署
- [x] 环境变量配置
- [x] USDC Approval 完成
- [x] 转账功能测试通过
- [x] 数据库集成正常
- [x] Webhook Secret 设置
- [ ] **Thirdweb Dashboard Webhook 配置**（需手动完成）

**准备投入生产！** 🚀

只需在 Thirdweb Dashboard 配置 webhook，系统即可全自动运行。

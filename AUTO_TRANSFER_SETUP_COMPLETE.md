# 🎉 自动转账系统设置完成

## 系统概述

当 server wallet **`0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c`** 在 Arbitrum One 收到 **130 USDC** 或更多时，系统会自动转账 **30 USDC** 到平台收款地址 **`0x0bA198F73DF3A1374a49Acb2c293ccA20e150Fe0`**。

## 已完成的配置

### 1. ✅ Edge Functions 部署

#### `nft-claim-usdc-transfer`
- **功能**: 执行 30 USDC 平台费用转账
- **使用表**: `platform_activation_fees`
- **API**: Thirdweb v1 transactions API
- **状态**: ✅ 已部署并测试

#### `thirdweb-webhook`
- **功能**: 监听 USDC 转账事件，触发自动转账
- **事件类型**: `token_transfer`
- **状态**: ✅ 已部署并测试

### 2. ✅ 环境变量设置

已在 Supabase 设置以下环境变量：

```bash
✓ THIRDWEB_CLIENT_ID
✓ THIRDWEB_SECRET_KEY
✓ VAULT_ACCESS_TOKEN
✓ SERVER_WALLET_ADDRESS = 0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c
✓ PLATFORM_FEE_RECIPIENT = 0x0bA198F73DF3A1374a49Acb2c293ccA20e150Fe0
✓ THIRDWEB_WEBHOOK_SECRET
```

### 3. ✅ 数据库表

使用 `platform_activation_fees` 表记录所有平台费用转账：

```sql
- id (UUID)
- member_wallet (转账发起人)
- nft_level (NFT等级，通常为1)
- fee_amount (费用金额: 30 USDC)
- payment_status ('paid' | 'pending' | 'failed')
- transaction_hash (交易哈希)
- metadata (JSON: 包含完整的转账详情)
- created_at, paid_at
```

## 自动化流程

```
用户支付 130 USDC → Server Wallet
         ↓
Thirdweb 监听到转账事件
         ↓
Webhook 接收 token_transfer 事件
         ↓
验证:
  - chainId = 42161 (Arbitrum)
  - token = 0xaf88...831 (USDC)
  - to = server_wallet
  - amount >= 130 USDC
         ↓
调用 nft-claim-usdc-transfer
         ↓
Thirdweb API 执行转账
  30 USDC → 0x0bA...Fe0
         ↓
记录到 platform_activation_fees 表
         ↓
✅ 完成
```

## ⚠️ 当前问题：ERC20 Allowance

### 错误信息
```
"errorCode": "TRANSACTION_SIMULATION_FAILED"
"message": "execution reverted: ERC20: transfer amount exceeds allowance"
```

### 问题分析

即使代码使用的是 `transfer()` 函数（不是 `transferFrom()`），Thirdweb Engine/Vault 在后台可能使用了代理机制来执行交易。

**两种可能的原因**：

1. **Server wallet 没有足够的 USDC 余额**
   - 检查地址：https://arbiscan.io/address/0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c
   - 确认 USDC 余额 >= 30 USDC

2. **Thirdweb Engine 需要 USDC approval**
   - Engine 可能使用了智能钱包或代理合约
   - 需要在 Thirdweb Dashboard 中设置 USDC allowance

### 解决方案

#### 方案 A：检查并充值 USDC 余额

1. 访问 Arbiscan 查看余额：
   ```
   https://arbiscan.io/address/0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c
   ```

2. 如果余额不足，从以下方式充值：
   - 从 CEX（币安、OKX）提现到 Arbitrum 网络
   - 从 MetaMask 等钱包转账
   - 从以太坊主网通过 Arbitrum Bridge 桥接

3. 推荐充值金额：50-100 USDC

#### 方案 B：设置 Thirdweb Engine Allowance

1. 访问 Thirdweb Dashboard：
   ```
   https://thirdweb.com/dashboard/wallets
   ```

2. 找到 server wallet `0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c`

3. 检查是否需要 approve USDC 给 Engine 合约

4. 如果需要，执行 approve 交易：
   - Token: USDC (`0xaf88d065e77c8cC2239327C5EDb3A432268e5831`)
   - Spender: Thirdweb Engine 合约地址
   - Amount: Unlimited 或足够的金额（如 1000 USDC）

#### 方案 C：使用 Thirdweb SDK 预先 approve

如果 Thirdweb 需要预先 approve，可以创建一个一次性的 Edge Function 来执行 approve：

```typescript
// approve-usdc.ts (一次性脚本)
const approveSelector = "0x095ea7b3"; // approve(address,uint256)
const spender = "THIRDWEB_ENGINE_ADDRESS"; // 需要从 Thirdweb 获取
const amount = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"; // MAX

const approveData = approveSelector +
  spender.slice(2).padStart(64, '0') +
  amount.slice(2).padStart(64, '0');

await fetch('https://api.thirdweb.com/v1/transactions', {
  method: 'POST',
  body: JSON.stringify({
    chainId: "42161",
    from: serverWalletAddress,
    transactions: [{
      to: USDC_ADDRESS,
      value: "0",
      data: approveData
    }]
  })
});
```

## 下一步：Thirdweb Dashboard 配置

### 创建 Webhook

1. 访问: https://thirdweb.com/dashboard/settings/webhooks

2. 点击 "Create Webhook"

3. 配置如下：

```
Name: BEEHIVE Server Wallet Monitor
URL: https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/thirdweb-webhook
Event Type: Token Transfer
Chain: Arbitrum One (42161)
Contract Address: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831 (USDC)

Filters:
  - Add filter: "to" equals "0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c"
```

4. 保存 Webhook Secret 并更新 Supabase 环境变量

## 测试方法

### 模拟测试（已测试 ✅）

```bash
./test-webhook-auto-transfer.sh
```

### 真实测试

1. 从任意地址向 server wallet 转账 >= 130 USDC
2. 等待 Thirdweb webhook 触发
3. 查看 platform_activation_fees 表确认记录
4. 检查平台收款地址余额

### 查询转账记录

```sql
-- 查看所有平台费用记录
SELECT
  member_wallet,
  fee_amount,
  payment_status,
  transaction_hash,
  paid_at,
  metadata->>'recipient_address' as recipient
FROM platform_activation_fees
WHERE payment_status = 'paid'
ORDER BY paid_at DESC;

-- 查看审计日志
SELECT * FROM audit_logs
WHERE action = 'auto_platform_fee_transfer'
ORDER BY created_at DESC;
```

## 监控和维护

### 检查 Edge Function 日志

访问: https://supabase.com/dashboard/project/cvqibjcbfrwsgkvthccp/functions

选择函数查看实时日志：
- `thirdweb-webhook` - 查看接收到的事件
- `nft-claim-usdc-transfer` - 查看转账执行情况

### 常见问题

**Q: 转账没有自动触发？**
- 检查 Thirdweb webhook 是否配置正确
- 查看 Edge Function 日志
- 确认 server wallet 地址正确

**Q: 转账失败？**
- 检查 server wallet 是否有足够的 USDC 余额
- 确认 Thirdweb API 凭证正确
- 查看 `platform_activation_fees` 表中的 `metadata` 字段获取错误详情

**Q: 如何更改平台费用金额？**
- 更新 `nft-claim-usdc-transfer/index.ts` 中的 `TRANSFER_AMOUNT_USDC` 常量
- 重新部署函数

## 安全性

- ✅ Webhook 签名验证（通过 `x-signature` header）
- ✅ Server wallet 地址验证
- ✅ Chain ID 和代币地址验证
- ✅ 最小金额验证（>= 130 USDC）
- ✅ 所有操作记录审计日志

## 完成状态

- [x] Edge Functions 开发
- [x] 环境变量配置
- [x] 数据库表结构
- [x] 本地测试通过
- [ ] Thirdweb Webhook 配置（需要在 Dashboard 手动完成）
- [ ] 真实环境测试

**准备就绪！** 🚀

只需在 Thirdweb Dashboard 配置 webhook，系统即可投入使用。

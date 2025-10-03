# USDC 转账问题修复报告

## 🔍 问题描述

用户报告：claim 成功后没有分配 30 USDC 到 0x0bA198F73DF3A1374a49Acb2c293ccA20e150Fe0 钱包

## 📊 数据库调查结果

### platform_activation_fees 表

```sql
SELECT id, member_wallet, nft_level, fee_amount, payment_status, transaction_hash
FROM platform_activation_fees
WHERE member_wallet = '0x17f5A6885ca39cc10983C76e9a476855E7b048aa';
```

**结果**:
```
id: 585802d2-5807-4f0a-957c-43b98ce18b0c
member_wallet: 0x17f5A6885ca39cc10983C76e9a476855E7b048aa
nft_level: 1
fee_amount: 30 USDC
payment_status: paid
transaction_hash: (空)
paid_at: 2025-10-03 08:08:24
```

### audit_logs 表

```sql
SELECT * FROM audit_logs WHERE action LIKE '%usdc%';
```

**结果**: 0 rows (没有 USDC 转账记录)

## 🐛 根本原因

### 1. ❌ TransactionHash 验证缺失

在 `WelcomeLevel1ClaimButton.tsx:381` 中，手动检查 NFT 的代码路径使用了假的交易哈希：

```typescript
// 错误的代码
handlePaymentSuccess('manual_check');  // ❌ 不是真实的交易哈希
```

### 2. ❌ activate-membership 的条件检查

在 `activate-membership/index.ts:298` 中：

```typescript
if (level === 1 && transactionHash) {
  // 调用 nft-claim-usdc-transfer
}
```

**问题**: 当 `transactionHash` 是 `'manual_check'` 或其他无效值时，虽然条件通过了，但 `nft-claim-usdc-transfer` 函数内部可能会失败或跳过实际转账。

### 3. ⚠️ 缺少环境变量

**必需的环境变量** (用于 nft-claim-usdc-transfer):
- `VITE_THIRDWEB_CLIENT_ID` ✅ (已配置)
- `VITE_THIRDWEB_SECRET_KEY` ✅ (已配置)
- `VITE_SERVER_WALLET_ADDRESS` ✅ (已配置)
- `VITE_VAULT_ACCESS_TOKEN` ❓ (需要验证)

**VITE_VAULT_ACCESS_TOKEN** 是 Thirdweb Vault 的访问令牌，用于从服务器钱包签署 USDC 转账交易。

## ✅ 已修复的问题

### Fix 1: TransactionHash 验证

**文件**: `src/components/membership/WelcomeLevel1ClaimButton.tsx:402-410`

```typescript
// 添加交易哈希验证
const isValidTxHash = transactionHash &&
                      transactionHash.startsWith('0x') &&
                      transactionHash.length === 66;

if (!isValidTxHash) {
  console.warn('⚠️ Invalid transaction hash:', transactionHash);
  console.log('💡 Skipping USDC transfer for non-blockchain transaction');
}

// 只在有效时传递 transactionHash
body: JSON.stringify({
  transactionHash: isValidTxHash ? transactionHash : undefined,
  level: 1,
  paymentMethod: 'multi_chain',
  paymentAmount: LEVEL_1_PRICE_USDC,
  referrerWallet: referrerWallet
})
```

**效果**:
- ✅ 只有真实的区块链交易哈希才会触发 USDC 转账
- ✅ 手动检查路径（如 `'manual_check'`）不会触发转账
- ✅ 避免使用无效交易哈希导致的错误

## 📋 待验证的问题

### 1. VITE_VAULT_ACCESS_TOKEN 环境变量

需要验证这个环境变量是否已在 Supabase Edge Functions 中配置。

**如何获取 VAULT_ACCESS_TOKEN**:
1. 访问 Thirdweb Dashboard: https://thirdweb.com/dashboard/engine
2. 创建或选择一个 Engine instance
3. 生成 Vault Access Token
4. 将 token 添加到 Supabase secrets:
   ```bash
   supabase secrets set VITE_VAULT_ACCESS_TOKEN=<your-token>
   ```

### 2. nft-claim-usdc-transfer 部署状态

验证 Edge Function 是否正确部署：

```bash
# 列出所有已部署的 Edge Functions
supabase functions list

# 查看 nft-claim-usdc-transfer 的日志
supabase functions logs nft-claim-usdc-transfer
```

### 3. 服务器钱包余额

验证服务器钱包 (0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c) 是否有足够的 USDC 余额：

**需要**:
- 至少 30 USDC 余额
- 足够的 ETH 用于 gas 费

可以在 Arbitrum One 区块浏览器查看：
https://arbiscan.io/address/0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c

## 🧪 测试步骤

### 1. 本地测试 Edge Function

```bash
npx tsx diagnose-usdc-transfer.ts
```

这个脚本会：
- ✅ 检查所有必需的环境变量
- ✅ 查询 platform_activation_fees 表
- ✅ 测试调用 nft-claim-usdc-transfer Edge Function

### 2. 完整的 Claim 流程测试

1. 连接钱包到 Arbitrum One
2. 确保钱包有:
   - 至少 130 USDC
   - 足够的 ETH 用于 gas
3. 点击 "Claim Level 1"
4. Approve USDC (如果需要)
5. 确认 claim 交易
6. 等待交易确认
7. **验证步骤**:
   - 检查 platform_activation_fees 表是否有新记录
   - 检查 transaction_hash 是否是有效的区块链交易哈希（66 字符，以 0x 开头）
   - 检查 payment_status 是否为 "paid"
   - 检查 audit_logs 表是否有 "nft_claim_usdc_transfer" 记录
   - 检查收款地址 0x0bA198F73DF3A1374a49Acb2c293ccA20e150Fe0 是否收到 30 USDC

## 🔧 如何修复历史记录

对于已经 claim 但没有收到 USDC 转账的用户，可以手动触发转账：

### 方法 1: 使用 SQL 查找缺失的转账

```sql
-- 找出所有已支付但没有 transaction_hash 的记录
SELECT id, member_wallet, nft_level, fee_amount, payment_status, paid_at
FROM platform_activation_fees
WHERE payment_status = 'paid'
  AND transaction_hash IS NULL
  AND nft_level = 1
ORDER BY paid_at DESC;
```

### 方法 2: 手动调用 nft-claim-usdc-transfer

对于每个缺失的记录，获取对应的 NFT claim 交易哈希，然后手动调用 Edge Function：

```bash
curl -X POST \\
  https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/nft-claim-usdc-transfer \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \\
  -d '{
    "token_id": "1",
    "claimer_address": "0x17f5A6885ca39cc10983C76e9a476855E7b048aa",
    "transaction_hash": "<REAL_NFT_CLAIM_TX_HASH>"
  }'
```

**注意**: 需要找到真实的 NFT claim 交易哈希。可以从：
1. 用户的钱包历史记录
2. Arbitrum One 区块浏览器
3. membership 表的元数据（如果保存了）

## 📝 配置检查清单

- [ ] `.env` 文件包含所有必需的环境变量
- [ ] Supabase Edge Functions secrets 已配置
- [ ] 服务器钱包有足够的 USDC 和 ETH
- [ ] nft-claim-usdc-transfer Edge Function 已部署
- [ ] TransactionHash 验证已添加到前端代码
- [ ] 已重新 build 和部署前端代码

## 🚀 部署步骤

### 1. 更新前端代码

```bash
npm run build
git add .
git commit -m "Fix: Add transaction hash validation for USDC transfer"
git push origin api
```

### 2. 配置 Supabase Secrets

```bash
# 如果还没有配置 VAULT_ACCESS_TOKEN
supabase secrets set VITE_VAULT_ACCESS_TOKEN=<your-vault-token>

# 重新部署 Edge Functions
npm run deploy:functions
```

### 3. 验证部署

```bash
# 检查 Edge Function 日志
supabase functions logs nft-claim-usdc-transfer --tail

# 测试调用
npx tsx diagnose-usdc-transfer.ts
```

## 📌 总结

### 根本原因
1. ❌ 前端代码使用假的交易哈希 `'manual_check'` 调用 activation
2. ❌ activate-membership 没有验证交易哈希的有效性
3. ⚠️ 可能缺少 VITE_VAULT_ACCESS_TOKEN 环境变量

### 已修复
- ✅ 添加 transactionHash 验证逻辑
- ✅ 只在有效交易哈希时触发 USDC 转账
- ✅ 添加详细的日志输出

### 待完成
- [ ] 验证 VITE_VAULT_ACCESS_TOKEN 配置
- [ ] 重新部署 Edge Functions
- [ ] 测试完整的 claim 流程
- [ ] 为历史记录手动补发 30 USDC

## 🎯 下一步操作

1. **立即**: 运行 `npx tsx diagnose-usdc-transfer.ts` 检查配置
2. **如果缺少 VAULT_ACCESS_TOKEN**: 从 Thirdweb 获取并配置
3. **重新部署**: `npm run deploy:functions` 部署更新后的 Edge Functions
4. **测试**: 使用新钱包进行完整的 claim 测试
5. **修复历史**: 为已 claim 但未转账的用户补发 30 USDC

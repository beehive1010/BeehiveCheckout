# NFT 合约和支付代币更新 - USDT

## 🔄 更新时间
2025-10-03

## 📋 更新内容

### 1. NFT 合约地址更新

**旧合约**: `0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8`
**新合约**: `0x15742D22f64985bC124676e206FCE3fFEb175719`

### 2. 支付代币变更

**旧代币**: USDC - `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
**新代币**: USDT - `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9`

**链**: Arbitrum One (Chain ID: 42161)

## ✅ 已更新的文件

### 1. Edge Functions

#### activate-membership/index.ts
**行号**: 94
```typescript
// 旧代码
address: '0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8'

// 新代码
address: '0x15742D22f64985bC124676e206FCE3fFEb175719'
```

#### nft-claim-usdc-transfer/index.ts
**行号**: 10-12
```typescript
// 旧代码
const NFT_CONTRACT = "0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8";
const USDC_TOKEN_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

// 新代码
const NFT_CONTRACT = "0x15742D22f64985bC124676e206FCE3fFEb175719";
const USDT_TOKEN_ADDRESS = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
```

**所有 USDC 引用改为 USDT**:
- 变量名: `USDC_TOKEN_ADDRESS` → `USDT_TOKEN_ADDRESS`
- 变量名: `TRANSFER_AMOUNT_USDC` → `TRANSFER_AMOUNT_USDT`
- 日志消息: "USDC" → "USDT"
- Notification type: "usdc_transfer" → "usdt_transfer"
- Audit action: "nft_claim_usdc_transfer" → "nft_claim_usdt_transfer"
- Interface: `usdc_received` → `usdt_received`

### 2. 环境变量 (.env)

```bash
# 旧配置
VITE_MEMBERSHIP_NFT_CONTRACT=0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8

# 新配置
VITE_MEMBERSHIP_NFT_CONTRACT=0x15742D22f64985bC124676e206FCE3fFEb175719
```

## ⚠️ 重要注意事项

### 1. NFT 合约的 Claim Conditions

**关键问题**: 新的 NFT 合约必须配置 claim conditions 使用 **USDT** 作为支付代币。

需要在 Thirdweb Dashboard 中验证:
1. 访问: https://thirdweb.com/42161/0x15742D22f64985bC124676e206FCE3fFEb175719/nfts
2. 检查 Token ID 1 的 Claim Conditions
3. 确认 `currency` 字段设置为: `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9` (USDT)
4. 确认 `pricePerToken` 设置为: `130000000` (130 USDT，6 decimals)

### 2. 前端代码可能需要更新

**文件**: `src/components/membership/WelcomeLevel1ClaimButton.tsx`

目前前端代码中有多处 "USDC" 文本引用：
- 行 45: `const LEVEL_1_PRICE_USDC = 130;`
- 行 478: `{LEVEL_1_PRICE_USDC} USDC`
- 行 503: `Arbitrum One - USDC Payment`
- 行 505: `Pay with USDC on Arbitrum One`
- 行 575: `Claim Level 1 - {LEVEL_1_PRICE_USDC} USDC`
- 行 597: `💳 USDC payment on Arbitrum One`

**建议**:
- 如果 NFT 合约确实使用 USDT，应该将所有 "USDC" 文本改为 "USDT"
- 变量名 `LEVEL_1_PRICE_USDC` 改为 `LEVEL_1_PRICE_USDT`

### 3. Approval 流程

`getApprovalForTransaction` 会自动检测 NFT 合约配置的支付代币。
- 如果 NFT 合约配置的是 USDT，它会自动请求 USDT approval
- 如果 NFT 合约配置的是 USDC，它仍然会请求 USDC approval

**因此，前端代码的更新取决于 NFT 合约的实际配置！**

### 4. 30 USDT 平台费转账

nft-claim-usdc-transfer Edge Function 已更新为转账 USDT：
- ✅ 从服务器钱包转 30 USDT
- ✅ 到收款地址: 0x0bA198F73DF3A1374a49Acb2c293ccA20e150Fe0
- ⚠️ 需要确保服务器钱包有足够的 USDT 余额

## 📊 服务器钱包余额检查

### USDC 余额
- 当前: 96.75 USDC
- 可支持: 3 次转账

### USDT 余额
- ⚠️ **需要检查**: 服务器钱包 `0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c` 的 USDT 余额
- 需要充值 USDT 以支持平台费转账

## 🧪 验证步骤

### 1. 检查新 NFT 合约配置

```bash
# 创建脚本检查新合约的 claim conditions
npx tsx check-new-nft-contract.ts
```

### 2. 检查服务器钱包 USDT 余额

访问 Arbiscan:
```
https://arbiscan.io/token/0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9?a=0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c
```

或创建脚本:
```typescript
import { balanceOf } from "thirdweb/extensions/erc20";

const usdtBalance = await balanceOf({
  contract: usdtContract,
  address: "0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c",
});
```

### 3. 测试完整流程

1. 连接钱包到 Arbitrum One
2. 访问 Welcome 页面
3. 点击 "Claim Level 1"
4. 验证 approval 请求的是 USDT（不是 USDC）
5. 确认 claim 交易
6. 验证 NFT mint 成功
7. 验证 30 USDT 转账到收款地址

## 🚀 部署步骤

### 1. 重新部署 Edge Functions

```bash
npm run functions:deploy:all
```

这会部署更新后的:
- activate-membership (新 NFT 合约地址)
- nft-claim-usdc-transfer (USDT 支付)

### 2. 前端代码更新（如果需要）

如果 NFT 合约配置的是 USDT，更新前端文本:

```typescript
// src/components/membership/WelcomeLevel1ClaimButton.tsx

// 1. 更新变量名
const LEVEL_1_PRICE_USDT = 130;  // 改为 USDT

// 2. 更新所有显示文本
- {LEVEL_1_PRICE_USDC} USDC → {LEVEL_1_PRICE_USDT} USDT
- "USDC Payment" → "USDT Payment"
- "Pay with USDC" → "Pay with USDT"
- 'Approving USDC...' → 'Approving USDT...'
```

### 3. Build 前端代码

```bash
npm run build
```

### 4. 充值服务器钱包

向 `0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c` 充值:
- USDT: 建议 300-500 USDT (用于平台费转账)
- ETH: 建议 0.01-0.05 ETH (用于 gas)

## 📝 合约对比

### 旧 NFT 合约
- 地址: `0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8`
- 支付: USDC
- 价格: 130 USDC

### 新 NFT 合约
- 地址: `0x15742D22f64985bC124676e206FCE3fFEb175719`
- 支付: USDT (待确认)
- 价格: 130 USDT (待确认)

## ⚠️ 待办事项

- [ ] 验证新 NFT 合约的 claim conditions
- [ ] 确认支付代币确实是 USDT
- [ ] 检查服务器钱包 USDT 余额
- [ ] 充值 USDT 到服务器钱包
- [ ] 更新前端代码中的 USDC → USDT 文本
- [ ] 重新部署 Edge Functions
- [ ] Build 前端代码
- [ ] 测试完整的 claim 流程
- [ ] 验证 30 USDT 平台费转账

## 🎯 总结

Edge Functions 已更新为使用新的 NFT 合约和 USDT 支付。下一步需要:

1. **验证 NFT 合约配置**: 确认新合约确实使用 USDT
2. **检查 USDT 余额**: 确保服务器钱包有足够的 USDT
3. **更新前端文本**: 如果确认使用 USDT，更新所有 "USDC" → "USDT"
4. **重新部署**: Edge Functions 和前端代码
5. **完整测试**: 验证整个 claim 流程

**关键**: 一切取决于新 NFT 合约的实际配置！

# 多链支付集成指南

## 概述

BEEHIVE 项目已集成 Thirdweb v5 的多链支付功能，用户可以使用任何支持的区块链上的 USDC 支付来购买 NFT 会员。

## 方案说明

Thirdweb 提供了两种多链支付方案：

### 方案 1: TransactionButton + PayModal （推荐）✅

**优点:**
- 内置 UI，开箱即用
- 自动处理跨链桥接
- 支持多种支付代币
- 用户体验最佳

**使用示例:**

```tsx
import { Level1ClaimButtonWithPayModal } from '@/components/membership';

<Level1ClaimButtonWithPayModal
  referrerWallet={referrerWallet}
  onSuccess={() => navigate('/dashboard')}
  onError={(error) => console.error(error)}
/>
```

### 方案 2: 自定义多链支付组件

**优点:**
- 完全自定义 UI
- 精确控制支付流程
- 可集成自定义桥接逻辑

**使用示例:**

```tsx
import { MultiChainNFTClaimButton } from '@/components/membership';

<MultiChainNFTClaimButton
  level={1}
  priceUSDC={130}
  walletAddress={walletAddress}
  referrerWallet={referrerWallet}
  onSuccess={handleSuccess}
  onError={handleError}
/>
```

## 支持的区块链

当前支持以下区块链的 USDC 支付：

| 区块链 | Chain ID | USDC 合约地址 |
|--------|----------|---------------|
| Ethereum | 1 | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| Polygon | 137 | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` |
| Arbitrum | 42161 | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| Optimism | 10 | `0x7F5c764cBc14f9669B88837ca1490cCa17c31607` |
| Base | 8453 | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| BSC | 56 | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` |

## 配置 PayModal

在 `TransactionButton` 中启用 PayModal：

```tsx
<TransactionButton
  transaction={() => preparedTransaction}
  onTransactionConfirmed={handleSuccess}
  onError={handleError}
  payModal={{
    theme: 'dark',
    supportedTokens: {
      1: [{ address: '0xA0b...', name: 'USDC', symbol: 'USDC' }], // Ethereum
      137: [{ address: '0x279...', name: 'USDC', symbol: 'USDC' }], // Polygon
      42161: [{ address: '0xaf8...', name: 'USDC', symbol: 'USDC' }], // Arbitrum
      // ... 其他链
    }
  }}
>
  Claim NFT - 130 USDC
</TransactionButton>
```

## 工作流程

### 用户支付流程

1. 用户点击 "Claim NFT" 按钮
2. PayModal 弹出，显示支持的支付链
3. 用户选择任意链上的 USDC
4. 如果不在 Arbitrum，Thirdweb 自动桥接到 Arbitrum
5. 交易完成后，NFT 铸造到用户钱包
6. 后端激活会员身份

### 后端处理流程

1. 监听 NFT claim 交易
2. 验证支付金额和交易有效性
3. 创建 membership 记录
4. 创建 members 记录
5. 执行 matrix placement
6. 触发 layer rewards
7. （Level 1）触发 30 USDC 转账到指定地址

## 集成到现有页面

### Welcome 页面

```tsx
// src/pages/Welcome.tsx
import { Level1ClaimButtonWithPayModal } from '@/components/membership';

<Level1ClaimButtonWithPayModal
  referrerWallet={referrerWallet}
  onSuccess={() => setLocation('/dashboard')}
/>
```

### NFTs 页面

```tsx
// src/pages/NFTs.tsx
import { MultiChainNFTClaimButton } from '@/components/membership';

{[1, 2, 3, 4, 5].map(level => (
  <MultiChainNFTClaimButton
    key={level}
    level={level}
    priceUSDC={levelPrices[level]}
    walletAddress={walletAddress}
    onSuccess={handleClaimSuccess}
  />
))}
```

### Membership 页面

已有 `MultiChainMembershipClaim` 组件可直接使用：

```tsx
import MultiChainMembershipClaim from '@/components/membership/MultiChainMembershipClaim';

<MultiChainMembershipClaim
  walletAddress={walletAddress}
  level={selectedLevel}
  onSuccess={() => navigate('/dashboard')}
  onError={(error) => showError(error)}
/>
```

## 测试页面

访问 `/multi-chain-claim-demo` 查看完整的多链支付演示，包括：

- 5 个级别的会员 NFT
- 每个级别的详细信息
- 多链支付按钮
- 使用说明

## 环境变量

确保以下环境变量已配置：

```env
VITE_THIRDWEB_CLIENT_ID=your_client_id
VITE_MEMBERSHIP_NFT_CONTRACT=0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 后端 Edge Function

多链支付需要后端 `multi-chain-payment` Edge Function 支持：

**端点:** `POST /functions/v1/multi-chain-payment`

**请求体:**
```json
{
  "transactionHash": "0x...",
  "chainId": 1,
  "walletAddress": "0x...",
  "level": 1,
  "amount": 130,
  "referrerWallet": "0x...",
  "paymentPurpose": "membership_activation"
}
```

**响应:**
```json
{
  "success": true,
  "membership": {...},
  "nftMinted": true
}
```

## 注意事项

1. **Gas 费用**: Thirdweb 可能会收取跨链桥接的 gas 费用
2. **桥接时间**: 跨链支付可能需要几分钟完成
3. **失败处理**: 如果桥接失败，用户的 USDC 会退回原链
4. **测试网**: 测试网不支持 PayModal，建议直接在 Arbitrum 测试网测试

## 最佳实践

1. ✅ 使用 `PayModal` 提供最佳用户体验
2. ✅ 显示支持的支付链列表
3. ✅ 提供清晰的错误信息
4. ✅ 显示交易进度和状态
5. ✅ 在交易完成后自动刷新用户状态

## 故障排查

### PayModal 不显示

确保：
- Thirdweb client ID 正确配置
- `supportedTokens` 配置正确
- 用户钱包已连接

### 跨链支付失败

检查：
- 用户在源链上有足够的 USDC
- 用户有足够的 gas 费
- 网络连接正常
- 合约地址正确

### 后端激活失败

验证：
- Edge Function 正常运行
- 数据库连接正常
- 用户已注册
- referrer 有效

## 相关资源

- [Thirdweb Pay 文档](https://portal.thirdweb.com/connect/pay/overview)
- [TransactionButton 文档](https://portal.thirdweb.com/react/v5/TransactionButton)
- [PayEmbed 文档](https://portal.thirdweb.com/react/v5/PayEmbed)

# Checkout Widget Test Branch

## 概述

这个分支测试使用 **Thirdweb CheckoutWidget (PayEmbed)** 替代当前的 **TransactionButton + PayModal** 方式来处理NFT claim。

## 主要变更

### 新增文件

1. **src/components/membership/Level1ClaimWithCheckout.tsx**
   - 使用 `PayEmbed` 组件接收USDT支付
   - 用户支付到服务器钱包
   - 支付成功后调用后端mint NFT

2. **supabase/functions/mint-and-send-nft/index.ts**
   - 验证支付交易
   - 使用 Thirdweb Engine 从服务器钱包mint NFT
   - 发送NFT给用户
   - 激活membership

3. **src/pages/CheckoutTest.tsx**
   - 测试页面，访问 `/checkout-test`
   - 展示新的支付流程

### 修改文件

- **src/App.tsx**: 添加 `/checkout-test` 路由

## 两种方案对比

### 方案A: TransactionButton + PayModal (当前方式)

```typescript
<TransactionButton
  transaction={() => claimTransaction}
  payModal={{
    supportedTokens: { /* 多链USDT */ }
  }}
>
  Claim NFT
</TransactionButton>
```

**流程:**
1. 用户点击按钮
2. PayModal打开，用户选择链和代币
3. 自动跨链桥接（如需要）
4. 用户直接调用合约claim NFT
5. NFT直接mint到用户钱包

**优点:**
- 去中心化，用户直接与合约交互
- 无需信任服务器
- NFT立即到账

**缺点:**
- 用户需要支付gas费
- 需要合约支持claim逻辑
- 多链支付需要复杂的claim条件配置

---

### 方案B: CheckoutWidget (测试方式)

```typescript
<PayEmbed
  payOptions={{
    mode: 'direct_payment',
    paymentInfo: {
      amount: '130',
      token: USDT,
      sellerAddress: SERVER_WALLET
    }
  }}
  onPaymentSuccess={handleMint}
/>
```

**流程:**
1. 用户点击支付
2. CheckoutWidget打开
3. 用户支付USDT到服务器钱包
4. 支付成功后，后端验证交易
5. 服务器钱包通过Thirdweb Engine mint NFT
6. NFT发送给用户

**优点:**
- ✅ 用户无需支付gas费
- ✅ UX更简单（只需支付）
- ✅ 服务器控制NFT分发
- ✅ 可以做更多验证和业务逻辑
- ✅ 支持多链支付更灵活

**缺点:**
- ❌ 需要信任服务器
- ❌ NFT发送有延迟
- ❌ 服务器需要承担gas费

## 技术细节

### PayEmbed配置

```typescript
<PayEmbed
  client={thirdwebClient}
  payOptions={{
    mode: 'direct_payment',
    paymentInfo: {
      amount: '130',
      chain: arbitrum,
      token: {
        address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // USDT
        symbol: 'USDT',
        decimals: 6
      },
      sellerAddress: SERVER_WALLET
    },
    metadata: {
      level: '1',
      buyer: userAddress,
      referrer: referrerWallet
    }
  }}
  onPaymentSuccess={handlePaymentSuccess}
/>
```

### 服务器端Minting

```typescript
// mint-and-send-nft Edge Function
async function mintNFTViaEngine(recipient, level) {
  const response = await fetch(
    `${ENGINE_URL}/contract/${chainId}/${nftContract}/erc1155/mint-to`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ENGINE_ACCESS_TOKEN}`,
        'x-backend-wallet-address': SERVER_WALLET
      },
      body: JSON.stringify({
        receiver: recipient,
        tokenId: level.toString(),
        amount: '1'
      })
    }
  );

  return response.json();
}
```

## 环境变量需求

需要在 Supabase Edge Functions 中配置：

```bash
THIRDWEB_ENGINE_URL=https://your-engine-url.com
THIRDWEB_ENGINE_ACCESS_TOKEN=your_access_token
THIRDWEB_BACKEND_WALLET=0x_server_wallet_address
VITE_MEMBERSHIP_NFT_CONTRACT=0x_nft_contract_address
```

## 测试步骤

1. **启动开发服务器**
   ```bash
   npm run dev
   ```

2. **访问测试页面**
   ```
   http://localhost:5173/checkout-test
   ```

3. **连接钱包**
   - 确保已注册
   - 确保未持有Level 1 NFT

4. **点击支付按钮**
   - PayEmbed会打开
   - 选择支付链（可以跨链）
   - 确认支付

5. **等待NFT到账**
   - 支付成功后
   - 后端验证并mint NFT
   - NFT发送到钱包

## 部署Edge Function

```bash
export SUPABASE_ACCESS_TOKEN=sbp_your_token

supabase functions deploy mint-and-send-nft \
  --project-ref cvqibjcbfrwsgkvthccp
```

## 安全考虑

### 支付验证

后端必须验证：
- ✅ 交易确实发生
- ✅ 支付金额正确（130 USDT）
- ✅ 支付接收方是服务器钱包
- ✅ 用户未重复claim

### 防重放攻击

```typescript
// 检查该支付是否已处理
const { data: existingMint } = await supabase
  .from('nft_mints')
  .select('id')
  .eq('payment_tx_hash', paymentTxHash)
  .single();

if (existingMint) {
  throw new Error('Payment already processed');
}
```

## 成本分析

### 方案A成本（TransactionButton）
- 用户: 支付gas费 (~$0.5-2)
- 服务器: 无成本

### 方案B成本（CheckoutWidget）
- 用户: 无gas费
- 服务器: 支付mint gas费 (~$0.5-2 per NFT)

**月成本估算（100个NFT）:**
- 服务器承担: $50-200/月
- 可以从NFT售价中预留gas费用

## 推荐方案

根据目标用户和业务模式选择：

1. **选择方案A** 如果:
   - 用户对crypto熟悉
   - 希望完全去中心化
   - 不想承担gas费

2. **选择方案B** 如果:
   - 用户是Web2用户
   - 希望最简单的UX
   - 可以承担gas费成本
   - 需要更多控制权

## 下一步

1. **测试支付流程**
   - 在测试网测试完整流程
   - 验证所有边界情况

2. **性能优化**
   - 批量mint优化
   - 交易队列管理

3. **监控和日志**
   - 支付成功率
   - Mint成功率
   - 错误追踪

4. **用户体验优化**
   - Loading状态
   - 错误处理
   - 交易状态通知

## 联系信息

如有问题，请查看：
- Thirdweb PayEmbed文档: https://portal.thirdweb.com/connect/pay/overview
- Thirdweb Engine文档: https://portal.thirdweb.com/engine

# WelcomeLevel1ClaimButton - Claim Flow Test Guide

## 已完成的改进

### 1. 创建了 `useMembershipNFT` Hook
- 路径: `src/hooks/useMembershipNFT.ts`
- 功能: 提供统一的 NFT 合约访问接口
- 配置:
  - NFT 合约: `0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8`
  - 链: Arbitrum One (Chain ID: 42161)
  - 客户端 ID: 从环境变量获取

### 2. 更新了 `WelcomeLevel1ClaimButton` 组件
- 路径: `src/components/membership/WelcomeLevel1ClaimButton.tsx`
- 主要改进:
  - ✅ 添加了 ERC20 approval 流程
  - ✅ 集成了 `getApprovalForTransaction` 自动处理 USDC approval
  - ✅ 添加了详细的 toast 通知
  - ✅ 保留了所有现有功能（注册验证、referrer 验证等）

## 新的 Claim 流程

### 步骤 1: 用户点击 "Claim Level 1" 按钮

#### 前置检查:
1. ✅ 钱包已连接
2. ✅ 网络正确 (Arbitrum One)
3. ✅ 用户已注册
4. ✅ Referrer 有效
5. ✅ 用户未拥有 Level 1 NFT

### 步骤 2: ERC20 Approval 流程

#### 2.1 钱包签名提示
```
🔐 Wallet Signature Required
Please sign the transaction in your wallet to approve USDC spending
```

用户需要在钱包中签名 approval 交易

#### 2.2 区块链确认等待
```
⏳ Blockchain Confirmation
Waiting for blockchain confirmation... This may take 2-3 minutes.
Time remaining: 3:00
```

显示倒计时（最多 3 分钟）

#### 2.3 Approval 成功
```
✅ Approval Successful
USDC spending approved! Opening payment interface...
```

### 步骤 3: PayEmbed 支付界面

PayEmbed 自动打开，用户可以:
- 使用 USDC 完成支付
- 支持多链 USDC (通过 Thirdweb 跨链桥)

### 步骤 4: NFT Claim 成功

```
🎉 Level 1 NFT Claimed!
Processing membership activation...
```

### 步骤 5: 会员激活

```
🎉 Welcome to BEEHIVE!
Your Level 1 membership is now active.
```

## Toast 通知总结

### 成功流程的所有通知:

1. **🔐 Wallet Signature Required** - 请求钱包签名
2. **⏳ Blockchain Confirmation** - 等待区块链确认（带倒计时）
3. **✅ Approval Successful** - Approval 成功
4. **🎉 Level 1 NFT Claimed!** - NFT 领取成功
5. **🎉 Welcome to BEEHIVE!** - 会员激活成功

### 错误处理通知:

1. **❌ Approval Failed**
   - `Insufficient funds for gas fees` - Gas 不足
   - `Transaction rejected by user` - 用户拒绝
   - `Approval failed. Please try again.` - 其他错误

2. **Registration Required** - 用户未注册
3. **Invalid Referrer** - Referrer 无效
4. **Wrong Network** - 网络错误
5. **Already Owns NFT** - 已拥有 NFT

## 关键技术点

### 1. ERC20 Approval 自动处理
```typescript
const claimTx = claimTo({
  contract: nftContract,
  to: account.address,
  tokenId: BigInt(1),
  quantity: BigInt(1),
});

const approveTx = await getApprovalForTransaction({
  transaction: claimTx,
  account,
});

if (approveTx) {
  await sendAndConfirmTransaction({ transaction: approveTx, account });
}
```

### 2. Countdown 倒计时
```typescript
useEffect(() => {
  let timer: any;
  if (approvalStep === "approving") {
    setCountdown(180); // 3 minutes
    timer = setInterval(() => {
      setCountdown(c => {
        if (!c || c <= 1) return 0;
        return c - 1;
      });
    }, 1000);
  } else {
    setCountdown(undefined);
  }
  return () => timer && clearInterval(timer);
}, [approvalStep]);
```

### 3. 保留的验证功能
- ✅ 用户注册检查
- ✅ Referrer 验证（支持 activated member 和 registered user）
- ✅ 防止自我推荐
- ✅ NFT 余额检查
- ✅ 网络检查

## 测试清单

### 基础功能测试:
- [ ] 未连接钱包 → 显示 "Connect Wallet" 提示
- [ ] 错误网络 → 显示网络切换按钮
- [ ] 未注册用户 → 自动打开注册弹窗
- [ ] 无效 referrer → 显示错误提示
- [ ] 已拥有 NFT → 显示 "Already own NFT" 消息

### Approval 流程测试:
- [ ] 点击 Claim 按钮 → 显示钱包签名提示
- [ ] 钱包签名 → 显示区块链确认等待（带倒计时）
- [ ] Approval 确认 → 显示成功消息并打开 PayEmbed
- [ ] 拒绝签名 → 显示 "Transaction rejected" 错误

### PayEmbed 测试:
- [ ] PayEmbed 正确显示价格 (130 USDC)
- [ ] 支付成功 → 触发 NFT claim
- [ ] 关闭 PayEmbed → 重新检查 NFT 余额

### 激活测试:
- [ ] NFT claim 成功 → 调用 activate-membership API
- [ ] 激活成功 → 显示欢迎消息
- [ ] 激活成功 → 触发 onSuccess 回调
- [ ] onSuccess → 重定向到 dashboard

## 环境要求

### 环境变量:
```env
VITE_THIRDWEB_CLIENT_ID=3123b1ac2ebdb966dd415c6e964dc335
VITE_MEMBERSHIP_NFT_CONTRACT=0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8
VITE_API_BASE_URL=https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1
VITE_SUPABASE_ANON_KEY=<your-key>
```

### 用户钱包要求:
- Arbitrum One 网络
- 足够的 USDC (130 USDC)
- 足够的 ETH 用于 gas fees
- 钱包支持 EIP-1193 (MetaMask, WalletConnect, etc.)

## 已知问题和解决方案

### 问题: PayEmbed 不自动处理 USDC approval
**解决方案**: 在打开 PayEmbed 之前手动处理 approval

### 问题: Approval 交易可能需要 2-3 分钟
**解决方案**: 添加 3 分钟倒计时和清晰的用户提示

### 问题: 用户可能在 approval 后关闭 PayEmbed
**解决方案**: 在关闭 PayEmbed 时检查 NFT 余额，如果已 claim 则触发激活

## 与原版本的差异

### 原版本问题:
- ❌ 直接使用 PayEmbed 的 `claimTo`，导致 ERC20 allowances 不足错误
- ❌ 没有 approval 流程
- ❌ 缺少详细的用户提示

### 新版本改进:
- ✅ 添加完整的 ERC20 approval 流程
- ✅ 使用 `getApprovalForTransaction` 自动检测是否需要 approval
- ✅ 详细的 toast 通知和倒计时
- ✅ 保留所有原有验证功能
- ✅ 更好的错误处理

## 部署建议

1. **测试环境验证**:
   - 在测试网络完整测试 claim 流程
   - 验证所有 toast 消息正确显示
   - 确认 approval 和 claim 都成功

2. **主网部署前**:
   - 确认 NFT 合约地址正确
   - 确认 USDC 代币地址正确 (Arbitrum: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831)
   - 测试 activate-membership API 端点

3. **用户文档**:
   - 说明整个流程需要两次钱包签名 (approval + claim)
   - 说明可能需要等待 2-3 分钟
   - 准备常见问题解答

## 编译状态

✅ 代码编译成功
✅ 无 TypeScript 错误
✅ 构建产物大小正常

构建时间: 17.35 秒

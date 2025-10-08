# PayEmbed-style Membership NFT Claim 实现方案

## 📋 概述

基于你之前的 **StarNFT claim 流程**，创建了一个全新的 Membership NFT claim 方式。

### 与当前方案的对比

| 特性 | 当前方案 (useNFTClaim) | PayEmbed 方案 |
|------|----------------------|--------------|
| **流程** | approve → claimTo → 调用 Edge Function | approve → 跳转到 purchase 页面 |
| **支付方式** | 直接 USDT 转账 | PayEmbed (支持多种支付方式) |
| **用户体验** | 2次签名（approve + claim） | 1次签名（approve），然后 PayEmbed 自动处理 |
| **支付灵活性** | 仅 USDT (Arbitrum) | 任何代币 + 信用卡 |
| **Gas 费用** | 用户支付 | 可选 gas sponsorship |

---

## 🎯 核心优势

### 1. **基于你的成功经验**
参考 `src/components/membership/claim/ClaimMembershipButton.tsx` (StarNFT)：
- ✅ 使用 `getApprovalForTransaction` 自动处理 approve
- ✅ 跳转到专门的 purchase 页面
- ✅ 清晰的用户反馈（approve → navigate → purchase）

### 2. **更好的用户体验**
```typescript
// 流程示意
1. 用户点击 "Claim Level 2" 按钮
2. 检查 USDT allowance
3. 如果需要，自动弹出 approve 交易（1次签名）
4. 跳转到 /purchase 页面，使用 PayEmbed 完成支付
5. PayEmbed 支持多种支付方式（USDT、ETH、信用卡等）
```

### 3. **支付方式灵活**
- 用户可以用任何链的任何代币支付
- 支持信用卡支付（通过 Thirdweb Pay）
- Thirdweb 自动处理跨链桥接

---

## 📁 文件结构

```
src/
├── components/membership/claim/
│   ├── ClaimMembershipButton.tsx        # ⭐ StarNFT 原版（参考）
│   ├── ClaimMembershipNFT.tsx           # 🆕 新的 Membership 版本
│   ├── ClaimNFT.tsx                     # StarNFT UI 组件（参考）
│   └── NFTClaimList.tsx                 # StarNFT 列表（参考）
│
├── pages/
│   └── TestPayEmbedClaim.tsx            # 🆕 测试页面
│
└── App.tsx                              # 🆕 添加路由 /test-payembed-claim
```

---

## 🚀 使用方法

### 1. 访问测试页面
```
http://localhost:5173/test-payembed-claim
```

### 2. 测试流程
1. 连接钱包
2. 选择一个 membership level（点击卡片）
3. 点击 "Claim Level X - XXX USDT" 按钮
4. 如果需要，批准 USDT 授权
5. 自动跳转到 `/purchase` 页面

### 3. 集成到现有页面

#### 在 Welcome 页面使用
```tsx
import { ClaimMembershipNFT } from '../components/membership/claim/ClaimMembershipNFT';

<ClaimMembershipNFT
  level={1}
  referrerWallet={referrerWallet}
  onSuccess={() => {
    console.log('✅ Claim flow started');
    // 可选：显示成功提示
  }}
  onError={(error) => {
    console.error('❌ Claim error:', error);
  }}
/>
```

#### 在 Membership 页面使用
```tsx
<ClaimMembershipNFT
  level={currentLevel + 1}
  referrerWallet={userReferrer}
  disabled={!canUpgrade}
  onSuccess={() => {
    toast({
      title: 'Upgrade started!',
      description: 'Complete payment on the purchase page'
    });
  }}
/>
```

---

## 🔧 待完成：Purchase 页面

需要创建 `/purchase` 页面来处理 PayEmbed：

```tsx
// src/pages/Purchase.tsx
import { PayEmbed } from 'thirdweb/react';
import { claimTo } from 'thirdweb/extensions/erc1155';

export default function Purchase() {
  const searchParams = new URLSearchParams(location.search);
  const level = parseInt(searchParams.get('level') || '1');
  const price = searchParams.get('price') || '130';
  const referrer = searchParams.get('referrer');

  return (
    <PayEmbed
      client={client}
      payOptions={{
        mode: 'transaction',
        transaction: claimTo({
          contract: nftContract,
          tokenId: BigInt(level),
          quantity: 1n,
          to: account.address,
        }),
        metadata: {
          name: `Membership Level ${level}`,
          image: `/nft-level${level}.png`,
        },
      }}
      onSuccess={async () => {
        // 调用 activate-membership Edge Function
        await fetch('/api/activate-membership', {
          method: 'POST',
          body: JSON.stringify({
            walletAddress: account.address,
            level,
            referrerWallet: referrer,
          }),
        });

        // 跳转到 dashboard
        setLocation('/dashboard');
      }}
    />
  );
}
```

---

## 🎨 UI/UX 特性

### 测试页面展示
1. **卡片式布局** - 类似 StarNFT 的网格布局
2. **选中高亮** - 点击卡片显示选中状态
3. **即时反馈** - 显示 approve 进度和状态
4. **响应式设计** - 支持手机、平板、桌面

### 视觉元素
- ✅ MembershipBadge 组件
- ✅ 图标和颜色主题（每个 level 不同）
- ✅ Benefits 列表
- ✅ 价格卡片

---

## 🔍 技术细节

### 1. USDT Approve 逻辑
```typescript
// 自动检查授权额度
const { data: allowance } = useReadContract({
  contract: usdtContract,
  method: 'function allowance(address owner, address spender) view returns (uint256)',
  params: [account?.address ?? '', NFT_CONTRACT],
});

// 如果授权不足，自动 approve
if (!allowance || allowance < requiredAmount) {
  const approveTx = await getApprovalForTransaction({
    transaction: claimTransaction,
    account,
  });
  await sendTransaction(approveTx);
}
```

### 2. 跳转到 Purchase 页面
```typescript
const searchParams = new URLSearchParams();
searchParams.set('type', 'membership');
searchParams.set('level', level.toString());
searchParams.set('price', price.toString());
if (referrerWallet) {
  searchParams.set('referrer', referrerWallet);
}

setLocation(`/purchase?${searchParams.toString()}`);
```

---

## 🆚 与当前方案的兼容性

### 可以同时存在
- ✅ 保留当前的 `MembershipActivationButton` 和 `MembershipUpgradeButton`
- ✅ 新的 `ClaimMembershipNFT` 作为可选的替代方案
- ✅ 用户可以选择使用哪种方式

### 建议使用场景
| 场景 | 推荐方案 |
|-----|---------|
| Welcome 页面 Level 1 激活 | 当前方案（更简单） |
| Membership 页面 Level 2-19 升级 | PayEmbed 方案（更灵活） |
| 用户没有 USDT | PayEmbed 方案（支持其他代币） |
| 用户想用信用卡 | PayEmbed 方案（唯一选择） |

---

## 📝 下一步

### 必须完成
1. **创建 `/purchase` 页面** - 集成 PayEmbed 组件
2. **测试完整流程** - 从 approve 到最终激活
3. **错误处理** - PayEmbed 支付失败时的处理

### 可选优化
1. **添加到 Welcome 页面** - 作为 Level 1 激活的替代方案
2. **添加到 Membership 页面** - 替换当前的升级按钮
3. **Gas Sponsorship** - 配置 Thirdweb 代付 gas 费用
4. **多语言支持** - 添加翻译 key

---

## 🎉 总结

这个实现完全基于你之前的 **StarNFT claim 成功经验**：

1. ✅ **用户体验优秀** - 清晰的 approve → purchase 流程
2. ✅ **支付方式灵活** - 支持多种代币和信用卡
3. ✅ **代码复用** - 使用相同的 `getApprovalForTransaction` 模式
4. ✅ **易于集成** - 单个组件即可使用
5. ✅ **向后兼容** - 不影响现有功能

现在可以访问 **`/test-payembed-claim`** 测试完整流程！

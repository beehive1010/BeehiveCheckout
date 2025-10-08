# 如何获取测试 USDT

**测试币合约地址**: `0x6B174f1f3B7f92E048f0f15FD2b22c167DA6F008`
**网络**: Arbitrum One

---

## 🎯 问题

用户在尝试激活 Level 1 会员时看到错误：
```
❌ Insufficient USDT balance. You have 0.00 USDT but need 130 USDT
```

这是因为测试钱包里没有测试 USDT。

---

## 🔧 解决方案

### 方法 1: 使用 Mint 功能（如果合约支持）

检查测试币合约是否有 `mint` 或 `faucet` 函数：

```bash
# 使用 Thirdweb 检查合约
# 访问: https://thirdweb.com/arbitrum/0x6B174f1f3B7f92E048f0f15FD2b22c167DA6F008
```

### 方法 2: 从部署者钱包转账

如果你是合约部署者，可以从部署钱包转一些测试币给测试用户：

```typescript
// 使用 Thirdweb SDK
import { transfer } from "thirdweb/extensions/erc20";

const transaction = transfer({
  contract: usdtContract,
  to: "0x[测试用户地址]",
  amount: "1000", // 1000 USDT (考虑到 6 位小数)
});
```

### 方法 3: 创建一个 Faucet 页面

在项目中创建一个 `/faucet` 页面，让测试用户可以自己领取测试币：

```typescript
// src/pages/Faucet.tsx
import { transfer } from "thirdweb/extensions/erc20";

const handleClaimTestUSDT = async () => {
  // 从 Faucet 钱包转 500 USDT 给用户
  const transaction = transfer({
    contract: usdtContract,
    to: account.address,
    amount: "500000000", // 500 USDT with 6 decimals
  });

  await sendTransaction({ transaction, account: faucetAccount });
};
```

---

## 📝 推荐的测试流程

### 选项 A: 使用真实 USDT（在 Arbitrum One 主网）

1. 从交易所购买 USDT
2. 提现到 Arbitrum One 网络
3. 使用真实的 130 USDT 进行测试

**优点**:
- ✅ 真实环境测试
- ✅ 测试完整的支付流程

**缺点**:
- ❌ 需要真实资金

### 选项 B: 部署到测试网（Arbitrum Sepolia）

1. 在 Arbitrum Sepolia 测试网部署合约
2. 部署一个带 mint 功能的测试 USDT 合约
3. 创建 Faucet 让测试用户领取测试币

**优点**:
- ✅ 完全免费
- ✅ 可以无限 mint 测试币

**缺点**:
- ❌ 需要重新部署合约
- ❌ 测试网环境可能不稳定

### 选项 C: 创建测试币 Faucet（推荐）

在当前的 Arbitrum One 主网上，创建一个 Faucet 功能：

**实现步骤**:

1. **创建 Faucet Edge Function**

```typescript
// supabase/functions/test-usdt-faucet/index.ts
import { createThirdwebClient, getContract, sendTransaction } from 'thirdweb';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { transfer } from 'thirdweb/extensions/erc20';

const FAUCET_PRIVATE_KEY = Deno.env.get('FAUCET_PRIVATE_KEY');
const USDT_CONTRACT = '0x6B174f1f3B7f92E048f0f15FD2b22c167DA6F008';

serve(async (req) => {
  const { walletAddress } = await req.json();

  // 每个地址每天只能领取一次
  const { data: existingClaim } = await supabase
    .from('faucet_claims')
    .select('*')
    .eq('wallet_address', walletAddress)
    .gte('claimed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .maybeSingle();

  if (existingClaim) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Already claimed in the last 24 hours'
    }), { status: 429 });
  }

  // 转账 500 测试 USDT
  const faucetAccount = privateKeyToAccount({
    client,
    privateKey: FAUCET_PRIVATE_KEY
  });

  const transaction = transfer({
    contract: usdtContract,
    to: walletAddress,
    amount: "500000000", // 500 USDT
  });

  await sendTransaction({ transaction, account: faucetAccount });

  // 记录领取
  await supabase
    .from('faucet_claims')
    .insert({ wallet_address: walletAddress, claimed_at: new Date() });

  return new Response(JSON.stringify({ success: true }));
});
```

2. **创建数据库表**

```sql
CREATE TABLE faucet_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) NOT NULL,
  claimed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  amount NUMERIC(18, 6) DEFAULT 500
);

CREATE INDEX idx_faucet_claims_wallet ON faucet_claims(wallet_address);
```

3. **创建前端 Faucet 页面**

```typescript
// src/pages/Faucet.tsx
export function Faucet() {
  const handleClaim = async () => {
    const response = await fetch('/functions/v1/test-usdt-faucet', {
      method: 'POST',
      body: JSON.stringify({ walletAddress: account.address }),
    });

    if (response.ok) {
      toast({ title: '✅ 成功领取 500 测试 USDT！' });
    }
  };

  return (
    <button onClick={handleClaim}>
      领取测试 USDT (500 USDT)
    </button>
  );
}
```

---

## 🎯 当前状态

**合约信息**:
- **测试币地址**: `0x6B174f1f3B7f92E048f0f15FD2b22c167DA6F008`
- **NFT 合约**: `0xe57332db0B8d7e6aF8a260a4fEcfA53104728693`
- **网络**: Arbitrum One
- **所需金额**: 130 USDT (100 NFT 价格 + 30 平台费)

**测试用户状态**:
- ✅ 已注册 (username: Test003)
- ✅ 推荐人验证通过
- ✅ 所有资格检查通过
- ❌ USDT 余额: 0 (需要: 130)

---

## ✅ 建议

**最快的解决方案**:

1. 如果你有测试币合约的控制权，直接从部署钱包转 500 USDT 给测试用户
2. 或者创建一个简单的 Faucet 功能让测试用户自己领取

**长期解决方案**:

创建一个完整的 Faucet 系统，包括：
- 每日领取限制
- 防止滥用机制
- 领取记录追踪
- 前端 UI 界面

这样可以方便后续的测试和演示！

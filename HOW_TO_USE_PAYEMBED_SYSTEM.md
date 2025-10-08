# 如何使用 PayEmbed Membership 系统

## ✅ 已完成并可用

所有组件和页面已创建完成，可以立即使用！

---

## 🚀 快速开始

### 1. 访问新页面

#### Welcome2 - Level 1 激活
```
http://localhost:5173/welcome2
```
- 用于新用户激活 Level 1 membership
- 带推荐人链接：`/welcome2?ref=0x781665b7e2bf6d4dc1db29c6e49fa1c500bf2de8`

#### Membership2 - Level 2-19 升级
```
http://localhost:5173/membership2
```
- 需要已激活会员（有 MemberGuard 保护）
- 显示所有 19 个等级
- 当前等级自动高亮

#### 测试页面
```
http://localhost:5173/test-payembed-claim
```
- 用于测试 PayEmbed claim 流程
- 显示前 5 个等级

---

## 🎯 使用流程

### 完整用户旅程

```
┌─────────────────────────────────────────────────┐
│ 1. 用户访问 /welcome2 或 /membership2           │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│ 2. 系统自动检查：                               │
│    • 钱包是否连接？                             │
│    • 是否已注册？                               │
│    • 当前等级是多少？                           │
│    • 直推人数（Level 2 需要 3 人）             │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│ 3. 用户点击卡片选择等级                         │
│    • 卡片高亮显示                               │
│    • "Claim Level X" 按钮激活                  │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│ 4. 点击 "Claim Level X - $XXX USDT" 按钮      │
│    • 显示 "Checking..." 状态                   │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│ 5. 组件执行验证：                               │
│    ✓ 检查注册状态（调用 auth Edge Function）  │
│    ✓ 检查升级条件（顺序、Level 2 直推）       │
│    ✓ 检查 USDT allowance                       │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│ 6. 如需 USDT approve：                         │
│    • 显示 "Approving USDT..." 状态             │
│    • 弹出钱包签名请求                           │
│    • 用户签名确认                               │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│ 7. 跳转到支付页面：                             │
│    /membership-purchase?                        │
│      level=2                                    │
│      &price=150                                 │
│      &referrer=0x...                            │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│ 8. PayEmbed 支付页面：                         │
│    • 显示 PayEmbed 组件                        │
│    • 用户选择支付方式：                         │
│      - USDT (Arbitrum)                         │
│      - ETH (任何链，自动桥接)                  │
│      - 其他 ERC20 代币                         │
│      - 信用卡（Thirdweb Pay）                 │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│ 9. 支付完成：                                   │
│    • PayEmbed 触发 onPurchaseSuccess           │
│    • 开始轮询交易状态                           │
│    • 显示 "Processing..." toast                │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│ 10. 交易确认后：                                │
│     • 调用 activate-membership Edge Function   │
│       或 level-upgrade Edge Function           │
│     • 创建 members 表记录                      │
│     • 创建 matrix_referrals 记录              │
│     • 创建 rewards 记录                        │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│ 11. 激活成功：                                  │
│     • 显示成功 toast                            │
│     • 自动跳转到 /dashboard                    │
│     🎉 完成！                                  │
└─────────────────────────────────────────────────┘
```

---

## 📱 页面预览

### Welcome2 页面特点
```
┌────────────────────────────────────────┐
│         👑 Welcome to Beehive          │
│    Start your journey with Level 1     │
│                                        │
│  ┌──────┬──────┬──────┐               │
│  │ $130 │  19  │  ∞   │               │
│  │Price │Levels│Earn  │               │
│  └──────┴──────┴──────┘               │
│                                        │
│  ┌─────────────────────────┐          │
│  │  Level 1 - Bronze Bee   │          │
│  │  🛡️  $130 USDT          │          │
│  │                         │          │
│  │  ✓ Platform access      │          │
│  │  ✓ Matrix entry         │          │
│  │  ✓ Basic rewards        │          │
│  │                         │          │
│  │  [Claim Level 1]        │          │
│  └─────────────────────────┘          │
│                                        │
│  📋 What's Included  →  Next Steps    │
└────────────────────────────────────────┘
```

### Membership2 页面特点
```
┌────────────────────────────────────────┐
│  Stats: [Level 1] [18 Left] [3×3] [19]│
│                                        │
│  ┌─────────┬─────────┬─────────┐      │
│  │ Level 2 │ Level 3 │ Level 4 │      │
│  │ ⭐ $150 │ 👑 $200 │ ⚡ $250  │      │
│  │ [Owned] │[Locked] │[Locked] │      │
│  └─────────┴─────────┴─────────┘      │
│                                        │
│  ┌─────────┬─────────┬─────────┐      │
│  │ Level 5 │ Level 6 │ Level 7 │      │
│  │ 🏆 $300 │ 💎 $350 │ 🌟 $400  │      │
│  │[Locked] │[Locked] │[Locked] │      │
│  └─────────┴─────────┴─────────┘      │
│                                        │
│  ... (Level 8-19)                      │
└────────────────────────────────────────┘
```

---

## 🎨 UI 特点

### 视觉效果
1. **黑金渐变背景**
   ```css
   background: linear-gradient(to-br, black, #1a1a1a, black);
   ```

2. **玻璃态卡片**
   ```css
   background: rgba(17, 24, 39, 0.95);
   backdrop-filter: blur(16px);
   border: 1px solid rgba(107, 114, 128, 0.3);
   ```

3. **光晕效果**
   ```css
   box-shadow: 0 20px 25px -5px rgba(251, 191, 36, 0.3);
   filter: blur(40px);
   ```

4. **动画**
   - 卡片进入动画（Framer Motion）
   - Hover 悬浮效果（-8px）
   - 选中状态 ring 高亮
   - Loading spinner
   - 按钮背景渐变动画

### 交互反馈
1. **选中卡片**
   - Ring 高亮（2px honey color）
   - 光晕增强
   - "Selected" badge 显示

2. **按钮状态**
   - 默认：灰色渐变
   - 选中：黑金渐变 + 动画
   - Loading：Spinner + 状态文字
   - Disabled：半透明

3. **状态指示**
   - ✅ Owned：绿色 badge
   - 🔒 Locked：锁图标
   - ⚠️ Needs Referrals：橙色提示
   - ⚡ Available：金色高亮

---

## 🔧 开发者指南

### 在其他页面中使用

#### 只显示特定等级
```tsx
import { BeehiveMembershipClaimList } from '@/components/membership/claim/BeehiveMembershipClaimList';

// 只显示 Level 1
<BeehiveMembershipClaimList
  maxLevel={1}
  referrerWallet={referrerWallet}
/>

// 显示 Level 1-5
<BeehiveMembershipClaimList
  maxLevel={5}
  referrerWallet={referrerWallet}
/>

// 显示所有等级（1-19）
<BeehiveMembershipClaimList
  maxLevel={19}
  referrerWallet={referrerWallet}
/>
```

#### 处理成功回调
```tsx
<BeehiveMembershipClaimList
  maxLevel={5}
  referrerWallet={referrerWallet}
  onSuccess={(level) => {
    console.log(`Level ${level} activated!`);

    // 刷新用户数据
    queryClient.invalidateQueries(['user-status']);

    // 显示自定义 toast
    toast({
      title: '🎉 Membership Activated!',
      description: `You are now Level ${level}`,
    });

    // 可选：跳转到其他页面
    setLocation('/dashboard');
  }}
/>
```

### 自定义单个按钮
```tsx
import { ClaimMembershipNFTButton } from '@/components/membership/claim/ClaimMembershipNFTButton';

<ClaimMembershipNFTButton
  level={2}
  price={150}
  referrerWallet={referrerWallet}
  currentLevel={1}
  directReferralsCount={3}
  isSelected={true}
  onSuccess={() => console.log('Success!')}
  onError={(error) => console.error(error)}
/>
```

---

## 🐛 常见问题

### Q1: 按钮不可点击？
**检查**：
- 是否选中了卡片？（需要先点击卡片）
- 是否满足升级条件？（顺序升级、Level 2 需要 3 人）
- 是否已注册？

### Q2: USDT approve 失败？
**可能原因**：
- USDT 余额不足
- 用户拒绝签名
- Gas 费不足

**解决**：查看控制台错误信息

### Q3: PayEmbed 页面空白？
**检查**：
- URL 参数是否正确？（level, price, referrer）
- Thirdweb client ID 是否配置？
- 网络连接是否正常？

### Q4: 激活失败但 NFT 已 claim？
**原因**：Edge Function 调用失败

**解决**：
1. 检查 Supabase Edge Function 日志
2. 手动运行 SQL 补救脚本
3. 联系管理员

---

## 📊 监控和调试

### 控制台日志
```javascript
// 用户状态
🔍 Checking user status...
✅ User is registered: {...}

// USDT approve
⏳ Approving USDT...
✅ USDT Approved

// 跳转
🔗 Navigating to purchase page

// 支付
🎉 Purchase success: {...}

// 轮询状态
🔍 Polling tx status (1/10): 0x...
📊 Transaction status: {...}

// 激活
🔍 Verifying activation (attempt 1/10)
✅ Activation successful: {...}
```

### Supabase Edge Function 日志
访问 Supabase Dashboard → Edge Functions → Logs

### React Query DevTools
查看缓存状态：
- `['user-status', walletAddress]`
- `['/direct-referrals', walletAddress]`

---

## 🎉 享受新系统！

现在你有两套系统可以使用：

### 方案 A：当前系统（推荐用于生产）
- `/welcome` - Level 1 激活
- `/membership` - Level 2-19 升级
- 直接 USDT 转账，快速可靠

### 方案 B：PayEmbed 系统（推荐用于灵活支付）
- `/welcome2` - Level 1 激活
- `/membership2` - Level 2-19 升级
- 支持多种支付方式，用户体验更好

**可以共存，根据需求选择使用！** 🚀

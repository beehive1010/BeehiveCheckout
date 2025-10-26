# Admin Pages Data Source Audit

**Date**: 2025-10-27
**Database**: `postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres`
**Status**: 🔄 In Progress

---

## 📋 Admin Pages Overview

### Sidebar Menu Structure

| Menu Item | Route | Component | Permission | Database Tables |
|-----------|-------|-----------|------------|-----------------|
| Dashboard | `/admin` | AdminHome | `dashboard.read` | - |
| Dashboard (Overview) | `/admin/dashboard` | AdminDashboard | `dashboard.read` | users, members, layer_rewards |
| Users | `/admin/users` | AdminUsers | `users.read` | users, user_balances |
| Members | `/admin/user-management` | AdminUserManagement | `users.read` | members, membership, member_balance |
| Referrals | `/admin/referrals` | AdminReferrals | `referrals.read` | referrals, direct_referral_rewards |
| Matrix | `/admin/matrix` | AdminMatrix | `matrix.read` | matrix_referrals, matrix_spillover_slots |
| Rewards | `/admin/rewards` | AdminRewards | `rewards.read` | layer_rewards, reward_claims, reward_timers, reward_notifications |
| Withdrawals | `/admin/withdrawals` | AdminWithdrawals | `withdrawals.read` | usdt_withdrawals, withdrawal_requests |
| NFTs | `/admin/nfts` | AdminNFTs | `nfts.read` | advertisement_nfts, merchant_nfts, nft_membership_levels, nft_purchases |
| Contracts | `/admin/contracts` | AdminContracts | `contracts.read` | cross_chain_transactions |
| Courses | `/admin/courses` | AdminCourses | `courses.read` | courses, course_lessons, course_progress, course_activations, course_bookings |
| Blog | `/admin/blog` | AdminBlog | `blog.read` | blog_posts, blog_post_translations |
| Discover | `/admin/discover` | AdminDiscover | `discover.read` | dapps, dapp_categories, dapp_reviews, user_dapp_interactions |
| Server Wallet | `/admin/server-wallet` | AdminServerWallet | `system.read` | admin_wallet_withdrawals, user_balances |
| System | `/admin/system` | AdminSystem | `system.read` | system_settings, audit_logs, server_wallet_balances, server_wallet_operations |
| Admin Users | `/admin/admin-users` | AdminUserManagement | `admin.manage` | admins, admin_permissions, admin_actions |
| Settings | `/admin/settings` | AdminSettings | `settings.read` | - |

---

## 🔍 Detailed Page Audit

### 1. ✅ AdminDashboard (`/admin/dashboard`)

**Status**: ✅ 已简化 - 移除管理 Tabs

#### 使用的组件
- SystemFixPanel
- ServerWalletPanel

#### 数据源
- **Direct API Calls**:
  - `GET /rest/v1/users` - Total users count
  - `GET /rest/v1/members?current_level=gt.0` - Active members count
  - `GET /rest/v1/layer_rewards?status=eq.pending` - Pending approvals count

#### 显示的统计数据
- ✅ Total Users
- ✅ Active Members
- ✅ NFT Collections (hard-coded: 19)
- ✅ Blog Posts (TODO: 0)
- ✅ Courses (hard-coded: 16)
- ✅ Partners (TODO: 0)
- ✅ Pending Approvals (layer_rewards)

#### 移动端兼容性
- ✅ Responsive grid layout
- ✅ Mobile-optimized card sizes
- ✅ Touch-friendly buttons

#### 数据完整性
- ✅ Uses correct database REST API
- ✅ Uses header count for accurate statistics
- ⚠️ Blog posts count not implemented
- ⚠️ Discover partners count not implemented

---

### 2. ⚠️ AdminUsers (`/admin/users`)

**Status**: ⚠️ 需要数据源修复

**文件**: `src/pages/admin/AdminUsers.tsx`

#### 当前实现

**功能**:
- ✅ 显示所有注册用户列表（支持搜索和过滤）
- ✅ 用户详情查看（Profile, Membership, Earnings, Referrals tabs）
- ✅ 用户/会员创建、编辑、删除
- ✅ 批量导入（JSON/CSV）
- ✅ 双模式切换：Users vs Members

**使用的组件**:
- Card, Button, Input, Select, Tabs, Dialog (shadcn/ui)
- 无自定义业务组件

#### 数据源分析

**当前查询** (lines 137-247):
```typescript
// 1. 查询 users 表 ✅
const { data: usersData } = await supabase.from('users').select('...');

// 2. 查询 members 表 ✅
const { data: membersData } = await supabase.from('members').select('...');

// 3. 查询 user_balances 表 ✅
const { data: balancesData } = await supabase.from('user_balances').select('...');

// 4. 查询 referrals 表 - ❌ 手动计算团队人数
const { data: referralsData } = await supabase.from('referrals').select('...');
const referralCount = referralsData?.filter(...).length || 0;
```

**数据映射** (lines 192-225):
```typescript
return {
  // ... other fields
  directReferralCount: referralCount,  // ✅ OK
  totalTeamCount: referralCount,       // ❌ WRONG - 只是直推人数
  transferableBCC: 0,                  // ❌ 硬编码为 0
  restrictedBCC: 0,                    // ❌ 硬编码为 0
  referralEarnings: 0,                 // ❌ 硬编码为 0
  levelEarnings: 0,                    // ❌ 硬编码为 0
};
```

#### 发现的问题

##### 1. ❌ 未使用 `v_referral_statistics` 视图
**问题**: Line 221 手动计算团队人数
```typescript
totalTeamCount: referralCount,  // ❌ 只统计直推，不包含递归下线
```

**应该改为**:
```typescript
// 查询 v_referral_statistics 视图
const { data: refStats } = await supabase
  .from('v_referral_statistics')
  .select('direct_referral_count, total_team_count, activation_rate_percentage')
  .in('member_wallet', walletAddresses);

// 使用视图数据
totalTeamCount: refStat?.total_team_count || 0,  // ✅ 正确的递归团队人数
```

##### 2. ❌ BCC 余额数据缺失
**问题**: Lines 213-214 硬编码为 0
```typescript
transferableBCC: 0,
restrictedBCC: 0,
```

**应该查询**: `member_balance` 表
```typescript
const { data: memberBalances } = await supabase
  .from('member_balance')
  .select('wallet_address, transferable_bcc, restricted_bcc')
  .in('wallet_address', walletAddresses);

// 映射
transferableBCC: memberBalance?.transferable_bcc || 0,
restrictedBCC: memberBalance?.restricted_bcc || 0,
```

##### 3. ❌ 奖励收益数据缺失
**问题**: Lines 216-217 硬编码为 0
```typescript
referralEarnings: 0,
levelEarnings: 0,
```

**应该查询**: `layer_rewards` 表或创建汇总视图
```typescript
const { data: rewards } = await supabase
  .from('layer_rewards')
  .select('receiver_wallet, reward_amount, reward_type')
  .in('receiver_wallet', walletAddresses)
  .eq('status', 'claimed');
```

##### 4. ⚠️ Matrix 位置数据缺失
**问题**: Line 223 硬编码为 0
```typescript
matrixPosition: 0,
```

**应该查询**: `matrix_referrals` 或 `v_matrix_tree_19_layers`

#### 移动端兼容性

✅ **移动端优化良好**:
- 使用 `isMobile` hook 响应式布局
- 统计卡片: `grid-cols-2` (mobile) vs `lg:grid-cols-5` (desktop)
- 卡片内边距: `p-3` (mobile) vs `p-4` (desktop)
- 按钮: `w-full` (mobile) vs 默认宽度 (desktop)
- 字体大小: `text-xl` (mobile) vs `text-2xl` (desktop)
- Dialog: `max-w-[95vw]` (mobile) vs `max-w-md` (desktop)
- ✅ 触摸友好按钮尺寸

#### 建议的修复方案

**方案 1**: 更新现有查询（推荐）
1. 添加 `v_referral_statistics` 查询获取团队统计
2. 添加 `member_balance` 查询获取 BCC 余额
3. 添加 `layer_rewards` 聚合查询获取收益
4. 添加 `matrix_referrals` 查询获取矩阵位置

**方案 2**: 创建新视图（最佳，但需要后端）
创建 `v_admin_user_overview` 视图合并所有需要的数据：
```sql
CREATE OR REPLACE VIEW v_admin_user_overview AS
SELECT
  u.wallet_address,
  u.username,
  u.email,
  u.created_at,
  m.current_level,
  m.member_activated,
  mb.transferable_bcc,
  mb.restricted_bcc,
  rs.total_team_count,
  rs.direct_referral_count,
  -- ... 其他字段
FROM users u
LEFT JOIN members m ON m.wallet_address = u.wallet_address
LEFT JOIN member_balance mb ON mb.wallet_address = u.wallet_address
LEFT JOIN v_referral_statistics rs ON rs.member_wallet = u.wallet_address;
```

#### 数据完整性

- ✅ 查询 `users` 表正确
- ✅ 查询 `members` 表正确
- ✅ 查询 `user_balances` 表正确（用于总收益）
- ❌ **未使用 `v_referral_statistics`**（团队人数错误）
- ❌ **未查询 `member_balance`**（BCC 余额为 0）
- ❌ **未查询 `layer_rewards`**（收益明细为 0）
- ❌ **未查询 matrix 数据**（矩阵位置为 0）

#### 修复优先级

1. 🔴 **高优先级**: 添加 `v_referral_statistics` 查询 - 团队人数数据错误
2. 🟡 **中优先级**: 添加 `member_balance` 查询 - BCC 余额显示
3. 🟡 **中优先级**: 添加 `layer_rewards` 聚合 - 收益明细显示
4. 🟢 **低优先级**: 添加 matrix 位置查询 - 可选信息

---

### 3. ⏳ AdminUserManagement (`/admin/user-management`)

**Status**: 🚧 临时组件 - 需要实现

#### 当前状态
```typescript
const AdminUserManagement = () => {
  const { t } = useI18n();
  return <div>{t('common.comingSoon')} - Admin User Management</div>;
};
```

#### 需要实现
- Members 表数据管理
- Membership 状态管理
- Member balances 查看

#### 建议的数据源
- `v_referral_statistics` - 团队统计
- `members` - 会员信息
- `membership` - 会员状态
- `member_balance` - 会员余额

---

### 4. ⏳ AdminReferrals (`/admin/referrals`)

**Status**: 🚧 临时组件 - 需要实现

#### 当前状态
```typescript
const AdminReferrals = () => {
  const { t } = useI18n();
  return <div>{t('common.comingSoon')} - Admin Referrals</div>;
};
```

#### 需要实现
- 推荐关系查看
- Direct referral rewards 管理

#### 建议的数据源
- `v_referral_statistics` - 推荐统计
- `referrals` - 推荐关系
- `direct_referral_rewards` - 直推奖励

---

### 5. ⏳ AdminMatrix (`/admin/matrix`)

**Status**: 待检查

#### 预期功能
- Matrix 结构可视化
- Layer 统计
- Spillover 槽位管理

#### 需要检查
- [ ] 使用的组件
- [ ] 数据源
  - [ ] `v_matrix_tree_19_layers`
  - [ ] `v_matrix_layer_statistics`
  - [ ] `matrix_referrals`
  - [ ] `matrix_spillover_slots`
- [ ] AdminMatrixTreeVisualization 组件集成
- [ ] 移动端兼容性

---

### 6. ⏳ AdminRewards (`/admin/rewards`)

**Status**: 待检查

#### 预期功能
- Layer rewards 管理
- Reward claims 审批
- Reward timers 查看
- Notifications 管理

#### 需要检查
- [ ] 使用的组件
- [ ] 是否使用 RewardsManagement 组件
- [ ] 数据源
  - [ ] `layer_rewards`
  - [ ] `reward_claims`
  - [ ] `reward_timers`
  - [ ] `reward_notifications`
- [ ] 移动端兼容性

---

### 7. ⏳ AdminWithdrawals (`/admin/withdrawals`)

**Status**: 待检查

#### 预期功能
- Withdrawal requests 列表
- Approve/Reject 操作
- USDT withdrawals 管理

#### 需要检查
- [ ] 使用的组件
- [ ] 是否使用 WithdrawalManagement 组件
- [ ] 数据源
  - [ ] `usdt_withdrawals`
  - [ ] `withdrawal_requests`
  - [ ] `user_balances`
- [ ] 移动端兼容性

---

### 8. ⏳ AdminNFTs (`/admin/nfts`)

**Status**: 待检查

#### 预期功能
- NFT membership levels 管理
- Advertisement NFTs 管理
- Merchant NFTs 管理
- NFT purchases 查看

#### 需要检查
- [ ] 使用的组件
- [ ] 数据源
  - [ ] `nft_membership_levels`
  - [ ] `advertisement_nfts`
  - [ ] `merchant_nfts`
  - [ ] `nft_purchases`
- [ ] 移动端兼容性

---

### 9. ⏳ AdminContracts (`/admin/contracts`)

**Status**: 🚧 临时组件 - 需要实现

---

### 10. ⏳ AdminCourses (`/admin/courses`)

**Status**: 🚧 临时组件 - 需要实现

---

### 11. ⏳ AdminBlog (`/admin/blog`)

**Status**: 🚧 临时组件 - 需要实现

---

### 12. ⏳ AdminDiscover (`/admin/discover`)

**Status**: 🚧 临时组件 - 需要实现

---

### 13. ⏳ AdminServerWallet (`/admin/server-wallet`)

**Status**: 待检查

---

### 14. ⏳ AdminSystem (`/admin/system`)

**Status**: 🚧 临时组件 - 需要实现

---

### 15. ⏳ AdminSettings (`/admin/settings`)

**Status**: 待检查

---

## 📊 Data Source Verification Checklist

### Fixed Database Views (已修复的视图)
- ✅ `v_referral_statistics` - 使用递归 CTE 正确计算团队人数
- ✅ `v_matrix_tree_19_layers` - Matrix tree 数据
- ✅ `v_matrix_layer_statistics` - Layer 统计

### Need to Verify
- [ ] All admin pages use correct fixed views
- [ ] No manual frontend recursive calculations
- [ ] Consistent data across desktop and mobile
- [ ] Proper permission checks on all pages

---

## 🔧 Common Issues to Check

### 1. Data Source Issues
- ❌ Using old views instead of fixed `v_referral_statistics`
- ❌ Manual frontend calculations instead of database views
- ❌ Direct table queries instead of views

### 2. Mobile Compatibility
- ❌ Desktop-only layouts
- ❌ Buttons too small for touch (<44px)
- ❌ Text too small on mobile
- ❌ Horizontal scrolling issues

### 3. Component Reuse
- ⚠️ Dashboard tabs duplicating independent pages
- ⚠️ Inconsistent components for same functionality
- ⚠️ Mix of temporary placeholder components and real implementations

---

## 🎯 Audit Action Plan

### Phase 1: Core Admin Pages (Priority: High)
1. ✅ AdminDashboard - Simplify (remove tabs)
2. ⏳ AdminUsers - Verify data sources
3. ⏳ AdminMatrix - Verify matrix views integration
4. ⏳ AdminRewards - Verify rewards data
5. ⏳ AdminWithdrawals - Verify withdrawal data

### Phase 2: Management Pages (Priority: Medium)
6. ⏳ AdminUserManagement - Implement or consolidate with AdminUsers
7. ⏳ AdminNFTs - Verify NFT data
8. ⏳ AdminServerWallet - Verify wallet data

### Phase 3: Content Pages (Priority: Low)
9. ⏳ AdminReferrals - Implement
10. ⏳ AdminContracts - Implement
11. ⏳ AdminCourses - Implement
12. ⏳ AdminBlog - Implement
13. ⏳ AdminDiscover - Implement
14. ⏳ AdminSystem - Implement

---

## 📝 Next Steps

1. ✅ Simplify AdminDashboard (remove tabs)
2. ⏳ Read and audit AdminUsers page
3. ⏳ Read and audit AdminMatrix page
4. ⏳ Read and audit AdminRewards page
5. ⏳ Read and audit AdminWithdrawals page
6. ⏳ Create detailed data source documentation
7. ⏳ Verify mobile compatibility for each page
8. ⏳ Consolidate duplicate functionality

---

**Last Updated**: 2025-10-27
**Next Review**: After completing Phase 1 audit

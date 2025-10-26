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

### 2. ⏳ AdminUsers (`/admin/users`)

**Status**: 待检查

#### 预期功能
- 显示所有注册用户列表
- 用户详情查看
- 用户余额管理

#### 需要检查
- [ ] 使用的组件
- [ ] 数据源（是否使用正确的 views）
- [ ] 是否直接查询 `users` 表
- [ ] 是否需要使用 `v_referral_statistics` 等views
- [ ] 移动端兼容性

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

# 🧹 MasterSpec Compliance Cleanup Plan

## 发现的问题

根据MasterSpec分析，当前系统存在以下需要清理和修复的问题：

### 1. 数据库结构不符合MasterSpec

#### 问题：
- 当前的`referrals`表混合了URL直接推荐和Matrix placement两种概念
- MasterSpec要求严格分离：`referrals`（2.4）只记录URL推荐，`matrix_referrals`（2.5）记录3x3 matrix placement

#### 解决方案：
- ✅ 已创建符合MasterSpec的新表结构：
  - `referrals_new` - 只记录URL直接推荐关系
  - `matrix_referrals` - 记录3x3 matrix placement
- ✅ 已迁移数据：113条URL推荐，113条Matrix placement

### 2. Edge Functions使用旧表结构

#### 问题：
- `supabase/functions/auth/index.ts` 仍在查询旧的referrals表结构
- 其他edge functions可能也有类似问题

#### 需要更新的Functions：
- `supabase/functions/auth/index.ts` - 第142,143,206,207行
- `supabase/functions/matrix/index.ts` - 可能使用旧结构
- `supabase/functions/matrix-view/index.ts` - 可能使用旧结构

### 3. Frontend组件使用旧API

#### 问题：
- Landing page和Welcome组件通过`referralService`调用edge functions
- 这些API调用可能返回旧格式的数据

#### 需要检查的文件：
- `src/pages/LandingPage.tsx`
- `src/pages/Welcome.tsx`
- `src/api/landing/referral.client.ts`

## 清理计划

### 阶段1：数据库表替换 ✅ 已完成

- [x] 创建符合MasterSpec的新表结构
- [x] 迁移数据到新表
- [x] 重新创建views

### 阶段2：更新Edge Functions

需要更新以下函数以使用新的表结构：

#### 高优先级：
1. **auth/index.ts** - 立即更新
   - 更新第142,143行：使用`referrals_new`表
   - 更新第206,207行：使用`matrix_referrals`表

2. **matrix/index.ts** - 检查并更新
3. **matrix-view/index.ts** - 检查并更新

### 阶段3：Frontend API更新

需要检查和更新：
1. `src/api/landing/referral.client.ts`
2. 相关的组件调用

### 阶段4：清理冗余对象

#### 数据库对象清理：
```sql
-- 备份表（可以删除的）
- referrals_backup_masterspec_migration
- referrals_backup_before_sequence_fix  
- members_backup_before_fix

-- 旧表（需要谨慎处理）
- 原始的 referrals 表（替换为 referrals_new + matrix_referrals）

-- 可能冗余的Functions（需要审查）
- 某些matrix相关的functions可能需要更新或删除
```

#### 文件清理：
```
-- 可能冗余的文件
- 一些旧的backup files (.backup 扩展名的文件)
- 未使用的组件或hooks
```

## 执行顺序

### 立即执行：
1. ✅ 替换旧的referrals表为符合MasterSpec的新结构
2. 🔄 更新auth edge function使用新表结构
3. 🔄 更新其他edge functions

### 后续执行：
4. 测试所有API调用
5. 更新frontend组件
6. 清理备份表和冗余对象

## 风险评估

### 高风险：
- 直接删除旧的referrals表可能破坏现有功能
- Edge functions更新需要谨慎测试

### 低风险：
- 备份表可以安全删除
- 重新创建views是安全的

## 回滚计划

如果需要回滚：
1. 备份表已保存原始数据
2. 可以快速恢复旧的表结构
3. Edge functions可以快速回滚

## 测试计划

更新后需要测试：
1. 用户注册流程
2. 推荐人验证
3. Matrix placement显示
4. 所有相关的API调用

---

**状态**: 🔄 进行中
**负责人**: Claude Code Agent
**创建时间**: 2025-09-22
**最后更新**: 2025-09-22
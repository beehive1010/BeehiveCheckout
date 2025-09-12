# Supabase Edge Functions 清理分析

## 核心保留的Functions（基于新的数据结构）

### 1. 用户认证和管理
- `auth` - 用户认证系统
- `member-management` - 会员管理（需要更新）
- `dashboard` - 用户仪表板（需要更新）

### 2. 会员激活和升级  
- `activate-membership` - 会员激活（需要更新使用新的数据流程）
- `level-upgrade` - 等级升级（需要更新）

### 3. 奖励系统
- `rewards` - 奖励查询（需要更新使用layer_rewards）
- `process-rewards` - 奖励处理（可能需要简化，因为现在有数据库触发器）

### 4. 余额系统
- `balance` - 余额查询（需要更新使用user_balances字段）
- `withdrawal-system` - 提现系统

### 5. Matrix系统
- `matrix` - Matrix查询（需要更新）
- `matrix-operations` - Matrix操作（需要更新）

### 6. 通知系统
- `notification` - 通知功能

### 7. 管理功能
- `admin` - 管理面板
- `admin-stats` - 管理统计

## 可以删除的Functions

### 1. 重复或过时的Functions
- `balance-enhanced` - 与balance重复
- `admin-cleanup` - 临时清理工具
- `admin-fix-bcc` - 临时修复工具  
- `fix-activation-bcc` - 临时修复工具
- `fix-bcc-balance` - 临时修复工具
- `fix-bcc-rewards` - 临时修复工具
- `data-fix` - 临时修复工具
- `database-cleanup` - 临时清理工具
- `debug-user` - 调试工具

### 2. BCC相关（如果不再使用）
- `bcc-purchase` - BCC购买
- `bcc-release-system` - BCC释放系统

### 3. 课程系统（如果不在当前版本使用）
- `courses` - 课程系统

### 4. 其他系统
- `multi-chain-payment` - 多链支付（如果不使用）
- `referral-links` - 推荐链接（功能可能集成到其他地方）
- `server-wallet` - 服务器钱包管理
- `performance-monitor` - 性能监控
- `cron-timers` - 定时任务
- `service-requests` - 服务请求
- `upgrade-rewards` - 升级奖励（可能与现有奖励系统重复）

### 5. 文档文件
- `beehive-api.swagger.yaml` - API文档（可保留）
- `swagger-ui.html` - Swagger UI（可保留）

## 清理建议

### 第1阶段：删除明确不需要的临时和修复工具
```bash
# 删除临时修复工具
rm -rf supabase/functions/admin-cleanup
rm -rf supabase/functions/admin-fix-bcc  
rm -rf supabase/functions/fix-activation-bcc
rm -rf supabase/functions/fix-bcc-balance
rm -rf supabase/functions/fix-bcc-rewards
rm -rf supabase/functions/data-fix
rm -rf supabase/functions/database-cleanup
rm -rf supabase/functions/debug-user

# 删除重复功能
rm -rf supabase/functions/balance-enhanced
```

### 第2阶段：删除可选系统
```bash  
# 如果不使用BCC系统
rm -rf supabase/functions/bcc-purchase
rm -rf supabase/functions/bcc-release-system

# 如果不使用课程系统
rm -rf supabase/functions/courses

# 其他可选系统
rm -rf supabase/functions/multi-chain-payment
rm -rf supabase/functions/performance-monitor
rm -rf supabase/functions/cron-timers
rm -rf supabase/functions/service-requests
```

### 第3阶段：更新保留的Functions
需要更新以下functions以使用新的数据结构：
1. `member-management` - 使用新的users->members->membership流程
2. `activate-membership` - 使用process_membership_purchase函数
3. `balance` - 使用user_balances表的新字段名
4. `rewards` - 使用layer_rewards表
5. `matrix` - 使用更新后的referrals表结构
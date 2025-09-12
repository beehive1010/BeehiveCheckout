# Beehive Platform API测试套件

## 📁 文件结构

```
supabase/functions/.http-tests/
├── README.md                    # 本文档
├── upgrade-rewards.http         # 会员升级奖励系统API
├── rewards.http                 # 通用奖励系统API  
├── matrix.http                  # 矩阵系统API
├── auth.http                    # 认证系统API
├── member-management.http       # 会员管理系统API
├── environment.http             # 环境变量配置
└── common-scenarios.http        # 常用场景测试
```

## 🚀 快速开始

### 1. 配置环境变量

在每个.http文件顶部更新以下变量：

```http
@baseUrl = https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1
@apiKey = YOUR_SUPABASE_ANON_KEY_HERE
@serviceKey = YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE
@testWallet = 0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC
```

### 2. VS Code用户

1. 安装 "REST Client" 插件
2. 打开任意 `.http` 文件
3. 点击请求上方的 "Send Request" 按钮

### 3. IntelliJ IDEA用户

1. 内置支持 HTTP client
2. 打开 `.http` 文件
3. 点击请求旁边的 ▶️ 图标

## 📋 API测试文件说明

### 🎁 upgrade-rewards.http
**会员升级奖励系统专用API**
- ✅ 触发会员升级奖励
- 📊 查看奖励状态  
- ✅ 检查R位置考核
- 🔄 批量检查待定奖励
- ⏰ 获取奖励计时器

**重点功能:**
```http
# 触发Level 1升级奖励
POST {{baseUrl}}/upgrade-rewards/trigger
{
  "upgraded_member": "0x...",
  "new_level": 1
}

# 查看奖励状态
GET {{baseUrl}}/upgrade-rewards/status?wallet_address=0x...
```

### 💰 rewards.http
**通用奖励系统API**
- 💳 获取奖励余额
- 🎯 获取可申请奖励
- ✅ 申请奖励
- 📬 奖励通知
- 📊 奖励仪表板

**重点功能:**
```http
# 获取用户余额
GET {{baseUrl}}/rewards/user
x-wallet-address: 0x...

# 申请奖励
POST {{baseUrl}}/rewards/claim
{
  "claim_id": "uuid-here",
  "wallet_address": "0x..."
}
```

### 🏗️ matrix.http
**矩阵系统API**
- 🌳 矩阵结构查询
- 📍 矩阵安置操作
- 📈 矩阵统计信息
- ✅ 矩阵完成状态
- 🔍 空缺位置查询

**重点功能:**
```http
# 查看矩阵状态
GET {{baseUrl}}/matrix/status?wallet=0x...

# 安置会员到矩阵
POST {{baseUrl}}/matrix/place
{
  "member_wallet": "0x...",
  "referrer_wallet": "0x...",
  "preferred_position": "L"
}
```

### 🔐 auth.http
**认证系统API**
- 🔗 钱包连接认证
- 🎫 会话管理
- 👤 用户状态检查
- 🛡️ 权限验证
- 🔒 安全设置

**重点功能:**
```http
# 连接钱包
POST {{baseUrl}}/auth/connect
{
  "wallet_address": "0x...",
  "signature": "0x...",
  "message": "..."
}

# 检查用户状态
GET {{baseUrl}}/auth/status?wallet=0x...
```

### 👥 member-management.http
**会员管理系统API**
- 📝 会员注册
- 👤 会员信息查询
- ⬆️ 等级管理
- 🔄 状态管理
- 👨‍👩‍👧‍👦 推荐关系

**重点功能:**
```http
# 注册新会员
POST {{baseUrl}}/member-management/register
{
  "wallet_address": "0x...",
  "referrer_wallet": "0x...",
  "email": "user@example.com"
}

# 升级会员等级
POST {{baseUrl}}/member-management/upgrade-level
{
  "wallet_address": "0x...",
  "new_level": 2
}
```

## 🔧 使用技巧

### 环境变量管理
在每个文件顶部定义变量：
```http
@testWallet = 0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC
@apiKey = your_api_key_here
```

### 请求序列化
某些操作需要按顺序执行：
1. 先执行认证相关请求
2. 再执行业务逻辑请求
3. 最后检查结果状态

### 错误调试
每个文件都包含错误测试案例：
```http
### POST Error Test - Missing Parameters
POST {{baseUrl}}/upgrade-rewards/trigger
# Missing required parameters
{}
```

## 📊 测试场景

### 🎯 核心业务流程测试

1. **会员升级奖励完整流程**
```http
# 1. 触发升级奖励
POST {{baseUrl}}/upgrade-rewards/trigger

# 2. 查看奖励状态  
GET {{baseUrl}}/upgrade-rewards/status

# 3. 检查计时器
GET {{baseUrl}}/upgrade-rewards/timers

# 4. 批量检查考核
POST {{baseUrl}}/upgrade-rewards/batch-check
```

2. **矩阵安置完整流程**
```http
# 1. 查看矩阵空缺位置
GET {{baseUrl}}/matrix/vacant

# 2. 安置新会员
POST {{baseUrl}}/matrix/place

# 3. 检查安置结果
GET {{baseUrl}}/matrix/status

# 4. 验证矩阵结构
POST {{baseUrl}}/matrix/validate
```

## ⚡ 性能测试

### 压力测试示例
```bash
# 使用curl进行简单的负载测试
for i in {1..10}; do
  curl -X GET "{{baseUrl}}/upgrade-rewards/status?wallet_address={{testWallet}}" \
  -H "Authorization: Bearer {{apiKey}}" &
done
wait
```

## 🐛 常见问题

### 认证问题
```
401 Unauthorized
```
**解决方案**: 检查API key是否正确配置

### 钱包地址格式问题
```
400 Bad Request - Invalid wallet address
```
**解决方案**: 确保钱包地址以0x开头，长度为42字符

### 服务不可用
```
503 Service Unavailable
```
**解决方案**: 检查Supabase项目状态和Edge Function部署状态

## 📈 监控和日志

### 查看Edge Function日志
1. 登录Supabase Dashboard
2. 进入Edge Functions页面
3. 查看实时日志

### API响应时间监控
每个请求都会返回执行时间：
```json
{
  "success": true,
  "data": "...",
  "execution_time_ms": 250
}
```

## 🚀 部署相关

### 本地测试
```bash
# 启动本地Supabase
supabase start

# 部署函数
supabase functions deploy upgrade-rewards
```

### 生产环境测试
更新baseUrl为生产环境：
```http
@baseUrl = https://your-project.supabase.co/functions/v1
```

## 📞 技术支持

如遇到问题，请检查：
1. 🔍 Supabase项目状态
2. 🔑 API密钥权限
3. 🌐 网络连接
4. 📋 请求格式和参数

---

**最后更新**: 2025-01-11  
**版本**: 1.0.0  
**维护者**: Beehive Platform Development Team
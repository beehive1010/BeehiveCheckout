# 🐝 Beehive Platform API文档完整设置指南

## 📋 创建的文件总览

### 🔧 API测试文件 (.http格式)
```
supabase/functions/.http-tests/
├── 📋 README.md                    # 详细使用指南
├── 🎁 upgrade-rewards.http         # 升级奖励系统API测试
├── 💰 rewards.http                 # 通用奖励系统API测试
├── 🏗️ matrix.http                  # 矩阵系统API测试
├── 🔐 auth.http                    # 认证系统API测试
├── 👥 member-management.http       # 会员管理系统API测试
├── 🌍 environment.http             # 环境变量和配置
└── 🎯 common-scenarios.http        # 常用业务场景测试
```

### 📖 Swagger/OpenAPI文档
```
supabase/functions/
├── 🌟 beehive-api.swagger.yaml    # 完整平台API规范
├── 🎁 upgrade-rewards/swagger.yaml # 升级奖励系统专用API规范
└── 🌐 swagger-ui.html             # 交互式API文档界面
```

## 🚀 使用方法

### 1. 🔧 .http文件测试 (推荐用于开发)

#### VS Code用户
1. 安装 **"REST Client"** 插件
2. 打开任意 `.http` 文件
3. 点击请求上方的 **"Send Request"** 按钮

#### IntelliJ IDEA用户
1. 内置支持HTTP客户端
2. 打开 `.http` 文件
3. 点击请求旁边的 **▶️** 图标

#### 配置环境变量
在每个文件顶部更新：
```http
@baseUrl = https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1
@apiKey = YOUR_SUPABASE_ANON_KEY_HERE
@serviceKey = YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE
@testWallet = 0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC
```

### 2. 📖 Swagger UI交互式文档

#### 本地查看
1. 在浏览器中打开：
   ```
   file:///home/ubuntu/WebstormProjects/BEEHIVE/supabase/functions/swagger-ui.html
   ```

2. 或者使用简单HTTP服务器：
   ```bash
   # 进入项目目录
   cd /home/ubuntu/WebstormProjects/BEEHIVE/supabase/functions
   
   # 启动简单HTTP服务器 (Python 3)
   python3 -m http.server 8080
   
   # 浏览器访问
   http://localhost:8080/swagger-ui.html
   ```

#### 在线部署 (可选)
将Swagger文件部署到GitHub Pages或其他静态托管服务：
1. 上传 `swagger-ui.html` 和 `.yaml` 文件
2. 通过URL访问在线文档

### 3. 🎯 快速开始测试

#### 🎁 测试升级奖励系统
```http
# 1. 触发Level 1升级奖励
POST https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/upgrade-rewards/trigger
Authorization: Bearer YOUR_SERVICE_KEY
Content-Type: application/json

{
  "upgraded_member": "0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC",
  "new_level": 1
}

# 2. 查看奖励状态
GET https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/upgrade-rewards/status?wallet_address=0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC
Authorization: Bearer YOUR_API_KEY
```

#### 💰 测试奖励申请
```http
# 获取用户余额
GET https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/rewards/user
Authorization: Bearer YOUR_API_KEY
x-wallet-address: 0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC
```

## 🔑 认证配置

### 获取Supabase API密钥
1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择项目：`cvqibjcbfrwsgkvthccp`
3. 进入 **Settings** > **API**
4. 复制以下密钥：
   - **匿名密钥** (anon key): 用于一般查询
   - **服务角色密钥** (service_role key): 用于管理员操作

### 安全注意事项
- ⚠️ **服务角色密钥**具有完全数据库访问权限，仅用于服务器端
- ✅ **匿名密钥**用于客户端查询操作
- 🔒 在生产环境中使用环境变量存储密钥

## 🎯 主要API端点速览

### 🎁 升级奖励系统
```
BASE: /upgrade-rewards/
├── POST /trigger              # 触发升级奖励
├── GET  /status              # 查看奖励状态
├── POST /check-qualification # 检查R位置考核
├── POST /batch-check         # 批量检查待定奖励
└── GET  /timers              # 获取奖励计时器
```

### 💰 通用奖励系统
```
BASE: /rewards/
├── GET  /user                # 获取用户余额
├── GET  /claimable          # 获取可申请奖励
├── POST /claim              # 申请奖励
├── POST /dashboard          # 奖励仪表板
└── POST /notifications      # 奖励通知
```

### 👥 会员管理系统
```
BASE: /member-management/
├── POST /register           # 注册新会员
├── GET  /info              # 获取会员信息
├── POST /upgrade-level     # 升级会员等级
├── GET  /referrals         # 获取推荐关系
└── POST /update-profile    # 更新会员资料
```

### 🏗️ 矩阵系统
```
BASE: /matrix/
├── GET  /status            # 查看矩阵状态
├── POST /place             # 矩阵安置
├── GET  /completion        # 矩阵完成状态
├── GET  /stats             # 矩阵统计信息
└── GET  /vacant            # 空缺位置查询
```

### 🔐 认证系统
```
BASE: /auth/
├── POST /connect           # 钱包连接认证
├── GET  /status            # 检查用户状态
├── POST /verify            # 验证签名
└── GET  /session           # 获取会话信息
```

## 📊 业务场景测试

### 🎯 完整升级奖励流程
```http
# 1. 触发升级奖励
POST /upgrade-rewards/trigger
{
  "upgraded_member": "0x...",
  "new_level": 1
}

# 2. 查看处理结果
GET /upgrade-rewards/status?wallet_address=0x...

# 3. 检查创建的计时器
GET /upgrade-rewards/timers?wallet_address=0x...

# 4. 批量检查考核状态
POST /upgrade-rewards/batch-check
```

### 🏗️ 矩阵管理流程
```http
# 1. 查看矩阵当前状态
GET /matrix/status?wallet=0x...

# 2. 安置新会员
POST /matrix/place
{
  "member_wallet": "0x...",
  "referrer_wallet": "0x...",
  "preferred_position": "L"
}

# 3. 验证安置结果
GET /matrix/completion?root=0x...
```

## 🐛 故障排除

### 常见错误及解决方案

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```
**解决方案**: 检查API密钥是否正确，确保使用正确的认证头部

#### 400 Bad Request
```json
{
  "success": false,
  "error": "wallet_address required"
}
```
**解决方案**: 检查请求参数是否完整，钱包地址格式是否正确(以0x开头)

#### CORS错误
**解决方案**: 
- 确保请求包含正确的CORS头部
- 使用服务器端调用或代理请求

### 🔧 调试技巧

1. **启用详细日志**:
   ```http
   # 在请求中添加调试头部
   x-debug: true
   ```

2. **检查Edge Function日志**:
   - 访问Supabase Dashboard
   - 进入Edge Functions页面
   - 查看实时日志输出

3. **验证数据库状态**:
   ```sql
   -- 检查奖励记录
   SELECT * FROM member_upgrade_rewards_status LIMIT 5;
   
   -- 检查活跃计时器
   SELECT * FROM countdown_timers WHERE is_active = true;
   ```

## 📈 性能优化建议

### 📊 监控指标
- API响应时间
- 错误率统计
- 数据库查询性能
- Edge Function冷启动时间

### ⚡ 优化建议
1. **批量操作**: 使用批量API减少请求次数
2. **缓存策略**: 对静态数据启用缓存
3. **分页查询**: 对大数据集使用分页
4. **索引优化**: 确保数据库查询有适当索引

## 🚀 部署清单

### ✅ 部署前检查
- [ ] API密钥已正确配置
- [ ] 所有Edge Functions已部署
- [ ] 数据库Schema已更新
- [ ] RPC函数已创建
- [ ] 测试用例通过验证

### 📋 上线后验证
- [ ] 所有主要API端点正常响应
- [ ] 升级奖励系统功能正常
- [ ] 计时器系统运行正常
- [ ] 错误处理符合预期
- [ ] 性能指标在可接受范围

## 📞 技术支持

### 🔍 问题报告
如遇到问题，请提供以下信息：
1. 请求URL和方法
2. 完整的请求头部和参数
3. 错误响应内容
4. Edge Function日志
5. 重现步骤

### 📚 相关资源
- [Supabase Edge Functions文档](https://supabase.com/docs/guides/functions)
- [OpenAPI 3.0规范](https://swagger.io/specification/)
- [HTTP Client工具使用指南](https://www.jetbrains.com/help/idea/http-client-in-product-code-editor.html)

---

**创建时间**: 2025-01-11  
**版本**: 2.0.0  
**维护者**: Beehive Platform Development Team

🎉 **恭喜！您的API文档和测试套件已完全配置完成！**
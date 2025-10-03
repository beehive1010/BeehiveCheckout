# Supabase URL 配置修复指南

## 问题描述
应用中出现了两个不同的 Supabase 项目 URL:
- `cdjmtevekxpmgrixkiqt` (当前在 .env 中配置)
- `cvqibjcbfrwsgkvthccp` (需要使用的正确项目)

## 错误信息
```
Failed to load resource: the server responded with a status of 406
Could not find the 'level' column of 'membership' in the schema cache
```

## 解决步骤

### 1. 更新环境变量
修改 `.env` 文件中的 Supabase 配置:

```bash
# 将这个:
VITE_SUPABASE_URL=https://cdjmtevekxpmgrixkiqt.supabase.co

# 改为:
VITE_SUPABASE_URL=https://cvqibjcbfrwsgkvthccp.supabase.co
```

同时更新对应的 API Key:
```bash
# 需要从 https://cvqibjcbfrwsgkvthccp.supabase.co 项目获取新的密钥
VITE_SUPABASE_ANON_KEY=<从 Supabase Dashboard 获取>
SUPABASE_SERVICE_ROLE_KEY=<从 Supabase Dashboard 获取>
DATABASE_URL=postgresql://postgres:<password>@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres?sslmode=require
VITE_API_BASE_URL=https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1
```

### 2. 运行数据库迁移
在正确的 Supabase 项目中运行迁移文件:

```bash
# 使用 Supabase CLI
supabase db push

# 或手动运行 SQL
# 在 Supabase Dashboard > SQL Editor 中执行:
# supabase/migrations/20251003_fix_membership_table_schema.sql
```

### 3. 检查数据库表结构
确保 `membership` 表有以下列:
- `id` (UUID)
- `wallet_address` (VARCHAR)
- `level` (INTEGER) - 主要列
- `nft_level` (INTEGER) - 兼容性别名
- `is_member` (BOOLEAN)
- `unlock_membership_level` (INTEGER)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### 4. 更新其他配置文件
检查并更新以下文件中的硬编码 URL:

```bash
# 搜索硬编码的 URL
grep -r "cdjmtevekxpmgrixkiqt" src/
grep -r "cvqibjcbfrwsgkvthccp" src/

# 特别检查这些文件:
- src/lib/supabaseClient.ts
- src/lib/supabase.ts
- src/components/membership/*.tsx
```

### 5. 清除浏览器缓存
```bash
# 清除本地存储和缓存
localStorage.clear()
sessionStorage.clear()

# 或在浏览器开发者工具中:
# Application > Storage > Clear site data
```

### 6. 重新构建和部署
```bash
# 本地开发
npm run dev

# 生产构建
npm run build

# 部署
vercel --prod
```

## 验证步骤

1. **检查 API 调用**
   - 打开浏览器开发者工具 > Network
   - 确认所有请求都指向 `cvqibjcbfrwsgkvthccp.supabase.co`
   - 不应该有任何对 `cdjmtevekxpmgrixkiqt` 的调用

2. **测试用户注册**
   ```
   1. 连接钱包
   2. 完成注册流程
   3. 检查数据库中 users 表是否有记录
   ```

3. **测试会员激活**
   ```
   1. 使用 Level 1 Claim 按钮
   2. 确认 membership 表中创建了记录
   3. 确认 level 和 nft_level 列都有正确的值
   ```

4. **检查错误日志**
   - 不应该再有 406 错误
   - 不应该有 "Could not find the 'level' column" 错误
   - activation-membership Edge Function 应该返回 200

## 常见问题

### Q: 406 Not Acceptable 错误
A: 通常是因为:
- API Key 不正确或过期
- RLS (Row Level Security) 策略阻止访问
- URL 不匹配

解决方法:
```sql
-- 检查 RLS 策略
SELECT * FROM pg_policies WHERE tablename = 'membership';

-- 临时禁用 RLS (仅用于调试)
ALTER TABLE membership DISABLE ROW LEVEL SECURITY;
```

### Q: Schema cache 错误
A: 运行以下命令刷新缓存:
```sql
NOTIFY pgrst, 'reload schema';
```

### Q: 数据库连接失败
A: 检查防火墙和数据库密码:
```bash
# 测试连接
psql "postgresql://postgres:<password>@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres?sslmode=require"
```

## 相关文件
- `supabase/migrations/20251003_fix_membership_table_schema.sql` - 修复 membership 表结构
- `.env` - 环境变量配置
- `src/lib/supabaseClient.ts` - Supabase 客户端初始化
- `src/lib/supabase.ts` - Supabase 服务层

## 参考链接
- [Supabase Dashboard](https://supabase.com/dashboard)
- [PostgREST Error Codes](https://postgrest.org/en/stable/errors.html)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)

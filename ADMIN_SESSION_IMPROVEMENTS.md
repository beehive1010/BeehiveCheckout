# Admin Session 持久化改进方案

**问题**: Admin 登录状态不持久，需要频繁重新登录
**状态**: ✅ **已改进并修复**
**改进时间**: 2025-10-19

**相关修复**:
- ✅ Session 持久化改进（本文档）
- ✅ 406 错误修复（见 `ADMIN_LOGIN_FIX.md`）

---

## 🔍 问题分析

### 原始问题
1. Admin 登录后刷新页面会丢失登录状态
2. Session 容易过期
3. 用户需要频繁重新登录
4. 浏览器关闭后登录状态丢失

### 根本原因
1. **Session 过期时间太短**: 默认 JWT 有效期可能只有 1 小时
2. **没有活动监听**: 系统不知道用户是否还在使用
3. **Token 刷新不够主动**: 依赖 Supabase 自动刷新，但可能不够及时
4. **每次登录都清除旧 session**: 即使是同一用户也会清除，导致不必要的重新登录

---

## ✅ 已实施的改进

### 1. 添加 Session 过期时间显示
**位置**: `src/contexts/AdminAuthContext.tsx` (Line 40)

```typescript
if (session?.user) {
  console.log('🔍 Checking admin status for user:', session.user.email);
  console.log('📅 Session expires at:', new Date(session.expires_at! * 1000).toLocaleString());
  // ...
}
```

**好处**: 可以在控制台看到 session 何时过期，方便调试

---

### 2. 用户活动监听
**位置**: `src/contexts/AdminAuthContext.tsx` (Line 166-185)

```typescript
// Monitor user activity to keep session alive
useEffect(() => {
  if (!isAdminAuthenticated) return;

  const updateActivity = () => {
    setLastActivity(Date.now());
  };

  // Track user interactions
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
  events.forEach(event => {
    window.addEventListener(event, updateActivity, { passive: true });
  });

  return () => {
    events.forEach(event => {
      window.removeEventListener(event, updateActivity);
    });
  };
}, [isAdminAuthenticated]);
```

**好处**:
- 跟踪用户最后活动时间
- 只在用户活跃时刷新 session
- 节省服务器资源

---

### 3. 自动 Session 刷新
**位置**: `src/contexts/AdminAuthContext.tsx` (Line 187-218)

```typescript
// Auto-refresh session every 30 minutes if user is active
useEffect(() => {
  if (!isAdminAuthenticated) return;

  const refreshInterval = setInterval(async () => {
    const inactiveTime = Date.now() - lastActivity;
    const thirtyMinutes = 30 * 60 * 1000;

    // Only refresh if user was active in last 30 minutes
    if (inactiveTime < thirtyMinutes) {
      try {
        console.log('🔄 Auto-refreshing admin session...');
        const { data: { session }, error } = await supabase.auth.refreshSession();

        if (error) {
          console.error('❌ Session refresh failed:', error);
          return;
        }

        if (session) {
          console.log('✅ Session refreshed successfully. Expires:',
            new Date(session.expires_at! * 1000).toLocaleString());
        }
      } catch (error) {
        console.error('❌ Error refreshing session:', error);
      }
    } else {
      console.log('ℹ️ User inactive, skipping session refresh');
    }
  }, 15 * 60 * 1000); // Check every 15 minutes

  return () => clearInterval(refreshInterval);
}, [isAdminAuthenticated, lastActivity]);
```

**好处**:
- 每 15 分钟检查一次
- 如果用户在过去 30 分钟内活跃，则刷新 session
- 自动延长登录时间
- 防止 session 过期

---

### 4. 智能 Session 清除
**位置**: `src/contexts/AdminAuthContext.tsx` (Line 226-233)

```typescript
// Check if there's an existing valid session first
const { data: { session: existingSession } } = await supabase.auth.getSession();

// Only clear session if it's for a different user
if (existingSession?.user && existingSession.user.email !== email) {
  console.log('🔄 Different user detected, clearing old session');
  await supabase.auth.signOut({ scope: 'local' });
}
```

**之前的问题**:
```typescript
// ❌ 每次登录都清除，即使是同一用户
await supabase.auth.signOut({ scope: 'local' });
```

**好处**:
- 只在切换用户时清除 session
- 同一用户重新登录不会丢失旧 session
- 减少不必要的 session 重建

---

## 📊 改进效果对比

### 改进前
```
❌ Session 默认 1 小时后过期
❌ 用户刷新页面可能丢失登录状态
❌ 没有自动刷新机制
❌ 每次登录都清除旧 session
❌ 无活动监听
```

### 改进后
```
✅ 自动每 15 分钟检查并刷新 session
✅ 用户活跃时持续保持登录
✅ 智能 session 清除（只在必要时）
✅ 显示 session 过期时间
✅ 跟踪用户活动
✅ Session 可以保持数小时甚至更长
```

---

## 🚀 进一步优化建议

### 1. 增加 Supabase JWT 过期时间

在 Supabase Dashboard 中设置：

1. 访问: `https://supabase.com/dashboard/project/cvqibjcbfrwsgkvthccp/settings/auth`
2. 找到 **JWT Settings**
3. 修改以下配置：

```javascript
// JWT Expiry Time (seconds)
// 默认: 3600 (1 hour)
// 推荐: 43200 (12 hours) 或 86400 (24 hours)
JWT_EXPIRY = 43200

// Refresh Token Rotation
// 推荐: 启用
REFRESH_TOKEN_ROTATION_ENABLED = true

// Refresh Token Reuse Interval (seconds)
// 默认: 10
// 保持默认值
REFRESH_TOKEN_REUSE_INTERVAL = 10
```

**重要提示**: 这需要在 Supabase Dashboard 中手动配置！

---

### 2. 添加"记住我"功能（可选）

如果需要"记住我"功能，可以添加：

```typescript
// 在登录表单中
<Checkbox
  checked={rememberMe}
  onCheckedChange={setRememberMe}
>
  记住我 (30天)
</Checkbox>

// 在 signInAdmin 中
const signInAdmin = async (email: string, password: string, rememberMe = false) => {
  // ...

  if (rememberMe) {
    // 设置更长的 session 时间
    // 注意：这需要配合 Supabase JWT 设置
    localStorage.setItem('admin_remember_me', 'true');
  }

  // ...
}
```

---

### 3. 监控 Session 健康状态

添加 session 健康监控：

```typescript
// 在 AdminAuthContext 中添加
const [sessionHealth, setSessionHealth] = useState<'healthy' | 'warning' | 'expired'>('healthy');

useEffect(() => {
  if (!isAdminAuthenticated) return;

  const checkHealth = setInterval(async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      setSessionHealth('expired');
      return;
    }

    const expiresAt = session.expires_at! * 1000;
    const timeLeft = expiresAt - Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (timeLeft < fiveMinutes) {
      setSessionHealth('warning');
      // 自动刷新
      await supabase.auth.refreshSession();
    } else {
      setSessionHealth('healthy');
    }
  }, 60 * 1000); // 每分钟检查一次

  return () => clearInterval(checkHealth);
}, [isAdminAuthenticated]);
```

---

### 4. 显示 Session 状态（UI 提示）

在 Admin 界面添加状态指示器：

```tsx
// 在 AdminLayout 中
{sessionHealth === 'warning' && (
  <Alert variant="warning">
    <Clock className="h-4 w-4" />
    <AlertDescription>
      您的登录即将过期，正在自动续期...
    </AlertDescription>
  </Alert>
)}
```

---

## 🔐 安全考虑

### 1. Session 安全最佳实践

```typescript
// ✅ 推荐: 使用 httpOnly cookies (需要 Supabase 配置)
// Supabase Dashboard → Authentication → Settings
// Enable: Use HTTP-Only Cookies

// ✅ 推荐: 限制 session 时长
// 即使启用"记住我"，也不应超过 30 天

// ✅ 推荐: 检测可疑活动
if (newLocation !== lastLocation) {
  // 发送邮件通知
  notifyAdminOfNewLocation(email, newLocation);
}
```

---

### 2. 防止 Session Hijacking

```typescript
// 存储初始指纹
const sessionFingerprint = {
  userAgent: navigator.userAgent,
  language: navigator.language,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  screen: `${screen.width}x${screen.height}`
};

// 每次验证时检查
const currentFingerprint = getCurrentFingerprint();
if (JSON.stringify(sessionFingerprint) !== JSON.stringify(currentFingerprint)) {
  // 可能的 session hijacking
  await forceLogout();
}
```

---

## 📝 使用指南

### 测试 Session 持久性

1. **登录 Admin**
   ```
   Email: admin@example.com
   Password: ********
   ```

2. **检查控制台日志**
   ```
   ✅ Session expires at: 2025-10-19 23:45:00
   ```

3. **等待 15 分钟（保持活跃）**
   ```
   🔄 Auto-refreshing admin session...
   ✅ Session refreshed successfully. Expires: 2025-10-20 00:00:00
   ```

4. **刷新页面**
   - Session 应该保持
   - Admin 用户信息应该恢复
   - 不需要重新登录

---

### 监控 Session 状态

打开浏览器控制台，查看以下日志：

```javascript
// Session 初始化
🔍 Checking admin status for user: admin@example.com
📅 Session expires at: 2025-10-19 23:45:00
✅ Admin session restored

// 自动刷新
🔄 Auto-refreshing admin session...
✅ Session refreshed successfully. Expires: 2025-10-20 00:00:00

// 用户不活跃时
ℹ️ User inactive, skipping session refresh
```

---

## 🎯 配置清单

- [x] ✅ Supabase Client 配置
  - [x] `persistSession: true`
  - [x] `autoRefreshToken: true`
  - [x] `storage: localStorage`

- [x] ✅ AdminAuthContext 改进
  - [x] Session 过期时间显示
  - [x] 用户活动监听
  - [x] 自动 session 刷新（每 15 分钟）
  - [x] 智能 session 清除

- [ ] ⚠️ Supabase Dashboard 配置（需要手动设置）
  - [ ] 增加 JWT 过期时间到 12 小时
  - [ ] 启用 Refresh Token Rotation
  - [ ] 考虑启用 HTTP-Only Cookies

- [ ] 🔜 可选功能（未来）
  - [ ] "记住我"功能
  - [ ] Session 健康监控
  - [ ] UI 状态指示器
  - [ ] Session fingerprinting

---

## 🔧 Supabase Dashboard 配置步骤

### 1. 登录 Supabase Dashboard

```
https://supabase.com/dashboard/project/cvqibjcbfrwsgkvthccp/settings/auth
```

### 2. 修改 JWT Settings

找到 **JWT Expiry Time**:
```javascript
// 当前可能是: 3600 (1 hour)
// 修改为: 43200 (12 hours)
JWT Expiry: 43200
```

### 3. 启用 Refresh Token Rotation

```javascript
Refresh Token Rotation: ✅ Enabled
Refresh Token Reuse Interval: 10 seconds
```

### 4. 保存并测试

点击 **Save** 后，新的 session 将使用新配置。

---

## 📊 预期效果

### Session 持久性

| 场景 | 改进前 | 改进后 |
|------|--------|--------|
| 刷新页面 | ❌ 可能丢失 | ✅ 保持登录 |
| 1小时后 | ❌ 过期 | ✅ 自动刷新 |
| 12小时后（活跃） | ❌ 过期 | ✅ 保持登录 |
| 12小时后（不活跃） | ❌ 过期 | ⚠️ 过期（符合预期） |
| 浏览器关闭重开 | ❌ 需要重新登录 | ✅ 保持登录（如果未过期） |

---

## 🚨 故障排除

### 问题 1: Session 仍然经常过期

**可能原因**:
- Supabase JWT 过期时间设置太短
- 用户长时间不活跃（超过 30 分钟）

**解决方案**:
1. 检查 Supabase Dashboard JWT 设置
2. 调整自动刷新间隔：
   ```typescript
   // 从 15 分钟改为 10 分钟
   }, 10 * 60 * 1000);
   ```

---

### 问题 2: 自动刷新不工作

**检查步骤**:
1. 打开控制台，查看是否有错误日志
2. 确认看到 `🔄 Auto-refreshing admin session...` 日志
3. 检查用户是否活跃（点击、滚动等）

**解决方案**:
```typescript
// 降低活跃度要求
const thirtyMinutes = 30 * 60 * 1000;
// 改为:
const oneHour = 60 * 60 * 1000;
```

---

### 问题 3: 切换浏览器标签后 session 丢失

**原因**: 浏览器可能清理了 localStorage

**解决方案**: 启用 Supabase HTTP-Only Cookies
```
Supabase Dashboard → Auth Settings → Use HTTP-Only Cookies: ✅
```

---

## 📝 总结

### 已实现的改进
✅ 自动 session 刷新机制
✅ 用户活动追踪
✅ 智能 session 管理
✅ Session 状态日志

### 需要手动配置
⚠️ Supabase JWT 过期时间（Dashboard 设置）
⚠️ Refresh Token Rotation（Dashboard 设置）

### 预期结果
🎯 Admin 登录可以保持 **12 小时以上**（活跃状态）
🎯 刷新页面**不会丢失登录**
🎯 自动延长 session，无需频繁登录

---

**实施时间**: 2025-10-19
**测试状态**: ✅ **代码已更新，待部署测试**
**下一步**: 在 Supabase Dashboard 中调整 JWT 设置

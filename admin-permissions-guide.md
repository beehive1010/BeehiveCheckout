# Admin Permissions System Guide

## Overview
This system provides a 3-level hierarchical permission structure for managing administrative access in the platform.

## Permission Levels

### Level 1: Basic Admin (基础管理员)
**Access**: Can perform basic day-to-day administrative tasks

| Permission Name | Description | Use Case |
|---|---|---|
| `manage_users` | 管理用户账户 | Create, update, disable user accounts |
| `manage_members` | 管理会员激活和状态 | Approve member activations, update member status |
| `view_analytics` | 查看数据分析 | Access dashboard and reports |
| `manage_content` | 管理内容和博客 | Create/edit blog posts and content |
| `manage_courses` | 管理课程 | Create/manage educational courses |

**Total Permissions**: 5

### Level 2: Advanced Admin (高级管理员) 
**Access**: Level 1 permissions + financial and NFT management

| Permission Name | Description | Use Case |
|---|---|---|
| `manage_rewards` | 管理奖励分配 | Process rewards, manage distributions |
| `manage_nfts` | 管理NFT和等级 | Configure NFT levels, manage upgrades |
| `manage_finances` | 管理财务和提现 | Handle withdrawals, financial operations |

**Total Permissions**: 8 (5 from Level 1 + 3 new)

### Level 3: Super Admin (超级管理员)
**Access**: All permissions including system-critical functions

| Permission Name | Description | Use Case |
|---|---|---|
| `manage_system` | 管理系统设置 | Configure system-wide settings |
| `manage_admins` | 管理其他管理员 | Create/manage other administrators |

**Total Permissions**: 10 (all permissions)

## Permission Hierarchy

The system follows a cascading permission model:

```
Level 3 (Super Admin)
├── Can use ALL 10 permissions
├── Level 2 permissions (3)
└── Level 1 permissions (5)

Level 2 (Advanced Admin)  
├── Can use 8 permissions total
├── Level 2 permissions (3)
└── Level 1 permissions (5)

Level 1 (Basic Admin)
└── Can use 5 permissions only
```

## Usage Examples

### 1. Check if a user has permission
```sql
SELECT check_admin_permission('0x123...', 'manage_users');
-- Returns: true/false
```

### 2. Grant admin access
```sql
INSERT INTO admins (wallet_address, admin_level, permissions)
VALUES ('0x123...', 2, '["manage_users", "manage_members", "manage_rewards"]');
```

### 3. View admin permissions
```sql
SELECT * FROM admin_list WHERE admin_level >= 2;
```

### 4. Update admin permissions
```sql
UPDATE admins 
SET permissions = permissions || '["manage_nfts"]'::jsonb
WHERE wallet_address = '0x123...';
```

## Security Features

1. **Level Validation**: The `check_admin_permission()` function automatically validates both:
   - Admin level requirements
   - Explicit permission grants

2. **Cascading Access**: Higher level admins inherit lower level permissions

3. **Granular Control**: Individual permissions can be granted/revoked regardless of level

4. **Audit Trail**: All admin actions can be tracked through the `admin_actions` table

## Best Practices

1. **Principle of Least Privilege**: Grant minimum required permissions
2. **Regular Audits**: Review admin permissions periodically
3. **Level Assignment**: 
   - Level 1: Customer support, content managers
   - Level 2: Financial operations, product managers
   - Level 3: System administrators, founders

## Database Schema

### Tables
- `admins`: Admin accounts with levels and permissions
- `admin_permissions`: Permission definitions and requirements
- `admin_actions`: Audit log of admin activities

### Functions
- `check_admin_permission(wallet, permission)`: Permission validation
- Views: `admin_list`, `user_complete_info`

## Permission Matrix

| Function Area | Level 1 | Level 2 | Level 3 |
|---|---|---|---|
| **User Management** | ✅ Basic | ✅ Basic | ✅ Full |
| **Member Operations** | ✅ Basic | ✅ Basic | ✅ Full |
| **Content Creation** | ✅ Full | ✅ Full | ✅ Full |
| **Analytics/Reports** | ✅ View | ✅ View | ✅ Full |
| **Financial Operations** | ❌ | ✅ Full | ✅ Full |
| **NFT/Rewards** | ❌ | ✅ Full | ✅ Full |
| **System Settings** | ❌ | ❌ | ✅ Full |
| **Admin Management** | ❌ | ❌ | ✅ Full |

---

*This permission system ensures secure, scalable administrative access while maintaining operational flexibility.*
# 🔒 Beehive Platform Security Audit System

This document provides comprehensive security auditing tools for the Beehive Platform's database and edge functions.

## 🎯 Overview

The security audit system includes:
- **Function Security Audit**: Tests all PostgreSQL functions for permissions and execution
- **RLS (Row Level Security) Audit**: Tests table access policies across user roles  
- **Edge Functions Debug**: Tests Supabase Edge Functions locally and remotely
- **Type Sync**: Ensures database types are synchronized between Supabase and client

## 📂 File Structure

```
├── scripts/
│   ├── debug-edge.sh         # Edge functions debugging tool
│   └── sync-types.sh         # Database types synchronization
├── sql/
│   ├── audit_functions.sql   # PostgreSQL functions security audit
│   ├── rls_audit.sql        # RLS policies enumeration  
│   ├── rls_test_matrix.sql   # RLS testing with different roles
│   ├── security_patches.sql  # Security fixes and patches
│   └── list_functions.sql    # Function inventory query
└── SECURITY_AUDIT.md        # This documentation
```

## 🚀 Quick Start

### 1. Function Security Audit
Tests all public schema functions for proper grants and execution:

```bash
# Via package.json script
npm run audit:functions

# Or directly
psql "postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres" -f sql/audit_functions.sql
```

**What it tests:**
- Function execute permissions for `authenticated` and `anon` roles
- Function execution with safe dummy parameters
- Security DEFINER vs INVOKER settings
- Search path configurations
- Common error patterns (missing tables, columns, permissions)

### 2. RLS Policy Audit
Tests Row Level Security policies across different user roles:

```bash
# Via package.json script  
npm run audit:rls

# Or directly
psql "postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres" -f sql/rls_test_matrix.sql
```

**What it tests:**
- SELECT, INSERT, UPDATE, DELETE operations on all RLS-enabled tables
- Access as `authenticated` user (sub=demo, wallet=0xdemo123)
- Access as `anon` (anonymous) user
- Access as `service_role` (admin access)
- Generates policy gap analysis and suggested fixes

### 3. Edge Functions Debug
Tests Supabase Edge Functions locally and remotely:

```bash
# Via package.json script
npm run debug:edge

# Or directly
./scripts/debug-edge.sh
```

**What it tests:**
- Lists all deployed edge functions
- Checks required environment secrets
- Starts local development server
- Tests functions with example payloads
- Identifies import and environment issues

### 4. Database Type Sync
Syncs Supabase generated types with local client types:

```bash
# Via package.json script
npm run sync:types

# Or directly  
./scripts/sync-types.sh
```

**What it does:**
- Generates fresh types from Supabase project
- Compares with existing `types/database.types.ts`
- Shows diff summary if changes detected
- Validates TypeScript compilation
- Creates backup and safely updates types file

## 🔧 Applying Security Fixes

After running audits, apply the recommended security patches:

```bash
psql "postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres" -f sql/security_patches.sql
```

**Security patches include:**
- Function execute grants for `authenticated`/`anon` roles
- RLS policies for user data access (scoped to `wallet_address`)
- Public read access for reference data (nft_levels, layer_rules, etc.)
- Service role policies for admin access
- View grants for balance overview

## 📊 Audit Results Interpretation

### Function Audit Results

| Status | Meaning | Action Required |
|--------|---------|----------------|
| ✅ SUCCESS | Function executes successfully | None |
| ❌ ERROR | Function failed to execute | Apply recommended fix |
| 🔧 CUSTOM | Has custom search_path | Verify security |
| ✅ AUTH / ❌ AUTH | Has/lacks authenticated role grant | Grant if needed |
| ✅ ANON / ❌ ANON | Has/lacks anonymous role grant | Grant if needed |

### RLS Audit Results

| Symbol | Meaning | Action |
|--------|---------|--------|
| ✅ | Operation allowed | Good |
| ⚠️ | Allowed with constraints | Review constraints |
| ❌ | Operation blocked/error | Check logs |
| 🚫 | Blocked by RLS policy | May need policy |

### Common Fix Patterns

**Permission Denied:**
```sql
GRANT EXECUTE ON FUNCTION function_name TO authenticated, anon;
```

**Missing RLS Policy:**
```sql
CREATE POLICY "authenticated_select_table" ON table_name
    FOR SELECT TO authenticated
    USING (wallet_address = (current_setting('request.jwt.claims')::json->>'wallet_address'));
```

**Missing Table/Column:**
- Check database migration status
- Verify table exists in production
- Update function dependencies

## 🧪 Test Environment Setup

The audit scripts automatically configure test environments:

**Authenticated User:**
```json
{
  "sub": "demo",
  "role": "authenticated", 
  "wallet_address": "0xdemo123"
}
```

**Anonymous User:**
```json
{
  "role": "anon"
}
```

**Service Role:**
```json
{
  "role": "service_role",
  "sub": "service"
}
```

## 🔍 Manual Testing

You can manually test policies using `set_config`:

```sql
-- Test as authenticated user
SELECT set_config('request.jwt.claims', '{"sub":"test","role":"authenticated","wallet_address":"0xtest123"}', true);

-- Test access
SELECT * FROM users WHERE wallet_address = '0xtest123';

-- Test as anonymous
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

-- Test public access
SELECT * FROM nft_levels;
```

## 📋 Step-by-Step Verification Checklist

After applying patches, verify:

- [ ] **Function Access**: All edge functions can execute required database functions
- [ ] **User Data Access**: Users can read/write their own data (scoped by wallet_address)
- [ ] **Reference Data**: Public tables (nft_levels, layer_rules) readable by all
- [ ] **Admin Access**: Service role has full access to all tables
- [ ] **Security**: Users cannot access other users' private data
- [ ] **Edge Functions**: All deployed functions work without permission errors
- [ ] **Type Safety**: TypeScript compilation succeeds with updated types

## 🚨 Security Best Practices

1. **Principle of Least Privilege**: Users should only access their own data
2. **Wallet-Based Scoping**: Use `wallet_address` for user data isolation
3. **Service Role Protection**: Only use service role for admin operations
4. **Function Security**: Prefer SECURITY INVOKER for user functions
5. **Regular Audits**: Run audits after schema changes or deployments

## 🔄 CI/CD Integration

Add these commands to your CI pipeline:

```yaml
# GitHub Actions example
- name: Security Audit
  run: |
    npm run audit:functions
    npm run audit:rls
    npm run sync:types

- name: Apply Security Patches
  run: |
    psql "$DATABASE_URL" -f sql/security_patches.sql
```

## 🐛 Troubleshooting

**Connection Issues:**
- Verify database password
- Check network connectivity  
- Confirm Supabase project is running

**Permission Denied:**
- Run security patches: `sql/security_patches.sql`
- Check user role in JWT claims
- Verify RLS policies exist

**Function Not Found:**
- Check function exists in public schema
- Verify function name spelling
- Confirm function is deployed

**Type Compilation Errors:**
- Run `npm run sync:types` 
- Update code using changed types
- Check for breaking schema changes

## 📈 Monitoring

Monitor these metrics after applying fixes:
- Edge function success rates
- Database query performance
- User authentication flows
- Admin panel functionality

---

**🎉 With this audit system, you can maintain a secure and well-monitored Beehive Platform!**
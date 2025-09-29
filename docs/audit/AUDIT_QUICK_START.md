# 🚀 Quick Start: Database Audits Without psql

**Problem:** `psql: command not found` when running audit scripts.

**Solutions:** Multiple ways to run the security audits!

## 🎯 Method 1: Supabase Dashboard (Recommended)

**✅ Works immediately, no installation needed**

1. **Open Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/cvqibjcbfrwsgkvthccp
   ```

2. **Go to SQL Editor** (left sidebar)

3. **Run audits by copying/pasting:**

   **Function Audit:**
   - Copy contents from: `sql/audit_functions.sql`
   - Paste in SQL Editor → Execute

   **RLS Audit:**
   - Copy contents from: `sql/rls_test_matrix.sql` 
   - Paste in SQL Editor → Execute

   **Apply Fixes:**
   - Copy contents from: `sql/security_patches.sql`
   - Paste in SQL Editor → Execute

## 🔧 Method 2: Install PostgreSQL Client

**For local development convenience**

### Quick Install Commands:

**Ubuntu/Debian:**
```bash
sudo apt-get update && sudo apt-get install -y postgresql-client
```

**macOS (with Homebrew):**
```bash
brew install postgresql
```

**CentOS/RHEL/Fedora:**
```bash
sudo dnf install postgresql  # or: sudo yum install postgresql
```

**Or use our installer script:**
```bash
./scripts/install-psql.sh
```

### After Installation:
```bash
# Test connection
psql "postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres" -c "SELECT version();"

# Run audits
psql "postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres" -f sql/audit_functions.sql
psql "postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres" -f sql/rls_test_matrix.sql
```

## 🖥️ Method 3: Using Docker

**If you can't install psql directly:**

```bash
# Run PostgreSQL client in Docker
docker run --rm -it \
  -v $(pwd)/sql:/sql \
  postgres:15 \
  psql "postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres" \
  -f /sql/audit_functions.sql
```

## 🔍 Method 4: Online SQL Tools

**Use online PostgreSQL clients:**

1. **pgAdmin Web:** https://www.pgadmin.org/
2. **DBeaver CloudBeaver:** https://dbeaver.com/cloudbeaver/
3. **PopSQL:** https://popsql.com/

**Connection Details:**
- Host: `db.cvqibjcbfrwsgkvthccp.supabase.co`
- Port: `5432`
- Database: `postgres`
- Username: `postgres`  
- Password: `bee8881941`

## 📱 Method 5: Mobile/Tablet

**Use Supabase mobile app or web dashboard on mobile devices**

## ⚡ Quick Commands Reference

```bash
# Check if psql is installed
which psql

# Install psql helper
./scripts/install-psql.sh

# Get help
npm run audit:help

# Test other tools that work
npm run debug:edge
npm run sync:types
```

## 🎯 What Each Audit Does

| **Audit** | **File** | **Purpose** |
|-----------|----------|-------------|
| Function Security | `sql/audit_functions.sql` | Tests all PostgreSQL functions for permissions and execution |
| RLS Policies | `sql/rls_test_matrix.sql` | Tests table access across user roles (auth/anon/service) |
| Security Fixes | `sql/security_patches.sql` | Applies recommended security policy fixes |

## 🔧 Troubleshooting

**Connection Refused:**
- Check if Supabase project is running
- Verify the connection string
- Try from Supabase Dashboard first

**Permission Denied:**
- Password might be incorrect
- Try refreshing database password in Supabase Dashboard

**Timeout:**
- Network connectivity issue
- Try smaller queries first
- Use Supabase Dashboard as fallback

## 🎉 Success!

Once you can connect and run the audits, you'll see:
- ✅ Functions that work correctly
- ❌ Functions needing fixes  
- 🔒 RLS policy coverage
- 📋 Specific fix recommendations

The audit system will guide you through securing your database! 🔐
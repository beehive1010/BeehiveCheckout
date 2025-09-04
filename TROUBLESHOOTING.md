# Beehive Platform - Troubleshooting Guide

## Current Issues and Solutions

### 1. Frontend Connection Issues (ERR_CONNECTION_REFUSED)

**Problem:** Frontend can't connect to `localhost:5000`

**Solutions:**
```bash
# Check if development server is running
curl http://localhost:5000/api/auth/user

# If not accessible, the server might be bound to different host
# Check the server logs for the actual URL
```

**If using Replit/Cloud Environment:**
- Use the public URL instead of localhost
- Check `.replit` configuration for port binding
- Frontend should connect to the public Replit URL, not localhost

### 2. Database Connection Timeouts

**Problem:** `Connection terminated due to connection timeout`

**Immediate Fix:** Create test user data
```bash
# Run this to create test data that bypasses database issues
psql "your_database_url" -f sql/create-test-user.sql
```

**Long-term Fix:** Database connection pooling
- Check Neon database connection limits
- Implement connection retries in the application
- Use connection pooling (PgBouncer)

### 3. Wallet Connection Issues

**Problem:** `wallet must has at least one account`

**Solutions:**
- Connect TronLink wallet properly
- Ensure wallet has at least one account
- Switch to a different wallet extension if needed
- Use MetaMask instead of TronLink for testing

### 4. Missing API Endpoints (404 errors)

**Problem:** `GET /api/auth/user 404 (Not Found)`

**Check:** Ensure all route modules are registered
```bash
# The server logs should show:
# "✅ All route modules registered successfully"
```

**If not showing:** Check `server/index.ts` route registration

### 5. NFT Claiming Not Writing to Database

**Problem:** NFT claims succeed but no records in database tables

**Fix:** Run the database fixes
```bash
# Fix table name references
psql "your_database_url" -f sql/fix-level-configurations-references.sql

# Fix data insertion triggers
psql "your_database_url" -f sql/fix-nft-claim-data-insertion.sql

# Create test user data
psql "your_database_url" -f sql/create-test-user.sql
```

## Testing Steps

### 1. Test Server Connectivity
```bash
# Test if server is accessible
curl http://localhost:5000/api/auth/user -H "x-wallet-address: 0x1234567890123456789012345678901234567890"

# Should return user data, not connection refused
```

### 2. Test NFT Claiming
```bash
# Test NFT claiming endpoint
curl -X POST http://localhost:5000/api/demo/claim-nft \
  -H "x-wallet-address: 0x1234567890123456789012345678901234567890" \
  -H "Content-Type: application/json" \
  -d '{"level": 1}'

# Should return success without database errors
```

### 3. Test Database Records
```sql
-- Check if records are being created
SELECT * FROM members WHERE wallet_address = '0x1234567890123456789012345678901234567890';
SELECT * FROM bcc_balances WHERE wallet_address = '0x1234567890123456789012345678901234567890';
SELECT * FROM nft_purchases WHERE wallet_address = '0x1234567890123456789012345678901234567890';
```

## Environment-Specific Fixes

### Replit Environment
```bash
# Check the public URL in Replit
echo $REPL_URL

# Update frontend API calls to use public URL instead of localhost
# In client code, replace localhost:5000 with your Replit URL
```

### Local Development
```bash
# Ensure both frontend and backend are running
npm run dev

# Check ports are not blocked by firewall
netstat -tulpn | grep :5000
```

## Current Status Summary

✅ **Server is running** on port 5000  
✅ **API endpoints exist** and respond correctly  
⚠️  **Database connections timeout** (using fallback data)  
❌ **Frontend can't connect** to backend (network/configuration issue)  
❌ **Wallet connection issues** (TronLink configuration)  

## Next Steps

1. **Fix network connectivity** between frontend and backend
2. **Resolve database connection issues** or continue using fallback data
3. **Test with proper wallet connection** (MetaMask or properly configured TronLink)
4. **Run the SQL fixes** to ensure data persistence when database is accessible

## Quick Test Commands

```bash
# Test all critical endpoints
curl -H "x-wallet-address: 0x1234567890123456789012345678901234567890" http://localhost:5000/api/auth/user
curl -H "x-wallet-address: 0x1234567890123456789012345678901234567890" http://localhost:5000/api/stats/user-referrals
curl -X POST -H "x-wallet-address: 0x1234567890123456789012345678901234567890" -H "Content-Type: application/json" -d '{"level":1}' http://localhost:5000/api/demo/claim-nft
```

All three should return JSON responses without connection errors.
# Manual Supabase Function Deployment

## Quick Deployment Steps

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/cvqibjcbfrwsgkvthccp

2. **Navigate to Edge Functions**: 
   - Click "Edge Functions" in the left sidebar

3. **Deploy AUTH Function**:
   - Click "Create a new function" or edit existing "auth" function
   - Function name: `auth`
   - Copy the entire content from: `/home/runner/workspace/supabase/functions/auth/index.ts`
   - Click "Deploy function"

4. **Deploy ADMIN-CLEANUP Function**:
   - Click "Create a new function" 
   - Function name: `admin-cleanup`
   - Copy the entire content from: `/home/runner/workspace/supabase/functions/admin-cleanup/index.ts`
   - Click "Deploy function"

## Environment Variables (if not already set)
Make sure these are configured in your Supabase project settings:
- `SUPABASE_URL`: https://cvqibjcbfrwsgkvthccp.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA2NTQwNSwiZXhwIjoyMDcyNjQxNDA1fQ.t4XRmLq13ff6VjE6hAEAJYdYsLPqOWwquRQUwJ1RL2M
- `ADMIN_SECRET_KEY`: beehive-admin-secret

## What This Deployment Fixes
- ✅ Users register without creating referral entries
- ✅ Referral tree only created when users activate membership
- ✅ Root wallet (0x0000000000000000000000000000000000000001) used for users without referrers
- ✅ Clean separation between registration and referral system
- ✅ Admin cleanup separated from auth flow

Once deployed, the database will properly handle the "referrals only for members" requirement.
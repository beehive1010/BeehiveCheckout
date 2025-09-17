# Supabase Client Unification - Migration Notes

## What was done (September 17, 2025)

Successfully unified multiple Supabase client instances to eliminate "Multiple GoTrueClient instances detected" warnings and consolidate authentication flow.

## Changes Made

### 1. Created Unified Client
- **New file**: `src/lib/supabase-unified.ts`
- **Purpose**: Single source of truth for all Supabase operations
- **Consolidates**: authService, balanceService, dbFunctions, and Edge Function calls

### 2. Updated Core Components
The following critical files now use the unified client:
- `src/hooks/useWallet.ts` 
- `src/contexts/Web3Context.tsx`
- `src/components/modals/RegistrationModal.tsx`
- `src/components/modals/UpdatedRegistrationModal.tsx`
- `src/components/guards/MemberGuard.tsx`
- `src/components/welcome/WelcomePage.tsx`
- `src/components/auth/UserRegistration.tsx`

### 3. Legacy Files (Still Present for Compatibility)
These files should be gradually migrated away from:
- `src/lib/supabaseClient.ts` - Original client with authService
- `src/lib/supabase.ts` - Database functions + authService re-export  
- `src/lib/supabase-original.ts` - Alternative client with dbFunctions

### 4. Fixed Issues
- ✅ Eliminated "Multiple GoTrueClient instances detected" warnings
- ✅ Consolidated all authentication services into single entry point
- ✅ Fixed registration modal client instance conflicts
- ✅ Unified Edge Function calling patterns

## Migration Path for Remaining Files

### Files Still Using Old Clients
The following files still import from legacy clients and should be migrated:
- Pages: `Registration.tsx`, `NFTs.tsx`, `NFTCenter.tsx`, `MatrixTestPage.tsx`, `AdminNFTs.tsx`
- Components: Matrix components, membership components
- Hooks: `useBeeHiveStats.ts`, `useNFTLevelClaim.ts`

### Migration Instructions
To migrate a file from old client to unified client:

1. **Replace import**:
   ```typescript
   // OLD
   import { authService } from '../../lib/supabaseClient';
   // NEW  
   import { authService } from '../../lib/supabase-unified';
   ```

2. **Update service calls** (if needed):
   ```typescript
   // All authService, balanceService, dbFunctions are available
   // Edge function calls use callEdgeFunction helper
   ```

## Test Results
- ✅ No "Multiple GoTrueClient instances detected" warnings in console
- ✅ Authentication flow working properly
- ✅ Registration modals using unified services
- ✅ User status queries working through unified client

## Future Cleanup
Once all files are migrated to use `supabase-unified.ts`:
1. Remove `src/lib/supabaseClient.ts`
2. Remove `src/lib/supabase-original.ts` 
3. Update `src/lib/supabase.ts` to just re-export from unified client
4. Remove this migration notes file

## Success Metrics
- **Before**: Multiple Supabase client instances causing warnings and potential conflicts
- **After**: Single unified client with all functionality consolidated
- **Result**: Clean, maintainable authentication system with no instance conflicts
# Database Functions & Edge Functions Reorganization Plan

## Current Issues
- Duplicate validation logic between database functions and edge functions
- Inconsistent data sources (members vs membership tables)
- Multiple functions doing similar user/member checks
- Edge functions calling database functions that duplicate edge function logic

## Reorganization Strategy

### 1. Database Functions (Core Business Logic)
**Keep in database - these handle pure data operations:**

#### User Management
- `register_user_simple` ✅ Keep - handles user registration
- `process_user_registration` 🔄 Merge with register_user_simple
- `handle_new_user` 🗑️ Remove - duplicates registration logic

#### Membership Core
- `activate_nft_level1_membership` ✅ Keep - core activation logic
- `sync_members_to_membership` ✅ Keep - data consistency
- `place_new_member_in_matrix_correct` ✅ Keep - matrix placement logic

#### Rewards Core
- `trigger_layer_rewards_on_upgrade` ✅ Keep - reward calculation
- `claim_layer_reward` ✅ Keep - reward claiming
- `get_user_pending_rewards` ✅ Keep - reward queries

#### Balance Core  
- `unlock_bcc_for_level` ✅ Keep - BCC unlocking logic
- `release_bcc_on_level_upgrade` ✅ Keep - level upgrade rewards

### 2. Edge Functions (API & Integration)
**Simplified edge functions - these handle external interfaces:**

#### Core APIs (Keep & Simplify)
- `auth` - User authentication & basic info (remove duplicate checks)
- `activate-membership` - NFT activation workflow (remove database validation duplication)
- `balance` - Balance queries & updates (remove user creation logic)
- `rewards` - Reward management interface

#### Remove/Merge These Edge Functions
- `member-management` 🔄 Merge into `auth`
- `member-info` 🔄 Merge into `auth` 
- `dashboard` 🔄 Merge into multiple specific APIs
- `nft-purchase` & `nft-upgrades` 🔄 Merge into single `nft-operations`

## Specific Cleanup Actions

### 1. Remove Duplicate User Validation
Currently these all do user existence checks:
- auth/index.ts (getUser function)
- activate-membership/index.ts (multiple user checks)  
- balance/index.ts (user creation)
- member-management/index.ts

**Solution**: Centralize user validation in database functions only.

### 2. Consolidate Member Status Checks
Currently scattered across:
- `authService.isActivatedMember()`
- `activate-membership` function
- Multiple database queries

**Solution**: Single source of truth via database function.

### 3. Eliminate Table Duplication
Issues with `members` vs `membership` tables:
- Database functions use `members` as primary
- Some edge functions expect `membership` records

**Solution**: Use `members` table as single source, auto-sync to `membership`.

## Implementation Steps

### Phase 1: Database Function Cleanup
1. Merge `process_user_registration` into `register_user_simple`
2. Remove `handle_new_user` (duplicates registration)
3. Create unified `get_member_status` function
4. Add auto-sync trigger for members → membership

### Phase 2: Edge Function Simplification  
1. Remove user validation from edge functions
2. Consolidate member-related edge functions
3. Remove database checks from activate-membership
4. Simplify balance function

### Phase 3: API Consolidation
1. Merge member-info + member-management → auth
2. Create single nft-operations function
3. Simplify rewards API
4. Remove redundant functions

## Expected Benefits
- ✅ Faster API responses (less duplicate queries)
- ✅ Consistent data validation
- ✅ Easier maintenance
- ✅ Single source of truth for member status
- ✅ Reduced database load
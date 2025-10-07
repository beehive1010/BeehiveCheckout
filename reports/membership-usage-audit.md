# Membership Domain — Usage Audit Report

**Document Version**: 1.0
**Created**: 2025-10-08
**Status**: Complete
**Scope**: Full inventory of membership components, pages, hooks, and usage patterns

---

## Executive Summary

### Purpose
This audit provides a comprehensive inventory of all membership-related code across the codebase, documenting:
1. Which components are actively used vs. legacy
2. What pages consume membership components
3. Current implementation patterns and inconsistencies
4. Gaps and opportunities for improvement

### Key Findings

#### ✅ Strengths
- Clean folder organization: `ActiveMember/`, `UpgradeLevel/`, `core/`
- New architecture components (`MembershipActivationButton`, `MembershipUpgradeButton`) follow best practices
- Direct claim pattern (approve + claimTo) implemented correctly
- Backward compatibility maintained through index exports

#### ⚠️ Critical Issues
1. **Hardcoded Pricing**: `LEVEL_PRICING` constant in `useNFTLevelClaim.ts` (should use `platform_params`)
2. **Multiple Claim Implementations**: 3+ different button components for same functionality
3. **Client-Side Validation**: Business rules enforced in frontend, not Edge Functions
4. **Direct Database Queries**: Components query Supabase directly instead of using Edge Functions
5. **Missing Server Validation**: No eligibility checks before blockchain transactions

#### 📊 Statistics
- **Total Membership Components**: 17 (10 active, 4 legacy, 3 archived)
- **Pages Using Membership**: 8 (2 primary, 6 secondary)
- **Hooks**: 3 (1 recommended, 2 legacy)
- **Hardcoded Values**: 1 major (LEVEL_PRICING), multiple minor

---

## 1. Pages Inventory

### 1.1 Primary Pages (Production)

#### `src/pages/Welcome.tsx` ⭐ PRIMARY
**Purpose**: Level 1 activation for new users
**Status**: ✅ Active (Production)
**Current Implementation**:
```typescript
import { WelcomeLevel1ClaimButton } from '../components/membership/WelcomeLevel1ClaimButton';

<WelcomeLevel1ClaimButton
  onSuccess={handleActivationComplete}
  referrerWallet={referrerWallet}
  className="w-full"
/>
```

**Features**:
- Referrer validation from URL params or localStorage
- Default referrer fallback: `0x3C1FF5B4BE2A1FB8c157aF55aa6450eF66D7E242`
- Auto-redirect to dashboard after activation
- Membership status checking (prevents re-activation)
- Manual refresh button for status sync

**Issues**:
- ⚠️ Uses legacy `WelcomeLevel1ClaimButton` instead of new `MembershipActivationButton`
- ⚠️ Direct Supabase queries for membership check (`authService.isActivatedMember`)
- ⚠️ Complex client-side validation logic (should be server-side)

**Recommendation**: Migrate to `MembershipActivationButton` for consistency

---

#### `src/pages/Membership.tsx` ⭐ PRIMARY
**Purpose**: Level 2-19 upgrades for existing members
**Status**: ✅ Active (Production)
**Current Implementation**:
```typescript
import { Level2ClaimButtonV2 } from '../components/membership/Level2ClaimButtonV2';
import { LevelUpgradeButtonGeneric } from '../components/membership/LevelUpgradeButtonGeneric';

// Level 2 specific
{currentLevel === 1 && (directReferralsCount || 0) >= 3 && !hasLevel2NFT ? (
  <Level2ClaimButtonV2 onSuccess={...} />
) : (
  <LevelUpgradeButtonGeneric
    targetLevel={currentLevel + 1}
    currentLevel={currentLevel}
    directReferralsCount={directReferralsCount || 0}
    onSuccess={...}
  />
)}
```

**Features**:
- Dynamic component selection based on current level
- NFT ownership verification from blockchain
- Direct referral count checking
- Level 2 special gate enforcement (3+ referrals)
- Auto-sync for level mismatches
- Premium card-based UI for levels 3-19

**Issues**:
- ⚠️ Uses legacy components instead of `MembershipUpgradeButton`
- ⚠️ Complex conditional logic for component selection
- ⚠️ Direct blockchain queries for NFT verification (lines 61-168)
- ⚠️ Client-side referral count checking (should be server-side)
- ⚠️ Hardcoded pricing in UI (lines 346-444)
- ⚠️ Direct Supabase queries for referrals and unlock levels

**Recommendation**: Replace with single `MembershipUpgradeButton` component with server-side validation

---

### 1.2 Test/Development Pages

#### `src/pages/TestActiveButton.tsx`
**Purpose**: Testing Level 1 activation button
**Status**: 🧪 Test/Development
**Usage**: Unknown
**Recommendation**: Archive after testing complete

---

#### `src/pages/TestUpgradeMembership.tsx`
**Purpose**: Testing membership upgrade flow
**Status**: 🧪 Test/Development
**Usage**: Unknown
**Recommendation**: Archive after testing complete

---

### 1.3 Secondary Pages (Using Membership Components)

#### `src/pages/Dashboard.tsx`
**Status**: Uses `MembershipBadge` for display
**Issue**: None (read-only usage)

#### `src/pages/NFTs.tsx`
**Status**: May use membership verification
**Issue**: Needs audit

#### `src/components/dashboard/ComprehensiveMemberDashboard.tsx`
**Status**: Uses `MembershipBadge` and imports membership types
**Issue**: None (display only)

#### `src/components/nfts/NFTRequiredScreen.tsx`
**Status**: Uses `MembershipActivationButton` ✅
**Issue**: None (correct usage)

#### `src/components/welcome/WelcomePage.tsx`
**Status**: Uses `WelcomeLevel1ClaimButton`
**Issue**: Should migrate to `MembershipActivationButton`

---

### 1.4 Archived Pages

#### `src/pages/_archive/CheckoutTest.tsx`
**Status**: 🗃️ Archived
**Content**: CheckoutWidget test (deprecated method)
**Action**: Keep archived

#### `src/pages/_archive/MultiChainClaimDemo.tsx`
**Status**: 🗃️ Archived
**Content**: Multi-chain claim demo
**Action**: Keep archived

---

## 2. Components Inventory

### 2.1 Recommended Components (New Architecture)

#### `src/components/membership/ActiveMember/MembershipActivationButton.tsx` ⭐
**Purpose**: Level 1 activation
**Status**: ✅ Recommended
**Pattern**: Direct claim (approve + claimTo)
**Features**:
- Uses `useNFTClaim` core hook
- Referrer validation
- Auto-registration flow
- Exact USDT approval (security)
- Backend activation via `mint-and-send-nft`

**Usage Count**: 2 files
- `src/components/nfts/NFTRequiredScreen.tsx` ✅
- Not yet used in `Welcome.tsx` ⚠️

**Issues**: None

---

#### `src/components/membership/UpgradeLevel/MembershipUpgradeButton.tsx` ⭐
**Purpose**: Level 2-19 upgrades
**Status**: ✅ Recommended
**Pattern**: Direct claim (approve + claimTo)
**Features**:
- Uses `useNFTClaim` core hook
- Level 2 referral gate (3+ direct)
- Sequential upgrade enforcement
- Backend activation via `level-upgrade`

**Usage Count**: 0 files ⚠️
**Issues**: Not yet integrated into production pages

**Recommendation**: Replace legacy components in `Membership.tsx`

---

#### `src/components/membership/core/NFTClaimButton.tsx` ⭐
**Purpose**: Shared claim logic hook
**Status**: ✅ Core
**Pattern**: Reusable `useNFTClaim` hook
**Features**:
```typescript
export function useNFTClaim() {
  const claimNFT = async (config: NFTClaimConfig) => {
    // 1. Check USDT balance
    // 2. Approve exact amount (NOT unlimited)
    // 3. Claim NFT via claimTo
    // 4. Backend activation via Edge Function
  };
}
```

**Usage Count**: 2 files
- `MembershipActivationButton.tsx` ✅
- `MembershipUpgradeButton.tsx` ✅

**Issues**: None

---

### 2.2 Legacy Components (Maintained)

#### `src/components/membership/ActiveMember/WelcomeLevel1ClaimButton.tsx`
**Purpose**: Level 1 activation (legacy)
**Status**: ✅ Maintained (updated with direct claim)
**Pattern**: Direct claim (approve + claimTo)
**Usage Count**: 2 files
- `src/pages/Welcome.tsx` (PRIMARY) ✅
- `src/components/welcome/WelcomePage.tsx` ✅

**Issues**:
- ⚠️ Should migrate to `MembershipActivationButton`
- ⚠️ Duplicate functionality

**Recommendation**: Gradual deprecation, migrate users to `MembershipActivationButton`

---

#### `src/components/membership/UpgradeLevel/Level2ClaimButtonV2.tsx`
**Purpose**: Level 2 specific upgrade
**Status**: ✅ Maintained
**Pattern**: Direct claim with referral check
**Usage Count**: 1 file
- `src/pages/Membership.tsx` (line 542) ✅

**Issues**:
- ⚠️ Level 2 specific (not generic)
- ⚠️ Should be replaced by `MembershipUpgradeButton`

**Recommendation**: Deprecate after migration

---

#### `src/components/membership/UpgradeLevel/LevelUpgradeButtonGeneric.tsx`
**Purpose**: Level 3-19 upgrades
**Status**: ✅ Maintained
**Pattern**: Generic upgrade with Thirdweb v5
**Usage Count**: 1 file
- `src/pages/Membership.tsx` (line 586) ✅

**Issues**:
- ⚠️ Should be replaced by `MembershipUpgradeButton`
- ⚠️ Complex conditional logic

**Recommendation**: Deprecate after migration

---

#### `src/components/membership/UpgradeLevel/LevelUpgradeButton.tsx`
**Purpose**: General level upgrade
**Status**: ✅ Maintained (Thirdweb v5)
**Pattern**: Comprehensive upgrade logic
**Usage Count**: 0 files (exported but unused) ⚠️

**Issues**: Not actively used

**Recommendation**: Archive or remove

---

### 2.3 Compatibility Components

#### `src/components/membership/ActiveMember/ActiveMembershipClaimButton.tsx`
**Status**: 📦 Legacy (kept for compatibility)
**Usage Count**: 0 files
**Issues**: May use old methods
**Recommendation**: Archive if unused

#### `src/components/membership/ActiveMember/ActiveMembershipPage.tsx`
**Status**: 📦 Legacy page component
**Usage Count**: 0 files
**Recommendation**: Archive if unused

#### `src/components/membership/UpgradeLevel/Level2ClaimButton.tsx`
**Status**: 📦 Legacy Level 2 button
**Usage Count**: 0 files
**Recommendation**: Archive

#### `src/components/membership/UpgradeLevel/LevelUpgradeButtonGeneric-Fixed.tsx`
**Status**: 📦 Legacy fixed version
**Usage Count**: 0 files
**Recommendation**: Archive

---

### 2.4 Archived Components

#### `src/components/membership/_archive/Level2ClaimButtonV2_old.tsx`
**Status**: 🗃️ Archived
**Action**: Keep archived

#### `src/components/membership/_archive/LevelUpgradeButtonGeneric_old.tsx`
**Status**: 🗃️ Archived
**Action**: Keep archived

#### `src/components/membership/_archive/WelcomeLevel1ClaimButton_old.tsx`
**Status**: 🗃️ Archived
**Action**: Keep archived

#### `src/components/membership/_archive/CheckoutLevel1Button_BACKUP.tsx`
**Status**: 🗃️ Archived (CheckoutWidget method)
**Action**: Keep archived

#### `src/components/membership/_archive/ClaimButtonDemo.tsx`
**Status**: 🗃️ Archived demo
**Action**: Keep archived

#### `src/components/membership/_archive/Level1ClaimWithCheckout.tsx`
**Status**: 🗃️ Archived (CheckoutWidget method)
**Action**: Keep archived

---

### 2.5 UI Components

#### `src/components/membership/MembershipBadge.tsx`
**Purpose**: Display membership level badge
**Status**: ✅ Active (display only)
**Usage Count**: 5+ files
**Issues**: None

---

## 3. Hooks Inventory

### 3.1 Recommended Hook

#### `src/components/membership/core/NFTClaimButton.tsx` (useNFTClaim)
**Purpose**: Core claim logic
**Status**: ⭐ Recommended
**Features**:
- USDT balance checking
- Exact amount approval (security)
- Direct claimTo
- Transaction retry
- Backend activation

**Usage**: 2 components (new architecture)

**Issues**: None

---

### 3.2 Legacy Hooks

#### `src/hooks/useNFTLevelClaim.ts` ⚠️ CRITICAL ISSUE
**Purpose**: Level info and pricing
**Status**: ✅ Active but needs refactor
**Usage Count**: Multiple components

**Features**:
```typescript
export const LEVEL_PRICING = {
  1: 130,   // Level 1: 130 USDT
  2: 150,   // Level 2: 150 USDT
  3: 200,   // Level 3: 200 USDT
  // ... up to 19: 1000
};
```

**Critical Issues**:
- 🔴 **HARDCODED PRICING**: Should fetch from `platform_params` table
- 🔴 **NO DYNAMIC CONFIGURATION**: Cannot change prices without code deployment
- ⚠️ Direct Supabase queries from hook
- ⚠️ Client-side business logic

**Impact**: HIGH - All pricing is hardcoded

**Recommendation**:
1. Create `usePlatformParams` hook to fetch from database
2. Remove `LEVEL_PRICING` constant
3. Add caching layer (5min TTL)
4. Fallback to safe defaults on error

---

#### `src/hooks/useMembershipNFT.ts`
**Purpose**: NFT contract management
**Status**: ✅ Active
**Features**:
- Contract initialization
- Chain switching
- Account management

**Usage Count**: Multiple components

**Issues**: None (infrastructure hook)

---

#### `src/hooks/useERC20Approval.ts`
**Purpose**: ERC20 approval helper
**Status**: ✅ Active
**Features**:
- Automatic approval detection
- Transaction approval

**Usage Count**: Unknown

**Issues**: May be redundant with `useNFTClaim` hook

**Recommendation**: Audit usage, possibly consolidate

---

## 4. Implementation Patterns Analysis

### 4.1 Current Patterns

#### Pattern A: Direct Claim (Recommended) ⭐
**Used by**: `MembershipActivationButton`, `MembershipUpgradeButton`, `WelcomeLevel1ClaimButton`

```typescript
// 1. Check USDT balance
const balance = await erc20BalanceOf({...});

// 2. Approve exact amount
const approveTransaction = approve({
  contract: usdtContract,
  spender: NFT_CONTRACT,
  amount: priceWei.toString(), // Exact amount
});

// 3. Claim NFT
const claimTransaction = claimTo({
  contract: nftContract,
  to: account.address,
  tokenId: BigInt(level),
  quantity: BigInt(1),
});

// 4. Backend activation
await fetch(`${API_BASE}/activate-membership`, {
  method: 'POST',
  body: JSON.stringify({
    walletAddress,
    targetLevel,
    transactionHash
  })
});
```

**Strengths**:
- ✅ Exact approval (secure)
- ✅ Direct blockchain interaction
- ✅ Backend activation
- ✅ Transaction retry logic

**Issues**: None

---

#### Pattern B: Legacy Components (To Deprecate) ⚠️
**Used by**: `Level2ClaimButtonV2`, `LevelUpgradeButtonGeneric`

**Issues**:
- ⚠️ Complex conditional logic
- ⚠️ Duplicate functionality
- ⚠️ Inconsistent validation

**Recommendation**: Migrate to Pattern A

---

#### Pattern C: CheckoutWidget (Deprecated) 🗃️
**Used by**: Archived components only

**Status**: Fully deprecated, no longer in use

---

### 4.2 Validation Patterns

#### Client-Side Validation (Current) ⚠️
**Location**: Components and pages

**Example from `Membership.tsx`:**
```typescript
// Line 309: Level 2 referral check
if (targetLevel === 2) {
  if ((directReferralsCount || 0) < 3) {
    toast({ title: 'Requirements not met' });
    return;
  }
}
```

**Issues**:
- 🔴 **Business logic in frontend**: Easy to bypass
- 🔴 **No server validation**: Blockchain transaction happens before validation
- 🔴 **Inconsistent rules**: Different components check differently

**Impact**: Security and consistency risk

---

#### Server-Side Validation (Needed) ✅
**Location**: Should be in Edge Functions

**Proposed flow**:
```typescript
// 1. Check eligibility BEFORE blockchain transaction
const eligibility = await fetch('/functions/v1/check-eligibility', {
  method: 'POST',
  body: JSON.stringify({ walletAddress, targetLevel })
});

if (!eligibility.ok) {
  // Block upgrade BEFORE spending gas
  return;
}

// 2. Proceed with blockchain transaction
// 3. Backend activation with final validation
```

**Benefits**:
- ✅ Cannot bypass validation
- ✅ Consistent rule enforcement
- ✅ Save gas on failed validations

---

### 4.3 Data Access Patterns

#### Direct Supabase Queries (Current) ⚠️
**Example from `Membership.tsx` (lines 38-59):**
```typescript
const { data: memberData } = await supabase
  .from('members')
  .select('referrer_wallet')
  .eq('wallet_address', walletAddress.toLowerCase())
  .single();
```

**Issues**:
- ⚠️ Database logic in frontend
- ⚠️ Bypasses Edge Function validation
- ⚠️ Inconsistent with architecture plan

**Recommendation**: Use Edge Functions for all data access

---

#### Edge Function Pattern (Recommended) ✅
**Should be**:
```typescript
const response = await fetch('/functions/v1/get-member-info', {
  method: 'POST',
  body: JSON.stringify({ walletAddress })
});
```

**Benefits**:
- ✅ Server-side validation
- ✅ Consistent API
- ✅ IPv4 DB access
- ✅ Easier to audit and test

---

## 5. Configuration Analysis

### 5.1 Hardcoded Values Inventory

#### CRITICAL: LEVEL_PRICING ⚠️
**File**: `src/hooks/useNFTLevelClaim.ts:6-26`
**Impact**: HIGH
**Issue**: All pricing hardcoded, cannot be changed without deployment

**Current**:
```typescript
export const LEVEL_PRICING = {
  1: 130,   // Includes 30 USDT platform fee
  2: 150,
  3: 200,
  // ... up to 19: 1000
};
```

**Should be**:
```typescript
// Fetch from platform_params table
const { data: pricing } = await supabase
  .from('platform_params')
  .select('param_value')
  .eq('param_key', 'level_pricing')
  .single();
```

---

#### Contract Addresses
**File**: `src/hooks/useMembershipNFT.ts:6`
**Status**: ✅ Correct (constants are acceptable for contracts)

```typescript
const NFT_CONTRACT_ADDRESS = "0xe57332db0B8d7e6aF8a260a4fEcfA53104728693";
```

**Issue**: None (contracts rarely change)

---

#### Default Referrer
**File**: `src/pages/Welcome.tsx:46`
**Status**: ⚠️ Should be in environment config

```typescript
const defaultReferrer = '0x3C1FF5B4BE2A1FB8c157aF55aa6450eF66D7E242';
```

**Recommendation**: Move to `.env` or `platform_params`

---

#### UI Hardcoded Values
**File**: `src/pages/Membership.tsx:346-444`
**Issue**: Membership level pricing shown in UI, but duplicates hook pricing

**Recommendation**: Use pricing from `usePlatformParams` hook

---

### 5.2 Platform Parameters (Missing) 🔴

**Required Implementation**:

#### Table Structure (needs verification)
```sql
-- platform_params table (to be confirmed)
CREATE TABLE platform_params (
  param_key TEXT PRIMARY KEY,
  param_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example data
INSERT INTO platform_params (param_key, param_value) VALUES
('level_pricing', '{"1": 130, "2": 150, "3": 200, ...}'),
('default_referrer', '"0x3C1FF5B4BE2A1FB8c157aF55aa6450eF66D7E242"'),
('level_2_min_referrals', '3');
```

#### Hook Implementation (to be created)
```typescript
// src/hooks/usePlatformParams.ts (TO CREATE)
export function usePlatformParams() {
  const [params, setParams] = useState<PlatformParams | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchParams = async () => {
      // Fetch from Edge Function (not direct Supabase)
      const response = await fetch('/functions/v1/get-platform-params');
      const data = await response.json();
      setParams(data);
    };
    fetchParams();
  }, []);

  return {
    levelPricing: params?.level_pricing || DEFAULT_PRICING,
    level2MinReferrals: params?.level_2_min_referrals || 3,
    defaultReferrer: params?.default_referrer || FALLBACK_REFERRER,
    isLoading
  };
}
```

---

## 6. Gaps and Inconsistencies

### 6.1 Critical Gaps

#### 1. No Server-Side Eligibility Checks 🔴
**Issue**: Business rules enforced client-side only
**Impact**: Can be bypassed, inconsistent validation
**Solution**: Create `check-eligibility` Edge Function

---

#### 2. Hardcoded Pricing 🔴
**Issue**: LEVEL_PRICING cannot be changed dynamically
**Impact**: Requires code deployment for price changes
**Solution**: Implement `usePlatformParams` hook

---

#### 3. Direct Database Access 🔴
**Issue**: Components query Supabase directly
**Impact**: Bypasses Edge Function validation, inconsistent with architecture
**Solution**: Route all data access through Edge Functions

---

#### 4. Missing Backend Validation 🔴
**Issue**: Edge Functions don't validate all business rules
**Impact**: Can create invalid state in database
**Solution**: Add comprehensive validation in `activate-membership` and `level-upgrade`

---

### 6.2 Medium Priority Gaps

#### 5. Component Redundancy ⚠️
**Issue**: 3 different Level 1 activation buttons
**Impact**: Maintenance burden, inconsistency
**Solution**: Consolidate to `MembershipActivationButton`

---

#### 6. Incomplete Migration ⚠️
**Issue**: New components not yet used in production pages
**Impact**: Legacy components still in use
**Solution**: Migrate `Welcome.tsx` and `Membership.tsx`

---

#### 7. No Platform Params ⚠️
**Issue**: Configuration not in database
**Impact**: Cannot change settings without deployment
**Solution**: Implement platform_params table and hooks

---

### 6.3 Low Priority Gaps

#### 8. Unused Components 🟢
**Issue**: Some components exported but never used
**Impact**: Code bloat
**Solution**: Archive after confirming no usage

---

#### 9. Test Pages in Production 🟢
**Issue**: `TestActiveButton.tsx`, `TestUpgradeMembership.tsx` in main pages folder
**Impact**: Confusion
**Solution**: Move to `src/pages/testing/` or archive

---

## 7. Recommendations Summary

### Immediate Actions (Phase 1)

1. **Verify Platform Params Table** (Day 1)
   - Query `platform_params` schema
   - Confirm data structure
   - Document expected fields

2. **Audit Edge Functions** (Day 1-2)
   - Verify `DATABASE_URL` configured
   - Check existing validation logic
   - Document what's missing

3. **Create Usage Report** (Day 1) ✅ THIS DOCUMENT

---

### Short Term (Phase 2)

4. **Create Data Contracts** (Day 3-4)
   - Document Edge Function signatures
   - Define view contracts
   - Specify business rules

5. **Design Platform Params Hook** (Day 4)
   - Define `usePlatformParams` interface
   - Specify caching strategy
   - Plan fallback logic

---

### Medium Term (Phase 3)

6. **Backend Hardening** (Day 5-9)
   - Implement `usePlatformParams` hook
   - Remove `LEVEL_PRICING` constant
   - Add server-side eligibility checks
   - Enhance Edge Function validation

7. **Frontend Migration** (Day 7-9)
   - Migrate `Welcome.tsx` to `MembershipActivationButton`
   - Migrate `Membership.tsx` to `MembershipUpgradeButton`
   - Remove legacy components

8. **Component Cleanup** (Day 10)
   - Archive unused components
   - Remove test pages or move to `/testing`
   - Update exports

---

### Long Term (Phase 4-5)

9. **Testing** (Day 11-13)
   - Test all upgrade scenarios
   - Validate server-side rules
   - Edge Function testing

10. **Rollout** (Day 14)
    - Staging deployment
    - Production deployment
    - Monitoring

---

## 8. Migration Checklist

### Page Migrations

- [ ] `src/pages/Welcome.tsx`
  - [ ] Replace `WelcomeLevel1ClaimButton` with `MembershipActivationButton`
  - [ ] Remove direct Supabase queries
  - [ ] Add server-side eligibility check
  - [ ] Test referrer validation
  - [ ] Test auto-registration

- [ ] `src/pages/Membership.tsx`
  - [ ] Replace `Level2ClaimButtonV2` with `MembershipUpgradeButton`
  - [ ] Replace `LevelUpgradeButtonGeneric` with `MembershipUpgradeButton`
  - [ ] Remove direct blockchain queries
  - [ ] Remove direct Supabase queries
  - [ ] Add server-side eligibility check
  - [ ] Simplify conditional logic
  - [ ] Test L2 referral gate
  - [ ] Test sequential upgrades

- [ ] `src/components/welcome/WelcomePage.tsx`
  - [ ] Migrate to `MembershipActivationButton`

---

### Hook Refactoring

- [ ] `src/hooks/useNFTLevelClaim.ts`
  - [ ] Create `usePlatformParams` hook
  - [ ] Fetch pricing from `platform_params`
  - [ ] Remove `LEVEL_PRICING` constant
  - [ ] Add caching layer
  - [ ] Fallback to safe defaults
  - [ ] Update all consumers

- [ ] `src/hooks/useERC20Approval.ts`
  - [ ] Audit usage
  - [ ] Consider consolidation with `useNFTClaim`

---

### Component Cleanup

- [ ] Archive unused components:
  - [ ] `ActiveMembershipClaimButton.tsx`
  - [ ] `ActiveMembershipPage.tsx`
  - [ ] `Level2ClaimButton.tsx`
  - [ ] `LevelUpgradeButtonGeneric-Fixed.tsx`
  - [ ] `LevelUpgradeButton.tsx` (if truly unused)

- [ ] Move test pages:
  - [ ] `TestActiveButton.tsx` → `src/pages/testing/`
  - [ ] `TestUpgradeMembership.tsx` → `src/pages/testing/`

---

### Backend Tasks

- [ ] Create Edge Functions:
  - [ ] `check-eligibility` - Pre-transaction validation
  - [ ] `get-platform-params` - Configuration endpoint
  - [ ] `get-member-info` - Member data (replace direct queries)

- [ ] Enhance existing Edge Functions:
  - [ ] `activate-membership` - Add full validation
  - [ ] `level-upgrade` - Add full validation
  - [ ] Both: Use `platform_params` for pricing

- [ ] Database:
  - [ ] Verify `platform_params` table exists
  - [ ] Populate initial configuration
  - [ ] Add indexes if needed

---

## 9. Testing Requirements

### Unit Tests (To Create)

- [ ] `MembershipActivationButton.test.tsx`
  - [ ] Referrer validation
  - [ ] Registration flow
  - [ ] Approval flow
  - [ ] Claim flow
  - [ ] Error handling

- [ ] `MembershipUpgradeButton.test.tsx`
  - [ ] L2 referral gate
  - [ ] Sequential upgrade
  - [ ] Approval flow
  - [ ] Claim flow
  - [ ] Error handling

- [ ] `useNFTClaim.test.ts`
  - [ ] Balance checking
  - [ ] Approval logic
  - [ ] Claim logic
  - [ ] Retry logic
  - [ ] Backend activation

- [ ] `usePlatformParams.test.ts` (to create)
  - [ ] Fetch logic
  - [ ] Caching
  - [ ] Fallback

---

### Integration Tests

- [ ] E2E Flow: New user activation
- [ ] E2E Flow: L1 → L2 upgrade (with referrals)
- [ ] E2E Flow: L2 → L3 upgrade
- [ ] E2E Flow: Sequential L3-19
- [ ] Edge Function validation
- [ ] Database consistency

---

## 10. Appendix

### Component Usage Matrix

| Component | Welcome.tsx | Membership.tsx | NFTRequiredScreen | Other | Total |
|-----------|-------------|----------------|-------------------|-------|-------|
| MembershipActivationButton | ❌ | ❌ | ✅ | ❌ | 1 |
| MembershipUpgradeButton | ❌ | ❌ | ❌ | ❌ | 0 |
| WelcomeLevel1ClaimButton | ✅ | ❌ | ❌ | ✅ | 2 |
| Level2ClaimButtonV2 | ❌ | ✅ | ❌ | ❌ | 1 |
| LevelUpgradeButtonGeneric | ❌ | ✅ | ❌ | ❌ | 1 |
| useNFTClaim (hook) | ❌ | ❌ | ✅ (via MA) | ✅ (via MA) | 2 |
| useNFTLevelClaim (hook) | ✅ | ✅ | ? | ? | 2+ |
| useMembershipNFT (hook) | ? | ? | ? | ? | ? |

**Key**:
- ✅ Used
- ❌ Not used
- ? Unknown (needs grep audit)
- MA = MembershipActivationButton

---

### Critical Files for Phase 3

**Must Refactor**:
1. `src/hooks/useNFTLevelClaim.ts` - Remove LEVEL_PRICING
2. `src/pages/Welcome.tsx` - Migrate component
3. `src/pages/Membership.tsx` - Migrate components
4. Edge Functions - Add validation

**Must Create**:
1. `src/hooks/usePlatformParams.ts` - Configuration hook
2. `supabase/functions/check-eligibility/` - Pre-validation
3. `supabase/functions/get-platform-params/` - Config endpoint
4. `docs/membership-flow-spec.md` - Data contracts

---

### Environment Variables Audit

**Currently Used**:
- ✅ `VITE_THIRDWEB_CLIENT_ID` - Thirdweb client
- ✅ `VITE_SUPABASE_URL` - Supabase URL
- ✅ `VITE_SUPABASE_ANON_KEY` - Supabase anon key

**Missing/Needed**:
- ⚠️ `DEFAULT_REFERRER` - Should be env var or platform_params
- ⚠️ `PLATFORM_FEE_PERCENT` - Should be platform_params
- ⚠️ Edge Function: `DATABASE_URL` - Needs verification

---

### Database Tables Inventory

**Used by Membership Domain**:
1. `members` - Member records (current_level, activation_time, etc.)
2. `direct_referrals` - Referral relationships (L2 gate validation)
3. `nft_membership_levels` - Level metadata
4. `rewards` - Direct reward logic
5. `matrix_slots` - Matrix placement
6. `platform_params` - Configuration (needs verification)

**Needs Documentation**:
- [ ] Schema for each table
- [ ] Required fields
- [ ] Data types (numeric(18,6) for USD, timestamptz, etc.)
- [ ] Relationships

---

**Document Control**:
- Created: 2025-10-08
- Last Updated: 2025-10-08
- Next Review: After Phase 2 completion
- Status: Complete

# Membership Components - File Structure

## 📂 New Organized Structure

```
src/components/membership/
│
├── 📁 ActiveMember/                    # ✅ Level 1 Activation
│   ├── index.ts                        # Exports
│   ├── MembershipActivationButton.tsx  # ⭐ NEW: Recommended
│   ├── WelcomeLevel1ClaimButton.tsx    # Legacy (updated with direct claim)
│   ├── ActiveMembershipClaimButton.tsx # Legacy
│   └── ActiveMembershipPage.tsx        # Page component
│
├── 📁 UpgradeLevel/                    # ✅ Level 2-19 Upgrades
│   ├── index.ts                        # Exports
│   ├── MembershipUpgradeButton.tsx     # ⭐ NEW: Recommended
│   ├── LevelUpgradeButton.tsx          # Legacy (v5 implementation)
│   ├── Level2ClaimButtonV2.tsx         # Legacy (Level 2 specific)
│   ├── Level2ClaimButton.tsx           # Legacy (Level 2 specific)
│   ├── LevelUpgradeButtonGeneric.tsx   # Legacy (generic)
│   └── LevelUpgradeButtonGeneric-Fixed.tsx # Legacy (fixed version)
│
├── 📁 core/                            # ✅ Shared Logic
│   └── NFTClaimButton.tsx              # useNFTClaim hook
│
├── 📁 _archive/                        # 🗃️ Archived Files
│   ├── Level2ClaimButtonV2_old.tsx
│   ├── LevelUpgradeButtonGeneric_old.tsx
│   ├── WelcomeLevel1ClaimButton_old.tsx
│   └── CheckoutLevel1Button_BACKUP.tsx
│
├── index.ts                            # Main export file
├── README.md                           # Usage documentation
├── STRUCTURE.md                        # This file
│
├── MembershipBadge.tsx                 # UI component
├── MultiChainNFTClaimButton.tsx        # Multi-chain support
├── MultiChainMembershipClaim.tsx       # Multi-chain support
│
└── [Test/Demo files]
    ├── ClaimButtonDemo.tsx             # Demo component
    └── Level1ClaimWithCheckout.tsx     # Checkout test
```

## 🎯 Component Organization

### Level 1 Activation (ActiveMember/)

**Purpose**: 激活 Level 1 会员资格

**Components**:
1. **MembershipActivationButton** ⭐
   - New architecture with direct claim
   - Full referrer validation
   - Auto-registration flow
   - 130 USDT

2. **WelcomeLevel1ClaimButton**
   - Updated to use direct claim
   - Legacy name kept for compatibility

3. **ActiveMembershipClaimButton**
   - Legacy component
   - May still use old methods

### Level 2-19 Upgrades (UpgradeLevel/)

**Purpose**: 升级会员等级从 Level 2 到 Level 19

**Components**:
1. **MembershipUpgradeButton** ⭐
   - New architecture with direct claim
   - Level 2: Requires 3+ direct referrals
   - Level 3-19: Sequential upgrade
   - Dynamic pricing (150-1000 USDT)

2. **LevelUpgradeButton**
   - Thirdweb v5 implementation
   - Comprehensive upgrade logic
   - Still maintained

3. **Level2ClaimButtonV2**
   - Specific for Level 2
   - Has direct referral check

4. **LevelUpgradeButtonGeneric**
   - Generic upgrade component
   - Works for all levels

### Core (core/)

**Shared Logic**:
- **useNFTClaim** hook
  - USDT balance check
  - Precise amount approve
  - Direct claimTo
  - Transaction retry
  - Backend activation

## 🔄 Migration Path

### For New Development

```tsx
// ✅ Recommended: Use new components

// Level 1 Activation
import { MembershipActivationButton } from '@/components/membership/ActiveMember';

// Level 2-19 Upgrade
import { MembershipUpgradeButton } from '@/components/membership/UpgradeLevel';
```

### For Existing Code

```tsx
// ✅ Still supported: Legacy components work

// Old imports still work via main index.ts
import {
  WelcomeLevel1ClaimButton,
  Level2ClaimButtonV2,
  LevelUpgradeButton
} from '@/components/membership';
```

## 📊 Component Comparison

| Feature | New Components | Legacy Components |
|---------|---------------|-------------------|
| Claim Method | Direct (approve + claimTo) | Various (some use CheckoutWidget) |
| Approval | Exact amount | Varies |
| Code Sharing | Shared useNFTClaim hook | Duplicated logic |
| Maintenance | Easy | Multiple versions |
| Type Safety | Full TypeScript | Partial |
| Documentation | Complete | Limited |

## 🗂️ File Categories

### ⭐ Recommended (New Architecture)
- `ActiveMember/MembershipActivationButton.tsx`
- `UpgradeLevel/MembershipUpgradeButton.tsx`
- `core/NFTClaimButton.tsx`

### ✅ Maintained (Legacy but Updated)
- `ActiveMember/WelcomeLevel1ClaimButton.tsx` - Updated to direct claim
- `UpgradeLevel/LevelUpgradeButton.tsx` - Thirdweb v5
- `UpgradeLevel/Level2ClaimButtonV2.tsx` - Level 2 specific

### 📦 Legacy (Keep for Compatibility)
- `ActiveMember/ActiveMembershipClaimButton.tsx`
- `UpgradeLevel/Level2ClaimButton.tsx`
- `UpgradeLevel/LevelUpgradeButtonGeneric.tsx`
- `UpgradeLevel/LevelUpgradeButtonGeneric-Fixed.tsx`

### 🗃️ Archived (Moved to _archive/)
- `*_old.tsx` - Old versions
- `*_BACKUP.tsx` - Backup files

### 🧪 Test/Demo
- `ClaimButtonDemo.tsx` - For testing
- `Level1ClaimWithCheckout.tsx` - Checkout test

## 📝 Import Guidelines

### Main Index (Recommended)
```tsx
// Import from main index for stability
import {
  MembershipActivationButton,
  MembershipUpgradeButton,
  useNFTClaim
} from '@/components/membership';
```

### Direct Import (Advanced)
```tsx
// Import directly from folder for specific versions
import { MembershipActivationButton } from '@/components/membership/ActiveMember';
import { MembershipUpgradeButton } from '@/components/membership/UpgradeLevel';
```

### Core Hook
```tsx
// Use the hook for custom implementations
import { useNFTClaim, NFTClaimConfig } from '@/components/membership/core/NFTClaimButton';
```

## 🧹 Cleanup Status

### ✅ Completed
- [x] Organized into ActiveMember/ and UpgradeLevel/
- [x] Archived old versions to _archive/
- [x] Created index.ts for each folder
- [x] Updated main index.ts
- [x] Created documentation

### 📋 To Consider
- [ ] Remove demo files after testing
- [ ] Deprecate old components after migration
- [ ] Add unit tests for new components
- [ ] Performance optimization

## 🔗 Related Files

### Hooks
- `src/hooks/useNFTLevelClaim.ts` - Level info and pricing
- `src/hooks/useMembershipNFT.ts` - NFT contract management
- `src/hooks/useNFTVerification.ts` - NFT ownership verification

### Services
- `src/lib/supabase.ts` - Database queries
- `src/lib/thirdwebClient.ts` - Web3 client

### Backend
- `supabase/functions/mint-and-send-nft/` - Level 1 activation
- `supabase/functions/level-upgrade/` - Level 2-19 upgrade
- `supabase/functions/activate-membership/` - Membership activation

## 📚 Documentation

- [README.md](./README.md) - Complete usage guide
- [MEMBERSHIP_REFACTOR_SUMMARY.md](../../MEMBERSHIP_REFACTOR_SUMMARY.md) - Refactor summary
- This file (STRUCTURE.md) - File organization

## 🎯 Quick Reference

### Level Rules

| Level | Requirements | Price (USDT) | Component Folder |
|-------|-------------|--------------|------------------|
| 1     | Valid referrer | 130 | ActiveMember/ |
| 2     | 3+ direct referrals | 150 | UpgradeLevel/ |
| 3-19  | Sequential upgrade | 200-1000 | UpgradeLevel/ |

### Contracts

```typescript
// Arbitrum Mainnet (Chain ID: 42161)
USDT: 0x6B174f1f3B7f92E048f0f15FD2b22c167DA6F008
NFT:  0xe57332db0B8d7e6aF8a260a4fEcfA53104728693
```

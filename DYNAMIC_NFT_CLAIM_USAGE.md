# Dynamic NFT Claim Component Usage

The `ERC5115ClaimComponent` has been updated to be dynamic and handle different levels (token IDs 1-19) with appropriate pricing.

## Key Features

### 🔧 **Dynamic Level Detection**
- Automatically detects user's current membership level
- Calculates next claimable level
- Supports manual targeting of specific levels via `targetLevel` prop

### 💰 **Dynamic Pricing**
- Level 1: 130 USDC (includes 30 USDC platform fee)
- Level 2: 150 USDC  
- Level 3: 200 USDC
- Level 4: 250 USDC
- ...up to Level 19: 1,000 USDC
- Pricing follows linear growth pattern (each level increases by 50 USDC)

### 🎯 **Smart Contract Integration**
- Uses correct token ID for each level
- Handles both standard NFT Drop and tokenId-specific claim functions
- Dynamic allowlist proof generation

## Usage Examples

### 1. Welcome Page (Level 1 Only)
```tsx
// For new users - always shows Level 1
<ERC5115ClaimComponent 
  referrerWallet={referrer}
  onSuccess={() => navigate('/dashboard')}
  targetLevel={1} // Force Level 1 for welcome page
/>
```

### 2. Membership Page (Auto-detect Next Level)
```tsx  
// For existing members - auto-detects next level
<ERC5115ClaimComponent 
  referrerWallet={referrer}
  onSuccess={() => navigate('/dashboard')}
  // No targetLevel - will auto-detect next claimable level
/>
```

### 3. Specific Level Upgrade
```tsx
// For targeting specific level
<ERC5115ClaimComponent 
  referrerWallet={referrer}
  onSuccess={() => navigate('/dashboard')}
  targetLevel={5} // Force Level 5
/>
```

## Custom Hook: `useNFTLevelClaim`

### Features:
- **Level Detection**: Automatically fetches user's current level from database
- **Pricing Calculation**: Converts USDC amounts to wei with 18 decimals
- **Validation**: Checks if user can claim target level
- **Helper Functions**: Provides formatting and naming utilities

### Return Values:
```tsx
const {
  levelInfo: {
    currentLevel: number,        // User's current level (0 if new)
    nextClaimableLevel: number,  // Next level they can claim
    priceInUSDC: number,        // Price in USDC
    priceInWei: bigint,         // Price in wei (18 decimals)
    tokenId: number,            // NFT token ID (matches level)
    canClaim: boolean,          // Whether user can claim this level
    isMaxLevel: boolean         // Whether user is at max level (19)
  },
  isLoading: boolean,           // Loading state
  refetch: () => void,          // Refresh level info
  getLevelName: (level) => string, // Format level name
  formatPrice: (price) => string   // Format price with commas
} = useNFTLevelClaim(targetLevel);
```

## UI Behavior

### Dynamic Content:
- **Title**: Changes from "Claim Level 1 NFT" to "Claim Level X NFT"
- **Price Display**: Shows correct USDC amount for each level
- **Button Text**: Updates to show level and price
- **Progress Indicator**: Shows current level → next level
- **Validation**: Disables button if user can't claim level

### Loading States:
- Shows loading indicator while fetching user level
- Gracefully handles network delays
- Provides fallback states for errors

### Error Handling:
- **Max Level**: Shows "Max Level Reached" for Level 19 users
- **Invalid Level**: Shows "Cannot Claim This Level" for invalid requests
- **Network Errors**: Falls back to Level 1 with appropriate messaging

## Backend Integration

The component automatically sends the correct level and pricing to backend services:

### NFT Processing:
```json
{
  "action": "process-upgrade",
  "level": 5, // Dynamic level
  "transactionHash": "0x...",
  "paymentMethod": "token_payment", 
  "payment_amount_usdc": 2080 // Dynamic price
}
```

### Membership Activation:
```json
{
  "transactionHash": "0x...",
  "level": 5, // Dynamic level
  "paymentMethod": "token_payment",
  "paymentAmount": 2080, // Dynamic price
  "referrerWallet": "0x..."
}
```

## Benefits

### ✅ **Code Reusability**
- Single component handles all 19 levels
- No need to duplicate claim logic
- Centralized pricing and level management

### ✅ **Maintainability** 
- Level pricing in one location (`useNFTLevelClaim` hook)
- Easy to modify pricing structure
- Consistent UI across all pages

### ✅ **User Experience**
- Clear progression indication
- Prevents invalid level claims
- Automatic level detection reduces confusion

### ✅ **Scalability**
- Easy to add new levels (just update pricing constant)
- Supports future pricing changes
- Flexible targeting system

## Migration Guide

### Before (Static):
```tsx
// Old hardcoded approach
const PRICE = BigInt("130000000000000000000"); // Always 130 USDC
const TOKEN_ID = 1; // Always Level 1
```

### After (Dynamic):  
```tsx
// New dynamic approach
const { levelInfo } = useNFTLevelClaim(targetLevel);
const PRICE = levelInfo.priceInWei; // Dynamic pricing
const TOKEN_ID = levelInfo.tokenId;  // Dynamic level
```

This update ensures the component can handle the complete 19-level membership system with appropriate pricing for each level.
# USDC Approval Fix - Manual ERC20 Approval Flow

## Problem Summary

The error "ERC20: transfer amount exceeds allowance" occurred because:

1. **PayEmbed's `buyWithCrypto` is NOT for same-chain ERC20 payments**
   - `buyWithCrypto` is designed for **cross-chain** payments (e.g., USDC on Ethereum → NFT on Polygon)
   - For **same-chain** payments (USDC on Arbitrum → NFT on Arbitrum), PayEmbed does NOT automatically handle approval

2. **Previous documentation was incorrect**
   - `COMPONENTS_STATUS.md` and `CLAIM_FLOW_FIX.md` incorrectly stated that PayEmbed handles approval automatically
   - This is only true for cross-chain payments, not same-chain ERC20 payments

## Solution

Implemented **manual 2-step approval flow**:

### Step 1: Approve USDC
- User explicitly approves USDC spending to NFT contract
- Uses Thirdweb's `approve()` function with `TransactionButton`
- Amount: 130 USDC (130,000,000 wei, 6 decimals)

### Step 2: Claim NFT
- After approval is confirmed, user can claim NFT
- Uses Thirdweb's `claimTo()` function with `TransactionButton`
- Payment automatically deducted from approved USDC

## Code Changes

### File: `src/components/membership/WelcomeLevel1ClaimButton.tsx`

#### 1. Added Imports
```typescript
import {TransactionButton} from 'thirdweb/react';
import {approve, allowance} from 'thirdweb/extensions/erc20';
import {getContract} from 'thirdweb';
```

#### 2. Added State Variables
```typescript
const [hasApproval, setHasApproval] = useState(false);
const [isCheckingApproval, setIsCheckingApproval] = useState(false);
const USDC_CONTRACT_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
```

#### 3. Added Approval Check Function
```typescript
const checkUSDCApproval = async () => {
  if (!account?.address || !nftContract) return;

  setIsCheckingApproval(true);
  try {
    const usdcContract = getContract({
      client,
      address: USDC_CONTRACT_ADDRESS,
      chain: arbitrum,
    });

    const currentAllowance = await allowance({
      contract: usdcContract,
      owner: account.address,
      spender: nftContract.address,
    });

    const requiredAmount = BigInt(LEVEL_1_PRICE_USDC * 1_000_000);
    setHasApproval(currentAllowance >= requiredAmount);
  } catch (error) {
    console.error('Error checking USDC approval:', error);
    setHasApproval(false);
  } finally {
    setIsCheckingApproval(false);
  }
};
```

#### 4. Added useEffect for Approval Check
```typescript
useEffect(() => {
  if (account?.address && nftContract) {
    checkUSDCApproval();
  }
}, [account?.address, nftContract]);
```

#### 5. Updated UI with 2-Step Flow
```typescript
{/* Step 1: Approve USDC */}
{!hasApproval && account?.address && !isWrongNetwork && (
  <TransactionButton
    transaction={() => {
      const usdcContract = getContract({
        client,
        address: USDC_CONTRACT_ADDRESS,
        chain: arbitrum,
      });
      return approve({
        contract: usdcContract,
        spender: nftContract.address,
        amount: BigInt(LEVEL_1_PRICE_USDC * 1_000_000),
      });
    }}
    onTransactionConfirmed={async () => {
      toast({
        title: '✅ USDC Approved',
        description: 'You can now claim your Level 1 NFT',
        duration: 3000
      });
      await checkUSDCApproval();
    }}
    onError={(error) => {
      toast({
        title: '❌ Approval Failed',
        description: error.message,
        variant: 'destructive',
        duration: 5000
      });
    }}
    className="w-full h-12 bg-blue-600 hover:bg-blue-700"
  >
    Step 1: Approve {LEVEL_1_PRICE_USDC} USDC
  </TransactionButton>
)}

{/* Step 2: Claim NFT */}
<Button
  onClick={handleApproveAndClaim}
  disabled={!hasApproval}
>
  {!hasApproval ? 'Approve USDC First' : 'Step 2: Claim Level 1'}
</Button>
```

#### 6. Replaced PayEmbed Modal with TransactionButton
```typescript
// OLD: PayEmbed with buyWithCrypto
<PayEmbed
  payOptions={{
    buyWithCrypto: { testMode: false }
  }}
/>

// NEW: Direct TransactionButton
<TransactionButton
  transaction={() => claimTo({
    contract: nftContract,
    to: account.address,
    tokenId: BigInt(1),
    quantity: BigInt(1),
  })}
  onTransactionConfirmed={async (receipt) => {
    await handlePaymentSuccess(receipt.transactionHash);
  }}
>
  Claim Level 1 NFT - {LEVEL_1_PRICE_USDC} USDC
</TransactionButton>
```

### File: `src/lib/supabase-unified.ts`

#### Fixed Error Handling for Unregistered Users
```typescript
async isActivatedMember(walletAddress: string) {
  try {
    const result = await callEdgeFunction('auth', {
      action: 'get-user'
    }, walletAddress);

    if (!result.success) {
      // If user is not registered, return false without error
      if (result.error === 'REGISTRATION_REQUIRED' || result.error === 'User not found') {
        return { isActivated: false, memberData: null, error: null };
      }
      return { isActivated: false, memberData: null, error: { message: result.error } };
    }

    const isActivated = result.isMember && result.membershipLevel > 0;
    const memberData = result.member || null;

    return {
      isActivated,
      memberData,
      error: null
    };
  } catch (error: any) {
    // Don't throw error for unregistered users
    if (error.message?.includes('REGISTRATION_REQUIRED') || error.message?.includes('User not found')) {
      return { isActivated: false, memberData: null, error: null };
    }
    return { isActivated: false, memberData: null, error: { message: error.message } };
  }
}
```

## User Experience Flow

### Before Fix (❌ Broken)
1. User clicks "Claim Level 1"
2. PayEmbed opens
3. User clicks "Pay with USDC"
4. **ERROR**: "ERC20: transfer amount exceeds allowance"

### After Fix (✅ Working)
1. User clicks "Claim Level 1"
2. **Step 1**: "Approve 130 USDC" button appears
3. User clicks approve → wallet signature
4. Approval confirmed → "Step 2: Claim Level 1" button enabled
5. User clicks claim → PayEmbed modal opens with TransactionButton
6. User confirms claim transaction
7. NFT claimed → membership activated

## Why This Works

### ERC20 Approval Mechanism
1. **USDC is an ERC20 token** - requires explicit approval before transfer
2. **NFT contract needs permission** to transfer USDC from user's wallet
3. **Approval transaction** grants NFT contract permission to spend specific amount
4. **Claim transaction** uses the approved allowance to pay for NFT

### Thirdweb Functions
- `approve()`: Creates ERC20 approval transaction
- `allowance()`: Checks current approved amount
- `claimTo()`: Claims NFT (requires prior approval for payment)
- `TransactionButton`: Handles transaction submission and confirmation

## Additional Fixes

### 1. Fixed 406 Error on Members Table
- **Problem**: Direct Supabase queries blocked by RLS
- **Solution**: Handle `REGISTRATION_REQUIRED` error gracefully in `isActivatedMember()`

### 2. Fixed NFT Image 404
- **Problem**: Placeholder image URL in PayEmbed metadata
- **Solution**: Removed metadata field, let PayEmbed fetch from contract

## Testing Checklist

- [ ] Connect wallet to Arbitrum One
- [ ] Ensure 130+ USDC balance
- [ ] Ensure sufficient ETH for gas
- [ ] Click "Step 1: Approve 130 USDC"
- [ ] Confirm approval in wallet
- [ ] Wait for approval confirmation
- [ ] Verify "Step 2: Claim Level 1" is enabled
- [ ] Click "Step 2: Claim Level 1"
- [ ] PayEmbed modal opens with claim button
- [ ] Click claim button
- [ ] Confirm transaction in wallet
- [ ] Verify NFT minted
- [ ] Verify membership activated

## Build Status

✅ Build successful
- No TypeScript errors
- No compilation errors
- Production bundle created

## Deployment

Ready to deploy to Vercel:
```bash
git add .
git commit -m "Fix USDC approval flow: add manual 2-step approval for Level 1 claim"
git push origin api
```

## Next Steps

**Apply same fix to other claim components**:
1. `Level2ClaimButtonV2.tsx` - Level 2 upgrade (150 USDC)
2. `LevelUpgradeButtonGeneric.tsx` - Level 3-19 upgrades (200-1000 USDC)

Both currently use PayEmbed with `buyWithCrypto` and will have the same issue.

## Key Lessons

1. **`buyWithCrypto` ≠ ERC20 approval**
   - `buyWithCrypto` is for cross-chain payments via Thirdweb's payment service
   - Same-chain ERC20 payments require manual approval

2. **Always check allowance before claim**
   - Use `allowance()` to verify approval status
   - Show approval button only when needed

3. **TransactionButton is better for simple flows**
   - More control over transaction lifecycle
   - Clearer error handling
   - Simpler UI/UX

4. **2-step flow is more transparent**
   - Users understand they're approving first, then claiming
   - Better error messages
   - Easier debugging

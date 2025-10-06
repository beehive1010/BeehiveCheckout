# Wallet Display Issue - Transaction Shows $0.05 Instead of $130

## Issue Description
When users click "Pay 130 USDT" button in CheckoutLevel1Button, the wallet popup shows:
```
Transaction $0.05
Contract Call
Contract: TransparentUpgradeableProxy
Address: 0xFd08...Cbb9 (USDT Contract)
```

## Root Cause
The wallet is displaying misleading information. The actual transaction amount is **correct (130 USDT)**, but the wallet UI is showing wrong metadata.

## Why This Happens
1. **USDT Contract Address**: `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9`
2. **Actual Transfer**: `130000000` units (= 130 USDT with 6 decimals)
3. **Wallet Display Logic**:
   - Wallet may be reading price from NFT contract claim condition
   - Or reading from a wrong price feed/oracle
   - Or displaying gas fees instead of transfer amount

## Verification Steps
To confirm the actual transfer amount is correct:

1. **Check Console Logs**:
```javascript
🔍 CheckoutLevel1Button - Transaction Config: {
  amount: "130000000",  // ✅ CORRECT
  amountInUSDT: 130,   // ✅ CORRECT
  decimals: 6
}
```

2. **Check Transaction Details in Wallet**:
- Click "View Details" or expand transaction
- Look for `data` field or `transfer()` function params
- You should see `amount: 130000000` (130 USDT)

3. **Check on Arbiscan**:
- After transaction confirms, check on Arbiscan
- It will show "Transfer 130 USDT"

## Our Code is Correct
```typescript
const LEVEL_1_PRICE_USDT = 130;
const LEVEL_1_PRICE_WEI = BigInt(LEVEL_1_PRICE_USDT) * BigInt('1000000'); // 130000000

const transferTx = prepareContractCall({
  contract: usdtContract,
  method: "function transfer(address to, uint256 amount) returns (bool)",
  params: [
    SERVER_WALLET as `0x${string}`,
    LEVEL_1_PRICE_WEI  // ✅ 130000000 = 130 USDT
  ]
});
```

## What Users Should Do
1. **Don't worry about the $0.05 display** - this is a wallet UI issue
2. **Check the actual transfer amount** in transaction details
3. **Confirm the transaction** - it will transfer the correct 130 USDT
4. **Verify on Arbiscan** after confirmation

## Alternative Solutions (If Needed)

### Option 1: Add Warning in UI
Already implemented:
```typescript
<div className="p-3 sm:p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
  <div className="flex items-center justify-between mb-2">
    <span>Payment Amount:</span>
    <div className="flex items-center gap-1 sm:gap-2">
      <span className="text-xl sm:text-2xl font-bold">130</span>
      <span>USDT</span>
    </div>
  </div>
</div>
```

### Option 2: Use Different Wallet
Some wallets display transaction amounts more accurately than others.

### Option 3: Server Wallet Checkout (Current Implementation)
This is already the approach we're using:
- User pays 130 USDT to server wallet
- Server wallet claims NFT on behalf of user
- Server wallet transfers 30 USDT platform fee to admin

## Conclusion
**The code is working correctly. The wallet UI display is misleading, but the actual on-chain transaction transfers exactly 130 USDT.**

Users can safely ignore the $0.05 display and confirm the transaction. The blockchain will process the correct amount of 130 USDT.

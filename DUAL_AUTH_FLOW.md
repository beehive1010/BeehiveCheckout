# Beehive Platform - Dual Authentication Flow

## Overview
Your platform uses a **dual authentication system** where users need both wallet connection AND Supabase authentication before accessing member areas.

## Authentication Flow

### Step 1: User Connects Wallet
- User visits site (optionally with referral URL: `?ref=0x...`)
- User clicks "Connect Wallet" and selects wallet type:
  - MetaMask (`io.metamask`)
  - WalletConnect (`walletConnect`)
  - Coinbase Wallet (`com.coinbase.wallet`)
- System records wallet address + referrer from URL

### Step 2: User Completes Supabase Auth
- User fills out registration form (email/username)
- User signs up/signs in with traditional Supabase Auth
- System creates user record linking wallet address to Supabase user

### Step 3: Authentication Check
- System verifies both conditions:
  - ✅ Wallet connected (`isConnected`)
  - ✅ Supabase authenticated (`isSupabaseAuthenticated`)

### Step 4: Membership Check & Routing
- If both authenticated → Check membership status
- **Is Member** (`isMember: true`) → Redirect to `/dashboard`
- **Not Member** (`isMember: false`) → Redirect to `/welcome` (claim membership)

## Key Components

### Web3Context Properties
```typescript
{
  // Wallet connection
  isConnected: boolean
  walletAddress: string | null
  connectWallet: (type) => Promise<void>
  
  // Supabase authentication  
  isSupabaseAuthenticated: boolean
  supabaseUser: any
  
  // Membership & referrals
  isMember: boolean
  referrerWallet: string | null
  
  // Actions
  recordWalletConnection: () => Promise<void>
  checkMembershipStatus: () => Promise<void>
}
```

### Authentication States
1. **Not Connected**: User needs to connect wallet
2. **Wallet Only**: User has wallet but needs Supabase auth
3. **Auth Only**: User has Supabase auth but needs wallet
4. **Fully Authenticated**: Both wallet + Supabase auth complete
5. **Member**: Fully authenticated + has active membership
6. **Non-Member**: Fully authenticated but needs to claim membership

## Usage Example

```typescript
const { 
  isConnected, 
  isSupabaseAuthenticated, 
  isMember, 
  connectWallet 
} = useWeb3()

// Connect wallet first
await connectWallet('metamask')

// User completes Supabase auth separately
// Then system automatically checks membership and routes appropriately
```

## URL Parameters
- **Referral**: `?ref=0x1234...` - Captures referrer wallet address
- System automatically parses and stores referrer when wallet connects

## Routing Logic
- **Landing page** (`/`): Public access
- **Dashboard** (`/dashboard`): Requires both auth + membership
- **Welcome** (`/welcome`): Requires both auth, allows membership claiming
- **Admin** (`/admin/*`): Separate admin authentication (no wallet required)

This flow ensures users complete both wallet connection AND traditional registration before accessing member features.
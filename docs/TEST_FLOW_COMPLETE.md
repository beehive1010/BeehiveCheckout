# Complete BEEHIVE V2 Test Flow

## Overview
Comprehensive test flow covering: Auth → Welcome → Membership → Referrals → Rewards → User_balance → BCC system → Layer_rewards → Withdraw

## Current System Architecture Analysis

### Database Schema Summary
- **user_balances**: BCC balance tracking with locked/unlocked states
- **bcc_release_logs**: 72-hour release cycle tracking  
- **layer_rewards**: Claimable/pending rewards with countdown timers
- **reward_timers**: 72-hour countdown system for reward releases

### Key Components
1. **BCC Balance System**
   - `bcc_balance`: Current available BCC
   - `bcc_locked`: Locked BCC awaiting 72-hour release
   - `bcc_total_unlocked`: Total BCC unlocked to date
   - `bcc_used`: BCC spent on courses/features

2. **Layer Rewards System**  
   - `status`: 'claimable', 'pending', 'claimed'
   - `expires_at`: 72-hour expiration timer
   - `reward_amount`: USDC reward amount

3. **Withdrawal System**
   - `withdraw_member_rewards()`: Database function for withdrawals
   - `reward_balance`: Available for withdrawal
   - `total_withdrawn`: Withdrawal history

## Test Flow Implementation

### 1. Authentication Flow
```
User connects wallet → thirdweb authentication → User registration
✓ Test wallet connection
✓ Test user creation in 'users' table
✓ Test referrer_wallet assignment from URL
```

### 2. Welcome & Level 1 Claiming
```
New user → Level 1 NFT claim → Member activation
✓ Test NFT claiming process
✓ Test member record creation
✓ Test initial BCC allocation (1000 BCC locked)
✓ Test activation_sequence assignment
```

### 3. Membership Progression
```
Level 1 → Level 2 (3+ direct referrals) → Level 3+ progression
✓ Test direct referral counting (referrals_new table)
✓ Test level upgrade requirements
✓ Test BCC unlock on level progression
✓ Test matrix placement on upgrades
```

### 4. Referrals System
```
Generate referral link → New user registration → Matrix placement
✓ Test referral URL generation  
✓ Test referrals_new table population
✓ Test matrix_referrals tree placement
✓ Test BFS (Breadth-First Search) placement algorithm
```

### 5. Rewards System
```
Member upgrades → Layer rewards triggered → 72-hour countdown → Claimable
✓ Test layer reward generation on upgrades
✓ Test reward_timers creation (72-hour countdown)
✓ Test status transitions: pending → claimable → claimed
✓ Test roll-up rewards for unqualified recipients
```

### 6. User Balance Management
```
BCC System: Locked → 72hr countdown → Available → Spendable
✓ Test bcc_locked initial allocation
✓ Test 72-hour release cycles via bcc_release_logs
✓ Test BCC unlocking on level progression
✓ Test BCC spending on courses/features
```

### 7. Layer Rewards Flow
```
Trigger event → Pending (72hr) → Claimable → Withdrawal
✓ Test reward creation with pending status
✓ Test 72-hour countdown timer functionality  
✓ Test automatic status change to claimable
✓ Test reward claiming process
✓ Test balance sync to user_balances.reward_balance
```

### 8. Withdrawal System
```
Claimable rewards → Withdrawal request → Balance deduction → External transfer
✓ Test withdraw_member_rewards() function
✓ Test balance validation before withdrawal
✓ Test withdrawal history tracking
✓ Test remaining balance calculations
```

## Implementation Tasks

### A. Frontend Components Required

#### 1. BCC Balance Display Component
```typescript
interface BCCBalanceProps {
  walletAddress: string;
}

// Display: Available BCC | Locked BCC | Release Countdown
```

#### 2. Countdown Timer Component  
```typescript
interface CountdownTimerProps {
  targetDate: string;
  onComplete: () => void;
}

// 72-hour countdown for both BCC releases and reward claims
```

#### 3. Withdrawal Component
```typescript
interface WithdrawalProps {
  availableBalance: number;
  onWithdraw: (amount: number) => Promise<void>;
}

// Withdrawal interface with balance validation
```

### B. Backend API Functions Required

#### 1. BCC Management APIs
```typescript
// Get BCC balance breakdown
GET /api/bcc/balance/:walletAddress

// Process BCC release (72-hour cycles)  
POST /api/bcc/process-release

// Unlock BCC on level progression
POST /api/bcc/unlock-for-level
```

#### 2. Rewards Management APIs
```typescript
// Get reward status with countdown
GET /api/rewards/status/:walletAddress

// Claim available rewards
POST /api/rewards/claim

// Process expired rewards (rollup)
POST /api/rewards/process-expired
```

#### 3. Withdrawal APIs
```typescript
// Request withdrawal
POST /api/withdraw/request

// Get withdrawal history
GET /api/withdraw/history/:walletAddress

// Validate withdrawal amount
POST /api/withdraw/validate
```

### C. Database Functions Enhancement

#### 1. BCC Release Automation
```sql
-- Function to process 72-hour BCC releases
CREATE OR REPLACE FUNCTION process_bcc_releases()
RETURNS JSON;

-- Scheduled job to run every hour
```

#### 2. Reward Timer Processing
```sql
-- Function to update reward statuses based on timers
CREATE OR REPLACE FUNCTION process_reward_timers() 
RETURNS JSON;

-- Auto-expire and rollup unqualified rewards
```

#### 3. Enhanced Withdrawal Function
```sql
-- Current: withdraw_member_rewards(wallet, amount)
-- Enhancement: Add validation, history tracking, balance sync
```

## Test Scenarios

### Scenario 1: New User Complete Flow
1. Connect wallet → Register with referrer
2. Claim Level 1 NFT → Receive 1000 locked BCC
3. Refer 3+ users → Qualify for Level 2
4. Upgrade to Level 2 → Unlock portion of BCC
5. Generate layer rewards → Start 72hr countdown
6. Claim rewards → Transfer to withdrawal balance
7. Request withdrawal → Process external transfer

### Scenario 2: Matrix Overflow Testing
1. Fill matrix positions at capacity
2. Test BFS placement for overflow users
3. Verify layer reward distributions
4. Test roll-up for unqualified recipients

### Scenario 3: Timer System Testing  
1. Create rewards with 72-hour timers
2. Fast-forward time (test environment)
3. Verify automatic status transitions
4. Test expired reward roll-up process

### Scenario 4: BCC Release Cycles
1. Member with locked BCC balance
2. Trigger 72-hour release cycle
3. Verify gradual BCC unlocking
4. Test spending and balance updates

## Success Metrics

✅ **Authentication**: 100% wallet connection success  
✅ **Registration**: Complete user/member record creation  
✅ **Referrals**: Accurate counting and matrix placement  
✅ **Rewards**: Timely generation and countdown accuracy  
✅ **BCC System**: Correct locking/unlocking mechanics  
✅ **Withdrawals**: Secure and accurate balance management  
✅ **Timers**: Precise 72-hour countdown functionality  
✅ **Data Integrity**: All transactions properly logged  

## Current Status: READY FOR IMPLEMENTATION

All database schema, views, and core functions are in place.
Frontend components need BCC/withdrawal integration.
API endpoints require timer and automation features.
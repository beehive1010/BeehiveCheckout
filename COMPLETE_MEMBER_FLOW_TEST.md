# Complete Member Activation & Upgrade Flow Test Documentation

## Overview
This document provides a comprehensive test plan for the entire member journey from wallet connection to Level 19 upgrade, including all payment callbacks, database records, referral tracking, matrix placement, reward triggers, and BCC release system.

---

## Test Flow Architecture

### Flow 1: New Member Activation (Level 1)
```
Wallet Connect → Welcome Page → Claim Membership NFT → Checkout Component →
Payment Callback → Platform Fee Distribution → Members Record → Referrals Record →
Matrix Placement → Direct Reward Trigger → Reward Rules Check → BCC Initialization →
User Balance Sync
```

### Flow 2: Level 2 Upgrade
```
Membership Page → Upgrade to Level 2 → Checkout Component → Payment Callback →
Membership Record → Members Level Update → Layer Reward 2 Trigger → Matrix Root Reward →
Reward Rules & Status Check → User Balance Sync → BCC Release Trigger →
BCC Release Log → Balance Update
```

### Flow 3: Level 3-19 Upgrades
```
Membership Page → Upgrade to Level X → Checkout Component → Payment Callback →
Membership Record → Members Level Update → Layer Reward X Trigger → Matrix Root Rewards →
Reward Rules & Status Check → User Balance Sync → BCC Release Trigger →
BCC Release Log → Balance Update
```

---

## Detailed Test Cases

## 1. WALLET CONNECTION & REGISTRATION

### 1.1 Wallet Connection
**Component:** `WalletConnect` / Thirdweb SDK
**Location:** `src/components/` or `src/lib/`

#### Test Steps:
1. [ ] User clicks "Connect Wallet" button
2. [ ] Thirdweb modal appears with wallet options
3. [ ] User selects wallet (MetaMask/WalletConnect/Coinbase etc.)
4. [ ] Wallet connection succeeds
5. [ ] User address is stored in session/state

#### Verification:
- [ ] `walletAddress` is captured correctly
- [ ] User session is created
- [ ] Referrer addresss from URL is stored in seesion/state
- [ ] Redirect logic works based on member status

#### Expected Database State:
```sql
-- No database changes yet (just connection)
```

---

### 1.2 New User Welcome Page
**Component:** `WelcomePage` / `WelcomeLevel1ClaimButton`
**Location:** `src/pages/Welcome.tsx` or similar

#### Test Steps:
1. [ ] New user (no membership) is redirected to Welcome page
2. [ ] Welcome page displays Level 1 membership offer
3. [ ] Price displayed correctly ($100 for Level 1)
4. [ ] User clicks "Claim Membership" button

#### Verification:
- [ ] Check membership status query to database
- [ ] Correct price display based on level configuration

#### Expected Query:
```sql
SELECT * FROM members WHERE LOWER(wallet_address) = LOWER('user_wallet');
-- Should return NULL for new user
```

---

## 2. LEVEL 1 ACTIVATION FLOW

### 2.1 Checkout Component - Level 1
**Component:** `CheckoutComponent`
**Location:** `src/components/CheckoutComponent.tsx` or similar

#### Test Steps:
1. [ ] Checkout modal opens with Level 1 details
2. [ ] Price: $130 USD displayed
3. [ ] Payment method selection (USDT)
4. [ ] User confirms payment
5. [ ] Transaction is broadcasted
6. [ ] Transaction hash is captured

#### Verification:
- [ ] Checkout uses correct contract address
- [ ] Correct payment amount (130 USDT/USDC)
- [ ] Transfer to Server Wallet
- [ ] Transaction confirmation received

#### Expected State:
```javascript
{
  level: 1,
  price: 100,
  txHash: "0x...",
  status: "pending"
}
```

---

### 2.2 Payment Callback Handler
**Edge Function:** `thirdweb-webhook` or `check-transfer-status`
**Location:** `supabase/functions/thirdweb-webhook/index.ts` or 'supabase/functions/check-transfer-status'

#### Test Steps:
1. [ ] Payment callback is triggered by Thirdweb/contract event
2. [ ] Transaction verification occurs
3. [ ] Payment status confirmed on blockchain
4. [ ] Server Wallet Claim membership NFT token id 1 to wallet_address
5. [ ] Comfirm Claimed to members
6. [ ] Record Membership to table 'membership'

#### Verification:
- [ ] Edge function receives correct payload
- [ ] Transaction hash is verified on-chain
- [ ] Payment amount matches expected price
- [ ] Record membership table

#### Expected Payload:
```json
{
  "walletAddress": "0x...",
  "level": 1,
  "txHash": "0x...",
  "amount": 130,
  "currency": "USDT"
}
```

---

### 2.3 Platform Fee Distribution
**Database:** `platform_fees` table or treasury logic
**Trigger:** After payment confirmation

#### Test Steps:
1. [ ] Platform fee (e.g., 30USDT) is calculated from $130
2. [ ] Fee is recorded in platform_fees table
3. [ ] Remaining amount allocated for rewards
4. [ ] Transfer to Admin Adress：0x0bA198F73DF3A1374a49Acb2c293ccA20e150Fe0

#### Expected Database State:
```sql
-- Check platform fees record
SELECT * FROM platform_fees
WHERE wallet_address = LOWER('user_wallet')
AND level = 1
ORDER BY created_at DESC LIMIT 1;


```

---

### 2.4 Members Record Creation
**Table:** `members`
**Trigger:** After payment verification

#### Test Steps:
1. [ ] New member record is created in `members` table
2. [ ] `activation_sequence` is assigned (auto-increment)
3. [ ] `current_level` = 1
4. [ ] `levels_owned` = '{1}'
5. [ ] `referrer_wallet` is set (or default referrer)

#### Expected Database State:
```sql
SELECT
  wallet_address,
  activation_sequence,
  current_level,
  levels_owned,
  referrer_wallet,
  created_at
FROM members
WHERE LOWER(wallet_address) = LOWER('user_wallet');

-- Expected:
-- activation_sequence: <next_sequence_number>
-- current_level: 1
-- levels_owned: {1}
-- referrer_wallet: <referrer_or_default>
-- created_at: <timestamp>
```

---

### 2.5 Referrals Record
**Table:** `referrals`
**Trigger:** After member creation

#### Test Steps:
1. [ ] Referral relationship is recorded
2. [ ] `referrer_wallet` → `referred_wallet` connection created
3. [ ] `level_purchased` = 1

#### Expected Database State:
```sql
SELECT
  referrer_wallet,
  referred_wallet,
  level_purchased,
  created_at
FROM referrals
WHERE LOWER(referred_wallet) = LOWER('user_wallet');

-- Expected:
-- referrer_wallet: <referrer_address>
-- referred_wallet: <user_wallet>
-- level_purchased: 1
```

---

### 2.6 Matrix Placement
**Table:** `matrix_referrals`
**Function:** `fn_place_in_matrix()` or Edge Function

#### Test Steps:
1. [ ] BFS algorithm finds placement slot
2. [ ] Member placed under appropriate `matrix_root`
3. [ ] Layer and position (L/M/R) calculated
4. [ ] `slot_num_seq` assigned

#### Expected Database State:
```sql
SELECT
  wallet_address,
  matrix_root,
  layer,
  position,
  slot_num_seq,
  path,
  created_at
FROM matrix_referrals
WHERE LOWER(wallet_address) = LOWER('user_wallet');

-- Expected:
-- matrix_root: <parent_matrix_root>
-- layer: <calculated_layer>
-- position: 'L' or 'M' or 'R'
-- slot_num_seq: <sequence_number>
-- path: <hierarchical_path>
```

---

### 2.7 Direct Reward Trigger
**Table:** `direct_rewards`
**Trigger:** After referral creation

#### Test Steps:
1. [ ] Direct reward calculated for referrer
2. [ ] Reward amount based on level (e.g., Level 1 = $10)
3. [ ] Gate check: referrer must own Level 1
4. [ ] Status: `claimable` or `pending`

#### Expected Database State:
```sql
SELECT
  root_wallet,
  referral_wallet,
  nft_level,
  reward_usdt,
  status,
  created_at
FROM direct_rewards
WHERE LOWER(referral_wallet) = LOWER('user_wallet');

-- Expected:
-- root_wallet: <referrer_wallet>
-- referral_wallet: <user_wallet>
-- nft_level: 1
-- reward_usdt: <level_1_direct_reward>
-- status: 'claimable' or 'pending' (based on gate)
```

---

### 2.8 Reward Rules & Status Check

#### Gate Rules:
1. **Level Gate:** Referrer must own the level to receive reward(1st&2nd Direct rewards, 3rd+ must upgrade to level 2+)
2. **Timer Gate:** Some rewards have time restrictions
3. **Pending → Claimable:** When referrer upgrades to required level
4. Claimable- sync + user_balance table 
5. pending - record to rewards_timer -tigger countdown timer -supabase/functions: cron-timers
6. Check Upgrade level tigger pending reward -claimable
7. Check expired pending -tigger roll up to upline -records upline reward claimable -record member's reward roll up and roll up table

#### Test Steps:
1. [ ] Check if referrer owns Level 1
2. [ ] If YES → status = `claimable`
3. [ ] If NO → status = `pending`
4. [ ] Set expiry timer if applicable

#### Expected Logic:
```sql
-- Check referrer's levels
SELECT levels_owned FROM members WHERE LOWER(wallet_address) = LOWER('referrer_wallet');

-- If 1 = ANY(levels_owned) → claimable
-- Else → pending
```

---

### 2.9 BCC Initialization
**Edge Function:** `bcc-release-system`
**Action:** `initialize_new_member`

#### Test Steps:
1. [ ] Edge function triggered with `activation_sequence`
2. [ ] Phase determined (Phase 1-4 based on rank)
3. [ ] `bcc_balance` = 500 (activation bonus)
4. [ ] `bcc_locked` = phase amount (10450/5225/2612.5/1306.25)

#### Expected Database State:
```sql
SELECT
  wallet_address,
  bcc_balance,
  bcc_locked
FROM user_balances
WHERE LOWER(wallet_address) = LOWER('user_wallet');

-- For Phase 1 (activation_sequence 1-10000):
-- bcc_balance: 500
-- bcc_locked: 10450
```

---

### 2.10 BCC Transaction Logs
**Table:** `bcc_transactions`

#### Expected Records:
```sql
SELECT
  wallet_address,
  amount,
  balance_type,
  transaction_type,
  purpose,
  status
FROM bcc_transactions
WHERE LOWER(wallet_address) = LOWER('user_wallet')
ORDER BY created_at DESC;

-- Expected 2 records:
-- 1. amount: 500, balance_type: 'balance', purpose: 'New member activation bonus'
-- 2. amount: 10450, balance_type: 'locked', purpose: 'Initial BCC locked (Phase 1)'
```

---

### 2.11 User Balance Sync
**Table:** `user_balances`

#### Final Level 1 State:
```sql
SELECT
  wallet_address,
  bcc_balance,
  bcc_locked,
  total_usdt_earned,
  total_usdt_withdrawn
FROM user_balances
WHERE LOWER(wallet_address) = LOWER('user_wallet');

-- Expected:
-- bcc_balance: 500
-- bcc_locked: 10450 (Phase 1)
-- total_usdt_earned: 0 (no layer rewards yet)
-- total_usdt_withdrawn: 0
```

---

## 3. LEVEL 2 UPGRADE FLOW

### 3.1 Membership Page - Upgrade Component
**Component:** `MembershipUpgrade` or `LevelUpgradeButton`
**Location:** `src/pages/Membership.tsx`

#### Test Steps:
1. [ ] Member navigates to Membership page
2. [ ] Level 2 upgrade required 3 direct referrals
2. [ ] if >3 direct referrals,Level 2 upgrade button displayed
3. [ ] Price shown: $200 USD
4. [ ] User clicks "Upgrade to Level 2"

#### Verification:
- [ ] Current level check (must be Level 1)
- [ ] Level 2 not already owned
- [ ] Direct referrrals >=3

---

### 3.2 Checkout Component - Level 2
**Component:** `CheckoutComponent`

#### Test Steps:
1. [ ] Checkout modal opens with Level 2 details
2. [ ] direct referral database connected
3. [ ] Price: $200 USD displayed
4. [ ] Payment method selection
5. [ ] User confirms payment
6. [ ] Transaction broadcasted and confirmed

#### Expected State:
```javascript
{
  level: 2,
  price: 200,
  txHash: "0x...",
  status: "confirmed"
}
```

---

### 3.3 Payment Callback - Level 2
**Edge Function:** `payment-callback`

#### Test Steps:
1. [ ] Callback triggered with Level 2 purchase data
2. [ ] Transaction verified on-chain
3. [ ] Platform fee calculated and recorded

---

### 3.4 Membership Record Update
**Table:** `memberships` (if exists) or `members`

#### Test Steps:
1. [ ] Claim membership NFT token id 2 to member's wallet_address
2. [ ] Verify membership NFT is claimed on chain
3. [ ] New membership record created for Level 2
2. [ ] Membership's `levels_owned` updated to `{1, 2}`
3. [ ] member's `current_level` updated to 2

#### Expected Database State:
```sql
SELECT
  wallet_address,
  current_level,
  levels_owned
FROM members
WHERE LOWER(wallet_address) = LOWER('user_wallet');

-- Expected:
-- current_level: 2
-- levels_owned: {1, 2}
```

---

### 3.5 Layer Reward 2 Trigger
**Table:** `layer_rewards_2`
**Trigger:** After Level 2 purchase

#### Test Steps:
1. [ ] System finds user's `matrix_root` from `matrix_referrals`
2. [ ] Layer 2 reward calculated for `matrix_root`
3. [ ] Gate check: `matrix_root` must own Level 2
4. [ ] Reward record created with status

#### Expected Database State:
```sql
SELECT
  root_wallet,
  referral_wallet,
  nft_level,
  reward_usdt,
  status,
  layer
FROM layer_rewards_2
WHERE LOWER(referral_wallet) = LOWER('user_wallet');

-- Expected:
-- root_wallet: <matrix_root_wallet>
-- referral_wallet: <user_wallet>
-- nft_level: 2
-- layer: 2
-- reward_usdt: <layer_2_reward_amount>
-- status: 'claimable' or 'pending'
```

---

### 3.6 Reward Rules & Gate Check

#### Test Steps:
1. [ ] Check if `matrix_root` owns Level 2
2. [ ] If YES → status = `claimable`, update `user_balances`
3. [ ] If NO → status = `pending`, set timer for expiry

#### Expected Query:
```sql
-- Check matrix_root's levels
SELECT levels_owned FROM members
WHERE LOWER(wallet_address) = LOWER('matrix_root_wallet');

-- If 2 = ANY(levels_owned) → claimable
-- Else → pending with timer
```

---

### 3.7 User Balance Sync - USDT Rewards
**Table:** `user_balances`

#### Test Steps:
1. [ ] If reward is `claimable`, add to `total_usdt_earned`
2. [ ] Update balance atomically

#### Expected State:
```sql
SELECT
  wallet_address,
  total_usdt_earned
FROM user_balances
WHERE LOWER(wallet_address) = LOWER('matrix_root_wallet');

-- If claimable:
-- total_usdt_earned: <previous_amount> + <layer_2_reward>
```

---

### 3.8 BCC Release Trigger - Level 2
**Edge Function:** `bcc-release-system`
**Action:** `unlock_bcc` or `process_level_unlock`

#### Test Steps:
1. [ ] Level 2 upgrade triggers BCC unlock
2. [ ] Unlock amount: 100 BCC (from `bcc_locked`)
3. [ ] Transfer from `bcc_locked` to `bcc_balance`

#### Expected Database State:
```sql
SELECT
  wallet_address,
  bcc_balance,
  bcc_locked
FROM user_balances
WHERE LOWER(wallet_address) = LOWER('user_wallet');

-- Phase 1 member after Level 2:
-- bcc_balance: 500 + 100 = 600
-- bcc_locked: 10450 - 100 = 10350
```

---

### 3.9 BCC Release Log
**Table:** `bcc_release_logs`

#### Expected Record:
```sql
SELECT
  wallet_address,
  from_level,
  to_level,
  bcc_released,
  bcc_remaining_locked,
  release_reason,
  unlock_sequence
FROM bcc_release_logs
WHERE LOWER(wallet_address) = LOWER('user_wallet')
AND to_level = 2;

-- Expected:
-- from_level: 1
-- to_level: 2
-- bcc_released: 100
-- bcc_remaining_locked: 10350
-- release_reason: 'Level 2 unlock'
-- unlock_sequence: 1
```

---

### 3.10 BCC Transaction Log
**Table:** `bcc_transactions`

#### Expected Record:
```sql
SELECT * FROM bcc_transactions
WHERE LOWER(wallet_address) = LOWER('user_wallet')
AND purpose LIKE '%Level 2%'
ORDER BY created_at DESC LIMIT 1;

-- Expected:
-- amount: 100
-- balance_type: 'unlock_reward'
-- transaction_type: 'unlock'
-- purpose: 'Level 2 BCC unlock: 100 BCC'
-- status: 'completed'
```

---

## 4. LEVEL 3-19 UPGRADES FLOW

### 4.1 Level 3 Upgrade
**Price:** $300
**BCC Unlock:** 150 BCC
**Layer Reward:** `layer_rewards_3`

#### Test Checklist:
- [ ] Checkout component with $300 price
- [ ] Payment callback records membership
- [ ] `current_level` = 3, `levels_owned` = `{1,2,3}`
- [ ] `layer_rewards_3` record created for `matrix_root`
- [ ] Gate check for Level 3 ownership
- [ ] BCC unlock: 150 BCC (total balance: 750)
- [ ] `bcc_release_logs` record created
- [ ] `user_balances` updated correctly

---

### 4.2 Level 4-18 Upgrades
**Pattern:** Each level +$100 price, +50 BCC unlock

#### Test Template for Each Level:
```
Level X:
- Price: $X00 USD
- BCC Unlock: 50 * (X - 1) BCC
- Layer Reward: layer_rewards_X
- Gate: matrix_root must own Level X
- Balance Update: +50 more BCC than previous level
```

#### Example Level 10:
- [ ] Price: $1000
- [ ] BCC Unlock: 500 BCC (50 * 9)
- [ ] Total BCC Balance: 500 + (100+150+200+250+300+350+400+450+500) = 3200
- [ ] `bcc_locked`: 10450 - 2700 = 7750
- [ ] `layer_rewards_10` created
- [ ] `bcc_release_logs` for Level 10

---

### 4.3 Level 19 Upgrade (Special Case)
**Price:** $1900
**BCC Unlock:** TWO separate unlocks
- **Sequence 1:** 950 BCC
- **Sequence 2:** 1000 BCC
- **Total:** 1950 BCC

#### Test Steps:
1. [ ] Checkout with $1900 price
2. [ ] Payment callback updates to Level 19
3. [ ] `current_level` = 19, `levels_owned` includes all 1-19
4. [ ] **First BCC unlock triggered** (sequence 1)
   - [ ] 950 BCC unlocked
   - [ ] `bcc_release_logs` record: `unlock_sequence = 1`
5. [ ] **Second BCC unlock triggered** (sequence 2)
   - [ ] 1000 BCC unlocked
   - [ ] `bcc_release_logs` record: `unlock_sequence = 2`
6. [ ] Total BCC unlocked at Level 19: 1950 BCC
7. [ ] `layer_rewards_19` created for matrix roots

#### Expected BCC State (Phase 1 Member at Level 19):
```sql
-- Total unlocked from Level 2-19:
-- Level 2-18: 100+150+200+250+300+350+400+450+500+550+600+650+700+750+800+850+900 = 7650
-- Level 19: 950 + 1000 = 1950
-- Total from levels: 7650 + 1950 = 9600
-- Plus activation: 500
-- Total balance: 10100 BCC

-- bcc_locked: 10450 - 9600 = 850 BCC remaining

SELECT bcc_balance, bcc_locked FROM user_balances
WHERE LOWER(wallet_address) = LOWER('user_wallet');

-- Expected:
-- bcc_balance: 10100
-- bcc_locked: 850
```

#### Expected BCC Release Logs (Level 19):
```sql
SELECT
  from_level,
  to_level,
  bcc_released,
  release_reason,
  unlock_sequence
FROM bcc_release_logs
WHERE LOWER(wallet_address) = LOWER('user_wallet')
AND to_level = 19
ORDER BY unlock_sequence;

-- Expected 2 records:
-- Record 1: bcc_released: 950, unlock_sequence: 1, release_reason: 'Level 19 unlock (sequence 1)'
-- Record 2: bcc_released: 1000, unlock_sequence: 2, release_reason: 'Level 19 unlock (sequence 2)'
```

---

## 5. DATABASE TRIGGERS & EDGE FUNCTIONS VERIFICATION

### 5.1 Database Triggers

#### Trigger 1: `tr_after_member_insert`
**Purpose:** After member creation, trigger referral and matrix placement
```sql
-- Verify trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%member%';
```

#### Trigger 2: `tr_after_referral_insert`
**Purpose:** After referral creation, create direct reward
```sql
-- Verify direct reward is created automatically
SELECT * FROM direct_rewards
WHERE LOWER(referral_wallet) = LOWER('test_user_wallet')
ORDER BY created_at DESC LIMIT 1;
```

#### Trigger 3: `tr_after_membership_purchase`
**Purpose:** After level purchase, trigger layer rewards and BCC unlock
```sql
-- Check layer rewards created
-- Check BCC unlock triggered
```

---

### 5.2 Edge Functions

#### Function 1: `bcc-release-system`
**Actions:**
- `initialize_new_member`
- `unlock_bcc`
- `process_level_unlock`

**Test:** Call each action and verify database state

#### Function 2: `payment-callback`
**Purpose:** Handle payment verification and trigger downstream processes

**Test:** Send mock payment data and verify:
- [ ] Member record created/updated
- [ ] Referral created
- [ ] Matrix placement
- [ ] Rewards triggered
- [ ] BCC initialized/unlocked

#### Function 3: `layer-rewards-processor`
**Purpose:** Calculate and distribute layer rewards

**Test:** Verify:
- [ ] Correct reward amounts per layer
- [ ] Gate checks applied
- [ ] Pending/claimable status set correctly
- [ ] Expiry timers created

---

## 6. FRONTEND COMPONENTS VERIFICATION

### 6.1 Component Checklist

#### Components to Verify:
- [ ] `WalletConnect` - Connection flow
- [ ] `WelcomePage` - New user registration
- [ ] `WelcomeLevel1ClaimButton` - Level 1 activation
- [ ] `CheckoutComponent` - Payment processing
- [ ] `MembershipPage` - Upgrade interface
- [ ] `LevelUpgradeButton` - Level upgrade trigger
- [ ] `RewardsPage` - Display rewards (claimable/pending)
- [ ] `DashboardPage` - Display balances (USDT/BCC)

---

### 6.2 Component Integration Tests

#### Test 1: Wallet Connection → Welcome
```javascript
// 1. Connect wallet
// 2. Check if user has membership
// 3. If NO → redirect to /welcome
// 4. If YES → redirect to /dashboard
```

#### Test 2: Welcome → Checkout → Payment
```javascript
// 1. Click "Claim Level 1"
// 2. Checkout opens with Level 1 data
// 3. Confirm payment
// 4. Wait for transaction
// 5. Payment callback triggered
// 6. Redirect to dashboard
```

#### Test 3: Membership → Upgrade → Rewards
```javascript
// 1. View current level
// 2. Click "Upgrade to Level X"
// 3. Checkout processes payment
// 4. Member record updated
// 5. BCC unlocked
// 6. Rewards triggered
// 7. Dashboard shows updated balances
```

---

## 7. COMPLETE TEST EXECUTION PLAN

### Phase 1: Preparation
1. [ ] Set up test wallet addresses (3 minimum: user, referrer, matrix_root)
2. [ ] Fund test wallets with USDT/USDC
3. [ ] Clear any existing test data from database
4. [ ] Enable database logging for all triggers/functions

### Phase 2: Level 1 Activation Test
1. [ ] Execute wallet connection
2. [ ] Complete Level 1 purchase
3. [ ] Verify all 11 checkpoints (2.1 - 2.11)
4. [ ] Document any failures

### Phase 3: Level 2 Upgrade Test
1. [ ] Execute Level 2 upgrade
2. [ ] Verify all 10 checkpoints (3.1 - 3.10)
3. [ ] Confirm BCC unlock worked correctly
4. [ ] Document any failures

### Phase 4: Level 3-19 Upgrade Tests
1. [ ] Execute Level 3 upgrade (verify pattern)
2. [ ] Execute Level 10 upgrade (mid-point check)
3. [ ] Execute Level 19 upgrade (special double unlock)
4. [ ] Verify all database states
5. [ ] Document any failures

### Phase 5: Edge Cases & Error Handling
1. [ ] Test duplicate purchase prevention
2. [ ] Test insufficient level gate (pending rewards)
3. [ ] Test reward expiry timers
4. [ ] Test reward claiming process
5. [ ] Test balance withdrawal flow

---

## 8. VALIDATION QUERIES

### Query 1: Complete User State
```sql
-- Get complete state for a test user
SELECT
  m.wallet_address,
  m.activation_sequence,
  m.current_level,
  m.levels_owned,
  m.referrer_wallet,
  ub.bcc_balance,
  ub.bcc_locked,
  ub.total_usdt_earned,
  ub.total_usdt_withdrawn,
  (SELECT COUNT(*) FROM referrals WHERE referrer_wallet = m.wallet_address) as direct_referrals,
  (SELECT COUNT(*) FROM matrix_referrals WHERE matrix_root = m.wallet_address) as matrix_children
FROM members m
LEFT JOIN user_balances ub ON LOWER(m.wallet_address) = LOWER(ub.wallet_address)
WHERE LOWER(m.wallet_address) = LOWER('test_user_wallet');
```

### Query 2: All Rewards Summary
```sql
-- Direct rewards
SELECT 'Direct Rewards' as type, COUNT(*) as total,
  SUM(CASE WHEN status = 'claimable' THEN reward_usdt ELSE 0 END) as claimable_amount,
  SUM(CASE WHEN status = 'pending' THEN reward_usdt ELSE 0 END) as pending_amount
FROM direct_rewards
WHERE LOWER(root_wallet) = LOWER('test_user_wallet')

UNION ALL

-- Layer rewards (aggregate all layer_rewards_2 to layer_rewards_19)
SELECT 'Layer Rewards' as type, COUNT(*) as total,
  SUM(CASE WHEN status = 'claimable' THEN reward_usdt ELSE 0 END) as claimable_amount,
  SUM(CASE WHEN status = 'pending' THEN reward_usdt ELSE 0 END) as pending_amount
FROM layer_rewards_2
WHERE LOWER(root_wallet) = LOWER('test_user_wallet');

-- Repeat for layer_rewards_3 to layer_rewards_19...
```

### Query 3: BCC Release History
```sql
SELECT
  to_level,
  bcc_released,
  bcc_remaining_locked,
  release_reason,
  unlock_sequence,
  created_at
FROM bcc_release_logs
WHERE LOWER(wallet_address) = LOWER('test_user_wallet')
ORDER BY to_level, unlock_sequence;
```

### Query 4: Transaction Audit Trail
```sql
-- BCC Transactions
SELECT
  'BCC' as currency,
  amount,
  balance_type,
  transaction_type,
  purpose,
  status,
  created_at
FROM bcc_transactions
WHERE LOWER(wallet_address) = LOWER('test_user_wallet')

UNION ALL

-- USDT Transactions (if table exists)
SELECT
  'USDT' as currency,
  amount,
  transaction_type,
  description as purpose,
  status,
  created_at
FROM usdt_transactions
WHERE LOWER(wallet_address) = LOWER('test_user_wallet')

ORDER BY created_at DESC;
```

---

## 9. SUCCESS CRITERIA

### Level 1 Activation Success:
✅ Member record created with correct activation_sequence
✅ Referral relationship recorded
✅ Matrix placement completed with correct layer/position
✅ Direct reward created for referrer (claimable/pending)
✅ BCC initialized: 500 balance + phase-locked amount
✅ User balance synced correctly

### Level 2 Upgrade Success:
✅ Levels_owned updated to {1,2}
✅ Current_level = 2
✅ Layer_rewards_2 created for matrix_root
✅ Reward status correct (claimable if gate passed)
✅ BCC unlocked: 100 BCC transferred from locked to balance
✅ BCC release log created
✅ User balance synced

### Level 19 Upgrade Success:
✅ Levels_owned includes all 1-19
✅ Current_level = 19
✅ Layer_rewards_19 created
✅ BCC double unlock: 950 + 1000 = 1950 BCC
✅ Two bcc_release_logs records (sequence 1 and 2)
✅ Correct final balance: 10100 BCC available, 850 locked (Phase 1)

---

## 10. FAILURE SCENARIOS & DEBUGGING

### Common Failure Points:
1. **Payment callback not triggered** → Check webhook configuration
2. **Matrix placement fails** → Verify fn_place_in_matrix() logic
3. **Reward not claimable** → Check gate logic (level ownership)
4. **BCC not unlocked** → Verify bcc-release-system Edge Function
5. **Balance not synced** → Check trigger execution order

### Debugging Steps:
1. Enable PostgreSQL logging
2. Check Edge Function logs in Supabase dashboard
3. Verify trigger execution with `RAISE NOTICE` statements
4. Use transaction logging to trace flow
5. Check for foreign key constraint violations

---

## NEXT STEPS

After creating this documentation:
1. Execute test plan systematically
2. Document all findings in test report
3. Fix any identified issues
4. Re-test failed scenarios
5. Update documentation with final results

---

**Test Execution Date:** _____________
**Tester:** _____________
**Environment:** _____________
**Test Wallet:** _____________

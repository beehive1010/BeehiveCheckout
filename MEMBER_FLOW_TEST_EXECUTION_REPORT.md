# Member Flow Test Execution Report

## Test Environment
- **Database**: PostgreSQL (Supabase)
- **Chain**: Arbitrum One
- **NFT Contract**: 0x15742D22f64985bC124676e206FCE3fFEb175719
- **Server Wallet**: (NFT Claim Wallet)
- **Admin Wallet**: 0x0bA198F73DF3A1374a49Acb2c293ccA20e150Fe0

---

## Test Execution Flow

### PHASE 1: LEVEL 1 ACTIVATION COMPLETE FLOW

#### 1.1 Wallet Connection & Registration
```
User Action: Connect wallet via Thirdweb
├─ Capture wallet address
├─ Extract referrer from URL parameter
├─ Store in session/state
└─ Check membership status
    ├─ If NOT member → Redirect to /welcome
    └─ If member → Redirect to /dashboard
```

**Database Check:**
```sql
-- Check if user exists
SELECT * FROM users WHERE LOWER(wallet_address) = LOWER('0x...');

-- Check if member exists
SELECT * FROM members WHERE LOWER(wallet_address) = LOWER('0x...');
```

---

#### 1.2 Welcome Page - Level 1 Claim
```
Component: WelcomeLevel1ClaimButton
Price Display: 130 USDT (100 base + 30 platform fee)
Payment Method: USDT on Arbitrum One
```

**Frontend Flow:**
1. User clicks "Claim Level 1 NFT"
2. Check user registration status
3. Validate referrer exists and is registered
4. Approve USDT spending (if needed)
5. Open PayEmbed modal
6. User completes payment

**Database Check Before Payment:**
```sql
-- Verify user is registered
SELECT wallet_address, username, referrer_wallet
FROM users
WHERE LOWER(wallet_address) = LOWER('user_wallet');

-- Verify referrer is valid
SELECT wallet_address, username
FROM users
WHERE LOWER(wallet_address) = LOWER('referrer_wallet');
```

---

#### 1.3 Payment & NFT Claim Flow
```
Payment Flow (130 USDT):
1. User pays 130 USDT to Server Wallet
2. Transaction confirmed on Arbitrum
3. Edge Function: thirdweb-webhook OR check-transfer-status
   ├─ Verify transaction on-chain
   ├─ Confirm amount = 130 USDT
   ├─ Server Wallet claims NFT (Token ID 1) to user's wallet
   ├─ Verify NFT claim on-chain (balanceOf check)
   └─ Trigger activation flow
```

**Database Operations After Payment:**

**Step 1: Platform Fee Record**
```sql
-- Record platform fee (30 USDT)
INSERT INTO platform_fees (
  wallet_address,
  level,
  fee_amount,
  total_paid,
  net_amount,
  admin_wallet,
  created_at
) VALUES (
  LOWER('user_wallet'),
  1,
  30,
  130,
  100,
  '0x0bA198F73DF3A1374a49Acb2c293ccA20e150Fe0',
  NOW()
);

-- Verify
SELECT * FROM platform_fees
WHERE LOWER(wallet_address) = LOWER('user_wallet')
AND level = 1;
```

**Step 2: Create Membership Record**
```sql
-- Insert membership record
INSERT INTO membership (
  wallet_address,
  nft_level,
  level,
  is_member,
  claim_price,
  platform_activation_fee,
  unlock_membership_level,
  created_at
) VALUES (
  LOWER('user_wallet'),
  1,
  1,
  true,
  100,
  30,
  2,
  NOW()
);

-- Verify
SELECT * FROM membership
WHERE LOWER(wallet_address) = LOWER('user_wallet')
AND nft_level = 1;
```

**Step 3: Create Members Record (with activation_sequence)**
```sql
-- Get next activation sequence (atomic RPC call)
SELECT get_next_activation_sequence();

-- Insert member record
INSERT INTO members (
  wallet_address,
  referrer_wallet,
  current_level,
  levels_owned,
  activation_sequence,
  activation_time,
  created_at
) VALUES (
  LOWER('user_wallet'),
  LOWER('referrer_wallet'),
  1,
  ARRAY[1],
  <activation_sequence>,
  NOW(),
  NOW()
);

-- Verify
SELECT
  wallet_address,
  referrer_wallet,
  current_level,
  levels_owned,
  activation_sequence,
  activation_time
FROM members
WHERE LOWER(wallet_address) = LOWER('user_wallet');
```

---

#### 1.4 Referral & Matrix Placement
```
Triggered by: Members record creation
Function: recursive_matrix_placement(member_wallet, referrer_wallet)
```

**Step 1: Create Referral Record**
```sql
-- Insert referral
INSERT INTO referrals (
  referrer_wallet,
  referred_wallet,
  level_purchased,
  created_at
) VALUES (
  LOWER('referrer_wallet'),
  LOWER('user_wallet'),
  1,
  NOW()
);

-- Verify
SELECT
  referrer_wallet,
  referred_wallet,
  level_purchased,
  created_at
FROM referrals
WHERE LOWER(referred_wallet) = LOWER('user_wallet');
```

**Step 2: Matrix Placement (19 Layers)**
```sql
-- Matrix placement creates up to 19 records
-- Example for Layer 1:
INSERT INTO matrix_referrals (
  matrix_root,
  wallet_address,
  parent_wallet,
  layer,
  position,
  slot_num_seq,
  path,
  referral_type,
  created_at
) VALUES (
  LOWER('matrix_root_L1'),
  LOWER('user_wallet'),
  LOWER('parent_wallet'),
  1,
  'L', -- or 'M' or 'R'
  <slot_sequence>,
  'L', -- e.g., 'L.M.R'
  'is_direct', -- or 'spillover'
  NOW()
);

-- Verify all matrix placements
SELECT
  matrix_root,
  layer,
  position,
  slot_num_seq,
  path,
  referral_type
FROM matrix_referrals
WHERE LOWER(wallet_address) = LOWER('user_wallet')
ORDER BY layer;

-- Should return up to 19 records (one per layer)
```

---

#### 1.5 Direct Reward Trigger (Level 1 Only)
```
Triggered by: Referral record creation
Function: trigger_direct_referral_rewards(member_wallet, 1, 100)
```

**Direct Reward Logic:**
```sql
-- Create direct reward for referrer
INSERT INTO direct_rewards (
  root_wallet,        -- referrer
  referral_wallet,    -- new member
  nft_level,
  reward_usdt,
  status,             -- 'claimable' or 'pending'
  created_at,
  expires_at          -- IF pending, NOW() + 72 hours
) VALUES (
  LOWER('referrer_wallet'),
  LOWER('user_wallet'),
  1,
  100,  -- Full Level 1 price
  CASE
    WHEN referrer_level >= 1 THEN 'claimable'
    ELSE 'pending'
  END,
  NOW(),
  CASE
    WHEN referrer_level < 1 THEN NOW() + INTERVAL '72 hours'
    ELSE NULL
  END
);

-- Verify direct reward
SELECT
  root_wallet,
  referral_wallet,
  nft_level,
  reward_usdt,
  status,
  created_at,
  expires_at
FROM direct_rewards
WHERE LOWER(referral_wallet) = LOWER('user_wallet');
```

**Gate Check Rules:**
1. **1st & 2nd Direct Referral**: Referrer must own Level 1+ → claimable
2. **3rd+ Direct Referral**: Referrer must own Level 2+ → otherwise pending

**If Claimable - Sync to user_balances:**
```sql
-- Update referrer's balance
UPDATE user_balances
SET
  total_usdt_earned = total_usdt_earned + 100,
  reward_balance = reward_balance + 100,
  updated_at = NOW()
WHERE LOWER(wallet_address) = LOWER('referrer_wallet');
```

**If Pending - Create Reward Timer:**
```sql
-- Insert reward timer
INSERT INTO reward_timers (
  reward_id,
  recipient_wallet,
  timer_type,
  expires_at,
  created_at
) VALUES (
  <direct_reward_id>,
  LOWER('referrer_wallet'),
  'direct_reward_pending',
  NOW() + INTERVAL '72 hours',
  NOW()
);

-- This triggers cron-timers Edge Function for countdown
```

---

#### 1.6 BCC Initialization
```
Triggered by: Member activation
Edge Function: bcc-release-system
Action: initialize_new_member
```

**BCC Initialization Logic:**
```sql
-- Determine phase based on activation_sequence
SELECT activation_sequence FROM members
WHERE LOWER(wallet_address) = LOWER('user_wallet');

-- Phase calculation:
-- Phase 1 (1-10,000): 10,450 BCC locked
-- Phase 2 (10,001-30,000): 5,225 BCC locked
-- Phase 3 (30,001-100,000): 2,612.5 BCC locked
-- Phase 4 (100,001-168,230): 1,306.25 BCC locked

-- Create/Update user_balances
INSERT INTO user_balances (
  wallet_address,
  bcc_balance,
  bcc_locked,
  created_at,
  updated_at
) VALUES (
  LOWER('user_wallet'),
  500,              -- Activation bonus
  10450,            -- Phase 1 locked amount
  NOW(),
  NOW()
)
ON CONFLICT (wallet_address)
DO UPDATE SET
  bcc_balance = user_balances.bcc_balance + 500,
  bcc_locked = user_balances.bcc_locked + 10450,
  updated_at = NOW();

-- Verify BCC balance
SELECT
  wallet_address,
  bcc_balance,
  bcc_locked
FROM user_balances
WHERE LOWER(wallet_address) = LOWER('user_wallet');

-- Expected for Phase 1:
-- bcc_balance: 500
-- bcc_locked: 10450
```

**BCC Transaction Logs:**
```sql
-- Log activation bonus
INSERT INTO bcc_transactions (
  wallet_address,
  amount,
  balance_type,
  transaction_type,
  purpose,
  status,
  created_at,
  metadata
) VALUES (
  LOWER('user_wallet'),
  500,
  'balance',
  'credit',
  'New member activation bonus: 500 BCC (Phase 1)',
  'completed',
  NOW(),
  jsonb_build_object(
    'activation_sequence', <seq>,
    'phase', 1,
    'activation_bonus', 500,
    'total_locked', 10450
  )
);

-- Log locked BCC
INSERT INTO bcc_transactions (
  wallet_address,
  amount,
  balance_type,
  transaction_type,
  purpose,
  status,
  created_at,
  metadata
) VALUES (
  LOWER('user_wallet'),
  10450,
  'locked',
  'lock',
  'Initial BCC locked: 10450 BCC (Phase 1)',
  'completed',
  NOW(),
  jsonb_build_object(
    'activation_sequence', <seq>,
    'phase', 1,
    'total_locked', 10450
  )
);

-- Verify BCC transactions
SELECT
  amount,
  balance_type,
  transaction_type,
  purpose,
  status,
  created_at
FROM bcc_transactions
WHERE LOWER(wallet_address) = LOWER('user_wallet')
ORDER BY created_at;

-- Expected: 2 records (activation bonus + locked)
```

---

#### 1.7 Level 1 Activation Complete - Verification
```sql
-- COMPLETE VERIFICATION QUERY FOR LEVEL 1 ACTIVATION
SELECT
  'User' as record_type,
  u.wallet_address,
  u.username,
  u.referrer_wallet
FROM users u
WHERE LOWER(u.wallet_address) = LOWER('user_wallet')

UNION ALL

SELECT
  'Member' as record_type,
  m.wallet_address,
  m.activation_sequence::text,
  m.referrer_wallet
FROM members m
WHERE LOWER(m.wallet_address) = LOWER('user_wallet')

UNION ALL

SELECT
  'Membership' as record_type,
  ms.wallet_address,
  ms.nft_level::text,
  ms.claim_price::text
FROM membership ms
WHERE LOWER(ms.wallet_address) = LOWER('user_wallet')

UNION ALL

SELECT
  'Referral' as record_type,
  r.referred_wallet,
  r.referrer_wallet,
  r.level_purchased::text
FROM referrals r
WHERE LOWER(r.referred_wallet) = LOWER('user_wallet')

UNION ALL

SELECT
  'Matrix Count' as record_type,
  wallet_address,
  COUNT(*)::text,
  MAX(layer)::text
FROM matrix_referrals
WHERE LOWER(wallet_address) = LOWER('user_wallet')
GROUP BY wallet_address

UNION ALL

SELECT
  'Direct Reward' as record_type,
  dr.referral_wallet,
  dr.reward_usdt::text,
  dr.status
FROM direct_rewards dr
WHERE LOWER(dr.referral_wallet) = LOWER('user_wallet')

UNION ALL

SELECT
  'BCC Balance' as record_type,
  ub.wallet_address,
  ub.bcc_balance::text,
  ub.bcc_locked::text
FROM user_balances ub
WHERE LOWER(ub.wallet_address) = LOWER('user_wallet')

UNION ALL

SELECT
  'Platform Fee' as record_type,
  pf.wallet_address,
  pf.fee_amount::text,
  pf.admin_wallet
FROM platform_fees pf
WHERE LOWER(pf.wallet_address) = LOWER('user_wallet')
AND pf.level = 1;
```

**Expected Results:**
- ✅ User record exists
- ✅ Member record with activation_sequence
- ✅ Membership record (nft_level=1)
- ✅ Referral record
- ✅ Matrix placements (up to 19 layers)
- ✅ Direct reward for referrer (claimable or pending)
- ✅ BCC balance: 500 available + 10,450 locked (Phase 1)
- ✅ Platform fee: 30 USDT recorded

---

### PHASE 2: LEVEL 2 UPGRADE COMPLETE FLOW

#### 2.1 Level 2 Upgrade Requirements
```
Pre-requisites:
1. Current level = 1
2. Must have 3+ direct referrals
3. Levels owned = {1}
4. Payment: 200 USDT
```

**Frontend Check:**
```sql
-- Check direct referrals count
SELECT COUNT(*) as direct_referral_count
FROM referrals
WHERE LOWER(referrer_wallet) = LOWER('user_wallet');

-- Must return >= 3 to show Level 2 upgrade button
```

---

#### 2.2 Level 2 Payment & NFT Claim
```
Payment Flow (200 USDT):
1. User pays 200 USDT to Server Wallet
2. Transaction confirmed on Arbitrum
3. Edge Function: thirdweb-webhook OR check-transfer-status
   ├─ Verify transaction on-chain
   ├─ Confirm amount = 200 USDT
   ├─ Server Wallet claims NFT (Token ID 2) to user's wallet
   ├─ Verify NFT claim on-chain
   └─ Trigger upgrade flow
```

---

#### 2.3 Level 2 Database Updates

**Step 1: Verify NFT Ownership On-Chain**
```javascript
// Thirdweb SDK check
const balance = await readContract({
  contract: nftContract,
  method: "balanceOf",
  params: [userWallet, BigInt(2)]
});
// balance should be > 0
```

**Step 2: Create Membership Record for Level 2**
```sql
INSERT INTO membership (
  wallet_address,
  nft_level,
  level,
  is_member,
  claim_price,
  platform_activation_fee,
  unlock_membership_level,
  created_at
) VALUES (
  LOWER('user_wallet'),
  2,
  2,
  true,
  200,
  0,  -- No platform fee for upgrades
  3,
  NOW()
);

-- Verify Level 2 membership
SELECT * FROM membership
WHERE LOWER(wallet_address) = LOWER('user_wallet')
AND nft_level = 2;
```

**Step 3: Update Members Record**
```sql
-- Update current_level and levels_owned
UPDATE members
SET
  current_level = 2,
  levels_owned = array_append(levels_owned, 2),
  updated_at = NOW()
WHERE LOWER(wallet_address) = LOWER('user_wallet');

-- Verify
SELECT
  wallet_address,
  current_level,
  levels_owned,
  updated_at
FROM members
WHERE LOWER(wallet_address) = LOWER('user_wallet');

-- Expected:
-- current_level: 2
-- levels_owned: {1, 2}
```

---

#### 2.4 Layer Rewards Trigger (Level 2)
```
Triggered by: Level upgrade
Function: trigger_layer_rewards_on_upgrade(user_wallet, 2, 200)
```

**Layer Rewards Logic (Traverse 19 Layers):**
```sql
-- For each layer 1-19, find matrix root and create reward

-- Example Layer 1 Reward:
INSERT INTO layer_rewards_2 (
  root_wallet,              -- matrix root at layer 1
  referral_wallet,          -- upgrading member
  nft_level,
  layer,
  reward_usdt,
  status,
  recipient_required_level,
  created_at,
  expires_at
) VALUES (
  LOWER('matrix_root_L1'),
  LOWER('user_wallet'),
  2,
  1,
  200,  -- Full Level 2 price
  CASE
    WHEN root_level >= 2 THEN 'claimable'
    ELSE 'pending'
  END,
  2,
  NOW(),
  CASE
    WHEN root_level < 2 THEN NOW() + INTERVAL '72 hours'
    ELSE NULL
  END
);

-- Gate Rules:
-- Layer 1-2: root_level >= upgrade_level (>= 2) → claimable
-- Layer 3+: root_level >= upgrade_level + 1 (>= 3) → claimable
-- Otherwise: pending with 72h timer

-- Verify Layer 2 rewards created
SELECT
  layer,
  root_wallet,
  reward_usdt,
  status,
  recipient_required_level,
  expires_at
FROM layer_rewards_2
WHERE LOWER(referral_wallet) = LOWER('user_wallet')
ORDER BY layer;

-- Should return up to 19 records (one per layer)
```

**If Claimable - Sync to user_balances:**
```sql
-- Update matrix root's balance for each claimable reward
UPDATE user_balances
SET
  total_usdt_earned = total_usdt_earned + 200,
  reward_balance = reward_balance + 200,
  updated_at = NOW()
WHERE LOWER(wallet_address) = LOWER('matrix_root_wallet');
```

**If Pending - Create Reward Timer:**
```sql
-- Create timer for each pending reward
INSERT INTO reward_timers (
  reward_id,
  recipient_wallet,
  timer_type,
  expires_at,
  created_at
) VALUES (
  <layer_reward_2_id>,
  LOWER('matrix_root_wallet'),
  'layer_reward_pending',
  NOW() + INTERVAL '72 hours',
  NOW()
);
```

---

#### 2.5 BCC Release Trigger (Level 2)
```
Triggered by: Level upgrade
Edge Function: bcc-release-system
Action: unlock_bcc OR process_level_unlock
```

**BCC Unlock Logic for Level 2:**
```sql
-- Level 2 unlocks 100 BCC
-- Formula: 50 * (level - 1) = 50 * 1 = 100

-- Check if already unlocked
SELECT * FROM bcc_release_logs
WHERE LOWER(wallet_address) = LOWER('user_wallet')
AND to_level = 2;

-- If not unlocked, proceed:

-- Update user_balances (move from locked to balance)
UPDATE user_balances
SET
  bcc_balance = bcc_balance + 100,
  bcc_locked = bcc_locked - 100,
  updated_at = NOW()
WHERE LOWER(wallet_address) = LOWER('user_wallet');

-- Verify updated balance
SELECT
  wallet_address,
  bcc_balance,
  bcc_locked
FROM user_balances
WHERE LOWER(wallet_address) = LOWER('user_wallet');

-- Expected for Phase 1 member:
-- bcc_balance: 500 + 100 = 600
-- bcc_locked: 10450 - 100 = 10350
```

**Create BCC Release Log:**
```sql
INSERT INTO bcc_release_logs (
  wallet_address,
  from_level,
  to_level,
  bcc_released,
  bcc_remaining_locked,
  release_reason,
  unlock_sequence,
  created_at
) VALUES (
  LOWER('user_wallet'),
  1,
  2,
  100,
  10350,  -- Remaining locked
  'Level 2 unlock',
  1,
  NOW()
);

-- Verify BCC release log
SELECT
  from_level,
  to_level,
  bcc_released,
  bcc_remaining_locked,
  release_reason,
  unlock_sequence,
  created_at
FROM bcc_release_logs
WHERE LOWER(wallet_address) = LOWER('user_wallet')
AND to_level = 2;
```

**Create BCC Transaction Log:**
```sql
INSERT INTO bcc_transactions (
  wallet_address,
  amount,
  balance_type,
  transaction_type,
  purpose,
  status,
  created_at,
  metadata
) VALUES (
  LOWER('user_wallet'),
  100,
  'unlock_reward',
  'unlock',
  'Level 2 BCC unlock: 100 BCC',
  'completed',
  NOW(),
  jsonb_build_object(
    'level', 2,
    'phase', 1,
    'unlock_amount', 100,
    'unlock_sequence', 1
  )
);
```

---

#### 2.6 Check Pending Rewards → Claimable
```
Triggered by: Level upgrade
Function: Check if user has pending rewards that can now be claimed
```

**Logic:**
```sql
-- Find pending rewards where user is the recipient
-- and new level >= required level

SELECT * FROM layer_rewards_2
WHERE LOWER(root_wallet) = LOWER('user_wallet')
AND status = 'pending'
AND recipient_required_level <= 2;  -- User's new level

-- If found, update to claimable:
UPDATE layer_rewards_2
SET
  status = 'claimable',
  expires_at = NULL,
  updated_at = NOW()
WHERE LOWER(root_wallet) = LOWER('user_wallet')
AND status = 'pending'
AND recipient_required_level <= 2;

-- Sync to user_balances
UPDATE user_balances
SET
  total_usdt_earned = total_usdt_earned + (
    SELECT COALESCE(SUM(reward_usdt), 0)
    FROM layer_rewards_2
    WHERE root_wallet = user_balances.wallet_address
    AND status = 'claimable'
  ),
  updated_at = NOW()
WHERE LOWER(wallet_address) = LOWER('user_wallet');
```

---

#### 2.7 Level 2 Upgrade Complete - Verification
```sql
-- COMPLETE VERIFICATION QUERY FOR LEVEL 2 UPGRADE
SELECT
  'Member Level' as check_type,
  current_level::text as value,
  levels_owned::text as details
FROM members
WHERE LOWER(wallet_address) = LOWER('user_wallet')

UNION ALL

SELECT
  'Membership L2' as check_type,
  nft_level::text,
  claim_price::text
FROM membership
WHERE LOWER(wallet_address) = LOWER('user_wallet')
AND nft_level = 2

UNION ALL

SELECT
  'Layer Rewards Count' as check_type,
  COUNT(*)::text,
  STRING_AGG(DISTINCT status, ', ')
FROM layer_rewards_2
WHERE LOWER(referral_wallet) = LOWER('user_wallet')

UNION ALL

SELECT
  'BCC Balance' as check_type,
  bcc_balance::text,
  bcc_locked::text
FROM user_balances
WHERE LOWER(wallet_address) = LOWER('user_wallet')

UNION ALL

SELECT
  'BCC Release Log' as check_type,
  bcc_released::text,
  release_reason
FROM bcc_release_logs
WHERE LOWER(wallet_address) = LOWER('user_wallet')
AND to_level = 2

UNION ALL

SELECT
  'Unlocked Pending Rewards' as check_type,
  COUNT(*)::text,
  COALESCE(SUM(reward_usdt), 0)::text
FROM layer_rewards_2
WHERE LOWER(root_wallet) = LOWER('user_wallet')
AND status = 'claimable';
```

**Expected Results:**
- ✅ current_level = 2, levels_owned = {1,2}
- ✅ Membership record for Level 2
- ✅ Layer rewards created for 19 layers (claimable or pending)
- ✅ BCC balance: 600, locked: 10,350
- ✅ BCC release log for Level 2
- ✅ Previously pending rewards now claimable

---

### PHASE 3: LEVEL 3-19 UPGRADES

#### 3.1 Level 3-18 Upgrade Pattern

**General Pattern:**
```
Level X Upgrade:
├─ Price: X * 100 USDT (e.g., Level 3 = 300 USDT)
├─ BCC Unlock: 50 * (X - 1) BCC
├─ Layer Rewards: Use layer_rewards_X table
├─ Gate: Matrix roots need Level X (L1-2) or X+1 (L3+)
└─ Balance Update: Progressive BCC unlock
```

**Level 3 Example:**
```sql
-- 1. Payment: 300 USDT
-- 2. Claim NFT Token ID 3
-- 3. Create membership record
INSERT INTO membership (wallet_address, nft_level, level, claim_price)
VALUES (LOWER('user_wallet'), 3, 3, 300);

-- 4. Update member
UPDATE members
SET current_level = 3, levels_owned = array_append(levels_owned, 3)
WHERE LOWER(wallet_address) = LOWER('user_wallet');

-- 5. Create layer rewards (19 layers)
-- Layer 1-2: Need Level 3 to claim
-- Layer 3+: Need Level 4 to claim
INSERT INTO layer_rewards_3 (
  root_wallet, referral_wallet, nft_level, layer, reward_usdt,
  status, recipient_required_level
)
-- (repeated for 19 layers)

-- 6. BCC unlock: 150 BCC (50 * 2)
UPDATE user_balances
SET bcc_balance = bcc_balance + 150, bcc_locked = bcc_locked - 150
WHERE LOWER(wallet_address) = LOWER('user_wallet');

-- Expected Balance:
-- bcc_balance: 600 + 150 = 750
-- bcc_locked: 10350 - 150 = 10200

-- 7. BCC release log
INSERT INTO bcc_release_logs (
  wallet_address, from_level, to_level, bcc_released,
  bcc_remaining_locked, release_reason, unlock_sequence
) VALUES (
  LOWER('user_wallet'), 2, 3, 150, 10200, 'Level 3 unlock', 1
);
```

**Level 4-18 Follow Same Pattern:**
- Level 4: 400 USDT, unlock 200 BCC (total: 950 available)
- Level 5: 500 USDT, unlock 250 BCC (total: 1200 available)
- ...
- Level 18: 1800 USDT, unlock 900 BCC (total: 8150 available)

---

#### 3.2 Level 19 Upgrade (Special Double Unlock)

**Level 19 is SPECIAL - TWO BCC Unlocks:**
```
Price: 1900 USDT
BCC Unlock Sequence 1: 950 BCC
BCC Unlock Sequence 2: 1000 BCC
Total BCC Unlocked: 1950 BCC
```

**Level 19 Flow:**

**Step 1: Payment & NFT Claim**
```sql
-- 1. Pay 1900 USDT
-- 2. Claim NFT Token ID 19
-- 3. Create membership
INSERT INTO membership (wallet_address, nft_level, level, claim_price)
VALUES (LOWER('user_wallet'), 19, 19, 1900);

-- 4. Update member
UPDATE members
SET current_level = 19, levels_owned = ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]
WHERE LOWER(wallet_address) = LOWER('user_wallet');
```

**Step 2: Layer Rewards (19 layers)**
```sql
-- Create layer_rewards_19 for all 19 layers
-- Same gate rules: L1-2 need Level 19, L3+ need Level 20 (impossible, so always pending)
INSERT INTO layer_rewards_19 (...);
```

**Step 3: First BCC Unlock (Sequence 1 - 950 BCC)**
```sql
-- Unlock 950 BCC
UPDATE user_balances
SET bcc_balance = bcc_balance + 950, bcc_locked = bcc_locked - 950
WHERE LOWER(wallet_address) = LOWER('user_wallet');

-- Log sequence 1
INSERT INTO bcc_release_logs (
  wallet_address, from_level, to_level, bcc_released,
  bcc_remaining_locked, release_reason, unlock_sequence
) VALUES (
  LOWER('user_wallet'), 18, 19, 950,
  1850,  -- Remaining: 10450 - 8600 (L2-18) - 950 = 900
  'Level 19 unlock (sequence 1)', 1
);
```

**Step 4: Second BCC Unlock (Sequence 2 - 1000 BCC)**
```sql
-- Unlock additional 1000 BCC
UPDATE user_balances
SET bcc_balance = bcc_balance + 1000, bcc_locked = bcc_locked - 1000
WHERE LOWER(wallet_address) = LOWER('user_wallet');

-- Log sequence 2
INSERT INTO bcc_release_logs (
  wallet_address, from_level, to_level, bcc_released,
  bcc_remaining_locked, release_reason, unlock_sequence
) VALUES (
  LOWER('user_wallet'), 18, 19, 1000,
  850,  -- Final remaining locked
  'Level 19 unlock (sequence 2)', 2
);
```

**Step 5: Verify Level 19 Complete State**
```sql
-- VERIFICATION QUERY FOR LEVEL 19
SELECT
  'Member Level' as check_type,
  current_level::text,
  array_length(levels_owned, 1)::text as total_levels
FROM members
WHERE LOWER(wallet_address) = LOWER('user_wallet')

UNION ALL

SELECT
  'BCC Final Balance' as check_type,
  bcc_balance::text,
  bcc_locked::text
FROM user_balances
WHERE LOWER(wallet_address) = LOWER('user_wallet')

UNION ALL

SELECT
  'BCC L19 Unlocks' as check_type,
  unlock_sequence::text,
  bcc_released::text
FROM bcc_release_logs
WHERE LOWER(wallet_address) = LOWER('user_wallet')
AND to_level = 19
ORDER BY unlock_sequence;

-- Expected Results:
-- current_level: 19, total_levels: 19
-- bcc_balance: 10100, bcc_locked: 850 (Phase 1)
-- BCC L19 Unlock 1: 950 BCC
-- BCC L19 Unlock 2: 1000 BCC
```

**BCC Breakdown for Phase 1 Member at Level 19:**
```
Activation bonus: 500 BCC
Level 2 unlock: 100 BCC
Level 3 unlock: 150 BCC
Level 4-18 unlocks: 200+250+300+350+400+450+500+550+600+650+700+750+800+850+900 = 8400 BCC
Level 19 sequence 1: 950 BCC
Level 19 sequence 2: 1000 BCC

Total available: 500 + 100 + 150 + 8400 + 950 + 1000 = 11,100 BCC
Wait... recalculation:
L2: 100, L3: 150, L4: 200, L5: 250, L6: 300, L7: 350, L8: 400, L9: 450
L10: 500, L11: 550, L12: 600, L13: 650, L14: 700, L15: 750, L16: 800, L17: 850, L18: 900
Sum L2-L18: 100+150+200+250+300+350+400+450+500+550+600+650+700+750+800+850+900 = 7650
L19: 950 + 1000 = 1950

Total unlocked from levels: 7650 + 1950 = 9600
Plus activation: 500
Grand total available: 10,100 BCC ✅

Total locked initially (Phase 1): 10,450 BCC
Total unlocked: 9,600 BCC
Remaining locked: 850 BCC ✅
```

---

### PHASE 4: REWARD TIMERS & ROLLUP FLOW

#### 4.1 Pending Reward Timer System
```
When reward status = 'pending':
1. Create reward_timer record
2. Set expires_at = NOW() + 72 hours
3. Trigger cron-timers Edge Function (runs every hour)
4. Check for upgrades that make rewards claimable
5. If timer expires → Trigger rollup
```

**Timer Check on Upgrade:**
```sql
-- When member upgrades to new level
-- Check all pending rewards for that member

UPDATE layer_rewards_X
SET status = 'claimable', expires_at = NULL
WHERE LOWER(root_wallet) = LOWER('upgraded_member_wallet')
AND status = 'pending'
AND recipient_required_level <= <new_level>;

-- Sync to user_balances
UPDATE user_balances
SET total_usdt_earned = total_usdt_earned + <newly_claimable_amount>
WHERE LOWER(wallet_address) = LOWER('upgraded_member_wallet');
```

---

#### 4.2 Reward Rollup Flow (Expired Pending)
```
When timer expires (72 hours):
1. Find next qualified upline in matrix
2. If found:
   ├─ Create new reward for upline (claimable if qualified)
   ├─ Update original reward: status = 'rolled_up'
   └─ Create rollup_history record
3. If no qualified upline found:
   └─ Update reward: status = 'forfeited'
```

**Rollup Logic:**
```sql
-- Find expired pending rewards
SELECT * FROM layer_rewards_X
WHERE status = 'pending'
AND expires_at < NOW();

-- For each expired reward:
-- 1. Find next upline
WITH next_upline AS (
  SELECT parent_wallet
  FROM matrix_referrals
  WHERE LOWER(wallet_address) = LOWER(current_root_wallet)
  AND layer = <current_layer>
)

-- 2. Check if upline is qualified
-- 3. If qualified, create new reward:
INSERT INTO layer_rewards_X (
  root_wallet,  -- next upline
  referral_wallet,  -- original triggering member
  reward_usdt,
  status,  -- 'claimable' if upline qualified
  ...
);

-- 4. Update original reward
UPDATE layer_rewards_X
SET status = 'rolled_up', rolled_up_to = <next_upline_wallet>
WHERE id = <original_reward_id>;

-- 5. Create rollup history
INSERT INTO reward_rollup_history (
  original_reward_id,
  original_recipient,
  rolled_up_to,
  rollup_reason,
  created_at
) VALUES (
  <original_reward_id>,
  <original_root_wallet>,
  <next_upline_wallet>,
  'Timer expired - rolled up to next upline',
  NOW()
);
```

---

### PHASE 5: COMPREHENSIVE VALIDATION QUERIES

#### 5.1 Full Member State Query
```sql
-- COMPLETE MEMBER STATE VERIFICATION
WITH member_info AS (
  SELECT
    m.wallet_address,
    m.activation_sequence,
    m.current_level,
    m.levels_owned,
    m.referrer_wallet,
    m.activation_time
  FROM members m
  WHERE LOWER(m.wallet_address) = LOWER('test_wallet')
),
balance_info AS (
  SELECT
    ub.bcc_balance,
    ub.bcc_locked,
    ub.total_usdt_earned,
    ub.reward_balance
  FROM user_balances ub
  WHERE LOWER(ub.wallet_address) = LOWER('test_wallet')
),
referral_counts AS (
  SELECT
    COUNT(*) as direct_referrals
  FROM referrals
  WHERE LOWER(referrer_wallet) = LOWER('test_wallet')
),
matrix_info AS (
  SELECT
    COUNT(*) as matrix_placements,
    MAX(layer) as max_layer
  FROM matrix_referrals
  WHERE LOWER(wallet_address) = LOWER('test_wallet')
),
rewards_summary AS (
  SELECT
    'direct_rewards' as type,
    COUNT(*) as total,
    SUM(CASE WHEN status = 'claimable' THEN reward_usdt ELSE 0 END) as claimable,
    SUM(CASE WHEN status = 'pending' THEN reward_usdt ELSE 0 END) as pending
  FROM direct_rewards
  WHERE LOWER(root_wallet) = LOWER('test_wallet')

  UNION ALL

  SELECT
    'layer_rewards_2' as type,
    COUNT(*),
    SUM(CASE WHEN status = 'claimable' THEN reward_usdt ELSE 0 END),
    SUM(CASE WHEN status = 'pending' THEN reward_usdt ELSE 0 END)
  FROM layer_rewards_2
  WHERE LOWER(root_wallet) = LOWER('test_wallet')

  -- Repeat for layer_rewards_3 to layer_rewards_19...
)

SELECT
  mi.*,
  bi.*,
  rc.direct_referrals,
  mt.matrix_placements,
  mt.max_layer
FROM member_info mi
CROSS JOIN balance_info bi
CROSS JOIN referral_counts rc
CROSS JOIN matrix_info mt;

-- Plus rewards summary
SELECT * FROM rewards_summary;
```

---

#### 5.2 BCC Release Audit Query
```sql
-- BCC RELEASE HISTORY AUDIT
SELECT
  to_level,
  bcc_released,
  bcc_remaining_locked,
  release_reason,
  unlock_sequence,
  created_at
FROM bcc_release_logs
WHERE LOWER(wallet_address) = LOWER('test_wallet')
ORDER BY to_level, unlock_sequence;

-- Verify totals match
WITH release_totals AS (
  SELECT
    COALESCE(SUM(bcc_released), 0) as total_released
  FROM bcc_release_logs
  WHERE LOWER(wallet_address) = LOWER('test_wallet')
),
current_balance AS (
  SELECT
    bcc_balance,
    bcc_locked
  FROM user_balances
  WHERE LOWER(wallet_address) = LOWER('test_wallet')
)

SELECT
  rt.total_released + 500 as expected_balance,  -- +500 activation
  cb.bcc_balance as actual_balance,
  (rt.total_released + 500 = cb.bcc_balance) as balance_matches
FROM release_totals rt
CROSS JOIN current_balance cb;
```

---

#### 5.3 Reward Rollup Audit Query
```sql
-- REWARD ROLLUP HISTORY
SELECT
  rr.original_reward_id,
  rr.original_recipient,
  rr.rolled_up_to,
  rr.rollup_reason,
  rr.created_at,
  lr.reward_usdt,
  lr.status as original_status
FROM reward_rollup_history rr
LEFT JOIN layer_rewards_2 lr ON lr.id = rr.original_reward_id
WHERE LOWER(rr.original_recipient) = LOWER('test_wallet')
   OR LOWER(rr.rolled_up_to) = LOWER('test_wallet')
ORDER BY rr.created_at DESC;
```

---

## TEST EXECUTION CHECKLIST

### ✅ Level 1 Activation Checklist
- [ ] User registration completed
- [ ] Referrer validated
- [ ] 130 USDT payment confirmed
- [ ] NFT Token ID 1 claimed on-chain
- [ ] Platform fee (30 USDT) recorded
- [ ] Membership record created
- [ ] Members record with activation_sequence
- [ ] Referral record created
- [ ] Matrix placements (up to 19 layers)
- [ ] Direct reward created (claimable/pending)
- [ ] Reward timer created (if pending)
- [ ] BCC initialized (500 + phase locked)
- [ ] BCC transactions logged (2 records)

### ✅ Level 2 Upgrade Checklist
- [ ] 3+ direct referrals verified
- [ ] 200 USDT payment confirmed
- [ ] NFT Token ID 2 claimed on-chain
- [ ] Membership record for L2 created
- [ ] Members updated (level=2, levels_owned={1,2})
- [ ] Layer rewards created (19 layers)
- [ ] Reward statuses correct (claimable/pending)
- [ ] Claimable rewards synced to user_balances
- [ ] Pending reward timers created
- [ ] BCC unlocked (100 BCC)
- [ ] BCC release log created
- [ ] BCC transaction logged
- [ ] Previously pending rewards checked & updated

### ✅ Level 3-18 Upgrade Checklist (Template)
- [ ] Payment confirmed (level * 100 USDT)
- [ ] NFT claimed (Token ID = level)
- [ ] Membership record created
- [ ] Members updated
- [ ] Layer rewards created (19 layers)
- [ ] BCC unlocked (50 * (level-1))
- [ ] BCC logs created
- [ ] Pending rewards checked

### ✅ Level 19 Upgrade Checklist (Special)
- [ ] 1900 USDT payment confirmed
- [ ] NFT Token ID 19 claimed
- [ ] Membership record created
- [ ] Members updated (level=19, all levels owned)
- [ ] Layer rewards created (19 layers)
- [ ] **First BCC unlock (950 BCC, sequence 1)**
- [ ] **Second BCC unlock (1000 BCC, sequence 2)**
- [ ] **Two BCC release logs created**
- [ ] Final balance: 10,100 available, 850 locked (Phase 1)

---

## EXPECTED FINAL STATE (Phase 1 Member at Level 19)

```sql
-- Member State
current_level: 19
levels_owned: {1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19}
activation_sequence: <1-10000>

-- BCC Balance
bcc_balance: 10,100 BCC
bcc_locked: 850 BCC

-- BCC Release Logs
19 records total (one per level 2-18, two for level 19)

-- Membership Records
19 records (one per level)

-- Matrix Placements
Up to 19 records (one per layer)

-- Direct Rewards
Varies (depends on referrals)

-- Layer Rewards
Depends on matrix structure and levels of uplines
```

---

## DATABASE SCHEMA VERIFICATION

### Required Tables:
1. ✅ users
2. ✅ members
3. ✅ membership
4. ✅ referrals
5. ✅ matrix_referrals
6. ✅ direct_rewards
7. ✅ layer_rewards_2 through layer_rewards_19 (18 tables)
8. ✅ reward_timers
9. ✅ reward_rollup_history
10. ✅ user_balances
11. ✅ bcc_release_logs
12. ✅ bcc_transactions
13. ✅ platform_fees

### Required Edge Functions:
1. ✅ thirdweb-webhook (or check-transfer-status)
2. ✅ activate-membership
3. ✅ level-upgrade
4. ✅ bcc-release-system
5. ✅ cron-timers (reward timer processor)
6. ✅ process-rewards (claim/rollup)

### Required Database Functions:
1. ✅ get_next_activation_sequence()
2. ✅ recursive_matrix_placement()
3. ✅ trigger_layer_rewards_on_upgrade()
4. ✅ trigger_direct_referral_rewards()
5. ✅ check_pending_rewards_after_upgrade()

---

## NEXT STEPS

1. **Execute Level 1 Test**:
   - Use test wallet
   - Complete full activation flow
   - Verify all 13 checkpoints

2. **Execute Level 2 Test**:
   - Ensure 3+ direct referrals
   - Complete upgrade flow
   - Verify all 13 checkpoints

3. **Execute Level 19 Test**:
   - Complete all intermediate levels
   - Verify double BCC unlock
   - Confirm final balances

4. **Test Reward Timers**:
   - Create pending rewards
   - Wait for/simulate expiry
   - Verify rollup logic

5. **Generate Final Report**:
   - Document all findings
   - List any discrepancies
   - Provide recommendations

---

**Report Generated**: 2025-10-06
**Test Status**: Ready for Execution
**Next Action**: Begin Level 1 activation test with test wallet

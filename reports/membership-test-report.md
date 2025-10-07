# Membership Domain — Test Report & Validation Matrix

**Document Version**: 1.0
**Created**: 2025-10-08
**Status**: Test Plan
**Scope**: Comprehensive test scenarios for membership activation and upgrades

---

## Executive Summary

This document defines the **complete test strategy** for the membership domain, including:
1. Test scenarios for all upgrade paths (L1, L2, L3-19)
2. Edge Function validation tests
3. Database integrity tests
4. Frontend integration tests
5. Expected results and assertions

### Testing Philosophy
- **Server-Side First**: Validate Edge Functions before frontend
- **Database Integrity**: Verify all triggers and constraints
- **Business Rules**: Test all gates and requirements
- **Error Paths**: Test failure cases, not just happy paths
- **End-to-End**: Complete user journeys

---

## 1. Test Environment Setup

### 1.1 Prerequisites

#### Test Accounts Required
```typescript
const TEST_ACCOUNTS = {
  // Test wallets
  newUser: '0x0000000000000000000000000000000000000001',
  referrerWithLevel1: '0x0000000000000000000000000000000000000002',
  referrerWithNoReferrals: '0x0000000000000000000000000000000000000003',
  userWith3Referrals: '0x0000000000000000000000000000000000000004',
  userWithLevel5: '0x0000000000000000000000000000000000000005',

  // Default referrer (from config)
  defaultReferrer: '0x3C1FF5B4BE2A1FB8c157aF55aa6450eF66D7E242'
};
```

#### Test Data Setup
```sql
-- Clean slate (for fresh tests)
DELETE FROM direct_rewards WHERE recipient_wallet LIKE '0x00000000000000000000000000000000000000%';
DELETE FROM layer_rewards WHERE recipient_wallet LIKE '0x00000000000000000000000000000000000000%';
DELETE FROM matrix_slots WHERE member_id IN (
  SELECT member_id FROM members WHERE wallet_address LIKE '0x00000000000000000000000000000000000000%'
);
DELETE FROM direct_referrals WHERE referrer_wallet LIKE '0x00000000000000000000000000000000000000%';
DELETE FROM members WHERE wallet_address LIKE '0x00000000000000000000000000000000000000%';

-- Setup: Referrer with Level 1
INSERT INTO members (wallet_address, referrer_wallet, current_level, activation_sequence, activation_time)
VALUES ('0x0000000000000000000000000000000000000002', '0x3c1ff5b4be2a1fb8c157af55aa6450ef66d7e242', 1, 1, NOW());

-- Setup: User with 3 referrals
INSERT INTO members (wallet_address, referrer_wallet, current_level, activation_sequence, activation_time)
VALUES ('0x0000000000000000000000000000000000000004', '0x0000000000000000000000000000000000000002', 1, 2, NOW());

INSERT INTO direct_referrals (referrer_wallet, referred_wallet)
VALUES
  ('0x0000000000000000000000000000000000000004', '0x1111111111111111111111111111111111111111'),
  ('0x0000000000000000000000000000000000000004', '0x2222222222222222222222222222222222222222'),
  ('0x0000000000000000000000000000000000000004', '0x3333333333333333333333333333333333333333');

-- Setup: User with Level 5
INSERT INTO members (wallet_address, referrer_wallet, current_level, activation_sequence, activation_time)
VALUES ('0x0000000000000000000000000000000000000005', '0x0000000000000000000000000000000000000002', 5, 3, NOW());
```

#### Test USDT Balance
```typescript
// Ensure test wallets have USDT
// Arbitrum testnet: Faucet or transfer
// Mainnet: Use test wallet with sufficient balance
```

---

## 2. Level 1 Activation Tests

### 2.1 Happy Path: New User Activation

#### Test Case: TC-L1-001
**Scenario**: New user with valid referrer activates Level 1

**Preconditions**:
- User wallet: `0x0000000000000000000000000000000000000001`
- Referrer wallet: `0x0000000000000000000000000000000000000002` (has Level 1)
- User not in `members` table
- User has ≥130 USDT

**Steps**:
1. Navigate to `/welcome?ref=0x0000000000000000000000000000000000000002`
2. Connect wallet `0x...0001`
3. Click "Activate Level 1 Membership"
4. Approve 130 USDT
5. Claim NFT (tokenId=1, quantity=1)
6. Wait for backend activation

**Expected Results**:
```typescript
// ✅ Blockchain
const nftBalance = await balanceOf(nftContract, userWallet, 1);
expect(nftBalance).toBe(1); // User owns Level 1 NFT

// ✅ Database: members table
const { data: member } = await supabase
  .from('members')
  .select('*')
  .eq('wallet_address', '0x0000000000000000000000000000000000000001')
  .single();

expect(member).toMatchObject({
  wallet_address: '0x0000000000000000000000000000000000000001',
  referrer_wallet: '0x0000000000000000000000000000000000000002',
  current_level: 1,
  activation_sequence: expect.any(Number), // Auto-increment
  activation_time: expect.any(String) // ISO timestamp
});

// ✅ Database: direct_rewards
const { data: reward } = await supabase
  .from('direct_rewards')
  .select('*')
  .eq('referrer_wallet', '0x0000000000000000000000000000000000000002')
  .eq('referred_wallet', '0x0000000000000000000000000000000000000001')
  .single();

expect(reward).toMatchObject({
  level: 1,
  amount_usd: expect.any(Number), // From platform_params
  status: 'pending',
  timer_end: expect.any(String) // NOW() + 72 hours
});

// ✅ Database: matrix_slots
const { data: slot } = await supabase
  .from('matrix_slots')
  .select('*')
  .eq('member_id', member.member_id)
  .single();

expect(slot).toMatchObject({
  parent_slot_id: expect.any(String), // Referrer's slot
  layer: expect.any(Number), // Determined by BFS
  slot_position: expect.stringMatching(/^[LMR]$/), // L, M, or R
  slot_num_seq: expect.any(Number) // BFS order
});

// ✅ Frontend: Redirect to dashboard
expect(window.location.pathname).toBe('/dashboard');
```

**Pass Criteria**: All assertions pass

---

### 2.2 Error Case: Invalid Referrer

#### Test Case: TC-L1-002
**Scenario**: New user tries to activate with non-existent referrer

**Preconditions**:
- User wallet: `0x0000000000000000000000000000000000000001`
- Referrer wallet: `0x9999999999999999999999999999999999999999` (DOES NOT EXIST)

**Steps**:
1. Navigate to `/welcome?ref=0x9999999999999999999999999999999999999999`
2. Connect wallet
3. Click "Activate Level 1 Membership"

**Expected Results**:
```typescript
// ❌ Edge Function response
const response = await fetch('/functions/v1/activate-membership', {
  method: 'POST',
  body: JSON.stringify({
    walletAddress: '0x0000000000000000000000000000000000000001',
    referrerWallet: '0x9999999999999999999999999999999999999999',
    transactionHash: '0x...',
    level: 1
  })
});

expect(response.status).toBe(400);
const error = await response.json();
expect(error).toMatchObject({
  success: false,
  error: {
    code: 'INVALID_REFERRER',
    message: expect.stringContaining('Referrer does not exist')
  }
});

// ✅ Database: No changes
const { count } = await supabase
  .from('members')
  .select('*', { count: 'exact', head: true })
  .eq('wallet_address', '0x0000000000000000000000000000000000000001');

expect(count).toBe(0); // User not created

// ✅ Frontend: Error toast shown
expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('invalid referrer'));
```

**Pass Criteria**: Error handled gracefully, no database changes

---

### 2.3 Error Case: Self-Referral

#### Test Case: TC-L1-003
**Scenario**: User tries to refer themselves

**Preconditions**:
- User wallet: `0x0000000000000000000000000000000000000001`
- Referrer wallet: `0x0000000000000000000000000000000000000001` (SAME)

**Steps**:
1. Navigate to `/welcome?ref=0x0000000000000000000000000000000000000001`
2. Connect wallet `0x...0001`
3. Click "Activate Level 1 Membership"

**Expected Results**:
```typescript
// ❌ Edge Function response
expect(response.status).toBe(400);
expect(error.error.code).toBe('SELF_REFERRAL');

// ✅ Database: No changes
const { count } = await supabase
  .from('members')
  .select('*', { count: 'exact', head: true })
  .eq('wallet_address', '0x0000000000000000000000000000000000000001');

expect(count).toBe(0);
```

**Pass Criteria**: Self-referral blocked

---

### 2.4 Error Case: Already Activated

#### Test Case: TC-L1-004
**Scenario**: User with Level 1 tries to activate again

**Preconditions**:
- User wallet: `0x0000000000000000000000000000000000000002` (already Level 1)

**Steps**:
1. Navigate to `/welcome`
2. Connect wallet `0x...0002`

**Expected Results**:
```typescript
// ✅ Frontend: Auto-redirect to dashboard (before showing claim button)
expect(window.location.pathname).toBe('/dashboard');

// OR if they somehow bypass redirect and call Edge Function:
expect(response.status).toBe(409);
expect(error.error.code).toBe('ALREADY_ACTIVATED');
```

**Pass Criteria**: User redirected or blocked

---

### 2.5 Error Case: Insufficient USDT

#### Test Case: TC-L1-005
**Scenario**: User has <130 USDT

**Preconditions**:
- User wallet: `0x0000000000000000000000000000000000000001`
- USDT balance: 100 USDT (<130 required)

**Steps**:
1. Navigate to `/welcome`
2. Connect wallet
3. Click "Activate Level 1 Membership"

**Expected Results**:
```typescript
// ❌ Frontend: Error before approval
expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Insufficient USDT'));

// OR if user somehow proceeds:
// ❌ Blockchain: Transaction reverts
try {
  await sendTransaction(approveTransaction);
} catch (error) {
  expect(error.message).toContain('insufficient funds');
}
```

**Pass Criteria**: User informed, transaction doesn't proceed

---

### 2.6 Edge Case: Transaction Hash Reused

#### Test Case: TC-L1-006
**Scenario**: Same transaction hash submitted twice

**Preconditions**:
- Transaction hash `0xABC123...` already processed

**Steps**:
1. Call Edge Function with same tx hash

**Expected Results**:
```typescript
expect(response.status).toBe(409);
expect(error.error.code).toBe('TRANSACTION_EXISTS');

// ✅ Database: No duplicate records
const { count } = await supabase
  .from('members')
  .select('*', { count: 'exact', head: true })
  .eq('wallet_address', userWallet);

expect(count).toBe(1); // Only one record, not two
```

**Pass Criteria**: Duplicate transaction blocked

---

## 3. Level 2 Upgrade Tests

### 3.1 Happy Path: L1 → L2 with 3+ Referrals

#### Test Case: TC-L2-001
**Scenario**: User with Level 1 and 3 direct referrals upgrades to Level 2

**Preconditions**:
- User wallet: `0x0000000000000000000000000000000000000004`
- Current level: 1
- Direct referrals count: 3
- User has ≥150 USDT

**Steps**:
1. Navigate to `/membership`
2. Connect wallet `0x...0004`
3. Verify "Level 2" card shows "Available"
4. Click "Upgrade to Level 2"
5. Approve 150 USDT
6. Claim NFT (tokenId=2, quantity=1)
7. Wait for backend activation

**Expected Results**:
```typescript
// ✅ Blockchain
const nftBalance = await balanceOf(nftContract, userWallet, 2);
expect(nftBalance).toBe(1); // User owns Level 2 NFT

// ✅ Database: members table updated
const { data: member } = await supabase
  .from('members')
  .select('current_level')
  .eq('wallet_address', '0x0000000000000000000000000000000000000004')
  .single();

expect(member.current_level).toBe(2); // Upgraded from 1 to 2

// ✅ Database: layer_rewards created for ancestors
const { data: layerRewards } = await supabase
  .from('layer_rewards')
  .select('*')
  .eq('source_wallet', '0x0000000000000000000000000000000000000004')
  .eq('level', 2);

expect(layerRewards.length).toBeGreaterThan(0); // Rewards for matrix ancestors
expect(layerRewards[0]).toMatchObject({
  recipient_wallet: expect.any(String), // Ancestor wallet
  layer_number: expect.any(Number), // 1-19
  amount_usd: expect.any(Number),
  status: 'pending'
});
```

**Pass Criteria**: All assertions pass, upgrade successful

---

### 3.2 Error Case: L1 with <3 Referrals

#### Test Case: TC-L2-002
**Scenario**: User with Level 1 but only 2 direct referrals tries to upgrade to Level 2

**Preconditions**:
- User wallet: `0x0000000000000000000000000000000000000003`
- Current level: 1
- Direct referrals count: 2 (<3 required)

**Steps**:
1. Navigate to `/membership`
2. Connect wallet
3. Observe Level 2 card

**Expected Results**:
```typescript
// ✅ Frontend: Level 2 card shows "Locked"
const level2Card = screen.getByTestId('card-membership-level-2');
expect(level2Card).toHaveTextContent('Locked');
expect(level2Card).toHaveTextContent('3+ direct referrals required');

// ✅ Frontend: Upgrade button disabled
const upgradeButton = screen.getByTestId('button-locked-2');
expect(upgradeButton).toBeDisabled();

// OR if user somehow bypasses frontend:
// ❌ Edge Function blocks
const response = await fetch('/functions/v1/level-upgrade', {
  method: 'POST',
  body: JSON.stringify({
    walletAddress: userWallet,
    targetLevel: 2,
    transactionHash: '0x...'
  })
});

expect(response.status).toBe(403);
expect(error.error.code).toBe('LEVEL_2_REFERRAL_GATE');
expect(error.error.message).toContain('3 direct referrals required');
```

**Pass Criteria**: User blocked from upgrading

---

### 3.3 Error Case: L0 User Tries L2

#### Test Case: TC-L2-003
**Scenario**: User without Level 1 tries to claim Level 2 directly

**Preconditions**:
- User wallet: `0x0000000000000000000000000000000000000001`
- Current level: 0 (not activated)

**Steps**:
1. Navigate to `/membership`
2. Connect wallet
3. Try to upgrade to Level 2

**Expected Results**:
```typescript
// ✅ Frontend: Shows "Activate Level 1 first" message
expect(screen.getByText(/activate.*level 1 first/i)).toBeInTheDocument();

// ❌ Edge Function blocks
expect(response.status).toBe(400);
expect(error.error.code).toBe('NOT_SEQUENTIAL');
expect(error.error.message).toContain('current level (0) != target level - 1 (1)');

// ✅ Database: No changes
const { data: member } = await supabase
  .from('members')
  .select('current_level')
  .eq('wallet_address', userWallet)
  .single();

expect(member?.current_level || 0).toBe(0); // Still 0
```

**Pass Criteria**: Sequential enforcement works

---

### 3.4 Error Case: L2 User Tries L2 Again

#### Test Case: TC-L2-004
**Scenario**: User already has Level 2, tries to claim again

**Preconditions**:
- User wallet has Level 2

**Steps**:
1. Try to claim Level 2 NFT again

**Expected Results**:
```typescript
// ❌ Blockchain: Transaction reverts (ERC-1155 logic)
// OR
// ❌ Edge Function: Already owned
expect(response.status).toBe(409);
expect(error.error.code).toBe('ALREADY_OWNED');

// ✅ Frontend: Level 2 card shows "Owned"
const level2Card = screen.getByTestId('card-membership-level-2');
expect(level2Card).toHaveTextContent('Owned');
```

**Pass Criteria**: Duplicate claim blocked

---

## 4. Level 3-19 Upgrade Tests

### 4.1 Happy Path: Sequential Upgrade (L5 → L6)

#### Test Case: TC-L3-001
**Scenario**: User with Level 5 upgrades to Level 6

**Preconditions**:
- User wallet: `0x0000000000000000000000000000000000000005`
- Current level: 5
- User has ≥ Level 6 price USDT (350 USDT)

**Steps**:
1. Navigate to `/membership`
2. Connect wallet `0x...0005`
3. Verify "Level 6" card shows "Available"
4. Click "Upgrade to Level 6"
5. Approve 350 USDT (Level 6 price)
6. Claim NFT (tokenId=6, quantity=1)
7. Wait for backend activation

**Expected Results**:
```typescript
// ✅ Blockchain
const nftBalance = await balanceOf(nftContract, userWallet, 6);
expect(nftBalance).toBe(1);

// ✅ Database: current_level updated
const { data: member } = await supabase
  .from('members')
  .select('current_level')
  .eq('wallet_address', userWallet)
  .single();

expect(member.current_level).toBe(6); // Upgraded from 5 to 6

// ✅ Database: layer_rewards created
const { data: layerRewards } = await supabase
  .from('layer_rewards')
  .select('*')
  .eq('source_wallet', userWallet)
  .eq('level', 6);

expect(layerRewards.length).toBeGreaterThan(0);
```

**Pass Criteria**: Sequential upgrade succeeds

---

### 4.2 Error Case: Level Skip (L5 → L8)

#### Test Case: TC-L3-002
**Scenario**: User with Level 5 tries to claim Level 8 directly (skip L6, L7)

**Preconditions**:
- User wallet: `0x0000000000000000000000000000000000000005`
- Current level: 5

**Steps**:
1. Try to call Edge Function with `targetLevel: 8`

**Expected Results**:
```typescript
// ❌ Edge Function blocks
expect(response.status).toBe(400);
expect(error.error.code).toBe('NOT_SEQUENTIAL');
expect(error.error.message).toContain('current level (5) != target level - 1 (7)');

// ✅ Database: No changes
const { data: member } = await supabase
  .from('members')
  .select('current_level')
  .eq('wallet_address', userWallet)
  .single();

expect(member.current_level).toBe(5); // Still 5, not 8
```

**Pass Criteria**: Level skipping prevented

---

### 4.3 Full Progression: L1 → L19

#### Test Case: TC-L3-003
**Scenario**: User upgrades sequentially from L1 all the way to L19

**Preconditions**:
- User wallet with Level 1
- Sufficient USDT for all upgrades

**Steps**:
```typescript
for (let targetLevel = 2; targetLevel <= 19; targetLevel++) {
  // Upgrade to next level
  await upgradeMembership(userWallet, targetLevel);

  // Verify current level updated
  const { data: member } = await supabase
    .from('members')
    .select('current_level')
    .eq('wallet_address', userWallet)
    .single();

  expect(member.current_level).toBe(targetLevel);

  // Verify NFT ownership
  const nftBalance = await balanceOf(nftContract, userWallet, targetLevel);
  expect(nftBalance).toBe(1);
}
```

**Expected Results**:
```typescript
// ✅ Final state
const { data: finalMember } = await supabase
  .from('members')
  .select('current_level')
  .eq('wallet_address', userWallet)
  .single();

expect(finalMember.current_level).toBe(19); // Max level

// ✅ All NFTs owned
for (let level = 1; level <= 19; level++) {
  const balance = await balanceOf(nftContract, userWallet, level);
  expect(balance).toBe(1);
}
```

**Pass Criteria**: All 19 levels claimed sequentially

---

## 5. Edge Function Tests

### 5.1 activate-membership Validation

#### Test Case: TC-EF-001
**Scenario**: Direct API call to activate-membership with valid data

**Test Request**:
```bash
curl -X POST https://jadewdnjfcdpbnygncrh.supabase.co/functions/v1/activate-membership \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{
    "walletAddress": "0x0000000000000000000000000000000000000001",
    "referrerWallet": "0x0000000000000000000000000000000000000002",
    "transactionHash": "0xABC123...",
    "level": 1
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "memberId": "uuid-here",
    "walletAddress": "0x0000000000000000000000000000000000000001",
    "currentLevel": 1,
    "activationTime": "2025-10-08T12:00:00Z",
    "referrerWallet": "0x0000000000000000000000000000000000000002",
    "matrixSlotId": "uuid-here",
    "directRewardId": "uuid-here"
  }
}
```

**Assertions**:
- HTTP 200
- `success: true`
- All required fields present
- Database changes committed

---

### 5.2 level-upgrade Validation (Level 2)

#### Test Case: TC-EF-002
**Scenario**: Direct API call to level-upgrade for Level 2

**Test Request**:
```bash
curl -X POST https://jadewdnjfcdpbnygncrh.supabase.co/functions/v1/level-upgrade \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{
    "walletAddress": "0x0000000000000000000000000000000000000004",
    "targetLevel": 2,
    "transactionHash": "0xDEF456..."
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "memberId": "uuid-here",
    "walletAddress": "0x0000000000000000000000000000000000000004",
    "previousLevel": 1,
    "currentLevel": 2,
    "upgradeTime": "2025-10-08T12:05:00Z",
    "layerRewardsCreated": 3
  }
}
```

**Assertions**:
- HTTP 200
- `previousLevel: 1`, `currentLevel: 2`
- `layerRewardsCreated > 0`

---

### 5.3 check-eligibility (To Implement)

#### Test Case: TC-EF-003
**Scenario**: Pre-check eligibility before transaction

**Test Request**:
```bash
curl -X POST https://jadewdnjfcdpbnygncrh.supabase.co/functions/v1/check-eligibility \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x0000000000000000000000000000000000000004",
    "targetLevel": 2
  }'
```

**Expected Response (Eligible)**:
```json
{
  "eligible": true,
  "requirements": {
    "currentLevel": 1,
    "targetLevel": 2,
    "hasActivation": true,
    "directReferralsCount": 3,
    "minimumReferrals": 3,
    "nextAllowedLevel": 2
  }
}
```

**Expected Response (Not Eligible)**:
```json
{
  "eligible": false,
  "reason": "Level 2 requires 3+ direct referrals. You have 2.",
  "requirements": {
    "currentLevel": 1,
    "targetLevel": 2,
    "hasActivation": true,
    "directReferralsCount": 2,
    "minimumReferrals": 3,
    "nextAllowedLevel": null
  }
}
```

**Assertions**:
- HTTP 200 (even if not eligible)
- `eligible` field accurate
- `reason` clear if not eligible

---

### 5.4 get-platform-params (To Implement)

#### Test Case: TC-EF-004
**Scenario**: Fetch dynamic configuration

**Test Request**:
```bash
curl https://jadewdnjfcdpbnygncrh.supabase.co/functions/v1/get-platform-params
```

**Expected Response**:
```json
{
  "levelPricing": {
    "1": 130,
    "2": 150,
    "3": 200,
    ...
    "19": 1000
  },
  "rewards": {
    "level_1_direct_reward": 100,
    "layer_1_reward_level_2": 20,
    ...
  },
  "gates": {
    "level_2_min_direct_referrals": 3
  },
  "contracts": {
    "nft_address": "0xe57332db0B8d7e6aF8a260a4fEcfA53104728693",
    "usdt_address": "0x6B174f1f3B7f92E048f0f15FD2b22c167DA6F008"
  },
  "defaults": {
    "default_referrer": "0x3C1FF5B4BE2A1FB8c157aF55aa6450eF66D7E242"
  }
}
```

**Assertions**:
- HTTP 200
- All levels 1-19 have pricing
- `level_2_min_direct_referrals === 3`

---

## 6. Database Integrity Tests

### 6.1 Sequential Level Constraint

#### Test Case: TC-DB-001
**Scenario**: Direct database update to skip level (should fail or be prevented)

**Test SQL**:
```sql
-- Try to update Level 1 → Level 5 (skip 2, 3, 4)
UPDATE members
SET current_level = 5
WHERE wallet_address = '0x0000000000000000000000000000000000000001'
  AND current_level = 1;
```

**Expected Result**:
```typescript
// Ideally: Database constraint or trigger prevents this
// OR: Edge Functions are the only way to update, no direct updates allowed

// After update, verify integrity
const { data: member } = await supabase
  .from('members')
  .select('current_level')
  .eq('wallet_address', '0x0000000000000000000000000000000000000001')
  .single();

// If constraint exists:
expect(member.current_level).toBe(1); // Still 1, update rejected

// If no constraint:
// This is a gap - Edge Functions must be the only write path
```

**Pass Criteria**: Sequential constraint enforced (either by DB or architecture)

---

### 6.2 Direct Referral Count Accuracy

#### Test Case: TC-DB-002
**Scenario**: Verify direct_referrals count matches actual referrals

**Test SQL**:
```sql
SELECT
  dr.referrer_wallet,
  COUNT(dr.referred_wallet) AS referral_count_table,
  (
    SELECT COUNT(*)
    FROM members m
    WHERE m.referrer_wallet = dr.referrer_wallet
  ) AS referral_count_members
FROM direct_referrals dr
GROUP BY dr.referrer_wallet;
```

**Expected Result**:
```typescript
// ✅ Counts should match
for (const row of results) {
  expect(row.referral_count_table).toBe(row.referral_count_members);
}
```

**Pass Criteria**: Counts consistent across tables

---

### 6.3 Matrix Slot Integrity

#### Test Case: TC-DB-003
**Scenario**: Verify matrix follows BFS + L→M→R rules

**Test SQL**:
```sql
SELECT
  ms.slot_id,
  ms.parent_slot_id,
  ms.layer,
  ms.slot_position,
  ms.slot_num_seq,
  COUNT(child.slot_id) AS children_count
FROM matrix_slots ms
LEFT JOIN matrix_slots child ON child.parent_slot_id = ms.slot_id
GROUP BY ms.slot_id
ORDER BY ms.slot_num_seq;
```

**Expected Result**:
```typescript
// ✅ Verify BFS order
const slots = await query();
for (let i = 1; i < slots.length; i++) {
  expect(slots[i].slot_num_seq).toBeGreaterThan(slots[i - 1].slot_num_seq);
}

// ✅ Verify L→M→R priority
const parent = slots.find(s => s.children_count > 0);
const children = slots.filter(s => s.parent_slot_id === parent.slot_id);

const positions = children.map(c => c.slot_position).sort();
// Should be ['L', 'M', 'R'] or subset in that order
expect(positions).toEqual(expect.arrayContaining(['L'])); // L filled first
if (children.length >= 2) expect(positions).toContain('M'); // Then M
if (children.length === 3) expect(positions).toContain('R'); // Then R
```

**Pass Criteria**: Matrix structure follows rules

---

### 6.4 Reward Status Transitions

#### Test Case: TC-DB-004
**Scenario**: Verify pending → claimable transition after 72 hours

**Test SQL**:
```sql
-- Create a test reward with timer expired
INSERT INTO direct_rewards (
  referrer_wallet,
  referred_wallet,
  level,
  amount_usd,
  status,
  timer_end
) VALUES (
  '0x0000000000000000000000000000000000000002',
  '0x0000000000000000000000000000000000000001',
  1,
  100,
  'pending',
  NOW() - INTERVAL '1 hour' -- Timer already expired
);

-- Trigger should update status to 'claimable'
-- (Depends on implementation: cron job or trigger)

-- Verify transition
SELECT status FROM direct_rewards
WHERE reward_id = '...';
```

**Expected Result**:
```typescript
expect(reward.status).toBe('claimable'); // Changed from 'pending'
```

**Pass Criteria**: Reward becomes claimable after timer

---

## 7. Frontend Integration Tests

### 7.1 Welcome Page Flow

#### Test Case: TC-FE-001
**Scenario**: Complete L1 activation flow from UI

**Steps**:
1. Navigate to `/welcome?ref=0x...`
2. Connect wallet
3. Observe referrer info displayed
4. Click "Activate Level 1"
5. Approve USDT in wallet
6. Confirm claim transaction
7. Wait for success toast
8. Verify redirect to `/dashboard`

**Assertions**:
```typescript
// ✅ Referrer info shown
expect(screen.getByText(/referred by/i)).toBeInTheDocument();
expect(screen.getByText(/0x0000...0002/)).toBeInTheDocument();

// ✅ Activation button enabled
const button = screen.getByRole('button', { name: /activate level 1/i });
expect(button).not.toBeDisabled();

// ✅ After success
await waitFor(() => {
  expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('activated'));
  expect(window.location.pathname).toBe('/dashboard');
});
```

**Pass Criteria**: End-to-end flow works

---

### 7.2 Membership Page Flow (Level 2)

#### Test Case: TC-FE-002
**Scenario**: Upgrade to Level 2 from UI

**Steps**:
1. Navigate to `/membership`
2. Connect wallet (has L1, 3+ referrals)
3. Observe Level 2 card shows "Available"
4. Click "Upgrade to Level 2"
5. Approve USDT
6. Confirm claim
7. Wait for success
8. Verify Level 2 card updates to "Owned"

**Assertions**:
```typescript
// ✅ Before upgrade
const level2Card = screen.getByTestId('card-membership-level-2');
expect(level2Card).toHaveTextContent('Available');
expect(level2Card).not.toHaveTextContent('Locked');

// ✅ Direct referrals shown
expect(screen.getByText(/direct referrals: 3/i)).toBeInTheDocument();

// ✅ After upgrade
await waitFor(() => {
  expect(level2Card).toHaveTextContent('Owned');
  expect(screen.getByText(/current level.*2/i)).toBeInTheDocument();
});
```

**Pass Criteria**: UI updates correctly

---

### 7.3 Error Handling (Insufficient Referrals)

#### Test Case: TC-FE-003
**Scenario**: User with <3 referrals sees Level 2 locked

**Steps**:
1. Navigate to `/membership`
2. Connect wallet (has L1, only 2 referrals)
3. Observe Level 2 card

**Assertions**:
```typescript
// ✅ Card shows locked
const level2Card = screen.getByTestId('card-membership-level-2');
expect(level2Card).toHaveTextContent('Locked');

// ✅ Requirement shown
expect(level2Card).toHaveTextContent(/3\+ direct referrals required/i);

// ✅ Current count shown
expect(screen.getByText(/direct referrals: 2/i)).toBeInTheDocument();

// ✅ Button disabled
const button = screen.getByTestId('button-locked-2');
expect(button).toBeDisabled();
```

**Pass Criteria**: Clear error messaging

---

## 8. Performance Tests

### 8.1 Edge Function Response Time

#### Test Case: TC-PERF-001
**Scenario**: Measure activate-membership response time

**Test**:
```typescript
const start = Date.now();
const response = await fetch('/functions/v1/activate-membership', {
  method: 'POST',
  body: JSON.stringify(validRequest)
});
const end = Date.now();
const duration = end - start;

expect(response.status).toBe(200);
expect(duration).toBeLessThan(2000); // <2s target (p95)
```

**Pass Criteria**: <2s for 95% of requests

---

### 8.2 Database View Query Performance

#### Test Case: TC-PERF-002
**Scenario**: Measure v_member_overview query time

**Test**:
```sql
EXPLAIN ANALYZE
SELECT * FROM v_member_overview
WHERE wallet_address = '0x0000000000000000000000000000000000000001';
```

**Expected**:
- Execution time: <200ms
- Uses index on `wallet_address`

**Pass Criteria**: Query optimized

---

## 9. Security Tests

### 9.1 SQL Injection Prevention

#### Test Case: TC-SEC-001
**Scenario**: Attempt SQL injection via wallet address

**Test Request**:
```json
{
  "walletAddress": "0x' OR '1'='1",
  "referrerWallet": "0x0000000000000000000000000000000000000002",
  "transactionHash": "0xABC",
  "level": 1
}
```

**Expected Result**:
```typescript
// ✅ Edge Function validates input
expect(response.status).toBe(400);
expect(error.error.code).toBe('INVALID_WALLET');

// ✅ No SQL injection executed
const { count } = await supabase
  .from('members')
  .select('*', { count: 'exact', head: true });

// Count should not change unexpectedly
```

**Pass Criteria**: Input validation prevents injection

---

### 9.2 Unlimited Approval Attack

#### Test Case: TC-SEC-002
**Scenario**: Verify exact approval amount (not MAX_UINT256)

**Test**:
```typescript
// ✅ Frontend code uses exact amount
const priceWei = BigInt(130) * BigInt(1_000_000);
const approveTransaction = approve({
  contract: usdtContract,
  spender: nftContract.address,
  amount: priceWei.toString() // Exact, not unlimited
});

// Verify on blockchain
const allowance = await usdtContract.allowance(userWallet, nftContract.address);
expect(allowance).toBe(priceWei); // Exactly 130 USDT, not MAX
```

**Pass Criteria**: Only exact amount approved

---

## 10. Test Execution Plan

### 10.1 Test Priority

#### P0 (Critical - Must Pass)
- TC-L1-001: Happy path Level 1 activation
- TC-L2-001: Happy path Level 2 upgrade (with referrals)
- TC-L3-001: Happy path sequential upgrade (L5 → L6)
- TC-L2-002: Block Level 2 without 3 referrals
- TC-L3-002: Block level skipping
- TC-EF-001: activate-membership Edge Function
- TC-EF-002: level-upgrade Edge Function

#### P1 (High - Should Pass)
- TC-L1-002: Invalid referrer
- TC-L1-003: Self-referral
- TC-L1-004: Already activated
- TC-L2-003: Non-sequential (L0 → L2)
- TC-DB-001: Sequential constraint
- TC-DB-002: Referral count accuracy
- TC-FE-001: Welcome page flow
- TC-FE-002: Membership page flow

#### P2 (Medium - Nice to Have)
- TC-L1-005: Insufficient USDT
- TC-L1-006: Transaction hash reused
- TC-L2-004: Duplicate Level 2 claim
- TC-L3-003: Full progression L1 → L19
- TC-DB-003: Matrix slot integrity
- TC-DB-004: Reward status transitions
- TC-FE-003: Error handling UI
- TC-PERF-001: Response time
- TC-SEC-001: SQL injection prevention
- TC-SEC-002: Exact approval

---

### 10.2 Test Automation

#### Unit Tests (Jest + React Testing Library)
```typescript
// src/components/membership/__tests__/MembershipActivationButton.test.tsx
describe('MembershipActivationButton', () => {
  it('TC-L1-001: activates Level 1 successfully', async () => {
    // Test implementation
  });

  it('TC-L1-002: shows error for invalid referrer', async () => {
    // Test implementation
  });
});
```

#### Integration Tests (Playwright)
```typescript
// e2e/membership.spec.ts
test('TC-FE-001: Complete L1 activation flow', async ({ page }) => {
  await page.goto('/welcome?ref=0x...');
  await page.click('[data-testid="connect-wallet"]');
  // ... rest of flow
  await expect(page).toHaveURL('/dashboard');
});
```

#### API Tests (Supertest or curl scripts)
```bash
#!/bin/bash
# tests/edge-functions/activate-membership.sh

# TC-EF-001
response=$(curl -s -X POST ...)
echo "$response" | jq -e '.success == true'
```

---

### 10.3 CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Membership Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run unit tests
        run: npm run test:unit
      - name: Run integration tests
        run: npm run test:integration
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Test Edge Functions
        run: npm run test:edge-functions
```

---

## 11. Test Report Template

### Test Execution Summary

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Environment**: [Testnet / Mainnet]
**Build Version**: [Git commit hash]

| Priority | Total | Passed | Failed | Skipped | Pass Rate |
|----------|-------|--------|--------|---------|-----------|
| P0       | 7     | ?      | ?      | ?       | ?%        |
| P1       | 8     | ?      | ?      | ?       | ?%        |
| P2       | 10    | ?      | ?      | ?       | ?%        |
| **Total**| **25**| **?**  | **?**  | **?**   | **?%**    |

### Failed Tests

| Test ID | Description | Failure Reason | Severity |
|---------|-------------|----------------|----------|
| TC-X-YYY| ...         | ...            | Critical |

### Recommendations

1. ...
2. ...

---

## Appendix: Test Data Cleanup

### After Test Execution
```sql
-- Clean up test data
DELETE FROM direct_rewards WHERE recipient_wallet LIKE '0x00000000000000000000000000000000000000%';
DELETE FROM layer_rewards WHERE recipient_wallet LIKE '0x00000000000000000000000000000000000000%';
DELETE FROM matrix_slots WHERE member_id IN (
  SELECT member_id FROM members WHERE wallet_address LIKE '0x00000000000000000000000000000000000000%'
);
DELETE FROM direct_referrals WHERE referrer_wallet LIKE '0x00000000000000000000000000000000000000%';
DELETE FROM members WHERE wallet_address LIKE '0x00000000000000000000000000000000000000%';
DELETE FROM registered_users WHERE wallet_address LIKE '0x00000000000000000000000000000000000000%';
```

---

**Document Control**:
- Created: 2025-10-08
- Last Updated: 2025-10-08
- Next Review: After test execution
- Status: Test Plan Ready

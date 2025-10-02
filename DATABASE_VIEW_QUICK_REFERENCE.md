# BEEHIVE Database View Quick Reference
**Last Updated:** 2025-10-03

---

## Quick Start: What View Should I Use?

### Frontend Data Access

| What You Need | Use This View | Don't Use |
|---------------|---------------|-----------|
| User profile data | `v_member_overview` | `members`, `users`, `user_balances` |
| Wallet balances | `v_member_overview` | `user_balances` |
| Reward summary counts | `v_reward_overview` | `layer_rewards` (direct) |
| Reward detail list | `reward_claims_dashboard` | `layer_rewards` (direct) |
| Matrix position | `v_matrix_overview` | `matrix_referrals` |
| Member requirements | `member_requirements_view` | `member_requirements` |
| Activity log | `user_activity_log` | `audit_logs` |

### Edge Function Data Access

**Pattern:**
- READ operations (queries) → Use views
- WRITE operations (insert/update) → Use tables directly

```typescript
// ✅ CORRECT - Read from view
const { data } = await supabase
  .from('v_member_overview')
  .select('*')
  .eq('wallet_address', walletAddress)
  .single();

// ✅ CORRECT - Write to table
const { error } = await supabase
  .from('layer_rewards')
  .insert({ ...rewardData });
```

---

## Canonical Views (Use These!)

### 1. v_member_overview ⭐ CANONICAL
**Purpose:** Single source of truth for member data

**Columns:**
```typescript
{
  member_id: uuid;           // Same as wallet_address
  wallet_address: string;    // Ethereum address
  username: string | null;   // Display name
  email: string | null;      // Email address
  is_active: boolean;        // current_level >= 1
  is_activated: boolean;     // Has activated membership
  current_level: number;     // NFT level (0-19)
  available_usd: number;     // Claimable balance
  pending_usd: number;       // Pending rewards sum
  lifetime_earned_usd: number; // Total earned ever
  activated_at: Date | null; // Activation timestamp
  referrer_member_id: string | null; // Referrer wallet
  total_direct_referrals: number;
  total_team_size: number;
  levels_owned: number[];    // Array of owned levels
  has_pending_rewards: boolean;
  last_upgrade_at: Date | null;
  bcc_transferable: number;
  bcc_locked: number;
  created_at: Date;
  updated_at: Date;
}
```

**Example Usage:**
```typescript
// Get member profile
const { data: member } = await supabase
  .from('v_member_overview')
  .select('*')
  .eq('wallet_address', walletAddress)
  .single();

// Get all active members
const { data: activeMembers } = await supabase
  .from('v_member_overview')
  .select('wallet_address, username, current_level, available_usd')
  .eq('is_active', true)
  .order('lifetime_earned_usd', { ascending: false });
```

---

### 2. v_reward_overview ⭐ CANONICAL
**Purpose:** Reward statistics and summaries per member

**Columns:**
```typescript
{
  member_id: uuid;
  claimable_cnt: number;        // Count of claimable rewards
  pending_cnt: number;          // Count of pending rewards
  rolled_up_cnt: number;        // Count of rolled up rewards
  expired_cnt: number;          // Count of expired rewards
  paid_cnt: number;             // Count of claimed rewards
  claimable_amount_usd: number; // Sum of claimable
  pending_amount_usd: number;   // Sum of pending
  paid_amount_usd: number;      // Sum of claimed
  expired_amount_usd: number;   // Sum of expired
  rolled_up_amount_usd: number; // Sum of rolled up
  next_expiring_at: Date | null; // Next expiration
}
```

**Example Usage:**
```typescript
// Get reward summary for dashboard
const { data: rewards } = await supabase
  .from('v_reward_overview')
  .select('*')
  .eq('member_id', walletAddress)
  .single();

console.log(`Claimable: ${rewards.claimable_cnt} (${rewards.claimable_amount_usd} USD)`);
console.log(`Pending: ${rewards.pending_cnt} (${rewards.pending_amount_usd} USD)`);
```

---

### 3. v_matrix_overview ⭐ CANONICAL
**Purpose:** Matrix position and structure per member

**Columns:**
```typescript
{
  member_id: uuid;              // Member wallet
  root_member_id: uuid;         // Matrix root wallet
  layer_index: number;          // Layer 1-19
  slot_index: number;           // 0=Left, 1=Middle, 2=Right
  slot_name: 'L' | 'M' | 'R';  // Position name
  slot_num_seq: number;         // Stable sequence in layer
  parent_node_id: uuid | null;  // Parent wallet
  placed_at: Date;              // Placement timestamp
  referrer_wallet: uuid;        // Who placed this member
  placement_type: 'direct' | 'spillover';
}
```

**Example Usage:**
```typescript
// Get all matrix positions for a member
const { data: positions } = await supabase
  .from('v_matrix_overview')
  .select('*')
  .eq('member_id', walletAddress)
  .order('layer_index');

// Get specific layer
const { data: layer1 } = await supabase
  .from('v_matrix_overview')
  .select('*')
  .eq('root_member_id', rootWallet)
  .eq('layer_index', 1);
```

---

## Supporting Views

### reward_claims_dashboard
**Purpose:** Detailed reward claims with user context

**Use When:** Displaying reward history, reward detail pages

```typescript
const { data: rewardDetails } = await supabase
  .from('reward_claims_dashboard')
  .select('*')
  .eq('root_wallet', walletAddress)
  .order('created_at', { ascending: false })
  .limit(20);
```

---

### member_requirements_view
**Purpose:** Member upgrade requirements and referral gates

**Use When:** Checking if user can upgrade, claim rewards

```typescript
const { data: requirements } = await supabase
  .from('member_requirements_view')
  .select('*')
  .eq('wallet_address', walletAddress)
  .single();

if (requirements.can_claim_first_two_direct) {
  // User can claim first 2 direct referral rewards
}
```

---

### user_activity_log
**Purpose:** User activity from audit logs

**Use When:** Displaying activity feed, audit trail

```typescript
const { data: activity } = await supabase
  .from('user_activity_log')
  .select('*')
  .eq('wallet_address', walletAddress)
  .order('created_at', { ascending: false })
  .limit(50);
```

---

### v_pending_rewards_with_timers
**Purpose:** Pending rewards with countdown timer data

**Use When:** Displaying countdown timers for pending rewards

```typescript
const { data: pendingWithTimers } = await supabase
  .from('v_pending_rewards_with_timers')
  .select('*')
  .eq('reward_recipient_wallet', walletAddress);

pendingWithTimers.forEach(reward => {
  console.log(`Reward: $${reward.reward_amount}`);
  console.log(`Time remaining: ${reward.time_remaining_seconds}s`);
  console.log(`Expired: ${reward.timer_is_expired}`);
});
```

---

### matrix_layer_details
**Purpose:** Detailed layer information with member data

**Use When:** Matrix tree visualization, layer analysis

```typescript
const { data: layerMembers } = await supabase
  .from('matrix_layer_details')
  .select('*')
  .eq('matrix_root_wallet', rootWallet)
  .eq('matrix_layer', layerNumber)
  .order('matrix_position');
```

---

### referrals_stats_view
**Purpose:** Referral statistics aggregated

**Use When:** Displaying referral counts, team statistics

```typescript
const { data: stats } = await supabase
  .from('referrals_stats_view')
  .select('*')
  .eq('referrer_wallet', walletAddress)
  .single();

console.log(`Total: ${stats.total_referrals}`);
console.log(`Direct: ${stats.direct_referrals}`);
console.log(`Spillover: ${stats.spillover_referrals}`);
```

---

## Common Queries

### Get Complete Member Profile
```typescript
async function getMemberProfile(walletAddress: string) {
  const [member, rewards, matrix] = await Promise.all([
    supabase
      .from('v_member_overview')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single(),
    supabase
      .from('v_reward_overview')
      .select('*')
      .eq('member_id', walletAddress)
      .single(),
    supabase
      .from('v_matrix_overview')
      .select('*')
      .eq('member_id', walletAddress)
  ]);

  return {
    member: member.data,
    rewards: rewards.data,
    matrixPositions: matrix.data
  };
}
```

### Get Reward Dashboard Data
```typescript
async function getRewardDashboard(walletAddress: string) {
  const [summary, details, pending] = await Promise.all([
    supabase
      .from('v_reward_overview')
      .select('*')
      .eq('member_id', walletAddress)
      .single(),
    supabase
      .from('reward_claims_dashboard')
      .select('*')
      .eq('root_wallet', walletAddress)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('v_pending_rewards_with_timers')
      .select('*')
      .eq('reward_recipient_wallet', walletAddress)
  ]);

  return {
    summary: summary.data,
    recentClaims: details.data,
    pendingRewards: pending.data
  };
}
```

### Get Matrix Tree
```typescript
async function getMatrixTree(rootWallet: string, layerNumber: number) {
  const { data } = await supabase
    .from('matrix_layer_details')
    .select('*')
    .eq('matrix_root_wallet', rootWallet)
    .eq('matrix_layer', layerNumber)
    .order('matrix_position');

  return data;
}
```

---

## Migration Guide

### Updating Existing Code

**Before (OLD - Don't do this):**
```typescript
// ❌ Multiple queries, direct table access
const { data: member } = await supabase
  .from('members')
  .select('*')
  .eq('wallet_address', walletAddress)
  .single();

const { data: balance } = await supabase
  .from('user_balances')
  .select('*')
  .eq('wallet_address', walletAddress)
  .single();

const { data: user } = await supabase
  .from('users')
  .select('username, email')
  .eq('wallet_address', walletAddress)
  .single();

// Combine manually in frontend...
```

**After (NEW - Do this):**
```typescript
// ✅ Single query, canonical view
const { data: member } = await supabase
  .from('v_member_overview')
  .select('*')
  .eq('wallet_address', walletAddress)
  .single();

// All data is already combined!
```

---

**Before (OLD):**
```typescript
// ❌ Manual aggregation
const { data: rewards } = await supabase
  .from('layer_rewards')
  .select('status, reward_amount')
  .eq('reward_recipient_wallet', walletAddress);

const claimable = rewards.filter(r => r.status === 'claimable');
const pending = rewards.filter(r => r.status === 'pending');
const claimableTotal = claimable.reduce((sum, r) => sum + r.reward_amount, 0);
```

**After (NEW):**
```typescript
// ✅ Pre-aggregated view
const { data: rewards } = await supabase
  .from('v_reward_overview')
  .select('*')
  .eq('member_id', walletAddress)
  .single();

// Already aggregated!
console.log(rewards.claimable_cnt);
console.log(rewards.claimable_amount_usd);
```

---

## View Catalog

Query the view catalog to see all available views:

```sql
SELECT
  view_name,
  category,
  CASE WHEN is_canonical THEN '⭐ CANONICAL' ELSE 'Supporting' END as type,
  description,
  usage_notes
FROM view_catalog
WHERE is_canonical = true
ORDER BY category, view_name;
```

---

## Best Practices

### DO ✅
- Use canonical views (`v_*`) for frontend queries
- Use supporting views for specific use cases
- Write directly to tables for INSERT/UPDATE operations
- Combine multiple view queries with `Promise.all()`
- Filter and sort in the database, not in JavaScript

### DON'T ❌
- Query base tables directly from frontend
- Manually join multiple tables
- Aggregate data in JavaScript when views provide it
- Use `select('*')` without filtering
- Mix view and table queries for the same data

---

## Performance Tips

1. **Always filter by wallet_address/member_id first:**
   ```typescript
   .eq('wallet_address', walletAddress)  // Uses index
   ```

2. **Select only needed columns:**
   ```typescript
   .select('username, current_level, available_usd')  // Not *
   ```

3. **Use single() for one-row results:**
   ```typescript
   .single()  // Better than [0] indexing
   ```

4. **Batch queries with Promise.all():**
   ```typescript
   const [member, rewards, matrix] = await Promise.all([...]);
   ```

5. **Order and limit in database:**
   ```typescript
   .order('created_at', { ascending: false })
   .limit(20)
   ```

---

## Troubleshooting

### View doesn't exist error
**Solution:** Run migration `/supabase/migrations/20251003_schema_cleanup_canonical_views.sql`

### No data returned from view
**Check:**
1. Is the member activated? (`current_level >= 1`)
2. Does the wallet address exist in `members` table?
3. Are you using correct column names? (Check schema above)

### Performance is slow
**Check:**
1. Are you filtering by indexed columns? (wallet_address, member_id)
2. Are you selecting too many columns? (Use specific columns)
3. Are you using limit? (Don't fetch all rows)

---

## View Update History

| Date | Migration | Changes |
|------|-----------|---------|
| 2025-10-02 | `20251002_fix_database_comprehensive.sql` | Created initial canonical views |
| 2025-10-03 | `20251003_schema_cleanup_canonical_views.sql` | Enhanced canonical views, added 15 supporting views |

---

## Support

For questions about views:
1. Check this guide first
2. Query `view_catalog` table for documentation
3. See `/SCHEMA_CLEANUP_ANALYSIS.md` for detailed analysis
4. Check view source: `\d+ v_member_overview` in psql

---

**Remember:** Frontend should ONLY read from views, never directly from tables!


# MasterSpec

## 0) Core Principles

* **Canonical wallet address**

    * Frontend obtains the wallet via `useActiveWallet()` (Thirdweb In-App Wallet).
    * **Preserve case exactly** everywhere (no lowercasing/uppercasing, no normalization).
* **Auth & routing**

    * Verify membership via Supabase Edge Function:
      `POST https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/auth`
    * If `wallet_address` is present in `members` → redirect **Dashboard**.
      Else → **Welcome**.
      On disconnect → **LandingPage**.
* **Upgrade ordering**

    * Levels must be purchased sequentially (1 → 2 → … → 19).
    * **Level 2** requires ≥ **3 direct (URL) activated members**.
* **3×3 Matrix (per root)**

    * Each matrix root maintains up to **19 layers**: L1=3, L2=9, L3=27, …, L19=3^19.
    * Placement uses **LMR priority + breadth-first search (BFS)**:

        * Fill root’s first layer **L → M → R**.
        * If full, scan layer-by-layer; for each parent, try **L → M → R** on its first layer.
        * Stop at the **first available slot** or fail after depth 19.
* **Reward engine with “opportunity timer”**

    * If the root **is not qualified** for a layer reward, create a **72h pending window**.
    * During 72h, if root upgrades to meet requirements → reward becomes **claimable**.
    * Otherwise, reward **rolls up** to the nearest qualified upline; all events are audited.

---

## 1) Tokens, Contracts, Pricing

* **Membership NFTs**

    * Contract type: **EditionDrop (ERC-1155)** on **Arbitrum One**.
    * Token IDs:

        * **1 → 19** map to **Level 1 → Level 19** respectively.
    * Level pricing (USDC):

        * L1 = **100** (+ **30** platform activation fee → **130 total**)
        * L2 = **150**, L3 = **200**, then +50 per level … up to **L19 = 1000**.
* **Payment token**

    * **USDC** (or specified ERC-20 in your environment).
    * Custom ERC-20 address (when applicable): **0x4022797e9EC167Fd48281fa452Ee49d7c169f125**, **18 decimals**.
* **Activation buttons**

    * Mainnet (Arbitrum One) / Testnet (Arbitrum Sepolia) / Simulation.
    * All three must run the **same activation logic** and write identical records.

---

## 2) Data Model (no SQL, field semantics only)

> Tables are logical; names may vary slightly as long as the fields/constraints are respected.

### 2.1 `users` — Registration & Identity

* **wallet\_address** (PK; exact casing)
* **username**
* **email**
* **role** ∈ {`user`, `member`, `admin`} (default `user`)
* **referrer\_address** (URL referrer wallet; optional)
* **created\_at**, **updated\_at**

**Rules**

* Insert on Welcome registration.
* Address casing is preserved as received from wallet provider.
* On successful Level 1 claim, set `role = 'member'`.

---

### 2.2 `membership` — Claim Facts (one row per successful claim)

* **wallet\_address**
* **nft\_level** ∈ \[1..19]
* **claim\_price** (USDC per level)
* **platform\_activation\_fee** (L1 = 30; others = 0)
* **total\_cost** (L1 = 130; others = claim\_price)
* **claimed\_at**
* **status** ∈ {`pending`, `success`, `failed`} (use `success` for confirmed on-chain)
* **unlock\_membership\_level** (= `nft_level + 1`, max 19)
* **is\_member** (computed true when Level 1 success exists + member record is present)

**Rules**

* Every successful on-chain claim creates a `membership` row.
* Current level for a wallet = **max successful `nft_level`** for that wallet.

---

### 2.3 `members` — Membership Profile & Queue

* **wallet\_address** (must match casing of `users`/`membership`)
* **referrer\_wallet** (URL referrer; fixed per member)
* **current\_level** (reflects max `membership.nft_level` for this wallet)
* **activation\_sequence** (global order of Level 1 activations; **super root = 0**, then 1, 2, 3, …)
* **activation\_time** (when Level 1 succeeded)
* **total\_nft\_claimed** (count of successful `membership` claims)
* **updated\_time** (last upgrade time)

**Rules**

* On Level 1 success:

    * Create `members` record, assign `activation_sequence`, set `current_level = 1`.
    * Update `users.role = 'member'`.
* On upgrades (L2+):

    * Update `current_level` and `updated_time`; increment `total_nft_claimed`.
* **Cascade policy**: deleting a `members` record **must** soft-delete or invalidate related `membership` rows to avoid logical drift (preferred: soft delete + constraints).

---

### 2.4 `referrals` — **Direct (URL) Referrals Only**

* **referrer\_wallet**
* **referred\_wallet**
* **created\_at**

**Rules**

* A member has exactly **one** URL referrer (unique constraint).
* This table **does not** track matrix placement (no L/M/R, no depth).
* It is the source of truth for:

    * **Direct referral count**
    * **Level 2 upgrade** eligibility (≥ 3 direct activated members)

---

### 2.5 `matrix_referrals` — **3×3 Matrix Placement**

* **matrix\_root\_wallet** (root of this tree = the URL referrer for the tree)
* **member\_wallet** (node address)
* **parent\_wallet** (the placement parent whose **first layer** this member occupies)
* **parent\_depth** ∈ \[1..19] (member’s depth relative to the root)
* **position** ∈ {`L`, `M`, `R`} (slot under `parent_wallet`)
* **referral\_type** ∈ {`is_direct`, `is_spillover`}
* **created\_at**

**Rules / Constraints**

* Within the same **root tree**, a **member appears at most once**.
* For any **parent**, its first layer can host **max 3 children** (unique L/M/R).
* **Depth ≤ 19**.
* `referral_type = is_direct` only when the member was placed on the **root’s** first layer directly (URL push); otherwise `is_spillover`.
* This table must fully reflect the **tree edges** to enable recursive views and reward traversal.

---

### 2.6 Views for Rendering & Analytics (conceptual)

#### 2.6.1 `matrix_referrals_view` — Recursive Tree per Root

**Fields**

* `matrix_root_wallet`
* `member_wallet`
* `parent_wallet`
* `parent_depth` (1..19)
* `position` (`L`/`M`/`R`)
* `matrix_root_activation_sequence` (global ordering when filling the root’s matrix)

    * 1–3 → Layer 1 (L/M/R)
    * 4–12 → Layer 2
    * 13–39 → Layer 3
    * … up to Layer 19
    * Both direct & spillover entries are included in order

**Purpose**

* Single source for rendering 19 layers and calculating reward layers.

#### 2.6.2 `matrix_layers_view` — Per-Layer Aggregates per Root

**Fields**

* `matrix_root_wallet`, `layer_no`
* `L_filled_count`, `M_filled_count`, `R_filled_count`
* `max_capacity` (= 3^layer\_no)
* `filled_total`
* `empty_slots` (list of parent/slot pairs to guide placement UI)
* `completion_percent`

**Purpose**

* Progress bars, capacity, and “where are the holes” lists for UI.

#### 2.6.3 `referrals_stats_view` — Root-Level Stats

**Fields**

* `matrix_root_address`
* `matrix_root_level` (current level of the root)
* `direct_referrals` (count from `referrals`)
* `completed_layer` (how many layers are fully full L/M/R)
* `completing_layers` (currently filling layer(s))
* `team_size` (total recursive members under root, direct + spillover)
* `empty_slot_flags` (optional: per parent L/M/R empty state)

**Purpose**

* One call to power dashboards and gating logic (e.g., L2 button enabled/disabled).

---

## 3) Placement Algorithm (LMR + BFS)

**Input**

* `new_member_wallet`
* `root_wallet` (URL referrer as the matrix root)

**Process**

1. Try **root’s first layer** in order **L → M → R**.

    * If a slot is free → place there as **depth = 1**, `referral_type = is_direct`.
2. If full → BFS by layers:

    * Traverse **layer by layer** under the root; for each parent node, check its first-layer slots in order **L → M → R**.
    * The **first available slot** wins:

        * `parent_wallet = that parent`
        * `parent_depth = depth(parent) + 1`
        * `position = L/M/R`
        * `referral_type = is_spillover`
3. If no slot until depth **19** → fail with a controlled error (and alert).
4. **Invariants**

    * Do not exceed 3 children under any parent.
    * Member appears once per root tree.
    * All writes are transactional to prevent double-placement.

---

## 4) Reward Engine

### 4.1 Reward Amount & Trigger

* When a member **successfully claims level N** and **is placed** in a root tree, it triggers a **Layer N** reward in that root’s tree.
* **Reward amount = 100% of the level’s NFT price**:

    * L1=100, L2=150, L3=200, …, L19=1000 (USDC).

### 4.2 Eligibility Rules

* **Layer 1**: root level ≥ 1; **R position requires root level ≥ 2**.
* **Layer 2..19**: root level ≥ layer number.

### 4.3 Reward Ledger (states)

* **claimable**: eligible now → credit root’s `reward_balance`.
* **pending**: not eligible now → create **72h opportunity timer**.
* **rolled**: pending expired; rolled up to nearest qualified upline.
* **paid**: withdrawn.

### 4.4 Opportunity Timer (72h)

* For every `pending` reward:

    * Create `reward_opportunity_timers` row:

        * `starts_at` (now), `duration_seconds = 72*3600`, `expires_at`, `status = running`.
    * If the root upgrades to meet requirement **before expiry**:

        * Set timer `status = stopped (reason = qualified)`.
        * Switch reward `pending → claimable`.

### 4.5 Roll-Up on Expiry

* Cron checks expired timers:

    * Confirm reward is still `pending`.
    * Find **nearest qualified upline** (walk the tree upwards).
    * Write `reward_rollup_events` {from → to, layer, amount, time}.
    * Mark original reward `status = rolled`, `roll_to_wallet = to_wallet`.
    * **Recommended**: create a **new** `claimable` reward for `to_wallet` (keep history intact).

### 4.6 State Machine (summary)

```
on_claim_success(level N, placed):
  if eligible(root, layer=N, pos):
    reward = claimable
  else:
    reward = pending
    start 72h timer

on_root_upgrade:
  for related pending rewards still within 72h:
    stop timer(reason=qualified)
    pending → claimable

cron (every 1–5 min):
  for expired timers (and rewards still pending):
    nearest qualified upline → roll up
    original → rolled
    create new claimable for upline
```

---

## 5) Frontend Components (contracts & UX)

### 5.1 Welcome

* Registration form (`username`, `email`) with wallet/referrer echo.
* `WelcomeLevel1ClaimButton`: mainnet / testnet / simulation — identical post-claim logic.

### 5.2 Referrals

* **Matrix Tree** (×2 views if needed):

    * Render 19 layers (collapsible), **LMR** positions, parent/child lines.
    * Empty slot badges (from `matrix_layers_view`).
    * Progress per layer
  
    * Referrals Stats

### 5.3 Rewards

* **PendingRewardsCard**

    * Shows **only** `pending` items with **smooth, high-quality countdown** (DD\:HH\:MM\:SS).
    * “Upgrade to unlock” CTA (opens the right Level claim).
    * Live transitions: on success, stop countdown, convert to `claimable`.
* **RollupRewardsFeed**

    * Timeline: incoming and outgoing roll-ups with amounts, layer, from/to, timestamps.
    * Filter by date/layer.
* **ClaimableRewardsSummary**

    * Total claimable balance, withdraw action, history list.
    * Optimistic UI with server reconciliation.
### 5.4 Memberships

* **Membership page**

    * auth members level and unlock level in membership table
    * Level2ClaimButton require  member level =1 & direct referral >3 to unlock
    * LevelUpgradeButton for level 3-19 , check unlock level to active the button function.
---

## 6) BCC Logic

* **New Activation Bonus**: +**500 BCC** (unlocked) on Level 1 success.
* **Locked BCC Release** (tiered by `activation_sequence`):

    * **Tier 1** (1–9,999): total 10,450 BCC; releases per level: **100, 150, 200, …, 1000**.
    * **Tier 2** (10,000–29,999): half of Tier 1 amounts.
    * **Tier 3** (30,000–99,999): half again.
    * **Tier 4** (100,000–268,240): half again.
* Released BCC increases **`bcc_balance`** and is spendable on merchant/ads/course/service/course/lessons 
* **`bcc_balance`**  is spendable on NFTs Page and Education Page

---

## 7) Consistency, Constraints, and Safety

* **Address casing**: must remain exactly as captured; never transform.
* **Unique placement**: per parent, **first-layer L/M/R** are unique; per root, a member appears once.
* **Depth limit**: do not place beyond **19**.
* **Transactions & idempotency**:

    * Placement, reward creation, timer creation, roll-up updates must be transactional with conditional state transitions.
    * Cron jobs must be idempotent (re-runs don’t duplicate roll-ups).
* **Deletions**:

    * Prefer **soft delete** with validity flags.
    * If hard-deleting `members`, ensure cascaded invalidation for `membership`, `matrix_referrals`, and any dependent aggregates to prevent dangling records.
* **Observability**:

    * Log: connect/disconnect, auth, registration, claim, placement, reward create, `pending→claimable`, roll-up, withdrawals.
    * Metrics: count of pending, expiring (<6h), roll-up success/failure, cron latency.

---

## 8) External Interfaces (suggested, not prescriptive)

*

---

## 9) Acceptance Criteria (system-level)

1. **Auth routing** honors members/non-members, disconnect returns to LandingPage; addresses preserved.
2. **Registration → Level 1 claim** creates `membership`, promotes `users.role`, creates `members` with correct sequence/time/level.
3. **Referrals vs Matrix** separation:

    * Direct count comes **only** from `referrals`.
    * All placement comes from `matrix_referrals` and matches BFS + LMR rules.
4. **Tree views**:

    * `matrix_referrals_view` renders full 19 layers for any root;
      `matrix_layers_view` reports accurate capacity/progress/empty slots.
5. **Rewards**:

    * Correct amounts per level; **Layer 1 R** enforces **root ≥ 2**.
    * Pending rewards show 72h countdown; upgrade flips to claimable immediately.
    * Expired pending reliably **rolls up** to nearest qualified upline with auditable events.
6. **Level 2 gate** requires ≥ 3 **direct** activated members.
7. **BCC**:

    * +500 bcc_blance and +10450 bcc_locked on activation records in user_balance,then +100 bcc_balance and -100 bcc_locked records bcc_release_logs and change user_balance rocords; tiered release per level upgrades; balances update correctly.
8. **Idempotency & safety**:

    * No double placements; no >3 children; no depth >19; cron re-runs safe.
9. **Observability**:

    * End-to-end path (register → place → reward → pending → roll-up/claim → withdraw) is reconstructable from logs and metrics.


Perfect. Here’s the second doc — **AgentTasks.md (EN)**.
This translates the **MasterSpec** into step-by-step, auditable tasks for the agent.
It’s not about *how* to code directly, but about what to check, verify, clean, and deliver — always with artifacts and acceptance criteria.

---

# AgentTasks.md

## General Rules for All Tasks

* **IPv4 first**: all DB/API calls must use IPv4 connections where possible.
* **Address casing**: wallet addresses must be preserved exactly, never lower/uppercased.
* **Traceability**: every task must leave written artifacts (`plan.md`, `report.md`, `sql/*.sql`, `md` checklists).
* **PRs**: code and DB changes must be split into pull requests per task.
* **Observability**: log all user-facing changes; add metrics where relevant.

---

## Task 0｜Baseline Inventory

**Goal**: Create a snapshot of current system state before any changes.
**Scope**:

* Code tree (frontend + backend + edge functions).
* DB schema (tables, views, triggers, functions).
* Config (env files, chain RPCs, thirdweb provider config).
  **Steps**:

1. Map all files related to:

    * wallet connection, registration, claim, placement, rewards, BCC.
    * Supabase functions under `/functions/v1/*`.
2. Dump DB structure (schema only, no data).
3. Snapshot env variables (mask secrets).
   **Artifacts**:

* `inventory/code_map.md`
* `inventory/db_schema.sql`
* `inventory/env_snapshot.md`
  **Acceptance**:
* Clear mapping between specs and files/tables.
* Baseline stored for rollback comparison.

---

## Task 1｜Connection & Auth

**Goal**: Validate connection flow and membership gating.
**Pages/Components**:

* `useActiveWallet`, wallet provider files.
* Router guards / middleware.
* LandingPage / Welcome / Dashboard transitions.
  **Functions**:
* `functions/v1/auth`: verify contract, expected JSON, error handling.
  **Steps**:

1. Ensure `useActiveWallet` passes wallet address exactly as returned.
2. Mock two scenarios: wallet in `members` vs not in `members`.
3. Disconnect → LandingPage check.
   **Artifacts**:

* `auth/auth_flow.md` (sample requests/responses).
* PR if casing/redirects wrong.
  **Acceptance**:
* Routes and redirects work 100%.
* Wallet addresses preserved.

---

## Task 2｜Registration & Level1 Claim

**Goal**: Ensure registration and L1 claim work correctly and trigger all DB changes.
**Pages/Components**:

* Welcome: Registration form, `WelcomeLevel1ClaimButton`.
* Remove any legacy activation code.
  **DB Tables**:
* `users`, `membership`, `members`, `referrals`.
  **Steps**:

1. Submit registration form → record in `users` with role=`user`.
2. Claim L1 NFT (EditionDrop token\_id=1).
3. On success:

    * Write `membership` (status=success, nft\_level=1).
    * Promote `users.role=member`.
    * Insert into `members` with activation sequence/time.
    * Insert `referrals` entry (URL direct link).
4. Cascade: deleting `members` must cascade/soft-delete `membership`.
   **Artifacts**:

* `welcome/registration_claim_report.md`.
* SQL check script: `sql/membership_members_sync.sql`.
  **Acceptance**:
* All records in sync (users ↔ membership ↔ members).
* Direct\_referrals +1 for referrer.
* No orphan records.

---

## Task 3｜Referrals & Matrix Placement

**Goal**: Correctly implement direct referrals and 3×3 matrix placements.
**Tables/Views**:

* `referrals`, `matrix_referrals`, `matrix_referrals_view`, `matrix_layers_view`, `referrals_stats_view`.
  **Steps**:

1. Confirm `referrals` only logs URL referrer → referred pairs.
2. Implement BFS+LMR placement for `matrix_referrals`:

    * Depth ≤19, unique L/M/R, one appearance per root.
    * Mark referral\_type is\_direct vs is\_spillover.
3. Verify recursive views show full 19-layer tree.
4. Validate `referrals_stats_view` fields: direct\_referrals, completed\_layer, team\_size.
   **Artifacts**:

* `matrix/matrix_algo_report.md` (placement pseudocode + tests).
* `matrix/matrix_views_audit.md` (sample SQL outputs).
  **Acceptance**:
* Matrix fills strictly LMR/BFS.
* Views support UI rendering of progress, holes, and team size.

---

## Task 4｜Rewards Engine

**Goal**: Implement reward generation, pending timers, and roll-ups.
**Tables/Processes**:

* `reward_ledger` (status: claimable/pending/rolled/paid).
* `reward_opportunity_timers`.
* `reward_rollup_events`.
* `reward_withdrawals`.
  **Steps**:

1. On successful claim:

    * Locate matrix\_root.
    * Create reward for root: amount=NFT price.
    * Eligibility check:

        * Layer1: root ≥1; R requires root ≥2.
        * Layers 2–19: root ≥ layer.
    * If eligible → claimable; else → pending + start 72h timer.
2. On upgrade:

    * Recheck related pending; promote to claimable if within timer.
3. Cron job:

    * Scan expired timers; roll-up reward to nearest qualified upline.
    * Mark original rolled; create new claimable for upline.
4. Withdrawals: atomic ledger + balance deduction.
   **Frontend**:

* PendingRewardsCard with live countdown.
* RollupRewardsFeed timeline.
* ClaimableRewardsSummary.
  **Artifacts**:
* `rewards/reward_flow.md` (state machine + diagrams).
* SQL scripts: `sql/rewards_constraints.sql`.
  **Acceptance**:
* Rewards respect layer/eligibility rules.
* Pending timers visible & accurate.
* Roll-ups correctly transferred.
* Withdrawals atomic and reflected.

---

## Task 5｜BCC Logic

**Goal**: Implement new bonus and tiered locked BCC release.
**Tables**:

* `bcc_balances`, `bcc_ledger`.
  **Steps**:

1. On L1 activation → +500 unlocked BCC.
2. On upgrades:

    * Tier1 (1–9,999): release 100–1000 progressively.
    * Tier2: halve; Tier3: halve again; Tier4: halve again.
3. Balance updates on claim & spend (merchant/ads/courses).
   **Artifacts**:

* `bcc/bcc_release_report.md`.
* Test upgrade sequence to verify releases.
  **Acceptance**:
* +500 always granted at L1.
* Tiered release exact and cumulative.
* Balance matches usage.

---

## Task 6｜Consistency & Migration

**Goal**: Find and repair historical inconsistencies.
**Checks**:

* Members without matching memberships.
* Parents with >3 children.
* Depth >19.
* Duplicates in matrix placement.
  **Steps**:

1. Write anomaly queries.
2. Propose migration scripts with rollback.
   **Artifacts**:

* `migrations/anomalies_report.md`.
* `migrations/fix.sql`, `migrations/rollback.sql`.
  **Acceptance**:
* No invalid data remains.
* Constraints enforced.

---

## Task 7｜Code Cleanup & Documentation

**Goal**: Remove dead code, unify functions, produce doc + sample data.
**Steps**:

1. Identify unused/duplicate functions, components, hooks.
2. Remove or merge.
3. Generate sample dataset (users, members, claims, placements).
4. Write updated docs:

    * `docs/FLOW.md` (user journey).
    * `docs/DB.md` (tables/relationships).
    * `docs/REWARDS.md` (reward state machine).
      **Artifacts**:

* Cleanup PRs.
* Sample dataset SQL.
  **Acceptance**:
* No dead code remains.
* Docs complete and accurate.
* Sample dataset powers UI without errors.

---

## Task 8｜Monitoring & Logging (Optional but recommended)

**Goal**: Add observability for all key actions.
**Steps**:

1. Log events:

    * wallet connect/disconnect, registration, claim, placement, reward events, pending→claimable, roll-up, withdrawals.
2. Add metrics dashboards for:

    * Pending counts, expiring timers, roll-up success/failure, balances.
      **Artifacts**:

* `observability/logging_plan.md`.
* Dashboard configuration file(s).
  **Acceptance**:
* Every user path traceable.
* Key metrics visible in dashboard.

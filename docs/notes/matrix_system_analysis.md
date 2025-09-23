Got it ✅
Here’s a **draft Markdown spec file** (English, detailed, structured) for your **Matrix Recommendation System (19 layers)**.
This is suitable as documentation for your Agent or developer team.

---

# Matrix Referral & Placement System (19 Layers)

## 1. Overview

This document describes the **design and data flow** of a 3×3 Matrix referral system, built on top of the `members` table and extended into two levels of recursive trees:

1. **`referrals_new`** – normalized direct referral records based on activation time.
2. **`referrals_tree_view`** – a recursive 19-layer referral chain (direct-referrals only).
3. **`matrix_referrals_tree_view`** – the final 19-layer placement tree, filled left-to-right (L → M → R), based on activation order, with spillover rules.
4. **Derived views / statistics** – to power UI components such as progress bars, counters, and empty slot indicators.

---

## 2. Base Tables

### 2.1 Members

| Column            | Description                                                          |
| ----------------- | -------------------------------------------------------------------- |
| `wallet_address`  | Unique ID of the member (primary key).                               |
| `activation_time` | When the member activated their membership. Defines global ordering. |
| `current_level`   | Current membership level.                                            |
| …                 | Other profile/status fields.                                         |

---

### 2.2 Referrals\_New

This is a normalized form of `referrals`.
It is populated **at the moment of activation**.

| Column            | Description                                        |
| ----------------- | -------------------------------------------------- |
| `referrer_wallet` | Who invited the member.                            |
| `referred_wallet` | The new member.                                    |
| `created_at`      | Timestamp when the referral relation was recorded. |
| `is_valid`        | Boolean (true if referred member is activated).    |

Purpose:

* Ensures that only **activated members** are included in tree construction.
* Cleans duplicates or dangling references.

---

## 3. Direct Referral Tree

### 3.1 `referrals_tree_view`

* Purpose: Display the **pure referral chain** (depth 1–19).
* Does not handle placement slots (L/M/R).
* Built using **recursive CTE** over `referrals_new`.

**Columns:**

| Column                  | Description              |
| ----------------------- | ------------------------ |
| `root_wallet`           | The origin of the chain. |
| `referrer_wallet`       | Parent in this edge.     |
| `referred_wallet`       | Child in this edge.      |
| `depth`                 | Depth level (1…19).      |
| `referral_created_at`   | Time of referral.        |
| `child_activation_time` | Time child activated.    |

---

## 4. Matrix Referral Tree

### 4.1 Placement Rules

* Each **root\_wallet** defines a 3×3 recursive structure (max depth 19).
* **Activation time** is the *only priority* for filling slots.
* Order of filling is **breadth-first, left to right**: L → M → R.
* If a spillover activates *before* a direct referral, it takes the available slot.
* Direct referrals are tagged with `is_direct`; spillovers are tagged `is_spillover`.
* Each parent can have max **3 children**.

---

### 4.2 `matrix_referrals` Table

| Column                       | Description                                   |
| ---------------------------- | --------------------------------------------- |
| `matrix_root_wallet`         | The root of the tree.                         |
| `member_wallet`              | Current node.                                 |
| `parent_wallet`              | Placement parent.                             |
| `parent_depth`               | Depth of the parent (1…19).                   |
| `position` (L/M/R)           | Assigned slot under parent.                   |
| `referral_type`              | `is_direct` or `is_spillover`.                |
| `created_at`                 | Placement timestamp.                          |
| `matrix_root_activation_seq` | Sequence number within this root’s BFS order. |

---

### 4.3 `matrix_referrals_tree_view`

Recursive tree view combining placement info.

**Columns:**

| Column                       | Description                            |
|------------------------------|----------------------------------------|
| `matrix_root_wallet`         | Root of tree.                          |
| `member_wallet`              | Current node.                          |
| `parent_wallet`              | Placement parent.                      |
| `path`                       | path for layer=depth all the path seq. |
| `Layer`                      | Layer1-Layer19 for matrix_root         |
| `position`                   | L / M / R for parent_wallet.           |
| `referral_type`              | is\_direct / is\_spillover.            |
| `child_activation_time`      | Member activation time.                |
| `matrix_root_activation_seq` | BFS sequence by activation.            |

**Logic:**

1. For each `matrix_root_wallet`, collect all members directly or indirectly linked by `referrals_new`.
2. Sort by `activation_time` (tie → `created_at`).
3. Assign BFS slots left-to-right.
4. Write into `matrix_referrals`.
5. The view expands this recursively up to depth 19.

---

## 5. Derived Views / Components

### 5.1 `matrix_layers_view`

* Summarizes **per layer** status for each root.

| Column               | Description           |
|----------------------| --------------------- |
| `matrix_root_wallet` | Root.                 |
| `layer`              | Layer number.         |
| `L_max_slots`        | `3^layer`.            |
| `M_max_slots`        | `3^layer`.            |
| `R_max_slots`        | `3^layer`.            |
| `total_max_slots`    | `3^layer`.            |
| `filled_slots`       | Number of placements. |
| `completion_rate`    | filled / max.         |
| `empty_slots`        | Remaining open slots. |

---

### 5.2 `empty_slot_flags_view`

* For each parent, show which of **L/M/R** slots are open.
* Supports UI highlighting “next available slot”.

| Column          | Description  |
| --------------- | ------------ |
| `parent_wallet` | Parent node. |
| `layer`         | Depth.       |
| `slot_L_empty`  | Boolean.     |
| `slot_M_empty`  | Boolean.     |
| `slot_R_empty`  | Boolean.     |

---

### 5.3 `referrals_stats_view`

Summary of referral metrics for dashboards.

| Column               | Description                          |
| -------------------- | ------------------------------------ |
| `matrix_root_wallet` | Root.                                |
| `matrix_root_level`  | Membership level.                    |
| `direct_referrals`   | Count of direct children.            |
| `completed_layers`   | Number of fully filled layers.       |
| `team_size`          | Total size of downline (all layers). |

---

## 6. Validation Rules

1. **Uniqueness**: No duplicate `(matrix_root_wallet, member_wallet)`.
2. **Parent constraint**: Each parent max 3 children.
3. **Slot uniqueness**: Each parent + position (L/M/R) only once.
4. **Depth**: 1–19 only.
5. **Activation ordering**: Earlier activations always receive lower sequence numbers.

---

## 7. Implementation Flow

1. **On Member Activation**

    * Insert into `members` with activation\_time.
    * Insert into `referrals_new` if referrer exists.

2. **Rebuild / Extend Referral Tree**

    * `referrals_tree_view` expands direct chain.

3. **Placement in Matrix**

    * Check next available BFS slot for that root.
    * Insert row into `matrix_referrals`.

4. **Views Refresh**

    * `matrix_referrals_tree_view` + statistics updated automatically.

---

## 8. Usage in Frontend

* **Member Profile**: show direct referrals (from `referrals_tree_view`).
* **Matrix Tree**: show 19-layer placement (from `matrix_referrals_tree_view`).
* **Progress Bars**: use `matrix_layers_view`.
* **Empty Slot UI**: use `empty_slot_flags_view`.
* **Dashboard Stats**: use `referrals_stats_view`.

---

Would you like me to now generate a **ready-to-use SQL migration package** (3 `CREATE VIEW` statements + validation queries) so your Agent can drop it directly into Supabase migrations?

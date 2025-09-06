# 🐝 Beehive Platform - Final Deployment Guide

## 🎯 Critical Deployment Instructions

**⚠️ IMPORTANT**: Deploy migrations in this EXACT order. Skip migrations 009-012 completely.

### ✅ **Correct Migration Sequence**

```bash
# Apply migrations in Supabase SQL Editor in this order:
001_initial_schema.sql              ✅ (Core database structure)
002_functions_and_triggers.sql      ✅ (Database functions)
003_rls_policies.sql                ✅ (Security policies)  
004_views.sql                       ✅ (Frontend views)
005_admin_controls.sql              ✅ (Admin system)
006_auth_integration.sql            ✅ (Authentication)
007_admin_views.sql                 ✅ (Admin dashboard)
008_layer_and_reward_rules.sql      ✅ (FIXED - Correct pricing & BCC)
013_final_platform_structure.sql   ✅ (Basic platform structure)
014_correct_reward_system.sql      ✅ (CORRECT - Layer rewards + pending system)
```

### ❌ **Skip These Migrations (Incorrect)**
- ~~009_dual_reward_system.sql~~ (Wrong pricing structure)
- ~~010_platform_fees.sql~~ (Wrong fee structure)
- ~~011_currency_correction.sql~~ (Not needed)
- ~~012_platform_fees_level1_only.sql~~ (Superseded by 013)

---

## 💰 **Final Correct Pricing Structure**

### **NFT Pricing (USDC)**
| Level | NFT Name | NFT Price | Platform Fee | Total Cost | BCC Unlock |
|-------|----------|-----------|--------------|------------|------------|
| **1** | Bronze Bee | $100 | $30 | **$130** | 100 BCC |
| **2** | Silver Bee | $150 | $0 | **$150** | 150 BCC |
| **3** | Gold Bee | $200 | $0 | **$200** | 200 BCC |
| **4** | Platinum Bee | $250 | $0 | **$250** | 250 BCC |
| **5** | Diamond Bee | $300 | $0 | **$300** | 300 BCC |
| **6** | Ruby Master | $350 | $0 | **$350** | 350 BCC |
| **7** | Sapphire Elite | $400 | $0 | **$400** | 400 BCC |
| **8** | Emerald Pro | $450 | $0 | **$450** | 450 BCC |
| **9** | Titanium Exec | $500 | $0 | **$500** | 500 BCC |
| **10** | Quantum Innovator | $550 | $0 | **$550** | 550 BCC |
| **11** | Phoenix Rising | $600 | $0 | **$600** | 600 BCC |
| **12** | Dragon Master | $650 | $0 | **$650** | 650 BCC |
| **13** | Cosmic Guardian | $700 | $0 | **$700** | 700 BCC |
| **14** | Galaxy Emperor | $750 | $0 | **$750** | 750 BCC |
| **15** | Universe Architect | $800 | $0 | **$800** | 800 BCC |
| **16** | Infinity Sage | $850 | $0 | **$850** | 850 BCC |
| **17** | Eternity Lord | $900 | $0 | **$900** | 900 BCC |
| **18** | Omnipotent Deity | $950 | $0 | **$950** | 950 BCC |
| **19** | Ultimate Genesis | $1000 | $0 | **$1000** | 1000 BCC |

### **Key Rules**
- **NFT Pricing**: Level 1 = $100, then +$50 each level
- **Platform Fee**: ONLY Level 1 has $30 fee (Total: $130)
- **BCC Unlock**: Level 1 = 100 BCC, then +50 BCC each level
- **Total Locked BCC**: 10,450 BCC per user (sum of all level unlocks)

---

## 💎 **BCC Token System**

### **New User Activation**
- **Transferable BCC**: 500 BCC (immediate bonus)
- **Locked BCC**: 10,450 BCC (locked, unlocked through level purchases)

### **BCC Unlock Mechanism** 
- Each NFT level purchase unlocks its corresponding BCC amount
- Level 1 purchase → 100 BCC unlocked from locked balance
- Level 2 purchase → 150 BCC unlocked from locked balance
- etc.

### **Total BCC Calculation**
```
Level 1: 100 BCC
Level 2: 150 BCC  
Level 3: 200 BCC
...
Level 19: 1000 BCC
Total = 100+150+200+...+1000 = 10,450 BCC
```

---

## 💰 **Correct Matrix Reward System**

### **ONLY Layer Rewards (No Direct Referral Rewards)**
- **Trigger**: When ANY member in that layer upgrades to SAME level NFT
- **Reward**: Root member gets 100% of NFT price in USDC
- **Example**: Member in Layer 3 buys Level 3 NFT → Layer 3 root gets $200 USDC

### **Pending System (72 Hours)**
- **All rewards**: 72-hour pending period
- **Claimable**: If root meets level requirements
- **Rollup**: After 72 hours, unclaimed rewards roll up to qualified upline

### **Level Requirements**
- **Layer 1 Special Rule**: 3rd Layer 1 reward requires root to be Level 2+
- **Other Layers**: Root must be >= layer level to claim
- **Level 2 Purchase**: Must have 3 direct referrals to buy Level 2 NFT

### **BCC System**
- **Activation Bonus**: 500 BCC transferable (one-time)
- **Locked BCC**: 10,450 BCC total (unlocked through level purchases)
- **Level Unlock**: Each NFT purchase unlocks corresponding BCC amount

---

## 🔧 **Database Functions Available**

### **Core Functions**
```sql
-- Calculate total cost including platform fees
SELECT public.calculate_total_nft_cost(1); -- Returns 130.00 for Level 1
SELECT public.calculate_total_nft_cost(2); -- Returns 150.00 for Level 2

-- Process NFT purchase
SELECT public.process_nft_purchase_with_unlock(
    'wallet_address', 
    1,      -- NFT level
    130.00, -- Payment amount in USDC
    'transaction_hash'
);

-- Activate new user
SELECT public.activate_new_user('wallet_address');
```

### **Views Available**
```sql
-- Complete pricing with fees
SELECT * FROM nft_complete_pricing ORDER BY level;

-- User BCC balance overview
SELECT * FROM user_bcc_balance_overview WHERE wallet_address = 'YOUR_WALLET';

-- Matrix reward summary
SELECT * FROM matrix_reward_summary ORDER BY layer;
```

---

## 📊 **Testing Checklist**

### **After Migration Deployment**

1. **✅ Verify NFT Pricing**
   ```sql
   SELECT level, price_usdc, 
          CASE WHEN level = 1 THEN 30.00 ELSE 0 END as platform_fee
   FROM nft_levels ORDER BY level;
   ```

2. **✅ Test Total Cost Calculation**
   ```sql
   SELECT level, public.calculate_total_nft_cost(level) as total_cost
   FROM nft_levels ORDER BY level;
   ```

3. **✅ Verify BCC Unlock Amounts**
   ```sql
   SELECT level, bcc_reward as unlock_amount FROM nft_levels ORDER BY level;
   ```

4. **✅ Test User Activation**
   ```sql
   SELECT public.activate_new_user('0x1234567890123456789012345678901234567890');
   ```

5. **✅ Test NFT Purchase**
   ```sql
   SELECT public.process_nft_purchase_with_unlock(
       '0x1234567890123456789012345678901234567890',
       1, 130.00, '0xhash'
   );
   ```

---

## 🚀 **Edge Functions Deployment**

After database migrations, deploy Edge Functions:

```bash
supabase functions deploy auth
supabase functions deploy bcc-purchase  
supabase functions deploy matrix
supabase functions deploy rewards
supabase functions deploy nft-upgrade
supabase functions deploy balance
supabase functions deploy admin
```

---

## ⚠️ **Critical Reminders**

1. **ONLY Level 1 has platform fees** ($30 activation fee)
2. **All other levels** (2-19) have NO platform fees
3. **BCC unlock amounts** match level pricing increments (+50 each)
4. **Total locked BCC** is exactly 10,450 per user
5. **Matrix rewards** pay full NFT price in USDC to root member
6. **Skip migrations 009-012** completely - they are incorrect

---

## 🎉 **Deployment Complete**

Once all migrations (001-008, 013) are applied successfully:

✅ **19-level NFT system** with correct pricing  
✅ **Platform fees only on Level 1**  
✅ **BCC unlock system** with 10,450 total locked  
✅ **Matrix rewards** in USDC  
✅ **New user activation** with 500 BCC bonus  

The Beehive Platform will be **ready for production**! 🐝
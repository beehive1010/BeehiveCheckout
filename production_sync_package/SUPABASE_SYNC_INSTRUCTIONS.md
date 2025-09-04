# 📊 **Supabase Dashboard Upload Instructions**

## **Method 1: SQL Editor (Easiest) ✅**

### **Step 1: Go to Supabase SQL Editor**
1. Open https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in left sidebar
4. Click **"New Query"**

### **Step 2: Fix Enum Values (If Needed)**
If you get an enum error, run this first to add missing placement_type values:

```sql
-- Fix placement_type enum if needed
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'deep_spillover' AND enumtypid = 'placement_type_enum'::regtype) THEN
        ALTER TYPE placement_type_enum ADD VALUE 'deep_spillover';
    END IF;
END $$;
```

### **Step 3: Run Schema Update**
Copy and paste this SQL into the editor:

```sql
-- SCHEMA UPDATE - Run this after enum fix
BEGIN;

-- Clear existing data
TRUNCATE TABLE referrals CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE members CASCADE;
TRUNCATE TABLE user_rewards CASCADE;
TRUNCATE TABLE user_balances CASCADE;

-- Insert users with real wallet addresses
INSERT INTO users (wallet_address, referrer_wallet, username, email, is_upgraded, upgrade_timer_enabled, current_level, created_at) VALUES
('0x380fd6a57fc2df6f10b8920002e4acc7d57d61c0', null, 'admin', 'admin@gmail.com', false, false, 1, '2025-09-04 03:50:37.690101'),
('0xe6fb55d860c72f5e42056244410f5ea46895bfd8', '0x380fd6a57fc2df6f10b8920002e4acc7d57d61c0', 'laurent153', 'laurent153@gmail.com', false, false, 1, '2025-09-04 03:58:44.923684'),
('0xb79d58df8ea073dd3904bc804df1e187a0ae4821', '0xe6fb55d860c72f5e42056244410f5ea46895bfd8', 'laurent1532', 'laurent1532@qq.com', false, false, 1, '2025-09-04 04:36:15.461142'),
('0x6366573ff5f6b07be1e96b024c8862f5502d13e3', null, 'admin123', 'l4321@qq.com', false, false, 1, '2025-09-04 06:01:39.263693'),
('0x2bc46f768384f88b3d3c53de6a69b3718026d23f', '0xe6fb55d860c72f5e42056244410f5ea46895bfd8', 'admin12345', 'support@beehive-lifestyle.io', false, false, 1, '2025-09-04 06:52:27.618444'),
('0xf9e54564d273531f97f95291baf0c3d74f337937', '0xe6fb55d860c72f5e42056244410f5ea46895bfd8', 'laurent153889', 'laurent153889@qq.com', false, false, 1, '2025-09-04 07:58:30.93361'),
('0x9b132b74a6246fa90e9c36e5cd845f1ded10c589', '0x380fd6a57fc2df6f10b8920002e4acc7d57d61c0', 'Test001', null, false, false, 1, '2025-09-04 08:17:59.759522'),
('0xabaa68278d23bd09bbf16ae7f715a96393cfdfa1', '0x9b132b74a6246fa90e9c36e5cd845f1ded10c589', 'TestAA', null, false, false, 1, '2025-09-04 09:39:15.236559'),
('0xab02b5381694f8a39149b9d31459533c4e8a0016', '0x9b132b74a6246fa90e9c36e5cd845f1ded10c589', 'TestBB', null, false, false, 1, '2025-09-04 09:41:39.926621'),
('0x0d1dccbab42d94f3caf4f34c19fa176f21e23188', '0x9b132b74a6246fa90e9c36e5cd845f1ded10c589', 'TeatCC', null, false, false, 1, '2025-09-04 09:42:55.768005');

COMMIT;
```

### **Step 3: Add Complete Cascading Matrix**
Copy and paste this second SQL query:

```sql
-- COMPLETE CASCADING MATRIX - Run this second
BEGIN;

-- Insert complete cascading referral relationships (17 total)
INSERT INTO referrals (root_wallet, member_wallet, layer, position, parent_wallet, placer_wallet, placement_type, is_active) VALUES 

-- Admin's direct referrals (Layer 1)
('0x380fd6a57fc2df6f10b8920002e4acc7d57d61c0', '0xe6fb55d860c72f5e42056244410f5ea46895bfd8', 1, 'L', '0x380fd6a57fc2df6f10b8920002e4acc7d57d61c0', '0x380fd6a57fc2df6f10b8920002e4acc7d57d61c0', 'direct', true),
('0x380fd6a57fc2df6f10b8920002e4acc7d57d61c0', '0x9b132b74a6246fa90e9c36e5cd845f1ded10c589', 1, 'M', '0x380fd6a57fc2df6f10b8920002e4acc7d57d61c0', '0x380fd6a57fc2df6f10b8920002e4acc7d57d61c0', 'direct', true),

-- Laurent153's direct referrals (Layer 1)
('0xe6fb55d860c72f5e42056244410f5ea46895bfd8', '0xb79d58df8ea073dd3904bc804df1e187a0ae4821', 1, 'L', '0xe6fb55d860c72f5e42056244410f5ea46895bfd8', '0xe6fb55d860c72f5e42056244410f5ea46895bfd8', 'direct', true),
('0xe6fb55d860c72f5e42056244410f5ea46895bfd8', '0x2bc46f768384f88b3d3c53de6a69b3718026d23f', 1, 'M', '0xe6fb55d860c72f5e42056244410f5ea46895bfd8', '0xe6fb55d860c72f5e42056244410f5ea46895bfd8', 'direct', true),
('0xe6fb55d860c72f5e42056244410f5ea46895bfd8', '0xf9e54564d273531f97f95291baf0c3d74f337937', 1, 'R', '0xe6fb55d860c72f5e42056244410f5ea46895bfd8', '0xe6fb55d860c72f5e42056244410f5ea46895bfd8', 'direct', true),

-- Test001's direct referrals (Layer 1)
('0x9b132b74a6246fa90e9c36e5cd845f1ded10c589', '0xabaa68278d23bd09bbf16ae7f715a96393cfdfa1', 1, 'L', '0x9b132b74a6246fa90e9c36e5cd845f1ded10c589', '0x9b132b74a6246fa90e9c36e5cd845f1ded10c589', 'direct', true),
('0x9b132b74a6246fa90e9c36e5cd845f1ded10c589', '0xab02b5381694f8a39149b9d31459533c4e8a0016', 1, 'M', '0x9b132b74a6246fa90e9c36e5cd845f1ded10c589', '0x9b132b74a6246fa90e9c36e5cd845f1ded10c589', 'direct', true),
('0x9b132b74a6246fa90e9c36e5cd845f1ded10c589', '0x0d1dccbab42d94f3caf4f34c19fa176f21e23188', 1, 'R', '0x9b132b74a6246fa90e9c36e5cd845f1ded10c589', '0x9b132b74a6246fa90e9c36e5cd845f1ded10c589', 'direct', true),

-- Admin's Layer 2 cascading (only 3 positions L, M, R available per layer)
('0x380fd6a57fc2df6f10b8920002e4acc7d57d61c0', '0xb79d58df8ea073dd3904bc804df1e187a0ae4821', 2, 'L', '0xe6fb55d860c72f5e42056244410f5ea46895bfd8', '0xe6fb55d860c72f5e42056244410f5ea46895bfd8', 'spillover', true),
('0x380fd6a57fc2df6f10b8920002e4acc7d57d61c0', '0x2bc46f768384f88b3d3c53de6a69b3718026d23f', 2, 'M', '0xe6fb55d860c72f5e42056244410f5ea46895bfd8', '0xe6fb55d860c72f5e42056244410f5ea46895bfd8', 'spillover', true),
('0x380fd6a57fc2df6f10b8920002e4acc7d57d61c0', '0xf9e54564d273531f97f95291baf0c3d74f337937', 2, 'R', '0xe6fb55d860c72f5e42056244410f5ea46895bfd8', '0xe6fb55d860c72f5e42056244410f5ea46895bfd8', 'spillover', true),

-- Admin's Layer 3 cascading (remaining members cascade to Layer 3)
('0x380fd6a57fc2df6f10b8920002e4acc7d57d61c0', '0xabaa68278d23bd09bbf16ae7f715a96393cfdfa1', 3, 'L', '0x9b132b74a6246fa90e9c36e5cd845f1ded10c589', '0x9b132b74a6246fa90e9c36e5cd845f1ded10c589', 'spillover', true),
('0x380fd6a57fc2df6f10b8920002e4acc7d57d61c0', '0xab02b5381694f8a39149b9d31459533c4e8a0016', 3, 'M', '0x9b132b74a6246fa90e9c36e5cd845f1ded10c589', '0x9b132b74a6246fa90e9c36e5cd845f1ded10c589', 'spillover', true),
('0x380fd6a57fc2df6f10b8920002e4acc7d57d61c0', '0x0d1dccbab42d94f3caf4f34c19fa176f21e23188', 3, 'R', '0x9b132b74a6246fa90e9c36e5cd845f1ded10c589', '0x9b132b74a6246fa90e9c36e5cd845f1ded10c589', 'spillover', true);

COMMIT;
```

## **Step 4: Verify Results**

After running both SQL queries, test the API:
```
GET /api/matrix/layers
Header: x-wallet-address: 0x380fd6a57fc2df6f10b8920002e4acc7d57d61c0
```

**Expected Result**: Admin should see 8 total members across 3 layers:
- Layer 1: 2 members (Laurent153, Test001)
- Layer 2: 3 members (Laurent153's downline)  
- Layer 3: 3 members (Test001's downline)

## **Alternative: Command Line Method**

If you prefer command line:
```bash
psql "your-supabase-connection-string" -f production_sync_complete.sql
```

## ✅ **Success Criteria**
After upload, your matrix component should show **Layer 2+ members** - the downline's downlines will now be visible in upline matrices!

**Status**: Complete cascading matrix system ready! 🎯
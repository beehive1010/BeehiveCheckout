# Level Config Production Deployment Guide

## Overview
This guide provides multiple methods to deploy the updated level configuration to the production database.

## Current Status
- **Development Database**: ✅ Has correct level pricing structure
- **Production Database**: ⚠️ Needs to be updated with new level config

## Level Configuration Details

### Pricing Structure
- **Level 1 (Warrior)**: $100 USDT + $30 activation fee
- **Level 2-19**: $150-$1000 USDT (increases by $50 per level) + $0 activation fee

### BCC Token Release (4-Tier System)
Each level releases BCC tokens across 4 tiers:
- **Tier 1**: Base amount (100-1900 BCC)
- **Tier 2**: 1.5x Tier 1 
- **Tier 3**: 0.5x Tier 2
- **Tier 4**: 0.5x Tier 3

## Deployment Methods

### Method 1: Direct SQL Execution (Recommended)
1. Connect to your production database
2. Execute the SQL file: `production-level-config-migration.sql`
3. Verify results with the included verification query

### Method 2: Drizzle Schema Push (If connection works)
```bash
# Set production database URL
export DATABASE_URL="$PRODUCTION_DATABASE_URL"

# Push schema changes
npm run db:push --force

# Restore development URL
export DATABASE_URL="[your-dev-database-url]"
```

### Method 3: Manual Database Update
If automated methods fail, manually execute these key statements:

```sql
-- Create table
CREATE TABLE IF NOT EXISTS level_config (
    level INTEGER PRIMARY KEY,
    level_name TEXT NOT NULL,
    token_id INTEGER NOT NULL,
    price_usdt INTEGER NOT NULL,
    activation_fee_usdt INTEGER NOT NULL,
    tier_1_release INTEGER NOT NULL DEFAULT 0,
    tier_2_release INTEGER NOT NULL DEFAULT 0,
    tier_3_release INTEGER NOT NULL DEFAULT 0,
    tier_4_release INTEGER NOT NULL DEFAULT 0,
    max_active_positions INTEGER NOT NULL DEFAULT 3,
    max_referral_depth INTEGER NOT NULL DEFAULT 12,
    can_earn_commissions BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert data (Level 1 example)
INSERT INTO level_config VALUES 
(1, 'Warrior', 1, 10000, 3000, 100, 150, 75, 38, 3, 12, true, NOW());
-- ... (continue with all 19 levels)
```

## Verification

After deployment, verify with:

```sql
SELECT 
    level,
    level_name,
    CONCAT('$', ROUND(price_usdt::NUMERIC / 100, 2)) as price,
    CONCAT('$', ROUND(activation_fee_usdt::NUMERIC / 100, 2)) as activation_fee
FROM level_config 
ORDER BY level;
```

Expected output should show:
- 19 levels from Warrior to Mythic Peak
- Level 1: $100.00 + $30.00 activation
- Level 2: $150.00 + $0.00 activation
- Level 19: $1000.00 + $0.00 activation

## Database Connection Issues

If experiencing connection timeouts:
1. Check if production database is accessible
2. Verify PRODUCTION_DATABASE_URL is correct
3. Ensure database accepts connections from current IP
4. Try connecting with a direct database client first

## Rollback Plan

If needed, backup current level_config before deployment:

```sql
-- Backup
CREATE TABLE level_config_backup AS SELECT * FROM level_config;

-- Rollback if needed
DELETE FROM level_config;
INSERT INTO level_config SELECT * FROM level_config_backup;
```

## Post-Deployment Testing

1. Verify all 19 levels are present
2. Check pricing calculations in application
3. Test BCC token release calculations
4. Confirm membership upgrade flows work correctly

## Notes

- Prices are stored in cents (multiply display prices by 100)
- BCC amounts are whole numbers
- This migration is safe and non-destructive
- All existing user data remains unchanged
# BEEHIVE 2.0 Commands Reference

## Development Commands

### Frontend Development
```bash
# Start development server
npm run dev

# Build production version
npm run build

# Preview production build
npm run start
npm run preview

# Type checking
npm run check

# Linting
npm run lint
npm run lint:fix
```

### Database & Types
```bash
# Generate types from Supabase
npm run db:generate

# Sync types with backup and validation
npm run sync:types

# Check database integrity
npm run db:check

# Fix database issues
npm run db:fix
```

### Supabase Functions
```bash
# Deploy all edge functions
npm run functions:deploy

# Deploy with authentication token
npm run functions:deploy:all

# Check Supabase status
npm run supabase:status
```

## Testing Commands

### Flow Testing
```bash
# Test complete user registration to membership flow
npm run test:flow

# Test matrix data integrity
npm run test:matrix
```

### Direct Script Execution
```bash
# Complete flow test
./scripts/test-complete-flow.sh

# Data integrity check
./scripts/check-data-integrity.sh
```

## Database Management

### Setup & Configuration
```bash
# Setup database connection
npm run setup:db

# Direct database setup
./scripts/supabase-ipv4-management.sh setup
./scripts/supabase-ipv4-management.sh status
```

### Data Fixes & Maintenance
```bash
# Fix wallet case queries
npm run db:fix
./scripts/fix_wallet_case_queries.sh

# Fix layer rewards
npm run rewards:fix
./scripts/fix-layer-rewards-columns.sh

# Populate translations
npm run data:populate
node ./scripts/populate-translations.js
```

## Matrix System

### Matrix Operations
```bash
# Deploy complete matrix system
npm run matrix:deploy
./scripts/deploy-complete-matrix-system.sh

# Cleanup matrix views
npm run matrix:cleanup
./scripts/cleanup-matrix-views.sh

# Create 19-layer tree structure
./scripts/create-19-layer-tree.sh
```

## Development Tools

### Code Quality
```bash
# Check file hygiene
npm run tools:hygiene
./scripts/check-file-hygiene.sh

# Fix double replacements
./scripts/fix-double-replacements.sh
```

### Database Utilities
```bash
# Install PostgreSQL client
./scripts/install-psql.sh

# Debug edge functions
./scripts/debug-edge.sh

# Execute NFT data operations
./scripts/execute-nft-data.sh
```

## Direct Database Access

### Connection Details
```bash
# Database URL (from CLAUDE.md)
DATABASE_URL="postgres://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres?sslmode=require"

# API Base URL
VITE_API_BASE="https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1"
```

### Manual Database Commands
```bash
# Connect to database
psql "postgres://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres?sslmode=require"

# Quick status check
timeout 30 PGPASSWORD=bee8881941 psql -h 34.56.229.13 -U postgres -d postgres -c "\\dt"
```

## Supabase Functions Deployment

### Individual Function Deployment
```bash
# Authentication function
SUPABASE_ACCESS_TOKEN=sbp_537d0dbe16b7a13c92181067507bd4cb32bd1302 supabase functions deploy auth --project-ref cvqibjcbfrwsgkvthccp

# Membership activation
SUPABASE_ACCESS_TOKEN=sbp_537d0dbe16b7a13c92181067507bd4cb32bd1302 supabase functions deploy activate-membership --project-ref cvqibjcbfrwsgkvthccp

# Matrix operations
SUPABASE_ACCESS_TOKEN=sbp_537d0dbe16b7a13c92181067507bd4cb32bd1302 supabase functions deploy matrix --project-ref cvqibjcbfrwsgkvthccp

# Level upgrades
SUPABASE_ACCESS_TOKEN=sbp_537d0dbe16b7a13c92181067507bd4cb32bd1302 supabase functions deploy level-upgrade --project-ref cvqibjcbfrwsgkvthccp

# Rewards system
SUPABASE_ACCESS_TOKEN=sbp_537d0dbe16b7a13c92181067507bd4cb32bd1302 supabase functions deploy rewards --project-ref cvqibjcbfrwsgkvthccp

# Balance management
SUPABASE_ACCESS_TOKEN=sbp_537d0dbe16b7a13c92181067507bd4cb32bd1302 supabase functions deploy balance --project-ref cvqibjcbfrwsgkvthccp
```

## SQL Fixes Available

### Layer Rewards Fixes
- `./scripts/fix_layer_reward_amounts.sql`
- `./scripts/fix_layer_reward_status_by_level.sql`
- `./scripts/fix_missing_layer_rewards.sql`
- `./scripts/fix_all_members_rewards.sql`

### Wallet Case Fixes
- `./scripts/fix_wallet_case.sql`
- `./scripts/fix_wallet_case_safe.sql`

## Project Configuration

### Key Files
- `package.json` - NPM scripts and dependencies
- `db/deploy-edge-functions.sh` - Main deployment script
- `scripts/sync-types.sh` - Type synchronization
- `scripts/test-complete-flow.sh` - End-to-end testing

### Environment Variables
```bash
PROJECT_REF="cvqibjcbfrwsgkvthccp"
ACCESS_TOKEN="sbp_537d0dbe16b7a13c92181067507bd4cb32bd1302"
DB_PASSWORD="bee8881941"
```

## Quick Start

1. **Development Setup**
   ```bash
   npm install
   npm run sync:types
   npm run check
   ```

2. **Database Verification**
   ```bash
   npm run db:check
   npm run test:flow
   ```

3. **Function Deployment**
   ```bash
   npm run functions:deploy:all
   ```

4. **Full Testing**
   ```bash
   npm run test:flow
   npm run test:matrix
   ```

## Troubleshooting

### Common Issues
- **Type errors**: Run `npm run sync:types`
- **Database connection**: Check `npm run setup:db`
- **Function deployment**: Verify access token in scripts
- **Test failures**: Run `npm run db:fix` first

### Debug Commands
```bash
# Check all services status
npm run supabase:status

# Validate database integrity
npm run db:check

# Test complete user flow
npm run test:flow

# Check file hygiene
npm run tools:hygiene
```
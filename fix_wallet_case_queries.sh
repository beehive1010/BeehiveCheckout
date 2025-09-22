#!/bin/bash

# ========================================
# BEEHIVE Quick Data Sync Fix Executor
# Execute the comprehensive data sync fix
# ========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 BEEHIVE Data Synchronization Fix${NC}"
echo "========================================="

# Check if SQL file exists
SQL_FILE="sql/fix_data_sync_comprehensive.sql"
if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}❌ Error: SQL file not found at $SQL_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  WARNING: This script will make significant changes to your database!${NC}"
echo "The following operations will be performed:"
echo "1. Normalize all wallet addresses to Ethereum format"
echo "2. Remove duplicate member records"
echo "3. Synchronize membership levels"
echo "4. Rebuild referral matrix according to MarketingPlan.md"
echo "5. Add database constraints for data integrity"
echo "6. Create enhanced triggers for auto-synchronization"
echo ""

# Prompt for confirmation
read -p "Do you want to proceed? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 0
fi

echo -e "${BLUE}📋 Executing data synchronization fix...${NC}"

# Execute the SQL file using production database
PGPASSWORD=bee8881941 psql "postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres" -f "$SQL_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Data synchronization completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}🔍 Running post-fix verification...${NC}"
    
    # Run the integrity check
    ./scripts/check-data-integrity.sh
    
    echo ""
    echo -e "${GREEN}🎉 All operations completed successfully!${NC}"
    echo ""
    echo "What was fixed:"
    echo "✅ Wallet address case normalized to Ethereum format"
    echo "✅ Duplicate records removed"
    echo "✅ Membership levels synchronized"  
    echo "✅ Referral matrix rebuilt"
    echo "✅ Database constraints added"
    echo "✅ Auto-sync triggers enhanced"
    echo ""
    echo "The account 0xa212A85f7434A5EBAa5b468971EC3972cE72a544 should now:"
    echo "- Have consistent wallet address case across all tables"
    echo "- Show current_level = 2 (matching highest NFT level)"
    echo "- Have only one member record"
    echo "- Be able to upgrade to Level 3"
    
else
    echo -e "${RED}❌ Error: Data synchronization failed!${NC}"
    echo "Please check the error messages above and try again."
    echo "If the issue persists, please contact the development team."
    exit 1
fi
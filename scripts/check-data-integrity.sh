#!/bin/bash

# ========================================
# BEEHIVE Platform Data Integrity Check
# Automated script for monitoring data consistency
# ========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_HOST="db.cdjmtevekxpmgrixkiqt.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
DB_PASSWORD="bee8881941"

# Log file
LOG_FILE="/tmp/beehive-data-integrity-$(date +%Y%m%d-%H%M%S).log"

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to execute SQL and capture output
execute_sql() {
    local sql="$1"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$sql" 2>&1
}

# Function to send notification (placeholder - implement based on your notification system)
send_notification() {
    local message="$1"
    local severity="$2"
    
    # This is a placeholder - you can implement email, Slack, Discord, etc.
    log "NOTIFICATION [$severity]: $message"
    
    # Example: Send to a webhook or notification service
    # curl -X POST "YOUR_WEBHOOK_URL" -d "{\"text\":\"$message\",\"severity\":\"$severity\"}"
}

# Main function
main() {
    echo -e "${BLUE}🔍 BEEHIVE Data Integrity Check${NC}"
    echo "========================================"
    log "Starting data integrity check..."
    
    # Run the integrity check
    echo -e "${YELLOW}Running data integrity checks...${NC}"
    
    local check_results
    check_results=$(execute_sql "SELECT check_name, status, issue_count, description FROM check_data_integrity();")
    
    if [ $? -eq 0 ]; then
        echo "$check_results"
        log "Data integrity check completed successfully"
        
        # Parse results and check for failures
        local failures
        failures=$(echo "$check_results" | grep "❌ FAIL" | wc -l)
        
        if [ "$failures" -gt 0 ]; then
            echo -e "${RED}⚠️ Found $failures data integrity issues!${NC}"
            log "WARNING: Found $failures data integrity issues"
            send_notification "BEEHIVE Data Integrity Alert: Found $failures issues requiring attention" "WARNING"
            
            # Show detailed failure information
            echo -e "${YELLOW}Detailed failure information:${NC}"
            echo "$check_results" | grep "❌ FAIL"
            
        else
            echo -e "${GREEN}✅ All data integrity checks passed!${NC}"
            log "SUCCESS: All data integrity checks passed"
        fi
        
    else
        echo -e "${RED}❌ Failed to run data integrity check${NC}"
        log "ERROR: Failed to run data integrity check"
        send_notification "BEEHIVE Data Integrity Error: Failed to run integrity check" "ERROR"
        exit 1
    fi
    
    # Additional specific checks
    echo -e "${YELLOW}Running additional specific checks...${NC}"
    
    # Check for the specific problematic account
    echo "Checking account 0xa212A85f7434A5EBAa5b468971EC3972cE72a544..."
    local account_check
    account_check=$(execute_sql "
        SELECT 
            m.wallet_address,
            m.current_level,
            COALESCE(MAX(mb.nft_level), 0) as highest_nft_level,
            COUNT(*) as member_records,
            (SELECT COUNT(*) FROM referrals WHERE LOWER(referrer_wallet) = LOWER(m.wallet_address)) as direct_referrals
        FROM members m
        LEFT JOIN membership mb ON LOWER(m.wallet_address) = LOWER(mb.wallet_address)
        WHERE LOWER(m.wallet_address) = LOWER('0xa212A85f7434A5EBAa5b468971EC3972cE72a544')
        GROUP BY m.wallet_address, m.current_level;
    ")
    
    if [ $? -eq 0 ]; then
        echo "$account_check"
        log "Account-specific check completed"
    else
        log "ERROR: Failed to run account-specific check"
    fi
    
    # Check database performance metrics
    echo -e "${YELLOW}Checking database performance metrics...${NC}"
    local perf_check
    perf_check=$(execute_sql "
        SELECT 
            'Members' as table_name, COUNT(*) as record_count 
        FROM members
        UNION ALL
        SELECT 
            'Users' as table_name, COUNT(*) as record_count 
        FROM users
        UNION ALL
        SELECT 
            'Membership' as table_name, COUNT(*) as record_count 
        FROM membership
        UNION ALL
        SELECT 
            'Referrals' as table_name, COUNT(*) as record_count 
        FROM referrals;
    ")
    
    if [ $? -eq 0 ]; then
        echo "$perf_check"
        log "Performance metrics check completed"
    else
        log "ERROR: Failed to run performance metrics check"
    fi
    
    echo "========================================"
    echo -e "${BLUE}📊 Check Summary${NC}"
    echo "Log file: $LOG_FILE"
    echo "Timestamp: $(date)"
    
    log "Data integrity check completed"
}

# Script usage information
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "OPTIONS:"
    echo "  -h, --help     Show this help message"
    echo "  -v, --verbose  Enable verbose logging"
    echo "  -q, --quiet    Suppress non-error output"
    echo ""
    echo "Examples:"
    echo "  $0                 # Run normal integrity check"
    echo "  $0 --verbose       # Run with verbose logging"
    echo "  $0 --quiet         # Run silently (errors only)"
}

# Parse command line arguments
VERBOSE=false
QUIET=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -q|--quiet)
            QUIET=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Run the main function
if [ "$QUIET" = true ]; then
    main > /dev/null 2>&1 || exit 1
else
    main
fi
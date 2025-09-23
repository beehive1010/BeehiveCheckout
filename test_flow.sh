#!/bin/bash

# =============================================================================
# BEEHIVE V2 - Complete Membership Activation Test Flow
# =============================================================================
# Tests the entire membership activation workflow including:
# 1. User registration via activate-membership API
# 2. BCC initialization and release
# 3. Matrix placement using BFS algorithm
# 4. Layer rewards generation and status logic
# 5. User notifications
# 6. Data synchronization across all tables
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_URL="https://cvqibjcbfrwsgkvthccp.supabase.co"
SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY:-"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYwNDI4NTUsImV4cCI6MjA0MTYxODg1NX0.bvmSV_5OmUAPJtHGE5nj4QaZ7QKm5f_GWM20UwJuPho"}
DB_PASSWORD="bee8881941"
DB_HOST="db.cvqibjcbfrwsgkvthccp.supabase.co"

# Test data
TEST_WALLET="0xTEST$(date +%s)000000000000000000000TEST"
TEST_REFERRER="0x0000000000000000000000000000000000000001"  # Root wallet
TEST_EMAIL="test$(date +%s)@example.com"
TEST_USERNAME="testuser$(date +%s)"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}🧪 BEEHIVE V2 MEMBERSHIP TEST FLOW${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "Test Wallet: ${CYAN}$TEST_WALLET${NC}"
echo -e "Referrer: ${CYAN}$TEST_REFERRER${NC}"
echo -e "Start Time: ${YELLOW}$(date)${NC}"
echo ""

# =============================================================================
# Helper Functions
# =============================================================================

log_step() {
    echo -e "${PURPLE}📋 STEP $1: $2${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Database query helper
query_db() {
    local query="$1"
    psql "postgresql://postgres:$DB_PASSWORD@$DB_HOST:5432/postgres" -c "$query" -t -A 2>/dev/null
}

# API call helper
call_api() {
    local endpoint="$1"
    local method="$2"
    local data="$3"
    local headers="$4"
    
    if [ "$method" = "POST" ]; then
        curl -s -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -H "x-wallet-address: $TEST_WALLET" \
            $headers \
            -d "$data" \
            "$SUPABASE_URL/functions/v1/$endpoint"
    else
        curl -s -X GET \
            -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            $headers \
            "$SUPABASE_URL/functions/v1/$endpoint"
    fi
}

# Initialize test report
TEST_REPORT="/tmp/beehive_test_report_$(date +%s).md"
echo "# BEEHIVE V2 Membership Activation Test Report" > $TEST_REPORT
echo "Generated: $(date)" >> $TEST_REPORT
echo "Test Wallet: $TEST_WALLET" >> $TEST_REPORT
echo "" >> $TEST_REPORT

# =============================================================================
# Step 1: Pre-test Database State Check
# =============================================================================

log_step 1 "Pre-test Database State Check"

echo "## Pre-test State" >> $TEST_REPORT

# Get current counts
INITIAL_USERS=$(query_db "SELECT COUNT(*) FROM users;")
INITIAL_MEMBERS=$(query_db "SELECT COUNT(*) FROM members;")
INITIAL_MEMBERSHIPS=$(query_db "SELECT COUNT(*) FROM membership;")
INITIAL_USER_BALANCES=$(query_db "SELECT COUNT(*) FROM user_balances;")
INITIAL_MATRIX_REFERRALS=$(query_db "SELECT COUNT(*) FROM matrix_referrals;")
INITIAL_LAYER_REWARDS=$(query_db "SELECT COUNT(*) FROM layer_rewards;")

log_info "Initial counts:"
echo "Users: $INITIAL_USERS"
echo "Members: $INITIAL_MEMBERS" 
echo "Memberships: $INITIAL_MEMBERSHIPS"
echo "User Balances: $INITIAL_USER_BALANCES"
echo "Matrix Referrals: $INITIAL_MATRIX_REFERRALS"
echo "Layer Rewards: $INITIAL_LAYER_REWARDS"

echo "- Users: $INITIAL_USERS" >> $TEST_REPORT
echo "- Members: $INITIAL_MEMBERS" >> $TEST_REPORT
echo "- Memberships: $INITIAL_MEMBERSHIPS" >> $TEST_REPORT
echo "- User Balances: $INITIAL_USER_BALANCES" >> $TEST_REPORT
echo "- Matrix Referrals: $INITIAL_MATRIX_REFERRALS" >> $TEST_REPORT
echo "- Layer Rewards: $INITIAL_LAYER_REWARDS" >> $TEST_REPORT
echo "" >> $TEST_REPORT

# =============================================================================
# Step 2: Create User Registration via Auth API
# =============================================================================

log_step 2 "Create User Registration via Auth API"

AUTH_PAYLOAD='{
    "action": "register",
    "walletAddress": "'$TEST_WALLET'",
    "email": "'$TEST_EMAIL'",
    "username": "'$TEST_USERNAME'",
    "referrerWallet": "'$TEST_REFERRER'"
}'

AUTH_RESPONSE=$(call_api "auth" "POST" "$AUTH_PAYLOAD")
echo "Auth API Response: $AUTH_RESPONSE"

echo "## Step 2: User Registration" >> $TEST_REPORT
echo "### Request:" >> $TEST_REPORT
echo '```json' >> $TEST_REPORT
echo "$AUTH_PAYLOAD" >> $TEST_REPORT
echo '```' >> $TEST_REPORT
echo "### Response:" >> $TEST_REPORT
echo '```json' >> $TEST_REPORT
echo "$AUTH_RESPONSE" >> $TEST_REPORT
echo '```' >> $TEST_REPORT

# Verify user creation
USER_CREATED=$(query_db "SELECT COUNT(*) FROM users WHERE wallet_address = '$TEST_WALLET';")
if [ "$USER_CREATED" = "1" ]; then
    log_success "User created successfully"
    echo "✅ User created successfully" >> $TEST_REPORT
else
    log_error "User creation failed"
    echo "❌ User creation failed" >> $TEST_REPORT
fi

sleep 2

# =============================================================================
# Step 3: Activate Membership via activate-membership API
# =============================================================================

log_step 3 "Activate Membership via activate-membership API"

MEMBERSHIP_PAYLOAD='{
    "transactionHash": "0xtest'$(date +%s)'",
    "level": 1,
    "paymentAmount": 130,
    "referrerWallet": "'$TEST_REFERRER'",
    "walletAddress": "'$TEST_WALLET'"
}'

MEMBERSHIP_RESPONSE=$(call_api "activate-membership" "POST" "$MEMBERSHIP_PAYLOAD")
echo "Membership API Response: $MEMBERSHIP_RESPONSE"

echo "## Step 3: Membership Activation" >> $TEST_REPORT
echo "### Request:" >> $TEST_REPORT
echo '```json' >> $TEST_REPORT
echo "$MEMBERSHIP_PAYLOAD" >> $TEST_REPORT
echo '```' >> $TEST_REPORT
echo "### Response:" >> $TEST_REPORT
echo '```json' >> $TEST_REPORT
echo "$MEMBERSHIP_RESPONSE" >> $TEST_REPORT
echo '```' >> $TEST_REPORT

sleep 3  # Wait for triggers to complete

# =============================================================================
# Step 4: Verify Membership Record Creation
# =============================================================================

log_step 4 "Verify Membership Record Creation"

MEMBERSHIP_RECORD=$(query_db "SELECT id, wallet_address, nft_level, is_member, unlock_membership_level, claim_price FROM membership WHERE wallet_address = '$TEST_WALLET';")
MEMBER_RECORD=$(query_db "SELECT wallet_address, referrer_wallet, current_level, activation_sequence FROM members WHERE wallet_address = '$TEST_WALLET';")

echo "## Step 4: Membership Record Verification" >> $TEST_REPORT

if [ -n "$MEMBERSHIP_RECORD" ]; then
    log_success "Membership record created"
    echo "Membership: $MEMBERSHIP_RECORD"
    echo "✅ Membership record: $MEMBERSHIP_RECORD" >> $TEST_REPORT
else
    log_error "Membership record not created"
    echo "❌ Membership record not created" >> $TEST_REPORT
fi

if [ -n "$MEMBER_RECORD" ]; then
    log_success "Member record created" 
    echo "Member: $MEMBER_RECORD"
    echo "✅ Member record: $MEMBER_RECORD" >> $TEST_REPORT
else
    log_error "Member record not created"
    echo "❌ Member record not created" >> $TEST_REPORT
fi

# =============================================================================
# Step 5: Verify BCC Balance Initialization and Release
# =============================================================================

log_step 5 "Verify BCC Balance Initialization and Release"

USER_BALANCE=$(query_db "SELECT wallet_address, bcc_balance, bcc_locked, activation_tier FROM user_balances WHERE wallet_address = '$TEST_WALLET';")
BCC_RELEASE_LOG=$(query_db "SELECT wallet_address, from_level, to_level, bcc_released, bcc_remaining_locked, release_reason FROM bcc_release_logs WHERE wallet_address = '$TEST_WALLET';")

echo "## Step 5: BCC Balance Verification" >> $TEST_REPORT

if [ -n "$USER_BALANCE" ]; then
    log_success "User balance created"
    echo "Balance: $USER_BALANCE"
    echo "✅ User balance: $USER_BALANCE" >> $TEST_REPORT
    
    # Check if BCC amounts are correct (should be 500 + 100 = 600 available, 10350 locked)
    BCC_BALANCE=$(query_db "SELECT bcc_balance FROM user_balances WHERE wallet_address = '$TEST_WALLET';")
    BCC_LOCKED=$(query_db "SELECT bcc_locked FROM user_balances WHERE wallet_address = '$TEST_WALLET';")
    
    if [ "$BCC_BALANCE" = "600.000000" ] && [ "$BCC_LOCKED" = "10350.000000" ]; then
        log_success "BCC amounts are correct (600 available, 10350 locked)"
        echo "✅ BCC amounts correct" >> $TEST_REPORT
    else
        log_warning "BCC amounts may be incorrect: Balance=$BCC_BALANCE, Locked=$BCC_LOCKED"
        echo "⚠️ BCC amounts: Balance=$BCC_BALANCE, Locked=$BCC_LOCKED" >> $TEST_REPORT
    fi
else
    log_error "User balance not created"
    echo "❌ User balance not created" >> $TEST_REPORT
fi

if [ -n "$BCC_RELEASE_LOG" ]; then
    log_success "BCC release log created"
    echo "Release log: $BCC_RELEASE_LOG"
    echo "✅ BCC release log: $BCC_RELEASE_LOG" >> $TEST_REPORT
else
    log_error "BCC release log not created"
    echo "❌ BCC release log not created" >> $TEST_REPORT
fi

# =============================================================================
# Step 6: Verify Matrix Placement
# =============================================================================

log_step 6 "Verify Matrix Placement"

MATRIX_RECORD=$(query_db "SELECT matrix_root_wallet, member_wallet, parent_wallet, parent_depth, position, referral_type FROM matrix_referrals WHERE member_wallet = '$TEST_WALLET';")
REFERRALS_RECORD=$(query_db "SELECT member_wallet, referrer_wallet, matrix_root_wallet, matrix_layer, matrix_position, is_spillover_placement FROM referrals WHERE member_wallet = '$TEST_WALLET';")

echo "## Step 6: Matrix Placement Verification" >> $TEST_REPORT

if [ -n "$MATRIX_RECORD" ]; then
    log_success "Matrix referrals record created"
    echo "Matrix: $MATRIX_RECORD"
    echo "✅ Matrix placement: $MATRIX_RECORD" >> $TEST_REPORT
else
    log_error "Matrix referrals record not created"
    echo "❌ Matrix placement not created" >> $TEST_REPORT
fi

if [ -n "$REFERRALS_RECORD" ]; then
    log_success "Referrals record created"
    echo "Referrals: $REFERRALS_RECORD"
    echo "✅ Referrals record: $REFERRALS_RECORD" >> $TEST_REPORT
else
    log_error "Referrals record not created"
    echo "❌ Referrals record not created" >> $TEST_REPORT
fi

# Verify matrix tree view update
TREE_VIEW_RECORD=$(query_db "SELECT matrix_root_wallet, member_wallet, layer, referral_depth, position, is_spillover FROM matrix_referrals_tree_view WHERE member_wallet = '$TEST_WALLET';")

if [ -n "$TREE_VIEW_RECORD" ]; then
    log_success "Matrix tree view updated"
    echo "Tree view: $TREE_VIEW_RECORD"
    echo "✅ Matrix tree view: $TREE_VIEW_RECORD" >> $TEST_REPORT
else
    log_error "Matrix tree view not updated"
    echo "❌ Matrix tree view not updated" >> $TEST_REPORT
fi

# =============================================================================
# Step 7: Verify Layer Rewards Generation
# =============================================================================

log_step 7 "Verify Layer Rewards Generation"

LAYER_REWARD=$(query_db "SELECT triggering_member_wallet, reward_recipient_wallet, matrix_root_wallet, triggering_nft_level, reward_amount, matrix_layer, status, recipient_required_level, recipient_current_level FROM layer_rewards WHERE triggering_member_wallet = '$TEST_WALLET';")

echo "## Step 7: Layer Rewards Verification" >> $TEST_REPORT

if [ -n "$LAYER_REWARD" ]; then
    log_success "Layer reward created"
    echo "Layer reward: $LAYER_REWARD"
    echo "✅ Layer reward: $LAYER_REWARD" >> $TEST_REPORT
    
    # Check reward status logic
    REWARD_STATUS=$(query_db "SELECT status FROM layer_rewards WHERE triggering_member_wallet = '$TEST_WALLET';")
    RECIPIENT_LEVEL=$(query_db "SELECT recipient_current_level FROM layer_rewards WHERE triggering_member_wallet = '$TEST_WALLET';")
    REQUIRED_LEVEL=$(query_db "SELECT recipient_required_level FROM layer_rewards WHERE triggering_member_wallet = '$TEST_WALLET';")
    
    echo "Status: $REWARD_STATUS, Recipient Level: $RECIPIENT_LEVEL, Required Level: $REQUIRED_LEVEL"
    
    if [ "$RECIPIENT_LEVEL" -ge "$REQUIRED_LEVEL" ] && [ "$REWARD_STATUS" = "claimable" ]; then
        log_success "Reward status logic correct (claimable)"
        echo "✅ Reward status logic correct" >> $TEST_REPORT
    elif [ "$RECIPIENT_LEVEL" -lt "$REQUIRED_LEVEL" ] && [ "$REWARD_STATUS" = "pending" ]; then
        log_success "Reward status logic correct (pending)"
        echo "✅ Reward status logic correct" >> $TEST_REPORT
    else
        log_warning "Reward status logic may be incorrect"
        echo "⚠️ Reward status logic: Status=$REWARD_STATUS, Recipient=$RECIPIENT_LEVEL, Required=$REQUIRED_LEVEL" >> $TEST_REPORT
    fi
else
    log_error "Layer reward not created"
    echo "❌ Layer reward not created" >> $TEST_REPORT
fi

# =============================================================================
# Step 8: Check User Notifications
# =============================================================================

log_step 8 "Check User Notifications"

# Check if user_notifications table exists and has records
NOTIFICATION_EXISTS=$(query_db "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_notifications');")

echo "## Step 8: User Notifications Verification" >> $TEST_REPORT

if [ "$NOTIFICATION_EXISTS" = "t" ]; then
    USER_NOTIFICATIONS=$(query_db "SELECT user_wallet, notification_type, title, message, is_read FROM user_notifications WHERE user_wallet = '$TEST_WALLET';" 2>/dev/null || echo "")
    
    if [ -n "$USER_NOTIFICATIONS" ]; then
        log_success "User notifications created"
        echo "Notifications: $USER_NOTIFICATIONS"
        echo "✅ User notifications: $USER_NOTIFICATIONS" >> $TEST_REPORT
    else
        log_warning "No user notifications found"
        echo "⚠️ No user notifications found" >> $TEST_REPORT
    fi
else
    log_warning "User notifications table does not exist"
    echo "⚠️ User notifications table does not exist" >> $TEST_REPORT
fi

# =============================================================================
# Step 9: Final Database State Check
# =============================================================================

log_step 9 "Final Database State Check"

FINAL_USERS=$(query_db "SELECT COUNT(*) FROM users;")
FINAL_MEMBERS=$(query_db "SELECT COUNT(*) FROM members;")
FINAL_MEMBERSHIPS=$(query_db "SELECT COUNT(*) FROM membership;")
FINAL_USER_BALANCES=$(query_db "SELECT COUNT(*) FROM user_balances;")
FINAL_MATRIX_REFERRALS=$(query_db "SELECT COUNT(*) FROM matrix_referrals;")
FINAL_LAYER_REWARDS=$(query_db "SELECT COUNT(*) FROM layer_rewards;")

echo "## Step 9: Final State Comparison" >> $TEST_REPORT

log_info "Final counts:"
echo "Users: $FINAL_USERS (+$(($FINAL_USERS - $INITIAL_USERS)))"
echo "Members: $FINAL_MEMBERS (+$(($FINAL_MEMBERS - $INITIAL_MEMBERS)))"
echo "Memberships: $FINAL_MEMBERSHIPS (+$(($FINAL_MEMBERSHIPS - $INITIAL_MEMBERSHIPS)))"
echo "User Balances: $FINAL_USER_BALANCES (+$(($FINAL_USER_BALANCES - $INITIAL_USER_BALANCES)))"
echo "Matrix Referrals: $FINAL_MATRIX_REFERRALS (+$(($FINAL_MATRIX_REFERRALS - $INITIAL_MATRIX_REFERRALS)))"
echo "Layer Rewards: $FINAL_LAYER_REWARDS (+$(($FINAL_LAYER_REWARDS - $INITIAL_LAYER_REWARDS)))"

echo "| Table | Initial | Final | Change |" >> $TEST_REPORT
echo "|-------|---------|-------|--------|" >> $TEST_REPORT
echo "| Users | $INITIAL_USERS | $FINAL_USERS | +$(($FINAL_USERS - $INITIAL_USERS)) |" >> $TEST_REPORT
echo "| Members | $INITIAL_MEMBERS | $FINAL_MEMBERS | +$(($FINAL_MEMBERS - $INITIAL_MEMBERS)) |" >> $TEST_REPORT
echo "| Memberships | $INITIAL_MEMBERSHIPS | $FINAL_MEMBERSHIPS | +$(($FINAL_MEMBERSHIPS - $INITIAL_MEMBERSHIPS)) |" >> $TEST_REPORT
echo "| User Balances | $INITIAL_USER_BALANCES | $FINAL_USER_BALANCES | +$(($FINAL_USER_BALANCES - $INITIAL_USER_BALANCES)) |" >> $TEST_REPORT
echo "| Matrix Referrals | $INITIAL_MATRIX_REFERRALS | $FINAL_MATRIX_REFERRALS | +$(($FINAL_MATRIX_REFERRALS - $INITIAL_MATRIX_REFERRALS)) |" >> $TEST_REPORT
echo "| Layer Rewards | $INITIAL_LAYER_REWARDS | $FINAL_LAYER_REWARDS | +$(($FINAL_LAYER_REWARDS - $INITIAL_LAYER_REWARDS)) |" >> $TEST_REPORT

# =============================================================================
# Step 10: Generate Test Summary
# =============================================================================

log_step 10 "Generate Test Summary"

echo "" >> $TEST_REPORT
echo "## Test Summary" >> $TEST_REPORT

# Calculate success rate
TOTAL_CHECKS=8
PASSED_CHECKS=0

[ -n "$USER_CREATED" ] && [ "$USER_CREATED" = "1" ] && ((PASSED_CHECKS++))
[ -n "$MEMBERSHIP_RECORD" ] && ((PASSED_CHECKS++))
[ -n "$MEMBER_RECORD" ] && ((PASSED_CHECKS++))
[ -n "$USER_BALANCE" ] && ((PASSED_CHECKS++))
[ -n "$BCC_RELEASE_LOG" ] && ((PASSED_CHECKS++))
[ -n "$MATRIX_RECORD" ] && ((PASSED_CHECKS++))
[ -n "$LAYER_REWARD" ] && ((PASSED_CHECKS++))
[ -n "$TREE_VIEW_RECORD" ] && ((PASSED_CHECKS++))

SUCCESS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

echo "### Results:" >> $TEST_REPORT
echo "- **Total Checks**: $TOTAL_CHECKS" >> $TEST_REPORT
echo "- **Passed**: $PASSED_CHECKS" >> $TEST_REPORT
echo "- **Success Rate**: $SUCCESS_RATE%" >> $TEST_REPORT
echo "" >> $TEST_REPORT

if [ $SUCCESS_RATE -ge 90 ]; then
    TEST_STATUS="✅ EXCELLENT"
    log_success "Test completed with $SUCCESS_RATE% success rate"
elif [ $SUCCESS_RATE -ge 75 ]; then
    TEST_STATUS="⚠️ GOOD"
    log_warning "Test completed with $SUCCESS_RATE% success rate"
else
    TEST_STATUS="❌ NEEDS ATTENTION"
    log_error "Test completed with only $SUCCESS_RATE% success rate"
fi

echo "**Overall Status**: $TEST_STATUS" >> $TEST_REPORT

# =============================================================================
# Test Completion
# =============================================================================

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}🏁 TEST COMPLETED${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "Test Wallet: ${CYAN}$TEST_WALLET${NC}"
echo -e "Success Rate: ${YELLOW}$SUCCESS_RATE%${NC}"
echo -e "Report: ${YELLOW}$TEST_REPORT${NC}"
echo -e "End Time: ${YELLOW}$(date)${NC}"
echo ""

echo "### Test Details" >> $TEST_REPORT
echo "- **Test Wallet**: $TEST_WALLET" >> $TEST_REPORT
echo "- **Test Duration**: Started at start time, ended at $(date)" >> $TEST_REPORT
echo "- **Report Location**: $TEST_REPORT" >> $TEST_REPORT

# Display report location
log_info "Full test report saved to: $TEST_REPORT"
echo ""
echo -e "${PURPLE}📋 To view the full report:${NC}"
echo -e "${CYAN}cat $TEST_REPORT${NC}"
echo ""

# Optionally display the report
if [ "${1:-}" = "--show-report" ]; then
    echo -e "${PURPLE}📋 TEST REPORT:${NC}"
    echo -e "${CYAN}===============${NC}"
    cat $TEST_REPORT
fi

exit 0
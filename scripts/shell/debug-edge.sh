#!/bin/bash

# Edge Functions Debug Script for Beehive Platform
# This script helps debug and test Supabase Edge Functions

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Beehive Edge Functions Debug Tool${NC}"
echo "========================================"

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    echo "💡 Install: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI found${NC}"

# ==========================================================================
# STEP 1: LIST DEPLOYED FUNCTIONS
# ==========================================================================

echo ""
echo -e "${YELLOW}📋 Step 1: Listing deployed functions...${NC}"
echo "----------------------------------------"

if supabase functions list --project-ref cdjmtevekxpmgrixkiqt; then
    echo -e "${GREEN}✅ Functions listed successfully${NC}"
else
    echo -e "${RED}❌ Failed to list functions${NC}"
    echo "💡 Check your project reference and authentication"
fi

# ==========================================================================
# STEP 2: CHECK REQUIRED SECRETS
# ==========================================================================

echo ""
echo -e "${YELLOW}🔐 Step 2: Checking required secrets...${NC}"
echo "----------------------------------------"

# Expected secrets for Beehive platform
REQUIRED_SECRETS=(
    "THIRDWEB_SECRET_KEY"
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "SERVER_WALLET_PRIVATE_KEY"
    "OPENAI_API_KEY"
)

echo "Required secrets for Beehive:"
for secret in "${REQUIRED_SECRETS[@]}"; do
    echo "  - $secret"
done

echo ""
echo "Current secrets in project:"
if supabase secrets list --project-ref cdjmtevekxpmgrixkiqt; then
    echo -e "${GREEN}✅ Secrets listed successfully${NC}"
else
    echo -e "${RED}❌ Failed to list secrets${NC}"
    echo "💡 You may need to authenticate: supabase login"
fi

# ==========================================================================
# STEP 3: LOCAL FUNCTION DEVELOPMENT
# ==========================================================================

echo ""
echo -e "${YELLOW}🚀 Step 3: Local function development${NC}"
echo "----------------------------------------"

# Check if local Supabase is running
echo "Checking if local Supabase is running..."
if supabase status 2>/dev/null | grep -q "supabase local development setup is running"; then
    echo -e "${GREEN}✅ Local Supabase is running${NC}"
    LOCAL_RUNNING=true
else
    echo -e "${YELLOW}⚠️  Local Supabase not running${NC}"
    LOCAL_RUNNING=false
fi

if [ "$LOCAL_RUNNING" = false ]; then
    echo "Would you like to start local development? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "Starting local Supabase..."
        supabase start
        LOCAL_RUNNING=true
    fi
fi

if [ "$LOCAL_RUNNING" = true ]; then
    echo ""
    echo "Starting local edge functions server..."
    echo "💡 This will serve functions at http://localhost:54321/functions/v1/"
    echo "💡 Press Ctrl+C to stop"
    echo ""
    
    # Start functions serve in background
    supabase functions serve --env-file .env.local &
    SERVE_PID=$!
    
    # Wait a moment for server to start
    sleep 5
    
    echo -e "${GREEN}✅ Functions server started (PID: $SERVE_PID)${NC}"
    echo ""
    
    # ==========================================================================
    # STEP 4: TEST FUNCTIONS WITH EXAMPLE PAYLOADS
    # ==========================================================================
    
    echo -e "${YELLOW}🧪 Step 4: Testing functions with example payloads${NC}"
    echo "----------------------------------------"
    
    BASE_URL="http://localhost:54321/functions/v1"
    
    # Test auth function
    echo "Testing auth function..."
    curl -X POST "$BASE_URL/auth" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c" \
        -d '{"wallet_address":"0x1234567890abcdef1234567890abcdef12345678"}' \
        -w "\nStatus: %{http_code}\n" || true
    
    echo ""
    
    # Test matrix function
    echo "Testing matrix function..."
    curl -X GET "$BASE_URL/matrix" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c" \
        -H "x-wallet-address: 0x1234567890abcdef1234567890abcdef12345678" \
        -w "\nStatus: %{http_code}\n" || true
    
    echo ""
    
    # Test rewards function
    echo "Testing rewards function..."
    curl -X GET "$BASE_URL/rewards?action=get-claimable-rewards" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c" \
        -H "x-wallet-address: 0x1234567890abcdef1234567890abcdef12345678" \
        -w "\nStatus: %{http_code}\n" || true
    
    echo ""
    
    # Test balance function
    echo "Testing balance function..."
    curl -X GET "$BASE_URL/balance" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c" \
        -H "x-wallet-address: 0x1234567890abcdef1234567890abcdef12345678" \
        -w "\nStatus: %{http_code}\n" || true
    
    echo ""
    echo -e "${BLUE}💡 Test completed. Check the responses above for errors.${NC}"
    echo ""
    echo "Common issues and fixes:"
    echo "1. 404 errors: Function not found - check function name and deployment"
    echo "2. 500 errors: Check function logs with 'supabase functions logs'"
    echo "3. Authorization errors: Check JWT token and permissions"
    echo "4. Import errors: Check package.json and import statements"
    echo "5. Environment errors: Check .env.local file and secrets"
    echo ""
    
    # Stop the functions server
    echo "Stopping functions server..."
    kill $SERVE_PID 2>/dev/null || true
    echo -e "${GREEN}✅ Functions server stopped${NC}"
    
else
    echo -e "${YELLOW}⚠️  Skipping local function tests - local Supabase not running${NC}"
fi

# ==========================================================================
# STEP 5: CHECK FUNCTION IMPORT ISSUES
# ==========================================================================

echo ""
echo -e "${YELLOW}📦 Step 5: Checking for common import/env issues${NC}"
echo "----------------------------------------"

FUNCTIONS_DIR="supabase/functions"

if [ -d "$FUNCTIONS_DIR" ]; then
    echo "Scanning function files for common issues..."
    
    # Check for import statements
    echo ""
    echo "Import analysis:"
    find "$FUNCTIONS_DIR" -name "*.ts" -exec echo "File: {}" \; -exec grep -n "^import\|^from" {} \; 2>/dev/null | head -20
    
    # Check for environment variable usage
    echo ""
    echo "Environment variable usage:"
    find "$FUNCTIONS_DIR" -name "*.ts" -exec grep -l "Deno.env\|process.env" {} \; 2>/dev/null | while read -r file; do
        echo "File: $file"
        grep -n "Deno.env\|process.env" "$file" | head -5
        echo ""
    done
    
    # Check for common edge function patterns
    echo "Edge function handler patterns:"
    find "$FUNCTIONS_DIR" -name "*.ts" -exec grep -l "serve\|Request\|Response" {} \; 2>/dev/null | head -5
    
else
    echo -e "${RED}❌ Functions directory not found: $FUNCTIONS_DIR${NC}"
    echo "💡 Make sure you're in the project root directory"
fi

echo ""
echo -e "${GREEN}🎉 Debug audit complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Fix any missing secrets identified above"
echo "2. Address import/environment issues in function files"
echo "3. Test functions locally before deploying"
echo "4. Check logs with: supabase functions logs --project-ref cdjmtevekxpmgrixkiqt"
echo ""
echo "For detailed function debugging:"
echo "  supabase functions logs <function-name> --project-ref cdjmtevekxpmgrixkiqt"
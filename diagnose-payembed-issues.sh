#!/bin/bash

# Diagnose PayEmbed Purchase Issues
# This script checks why NFTs are not being claimed after PayEmbed purchase

DATABASE_URL="${DATABASE_URL:-postgresql://postgres.cvqibjcbfrwsgkvthccp:Szs5201314wxl!@aws-0-us-east-1.pooler.supabase.com:6543/postgres}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PayEmbed Purchase Diagnosis${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. Check recent users registered
echo -e "${GREEN}1. Recent User Registrations (Last 10)${NC}"
psql "$DATABASE_URL" -c "
SELECT
    wallet_address,
    username,
    email,
    referrer_wallet,
    created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;
" 2>/dev/null || echo -e "${RED}Database connection failed${NC}"
echo ""

# 2. Check recent membership records
echo -e "${GREEN}2. Recent Membership Records (Last 10)${NC}"
psql "$DATABASE_URL" -c "
SELECT
    wallet_address,
    nft_level,
    is_member,
    claimed_at,
    unlock_membership_level
FROM membership
ORDER BY claimed_at DESC
LIMIT 10;
" 2>/dev/null || echo -e "${RED}Query failed${NC}"
echo ""

# 3. Check recent members activations
echo -e "${GREEN}3. Recent Member Activations (Last 10)${NC}"
psql "$DATABASE_URL" -c "
SELECT
    wallet_address,
    current_level,
    activation_sequence,
    activation_time,
    referrer_wallet,
    is_activated,
    total_nft_claimed
FROM members
ORDER BY activation_time DESC
LIMIT 10;
" 2>/dev/null || echo -e "${RED}Query failed${NC}"
echo ""

# 4. Check for users who registered but never activated
echo -e "${GREEN}4. Users Registered but NOT Activated${NC}"
psql "$DATABASE_URL" -c "
SELECT
    u.wallet_address,
    u.username,
    u.created_at as registered_at,
    m.wallet_address as member_exists,
    m.is_activated
FROM users u
LEFT JOIN members m ON u.wallet_address ILIKE m.wallet_address
WHERE m.wallet_address IS NULL OR m.is_activated = false
ORDER BY u.created_at DESC
LIMIT 10;
" 2>/dev/null || echo -e "${RED}Query failed${NC}"
echo ""

# 5. Check membership records without corresponding members records
echo -e "${GREEN}5. Membership Records WITHOUT Members Records${NC}"
psql "$DATABASE_URL" -c "
SELECT
    ms.wallet_address,
    ms.nft_level,
    ms.claimed_at,
    m.wallet_address as member_exists,
    m.current_level
FROM membership ms
LEFT JOIN members m ON ms.wallet_address ILIKE m.wallet_address
WHERE m.wallet_address IS NULL
ORDER BY ms.claimed_at DESC
LIMIT 10;
" 2>/dev/null || echo -e "${RED}Query failed${NC}"
echo ""

# 6. Check recent referrals
echo -e "${GREEN}6. Recent Referrals (Last 10)${NC}"
psql "$DATABASE_URL" -c "
SELECT
    referred_wallet,
    referrer_wallet,
    referral_depth,
    created_at
FROM referrals
ORDER BY created_at DESC
LIMIT 10;
" 2>/dev/null || echo -e "${RED}Query failed${NC}"
echo ""

# 7. Check user_balances creation
echo -e "${GREEN}7. Recent User Balance Records (Last 10)${NC}"
psql "$DATABASE_URL" -c "
SELECT
    wallet_address,
    claimable,
    pending,
    claimed,
    created_at,
    updated_at
FROM user_balances
ORDER BY created_at DESC
LIMIT 10;
" 2>/dev/null || echo -e "${RED}Query failed${NC}"
echo ""

# 8. Check for activation gaps (time between registration and activation)
echo -e "${GREEN}8. Activation Gaps (Registration → Activation Time)${NC}"
psql "$DATABASE_URL" -c "
SELECT
    u.wallet_address,
    u.created_at as registered_at,
    m.activation_time,
    EXTRACT(EPOCH FROM (m.activation_time - u.created_at))/60 as minutes_to_activate,
    m.current_level
FROM users u
INNER JOIN members m ON u.wallet_address ILIKE m.wallet_address
WHERE m.activation_time IS NOT NULL
ORDER BY m.activation_time DESC
LIMIT 10;
" 2>/dev/null || echo -e "${RED}Query failed${NC}"
echo ""

# 9. Summary statistics
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Summary Statistics${NC}"
echo -e "${BLUE}========================================${NC}"

psql "$DATABASE_URL" -c "
SELECT
    'Total Users' as metric,
    COUNT(*) as count
FROM users
UNION ALL
SELECT
    'Total Memberships' as metric,
    COUNT(*) as count
FROM membership
UNION ALL
SELECT
    'Total Activated Members' as metric,
    COUNT(*) as count
FROM members WHERE is_activated = true
UNION ALL
SELECT
    'Users Without Activation' as metric,
    COUNT(*) as count
FROM users u
LEFT JOIN members m ON u.wallet_address ILIKE m.wallet_address
WHERE m.wallet_address IS NULL OR m.is_activated = false;
" 2>/dev/null || echo -e "${RED}Query failed${NC}"

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Diagnosis Complete${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "${YELLOW}Key Questions to Answer:${NC}"
echo "1. Are users registering successfully? (Check section 1)"
echo "2. Are membership records being created? (Check section 2)"
echo "3. Are members records being created? (Check section 3)"
echo "4. How many users registered but never activated? (Check section 4)"
echo "5. Are there orphaned membership records? (Check section 5)"
echo ""
echo -e "${YELLOW}Common Issues:${NC}"
echo "• If users registered but no membership: PayEmbed not calling activation API"
echo "• If membership exists but no members: Edge Function failing at members creation"
echo "• If long activation gaps: Network/timeout issues"
echo "• If orphaned memberships: Database triggers not executing"
echo ""

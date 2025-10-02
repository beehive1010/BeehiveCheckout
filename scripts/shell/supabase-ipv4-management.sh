#!/bin/bash

# Supabase IPv4 Add-on Management Script
# This script helps manage IPv4 add-on for your Supabase project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🌐 Supabase IPv4 Add-on Management${NC}"
echo "==================================="

# Project configuration
export SUPABASE_ACCESS_TOKEN="sbp_537d0dbe16b7a13c92181067507bd4cb32bd1302"
export PROJECT_REF="cdjmtevekxpmgrixkiqt"

echo -e "${YELLOW}📋 Project Details:${NC}"
echo "Project Reference: $PROJECT_REF"
echo "Access Token: ${SUPABASE_ACCESS_TOKEN:0:20}..."
echo ""

# Function to check current IPv4 status
check_ipv4_status() {
    echo -e "${YELLOW}🔍 Checking current IPv4 add-on status...${NC}"
    
    response=$(curl -s -X GET "https://api.supabase.com/v1/projects/$PROJECT_REF/billing/addons" \
        -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
        -H "Content-Type: application/json")
    
    if echo "$response" | grep -q "ipv4"; then
        echo -e "${GREEN}✅ IPv4 add-on is currently enabled${NC}"
        echo "Current status:"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
    else
        echo -e "${YELLOW}⚠️  IPv4 add-on is not enabled${NC}"
        echo "Available add-ons:"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
    fi
    echo ""
}

# Function to enable IPv4 add-on
enable_ipv4() {
    echo -e "${YELLOW}🔧 Enabling IPv4 add-on...${NC}"
    
    response=$(curl -s -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/addons" \
        -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "addon_type": "ipv4"
        }')
    
    if echo "$response" | grep -q -i "error\|fail"; then
        echo -e "${RED}❌ Failed to enable IPv4 add-on${NC}"
        echo "Error response:"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
    else
        echo -e "${GREEN}✅ IPv4 add-on enable request sent${NC}"
        echo "Response:"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
    fi
    echo ""
}

# Function to disable IPv4 add-on
disable_ipv4() {
    echo -e "${YELLOW}🔧 Disabling IPv4 add-on...${NC}"
    
    response=$(curl -s -X DELETE "https://api.supabase.com/v1/projects/$PROJECT_REF/billing/addons/ipv4" \
        -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN")
    
    if echo "$response" | grep -q -i "error\|fail"; then
        echo -e "${RED}❌ Failed to disable IPv4 add-on${NC}"
        echo "Error response:"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
    else
        echo -e "${GREEN}✅ IPv4 add-on disable request sent${NC}"
        echo "Response:"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
    fi
    echo ""
}

# Function to show project info
show_project_info() {
    echo -e "${YELLOW}📊 Getting project information...${NC}"
    
    response=$(curl -s -X GET "https://api.supabase.com/v1/projects/$PROJECT_REF" \
        -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN")
    
    echo "Project Info:"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    echo ""
}

# Main menu
case "${1:-menu}" in
    "status")
        check_ipv4_status
        ;;
    "enable")
        enable_ipv4
        check_ipv4_status
        ;;
    "disable") 
        disable_ipv4
        check_ipv4_status
        ;;
    "info")
        show_project_info
        ;;
    "menu"|*)
        echo -e "${BLUE}Available commands:${NC}"
        echo "  $0 status   - Check IPv4 add-on status"
        echo "  $0 enable   - Enable IPv4 add-on"
        echo "  $0 disable  - Disable IPv4 add-on" 
        echo "  $0 info     - Show project information"
        echo ""
        echo "Running status check..."
        check_ipv4_status
        ;;
esac

echo -e "${BLUE}💡 Notes:${NC}"
echo "- IPv4 add-on provides a dedicated IPv4 address for your project"
echo "- This may incur additional billing charges"
echo "- Changes may take a few minutes to propagate"
echo "- Check your Supabase dashboard for billing details"
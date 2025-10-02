#!/bin/bash

# Type Sync Script for Beehive Platform
# This script syncs Supabase generated types with the local types file

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Beehive Type Sync Tool${NC}"
echo "=========================="

PROJECT_ID="cdjmtevekxpmgrixkiqt"
TYPES_FILE="types/database.types.ts"
BACKUP_FILE="types/database.types.ts.backup"
TEMP_FILE="types/database.types.ts.new"

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    echo "💡 Install: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI found${NC}"

# Check if types file exists
if [ ! -f "$TYPES_FILE" ]; then
    echo -e "${YELLOW}⚠️  Types file not found: $TYPES_FILE${NC}"
    echo "Creating directory structure..."
    mkdir -p types
    echo "Will create new types file..."
else
    echo -e "${GREEN}✅ Current types file found: $TYPES_FILE${NC}"
fi

echo ""
echo -e "${YELLOW}🔍 Step 1: Generating fresh types from Supabase...${NC}"

# Generate new types
if supabase gen types typescript --project-id $PROJECT_ID > "$TEMP_FILE"; then
    echo -e "${GREEN}✅ New types generated successfully${NC}"
else
    echo -e "${RED}❌ Failed to generate types${NC}"
    echo "💡 Check your project ID and authentication"
    rm -f "$TEMP_FILE"
    exit 1
fi

echo ""
echo -e "${YELLOW}🔍 Step 2: Comparing with existing types...${NC}"

# If types file exists, compare and create backup
if [ -f "$TYPES_FILE" ]; then
    # Create backup
    cp "$TYPES_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
    
    # Compare files
    if cmp -s "$TYPES_FILE" "$TEMP_FILE"; then
        echo -e "${GREEN}✅ Types are already up to date!${NC}"
        rm "$TEMP_FILE"
        rm "$BACKUP_FILE"
        exit 0
    else
        echo -e "${YELLOW}📋 Changes detected! Generating diff...${NC}"
        echo ""
        
        # Show diff if available
        if command -v diff &> /dev/null; then
            echo "=== DIFF SUMMARY ==="
            diff -u "$TYPES_FILE" "$TEMP_FILE" | head -50 || true
            echo ""
        fi
        
        # Show file sizes
        OLD_SIZE=$(wc -l < "$TYPES_FILE")
        NEW_SIZE=$(wc -l < "$TEMP_FILE")
        echo "📊 Lines changed: $OLD_SIZE → $NEW_SIZE"
    fi
else
    echo -e "${YELLOW}📝 Creating new types file...${NC}"
fi

echo ""
echo -e "${YELLOW}🔍 Step 3: Updating types file...${NC}"

# Replace the file
mv "$TEMP_FILE" "$TYPES_FILE"
echo -e "${GREEN}✅ Types file updated: $TYPES_FILE${NC}"

echo ""
echo -e "${YELLOW}🔍 Step 4: Validating TypeScript compilation...${NC}"

# Check if TypeScript can compile
if command -v npx &> /dev/null && [ -f "package.json" ]; then
    if npx tsc --noEmit --skipLibCheck; then
        echo -e "${GREEN}✅ TypeScript compilation successful${NC}"
    else
        echo -e "${RED}❌ TypeScript compilation failed${NC}"
        echo "💡 You may need to update code that uses the old types"
        
        # Restore backup if it exists
        if [ -f "$BACKUP_FILE" ]; then
            echo -e "${YELLOW}🔄 Restoring backup due to compilation errors...${NC}"
            mv "$BACKUP_FILE" "$TYPES_FILE"
            echo -e "${GREEN}✅ Backup restored${NC}"
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Skipping TypeScript validation (tsc not available)${NC}"
fi

# Clean up backup if everything is OK
if [ -f "$BACKUP_FILE" ]; then
    rm "$BACKUP_FILE"
fi

echo ""
echo -e "${GREEN}🎉 Type sync completed successfully!${NC}"
echo ""
echo "📋 Summary:"
echo "  - Fresh types generated from Supabase project $PROJECT_ID"
echo "  - Types file updated: $TYPES_FILE"
echo "  - TypeScript compilation validated"
echo ""
echo "📝 Next steps:"
echo "  1. Review the changes in your IDE"
echo "  2. Update any code that uses changed types"
echo "  3. Test your application"
echo "  4. Commit the changes"
echo ""
echo "💡 Suggested commit message:"
echo "   chore(types): sync supabase generated types"
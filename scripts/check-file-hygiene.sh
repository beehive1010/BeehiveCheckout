#!/bin/bash

# File Hygiene Check Script
# Ensures root directory follows organization rules

set -e

echo "🧹 Running file hygiene check..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0

# Check for stray MD files (excluding allowlist)
echo "Checking for stray Markdown files..."
STRAY_MD=$(find . -maxdepth 1 -name "*.md" \
  -not -name "README.md" \
  -not -name "CHANGELOG.md" \
  -not -name "CLAUDE.md" \
  -not -name ".codebase-rules.md")

if [ ! -z "$STRAY_MD" ]; then
  echo -e "${RED}❌ Stray MD files found in root:${NC}"
  echo "$STRAY_MD"
  echo -e "${YELLOW}Move to: docs/{adr,notes,api,guides,archive}/${NC}"
  FAILED=1
fi

# Check for stray SQL files
echo "Checking for stray SQL files..."
STRAY_SQL=$(find . -maxdepth 1 -name "*.sql")

if [ ! -z "$STRAY_SQL" ]; then
  echo -e "${RED}❌ Stray SQL files found in root:${NC}"
  echo "$STRAY_SQL"
  echo -e "${YELLOW}Move to: db/{migrations,seeds,adhoc,archive}/${NC}"
  FAILED=1
fi

# Check for required directories
echo "Checking required directory structure..."
REQUIRED_DIRS=(
  "docs"
  "docs/adr"
  "docs/notes"
  "docs/api"
  "docs/guides"
  "docs/archive"
  "db"
  "db/migrations"
  "db/seeds"
  "db/adhoc"
  "db/archive"
)

for dir in "${REQUIRED_DIRS[@]}"; do
  if [ ! -d "$dir" ]; then
    echo -e "${RED}❌ Missing required directory: $dir${NC}"
    FAILED=1
  fi
done

# Summary
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ File hygiene check passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ File hygiene check failed!${NC}"
  echo ""
  echo "Fix the issues above and run again."
  exit 1
fi
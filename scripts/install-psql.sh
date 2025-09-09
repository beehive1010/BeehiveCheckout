#!/bin/bash

# PostgreSQL Client Installation Script
# This script helps install psql for running database audits

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 PostgreSQL Client Installation Helper${NC}"
echo "=========================================="

# Detect operating system
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    OS="windows"
else
    OS="unknown"
fi

echo -e "${YELLOW}🔍 Detected OS: $OS${NC}"
echo ""

case $OS in
    "linux")
        echo -e "${YELLOW}📦 Installing PostgreSQL client on Linux...${NC}"
        echo ""
        echo "Choose your Linux distribution:"
        echo "1) Ubuntu/Debian (apt)"
        echo "2) CentOS/RHEL/Fedora (yum/dnf)"
        echo "3) Arch Linux (pacman)"
        echo "4) Alpine Linux (apk)"
        echo ""
        read -p "Enter choice [1-4]: " choice
        
        case $choice in
            1)
                echo "Running: sudo apt-get update && sudo apt-get install -y postgresql-client"
                sudo apt-get update && sudo apt-get install -y postgresql-client
                ;;
            2)
                echo "Running: sudo yum install -y postgresql (or dnf install postgresql)"
                if command -v dnf &> /dev/null; then
                    sudo dnf install -y postgresql
                else
                    sudo yum install -y postgresql
                fi
                ;;
            3)
                echo "Running: sudo pacman -S postgresql"
                sudo pacman -S postgresql
                ;;
            4)
                echo "Running: sudo apk add postgresql-client"
                sudo apk add postgresql-client
                ;;
            *)
                echo -e "${RED}❌ Invalid choice${NC}"
                exit 1
                ;;
        esac
        ;;
        
    "macos")
        echo -e "${YELLOW}📦 Installing PostgreSQL client on macOS...${NC}"
        echo ""
        if command -v brew &> /dev/null; then
            echo "Using Homebrew..."
            echo "Running: brew install postgresql"
            brew install postgresql
        else
            echo -e "${RED}❌ Homebrew not found${NC}"
            echo "Install Homebrew first: https://brew.sh"
            echo "Or download PostgreSQL from: https://www.postgresql.org/download/macosx/"
            exit 1
        fi
        ;;
        
    "windows")
        echo -e "${YELLOW}📦 Windows detected${NC}"
        echo ""
        echo "Please install PostgreSQL client manually:"
        echo "1. Download from: https://www.postgresql.org/download/windows/"
        echo "2. Or use Chocolatey: choco install postgresql"
        echo "3. Or use Scoop: scoop install postgresql"
        echo "4. Or use WSL and run this script in Ubuntu"
        ;;
        
    *)
        echo -e "${RED}❌ Unknown operating system${NC}"
        echo "Please install PostgreSQL client manually for your system"
        echo "Visit: https://www.postgresql.org/download/"
        exit 1
        ;;
esac

echo ""
echo -e "${YELLOW}🧪 Testing PostgreSQL client installation...${NC}"

if command -v psql &> /dev/null; then
    echo -e "${GREEN}✅ psql command found!${NC}"
    psql --version
    echo ""
    echo -e "${GREEN}🎉 Installation successful!${NC}"
    echo ""
    echo "You can now run database audits:"
    echo "  npm run audit:functions"
    echo "  npm run audit:rls"
    echo ""
    echo "Or use psql directly:"
    echo "  psql \"postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres\""
else
    echo -e "${RED}❌ psql command still not found${NC}"
    echo "You may need to:"
    echo "1. Restart your terminal"
    echo "2. Add PostgreSQL to your PATH"
    echo "3. Use the Supabase Dashboard SQL Editor instead"
fi

echo ""
echo -e "${BLUE}💡 Alternative: Supabase Dashboard${NC}"
echo "If psql installation fails, you can always use:"
echo "1. Open: https://supabase.com/dashboard/project/cvqibjcbfrwsgkvthccp"
echo "2. Go to: SQL Editor"
echo "3. Copy/paste contents from sql/ files"
echo "4. Execute the queries"
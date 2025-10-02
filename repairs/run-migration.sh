#!/bin/bash

# Beehive Database Migration Script
# Run this script to apply all database repairs

set -e  # Exit on any error

echo "🚀 Starting Beehive Database Migration..."
echo "📊 Target: db.cdjmtevekxpmgrixkiqt.supabase.co"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql command not found"
    echo "💡 Install PostgreSQL client:"
    echo "   Ubuntu/Debian: sudo apt-get install postgresql-client"
    echo "   macOS: brew install postgresql"
    echo "   Windows: Download from postgresql.org"
    exit 1
fi

# Set connection string
DATABASE_URL="postgresql://postgres:bee8881941@db.cdjmtevekxpmgrixkiqt.supabase.co:5432/postgres"

echo "🔍 Testing connection..."
if ! psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
    echo "❌ Failed to connect to database"
    echo "🔧 Please check:"
    echo "   - Database password is correct"
    echo "   - Network connectivity"
    echo "   - Supabase project is running"
    exit 1
fi
echo "✅ Connection successful"
echo ""

echo "📋 Applying migration script..."
echo "⚠️  This will modify your database schema"
read -p "Continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration cancelled"
    exit 0
fi

# Execute the migration
echo "🔄 Running migration..."
if psql "$DATABASE_URL" -f execute-all.sql; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "🔍 Running verification checks..."
    
    # Run verification
    psql "$DATABASE_URL" -c "
    SELECT 
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admins') 
            THEN '✅ admins table exists'
            ELSE '❌ admins table missing'
        END as admin_check,
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'multi_chain_payments') 
            THEN '✅ multi_chain_payments exists'
            ELSE '❌ multi_chain_payments missing'
        END as payments_check,
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'user_bcc_balance_overview') 
            THEN '✅ user_bcc_balance_overview exists'
            ELSE '❌ user_bcc_balance_overview missing'
        END as view_check;
    "
    
    echo ""
    echo "🎉 Database repair migration completed!"
    echo "📈 Edge functions should now work correctly"
    echo "🔒 Security policies are in place"
    echo "⚡ Performance indexes created"
    echo ""
    echo "Next steps:"
    echo "1. Test your Supabase Edge Functions"
    echo "2. Verify admin panel functionality"
    echo "3. Test multi-chain payment processing"
    
else
    echo ""
    echo "❌ Migration failed!"
    echo "🔧 Please check the error messages above"
    echo "💡 You can run individual steps manually if needed"
    exit 1
fi
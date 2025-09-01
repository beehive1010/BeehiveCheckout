#!/bin/bash

# Deploy the demo-claim edge function to Supabase
echo "🚀 Deploying demo-claim edge function..."

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Deploy the function
echo "📤 Deploying function to Supabase..."
supabase functions deploy demo-claim --project-ref wykvpctrsqhebqpjmvdb

if [ $? -eq 0 ]; then
    echo "✅ Edge function deployed successfully!"
    echo "🔗 Function URL: https://wykvpctrsqhebqpjmvdb.supabase.co/functions/v1/demo-claim"
    echo ""
    echo "📋 Next steps:"
    echo "1. Test the demo claim button"
    echo "2. Check database records in membership_nfts_v2, global_matrix_positions_v2, etc."
    echo "3. Verify referrer rewards in layer_rewards_v2"
else
    echo "❌ Edge function deployment failed!"
    echo "💡 Try running: supabase link --project-ref wykvpctrsqhebqpjmvdb"
fi
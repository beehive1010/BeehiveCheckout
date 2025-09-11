#!/bin/bash

# Deploy Notifications Edge Function
echo "🔔 Deploying Notifications Edge Function..."

# Set the access token and project reference
export SUPABASE_ACCESS_TOKEN="sbp_92c70391157352d8248124dcf96b62368b45afe1"
PROJECT_REF="cvqibjcbfrwsgkvthccp"

echo "📋 Project: $PROJECT_REF"
echo "🔧 Function: notifications"

# Deploy the notifications function
echo "🚀 Starting deployment..."
supabase functions deploy notifications --project-ref $PROJECT_REF

if [ $? -eq 0 ]; then
    echo "✅ Notifications Edge Function deployed successfully!"
    echo "🌐 Function URL: https://$PROJECT_REF.supabase.co/functions/v1/notifications"
    echo ""
    echo "🧪 Testing function..."
    echo "You can test it with:"
    echo "curl -X POST 'https://$PROJECT_REF.supabase.co/functions/v1/notifications?action=stats' \\"
    echo "     -H 'x-wallet-address: 0x1234567890123456789012345678901234567890' \\"
    echo "     -H 'Content-Type: application/json'"
else
    echo "❌ Failed to deploy notifications function"
    echo "Please check your access token and project reference"
fi
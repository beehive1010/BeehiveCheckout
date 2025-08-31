#!/bin/bash

# Deployment script for Supabase Edge Functions
# Run this script from a local machine with Docker installed

SUPABASE_ACCESS_TOKEN="sbp_44074d7afa032fd206a032b605ed537b3c77d21d"
PROJECT_REF="wykvpctrsqhebqpjmvdb"

echo "Deploying Edge Functions to Supabase..."

# Deploy each function
functions=(
    "hello-world"
    "verify-wallet"
    "register-user"
    "get-user"
    "registration-status"
    "activate-membership"
    "log-wallet-connection"
    "get-user-activity"
    "get-user-balances"
)

for func in "${functions[@]}"; do
    echo "Deploying $func..."
    SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase functions deploy $func --project-ref $PROJECT_REF
    
    if [ $? -eq 0 ]; then
        echo "✅ $func deployed successfully"
    else
        echo "❌ Failed to deploy $func"
    fi
done

echo "Deployment complete!"
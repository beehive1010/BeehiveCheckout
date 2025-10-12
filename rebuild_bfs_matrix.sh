#!/bin/bash

DATABASE_URL="postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres?sslmode=require"

echo "🔄 Rebuilding BFS spillover matrix..."

# 重新运行generation-based逻辑（因为它更适合19层递推系统）
psql "$DATABASE_URL" << 'EOF'
SELECT fn_place_by_bfs_spillover();
SELECT COUNT(*) as total, MAX(layer_index) as max_layer FROM matrix_referrals_v2;
EOF

echo "✅ BFS matrix rebuild complete!"

#!/usr/bin/env node

/**
 * Script to run specific migrations on Supabase
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Read Supabase config from .env
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

async function executeSql(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL execution failed: ${error}`);
  }

  return await response.json();
}

async function runMigration(filePath) {
  console.log(`\n📄 Running migration: ${path.basename(filePath)}`);
  const sql = fs.readFileSync(filePath, 'utf8');

  try {
    await executeSql(sql);
    console.log(`✅ Migration completed: ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`❌ Migration failed: ${error.message}`);
    throw error;
  }
}

async function main() {
  const migrations = [
    'supabase/migrations/20251102000000_drop_old_matrix_views.sql',
    'supabase/migrations/20251102000001_create_v_matrix_tree_19_layers_from_members.sql'
  ];

  console.log('🚀 Starting migrations...');

  for (const migration of migrations) {
    await runMigration(migration);
  }

  console.log('\n✅ All migrations completed successfully!');
}

main().catch(error => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});

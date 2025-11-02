#!/usr/bin/env tsx

/**
 * Direct SQL execution using Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

// Create supabase client with service role key
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSqlFile(filePath: string) {
  console.log(`\n📄 Reading migration: ${filePath}`);
  const sql = readFileSync(filePath, 'utf8');

  console.log(`📤 Executing SQL (${sql.length} chars)...`);

  // Execute raw SQL using supabase
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error(`❌ Error executing ${filePath}:`, error);
    throw error;
  }

  console.log(`✅ Successfully executed: ${filePath}`);
  return data;
}

async function main() {
  console.log('🚀 Starting migrations...\n');

  try {
    // First, drop old views
    await executeSqlFile('supabase/migrations/20251102000000_drop_old_matrix_views.sql');

    // Then create new views
    await executeSqlFile('supabase/migrations/20251102000001_create_v_matrix_tree_19_layers_from_members.sql');

    console.log('\n✅ All migrations completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();

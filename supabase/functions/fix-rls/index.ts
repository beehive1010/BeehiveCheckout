// Emergency RLS Fix for nft_purchases table
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Use service role for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔧 Starting nft_purchases RLS fix...');

    // Step 1: Enable RLS on nft_purchases table
    const enableRlsQuery = `ALTER TABLE nft_purchases ENABLE ROW LEVEL SECURITY;`;
    
    // Step 2: Drop existing policies to avoid conflicts
    const dropPoliciesQueries = [
      `DROP POLICY IF EXISTS "Users can read own purchases" ON nft_purchases;`,
      `DROP POLICY IF EXISTS "Users can create own purchases" ON nft_purchases;`,
      `DROP POLICY IF EXISTS "Service role full access nft_purchases" ON nft_purchases;`,
      `DROP POLICY IF EXISTS "Public can read purchases" ON nft_purchases;`,
      `DROP POLICY IF EXISTS "Allow NFT purchases" ON nft_purchases;`,
      `DROP POLICY IF EXISTS "Allow NFT purchases for wallet users" ON nft_purchases;`
    ];

    // Step 3: Create new policies
    const createPoliciesQueries = [
      // Allow service role full access
      `CREATE POLICY "Service role full access nft_purchases" ON nft_purchases
         FOR ALL TO service_role
         USING (true) WITH CHECK (true);`,
      
      // Allow anon/authenticated users to insert purchases (wallet-based auth)
      `CREATE POLICY "Allow NFT purchases for wallet users" ON nft_purchases
         FOR INSERT TO anon, authenticated
         WITH CHECK (true);`,
      
      // Allow public reading of purchases 
      `CREATE POLICY "Public can read purchases" ON nft_purchases
         FOR SELECT TO anon, authenticated
         USING (true);`
    ];

    // Execute all queries
    console.log('📝 Enabling RLS...');
    await supabase.rpc('exec_sql', { sql_query: enableRlsQuery });

    console.log('🗑️ Dropping existing policies...');
    for (const query of dropPoliciesQueries) {
      try {
        await supabase.rpc('exec_sql', { sql_query: query });
      } catch (error) {
        console.log(`⚠️ Policy might not exist: ${error.message}`);
      }
    }

    console.log('🔒 Creating new RLS policies...');
    for (const query of createPoliciesQueries) {
      await supabase.rpc('exec_sql', { sql_query: query });
      console.log('✅ Created policy');
    }

    // Step 4: Verify policies
    console.log('🔍 Verifying policies...');
    const { data: policies } = await supabase.rpc('exec_sql', {
      sql_query: `SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'nft_purchases' ORDER BY policyname;`
    });

    console.log('📊 Current nft_purchases policies:', policies);

    return new Response(JSON.stringify({
      success: true,
      message: 'nft_purchases RLS policies fixed successfully',
      policies: policies || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ RLS fix error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fix RLS policies',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
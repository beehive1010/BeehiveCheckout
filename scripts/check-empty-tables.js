// Check empty table structures by inserting and reading back
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wykvpctrsqhebqpjmvdb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5a3ZwY3Ryc3FoZWJxcGptdmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1OTA1MzgsImV4cCI6MjA3MjE2NjUzOH0.q_8CQHImQ2si6dUCw0LGCIwUkd9Efah665h_zP_HQIA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkEmptyTables() {
  console.log('🔍 Checking empty table structures...');
  
  // Try to insert minimal data to see what columns are required
  const testWallet = '0xTEST123';
  
  try {
    // Test bcc_balances structure
    console.log('📋 Testing bcc_balances structure...');
    const { data: bccData, error: bccError } = await supabase
      .from('bcc_balances')
      .insert({ wallet_address: testWallet })
      .select()
      .single();
    
    if (bccData) {
      console.log('✅ bcc_balances columns:', Object.keys(bccData));
      // Clean up
      await supabase.from('bcc_balances').delete().eq('wallet_address', testWallet);
    } else {
      console.log('❌ bcc_balances error:', bccError);
    }
    
    // Test cth_balances structure  
    console.log('📋 Testing cth_balances structure...');
    const { data: cthData, error: cthError } = await supabase
      .from('cth_balances')
      .insert({ wallet_address: testWallet })
      .select()
      .single();
    
    if (cthData) {
      console.log('✅ cth_balances columns:', Object.keys(cthData));
      // Clean up
      await supabase.from('cth_balances').delete().eq('wallet_address', testWallet);
    } else {
      console.log('❌ cth_balances error:', cthError);
    }
    
  } catch (error) {
    console.error('💥 Table structure check failed:', error);
  }
  
  // Also check if we can see the schema directly
  console.log('🔍 Checking table info from information_schema...');
  try {
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('table_name, column_name, data_type')
      .in('table_name', ['bcc_balances', 'cth_balances', 'users'])
      .eq('table_schema', 'public');
    
    if (tableInfo) {
      console.log('✅ Table schema info:');
      const grouped = tableInfo.reduce((acc, row) => {
        if (!acc[row.table_name]) acc[row.table_name] = [];
        acc[row.table_name].push(`${row.column_name} (${row.data_type})`);
        return acc;
      }, {});
      
      Object.entries(grouped).forEach(([table, columns]) => {
        console.log(`  ${table}:`, columns);
      });
    } else {
      console.log('❌ Schema info error:', tableError);
    }
  } catch (error) {
    console.log('⚠️  Schema query not allowed:', error.message);
  }
}

checkEmptyTables();
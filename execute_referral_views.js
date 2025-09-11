import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://cvqibjcbfrwsgkvthccp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzI4MjAzOCwiZXhwIjoyMDQyODU4MDM4fQ.7qKsrUa7WJKECe_oFKxu_5nnJN9eNFo_l8OM-Kd8ORY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQL() {
  console.log('🔄 Starting to execute referral views SQL...');
  
  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('sql/create_correct_referral_views.sql', 'utf8');
    
    // Split into individual statements (excluding BEGIN/COMMIT)
    const statements = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '' && 
                     !line.includes('BEGIN;') && !line.includes('COMMIT;') &&
                     !line.includes('SELECT \'===') && !line.includes('as step') &&
                     !line.includes('as test_step') && !line.includes('as info') &&
                     !line.includes('as final_status'))
      .join('\n')
      .split(';')
      .filter(stmt => stmt.trim() !== '');

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement === '') continue;
      
      console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error);
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err.message);
      }
    }

    // Test the new functions
    console.log('\n🧪 Testing new functions...');
    
    // Test direct referral count
    const { data: countData, error: countError } = await supabase
      .rpc('get_direct_referral_count', { 
        p_wallet_address: '0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC' 
      });
    
    if (countError) {
      console.error('❌ Error testing direct referral count:', countError);
    } else {
      console.log('✅ Direct referral count test:', countData);
    }

    // Test user referral data
    const { data: userData, error: userError } = await supabase
      .rpc('get_user_referral_data', { 
        p_wallet_address: '0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC' 
      });
    
    if (userError) {
      console.error('❌ Error testing user referral data:', userError);
    } else {
      console.log('✅ User referral data test success. Sample data:');
      console.log(JSON.stringify(userData, null, 2));
    }

    console.log('\n🎉 All done!');
    
  } catch (error) {
    console.error('❌ Failed to execute SQL:', error);
  }
}

executeSQL();
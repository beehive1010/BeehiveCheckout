import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cvqibjcbfrwsgkvthccp.supabase.co';
// Using the anon key since the service key was not working
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcyODIwMzgsImV4cCI6MjA0Mjg1ODAzOH0.h2v9RTjnWzS7CbBOJdCPEomNbV0BPJX1FJqOvlk9uO8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testReferralViews() {
  console.log('🔄 Testing referral views and functions...');
  
  try {
    // First, create the views one by one
    console.log('\n1. Creating direct_referrals_view...');
    const { error: viewError1 } = await supabase.rpc('exec_sql', {
      sql: `
        DROP VIEW IF EXISTS direct_referrals_view CASCADE;
        CREATE OR REPLACE VIEW direct_referrals_view AS
        SELECT 
            r.wallet_address as referrer_wallet,
            r.username as referrer_name,
            m.wallet_address as member_wallet,
            m.username as member_name,
            m.created_at as referred_at,
            CASE 
                WHEN members.wallet_address IS NOT NULL THEN true 
                ELSE false 
            END as is_activated,
            members.current_level as member_level,
            members.activation_rank
        FROM users r
        JOIN users m ON m.referrer_wallet = r.wallet_address
        LEFT JOIN members ON members.wallet_address = m.wallet_address
        WHERE r.wallet_address != '0x0000000000000000000000000000000000000001'
        ORDER BY m.created_at DESC;
      `
    });
    
    if (viewError1) {
      console.error('❌ Error creating direct_referrals_view:', viewError1);
    } else {
      console.log('✅ direct_referrals_view created successfully');
    }

    // Test the get_direct_referral_count function if it already exists
    console.log('\n2. Testing get_direct_referral_count function...');
    const { data: countData, error: countError } = await supabase
      .rpc('get_direct_referral_count', { 
        p_wallet_address: '0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC' 
      });
    
    if (countError) {
      console.log('ℹ️ get_direct_referral_count function does not exist yet, will create it');
      
      // Create the function
      const { error: funcError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION get_direct_referral_count(
              p_wallet_address TEXT
          )
          RETURNS INTEGER AS $$
          BEGIN
              RETURN (
                  SELECT COUNT(*)::INTEGER
                  FROM users 
                  WHERE referrer_wallet = p_wallet_address
                  AND wallet_address != '0x0000000000000000000000000000000000000001'
              );
          END;
          $$ LANGUAGE plpgsql;
        `
      });
      
      if (funcError) {
        console.error('❌ Error creating get_direct_referral_count:', funcError);
      } else {
        console.log('✅ get_direct_referral_count function created');
        
        // Now test it
        const { data: newCountData, error: newCountError } = await supabase
          .rpc('get_direct_referral_count', { 
            p_wallet_address: '0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC' 
          });
        
        if (newCountError) {
          console.error('❌ Error testing get_direct_referral_count:', newCountError);
        } else {
          console.log('✅ Direct referral count test:', newCountData);
        }
      }
    } else {
      console.log('✅ Direct referral count test:', countData);
    }

    // Test direct query on the view
    console.log('\n3. Testing direct query on direct_referrals_view...');
    const { data: viewData, error: viewQueryError } = await supabase
      .from('direct_referrals_view')
      .select('*')
      .eq('referrer_wallet', '0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC')
      .limit(3);
    
    if (viewQueryError) {
      console.error('❌ Error querying direct_referrals_view:', viewQueryError);
    } else {
      console.log('✅ Direct referrals view query successful. Sample data:');
      console.log(JSON.stringify(viewData, null, 2));
    }

    // Test the directReferralService functions
    console.log('\n4. Testing directReferralService...');
    
    // Import and test the service
    const { getDirectReferralCount, getDirectReferralDetails } = await import('./src/lib/services/directReferralService.js');
    
    const count = await getDirectReferralCount('0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC');
    console.log('✅ DirectReferralService count:', count);
    
    const details = await getDirectReferralDetails('0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC');
    console.log('✅ DirectReferralService details count:', details.length);

    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

testReferralViews();
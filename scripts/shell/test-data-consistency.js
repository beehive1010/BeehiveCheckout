// 测试useWallet和activate-membership Edge Function的数据一致性
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cvqibjcbfrwsgkvthccp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY0MTI2MzQsImV4cCI6MjA0MTk4ODYzNH0.ZfZYFl6mWuGQlZVaHsK5YjbmjEJr6caxVHh4Sb6pxjQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TEST_WALLET = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E';

async function testDataConsistency() {
    console.log('🔍 Testing data consistency between useWallet and activate-membership Edge Function...');
    console.log(`📋 Test wallet: ${TEST_WALLET}`);
    
    try {
        // 1. Test Edge Function get-member-info action (simulating useWallet logic)
        console.log('\n=== Testing Edge Function get-member-info ===');
        const edgeFunctionResponse = await fetch('https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/activate-membership', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'x-wallet-address': TEST_WALLET
            },
            body: JSON.stringify({
                action: 'get-member-info',
                walletAddress: TEST_WALLET
            })
        });
        
        const edgeResult = await edgeFunctionResponse.json();
        console.log('📊 Edge Function Result:', JSON.stringify(edgeResult, null, 2));
        
        // 2. Test direct database queries (simulating useWallet queries)
        console.log('\n=== Testing Direct Database Queries (useWallet style) ===');
        
        // Check user exists (case insensitive)
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .ilike('wallet_address', TEST_WALLET)
            .maybeSingle();
            
        console.log('👤 Users table query:', { userData, userError });
        
        // Check member data (case insensitive)
        const { data: memberData, error: memberError } = await supabase
            .from('members')
            .select('*')
            .ilike('wallet_address', TEST_WALLET)
            .maybeSingle();
            
        console.log('📈 Members table query:', { memberData, memberError });
        
        // Check balance data (case insensitive)  
        const { data: balanceData, error: balanceError } = await supabase
            .from('user_balances')
            .select('*')
            .ilike('wallet_address', TEST_WALLET)
            .maybeSingle();
            
        console.log('💰 User_balances table query:', { balanceData, balanceError });
        
        // 3. Compare results
        console.log('\n=== Data Consistency Analysis ===');
        
        const edgeUserData = edgeResult.user;
        const edgeMemberData = edgeResult.member;
        const edgeIsActivated = edgeResult.isActivated;
        
        const directIsActivated = memberData?.current_level > 0;
        
        console.log('📊 Comparison Results:');
        console.log(`Edge Function isActivated: ${edgeIsActivated}`);
        console.log(`Direct Query isActivated: ${directIsActivated}`);
        console.log(`User data match: ${edgeUserData?.wallet_address?.toLowerCase() === userData?.wallet_address?.toLowerCase()}`);
        console.log(`Member level match: ${edgeMemberData?.current_level === memberData?.current_level}`);
        console.log(`Balance exists: ${!!balanceData}`);
        
        // 4. Test case sensitivity handling
        console.log('\n=== Case Sensitivity Test ===');
        const lowerCaseWallet = TEST_WALLET.toLowerCase();
        const mixedCaseWallet = TEST_WALLET;
        
        const { data: lowerResult } = await supabase
            .from('members')
            .select('wallet_address, current_level')
            .eq('wallet_address', lowerCaseWallet)
            .maybeSingle();
            
        const { data: mixedResult } = await supabase
            .from('members')
            .select('wallet_address, current_level')
            .eq('wallet_address', mixedCaseWallet)
            .maybeSingle();
            
        const { data: ilikeResult } = await supabase
            .from('members')
            .select('wallet_address, current_level')
            .ilike('wallet_address', mixedCaseWallet)
            .maybeSingle();
            
        console.log(`Lower case query result: ${!!lowerResult}`);
        console.log(`Mixed case query result: ${!!mixedResult}`);
        console.log(`Case insensitive (ilike) result: ${!!ilikeResult}`);
        
        // 5. Final recommendations
        console.log('\n=== Recommendations ===');
        if (edgeIsActivated === directIsActivated) {
            console.log('✅ Activation status is consistent between Edge Function and direct queries');
        } else {
            console.log('❌ Activation status INCONSISTENT - needs fixing');
        }
        
        if (!mixedResult && lowerResult) {
            console.log('⚠️  Case sensitivity issue detected - database stores lowercase, queries use mixed case');
            console.log('🔧 Recommendation: Always use .ilike() or .toLowerCase() in useWallet queries');
        }
        
        if (!balanceData) {
            console.log('❌ Balance data missing - activate_nft_level1_membership function may not be creating user_balances records');
        } else {
            console.log('✅ Balance data exists');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testDataConsistency();
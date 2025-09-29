// Simple database check script
const fetch = require('node-fetch');

async function checkDatabase() {
    try {
        console.log('🔍 Checking database status...');
        
        // First check the root member
        console.log('\n=== ROOT MEMBER CHECK ===');
        const rootCheck = await fetch('https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/activate-membership', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-wallet-address': '0x0000000000000000000000000000000000000001'
            },
            body: JSON.stringify({ action: 'get-member-info' })
        });
        
        const rootResult = await rootCheck.json();
        console.log('Root member data:', JSON.stringify(rootResult, null, 2));
        
        // Test the activation function with a demo transaction
        console.log('\n=== ACTIVATION FUNCTION TEST ===');
        const activationTest = await fetch('https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/activate-membership', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-wallet-address': '0x1234567890123456789012345678901234567890'
            },
            body: JSON.stringify({ 
                transactionHash: 'demo_test_' + Date.now(),
                level: 1,
                referrerWallet: '0x0000000000000000000000000000000000000001'
            })
        });
        
        const activationResult = await activationTest.json();
        console.log('Activation test result:', JSON.stringify(activationResult, null, 2));
        
    } catch (error) {
        console.error('Database check error:', error);
    }
}

checkDatabase();
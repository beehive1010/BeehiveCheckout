// Test script to check matrix data directly
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cvqibjcbfrwsgkvthccp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU1MjQxOTYsImV4cCI6MjA0MTEwMDE5Nn0.xFGfcz8fGlNLOqoJ7S1SqYXlNnqxDmb6q2BFt6jHkFE'
);

async function testMatrixData() {
  const walletAddress = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E';
  
  console.log('Testing matrix data for:', walletAddress);
  
  try {
    // Test direct database query
    console.log('\n1. Testing direct database query...');
    const { data: directData, error: directError } = await supabase
      .from('matrix_referrals_tree_view')
      .select('*')
      .eq('matrix_root_wallet', walletAddress)
      .order('layer');
    
    if (directError) {
      console.error('Direct query error:', directError);
    } else {
      console.log('Direct query result:', directData?.length, 'members');
      console.log('Sample data:', directData?.slice(0, 3));
    }
    
    // Test matrix-view function
    console.log('\n2. Testing matrix-view function...');
    const { data: functionData, error: functionError } = await supabase.functions.invoke('matrix-view', {
      body: { action: 'get-matrix-members' },
      headers: { 'x-wallet-address': walletAddress }
    });
    
    if (functionError) {
      console.error('Function error:', functionError);
    } else {
      console.log('Function response:', functionData);
      if (functionData?.data?.tree_members) {
        console.log('Tree members count:', functionData.data.tree_members.length);
        console.log('Tree members sample:', functionData.data.tree_members.slice(0, 3));
      }
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testMatrixData();
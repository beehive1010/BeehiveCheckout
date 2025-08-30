import { storage } from '../server/storage';

async function testReferralStats() {
  try {
    console.log('🧪 Testing getUserReferralStats with new matrix structure...\n');
    
    const rootWallet = '0x380fd6a57fc2df6f10b8920002e4acc7d57d61c0';
    
    // Test the ROOT user's referral stats
    console.log(`📊 Getting referral stats for ROOT user: ${rootWallet.slice(0, 8)}...`);
    const stats = await storage.getUserReferralStats(rootWallet);
    
    console.log('\n🎯 Referral Statistics:');
    console.log(`   Direct Referrals: ${stats.directReferrals}`);
    console.log(`   Total Team: ${stats.totalTeam}`);
    console.log(`   Total Earnings: $${stats.totalEarnings}`);
    console.log(`   Pending Rewards: $${stats.pendingRewards}`);
    
    console.log('\n👥 Direct Referrals List:');
    stats.directReferralsList.forEach((ref: any, index: number) => {
      console.log(`   ${index + 1}. ${ref.walletAddress.slice(0, 10)}... (${ref.username}) - Level ${ref.level}`);
    });
    
    console.log('\n🏗️  Matrix Layers (showing first 5):');
    stats.downlineMatrix.slice(0, 5).forEach((layer: any) => {
      console.log(`   Layer ${layer.level}: ${layer.members} members, ${layer.placements} placements`);
    });
    
    // Expected results based on our test data:
    console.log('\n✅ Expected Results:');
    console.log('   - Direct Referrals: 3 (L, M, R positions filled)');
    console.log('   - Total Team: 3 (all positions in ROOT matrix)');
    console.log('   - Layer 1: 3 placements (L, M, R)');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testReferralStats();
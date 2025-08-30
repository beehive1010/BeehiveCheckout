import { storage } from '../server/storage';

async function testViewBasedMatrix() {
  try {
    console.log('🔍 测试基于视图的矩阵系统...\n');
    
    const rootWallet = '0x380fd6a57fc2df6f10b8920002e4acc7d57d61c0';
    
    // 测试ROOT用户的推荐统计
    console.log(`📊 获取ROOT用户推荐统计: ${rootWallet.slice(0, 8)}...`);
    const stats = await storage.getUserReferralStats(rootWallet);
    
    console.log('\n🎯 推荐统计结果:');
    console.log(`   直推成员: ${stats.directReferrals}`);
    console.log(`   团队总数: ${stats.totalTeam}`);
    console.log(`   总收益: $${stats.totalEarnings}`);
    console.log(`   待提取奖励: $${stats.pendingRewards}`);
    
    console.log('\n👥 直推成员列表:');
    stats.directReferralsList.forEach((ref: any, index: number) => {
      console.log(`   ${index + 1}. ${ref.walletAddress.slice(0, 10)}... (${ref.username}) - Level ${ref.level}`);
    });
    
    console.log('\n🏗️ 矩阵层级 (前5层):');
    stats.downlineMatrix.slice(0, 5).forEach((layer: any) => {
      console.log(`   第${layer.level}层: ${layer.members} 成员, ${layer.placements} 位置`);
    });
    
    console.log('\n✅ 预期结果 (基于视图):');
    console.log('   - 直推成员: 3 (L, M, R位置)');
    console.log('   - 团队总数: 3 (ROOT矩阵中所有成员)');
    console.log('   - 第1层: 3成员, 3位置');
    console.log('   - 其他层级: 0成员, 0位置');
    
    console.log('\n🔍 验证结果:');
    console.log(`   直推成员 ${stats.directReferrals === 3 ? '✅' : '❌'} (${stats.directReferrals}/3)`);
    console.log(`   团队总数 ${stats.totalTeam === 3 ? '✅' : '❌'} (${stats.totalTeam}/3)`);
    
    const layer1 = stats.downlineMatrix[0];
    console.log(`   第1层成员 ${layer1.members === 3 ? '✅' : '❌'} (${layer1.members}/3)`);
    console.log(`   第1层位置 ${layer1.placements === 3 ? '✅' : '❌'} (${layer1.placements}/3)`);
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testViewBasedMatrix();
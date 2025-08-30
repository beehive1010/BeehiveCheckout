import { db } from '../server/db';
import { 
  users, 
  membershipState,
  bccBalances,
  merchantNFTs,
  nftPurchases,
  userRewards,
  orders,
  referralNodes,
  referralLayers
} from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

const ROOT = '0x380fd6a57fc2df6f10b8920002e4acc7d57d61c0';

// Helper function to generate test wallet addresses
function generateWallet(id: number): string {
  return ('0xtest' + id.toString().padStart(3, '0')).padEnd(42, '0');
}

// Function to create a user with their own matrix structure
async function createMemberWithMatrix(
  walletAddress: string,
  username: string,
  level: number,
  sponsorWallet: string,
  placerWallet: string | null = null
) {
  console.log(`\n👤 Creating ${username} (Level ${level} BBC)`);
  
  // Create user
  await db.insert(users).values({
    walletAddress,
    username,
    memberActivated: true,
    currentLevel: level,
    referrerWallet: sponsorWallet,
    registeredAt: new Date(),
  }).onConflictDoUpdate({
    target: users.walletAddress,
    set: { 
      username, 
      memberActivated: true,
      currentLevel: level 
    }
  });
  
  // Create membership state
  await db.insert(membershipState).values({
    walletAddress,
    activeLevel: level,
    levelsOwned: Array.from({length: level}, (_, i) => i + 1),
    joinedAt: new Date(),
  }).onConflictDoUpdate({
    target: membershipState.walletAddress,
    set: { activeLevel: level, levelsOwned: Array.from({length: level}, (_, i) => i + 1) }
  });
  
  // Create BCC balance
  const transferable = level * 500;
  const restricted = level * 100;
  await db.insert(bccBalances).values({
    walletAddress,
    transferable,
    restricted,
    totalEarned: transferable + restricted,
    totalSpent: 0,
    lastUpdated: new Date(),
  }).onConflictDoUpdate({
    target: bccBalances.walletAddress,
    set: { 
      transferable,
      restricted,
      totalEarned: transferable + restricted
    }
  });
  
  // Create matrix structure - each member has their own matrix
  await db.insert(referralNodes).values({
    walletAddress,
    sponsorWallet: sponsorWallet || ROOT,
    placerWallet: placerWallet || sponsorWallet || ROOT,
    matrixPosition: 0, // This member is the root of their own matrix
    matrixLayer: 1,
    leftLeg: [], // Will be filled as direct referrals or spillovers
    middleLeg: [],
    rightLeg: [],
    directReferralCount: 0,
    totalTeamCount: 0,
  }).onConflictDoUpdate({
    target: referralNodes.walletAddress,
    set: { 
      sponsorWallet: sponsorWallet || ROOT,
      placerWallet: placerWallet || sponsorWallet || ROOT
    }
  });
  
  // Create membership order
  if (level > 0) {
    await db.insert(orders).values({
      walletAddress,
      membershipLevel: level,
      amount: level * 50,
      currency: 'USDT',
      status: 'completed',
      transactionHash: `0x${Math.random().toString(36).substring(7)}`,
      createdAt: new Date(),
      completedAt: new Date(),
    });
  }
  
  console.log(`  ✅ ${username} created with their own matrix structure`);
}

// Function to place a member in someone else's matrix
async function placeMemberInMatrix(
  memberWallet: string,
  rootWallet: string,
  position: 'L' | 'M' | 'R',
  placementType: 'direct' | 'spillover',
  placedBy: string
) {
  console.log(`    📍 Placing ${memberWallet.slice(0, 10)}... in ${rootWallet.slice(0, 10)}...'s ${position} position (${placementType})`);
  
  // Update the root member's matrix to include this new member
  const rootNode = await db.select().from(referralNodes).where(eq(referralNodes.walletAddress, rootWallet));
  
  if (rootNode.length > 0) {
    const node = rootNode[0];
    let updatedLeg: string[];
    
    switch (position) {
      case 'L':
        updatedLeg = [...node.leftLeg, memberWallet];
        await db.update(referralNodes)
          .set({ leftLeg: updatedLeg })
          .where(eq(referralNodes.walletAddress, rootWallet));
        break;
      case 'M':
        updatedLeg = [...node.middleLeg, memberWallet];
        await db.update(referralNodes)
          .set({ middleLeg: updatedLeg })
          .where(eq(referralNodes.walletAddress, rootWallet));
        break;
      case 'R':
        updatedLeg = [...node.rightLeg, memberWallet];
        await db.update(referralNodes)
          .set({ rightLeg: updatedLeg })
          .where(eq(referralNodes.walletAddress, rootWallet));
        break;
    }
    
    // Update counts
    if (placementType === 'direct') {
      await db.update(referralNodes)
        .set({ directReferralCount: node.directReferralCount + 1 })
        .where(eq(referralNodes.walletAddress, rootWallet));
    }
    
    await db.update(referralNodes)
      .set({ totalTeamCount: node.totalTeamCount + 1 })
      .where(eq(referralNodes.walletAddress, rootWallet));
  }
}

async function cleanTestData() {
  console.log('🧹 Cleaning existing test data...');
  
  for (let i = 1; i <= 20; i++) {
    const wallet = generateWallet(i);
    await db.delete(userRewards).where(eq(userRewards.walletAddress, wallet));
    await db.delete(nftPurchases).where(eq(nftPurchases.buyerWallet, wallet));
    await db.delete(bccBalances).where(eq(bccBalances.walletAddress, wallet));
    await db.delete(membershipState).where(eq(membershipState.walletAddress, wallet));
    await db.delete(referralNodes).where(eq(referralNodes.walletAddress, wallet));
    await db.delete(orders).where(eq(orders.walletAddress, wallet));
    await db.delete(users).where(eq(users.walletAddress, wallet));
  }
  
  await db.delete(referralLayers).where(eq(referralLayers.walletAddress, ROOT));
  await db.delete(merchantNFTs);
  
  console.log('✅ Clean completed\n');
}

async function createCorrectMatrixStructure() {
  console.log('🏗️ Creating Correct Matrix Structure');
  console.log('=' .repeat(50));
  console.log('📖 Matrix Concept:');
  console.log('   - Every member has their own L M R matrix');
  console.log('   - Each position can be DIRECT (own referral) or SPILLOVER (placed by upline)');
  console.log('   - Rewards are based on member\'s own matrix, not global position');
  console.log('   - Members activate Level 1+ to participate in matrix\n');
  
  // Create core team members - each with different levels
  const members = [
    { id: 1, name: 'VIP_Member_1', level: 1, sponsor: ROOT },
    { id: 2, name: 'VIP_Member_2', level: 2, sponsor: ROOT },
    { id: 3, name: 'VIP_Member_3', level: 3, sponsor: ROOT },
    { id: 4, name: 'TeamLeader_A', level: 2, sponsor: generateWallet(1) },
    { id: 5, name: 'TeamLeader_B', level: 2, sponsor: generateWallet(2) },
    { id: 6, name: 'Active_Member_1', level: 1, sponsor: generateWallet(3) },
    { id: 7, name: 'Active_Member_2', level: 1, sponsor: generateWallet(1) },
    { id: 8, name: 'Active_Member_3', level: 1, sponsor: generateWallet(2) },
    { id: 9, name: 'Power_User', level: 3, sponsor: generateWallet(4) },
    { id: 10, name: 'Elite_Member', level: 2, sponsor: generateWallet(5) },
  ];
  
  // Create all members first
  for (const member of members) {
    await createMemberWithMatrix(
      generateWallet(member.id),
      member.name,
      member.level,
      member.sponsor
    );
  }
  
  console.log('\n🔗 Building Matrix Relationships:');
  console.log('   Note: Each member\'s L M R positions show who they earn from\n');
  
  // Build ROOT's matrix (admin123)
  console.log('👑 ROOT (admin123) Matrix:');
  await placeMemberInMatrix(generateWallet(1), ROOT, 'L', 'direct', ROOT);
  await placeMemberInMatrix(generateWallet(2), ROOT, 'M', 'direct', ROOT);
  await placeMemberInMatrix(generateWallet(3), ROOT, 'R', 'direct', ROOT);
  
  // Build VIP_Member_1's matrix
  console.log('\n📋 VIP_Member_1 Matrix:');
  await placeMemberInMatrix(generateWallet(4), generateWallet(1), 'L', 'direct', generateWallet(1));
  await placeMemberInMatrix(generateWallet(7), generateWallet(1), 'M', 'direct', generateWallet(1));
  // Right position will be filled by spillover from admin
  
  // Build VIP_Member_2's matrix
  console.log('\n📋 VIP_Member_2 Matrix:');
  await placeMemberInMatrix(generateWallet(5), generateWallet(2), 'L', 'direct', generateWallet(2));
  await placeMemberInMatrix(generateWallet(8), generateWallet(2), 'M', 'direct', generateWallet(2));
  // Right position will be filled by spillover
  
  // Build VIP_Member_3's matrix
  console.log('\n📋 VIP_Member_3 Matrix:');
  await placeMemberInMatrix(generateWallet(6), generateWallet(3), 'L', 'direct', generateWallet(3));
  // Middle and Right will be filled by spillovers
  
  // Simulate some spillovers from ROOT
  console.log('\n💧 Spillover Placements:');
  await placeMemberInMatrix(generateWallet(9), generateWallet(1), 'R', 'spillover', ROOT);
  await placeMemberInMatrix(generateWallet(10), generateWallet(2), 'R', 'spillover', ROOT);
  
  console.log('\n✅ Matrix structure created successfully!');
}

async function createNFTs() {
  console.log('\n🖼️ Creating NFT Marketplace...');
  
  const nfts = [
    {
      tokenId: '2001',
      name: 'Elite Honeycomb NFT',
      description: 'Premium NFT with 75% matrix bonus',
      imageUrl: 'https://example.com/elite.jpg',
      price: 150,
      maxSupply: 50,
      currentSupply: 0,
      rewardPercentage: 75,
      isActive: true,
      category: 'elite',
      merchantWallet: ROOT,
    },
    {
      tokenId: '2002',
      name: 'Queen Bee NFT',
      description: 'Royal NFT with 50% matrix bonus',
      imageUrl: 'https://example.com/queen.jpg',
      price: 100,
      maxSupply: 100,
      currentSupply: 0,
      rewardPercentage: 50,
      isActive: true,
      category: 'royal',
      merchantWallet: ROOT,
    },
    {
      tokenId: '2003',
      name: 'Worker Bee NFT',
      description: 'Basic NFT with 25% matrix bonus',
      imageUrl: 'https://example.com/worker.jpg',
      price: 50,
      maxSupply: 200,
      currentSupply: 0,
      rewardPercentage: 25,
      isActive: true,
      category: 'basic',
      merchantWallet: ROOT,
    }
  ];
  
  for (const nft of nfts) {
    await db.insert(merchantNFTs).values(nft);
    console.log(`  ✅ Created ${nft.name} (${nft.rewardPercentage}% matrix bonus)`);
  }
}

async function createClaimableRewards() {
  console.log('\n💰 Creating Matrix-Based Rewards...');
  
  const rewards = [
    { wallet: generateWallet(1), type: 'referral' as const, amount: 100, description: 'Direct referral bonus from TeamLeader_A' },
    { wallet: generateWallet(1), type: 'spillover' as const, amount: 50, description: 'Matrix spillover reward' },
    { wallet: generateWallet(2), type: 'level' as const, amount: 200, description: 'Level 2 matrix completion bonus' },
    { wallet: generateWallet(3), type: 'referral' as const, amount: 150, description: 'Direct referral bonus from Active_Member_1' },
    { wallet: ROOT, type: 'spillover' as const, amount: 300, description: 'Global spillover rewards' },
    { wallet: generateWallet(4), type: 'nft' as const, amount: 75, description: 'NFT purchase matrix bonus' },
    { wallet: generateWallet(5), type: 'level' as const, amount: 250, description: 'Level 2 achievement bonus' },
  ];
  
  for (const reward of rewards) {
    await db.insert(userRewards).values({
      walletAddress: reward.wallet,
      rewardType: reward.type,
      amount: reward.amount,
      description: reward.description,
      sourceWallet: ROOT,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    console.log(`  ✅ ${reward.type} reward: ${reward.amount} BCC for ${reward.wallet.slice(0, 12)}...`);
  }
}

async function displayMatrixSummary() {
  console.log('\n📊 Matrix System Summary');
  console.log('=' .repeat(50));
  
  // Get member statistics
  const stats = await db.select({
    level: membershipState.activeLevel,
    count: sql<number>`count(*)`
  })
  .from(membershipState)
  .groupBy(membershipState.activeLevel);
  
  console.log('👥 Members by BBC Level:');
  stats.forEach(stat => {
    console.log(`  Level ${stat.level}: ${stat.count} members`);
  });
  
  // Get BCC distribution
  const bccStats = await db.select({
    totalTransferable: sql<number>`sum(${bccBalances.transferable})`,
    totalRestricted: sql<number>`sum(${bccBalances.restricted})`,
  }).from(bccBalances);
  
  console.log('\n💎 BCC Token Distribution:');
  console.log(`  Transferable: ${bccStats[0].totalTransferable || 0} BCC`);
  console.log(`  Restricted: ${bccStats[0].totalRestricted || 0} BCC`);
  
  // Get reward statistics
  const rewardStats = await db.select({
    totalClaimable: sql<number>`sum(${userRewards.amount})`,
    totalRewards: sql<number>`count(*)`,
  }).from(userRewards);
  
  console.log('\n🎁 Matrix Reward Pool:');
  console.log(`  Claimable Rewards: ${rewardStats[0].totalRewards || 0} rewards`);
  console.log(`  Total Value: ${rewardStats[0].totalClaimable || 0} BCC`);
  
  console.log('\n✨ Key Features Implemented:');
  console.log('   ✓ Each member has their own L M R matrix');
  console.log('   ✓ Direct vs Spillover placement tracking');
  console.log('   ✓ Matrix-based reward calculation');
  console.log('   ✓ Level 1+ activation requirement');
  console.log('   ✓ NFT marketplace with matrix bonuses');
  console.log('   ✓ Multiple BBC membership levels');
  
  console.log('\n🚀 Ready for Testing:');
  console.log('   1. View individual member matrices');
  console.log('   2. Test matrix reward calculations');
  console.log('   3. Simulate new member placements');
  console.log('   4. Track spillover mechanics');
  console.log('   5. Verify level-based bonuses');
}

async function main() {
  console.log('🎯 Creating Matrix Test Data with Correct Structure');
  console.log('=' .repeat(60));
  console.log('⚡ This implements the REAL matrix concept:');
  console.log('   - Every member = Their own L M R matrix');
  console.log('   - Rewards based on YOUR matrix, not global position');
  console.log('   - Direct referrals vs Spillover placements');
  console.log('   - Level 1+ activation for matrix participation\n');
  
  try {
    await cleanTestData();
    await createCorrectMatrixStructure();
    await createNFTs();
    await createClaimableRewards();
    await displayMatrixSummary();
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 MATRIX TEST DATA COMPLETE!');
    console.log('📍 Now you can test the dashboard and see:');
    console.log('   • Individual member matrices (L M R positions)');
    console.log('   • Direct vs Spillover placement types');
    console.log('   • Matrix-based reward calculations');
    console.log('   • NFT marketplace with bonuses');
    console.log('   • Multi-level BBC membership system');
  } catch (error) {
    console.error('❌ Error creating matrix test data:', error);
  }
  
  process.exit(0);
}

main();
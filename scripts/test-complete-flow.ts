import { db } from '../server/db';
import { 
  users, 
  matrixPositions,
  memberMatrixLayers,
  referralNodes, 
  referralLayers, 
  membershipState,
  bccBalances,
  merchantNFTs,
  nftPurchases,
  claimableRewards,
  claimedRewards,
  orders
} from '../shared/schema';
import { eq, sql, and } from 'drizzle-orm';

const ROOT = '0x380fd6a57fc2df6f10b8920002e4acc7d57d61c0';

// Helper function to generate test wallet addresses
function generateWallet(id: number): string {
  return ('0xtest' + id.toString().padStart(3, '0')).padEnd(42, '0');
}

async function cleanTestData() {
  console.log('🧹 Cleaning existing test data...');
  
  // Clean test users and related data
  for (let i = 1; i <= 50; i++) {
    const wallet = generateWallet(i);
    await db.delete(claimedRewards).where(eq(claimedRewards.walletAddress, wallet));
    await db.delete(claimableRewards).where(eq(claimableRewards.walletAddress, wallet));
    await db.delete(nftPurchases).where(eq(nftPurchases.buyerWallet, wallet));
    await db.delete(bccBalances).where(eq(bccBalances.walletAddress, wallet));
    await db.delete(membershipState).where(eq(membershipState.walletAddress, wallet));
    await db.delete(referralNodes).where(eq(referralNodes.walletAddress, wallet));
    await db.delete(orders).where(eq(orders.walletAddress, wallet));
    await db.delete(users).where(eq(users.walletAddress, wallet));
  }
  
  // Clean referral layers
  await db.delete(referralLayers).where(eq(referralLayers.walletAddress, ROOT));
  
  // Clean merchant NFTs
  await db.delete(merchantNFTs);
  
  console.log('✅ Test data cleaned\n');
}

async function createMerchantNFTs() {
  console.log('🖼️ Creating Merchant NFTs...');
  
  const nfts = [
    {
      tokenId: '1001',
      name: 'Premium Honey Bee NFT',
      description: 'Exclusive NFT with 50% reward bonus',
      imageUrl: 'https://example.com/nft1.jpg',
      price: 100,
      maxSupply: 100,
      currentSupply: 0,
      rewardPercentage: 50,
      isActive: true,
      category: 'premium',
      merchantWallet: ROOT,
    },
    {
      tokenId: '1002',
      name: 'Golden Hive NFT',
      description: 'Rare NFT with 30% reward bonus',
      imageUrl: 'https://example.com/nft2.jpg',
      price: 50,
      maxSupply: 200,
      currentSupply: 0,
      rewardPercentage: 30,
      isActive: true,
      category: 'gold',
      merchantWallet: ROOT,
    },
    {
      tokenId: '1003',
      name: 'Worker Bee NFT',
      description: 'Basic NFT with 10% reward bonus',
      imageUrl: 'https://example.com/nft3.jpg',
      price: 20,
      maxSupply: 500,
      currentSupply: 0,
      rewardPercentage: 10,
      isActive: true,
      category: 'basic',
      merchantWallet: ROOT,
    }
  ];
  
  for (const nft of nfts) {
    await db.insert(merchantNFTs).values(nft);
    console.log(`  ✅ Created ${nft.name} (${nft.rewardPercentage}% bonus)`);
  }
  
  console.log('');
}

async function createUserWithLevel(
  walletAddress: string,
  username: string,
  level: number,
  referrerWallet: string,
  placerWallet: string,
  position: number,
  layer: number
) {
  // Create user
  await db.insert(users).values({
    walletAddress,
    username,
    isActivated: true,
    membershipLevel: level,
    referrerWallet,
    registeredAt: new Date(),
  }).onConflictDoUpdate({
    target: users.walletAddress,
    set: { 
      username, 
      isActivated: true,
      membershipLevel: level 
    }
  });
  
  // Create membership state
  await db.insert(membershipState).values({
    walletAddress,
    activeLevel: level,
    membershipHistory: { 
      levels: Array.from({length: level}, (_, i) => i + 1),
      upgrades: level > 1 ? [
        {
          level,
          date: new Date().toISOString(),
          price: level * 50
        }
      ] : []
    },
  }).onConflictDoUpdate({
    target: membershipState.walletAddress,
    set: { activeLevel: level }
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
  
  // Create referral node
  await db.insert(referralNodes).values({
    walletAddress,
    sponsorWallet: referrerWallet,
    placerWallet,
    matrixPosition: position,
    matrixLayer: layer,
    directReferralCount: 0,
    totalTeamSize: 0,
  }).onConflictDoUpdate({
    target: referralNodes.walletAddress,
    set: { 
      sponsorWallet: referrerWallet,
      placerWallet,
      matrixPosition: position,
      matrixLayer: layer
    }
  });
  
  // Create order for membership purchase
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
}

async function createClaimableRewards() {
  console.log('💰 Creating Claimable Rewards...');
  
  // Create different types of rewards
  const rewardTypes = [
    { wallet: generateWallet(1), type: 'referral' as const, amount: 100, description: 'Direct referral bonus' },
    { wallet: generateWallet(1), type: 'spillover' as const, amount: 50, description: 'Matrix spillover reward' },
    { wallet: generateWallet(2), type: 'level' as const, amount: 200, description: 'Level 2 achievement bonus' },
    { wallet: generateWallet(2), type: 'nft' as const, amount: 30, description: 'NFT purchase reward' },
    { wallet: generateWallet(3), type: 'referral' as const, amount: 150, description: 'Direct referral bonus' },
    { wallet: generateWallet(4), type: 'spillover' as const, amount: 75, description: 'Matrix spillover reward' },
    { wallet: generateWallet(5), type: 'level' as const, amount: 300, description: 'Level 3 achievement bonus' },
  ];
  
  for (const reward of rewardTypes) {
    await db.insert(claimableRewards).values({
      walletAddress: reward.wallet,
      rewardType: reward.type,
      amount: reward.amount,
      description: reward.description,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
    console.log(`  ✅ ${reward.type} reward: ${reward.amount} BCC for ${reward.wallet.slice(0, 10)}...`);
  }
  
  console.log('');
}

async function simulateNFTPurchases() {
  console.log('🛒 Simulating NFT Purchases...');
  
  const purchases = [
    { buyer: generateWallet(1), tokenId: '1001', price: 100 },
    { buyer: generateWallet(2), tokenId: '1002', price: 50 },
    { buyer: generateWallet(3), tokenId: '1003', price: 20 },
    { buyer: generateWallet(4), tokenId: '1002', price: 50 },
    { buyer: generateWallet(5), tokenId: '1001', price: 100 },
  ];
  
  for (const purchase of purchases) {
    // Create purchase record
    await db.insert(nftPurchases).values({
      buyerWallet: purchase.buyer,
      tokenId: purchase.tokenId,
      purchasePrice: purchase.price,
      transactionHash: `0x${Math.random().toString(36).substring(7)}`,
      purchasedAt: new Date(),
      rewardClaimed: false,
    });
    
    // Update NFT supply
    await db.update(merchantNFTs)
      .set({ 
        currentSupply: sql`${merchantNFTs.currentSupply} + 1` 
      })
      .where(eq(merchantNFTs.tokenId, purchase.tokenId));
    
    console.log(`  ✅ User ${purchase.buyer.slice(0, 10)}... purchased NFT #${purchase.tokenId} for ${purchase.price} USDT`);
  }
  
  console.log('');
}

async function createCompleteMatrix() {
  console.log('🔗 Creating Complete 3×3 Matrix Structure...\n');
  
  const layer1 = [];
  const layer2 = [];
  const layer3 = [];
  
  // Layer 1: 3 direct referrals with different levels
  console.log('📊 Layer 1 - Direct Referrals:');
  for (let i = 1; i <= 3; i++) {
    const wallet = generateWallet(i);
    const username = `VIP_L${i}_User${i}`;
    const level = i; // Level 1, 2, 3
    
    await createUserWithLevel(wallet, username, level, ROOT, ROOT, i - 1, 1);
    layer1.push(wallet);
    console.log(`  ✅ ${username} - Level ${level} BBC member`);
  }
  
  // Layer 2: 9 members (full)
  console.log('\n📊 Layer 2 - Spillover and Direct:');
  for (let i = 4; i <= 12; i++) {
    const wallet = generateWallet(i);
    const parentIndex = Math.floor((i - 4) / 3);
    const parent = layer1[parentIndex];
    
    let username, sponsor, level;
    if (i <= 6) {
      // Admin's spillover
      username = `Admin_Spill${i - 3}`;
      sponsor = ROOT;
      level = 1;
    } else if (i <= 8) {
      // VIP_L2_User2's directs
      username = `L2U2_Direct${i - 6}`;
      sponsor = layer1[1];
      level = 2;
    } else if (i === 9) {
      // Admin's spillover
      username = 'Admin_Spill4';
      sponsor = ROOT;
      level = 1;
    } else {
      // VIP_L3_User3's directs
      username = `L3U3_Direct${i - 9}`;
      sponsor = layer1[2];
      level = 1;
    }
    
    await createUserWithLevel(wallet, username, level, sponsor, parent, i - 4, 2);
    layer2.push(wallet);
    console.log(`  ✅ ${username} - Level ${level} BBC`);
  }
  
  // Layer 3: 18 members (partial)
  console.log('\n📊 Layer 3 - Extended Network:');
  for (let i = 13; i <= 30; i++) {
    const wallet = generateWallet(i);
    const parentIndex = Math.floor((i - 13) / 3);
    const parent = layer2[parentIndex] || layer2[8];
    
    let username, sponsor, level;
    if (i <= 18) {
      username = `Elite_Member${i - 12}`;
      sponsor = ROOT;
      level = Math.floor(Math.random() * 3) + 1; // Random level 1-3
    } else if (i <= 24) {
      username = `L2_Network${i - 18}`;
      sponsor = layer2[(i - 19) % 9];
      level = 1;
    } else {
      username = `Mixed_Network${i - 24}`;
      sponsor = i % 2 === 0 ? ROOT : layer2[(i - 25) % 9];
      level = Math.floor(Math.random() * 2) + 1; // Random level 1-2
    }
    
    await createUserWithLevel(wallet, username, level, sponsor, parent, i - 13, 3);
    layer3.push(wallet);
    if (i <= 20) { // Only show first few for brevity
      console.log(`  ✅ ${username} - Level ${level} BBC`);
    }
  }
  console.log(`  ... and ${layer3.length - 8} more members`);
  
  // Update referral layers
  await db.insert(referralLayers).values([
    {
      walletAddress: ROOT,
      layerNumber: 1,
      memberCount: 3,
      members: layer1,
    },
    {
      walletAddress: ROOT,
      layerNumber: 2,
      memberCount: 9,
      members: layer2,
    },
    {
      walletAddress: ROOT,
      layerNumber: 3,
      memberCount: 18,
      members: layer3,
    }
  ]).onConflictDoUpdate({
    target: [referralLayers.walletAddress, referralLayers.layerNumber],
    set: { 
      memberCount: sql`excluded.member_count`,
      members: sql`excluded.members` 
    }
  });
  
  console.log('');
}

async function displaySummary() {
  console.log('📈 Test Data Summary:\n');
  
  // Count users by level
  const levelStats = await db.select({
    level: membershipState.activeLevel,
    count: sql<number>`count(*)`,
  })
  .from(membershipState)
  .groupBy(membershipState.activeLevel);
  
  console.log('👥 Members by BBC Level:');
  levelStats.forEach(stat => {
    console.log(`  Level ${stat.level}: ${stat.count} members`);
  });
  
  // Total BCC in circulation
  const bccStats = await db.select({
    totalTransferable: sql<number>`sum(${bccBalances.transferable})`,
    totalRestricted: sql<number>`sum(${bccBalances.restricted})`,
  }).from(bccBalances);
  
  console.log('\n💎 BCC Token Distribution:');
  console.log(`  Transferable: ${bccStats[0].totalTransferable || 0} BCC`);
  console.log(`  Restricted: ${bccStats[0].totalRestricted || 0} BCC`);
  
  // NFT statistics
  const nftStats = await db.select({
    totalPurchases: sql<number>`count(*)`,
    totalRevenue: sql<number>`sum(${nftPurchases.purchasePrice})`,
  }).from(nftPurchases);
  
  console.log('\n🖼️ NFT Marketplace:');
  console.log(`  Total Purchases: ${nftStats[0].totalPurchases || 0}`);
  console.log(`  Total Revenue: ${nftStats[0].totalRevenue || 0} USDT`);
  
  // Rewards statistics
  const rewardStats = await db.select({
    totalClaimable: sql<number>`sum(${claimableRewards.amount})`,
    totalRewards: sql<number>`count(*)`,
  }).from(claimableRewards);
  
  console.log('\n🎁 Reward Pool:');
  console.log(`  Claimable Rewards: ${rewardStats[0].totalRewards || 0} rewards`);
  console.log(`  Total Value: ${rewardStats[0].totalClaimable || 0} BCC`);
  
  console.log('\n✨ Complete test data structure created successfully!');
  console.log('   - 30 users with various BBC levels (1-3)');
  console.log('   - 3×3 matrix with spillover demonstration');
  console.log('   - NFT marketplace with 3 merchant NFTs');
  console.log('   - Multiple reward types ready to claim');
  console.log('   - BCC balances for all members');
}

async function main() {
  console.log('🚀 Starting Complete Flow Test...\n');
  console.log('=' .repeat(50) + '\n');
  
  try {
    await cleanTestData();
    await createMerchantNFTs();
    await createCompleteMatrix();
    await simulateNFTPurchases();
    await createClaimableRewards();
    await displaySummary();
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 Test setup complete! You can now:');
    console.log('   1. View the matrix organization in Dashboard');
    console.log('   2. Check rewards in the Rewards section');
    console.log('   3. Browse NFTs in the Marketplace');
    console.log('   4. Test BCC transfers between users');
    console.log('   5. Claim rewards and track history');
  } catch (error) {
    console.error('❌ Error during test setup:', error);
  }
  
  process.exit(0);
}

main();
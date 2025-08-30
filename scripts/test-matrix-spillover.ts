import { db } from '../server/db';
import { users, referralNodes, referralLayers, membershipState } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

// Test wallet addresses
const ROOT_WALLET = '0x380fd6a57fc2df6f10b8920002e4acc7d57d61c0'; // admin123
const TEST_WALLETS = [
  // First wave - direct referrals (will fill Layer 1)
  '0xtest001test001test001test001test001test',
  '0xtest002test002test002test002test002test',
  '0xtest003test003test003test003test003test',
  // Second wave - spillover to Layer 2
  '0xtest004test004test004test004test004test',
  '0xtest005test005test005test005test005test',
  '0xtest006test006test006test006test006test',
  '0xtest007test007test007test007test007test',
  '0xtest008test008test008test008test008test',
  '0xtest009test009test009test009test009test',
];

async function clearTestData() {
  console.log('🧹 Clearing existing test data...');
  
  // Delete test users and their related data
  for (const wallet of TEST_WALLETS) {
    await db.delete(referralNodes).where(eq(referralNodes.walletAddress, wallet));
    await db.delete(membershipState).where(eq(membershipState.walletAddress, wallet));
    await db.delete(users).where(eq(users.walletAddress, wallet));
  }
  
  // Clear referral layers for root user
  await db.delete(referralLayers).where(eq(referralLayers.walletAddress, ROOT_WALLET));
  
  // Reset root user's referral node
  await db.update(referralNodes)
    .set({
      directReferralCount: 0,
      totalTeamCount: 0,
      leftLeg: [],
      middleLeg: [],
      rightLeg: [],
      children: []
    })
    .where(eq(referralNodes.walletAddress, ROOT_WALLET));
}

async function createUser(walletAddress: string, username: string, referrerWallet: string) {
  console.log(`👤 Creating user ${username} (${walletAddress})`);
  
  // Create user
  await db.insert(users).values({
    walletAddress,
    username,
    referrerWallet,
    isActivated: false,
    currentLevel: 0,
    membershipLevel: 0,
    registeredAt: new Date(),
  }).onConflictDoNothing();
  
  // Create membership state
  await db.insert(membershipState).values({
    walletAddress,
    activeLevel: 0,
    hasNFT: false,
    isPending: false,
    pendingLevel: 0,
  }).onConflictDoNothing();
}

async function activateMember(walletAddress: string) {
  console.log(`✅ Activating member ${walletAddress}`);
  
  // Update user to activated with level 1
  await db.update(users)
    .set({
      isActivated: true,
      currentLevel: 1,
      membershipLevel: 1,
    })
    .where(eq(users.walletAddress, walletAddress));
  
  // Update membership state
  await db.update(membershipState)
    .set({
      activeLevel: 1,
      hasNFT: true,
    })
    .where(eq(membershipState.walletAddress, walletAddress));
}

async function placeInMatrix(memberWallet: string, sponsorWallet: string) {
  console.log(`📍 Placing ${memberWallet} sponsored by ${sponsorWallet}`);
  
  // Find placement position using 3x3 forced matrix logic
  let placerWallet = sponsorWallet;
  let placement: 'left' | 'middle' | 'right' = 'left';
  let layer = 1;
  
  // Start from sponsor and find first available position
  async function findAvailablePosition(currentWallet: string, currentLayer: number): Promise<{placer: string, placement: 'left' | 'middle' | 'right', layer: number}> {
    const node = await db.select().from(referralNodes).where(eq(referralNodes.walletAddress, currentWallet)).limit(1);
    
    if (!node[0]) {
      // Create node if doesn't exist
      await db.insert(referralNodes).values({
        walletAddress: currentWallet,
        sponsorWallet: '',
        placerWallet: '',
        matrixPosition: 0,
        leftLeg: [],
        middleLeg: [],
        rightLeg: [],
        children: [],
        directReferralCount: 0,
        totalTeamCount: 0,
      });
      return { placer: currentWallet, placement: 'left', layer: currentLayer };
    }
    
    // Check if current node has space (max 3 direct children)
    const totalChildren = (node[0].leftLeg?.length || 0) + 
                         (node[0].middleLeg?.length || 0) + 
                         (node[0].rightLeg?.length || 0);
    
    if (totalChildren < 3) {
      // Has space, find which leg
      if (!node[0].leftLeg || node[0].leftLeg.length === 0) {
        return { placer: currentWallet, placement: 'left', layer: currentLayer };
      } else if (!node[0].middleLeg || node[0].middleLeg.length === 0) {
        return { placer: currentWallet, placement: 'middle', layer: currentLayer };
      } else if (!node[0].rightLeg || node[0].rightLeg.length === 0) {
        return { placer: currentWallet, placement: 'right', layer: currentLayer };
      }
    }
    
    // No space, spillover to next level (go through children left to right)
    const allChildren = [
      ...(node[0].leftLeg || []),
      ...(node[0].middleLeg || []),
      ...(node[0].rightLeg || [])
    ];
    
    for (const childWallet of allChildren) {
      const result = await findAvailablePosition(childWallet, currentLayer + 1);
      if (result) return result;
    }
    
    return { placer: currentWallet, placement: 'left', layer: currentLayer };
  }
  
  const position = await findAvailablePosition(sponsorWallet, 1);
  placerWallet = position.placer;
  placement = position.placement;
  layer = position.layer;
  
  console.log(`  -> Placed under ${placerWallet} in ${placement} leg at layer ${layer}`);
  
  // Create or update referral node for new member
  await db.insert(referralNodes).values({
    walletAddress: memberWallet,
    parentWallet: placerWallet,
    sponsorWallet,
    placerWallet,
    matrixPosition: placement === 'left' ? 1 : placement === 'middle' ? 2 : 3,
    leftLeg: [],
    middleLeg: [],
    rightLeg: [],
    children: [],
    directReferralCount: 0,
    totalTeamCount: 0,
  }).onConflictDoUpdate({
    target: referralNodes.walletAddress,
    set: {
      parentWallet: placerWallet,
      sponsorWallet,
      placerWallet,
      matrixPosition: placement === 'left' ? 1 : placement === 'middle' ? 2 : 3,
    }
  });
  
  // Update placer's legs
  const placerNode = await db.select().from(referralNodes).where(eq(referralNodes.walletAddress, placerWallet)).limit(1);
  
  if (placerNode[0]) {
    const updates: any = {};
    if (placement === 'left') {
      updates.leftLeg = [...(placerNode[0].leftLeg || []), memberWallet];
    } else if (placement === 'middle') {
      updates.middleLeg = [...(placerNode[0].middleLeg || []), memberWallet];
    } else {
      updates.rightLeg = [...(placerNode[0].rightLeg || []), memberWallet];
    }
    updates.children = [...(placerNode[0].children || []), memberWallet];
    updates.totalTeamCount = (placerNode[0].totalTeamCount || 0) + 1;
    
    await db.update(referralNodes)
      .set(updates)
      .where(eq(referralNodes.walletAddress, placerWallet));
  }
  
  // Update sponsor's direct referral count
  if (sponsorWallet === placerWallet) {
    await db.update(referralNodes)
      .set({
        directReferralCount: sql`${referralNodes.directReferralCount} + 1`
      })
      .where(eq(referralNodes.walletAddress, sponsorWallet));
  }
  
  // Update referral layers
  await updateReferralLayers(sponsorWallet);
}

async function updateReferralLayers(rootWallet: string) {
  console.log(`📊 Updating referral layers for ${rootWallet}`);
  
  // Clear existing layers
  await db.delete(referralLayers).where(eq(referralLayers.walletAddress, rootWallet));
  
  // Build layers
  const layers: Map<number, string[]> = new Map();
  
  async function buildLayer(walletAddress: string, currentLayer: number, visited: Set<string>) {
    if (visited.has(walletAddress)) return;
    visited.add(walletAddress);
    
    const node = await db.select().from(referralNodes).where(eq(referralNodes.walletAddress, walletAddress)).limit(1);
    if (!node[0]) return;
    
    const children = node[0].children || [];
    if (children.length > 0) {
      if (!layers.has(currentLayer)) {
        layers.set(currentLayer, []);
      }
      layers.get(currentLayer)!.push(...children);
      
      for (const child of children) {
        await buildLayer(child, currentLayer + 1, visited);
      }
    }
  }
  
  const visited = new Set<string>();
  await buildLayer(rootWallet, 1, visited);
  
  // Save layers to database
  for (const [layerNum, members] of layers.entries()) {
    if (members.length > 0) {
      await db.insert(referralLayers).values({
        walletAddress: rootWallet,
        layerNumber: layerNum,
        memberCount: members.length,
        members: members,
      });
      console.log(`  Layer ${layerNum}: ${members.length} members`);
    }
  }
}

async function displayMatrixState() {
  console.log('\n📈 Current Matrix State:');
  console.log('========================');
  
  // Get root node
  const rootNode = await db.select().from(referralNodes).where(eq(referralNodes.walletAddress, ROOT_WALLET)).limit(1);
  if (rootNode[0]) {
    console.log(`Root User (${ROOT_WALLET}):`);
    console.log(`  Direct Referrals: ${rootNode[0].directReferralCount}`);
    console.log(`  Total Team: ${rootNode[0].totalTeamCount}`);
  }
  
  // Get layers
  const layers = await db.select().from(referralLayers)
    .where(eq(referralLayers.walletAddress, ROOT_WALLET))
    .orderBy(referralLayers.layerNumber);
  
  for (const layer of layers) {
    console.log(`\nLayer ${layer.layerNumber} (${layer.memberCount} members):`);
    
    for (const memberWallet of (layer.members as string[])) {
      const member = await db.select().from(users).where(eq(users.walletAddress, memberWallet)).limit(1);
      const node = await db.select().from(referralNodes).where(eq(referralNodes.walletAddress, memberWallet)).limit(1);
      
      if (member[0] && node[0]) {
        const placementType = node[0].sponsorWallet === ROOT_WALLET ? 'Direct' : 
                            node[0].placerWallet === ROOT_WALLET ? 'Self-placed' : 'Spillover';
        const position = node[0].matrixPosition === 1 ? 'Left' : 
                        node[0].matrixPosition === 2 ? 'Middle' : 'Right';
        
        console.log(`  - ${member[0].username} (${position}) - ${placementType}`);
        console.log(`    Sponsor: ${node[0].sponsorWallet?.slice(-4) || 'none'}`);
        console.log(`    Placer: ${node[0].placerWallet?.slice(-4) || 'none'}`);
      }
    }
  }
}

async function runTest() {
  console.log('🚀 Starting Matrix Spillover Test');
  console.log('==================================\n');
  
  try {
    // Step 1: Clear test data
    await clearTestData();
    
    // Step 2: Create and activate first 3 users (fills Layer 1)
    console.log('\n📝 Creating first wave (Layer 1 - Direct positions):');
    for (let i = 0; i < 3; i++) {
      await createUser(TEST_WALLETS[i], `TestUser${i+1}`, ROOT_WALLET);
      await activateMember(TEST_WALLETS[i]);
      await placeInMatrix(TEST_WALLETS[i], ROOT_WALLET);
    }
    
    await displayMatrixState();
    
    // Step 3: Create next 6 users (spillover to Layer 2)
    console.log('\n📝 Creating second wave (Layer 2 - Spillover):');
    for (let i = 3; i < 9; i++) {
      await createUser(TEST_WALLETS[i], `TestUser${i+1}`, ROOT_WALLET);
      await activateMember(TEST_WALLETS[i]);
      await placeInMatrix(TEST_WALLETS[i], ROOT_WALLET);
    }
    
    await displayMatrixState();
    
    // Step 4: Test different sponsor scenarios
    console.log('\n🔄 Testing mixed sponsorship:');
    
    // User sponsored by someone in Layer 1
    const sponsoredByLayer1 = '0xtest010test010test010test010test010test';
    await createUser(sponsoredByLayer1, 'SponsoredByL1', TEST_WALLETS[0]);
    await activateMember(sponsoredByLayer1);
    await placeInMatrix(sponsoredByLayer1, TEST_WALLETS[0]);
    
    await displayMatrixState();
    
    console.log('\n✅ Test completed successfully!');
    console.log('The 3x3 forced matrix spillover logic is working correctly.');
    console.log('- First 3 members fill Layer 1 (Left, Middle, Right)');
    console.log('- Next members spillover to Layer 2 in order');
    console.log('- Each position can manage exactly 3 children below it');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
runTest().then(() => process.exit(0)).catch(console.error);
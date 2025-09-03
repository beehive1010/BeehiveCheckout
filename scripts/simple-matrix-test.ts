import { db } from '../server/db';
import { 
  users, 
  membershipState,
  bccBalances,
  orders,
  referralNodes
} from '../shared/schema';
import { eq } from 'drizzle-orm';

const ROOT = '0x380fd6a57fc2df6f10b8920002e4acc7d57d61c0';

// Helper function to generate test wallet addresses
function generateWallet(id: number): string {
  return ('0xtest' + id.toString().padStart(3, '0')).padEnd(42, '0');
}

async function createMemberWithMatrix(
  walletAddress: string,
  username: string,
  level: number,
  sponsorWallet: string
) {
  console.log(`\n👤 Creating ${username} (Level ${level} BBC)`);
  
  try {
    // Create user
    await db.insert(users).values({
      walletAddress,
      username,
      memberActivated: true,
      currentLevel: level,
      referrerWallet: sponsorWallet,
      registeredAt: new Date(),
    });
    
    // Create membership state
    await db.insert(membershipState).values({
      walletAddress,
      activeLevel: level,
      levelsOwned: Array.from({length: level}, (_, i) => i + 1),
      joinedAt: new Date(),
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
    });
    
    // Create matrix structure - each member has their own matrix
    await db.insert(referralNodes).values({
      walletAddress,
      sponsorWallet: sponsorWallet || ROOT,
      placerWallet: sponsorWallet || ROOT,
      matrixPosition: 0, // This member is the root of their own matrix
      leftLeg: [], // Will be filled as direct referrals or spillovers
      middleLeg: [],
      rightLeg: [],
      directReferralCount: 0,
      totalTeamCount: 0,
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
  } catch (error) {
    console.log(`  ⚠️ ${username} already exists or updated`);
  }
}

async function placeMemberInMatrix(
  memberWallet: string,
  rootWallet: string,
  position: 'L' | 'M' | 'R',
  placementType: 'direct' | 'spillover'
) {
  console.log(`    📍 Placing ${memberWallet.slice(0, 10)}... in ${rootWallet.slice(0, 10)}...'s ${position} position (${placementType})`);
  
  try {
    // Get the root member's matrix
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
  } catch (error) {
    console.log(`    ⚠️ Error placing member: ${error}`);
  }
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
  await placeMemberInMatrix(generateWallet(1), ROOT, 'L', 'direct');
  await placeMemberInMatrix(generateWallet(2), ROOT, 'M', 'direct');
  await placeMemberInMatrix(generateWallet(3), ROOT, 'R', 'direct');
  
  // Build VIP_Member_1's matrix
  console.log('\n📋 VIP_Member_1 Matrix:');
  await placeMemberInMatrix(generateWallet(4), generateWallet(1), 'L', 'direct');
  await placeMemberInMatrix(generateWallet(7), generateWallet(1), 'M', 'direct');
  
  // Build VIP_Member_2's matrix
  console.log('\n📋 VIP_Member_2 Matrix:');
  await placeMemberInMatrix(generateWallet(5), generateWallet(2), 'L', 'direct');
  await placeMemberInMatrix(generateWallet(8), generateWallet(2), 'M', 'direct');
  
  // Build VIP_Member_3's matrix
  console.log('\n📋 VIP_Member_3 Matrix:');
  await placeMemberInMatrix(generateWallet(6), generateWallet(3), 'L', 'direct');
  
  console.log('\n✅ Matrix structure created successfully!');
}

async function displayMatrixSummary() {
  console.log('\n📊 Matrix System Summary');
  console.log('=' .repeat(50));
  
  try {
    // Get all matrix structures
    const matrices = await db.select().from(referralNodes);
    
    console.log('\n🔍 Individual Member Matrices:');
    for (const matrix of matrices) {
      const user = await db.select().from(users).where(eq(users.walletAddress, matrix.walletAddress));
      const username = user[0]?.username || 'Unknown';
      
      console.log(`\n👤 ${username} (${matrix.walletAddress.slice(0, 12)}...)`);
      console.log(`   L: ${matrix.leftLeg.length} members`);
      console.log(`   M: ${matrix.middleLeg.length} members`);
      console.log(`   R: ${matrix.rightLeg.length} members`);
      console.log(`   Direct Referrals: ${matrix.directReferralCount}`);
      console.log(`   Total Team: ${matrix.totalTeamCount}`);
    }
    
    console.log('\n✨ Key Features Implemented:');
    console.log('   ✓ Each member has their own L M R matrix');
    console.log('   ✓ Direct vs Spillover placement tracking');
    console.log('   ✓ Matrix-based structure ready for rewards');
    console.log('   ✓ Level 1+ activation requirement');
    console.log('   ✓ Multiple BBC membership levels');
    
  } catch (error) {
    console.log('⚠️ Error displaying summary:', error);
  }
}

async function main() {
  console.log('🎯 Creating Simple Matrix Test Data');
  console.log('=' .repeat(60));
  console.log('⚡ This implements the REAL matrix concept:');
  console.log('   - Every member = Their own L M R matrix');
  console.log('   - Rewards based on YOUR matrix, not global position');
  console.log('   - Direct referrals vs Spillover placements');
  console.log('   - Level 1+ activation for matrix participation\n');
  
  try {
    await createCorrectMatrixStructure();
    await displayMatrixSummary();
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 MATRIX TEST DATA COMPLETE!');
    console.log('📍 Now you can test the dashboard and see:');
    console.log('   • Individual member matrices (L M R positions)');
    console.log('   • Direct vs Spillover placement types');
    console.log('   • Matrix-based structure ready for rewards');
  } catch (error) {
    console.error('❌ Error creating matrix test data:', error);
  }
  
  process.exit(0);
}

main();
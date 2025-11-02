/**
 * Matrix Tree Usage Examples
 * Demonstrates how to use the MatrixTree data structure
 */

import { MatrixTree, MatrixNode, buildMatrixTreeFromDatabase } from './MatrixTree';

/**
 * Example 1: Create a new matrix tree and add members
 */
export function example1_CreateAndPopulate() {
  console.log('=== Example 1: Create and Populate Matrix ===\n');

  // Create root matrix for genesis member
  const genesisWallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab';
  const tree = new MatrixTree(genesisWallet, 0);

  console.log('Created matrix tree for genesis member:', genesisWallet);
  console.log('Initial tree height:', tree.getTreeHeight());
  console.log('Initial node count:', tree.getTotalNodes(), '\n');

  // Add first member (direct referral of genesis)
  const member1 = tree.insertMember(
    '0xfd91667229a122265aF123a75bb624A9C35B5032',
    1,
    genesisWallet,
    'direct'
  );

  console.log('Member 1 placed:', member1);
  // Output: { layer: 1, position: 'L', parentWallet: '0x479AB...' }

  // Add second member (spillover)
  const member2 = tree.insertMember(
    '0x6c4C4E5702ed65c6F0fE84E45771Cb9c2e6196fd',
    2,
    '0xfd91667229a122265aF123a75bb624A9C35B5032',
    'spillover'
  );

  console.log('Member 2 placed:', member2);
  // Output: { layer: 1, position: 'M', parentWallet: '0x479AB...' }

  // Add third member
  const member3 = tree.insertMember(
    '0x3C1FF5B4BE2A1FB8c157aF55aa6450eF66D7E242',
    3,
    '0xfd91667229a122265aF123a75bb624A9C35B5032',
    'direct'
  );

  console.log('Member 3 placed:', member3);
  // Output: { layer: 1, position: 'R', parentWallet: '0x479AB...' }

  console.log('\nTree after 3 insertions:');
  console.log(tree.printTree(2));

  return tree;
}

/**
 * Example 2: Query tree nodes and relationships
 */
export function example2_QueryTree(tree: MatrixTree) {
  console.log('=== Example 2: Query Tree ===\n');

  const genesisWallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab';

  // Find a specific node
  const node = tree.findNode(genesisWallet);
  console.log('Found genesis node:', {
    wallet: node?.wallet_address,
    layer: node?.layer,
    childCount: Object.keys(node?.children || {}).length
  });

  // Get all children of genesis
  const children = tree.getChildren(genesisWallet);
  console.log('\nGenesis children:', children.map(c => ({
    wallet: c.wallet_address.slice(0, 10) + '...',
    position: c.position,
    layer: c.layer
  })));

  // Get nodes at layer 1
  const layer1Nodes = tree.getNodesAtLayer(1);
  console.log('\nAll Layer 1 nodes:', layer1Nodes.length);

  // Get path from root to a member
  if (children.length > 0) {
    const path = tree.getPathToNode(children[0].wallet_address);
    console.log('\nPath to first child:', path.map(n => n.wallet_address.slice(0, 10) + '...'));
  }

  // Get all descendants
  const descendants = tree.getDescendants(genesisWallet);
  console.log('\nTotal descendants of genesis:', descendants.length);

  return tree;
}

/**
 * Example 3: Get layer statistics
 */
export function example3_LayerStatistics(tree: MatrixTree) {
  console.log('\n=== Example 3: Layer Statistics ===\n');

  const stats = tree.getLayerStatistics();

  console.log('Layer-by-layer breakdown:');
  console.log('─'.repeat(70));
  console.log('Layer | Nodes | Max Capacity | Occupancy Rate');
  console.log('─'.repeat(70));

  stats.slice(0, 5).forEach(stat => {
    console.log(
      `  ${stat.layer.toString().padStart(2)}  | ${stat.nodeCount.toString().padStart(5)} | ${stat.maxCapacity.toString().padStart(12)} | ${stat.occupancyRate.toFixed(2).padStart(6)}%`
    );
  });

  console.log('─'.repeat(70));

  const totalNodes = tree.getTotalNodes();
  const treeHeight = tree.getTreeHeight();

  console.log(`\nTotal nodes: ${totalNodes}`);
  console.log(`Tree height: ${treeHeight} layers`);
  console.log(`Root wallet: ${tree.getRoot().wallet_address}`);
}

/**
 * Example 4: Validate tree integrity
 */
export function example4_ValidateTree(tree: MatrixTree) {
  console.log('\n=== Example 4: Tree Validation ===\n');

  const validation = tree.validate();

  if (validation.isValid) {
    console.log('✅ Tree structure is valid!');
    console.log('- All parent-child relationships are correct');
    console.log('- No duplicate nodes found');
    console.log('- Layer assignments are consistent');
    console.log('- Positions (L/M/R) are correctly assigned');
  } else {
    console.log('❌ Tree validation failed!');
    console.log('Errors found:');
    validation.errors.forEach(error => {
      console.log('  -', error);
    });
  }

  return validation;
}

/**
 * Example 5: Build tree from database records
 */
export async function example5_BuildFromDatabase(supabase: any, rootWallet: string) {
  console.log('\n=== Example 5: Build from Database ===\n');

  try {
    // Fetch matrix records from database
    const { data: matrixRecords, error } = await supabase
      .from('matrix_referrals')
      .select(`
        member_wallet,
        parent_wallet,
        position,
        layer,
        referral_type,
        placed_at
      `)
      .eq('matrix_root_wallet', rootWallet)
      .order('layer', { ascending: true });

    if (error) throw error;

    // Fetch member info for activation sequences
    const wallets = matrixRecords.map((r: any) => r.member_wallet);
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('wallet_address, activation_sequence, referrer_wallet, current_level')
      .in('wallet_address', wallets);

    if (membersError) throw membersError;

    // Merge data
    const enrichedRecords = matrixRecords.map((mr: any) => {
      const member = members.find((m: any) =>
        m.wallet_address.toLowerCase() === mr.member_wallet.toLowerCase()
      );

      return {
        ...mr,
        activation_sequence: member?.activation_sequence || 0,
        referrer_wallet: member?.referrer_wallet || null,
        current_level: member?.current_level || 1
      };
    });

    // Build tree
    const tree = buildMatrixTreeFromDatabase(rootWallet, enrichedRecords);

    console.log('✅ Tree built from database successfully!');
    console.log('Root wallet:', rootWallet);
    console.log('Total nodes loaded:', tree.getTotalNodes());
    console.log('Tree height:', tree.getTreeHeight());

    // Show first few layers
    console.log('\nTree structure (first 3 layers):');
    console.log(tree.printTree(3));

    // Validate
    const validation = tree.validate();
    console.log(`\nValidation: ${validation.isValid ? '✅ PASS' : '❌ FAIL'}`);

    if (!validation.isValid) {
      console.log('Errors:', validation.errors.slice(0, 5));
    }

    return tree;

  } catch (error) {
    console.error('Failed to build tree from database:', error);
    return null;
  }
}

/**
 * Example 6: Serialize tree for database sync
 */
export function example6_SerializeTree(tree: MatrixTree) {
  console.log('\n=== Example 6: Serialize Tree ===\n');

  const serialized = tree.serialize();

  console.log('Serialized to flat array:');
  console.log(`Total records: ${serialized.length}`);

  console.log('\nFirst 5 records:');
  serialized.slice(0, 5).forEach((record, index) => {
    console.log(`${index + 1}. ${record.member_wallet.slice(0, 10)}... | Layer ${record.layer} | Position ${record.position || 'ROOT'}`);
  });

  console.log('\nThis format can be directly inserted into matrix_referrals table');

  return serialized;
}

/**
 * Example 7: Advanced traversal - Find all direct children across layers
 */
export function example7_AdvancedTraversal(tree: MatrixTree, wallet: string) {
  console.log('\n=== Example 7: Advanced Traversal ===\n');

  const node = tree.findNode(wallet);

  if (!node) {
    console.log(`Node ${wallet} not found`);
    return;
  }

  console.log(`Analyzing subtree for ${wallet.slice(0, 10)}...`);

  // Get all descendants
  const allDescendants = tree.getDescendants(wallet);

  // Group by layer
  const byLayer = allDescendants.reduce((acc, descendant) => {
    if (!acc[descendant.layer]) {
      acc[descendant.layer] = [];
    }
    acc[descendant.layer].push(descendant);
    return acc;
  }, {} as Record<number, MatrixNode[]>);

  console.log('\nDescendants by layer:');
  Object.entries(byLayer).forEach(([layer, nodes]) => {
    console.log(`Layer ${layer}: ${nodes.length} members`);
  });

  // Count by referral type
  const directReferrals = allDescendants.filter(d => d.referral_type === 'direct').length;
  const spillovers = allDescendants.filter(d => d.referral_type === 'spillover').length;

  console.log('\nReferral type breakdown:');
  console.log(`- Direct referrals: ${directReferrals}`);
  console.log(`- Spillovers: ${spillovers}`);

  return allDescendants;
}

/**
 * Run all examples
 */
export async function runAllExamples(supabase?: any) {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║         Matrix Tree Framework - Usage Examples           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Example 1: Create and populate
  const tree = example1_CreateAndPopulate();

  // Example 2: Query
  example2_QueryTree(tree);

  // Example 3: Statistics
  example3_LayerStatistics(tree);

  // Example 4: Validation
  example4_ValidateTree(tree);

  // Example 6: Serialization
  example6_SerializeTree(tree);

  // Example 7: Advanced traversal
  example7_AdvancedTraversal(tree, tree.getRoot().wallet_address);

  // Example 5: Database integration (if supabase provided)
  if (supabase) {
    const genesisWallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab';
    await example5_BuildFromDatabase(supabase, genesisWallet);
  }

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                Examples Complete                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

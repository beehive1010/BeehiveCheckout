/**
 * Matrix Tree Data Structure
 * Implements a 19-layer ternary tree (3-ary tree) for the Beehive referral matrix
 * Based on standard tree data structure principles with L/M/R child positions
 */

export type MatrixPosition = 'L' | 'M' | 'R'; // Left, Middle, Right
export type ReferralType = 'direct' | 'spillover';

/**
 * Matrix Node - represents a member in the matrix tree
 */
export interface MatrixNode {
  // Node identity
  wallet_address: string;
  activation_sequence: number;

  // Tree relationships
  parent_wallet: string | null;
  position: MatrixPosition | null; // Position under parent (L/M/R)
  layer: number; // Depth in tree (1-19)

  // Child nodes (max 3 for ternary tree)
  children: {
    L?: MatrixNode;
    M?: MatrixNode;
    R?: MatrixNode;
  };

  // Matrix properties
  matrix_root_wallet: string;
  referral_type: ReferralType;
  placed_at: Date;

  // Member properties
  current_level: number;
  referrer_wallet: string | null;
}

/**
 * Matrix Tree - manages the entire referral matrix structure
 */
export class MatrixTree {
  private root: MatrixNode;
  private maxDepth = 19; // Maximum 19 layers
  private maxChildrenPerNode = 3; // Ternary tree (L/M/R)

  constructor(rootWallet: string, activationSequence: number) {
    this.root = {
      wallet_address: rootWallet,
      activation_sequence: activationSequence,
      parent_wallet: null,
      position: null,
      layer: 0, // Root is at layer 0
      children: {},
      matrix_root_wallet: rootWallet,
      referral_type: 'direct',
      placed_at: new Date(),
      current_level: 1,
      referrer_wallet: null
    };
  }

  /**
   * Get the root node of the tree
   */
  getRoot(): MatrixNode {
    return this.root;
  }

  /**
   * Insert a new member into the matrix using BFS + LMR priority
   * @param memberWallet - New member's wallet address
   * @param activationSequence - Member's activation sequence
   * @param referrerWallet - Direct referrer's wallet
   * @param referralType - 'direct' or 'spillover'
   * @returns The layer and position where member was placed
   */
  insertMember(
    memberWallet: string,
    activationSequence: number,
    referrerWallet: string,
    referralType: ReferralType = 'spillover'
  ): { layer: number; position: MatrixPosition; parentWallet: string } | null {
    // Find first available position using BFS with LMR priority
    const availableSlot = this.findFirstAvailableSlot();

    if (!availableSlot) {
      console.error('Matrix is full - all 19 layers occupied');
      return null;
    }

    const { node: parentNode, position } = availableSlot;

    // Create new node
    const newNode: MatrixNode = {
      wallet_address: memberWallet,
      activation_sequence: activationSequence,
      parent_wallet: parentNode.wallet_address,
      position: position,
      layer: parentNode.layer + 1,
      children: {},
      matrix_root_wallet: this.root.wallet_address,
      referral_type: referralType,
      placed_at: new Date(),
      current_level: 1,
      referrer_wallet: referrerWallet
    };

    // Insert as child of parent node
    parentNode.children[position] = newNode;

    return {
      layer: newNode.layer,
      position: newNode.position!,
      parentWallet: parentNode.wallet_address
    };
  }

  /**
   * Find first available slot using BFS traversal with LMR priority
   * @returns Node with available slot and the position (L/M/R)
   */
  private findFirstAvailableSlot(): { node: MatrixNode; position: MatrixPosition } | null {
    const queue: MatrixNode[] = [this.root];
    const positions: MatrixPosition[] = ['L', 'M', 'R']; // LMR priority order

    while (queue.length > 0) {
      const current = queue.shift()!;

      // Don't go beyond max depth
      if (current.layer >= this.maxDepth) {
        continue;
      }

      // Check each position in LMR order
      for (const position of positions) {
        if (!current.children[position]) {
          // Found available slot
          return { node: current, position };
        }
      }

      // Add all children to queue for BFS (in LMR order)
      for (const position of positions) {
        if (current.children[position]) {
          queue.push(current.children[position]!);
        }
      }
    }

    return null; // Tree is full
  }

  /**
   * Search for a node by wallet address using BFS
   * @param walletAddress - Wallet address to search for
   * @returns The node if found, null otherwise
   */
  findNode(walletAddress: string): MatrixNode | null {
    const queue: MatrixNode[] = [this.root];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.wallet_address.toLowerCase() === walletAddress.toLowerCase()) {
        return current;
      }

      // Add children to queue
      const positions: MatrixPosition[] = ['L', 'M', 'R'];
      for (const position of positions) {
        if (current.children[position]) {
          queue.push(current.children[position]!);
        }
      }
    }

    return null;
  }

  /**
   * Get all nodes at a specific layer using BFS
   * @param targetLayer - Layer number (1-19)
   * @returns Array of nodes at that layer
   */
  getNodesAtLayer(targetLayer: number): MatrixNode[] {
    const result: MatrixNode[] = [];
    const queue: MatrixNode[] = [this.root];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.layer === targetLayer) {
        result.push(current);
      }

      // Don't traverse deeper than target layer
      if (current.layer < targetLayer) {
        const positions: MatrixPosition[] = ['L', 'M', 'R'];
        for (const position of positions) {
          if (current.children[position]) {
            queue.push(current.children[position]!);
          }
        }
      }
    }

    return result;
  }

  /**
   * Get all children of a node (direct descendants)
   * @param walletAddress - Parent's wallet address
   * @returns Array of child nodes
   */
  getChildren(walletAddress: string): MatrixNode[] {
    const node = this.findNode(walletAddress);
    if (!node) return [];

    const children: MatrixNode[] = [];
    const positions: MatrixPosition[] = ['L', 'M', 'R'];

    for (const position of positions) {
      if (node.children[position]) {
        children.push(node.children[position]!);
      }
    }

    return children;
  }

  /**
   * Get all descendants of a node (entire subtree) using DFS
   * @param walletAddress - Root of subtree
   * @returns Array of all descendant nodes
   */
  getDescendants(walletAddress: string): MatrixNode[] {
    const node = this.findNode(walletAddress);
    if (!node) return [];

    const descendants: MatrixNode[] = [];

    const dfs = (current: MatrixNode) => {
      const positions: MatrixPosition[] = ['L', 'M', 'R'];
      for (const position of positions) {
        if (current.children[position]) {
          const child = current.children[position]!;
          descendants.push(child);
          dfs(child); // Recursive DFS
        }
      }
    };

    dfs(node);
    return descendants;
  }

  /**
   * Get path from root to a specific node
   * @param walletAddress - Target node's wallet
   * @returns Array of nodes from root to target (ancestors)
   */
  getPathToNode(walletAddress: string): MatrixNode[] {
    const path: MatrixNode[] = [];

    const dfs = (current: MatrixNode): boolean => {
      path.push(current);

      if (current.wallet_address.toLowerCase() === walletAddress.toLowerCase()) {
        return true; // Found target
      }

      const positions: MatrixPosition[] = ['L', 'M', 'R'];
      for (const position of positions) {
        if (current.children[position]) {
          if (dfs(current.children[position]!)) {
            return true; // Target found in this subtree
          }
        }
      }

      path.pop(); // Backtrack
      return false;
    };

    dfs(this.root);
    return path;
  }

  /**
   * Calculate the depth/height of the tree
   * @returns Maximum depth (number of layers)
   */
  getTreeHeight(): number {
    const calculateHeight = (node: MatrixNode): number => {
      if (Object.keys(node.children).length === 0) {
        return node.layer; // Leaf node
      }

      let maxChildHeight = node.layer;
      const positions: MatrixPosition[] = ['L', 'M', 'R'];

      for (const position of positions) {
        if (node.children[position]) {
          const childHeight = calculateHeight(node.children[position]!);
          maxChildHeight = Math.max(maxChildHeight, childHeight);
        }
      }

      return maxChildHeight;
    };

    return calculateHeight(this.root);
  }

  /**
   * Count total nodes in the tree
   * @returns Total number of members in matrix
   */
  getTotalNodes(): number {
    let count = 0;

    const countNodes = (node: MatrixNode) => {
      count++;
      const positions: MatrixPosition[] = ['L', 'M', 'R'];
      for (const position of positions) {
        if (node.children[position]) {
          countNodes(node.children[position]!);
        }
      }
    };

    countNodes(this.root);
    return count;
  }

  /**
   * Get statistics for each layer
   * @returns Layer-by-layer statistics
   */
  getLayerStatistics(): Array<{
    layer: number;
    nodeCount: number;
    maxCapacity: number;
    occupancyRate: number;
  }> {
    const stats: Array<{
      layer: number;
      nodeCount: number;
      maxCapacity: number;
      occupancyRate: number;
    }> = [];

    for (let layer = 1; layer <= this.maxDepth; layer++) {
      const nodes = this.getNodesAtLayer(layer);
      const maxCapacity = Math.pow(3, layer); // 3^layer for ternary tree

      stats.push({
        layer,
        nodeCount: nodes.length,
        maxCapacity,
        occupancyRate: (nodes.length / maxCapacity) * 100
      });
    }

    return stats;
  }

  /**
   * Serialize tree to flat array (BFS order)
   * Useful for database synchronization
   */
  serialize(): Array<{
    member_wallet: string;
    parent_wallet: string | null;
    position: MatrixPosition | null;
    layer: number;
    matrix_root_wallet: string;
  }> {
    const result: Array<{
      member_wallet: string;
      parent_wallet: string | null;
      position: MatrixPosition | null;
      layer: number;
      matrix_root_wallet: string;
    }> = [];

    const queue: MatrixNode[] = [this.root];

    while (queue.length > 0) {
      const current = queue.shift()!;

      result.push({
        member_wallet: current.wallet_address,
        parent_wallet: current.parent_wallet,
        position: current.position,
        layer: current.layer,
        matrix_root_wallet: current.matrix_root_wallet
      });

      const positions: MatrixPosition[] = ['L', 'M', 'R'];
      for (const position of positions) {
        if (current.children[position]) {
          queue.push(current.children[position]!);
        }
      }
    }

    return result;
  }

  /**
   * Validate tree integrity
   * Checks for broken parent-child relationships, duplicate nodes, etc.
   */
  validate(): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const seenWallets = new Set<string>();

    const validateNode = (node: MatrixNode, expectedLayer: number) => {
      // Check for duplicate wallets
      const walletLower = node.wallet_address.toLowerCase();
      if (seenWallets.has(walletLower)) {
        errors.push(`Duplicate wallet found: ${node.wallet_address}`);
      }
      seenWallets.add(walletLower);

      // Check layer consistency
      if (node.layer !== expectedLayer) {
        errors.push(`Layer mismatch for ${node.wallet_address}: expected ${expectedLayer}, got ${node.layer}`);
      }

      // Check max depth
      if (node.layer > this.maxDepth) {
        errors.push(`Node ${node.wallet_address} exceeds max depth of ${this.maxDepth}`);
      }

      // Validate children
      const positions: MatrixPosition[] = ['L', 'M', 'R'];
      for (const position of positions) {
        if (node.children[position]) {
          const child = node.children[position]!;

          // Check parent-child relationship
          if (child.parent_wallet !== node.wallet_address) {
            errors.push(`Parent mismatch: ${child.wallet_address} parent should be ${node.wallet_address}, got ${child.parent_wallet}`);
          }

          // Check position
          if (child.position !== position) {
            errors.push(`Position mismatch for ${child.wallet_address}: should be ${position}, got ${child.position}`);
          }

          // Recursive validation
          validateNode(child, node.layer + 1);
        }
      }
    };

    validateNode(this.root, 0);

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Pretty print the tree structure (for debugging)
   */
  printTree(maxDepth: number = 3): string {
    let output = '';

    const printNode = (node: MatrixNode, prefix: string = '', isLast: boolean = true, depth: number = 0) => {
      if (depth > maxDepth) return;

      const connector = isLast ? '└── ' : '├── ';
      const shortWallet = node.wallet_address.slice(0, 6) + '...' + node.wallet_address.slice(-4);

      output += prefix + connector + `[${node.position || 'ROOT'}] ${shortWallet} (L${node.layer}, Seq: ${node.activation_sequence})\n`;

      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      const positions: MatrixPosition[] = ['L', 'M', 'R'];
      const existingChildren = positions.filter(pos => node.children[pos]);

      existingChildren.forEach((position, index) => {
        const child = node.children[position]!;
        const isLastChild = index === existingChildren.length - 1;
        printNode(child, newPrefix, isLastChild, depth + 1);
      });
    };

    printNode(this.root);
    return output;
  }
}

/**
 * Factory function to build a MatrixTree from database records
 */
export function buildMatrixTreeFromDatabase(
  rootWallet: string,
  matrixRecords: Array<{
    member_wallet: string;
    parent_wallet: string | null;
    position: MatrixPosition | null;
    layer: number;
    activation_sequence: number;
    referrer_wallet: string | null;
    referral_type: ReferralType;
    current_level: number;
    placed_at: string;
  }>
): MatrixTree {
  // Find root record
  const rootRecord = matrixRecords.find(r => r.member_wallet.toLowerCase() === rootWallet.toLowerCase());

  if (!rootRecord) {
    throw new Error(`Root wallet ${rootWallet} not found in records`);
  }

  const tree = new MatrixTree(rootWallet, rootRecord.activation_sequence);

  // Build node lookup map
  const nodeMap = new Map<string, MatrixNode>();
  nodeMap.set(rootWallet.toLowerCase(), tree.getRoot());

  // Sort by layer to ensure parents are processed before children
  const sortedRecords = [...matrixRecords].sort((a, b) => a.layer - b.layer);

  // Build tree structure
  for (const record of sortedRecords) {
    if (record.member_wallet.toLowerCase() === rootWallet.toLowerCase()) {
      continue; // Skip root
    }

    const parentKey = record.parent_wallet?.toLowerCase();
    const parentNode = parentKey ? nodeMap.get(parentKey) : null;

    if (!parentNode) {
      console.warn(`Parent not found for ${record.member_wallet}`);
      continue;
    }

    if (!record.position) {
      console.warn(`Position is null for ${record.member_wallet}`);
      continue;
    }

    const newNode: MatrixNode = {
      wallet_address: record.member_wallet,
      activation_sequence: record.activation_sequence,
      parent_wallet: record.parent_wallet,
      position: record.position,
      layer: record.layer,
      children: {},
      matrix_root_wallet: rootWallet,
      referral_type: record.referral_type,
      placed_at: new Date(record.placed_at),
      current_level: record.current_level,
      referrer_wallet: record.referrer_wallet
    };

    parentNode.children[record.position] = newNode;
    nodeMap.set(record.member_wallet.toLowerCase(), newNode);
  }

  return tree;
}

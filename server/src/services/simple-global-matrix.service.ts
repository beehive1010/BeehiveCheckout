import { db } from '../../db';
import { referralNodes, matrixLayers } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Simple Global Matrix Service
 * Referrer as root → find empty layer → place account
 */
export class SimpleGlobalMatrixService {

  /**
   * Place user in global matrix using referrer as root
   * Find first empty spot in any layer using BFS
   */
  async placeInGlobalMatrix(newUserWallet: string, referrerWallet: string): Promise<{
    placerWallet: string;
    matrixPosition: number;
    layer: number;
    slot: 'left' | 'middle' | 'right';
  }> {
    const newUser = newUserWallet.toLowerCase();
    const referrer = referrerWallet.toLowerCase();

    console.log(`🌍 GLOBAL MATRIX: Placing ${newUser} with referrer ${referrer} as root`);

    // Check if user already placed
    const [existing] = await db.select()
      .from(referralNodes)
      .where(eq(referralNodes.walletAddress, newUser));
    
    if (existing) {
      throw new Error('User already placed in global matrix');
    }

    // Find placement using referrer as root
    const placement = await this.findFirstEmptySpot(referrer);
    
    // Store the placement
    await this.persistPlacement(newUser, referrer, placement);
    
    console.log(`✅ PLACED: ${newUser} at Layer ${placement.layer}, ${placement.slot} under ${placement.placerWallet}`);
    
    return placement;
  }

  /**
   * Find first empty spot in global matrix starting from referrer root
   * Uses BFS to scan layers 1→2→3...→19 for empty positions
   */
  private async findFirstEmptySpot(referrerRoot: string): Promise<{
    placerWallet: string;
    matrixPosition: number;
    layer: number;
    slot: 'left' | 'middle' | 'right';
  }> {
    console.log(`🔍 Scanning global matrix from root: ${referrerRoot}`);

    // BFS queue starting from referrer
    const queue = [{ 
      wallet: referrerRoot, 
      layer: 0, 
      position: 0 
    }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (visited.has(current.wallet)) continue;
      visited.add(current.wallet);

      console.log(`📍 Checking node: ${current.wallet} at layer ${current.layer}`);

      // Check this node's 3 slots: Left, Middle, Right
      const slots = [
        { position: 1, slot: 'left' as const },
        { position: 2, slot: 'middle' as const },
        { position: 3, slot: 'right' as const }
      ];

      for (const { position, slot } of slots) {
        // Check if this slot is empty
        const isOccupied = await this.isSlotOccupied(current.wallet, position);
        
        if (!isOccupied) {
          // Found empty slot!
          console.log(`✅ EMPTY SLOT FOUND: Layer ${current.layer + 1}, ${slot} under ${current.wallet}`);
          
          return {
            placerWallet: current.wallet,
            matrixPosition: position,
            layer: current.layer + 1,
            slot
          };
        } else {
          // Slot occupied, add child to queue for next layer
          const childWallet = await this.getChildInSlot(current.wallet, position);
          if (childWallet && !visited.has(childWallet)) {
            queue.push({
              wallet: childWallet,
              layer: current.layer + 1,
              position
            });
          }
        }
      }
    }

    // Fallback: Force place under referrer in left slot
    console.log(`🔄 Matrix scan complete - force placing under referrer`);
    return {
      placerWallet: referrerRoot,
      matrixPosition: 1,
      layer: 1,
      slot: 'left'
    };
  }

  /**
   * Check if a slot under a specific wallet is occupied
   */
  private async isSlotOccupied(parentWallet: string, position: number): Promise<boolean> {
    try {
      // Get the parent's referral node
      const [parentNode] = await db.select()
        .from(referralNodes)
        .where(eq(referralNodes.walletAddress, parentWallet.toLowerCase()));

      if (!parentNode) {
        return false; // Parent not in matrix yet
      }

      // Check the specific leg
      const legKey = position === 1 ? 'leftLeg' : 
                    position === 2 ? 'middleLeg' : 'rightLeg';
      
      const leg = parentNode[legKey] as any[];
      return leg && leg.length > 0;
    } catch (error) {
      console.error('Error checking slot occupation:', error);
      return false;
    }
  }

  /**
   * Get child wallet in specific slot
   */
  private async getChildInSlot(parentWallet: string, position: number): Promise<string | null> {
    try {
      const [parentNode] = await db.select()
        .from(referralNodes)
        .where(eq(referralNodes.walletAddress, parentWallet.toLowerCase()));

      if (!parentNode) return null;

      const legKey = position === 1 ? 'leftLeg' : 
                    position === 2 ? 'middleLeg' : 'rightLeg';
      
      const leg = parentNode[legKey] as any[];
      return leg && leg.length > 0 ? leg[0] : null;
    } catch (error) {
      console.error('Error getting child in slot:', error);
      return null;
    }
  }

  /**
   * Persist the matrix placement in database
   */
  private async persistPlacement(
    userWallet: string, 
    referrerWallet: string, 
    placement: {
      placerWallet: string;
      matrixPosition: number;
      layer: number;
      slot: 'left' | 'middle' | 'right';
    }
  ): Promise<void> {
    try {
      // Insert user's referral node
      await db.insert(referralNodes).values({
        walletAddress: userWallet,
        sponsorWallet: referrerWallet, // Original referrer
        placerWallet: placement.placerWallet, // Direct upline in matrix
        matrixPosition: placement.matrixPosition,
        leftLeg: [],
        middleLeg: [],
        rightLeg: [],
        directReferralCount: 0,
        totalTeamCount: 0,
        createdAt: new Date()
      });

      // Update the placer's leg
      await this.updatePlacerLeg(placement.placerWallet, placement.matrixPosition, userWallet);

      console.log(`💾 Matrix placement persisted: ${userWallet} → ${placement.placerWallet}`);
    } catch (error) {
      console.error('Error persisting placement:', error);
      throw error;
    }
  }

  /**
   * Update placer's leg to include new child
   */
  private async updatePlacerLeg(placerWallet: string, position: number, childWallet: string): Promise<void> {
    try {
      const [placerNode] = await db.select()
        .from(referralNodes)
        .where(eq(referralNodes.walletAddress, placerWallet.toLowerCase()));

      if (!placerNode) {
        // Placer doesn't exist yet, create them
        await db.insert(referralNodes).values({
          walletAddress: placerWallet.toLowerCase(),
          sponsorWallet: placerWallet.toLowerCase(), // Self as sponsor for root
          placerWallet: placerWallet.toLowerCase(),
          matrixPosition: 0,
          leftLeg: position === 1 ? [childWallet] : [],
          middleLeg: position === 2 ? [childWallet] : [],
          rightLeg: position === 3 ? [childWallet] : [],
          directReferralCount: 1,
          totalTeamCount: 1,
          createdAt: new Date()
        });
      } else {
        // Update existing placer's leg
        const legKey = position === 1 ? 'leftLeg' : position === 2 ? 'middleLeg' : 'rightLeg';
        const currentLeg = (placerNode[legKey] as any[]) || [];
        const updatedLeg = [...currentLeg, childWallet];

        await db.update(referralNodes)
          .set({
            [legKey]: updatedLeg,
            directReferralCount: (placerNode.directReferralCount || 0) + 1,
            totalTeamCount: (placerNode.totalTeamCount || 0) + 1
          })
          .where(eq(referralNodes.walletAddress, placerWallet.toLowerCase()));
      }
    } catch (error) {
      console.error('Error updating placer leg:', error);
    }
  }

  /**
   * Get first ancestor (for reward distribution)
   */
  async getFirstAncestor(memberWallet: string): Promise<string | null> {
    try {
      const [memberNode] = await db.select()
        .from(referralNodes)
        .where(eq(referralNodes.walletAddress, memberWallet.toLowerCase()));

      return memberNode?.placerWallet || null;
    } catch (error) {
      console.error('Error getting first ancestor:', error);
      return null;
    }
  }

  /**
   * Get matrix info for dashboard
   */
  async getMatrixInfo(walletAddress: string): Promise<{
    position: { layer: number; slot: string };
    directChildren: number;
    totalDownline: number;
  }> {
    try {
      const [node] = await db.select()
        .from(referralNodes)
        .where(eq(referralNodes.walletAddress, walletAddress.toLowerCase()));

      if (!node) {
        return {
          position: { layer: 0, slot: 'none' },
          directChildren: 0,
          totalDownline: 0
        };
      }

      const slotName = node.matrixPosition === 1 ? 'left' : 
                      node.matrixPosition === 2 ? 'middle' : 
                      node.matrixPosition === 3 ? 'right' : 'none';

      return {
        position: { layer: 1, slot: slotName }, // Simplified
        directChildren: node.directReferralCount || 0,
        totalDownline: node.totalTeamCount || 0
      };
    } catch (error) {
      console.error('Error getting matrix info:', error);
      return {
        position: { layer: 0, slot: 'none' },
        directChildren: 0,
        totalDownline: 0
      };
    }
  }
}

export const simpleGlobalMatrixService = new SimpleGlobalMatrixService();
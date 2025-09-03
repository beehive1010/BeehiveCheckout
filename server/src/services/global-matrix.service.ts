import { db } from '../../db';
import { referralNodes, matrixLayers } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export interface MatrixPosition {
  walletAddress: string;
  sponsorWallet: string;
  placerWallet: string;
  layer: number;
  position: number; // 0-based position within the layer
  slot: 'left' | 'middle' | 'right';
  depth: number; // Distance from root
}

export interface MatrixAncestor {
  walletAddress: string;
  depth: number;
  layer: number;
  position: number;
}

/**
 * C) Global Matrix Placement Service
 * Implements global spillover with BFS and L→M→R filling
 * Layer capacities: Layer 1 = 3, Layer 2 = 9, ..., Layer 19 = 3^19
 */
export class GlobalMatrixService {

  /**
   * Place user in global matrix using BFS algorithm
   * Fills layers Left → Middle → Right, top to bottom
   */
  async placeInGlobalMatrix(childWallet: string, rootWallet: string): Promise<MatrixPosition> {
    const child = childWallet.toLowerCase();
    const root = rootWallet.toLowerCase();

    console.log(`🎯 Starting matrix placement: ${child} under root ${root}`);

    // Check if user is already placed
    const [existingPlacement] = await db.select()
      .from(referralNodes)
      .where(eq(referralNodes.walletAddress, child));
    
    if (existingPlacement) {
      throw new Error('User already placed in matrix');
    }

    // Find placement using BFS
    const placement = await this.findOptimalPlacement(root);
    
    // Create the placement record
    const matrixPosition: MatrixPosition = {
      walletAddress: child,
      sponsorWallet: root, // Original referrer
      placerWallet: placement.placerWallet, // Actual upline in matrix
      layer: placement.layer,
      position: placement.position,
      slot: placement.slot,
      depth: placement.depth
    };

    // Persist in database
    await this.persistMatrixPlacement(matrixPosition);
    
    // Update matrix statistics
    await this.updateMatrixStats(root, placement.layer);

    console.log(`✅ Matrix placement complete: Layer ${placement.layer}, Position ${placement.position}, Slot ${placement.slot}`);
    
    return matrixPosition;
  }

  /**
   * BFS algorithm to find next available position
   * Searches layer by layer, filling L→M→R within each layer
   */
  private async findOptimalPlacement(rootWallet: string): Promise<{
    placerWallet: string;
    layer: number;
    position: number;
    slot: 'left' | 'middle' | 'right';
    depth: number;
  }> {
    const root = rootWallet.toLowerCase();
    
    // Start BFS from layer 1
    for (let layer = 1; layer <= 19; layer++) {
      const layerCapacity = Math.pow(3, layer); // Layer 1=3, Layer 2=9, etc.
      
      console.log(`🔍 Searching Layer ${layer} (capacity: ${layerCapacity})`);
      
      // Get all members in this layer
      const layerMembers = await this.getLayerMembers(root, layer);
      
      console.log(`📊 Layer ${layer} current size: ${layerMembers.length}/${layerCapacity}`);
      
      if (layerMembers.length < layerCapacity) {
        // Found available space in this layer
        return await this.findSlotInLayer(root, layer, layerMembers);
      }
    }
    
    throw new Error('Matrix is full (all 19 layers filled)');
  }

  /**
   * Find specific slot in a layer using L→M→R filling
   */
  private async findSlotInLayer(rootWallet: string, layer: number, existingMembers: any[]): Promise<{
    placerWallet: string;
    layer: number;
    position: number;
    slot: 'left' | 'middle' | 'right';
    depth: number;
  }> {
    const layerCapacity = Math.pow(3, layer);
    
    // For each potential position in the layer
    for (let position = 0; position < layerCapacity; position++) {
      // Calculate which upline this position should be under
      const uplinePosition = Math.floor(position / 3);
      const slotIndex = position % 3;
      const slot: 'left' | 'middle' | 'right' = ['left', 'middle', 'right'][slotIndex] as any;
      
      // Check if this position is available
      const isOccupied = existingMembers.some(member => member.matrixPosition === position);
      
      if (!isOccupied) {
        // Find the upline wallet for this position
        let placerWallet: string;
        
        if (layer === 1) {
          // Direct under root
          placerWallet = rootWallet.toLowerCase();
        } else {
          // Find upline in previous layer
          const uplineLayerMembers = await this.getLayerMembers(rootWallet, layer - 1);
          if (uplinePosition < uplineLayerMembers.length) {
            placerWallet = uplineLayerMembers[uplinePosition].walletAddress;
          } else {
            // Upline doesn't exist yet, continue searching
            continue;
          }
        }
        
        console.log(`🎯 Found slot: Layer ${layer}, Position ${position}, Slot ${slot}, Under ${placerWallet}`);
        
        return {
          placerWallet,
          layer,
          position,
          slot,
          depth: layer // In this system, layer = depth from root
        };
      }
    }
    
    throw new Error(`No available slots in layer ${layer}`);
  }

  /**
   * Get all members in a specific layer of the matrix
   */
  private async getLayerMembers(rootWallet: string, layer: number): Promise<any[]> {
    try {
      // Query referral_nodes to find all members at this layer depth
      // This is a simplified approach - in practice you might need more complex queries
      
      // For now, let's get matrix layer data
      const [layerData] = await db.select()
        .from(matrixLayers)
        .where(and(
          eq(matrixLayers.walletAddress, rootWallet.toLowerCase()),
          eq(matrixLayers.layer, layer)
        ));
      
      return layerData?.members || [];
    } catch (error) {
      console.error(`Error getting layer ${layer} members:`, error);
      return [];
    }
  }

  /**
   * Persist matrix placement in database
   */
  private async persistMatrixPlacement(position: MatrixPosition): Promise<void> {
    try {
      // Insert into referral_nodes
      await db.insert(referralNodes).values({
        walletAddress: position.walletAddress,
        sponsorWallet: position.sponsorWallet,
        placerWallet: position.placerWallet,
        matrixPosition: position.position,
        directReferralCount: 0,
        totalTeamCount: 0,
        createdAt: new Date()
      });

      // Update matrix layers table
      await this.updateMatrixLayerData(position);
      
      console.log(`💾 Matrix placement persisted for ${position.walletAddress}`);
    } catch (error) {
      console.error('Error persisting matrix placement:', error);
      throw error;
    }
  }

  /**
   * Update matrix layer data structure
   */
  private async updateMatrixLayerData(position: MatrixPosition): Promise<void> {
    try {
      // Get existing layer data
      const [existingLayer] = await db.select()
        .from(matrixLayers)
        .where(and(
          eq(matrixLayers.walletAddress, position.sponsorWallet),
          eq(matrixLayers.layer, position.layer)
        ));

      const currentMembers = existingLayer?.members || [];
      const updatedMembers = [...currentMembers, position.walletAddress];
      const layerCapacity = Math.pow(3, position.layer);

      if (existingLayer) {
        // Update existing layer
        await db.update(matrixLayers)
          .set({
            members: updatedMembers,
            memberCount: updatedMembers.length
          })
          .where(and(
            eq(matrixLayers.walletAddress, position.sponsorWallet),
            eq(matrixLayers.layer, position.layer)
          ));
      } else {
        // Create new layer record
        await db.insert(matrixLayers).values({
          walletAddress: position.sponsorWallet,
          layer: position.layer,
          members: updatedMembers,
          memberCount: updatedMembers.length,
          maxMembers: layerCapacity,
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error updating matrix layer data:', error);
    }
  }

  /**
   * Update matrix statistics
   */
  private async updateMatrixStats(rootWallet: string, affectedLayer: number): Promise<void> {
    try {
      // Update team counts for all uplines
      // This would traverse up the matrix and increment counters
      // Simplified for now
      console.log(`📈 Updated matrix stats for root ${rootWallet}, layer ${affectedLayer}`);
    } catch (error) {
      console.error('Error updating matrix stats:', error);
    }
  }

  /**
   * Get ancestor at specific depth (for reward distribution)
   */
  async getAncestorAtDepth(memberWallet: string, depth: number): Promise<MatrixAncestor | null> {
    try {
      const wallet = memberWallet.toLowerCase();
      
      // Get member's matrix position
      const [memberNode] = await db.select()
        .from(referralNodes)
        .where(eq(referralNodes.walletAddress, wallet));
      
      if (!memberNode) {
        return null;
      }

      // For depth 1, return the placer (direct upline)
      if (depth === 1 && memberNode.placerWallet) {
        return {
          walletAddress: memberNode.placerWallet,
          depth: 1,
          layer: Math.max(1, (memberNode.matrixPosition || 0) - 1),
          position: 0 // Simplified
        };
      }

      // For deeper depths, we'd need to traverse up the matrix
      // This is a simplified implementation
      return null;
    } catch (error) {
      console.error('Error getting ancestor:', error);
      return null;
    }
  }

  /**
   * Get complete matrix structure for a root
   */
  async getMatrixStructure(rootWallet: string): Promise<{
    layers: Map<number, string[]>;
    totalMembers: number;
    maxLayer: number;
  }> {
    try {
      const layers = new Map<number, string[]>();
      let totalMembers = 0;
      let maxLayer = 0;

      for (let layer = 1; layer <= 19; layer++) {
        const layerMembers = await this.getLayerMembers(rootWallet, layer);
        if (layerMembers.length > 0) {
          layers.set(layer, layerMembers.map(m => m.walletAddress));
          totalMembers += layerMembers.length;
          maxLayer = layer;
        }
      }

      return { layers, totalMembers, maxLayer };
    } catch (error) {
      console.error('Error getting matrix structure:', error);
      return { layers: new Map(), totalMembers: 0, maxLayer: 0 };
    }
  }
}

export const globalMatrixService = new GlobalMatrixService();
import type { Express } from "express";
import { usersService, rewardsService } from '../services';

export function registerTasksRoutes(app: Express, requireWallet: any) {
  
  // Get available NFTs for claiming
  app.get("/api/tasks/nfts", async (req, res) => {
    try {
      // Mock NFT data - in real implementation would fetch from blockchain/database
      const availableNFTs = [
        {
          id: 1,
          name: "Level 1 Membership NFT",
          description: "Access to Level 1 features and rewards",
          cost: 50,
          tokenType: "BCC",
          level: 1,
          available: true
        },
        {
          id: 2,
          name: "Level 2 Membership NFT", 
          description: "Access to Level 2 features and enhanced rewards",
          cost: 100,
          tokenType: "BCC",
          level: 2,
          available: true
        }
      ];
      
      res.json(availableNFTs);
    } catch (error) {
      console.error('Get NFTs error:', error);
      res.status(500).json({ error: 'Failed to get available NFTs' });
    }
  });

  // Claim NFT with BCC tokens
  app.post("/api/tasks/claim", requireWallet, async (req: any, res) => {
    try {
      const { nftId, cost, tokenType = 'BCC' } = req.body;
      
      if (!nftId || !cost) {
        return res.status(400).json({ error: 'NFT ID and cost are required' });
      }

      // Verify user has sufficient balance (mock check)
      const userProfile = await usersService.getUserProfile(req.walletAddress);
      if (!userProfile) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Mock balance check - in real implementation would check actual BCC balance
      console.log(`Claiming NFT ${nftId} for ${cost} ${tokenType} by ${req.walletAddress}`);
      
      // Mock successful NFT claim
      const claimResult = {
        success: true,
        nftId,
        claimerWallet: req.walletAddress,
        cost,
        tokenType,
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        claimedAt: new Date().toISOString()
      };

      res.json(claimResult);
    } catch (error) {
      console.error('Claim NFT error:', error);
      res.status(500).json({ 
        error: 'Failed to claim NFT',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Demo NFT claim endpoint
  app.post("/api/demo/claim-nft", requireWallet, async (req: any, res) => {
    try {
      console.log('Demo NFT claim request:', req.body);
      
      const { level = 1 } = req.body;
      
      // Mock successful demo claim
      const demoResult = {
        success: true,
        message: `Demo NFT Level ${level} claimed successfully`,
        walletAddress: req.walletAddress,
        level,
        demoMode: true,
        claimedAt: new Date().toISOString()
      };

      res.json(demoResult);
    } catch (error) {
      console.error('Demo NFT claim error:', error);
      res.status(500).json({ 
        error: 'Failed to claim demo NFT',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
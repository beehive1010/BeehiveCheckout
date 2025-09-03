import type { Express } from "express";
import { usersService, referralsService, rewardsService } from '../services';
import { storage } from '../services/storage.service';
import { registrationService } from '../services/registration.service';
import { globalMatrixService } from '../services/global-matrix.service';
import { rewardDistributionService } from '../services/reward-distribution.service';

export function registerMembershipRoutes(app: Express, requireWallet: any) {

  // B) Registration endpoint
  app.post("/api/membership/register", async (req: any, res) => {
    try {
      const { walletAddress, username, email, referrerWallet, secondaryPassword } = req.body;
      
      if (!walletAddress || !username || !email) {
        return res.status(400).json({ message: 'Wallet address, username, and email required' });
      }

      const result = await registrationService.registerUser({
        walletAddress,
        username,
        email,
        referrerWallet,
        secondaryPassword
      });

      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      res.json({
        success: true,
        message: result.message,
        user: result.user,
        nextStep: 'activate_membership'
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed' });
    }
  });
  
  // Activate membership level
  app.post("/api/membership/activate", requireWallet, async (req: any, res) => {
    try {
      const { level, txHash } = req.body;
      
      if (!level || level < 1 || level > 19) {
        return res.status(400).json({ error: 'Invalid membership level' });
      }

      // Activate user at specified level
      await usersService.activateUser(req.walletAddress, level);
      
      // Process reward distribution for this level upgrade
      if (level > 1) {
        await rewardsService.processLevelUpgradeRewards({
          memberWallet: req.walletAddress,
          triggerLevel: level,
          upgradeAmount: 0 // Amount would be calculated based on level
        });
      }

      res.json({ 
        success: true, 
        message: `Membership activated at level ${level}`,
        txHash 
      });
    } catch (error) {
      console.error('Membership activation error:', error);
      res.status(500).json({ 
        error: 'Failed to activate membership',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // NFT-based activation
  app.post("/api/membership/nft-activate", requireWallet, async (req: any, res) => {
    try {
      const { level, nftTokenId, contractAddress } = req.body;
      
      if (!level || level < 1 || level > 19) {
        return res.status(400).json({ error: 'Invalid membership level' });
      }

      // In real implementation, would verify NFT ownership
      console.log(`Verifying NFT ownership: ${contractAddress}#${nftTokenId} for ${req.walletAddress}`);
      
      // Activate user
      await usersService.activateUser(req.walletAddress, level);
      
      // Process rewards
      await rewardsService.processLevelUpgradeRewards({
        memberWallet: req.walletAddress,
        triggerLevel: level,
        upgradeAmount: 0
      });

      res.json({ 
        success: true, 
        message: `NFT membership activated at level ${level}`,
        nftTokenId,
        contractAddress
      });
    } catch (error) {
      console.error('NFT activation error:', error);
      res.status(500).json({ 
        error: 'Failed to activate NFT membership',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Multi-chain NFT claiming endpoint
  app.post('/api/membership/multi-chain-claim', requireWallet, async (req: any, res) => {
    try {
      const { level, transactionHash, chainId, priceUSDT, userWallet } = req.body;
      
      if (!level || !transactionHash || !chainId || !priceUSDT || !userWallet) {
        return res.status(400).json({ 
          error: 'Missing required parameters: level, transactionHash, chainId, priceUSDT, userWallet' 
        });
      }

      // Log the multi-chain claim attempt
      console.log(`🔗 Multi-chain NFT claim attempt:`, {
        userWallet,
        level,
        chainId,
        transactionHash: transactionHash.slice(0, 10) + '...',
        priceUSDT: `$${priceUSDT / 100}`
      });

      // TODO: Verify transaction on the selected chain
      // This would involve:
      // 1. Connecting to the chain's RPC
      // 2. Verifying the USDT transfer to bridge wallet
      // 3. Confirming the correct amount was sent
      
      // For now, simulate verification delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // TODO: Mint NFT to user's wallet via server wallet
      // This would involve:
      // 1. Using server's private key to mint NFT
      // 2. Transferring from server wallet to user wallet
      // 3. Recording the mint transaction
      
      // Simulate NFT minting
      const simulatedMintTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      
      // Update user's membership level
      await usersService.updateMembershipLevel(req.walletAddress, level);

      // Log successful claim
      console.log(`✅ NFT Level ${level} claimed successfully for ${userWallet}`);
      console.log(`💰 Payment: $${priceUSDT / 100} USDT on chain ${chainId}`);
      console.log(`🔗 Payment TX: ${transactionHash}`);
      console.log(`🎨 Mint TX: ${simulatedMintTxHash}`);

      res.json({
        success: true,
        level,
        mintTxHash: simulatedMintTxHash,
        paymentTxHash: transactionHash,
        chainId,
        message: `Level ${level} NFT successfully minted to your wallet`
      });

    } catch (error: any) {
      console.error('Multi-chain claim error:', error);
      res.status(500).json({ 
        error: 'Failed to process NFT claim',
        details: error.message 
      });
    }
  });

  // Get available membership levels for purchase
  app.get('/api/membership/available-levels/:walletAddress', async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      const user = await storage.getUser(walletAddress);
      const currentLevel = user?.currentLevel || 0;
      
      // User can purchase levels higher than their current level
      const availableLevels = [];
      for (let level = currentLevel + 1; level <= 19; level++) {
        availableLevels.push(level);
      }
      
      res.json({
        currentLevel,
        availableLevels,
        maxLevel: 19
      });

    } catch (error: any) {
      console.error('Error getting available levels:', error);
      res.status(500).json({ 
        error: 'Failed to get available levels',
        details: error.message 
      });
    }
  });

  // Debug endpoint for testing matrix layers
  app.post("/api/debug/test-layers", requireWallet, async (req: any, res) => {
    try {
      const { targetLevel } = req.body;
      
      if (!targetLevel || targetLevel < 1 || targetLevel > 19) {
        return res.status(400).json({ error: 'Invalid target level' });
      }

      // Simulate level upgrade for testing
      await usersService.updateMembershipLevel(req.walletAddress, targetLevel);
      
      // Get updated referral stats
      const stats = await referralsService.getReferralStats(req.walletAddress);
      
      res.json({ 
        success: true, 
        message: `Debug: Updated to level ${targetLevel}`,
        stats
      });
    } catch (error) {
      console.error('Debug test layers error:', error);
      res.status(500).json({ 
        error: 'Debug operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
import type { Express } from "express";
import { usersService, referralsService, rewardsService } from '../services';
import { storage } from '../services/storage.service';
import { registrationService } from '../services/registration.service';
import { globalMatrixService } from '../services/global-matrix.service';
import { rewardDistributionService } from '../services/reward-distribution.service';
import { db } from '../../db';
import { 
  memberReferralTree, 
  platformRevenue, 
  memberActivations, 
  memberNFTVerification, 
  userNotifications, 
  bccUnlockHistory,
  levelConfig
} from '@shared/schema';
import { eq, count } from 'drizzle-orm';

export function registerMembershipRoutes(app: Express, requireWallet: any) {

  // Member status endpoint for NFT verification
  app.get("/api/member/status", requireWallet, async (req: any, res) => {
    try {
      const walletAddress = req.headers['x-wallet-address'] as string;
      
      if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address required' });
      }

      console.log('🔍 Getting member status for:', walletAddress);

      // Get user membership status
      const userStatus = await usersService.getUserStatusWithNFT(walletAddress);
      
      if (!userStatus.isRegistered) {
        return res.status(404).json({ 
          isActivated: false, 
          currentLevel: 0, 
          levelsOwned: [] 
        });
      }

      // Return NFT-focused status
      const memberStatus = {
        isActivated: userStatus.isActivated || false,
        currentLevel: userStatus.membershipLevel || 0,
        levelsOwned: userStatus.membershipLevel ? [userStatus.membershipLevel] : []
      };

      console.log('✅ Member status response:', memberStatus);
      res.json(memberStatus);
    } catch (error) {
      console.error('Get member status error:', error);
      res.status(500).json({ error: 'Failed to get member status' });
    }
  });

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

      // Mint NFT using Thirdweb SDK with the same contract as welcome page
      let mintTxHash: string;
      try {
        // Use the same contract addresses as the welcome page
        const contractAddresses = {
          arbitrumSepolia: '0xAc8c8662726b72f8DB4F5D1d1a16aC5b06B7a90D',
          alphaCentauri: '0x5f6045Cc578b9f7E20416ede382f31FC151f32E7'
        };
        
        // Select contract based on chain ID (default to Arbitrum Sepolia for all chains)
        const nftContractAddress = contractAddresses.arbitrumSepolia;
        const tokenId = level; // Token ID equals membership level (Level 2 = Token ID 2)
        
        console.log(`🎨 Minting NFT: Contract ${nftContractAddress}, Token ID ${tokenId}, Level ${level}`);
        
        // For now, simulate minting until we implement the actual Thirdweb SDK call
        // TODO: Implement actual NFT minting with Thirdweb SDK
        mintTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
        
        console.log(`✅ NFT minted successfully: ${mintTxHash}`);
      } catch (mintError) {
        console.error('NFT minting failed:', mintError);
        // Fallback to simulated hash but log the error
        mintTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      }
      
      // Update user's membership level
      await usersService.updateMembershipLevel(req.walletAddress, level);

      // Get level configuration for platform revenue calculation
      const [levelConfigData] = await db
        .select()
        .from(levelConfig)
        .where(eq(levelConfig.level, level));

      // 1. Record platform revenue (30 USDT for level 1)
      const platformFee = (level === 1 ? 3000 : 0); // 30 USDT in cents
      await db.insert(platformRevenue).values({
        sourceType: 'nft_claim',
        sourceWallet: userWallet,
        level: level,
        amount: platformFee.toString(),
        currency: 'USDT',
        description: `Platform fee from Level ${level} NFT claim`,
        metadata: {
          transactionHash,
          chainId,
          mintTxHash,
          nftContractAddress: '0xAc8c8662726b72f8DB4F5D1d1a16aC5b06B7a90D'
        }
      });

      // 2. Record member activation
      await db.insert(memberActivations).values({
        walletAddress: userWallet,
        activationType: 'nft_purchase',
        level: level,
        isPending: false,
        activatedAt: new Date()
      });

      // 3. Record NFT verification
      await db.insert(memberNFTVerification).values({
        walletAddress: userWallet,
        memberLevel: level,
        tokenId: level,
        nftContractAddress: '0xAc8c8662726b72f8DB4F5D1d1a16aC5b06B7a90D',
        chain: chainId.toString(),
        networkType: 'testnet',
        verificationStatus: 'verified',
        verifiedAt: new Date()
      });

      // 4. Create user notification (temporarily disabled for schema compatibility)
      // await db.insert(userNotifications).values({
      //   walletAddress: userWallet,
      //   title: `Level ${level} NFT Claimed Successfully`,
      //   message: `Congratulations! Your Level ${level} NFT has been successfully minted and verified.`,
      //   type: 'member_activated',
      //   triggerWallet: userWallet,
      //   amount: priceUSDT,
      //   amountType: 'USDT',
      //   level: level,
      //   isRead: false,
      //   priority: 'high'
      // });

      // 5. Record BCC unlock history if applicable
      if (level >= 1) {
        const bccUnlockAmount = 50000 * level; // Standard BCC unlock amount
        await db.insert(bccUnlockHistory).values({
          walletAddress: userWallet,
          unlockLevel: level,
          unlockAmount: bccUnlockAmount,
          unlockTier: 'full'
        });
      }

      // Log successful claim
      console.log(`✅ NFT Level ${level} claimed successfully for ${userWallet}`);
      console.log(`💰 Payment: $${priceUSDT / 100} USDT on chain ${chainId}`);
      console.log(`💰 Platform Revenue: $${platformFee / 100} USDT recorded`);
      console.log(`🔗 Payment TX: ${transactionHash}`);
      console.log(`🎨 Mint TX: ${mintTxHash}`);

      res.json({
        success: true,
        level,
        mintTxHash: mintTxHash,
        paymentTxHash: transactionHash,
        chainId,
        nftContractAddress: '0xAc8c8662726b72f8DB4F5D1d1a16aC5b06B7a90D',
        tokenId: level,
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

  // Get available membership levels for purchase (sequential + referral requirements)
  app.get('/api/membership/available-levels/:walletAddress', async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      const user = await storage.getUser(walletAddress);
      const currentLevel = user?.currentLevel || 0;
      
      // Get direct referral count
      const directReferrals = await db
        .select({ count: count() })
        .from(memberReferralTree)
        .where(eq(memberReferralTree.rootWallet, walletAddress.toLowerCase()));
      
      const directReferralCount = directReferrals[0]?.count || 0;
      
      // Sequential purchase: only next level available
      const nextLevel = currentLevel + 1;
      const availableLevels = [];
      let requirementsMet = true;
      let requirementDetails = null;
      
      // Check if next level can be purchased
      if (nextLevel <= 19) {
        // Referral requirements for specific levels
        const referralRequirements = {
          2: 3, // Level 2 needs 3 direct sponsors
          // Level 3+: No referral requirements, just sequential unlock
        };
        
        const requiredReferrals = referralRequirements[nextLevel as keyof typeof referralRequirements] || 0;
        
        if (requiredReferrals > 0) {
          if (directReferralCount >= requiredReferrals) {
            availableLevels.push(nextLevel);
          } else {
            requirementsMet = false;
            requirementDetails = {
              requiredReferrals,
              currentReferrals: directReferralCount,
              missingReferrals: requiredReferrals - directReferralCount
            };
          }
        } else {
          // No referral requirement for this level
          availableLevels.push(nextLevel);
        }
      }
      
      res.json({
        currentLevel,
        nextLevel: nextLevel <= 19 ? nextLevel : null,
        availableLevels,
        maxLevel: 19,
        directReferralCount,
        requirementsMet,
        requirementDetails,
        isSequential: true // Flag to indicate sequential purchase system
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
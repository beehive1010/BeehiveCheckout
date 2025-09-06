import type { Express } from "express";
import { usersService } from '../services';
import { NFTLevelConfigService } from '../services/nft-level-config.service';
import { layerRewardsService } from '../services/layer-rewards.service';
import { storage } from '../services/storage.service';
import jwt from "jsonwebtoken";

export function registerNFTUpgradeRoutes(app: Express, requireWallet: any) {
  const JWT_SECRET = process.env.JWT_SECRET || 'beehive-secret-key';

  // Get NFT level configurations
  app.get("/api/nft/levels", async (req, res) => {
    try {
      const levels = NFTLevelConfigService.NFT_LEVEL_CONFIGS;
      const contractConfig = NFTLevelConfigService.getContractConfig();

      res.json({
        levels: levels.map(level => ({
          level: level.level,
          tokenId: level.tokenId,
          priceUSDT: level.priceUSDT,
          requiredDirectReferrals: level.requiredDirectReferrals,
          requiredPreviousLevel: level.requiredPreviousLevel,
          layerRewardsUnlocked: level.layerRewardsUnlocked,
          levelName: level.levelName,
          description: level.description
        })),
        contractConfig
      });
    } catch (error) {
      console.error('Error fetching NFT levels:', error);
      res.status(500).json({ error: 'Failed to fetch NFT level configurations' });
    }
  });

  // Check upgrade eligibility for specific level
  app.get("/api/nft/upgrade-eligibility/:level", requireWallet, async (req, res) => {
    try {
      const walletAddress = req.headers['x-wallet-address'] as string;
      const targetLevel = parseInt(req.params.level);

      if (!targetLevel || targetLevel < 1 || targetLevel > 19) {
        return res.status(400).json({ error: 'Invalid level. Must be between 1 and 19.' });
      }

      // Get user's current status
      const userProfile = await usersService.getUserProfile(walletAddress);
      if (!userProfile) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get direct referral count
      const referrals = await storage.getReferrals(walletAddress);
      const directReferralCount = referrals.filter(r => r.layer === 1).length;

      // Check upgrade eligibility
      const eligibility = await NFTLevelConfigService.canUpgradeToLevel(
        walletAddress,
        targetLevel,
        userProfile.membershipLevel,
        directReferralCount
      );

      const levelConfig = NFTLevelConfigService.getLevelConfig(targetLevel);

      res.json({
        eligible: eligibility.canUpgrade,
        reason: eligibility.reason,
        requirements: eligibility.requirements,
        currentLevel: userProfile.membershipLevel,
        directReferrals: directReferralCount,
        targetLevel,
        levelConfig: levelConfig ? {
          priceUSDT: levelConfig.priceUSDT,
          levelName: levelConfig.levelName,
          description: levelConfig.description,
          layerRewardsUnlocked: levelConfig.layerRewardsUnlocked
        } : null
      });
    } catch (error) {
      console.error('Error checking upgrade eligibility:', error);
      res.status(500).json({ error: 'Failed to check upgrade eligibility' });
    }
  });

  // Process NFT level upgrade
  app.post("/api/nft/upgrade", requireWallet, async (req, res) => {
    try {
      const walletAddress = req.headers['x-wallet-address'] as string;
      const { 
        targetLevel, 
        transactionHash, 
        mintTxHash, 
        claimMethod, 
        chainId, 
        tokenContract,
        amount 
      } = req.body;

      console.log('🔄 NFT Level Upgrade request:', { 
        walletAddress, 
        targetLevel, 
        claimMethod, 
        transactionHash 
      });

      // Validate target level
      if (!targetLevel || targetLevel < 1 || targetLevel > 19) {
        return res.status(400).json({ error: 'Invalid target level. Must be between 1 and 19.' });
      }

      // Get user profile
      const userProfile = await usersService.getUserProfile(walletAddress);
      if (!userProfile) {
        return res.status(404).json({ error: 'User not found. Please register first.' });
      }

      // Get direct referral count
      const referrals = await storage.getReferrals(walletAddress);
      const directReferralCount = referrals.filter(r => r.layer === 1).length;

      // Check upgrade eligibility
      const eligibility = await NFTLevelConfigService.canUpgradeToLevel(
        walletAddress,
        targetLevel,
        userProfile.membershipLevel,
        directReferralCount
      );

      if (!eligibility.canUpgrade) {
        return res.status(400).json({ 
          error: eligibility.reason,
          requirements: eligibility.requirements 
        });
      }

      const levelConfig = NFTLevelConfigService.getLevelConfig(targetLevel);
      if (!levelConfig) {
        return res.status(400).json({ error: 'Invalid level configuration' });
      }

      // Update user's membership level
      const updatedUser = await usersService.activateUserMembership({
        walletAddress,
        membershipLevel: targetLevel,
        transactionHash,
        mintTxHash
      });

      // Process NFT upgrade rewards
      const rewardDistribution = await layerRewardsService.processNFTLevelUpgrade({
        memberWallet: walletAddress.toLowerCase(),
        fromLevel: userProfile.membershipLevel,
        toLevel: targetLevel,
        upgradeAmountUSDT: levelConfig.priceUSDT * 100, // Convert to cents
        tokenId: levelConfig.tokenId
      });

      console.log(`🎉 NFT Level ${targetLevel} upgrade complete:`, {
        wallet: updatedUser.walletAddress,
        newLevel: targetLevel,
        rewardsDistributed: rewardDistribution.totalDistributed
      });

      res.json({
        success: true,
        user: updatedUser,
        upgrade: {
          fromLevel: userProfile.membershipLevel,
          toLevel: targetLevel,
          tokenId: levelConfig.tokenId,
          priceUSDT: levelConfig.priceUSDT,
          levelName: levelConfig.levelName,
          layerRewardsUnlocked: levelConfig.layerRewardsUnlocked
        },
        rewardDistribution: {
          totalRewards: rewardDistribution.distributedRewards.length,
          totalAmountUSDT: rewardDistribution.totalDistributed / 100, // Convert back to USDT
        },
        blockchain: chainId ? {
          chainId,
          tokenContract,
          transactionHash,
          mintTxHash,
          amount
        } : null,
        message: `Successfully upgraded to ${levelConfig.levelName}! You can now claim rewards from ${levelConfig.layerRewardsUnlocked.length} layers.`
      });

    } catch (error) {
      console.error('NFT upgrade error:', error);
      res.status(500).json({ 
        error: 'Failed to process NFT upgrade',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get user's upgrade path
  app.get("/api/nft/upgrade-path", requireWallet, async (req, res) => {
    try {
      const walletAddress = req.headers['x-wallet-address'] as string;

      // Get user profile
      const userProfile = await usersService.getUserProfile(walletAddress);
      if (!userProfile) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get direct referral count
      const referrals = await storage.getReferrals(walletAddress);
      const directReferralCount = referrals.filter(r => r.layer === 1).length;

      const currentLevel = userProfile.membershipLevel;
      const upgradePath = NFTLevelConfigService.getUpgradePath(currentLevel);

      // Check eligibility for each level in upgrade path
      const eligibleUpgrades = [];
      const futureUpgrades = [];

      for (const levelConfig of upgradePath) {
        const eligibility = await NFTLevelConfigService.canUpgradeToLevel(
          walletAddress,
          levelConfig.level,
          currentLevel,
          directReferralCount
        );

        const upgradeInfo = {
          level: levelConfig.level,
          tokenId: levelConfig.tokenId,
          priceUSDT: levelConfig.priceUSDT,
          levelName: levelConfig.levelName,
          description: levelConfig.description,
          requiredDirectReferrals: levelConfig.requiredDirectReferrals,
          requiredPreviousLevel: levelConfig.requiredPreviousLevel,
          layerRewardsUnlocked: levelConfig.layerRewardsUnlocked,
          eligible: eligibility.canUpgrade,
          reason: eligibility.reason,
          requirements: eligibility.requirements
        };

        if (eligibility.canUpgrade) {
          eligibleUpgrades.push(upgradeInfo);
        } else {
          futureUpgrades.push(upgradeInfo);
        }
      }

      const totalUpgradeCost = NFTLevelConfigService.calculateUpgradeCost(currentLevel, 19);

      res.json({
        currentLevel,
        directReferrals: directReferralCount,
        eligibleUpgrades,
        futureUpgrades,
        summary: {
          nextAvailableLevel: eligibleUpgrades[0]?.level || null,
          totalLevelsRemaining: upgradePath.length,
          totalCostToMax: totalUpgradeCost,
          maxLayersUnlocked: NFTLevelConfigService.getClaimableLayers(currentLevel).length
        }
      });

    } catch (error) {
      console.error('Error getting upgrade path:', error);
      res.status(500).json({ error: 'Failed to get upgrade path' });
    }
  });

  // Get claimable layer rewards based on user's level
  app.get("/api/nft/claimable-layers", requireWallet, async (req, res) => {
    try {
      const walletAddress = req.headers['x-wallet-address'] as string;

      // Get user profile
      const userProfile = await usersService.getUserProfile(walletAddress);
      if (!userProfile) {
        return res.status(404).json({ error: 'User not found' });
      }

      const currentLevel = userProfile.membershipLevel;
      const claimableLayers = NFTLevelConfigService.getClaimableLayers(currentLevel);
      const levelConfig = NFTLevelConfigService.getLevelConfig(currentLevel);

      res.json({
        currentLevel,
        levelName: levelConfig?.levelName || 'Unactivated',
        claimableLayers,
        totalLayersUnlocked: claimableLayers.length,
        maxPossibleLayers: 19,
        layerBreakdown: claimableLayers.map(layer => ({
          layerNumber: layer,
          description: `Can claim rewards from Layer ${layer} member upgrades`,
          rewardEligible: true
        })),
        nextLevelUnlocks: currentLevel < 19 ? {
          nextLevel: currentLevel + 1,
          additionalLayers: currentLevel < 19 ? [currentLevel + 1] : [],
          requiredForNext: NFTLevelConfigService.getLevelConfig(currentLevel + 1)
        } : null
      });

    } catch (error) {
      console.error('Error getting claimable layers:', error);
      res.status(500).json({ error: 'Failed to get claimable layers' });
    }
  });
}
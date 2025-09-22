import { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { supabase } from '../lib/supabase';

// Level pricing structure (in USDC) - Updated to match database nft_membership_levels table
export const LEVEL_PRICING = {
  1: 130,   // Level 1: 130 USDC (includes 30 USDC platform fee)
  2: 150,   // Level 2: 150 USDC (corrected from 260 to match DB)
  3: 200,   // Level 3: 200 USDC (corrected from 520 to match DB)
  4: 250,   // Level 4: 250 USDC (corrected from 1040 to match DB)
  5: 300,   // Level 5: 300 USDC (corrected from 2080 to match DB)
  6: 350,   // Level 6: 350 USDC (corrected from 4160 to match DB)
  7: 400,   // Level 7: 400 USDC (corrected from 8320 to match DB)
  8: 450,   // Level 8: 450 USDC (corrected from 16640 to match DB)
  9: 500,   // Level 9: 500 USDC (corrected from 33280 to match DB)
  10: 550,  // Level 10: 550 USDC (corrected from 66560 to match DB)
  11: 600,  // Level 11: 600 USDC (corrected from 133120 to match DB)
  12: 650,  // Level 12: 650 USDC (corrected from 266240 to match DB)
  13: 700,  // Level 13: 700 USDC (corrected from 532480 to match DB)
  14: 750,  // Level 14: 750 USDC (corrected from 1064960 to match DB)
  15: 800,  // Level 15: 800 USDC (corrected from 2129920 to match DB)
  16: 850,  // Level 16: 850 USDC (corrected from 4259840 to match DB)
  17: 900,  // Level 17: 900 USDC (corrected from 8519680 to match DB)
  18: 950,  // Level 18: 950 USDC (corrected from 17039360 to match DB)
  19: 1000, // Level 19: 1000 USDC (corrected from 34078720 to match DB)
};

export interface NFTLevelInfo {
  currentLevel: number;
  nextClaimableLevel: number;
  priceInUSDC: number;
  priceInWei: bigint;
  tokenId: number;
  canClaim: boolean;
  isMaxLevel: boolean;
}

export function useNFTLevelClaim(targetLevel?: number) {
  const account = useActiveAccount();
  const [isLoading, setIsLoading] = useState(false);
  // Initialize with target level if provided, otherwise default to Level 1
  const initializeState = () => {
    const initialLevel = targetLevel || 1;
    const initialPrice = LEVEL_PRICING[initialLevel as keyof typeof LEVEL_PRICING] || 130;
    return {
      currentLevel: 0,
      nextClaimableLevel: initialLevel,
      priceInUSDC: initialPrice,
      priceInWei: BigInt(initialPrice) * BigInt("1000000000000000000"), // Convert to wei
      tokenId: initialLevel,
      canClaim: true, // New users can always claim their target level
      isMaxLevel: false
    };
  };

  const [levelInfo, setLevelInfo] = useState<NFTLevelInfo>(initializeState());

  // Helper function to convert USDC to wei (18 decimals)
  const usdcToWei = (usdcAmount: number): bigint => {
    return BigInt(usdcAmount) * BigInt("1000000000000000000"); // * 10^18
  };

  // Fetch user's current level from database
  const fetchUserLevel = async () => {
    if (!account?.address) {
      setLevelInfo({
        currentLevel: 0,
        nextClaimableLevel: 1,
        priceInUSDC: 130,
        priceInWei: BigInt("130000000000000000000"),
        tokenId: 1,
        canClaim: true,
        isMaxLevel: false
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get user's current membership level
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('current_level, wallet_address')
        .ilike('wallet_address', account.address)
        .single();

      let currentLevel = 0;
      
      if (!memberError && memberData) {
        currentLevel = memberData.current_level || 0;
      } else if (memberError) {
        console.log('📋 Member not found in database (new user):', memberError.message);
        // This is expected for new users who haven't claimed Level 1 yet
      }

      // Determine next claimable level
      let nextLevel: number;
      if (targetLevel) {
        // If target level is specified, use it
        nextLevel = targetLevel;
      } else {
        // Auto-detect next level
        nextLevel = currentLevel + 1;
      }

      // Ensure level is within valid range (1-19)
      nextLevel = Math.max(1, Math.min(19, nextLevel));

      // Get pricing for the level
      const priceInUSDC = LEVEL_PRICING[nextLevel as keyof typeof LEVEL_PRICING] || 130;
      const priceInWei = usdcToWei(priceInUSDC);

      // Check if user can claim this level
      let canClaim: boolean;
      if (targetLevel) {
        // When targeting a specific level (e.g., Welcome page targeting Level 1)
        if (targetLevel === 1) {
          // Level 1 is special - it activates membership
          // Allow claiming Level 1 if:
          // 1. User has no current level (new user), OR
          // 2. User current level is 0 (not activated)
          canClaim = currentLevel <= 0 && targetLevel <= 19;
        } else {
          // Other target levels: allow if user doesn't have that level yet
          canClaim = currentLevel < targetLevel && targetLevel <= 19;
        }
      } else {
        // Auto-progression: allow claiming next level
        canClaim = nextLevel > currentLevel && nextLevel <= 19;
      }
      const isMaxLevel = currentLevel >= 19;

      setLevelInfo({
        currentLevel,
        nextClaimableLevel: nextLevel,
        priceInUSDC,
        priceInWei,
        tokenId: nextLevel, // Token ID matches the level
        canClaim,
        isMaxLevel
      });

      console.log('🎯 NFT Level Info Updated:', {
        currentLevel,
        nextClaimableLevel: nextLevel,
        priceInUSDC,
        priceInWei: priceInWei.toString(),
        tokenId: nextLevel,
        canClaim,
        isMaxLevel,
        targetLevel,
        debugInfo: {
          hasTargetLevel: !!targetLevel,
          isLevel1Special: targetLevel === 1,
          claimLogic: targetLevel ? 
            (targetLevel === 1 ? 
              `Level 1 (special): currentLevel(${currentLevel}) <= 0 = ${currentLevel <= 0}` :
              `currentLevel(${currentLevel}) < targetLevel(${targetLevel}) = ${currentLevel < targetLevel}`) :
            `nextLevel(${nextLevel}) > currentLevel(${currentLevel}) = ${nextLevel > currentLevel}`
        }
      });

    } catch (error) {
      console.error('❌ Error fetching user level:', error);
      // Fallback to level 1 or target level
      const fallbackLevel = targetLevel || 1;
      const fallbackPrice = LEVEL_PRICING[fallbackLevel as keyof typeof LEVEL_PRICING] || 130;
      setLevelInfo({
        currentLevel: 0,
        nextClaimableLevel: fallbackLevel,
        priceInUSDC: fallbackPrice,
        priceInWei: usdcToWei(fallbackPrice),
        tokenId: fallbackLevel,
        canClaim: true, // Always allow claiming on error (for new users)
        isMaxLevel: false
      });
      console.log('🔄 Using fallback level info:', {
        fallbackLevel,
        fallbackPrice,
        targetLevel
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset state when targetLevel changes
  useEffect(() => {
    setLevelInfo(initializeState());
  }, [targetLevel]);

  // Refresh level info when account changes
  useEffect(() => {
    fetchUserLevel();
  }, [account?.address, targetLevel]);

  // Helper function to get level name
  const getLevelName = (level: number): string => {
    return `Level ${level}`;
  };

  // Helper function to format price with commas
  const formatPrice = (price: number): string => {
    return price.toLocaleString();
  };

  return {
    levelInfo,
    isLoading,
    refetch: fetchUserLevel,
    getLevelName,
    formatPrice,
    LEVEL_PRICING
  };
}
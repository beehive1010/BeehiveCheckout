import { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { supabase } from '../lib/supabase';

// Level pricing structure (in USDC)
export const LEVEL_PRICING = {
  1: 130,   // Level 1: 130 USDC
  2: 260,   // Level 2: 260 USDC
  3: 520,   // Level 3: 520 USDC
  4: 1040,  // Level 4: 1040 USDC
  5: 2080,  // Level 5: 2080 USDC
  6: 4160,  // Level 6: 4160 USDC
  7: 8320,  // Level 7: 8320 USDC
  8: 16640, // Level 8: 16640 USDC
  9: 33280, // Level 9: 33280 USDC
  10: 66560, // Level 10: 66560 USDC
  11: 133120, // Level 11: 133120 USDC
  12: 266240, // Level 12: 266240 USDC
  13: 532480, // Level 13: 532480 USDC
  14: 1064960, // Level 14: 1064960 USDC
  15: 2129920, // Level 15: 2129920 USDC
  16: 4259840, // Level 16: 4259840 USDC
  17: 8519680, // Level 17: 8519680 USDC
  18: 17039360, // Level 18: 17039360 USDC
  19: 34078720, // Level 19: 34078720 USDC
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
        .eq('wallet_address', account.address)
        .single();

      let currentLevel = 0;
      
      if (!memberError && memberData) {
        currentLevel = memberData.current_level || 0;
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
          // Only allow claiming if user doesn't have Level 1 yet
          canClaim = currentLevel < 1 && targetLevel <= 19;
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
              `Level 1 (special): currentLevel(${currentLevel}) < 1 = ${currentLevel < 1}` :
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
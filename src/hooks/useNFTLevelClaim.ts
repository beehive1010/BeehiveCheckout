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
  const [levelInfo, setLevelInfo] = useState<NFTLevelInfo>({
    currentLevel: 0,
    nextClaimableLevel: 1,
    priceInUSDC: 130,
    priceInWei: BigInt("130000000000000000000"), // 130 * 10^18
    tokenId: 1,
    canClaim: true,
    isMaxLevel: false
  });

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
      const canClaim = nextLevel > currentLevel && nextLevel <= 19;
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
        isMaxLevel
      });

    } catch (error) {
      console.error('❌ Error fetching user level:', error);
      // Fallback to level 1
      setLevelInfo({
        currentLevel: 0,
        nextClaimableLevel: 1,
        priceInUSDC: 130,
        priceInWei: BigInt("130000000000000000000"),
        tokenId: 1,
        canClaim: true,
        isMaxLevel: false
      });
    } finally {
      setIsLoading(false);
    }
  };

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
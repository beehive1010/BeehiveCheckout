import { useQuery } from '@tanstack/react-query';
import { useWallet } from './useWallet';

// V2 会员相关的类型定义
interface MembershipNFT {
  id: string;
  walletAddress: string;
  level: number;
  levelName: string;
  pricePaidUSDT: number;
  nftTokenId: number | null;
  contractAddress: string | null;
  txHash: string | null;
  purchasedAt: string;
  activatedAt: string | null;
  status: 'active' | 'pending' | 'expired';
}

interface MembershipStats {
  walletAddress: string;
  username: string | null;
  memberActivated: boolean;
  currentHighestLevel: number;
  ownedLevels: number[];
  totalNFTsOwned: number;
  totalSpentUSDT: number;
  memberSince: string | null;
  lastPurchaseAt: string | null;
}

interface LevelPricing {
  level: number;
  levelName: string;
  priceUSDT: number;
  rewardAmountUSDT: number;
  platformFeeUSDT: number;
  description: string;
  isAvailable: boolean;
  requiresPreviousLevel: boolean;
}

// 获取用户的NFT会员资格
export function useUserMembershipNFTs() {
  const { walletAddress } = useWallet();

  return useQuery<MembershipNFT[]>({
    queryKey: ['/api/v2/membership/nfts', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await fetch(`/api/v2/membership/nfts/${walletAddress}`, {
        headers: {
          'X-Wallet-Address': walletAddress,
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch membership NFTs: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!walletAddress,
    staleTime: 30000, // 30秒缓存
    refetchInterval: 60000, // 1分钟刷新
  });
}

// 获取用户的会员统计信息
export function useMembershipStats() {
  const { walletAddress } = useWallet();

  return useQuery<MembershipStats>({
    queryKey: ['/api/v2/membership/stats', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await fetch(`/api/v2/membership/stats/${walletAddress}`, {
        headers: {
          'X-Wallet-Address': walletAddress,
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch membership stats: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!walletAddress,
    staleTime: 30000, // 30秒缓存
    refetchInterval: 60000, // 1分钟刷新
  });
}

// 获取所有级别的定价信息
export function useLevelPricing() {
  return useQuery<LevelPricing[]>({
    queryKey: ['/api/v2/membership/pricing'],
    queryFn: async () => {
      const response = await fetch('/api/v2/membership/pricing', {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch level pricing: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 300000, // 5分钟缓存（定价变化不频繁）
    refetchInterval: 600000, // 10分钟刷新
  });
}

// 获取用户可以购买的下一个级别
export function useNextAvailableLevel() {
  const { walletAddress } = useWallet();
  const { data: membershipNFTs } = useUserMembershipNFTs();
  const { data: levelPricing } = useLevelPricing();

  return useQuery<LevelPricing | null>({
    queryKey: ['/api/v2/membership/next-level', walletAddress, membershipNFTs, levelPricing],
    queryFn: async () => {
      if (!membershipNFTs || !levelPricing) return null;
      
      // 找到用户拥有的最高级别
      const ownedLevels = membershipNFTs
        .filter(nft => nft.status === 'active')
        .map(nft => nft.level)
        .sort((a, b) => b - a);
      
      const highestLevel = ownedLevels[0] || 0;
      const nextLevel = highestLevel + 1;
      
      // 找到下一个可购买的级别
      const nextLevelPricing = levelPricing.find(level => level.level === nextLevel);
      
      return nextLevelPricing || null;
    },
    enabled: !!membershipNFTs && !!levelPricing,
    staleTime: 10000, // 10秒缓存
  });
}

// 购买NFT级别的mutation hook
export function usePurchaseLevel() {
  const { walletAddress } = useWallet();

  return async (level: number, paymentData: { txHash: string; chainId: number }) => {
    if (!walletAddress) throw new Error('No wallet address');
    
    const response = await fetch(`/api/v2/membership/purchase`, {
      method: 'POST',
      headers: {
        'X-Wallet-Address': walletAddress,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        level,
        ...paymentData,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to purchase level');
    }
    
    return response.json();
  };
}
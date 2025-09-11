import React, { useState, useEffect } from 'react';
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import { getContract, prepareContractCall, sendTransaction, waitForReceipt } from 'thirdweb';
import { arbitrumSepolia } from 'thirdweb/chains';
import { createThirdwebClient } from 'thirdweb';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { useToast } from '../../hooks/use-toast';
import { useI18n } from '../../contexts/I18nContext';
import { useQuery } from '@tanstack/react-query';
import { balanceService, matrixService } from '../../lib/supabaseClient';
import { 
  Crown, 
  Loader2, 
  CheckCircle, 
  Lock, 
  Users, 
  Star,
  Zap,
  Trophy,
  Gift,
  Coins,
  ArrowRight,
  Plus
} from 'lucide-react';

interface NFTLevel {
  level: number;
  tokenId: number;
  name: string;
  description: string;
  priceUSDT: number;
  requiredDirectReferrals: number;
  requiredLevel: number | null;
  rewards: string[];
  isOwned?: boolean;
  isEligible?: boolean;
  missingRequirements?: string[];
}

interface NFTLevelSystemProps {
  className?: string;
  onPurchaseSuccess?: () => void;
}

// NFT级别配置 - 19个级别
const NFT_LEVELS: NFTLevel[] = [
  {
    level: 1,
    tokenId: 1,
    name: 'Bronze Bee',
    description: 'Entry level membership with basic rewards',
    priceUSDT: 130,
    requiredDirectReferrals: 0,
    requiredLevel: null,
    rewards: ['Basic Matrix Access', 'Layer 1-5 Rewards']
  },
  {
    level: 2,
    tokenId: 2,
    name: 'Silver Bee',
    description: 'Advanced membership with enhanced rewards',
    priceUSDT: 260,
    requiredDirectReferrals: 3,
    requiredLevel: 1,
    rewards: ['Enhanced Matrix Access', 'Layer 1-8 Rewards', 'Bonus Multiplier x1.2']
  },
  {
    level: 3,
    tokenId: 3,
    name: 'Gold Bee',
    description: 'Premium membership with exclusive benefits',
    priceUSDT: 520,
    requiredDirectReferrals: 5,
    requiredLevel: 2,
    rewards: ['Premium Matrix Access', 'Layer 1-12 Rewards', 'Bonus Multiplier x1.5']
  },
  {
    level: 4,
    tokenId: 4,
    name: 'Platinum Bee',
    description: 'Elite membership with top-tier rewards',
    priceUSDT: 1040,
    requiredDirectReferrals: 8,
    requiredLevel: 3,
    rewards: ['Elite Matrix Access', 'Layer 1-15 Rewards', 'Bonus Multiplier x2.0']
  },
  {
    level: 5,
    tokenId: 5,
    name: 'Diamond Bee',
    description: 'Legendary membership with maximum benefits',
    priceUSDT: 2080,
    requiredDirectReferrals: 12,
    requiredLevel: 4,
    rewards: ['Legendary Matrix Access', 'All Layer Rewards', 'Bonus Multiplier x3.0']
  },
  // Levels 6-19 with progressive pricing and requirements
  ...Array.from({ length: 14 }, (_, i) => {
    const level = i + 6;
    return {
      level,
      tokenId: level,
      name: `Master Bee ${level - 5}`,
      description: `Master tier ${level - 5} with exponential rewards`,
      priceUSDT: Math.pow(2, level - 1) * 130, // Exponential pricing
      requiredDirectReferrals: Math.min(50, level * 2), // Progressive requirements up to 50
      requiredLevel: level - 1,
      rewards: [
        'Master Matrix Access',
        'All Layer Rewards',
        `Bonus Multiplier x${Math.min(10, level)}`,
        level >= 10 ? 'VIP Governance Rights' : '',
        level >= 15 ? 'Ultimate Rewards Pool' : ''
      ].filter(Boolean)
    };
  })
];

export default function NFTLevelSystem({ className = '', onPurchaseSuccess }: NFTLevelSystemProps) {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const { toast } = useToast();
  const { t } = useI18n();
  const [processingLevel, setProcessingLevel] = useState<number | null>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const API_BASE = 'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';
  const PAYMENT_TOKEN_CONTRACT = "0x4470734620414168Aa1673A30849DB25E5886E2A";
  const NFT_CONTRACT = "0x2Cb47141485754371c24Efcc65d46Ccf004f769a";
  const THIRDWEB_CLIENT_ID = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

  // Initialize Thirdweb client
  const client = createThirdwebClient({
    clientId: THIRDWEB_CLIENT_ID
  });

  // Fetch user's current level and direct referrals
  const { data: userStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/user-status', account?.address],
    enabled: !!account?.address,
    queryFn: async () => {
      try {
        // Get balance data for current level
        const balance = await balanceService.getUserBalance(account!.address);
        // Get matrix data for direct referrals
        const directReferralsCount = await matrixService.countDirectReferrals(account!.address);
        
        return {
          currentLevel: balance?.data?.current_tier || 1,
          directReferrals: directReferralsCount || 0,
          balance: balance?.data
        };
      } catch (error) {
        console.error('Failed to fetch user status:', error);
        return {
          currentLevel: 1,
          directReferrals: 0,
          balance: null
        };
      }
    }
  });

  // Process NFT levels with eligibility and ownership
  const processedLevels = NFT_LEVELS.map(level => {
    const currentLevel = userStatus?.currentLevel || 1;
    const directReferrals = userStatus?.directReferrals || 0;
    
    // Check if user owns this level
    const isOwned = level.level <= currentLevel;
    
    // Check eligibility for next level
    let isEligible = false;
    let missingRequirements: string[] = [];
    
    if (!isOwned) {
      // Check required previous level
      if (level.requiredLevel && level.requiredLevel > currentLevel) {
        missingRequirements.push(`需要达到Level ${level.requiredLevel}`);
      }
      
      // Check required direct referrals
      if (level.requiredDirectReferrals > directReferrals) {
        missingRequirements.push(
          `需要${level.requiredDirectReferrals}个直推人数 (当前: ${directReferrals})`
        );
      }
      
      // For Level 2 specifically, ensure Level 1 + direct referrals > 3
      if (level.level === 2) {
        if (currentLevel < 1) {
          missingRequirements.push('需要先达到Level 1');
        }
        if (directReferrals <= 3) {
          missingRequirements.push(`需要超过3个直推人数 (当前: ${directReferrals})`);
        }
      }
      
      isEligible = missingRequirements.length === 0;
    }
    
    return {
      ...level,
      isOwned,
      isEligible,
      missingRequirements
    };
  });

  const handlePurchaseNFT = async (level: NFTLevel) => {
    if (!account?.address) {
      toast({
        title: "钱包未连接",
        description: "请连接钱包以购买NFT",
        variant: "destructive",
      });
      return;
    }

    if (!level.isEligible) {
      toast({
        title: "不满足条件",
        description: level.missingRequirements?.join(', ') || "您还不满足购买条件",
        variant: "destructive",
      });
      return;
    }

    setProcessingLevel(level.level);

    try {
      // Check network
      if (activeChain?.id !== arbitrumSepolia.id) {
        throw new Error('请切换到Arbitrum Sepolia网络');
      }

      // Prepare payment amount (convert USDT to wei with 18 decimals)
      const PAYMENT_AMOUNT = BigInt(level.priceUSDT) * BigInt(10 ** 18);
      
      const usdcContract = getContract({
        client,
        address: PAYMENT_TOKEN_CONTRACT,
        chain: arbitrumSepolia
      });

      // Approve tokens
      const approveTransaction = prepareContractCall({
        contract: usdcContract,
        method: "function approve(address spender, uint256 amount) returns (bool)",
        params: [NFT_CONTRACT, PAYMENT_AMOUNT]
      });

      const approveTxResult = await sendTransaction({
        transaction: approveTransaction,
        account
      });

      await waitForReceipt({
        client,
        chain: arbitrumSepolia,
        transactionHash: approveTxResult.transactionHash,
      });

      // Claim NFT with specific token ID
      const nftContract = getContract({
        client,
        address: NFT_CONTRACT,
        chain: arbitrumSepolia
      });

      const allowlistProof = {
        proof: [],
        quantityLimitPerWallet: BigInt(1),
        pricePerToken: PAYMENT_AMOUNT,
        currency: PAYMENT_TOKEN_CONTRACT
      };

      const claimTransaction = prepareContractCall({
        contract: nftContract,
        method: "function claim(address _receiver, uint256 _tokenId, uint256 _quantity, address _currency, uint256 _pricePerToken, (bytes32[] proof, uint256 quantityLimitPerWallet, uint256 pricePerToken, address currency) _allowlistProof, bytes _data) payable",
        params: [
          account.address,
          BigInt(level.tokenId), // Use specific token ID for this level
          BigInt(1),
          PAYMENT_TOKEN_CONTRACT,
          PAYMENT_AMOUNT,
          allowlistProof,
          "0x"
        ]
      });

      const claimTxResult = await sendTransaction({
        transaction: claimTransaction,
        account
      });

      await waitForReceipt({
        client,
        chain: arbitrumSepolia,
        transactionHash: claimTxResult.transactionHash,
      });

      // Process upgrade on backend
      const upgradeResponse = await fetch(`${API_BASE}/nft-upgrades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': account.address
        },
        body: JSON.stringify({
          action: 'process-upgrade',
          level: level.level,
          transactionHash: claimTxResult.transactionHash,
          paymentMethod: 'token_payment',
          payment_amount_usdc: level.priceUSDT
        })
      });

      if (upgradeResponse.ok) {
        toast({
          title: "🎉 NFT购买成功!",
          description: `恭喜您获得 ${level.name} NFT!`,
          variant: "default",
        });

        if (onPurchaseSuccess) {
          onPurchaseSuccess();
        }
      } else {
        throw new Error('Backend processing failed');
      }

    } catch (error) {
      console.error('NFT purchase failed:', error);
      toast({
        title: "购买失败",
        description: error instanceof Error ? error.message : "购买过程中出现错误",
        variant: "destructive",
      });
    } finally {
      setProcessingLevel(null);
    }
  };

  const getLevelColor = (level: NFTLevel) => {
    if (level.isOwned) return 'from-green-500/20 to-green-600/20 border-green-500/30';
    if (level.isEligible) return 'from-honey/20 to-honey/30 border-honey/40';
    return 'from-gray-500/10 to-gray-600/10 border-gray-500/20';
  };

  const getLevelIcon = (level: NFTLevel) => {
    if (level.isOwned) return <CheckCircle className="w-6 h-6 text-green-500" />;
    if (level.isEligible) return <Crown className="w-6 h-6 text-honey" />;
    return <Lock className="w-6 h-6 text-gray-400" />;
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-honey" />
        <span className="ml-2 text-muted-foreground">加载NFT级别...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-honey mb-2">NFT会员级别系统</h2>
        <p className="text-muted-foreground">解锁19个级别，获得递增奖励和特权</p>
        
        {userStatus && (
          <div className="flex items-center justify-center gap-6 mt-6 p-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-honey">{userStatus.currentLevel}</div>
              <div className="text-sm text-muted-foreground">当前级别</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{userStatus.directReferrals}</div>
              <div className="text-sm text-muted-foreground">直推人数</div>
            </div>
          </div>
        )}
      </div>

      {/* NFT Levels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {processedLevels.map((level) => (
          <Card
            key={level.level}
            className={`
              relative overflow-hidden transition-all duration-300 transform
              ${hoveredCard === level.level ? 'scale-105 shadow-lg' : 'scale-100'}
              bg-gradient-to-br ${getLevelColor(level)}
              ${level.isEligible && !level.isOwned ? 'cursor-pointer hover:shadow-xl' : ''}
            `}
            onMouseEnter={() => setHoveredCard(level.level)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            {/* Animated background effect */}
            {level.isEligible && !level.isOwned && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-honey/5 to-transparent animate-pulse" />
            )}
            
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  Level {level.level}
                </Badge>
                {getLevelIcon(level)}
              </div>
              
              <CardTitle className="text-lg">{level.name}</CardTitle>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {level.description}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Price */}
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <div className="text-2xl font-bold text-honey">{level.priceUSDT} USDT</div>
                <div className="text-xs text-muted-foreground">Token ID: {level.tokenId}</div>
              </div>

              {/* Requirements */}
              <div className="space-y-2">
                <div className="text-sm font-medium">解锁条件:</div>
                {level.requiredLevel && (
                  <div className="flex items-center gap-2 text-xs">
                    <Trophy className="w-3 h-3" />
                    <span>需要Level {level.requiredLevel}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs">
                  <Users className="w-3 h-3" />
                  <span>{level.requiredDirectReferrals}个直推人数</span>
                </div>
              </div>

              {/* Rewards Preview */}
              <div className="space-y-2">
                <div className="text-sm font-medium">奖励预览:</div>
                <div className="space-y-1">
                  {level.rewards.slice(0, 2).map((reward, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Star className="w-3 h-3" />
                      <span>{reward}</span>
                    </div>
                  ))}
                  {level.rewards.length > 2 && (
                    <div className="text-xs text-honey">+{level.rewards.length - 2} more...</div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                {level.isOwned ? (
                  <Button disabled className="w-full bg-green-500/20 text-green-500">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    已拥有
                  </Button>
                ) : level.isEligible ? (
                  <Button
                    onClick={() => handlePurchaseNFT(level)}
                    disabled={processingLevel === level.level}
                    className="w-full bg-honey hover:bg-honey/90 text-black"
                  >
                    {processingLevel === level.level ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        购买中...
                      </>
                    ) : (
                      <>
                        <Coins className="w-4 h-4 mr-2" />
                        立即购买
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button disabled className="w-full">
                      <Lock className="w-4 h-4 mr-2" />
                      暂未解锁
                    </Button>
                    {level.missingRequirements && level.missingRequirements.length > 0 && (
                      <div className="text-xs text-red-400">
                        {level.missingRequirements[0]}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress Overview */}
      <Card className="bg-gradient-to-r from-honey/5 to-honey/10 border-honey/20">
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-honey mb-2">会员进度</h3>
            <p className="text-sm text-muted-foreground">
              您已解锁 {processedLevels.filter(l => l.isOwned).length}/19 个级别
            </p>
          </div>
          
          <Progress 
            value={(processedLevels.filter(l => l.isOwned).length / 19) * 100} 
            className="h-3 mb-4"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-honey">
                {processedLevels.filter(l => l.isOwned).length}
              </div>
              <div className="text-sm text-muted-foreground">已拥有</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">
                {processedLevels.filter(l => l.isEligible && !l.isOwned).length}
              </div>
              <div className="text-sm text-muted-foreground">可购买</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-400">
                {processedLevels.filter(l => !l.isEligible && !l.isOwned).length}
              </div>
              <div className="text-sm text-muted-foreground">未解锁</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
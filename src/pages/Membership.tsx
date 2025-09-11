import { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useWallet } from '../hooks/useWallet';
import { useQuery } from '@tanstack/react-query';
import { matrixService } from '../lib/supabaseClient';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { Crown, Shield, Star, Zap, Gift, Lock, CheckCircle, Loader2, ArrowRight, Users, Award } from 'lucide-react';
import MembershipBadge from '../components/membership/MembershipBadge';
import { getMembershipLevel } from '../lib/config/membershipLevels';

interface MembershipLevel {
  level: number;
  price: number;
  platformFee?: number;
  benefits: string[];
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  isSpecial?: boolean;
}

export default function Membership() {
  const { t } = useI18n();
  const { walletAddress, bccBalance, currentLevel } = useWallet();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch user's direct referrals count for Level 2 condition (from referrals table)
  const { data: directReferralsCount } = useQuery({
    queryKey: ['/direct-referrals', walletAddress],
    enabled: !!walletAddress,
    queryFn: async () => {
      try {
        const { getDirectReferralCount } = await import('../lib/services/directReferralService');
        return await getDirectReferralCount(walletAddress!);
      } catch (error) {
        console.error('Failed to fetch direct referrals:', error);
        return 0;
      }
    }
  });
  const [claimState, setClaimState] = useState<{
    level: number | null;
    loading: boolean;
    error: string | null;
  }>({
    level: null,
    loading: false,
    error: null
  });

  // Define all 19 membership levels with progressive pricing and benefits
  const membershipLevels: MembershipLevel[] = [
    // Level 1: Bronze Bee
    {
      level: 1,
      price: 130,
      platformFee: 0,
      benefits: [
        'Access to basic platform features',
        'Entry to 3×3 matrix system',
        'Basic learning materials',
        'Community access',
        'Token ID: 1'
      ],
      icon: Shield,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950',
      borderColor: 'border-emerald-200 dark:border-emerald-800'
    },
    // Level 2: Silver Bee (特殊条件：Level 1 + 直推人数>3人)
    {
      level: 2,
      price: 150,
      platformFee: 0,
      benefits: [
        'Enhanced matrix rewards',
        'Premium learning content',
        'Direct referral bonuses',
        'Advanced features access',
        'Token ID: 2',
        '需要: Level 1 + 直推人数>3人'
      ],
      icon: Star,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    // Levels 3-19: Linear incremental pricing
    ...Array.from({ length: 17 }, (_, i) => {
      const level = i + 3;
      // Linear pricing: Level 3=$200, then +$50 for each subsequent level
      const price = level === 3 ? 200 : 200 + (50 * (level - 3));
      
      // Icon progression
      const getIcon = () => {
        if (level <= 5) return Crown;
        if (level <= 10) return Zap;
        if (level <= 15) return Gift;
        return Crown;
      };
      
      // Color progression
      const getColors = () => {
        if (level <= 5) return {
          color: 'text-purple-600',
          bgColor: 'bg-purple-50 dark:bg-purple-950',
          borderColor: 'border-purple-200 dark:border-purple-800'
        };
        if (level <= 10) return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-50 dark:bg-orange-950',
          borderColor: 'border-orange-200 dark:border-orange-800'
        };
        if (level <= 15) return {
          color: 'text-honey',
          bgColor: 'bg-honey/10 dark:bg-honey/20',
          borderColor: 'border-honey/30'
        };
        return {
          color: 'text-golden-600',
          bgColor: 'bg-yellow-50 dark:bg-yellow-950',
          borderColor: 'border-yellow-200 dark:border-yellow-800'
        };
      };
      
      const colors = getColors();
      
      return {
        level,
        price,
        platformFee: 0,
        benefits: [
          level <= 5 ? `Gold Bee Tier ${level - 2}` : 
          level <= 10 ? `Platinum Bee Tier ${level - 5}` :
          level <= 15 ? `Diamond Bee Tier ${level - 10}` :
          `Master Bee Tier ${level - 15}`,
          `Enhanced matrix rewards (Layer 1-${Math.min(19, level * 2)})`,
          `Bonus multiplier x${Math.min(10, level * 0.5)}`,
          level >= 5 ? 'VIP status benefits' : 'Premium benefits',
          level >= 10 ? 'Exclusive merchant NFTs' : 'Enhanced features',
          level >= 15 ? 'Platform governance rights' : 'Priority support',
          level >= 18 ? 'Founder status recognition' : 'Elite member status',
          `Token ID: ${level}`
        ].filter(Boolean),
        icon: getIcon(),
        ...colors,
        isSpecial: level >= 5 && (level % 5 === 0 || level >= 15)
      };
    })
  ];

  // Real NFT claim function using Supabase API
  const handleClaimLevel = async (level: number) => {
    if (!walletAddress) {
      toast({
        title: t('membership.errors.walletRequired'),
        description: t('membership.errors.connectWallet'),
        variant: "destructive"
      });
      return;
    }

    // Check if user can claim this level (must have previous level)
    if (level > 1 && (!currentLevel || level > currentLevel + 1)) {
      toast({
        title: t('membership.errors.levelLocked'),
        description: t('membership.errors.previousLevelRequired', { level: level - 1, nextLevel: level }),
        variant: "destructive"
      });
      return;
    }

    // Special condition for Level 2: Must have Level 1 AND more than 3 direct referrals (from referrals table)
    if (level === 2) {
      if (!currentLevel || currentLevel < 1) {
        toast({
          title: t('membership.level2Requirements.title'),
          description: t('membership.level2Requirements.needLevel1'),
          variant: "destructive"
        });
        return;
      }
      
      // Use detailed direct referral check
      try {
        const { checkLevel2DirectReferralRequirement } = await import('../lib/services/directReferralService');
        const referralCheck = await checkLevel2DirectReferralRequirement(walletAddress);
        
        if (!referralCheck.qualified) {
          toast({
            title: t('membership.level2Requirements.title'),
            description: `${referralCheck.detailedStatus}\n\n${referralCheck.message}\n\n💡 提示：只计算通过您的推荐链接直接注册的用户，不包括矩阵安置的溢出用户\n\n📋 如何达标：分享您的推荐链接让更多朋友注册`,
            variant: "destructive",
            duration: 12000 // 延长显示时间以便用户阅读完整信息
          });
          return;
        }
        
        // 显示成功的直推检查信息
        console.log(`✅ Level 2 direct referral check passed: ${referralCheck.message}`);
        
      } catch (error) {
        console.error('❌ Error checking Level 2 referral requirements:', error);
        toast({
          title: '检查直推要求时出错',
          description: '无法验证您的直推用户数量，请稍后重试',
          variant: "destructive"
        });
        return;
      }
    }

    const membershipConfig = membershipLevels.find(m => m.level === level);
    if (!membershipConfig) return;

    const totalPrice = membershipConfig.price + (membershipConfig.platformFee || 0);

    setClaimState({ level, loading: true, error: null });

    try {
      // Import NFT service
      const { nftService } = await import('../lib/supabaseClient');

      toast({
        title: t('membership.claiming.started', { level }),
        description: t('membership.claiming.processing', { price: totalPrice }),
      });

      // Generate a transaction hash for this claim (in real app, this would come from blockchain)
      const transactionHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;

      // Call real Supabase API using working service
      const result = await nftService.processNFTUpgrade(walletAddress, {
        level,
        transactionHash,
        payment_amount_usdc: totalPrice,
        paymentMethod: 'token_payment',
        network: 'arbitrum-sepolia'
      });

      if (result.success) {
        toast({
          title: t('membership.claiming.success', { level }),
          description: t('membership.claiming.successDescription', { level, price: totalPrice }),
          duration: 6000
        });

        console.log(`✅ Level ${level} claim successful:`, result);
        
        // 触发层级奖励分发
        try {
          const { distributeLayerRewards } = await import('../lib/services/layerRewardService');
          const rewardResult = await distributeLayerRewards(
            walletAddress, 
            level, 
            membershipConfig.price, // NFT价格作为奖励
            transactionHash
          );
          
          if (rewardResult.success) {
            console.log(`🎁 Layer rewards distributed: ${rewardResult.distributions.length} entries created`);
            
            // 显示奖励分发结果
            const claimableCount = rewardResult.distributions.filter(d => d.status === 'claimable').length;
            const pendingCount = rewardResult.distributions.filter(d => d.status === 'pending').length;
            
            if (claimableCount > 0 || pendingCount > 0) {
              toast({
                title: '🎁 层级奖励已分发',
                description: `创建了 ${claimableCount} 个可领取奖励和 ${pendingCount} 个待处理奖励`,
                duration: 8000
              });
            }
          } else {
            console.error('❌ Layer reward distribution failed:', rewardResult.error);
            toast({
              title: '⚠️ 奖励分发警告',
              description: '会员升级成功，但奖励分发遇到问题',
              variant: 'destructive',
              duration: 6000
            });
          }
        } catch (rewardError) {
          console.error('❌ Layer reward distribution error:', rewardError);
          // 不影响主要流程，只显示警告
          toast({
            title: '⚠️ 奖励分发警告', 
            description: '会员升级成功，但奖励分发遇到问题',
            variant: 'destructive',
            duration: 6000
          });
        }
        
        // Refresh the page data using React Query instead of full reload
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        throw new Error(result.error || 'Claim processing failed');
      }

    } catch (error: any) {
      console.error('Claim error:', error);
      setClaimState({ level: null, loading: false, error: error.message });
      
      // Parse error message for better user feedback
      let errorMessage = error.message || t('membership.errors.claimFailed', { level });
      
      if (errorMessage.includes('Sequential Upgrade Required')) {
        errorMessage = t('membership.errors.sequentialUpgrade', { nextLevel: (currentLevel || 0) + 1 });
      } else if (errorMessage.includes('already own')) {
        errorMessage = t('membership.errors.alreadyOwned', { level });
      } else if (errorMessage.includes('Level 2 requires')) {
        errorMessage = t('membership.errors.level2Requirements');
      } else if (errorMessage.includes('Missing Prerequisites')) {
        errorMessage = t('membership.errors.missingPrerequisites');
      }
      
      toast({
        title: t('membership.errors.claimFailed'),
        description: errorMessage,
        variant: "destructive",
        duration: 8000
      });
    } finally {
      setClaimState({ level: null, loading: false, error: null });
    }
  };

  const getLevelStatus = (level: number) => {
    if (!currentLevel) return 'locked';
    if (level <= currentLevel) return 'owned';
    
    // Special logic for Level 2: requires Level 1 + direct referrals > 3 (from referrals table)
    if (level === 2) {
      if (currentLevel >= 1 && (directReferralsCount || 0) > 3) {
        return 'available';
      }
      return 'locked';
    }
    
    if (level === currentLevel + 1) return 'available';
    return 'locked';
  };

  const canClaimLevel = (level: number) => {
    const status = getLevelStatus(level);
    return status === 'available' && claimState.level !== level;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Hero Section */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Crown className="h-10 w-10 text-honey" />
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-honey via-honey/90 to-honey/70 bg-clip-text text-transparent">
            {t('membership.title')}
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
          {t('membership.subtitle')}
        </p>
        
        {/* Current Level Display - Premium Design */}
        <div className="relative max-w-lg mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-honey/20 via-orange-500/20 to-honey/20 rounded-3xl blur-xl"></div>
          <div className="relative flex items-center justify-center gap-6 p-8 bg-gradient-to-br from-white/90 via-white/95 to-white/90 dark:from-gray-900/90 dark:via-gray-800/95 dark:to-gray-900/90 rounded-3xl border border-white/20 dark:border-gray-700/30 backdrop-blur-lg shadow-2xl">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-honey/30 to-orange-500/30 rounded-full blur-md"></div>
              <MembershipBadge level={currentLevel || 1} />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-muted-foreground/80 mb-1">{t('membership.currentLevel')}</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-honey via-orange-500 to-honey bg-clip-text text-transparent">
                Level {currentLevel || 1}
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {t('membership.directReferrals')}: <span className="font-semibold text-honey">{directReferralsCount || 0}</span>
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Membership Levels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {membershipLevels.map((membership) => {
          const status = getLevelStatus(membership.level);
          const totalPrice = membership.price + (membership.platformFee || 0);
          const Icon = membership.icon;
          
          return (
            <div 
              key={membership.level}
              className={`group relative transition-all duration-500 hover:-translate-y-2 ${
                status === 'owned' ? 'opacity-80' : ''
              }`}
              data-testid={`card-membership-level-${membership.level}`}
            >
              {/* Background Glow Effect */}
              <div className={`absolute inset-0 rounded-3xl transition-all duration-500 ${
                membership.isSpecial 
                  ? 'bg-gradient-to-br from-honey/20 via-orange-500/20 to-honey/20 blur-xl group-hover:blur-2xl group-hover:scale-105' 
                  : 'bg-gradient-to-br from-gray-200/20 via-gray-300/20 to-gray-200/20 dark:from-gray-700/20 dark:via-gray-600/20 dark:to-gray-700/20 blur-lg group-hover:blur-xl group-hover:scale-102'
              }`}></div>
              
              {/* Special Featured Badge */}
              {membership.isSpecial && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-honey/50 to-orange-500/50 rounded-full blur-md"></div>
                    <Badge className="relative bg-gradient-to-r from-honey via-orange-500 to-honey text-black font-bold px-4 py-2 text-sm shadow-lg">
                      ✨ {t('membership.featured')}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Main Card */}
              <Card className={`relative z-10 overflow-hidden border-0 bg-gradient-to-br from-white/95 via-white/98 to-white/95 dark:from-gray-900/95 dark:via-gray-800/98 dark:to-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl transition-all duration-500 ${
                membership.isSpecial 
                  ? 'ring-2 ring-honey/30 shadow-honey/20' 
                  : 'shadow-gray-200/50 dark:shadow-gray-800/50'
              } group-hover:shadow-3xl`}>
                
                {/* Premium Header */}
                <CardHeader className="relative p-8 pb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      {/* Icon with Glow */}
                      <div className="relative">
                        <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
                          membership.isSpecial 
                            ? 'bg-gradient-to-r from-honey/30 to-orange-500/30 blur-md group-hover:blur-lg' 
                            : 'bg-gradient-to-r from-gray-300/30 to-gray-400/30 dark:from-gray-600/30 dark:to-gray-700/30 blur-sm group-hover:blur-md'
                        }`}></div>
                        <div className={`relative p-4 rounded-2xl ${
                          membership.isSpecial 
                            ? 'bg-gradient-to-br from-honey/20 to-orange-500/20' 
                            : membership.bgColor
                        } backdrop-blur-sm`}>
                          <Icon className={`h-8 w-8 ${membership.color} transition-all duration-300 group-hover:scale-110`} />
                        </div>
                      </div>
                      
                      {/* Level Title */}
                      <div>
                        <CardTitle className={`text-2xl font-bold mb-1 ${
                          membership.isSpecial 
                            ? 'bg-gradient-to-r from-honey via-orange-500 to-honey bg-clip-text text-transparent' 
                            : 'text-foreground'
                        }`}>
                          Level {membership.level}
                        </CardTitle>
                        {status === 'owned' && (
                          <div className="flex items-center gap-2 text-emerald-600">
                            <CheckCircle className="h-5 w-5" />
                            <span className="text-sm font-semibold">已拥有</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {status === 'locked' && (
                      <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Premium Price Display */}
                  <div className={`text-center p-6 rounded-2xl ${
                    membership.isSpecial 
                      ? 'bg-gradient-to-br from-honey/10 via-orange-500/10 to-honey/10 border border-honey/20' 
                      : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200/50 dark:border-gray-700/50'
                  } backdrop-blur-sm transition-all duration-300 group-hover:scale-105`}>
                    <div className={`text-4xl font-bold mb-2 ${
                      membership.isSpecial 
                        ? 'bg-gradient-to-r from-honey via-orange-500 to-honey bg-clip-text text-transparent' 
                        : 'text-foreground'
                    }`}>
                      ${membership.price}
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      USDC Payment
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="p-8 pt-4 space-y-6">
                  {/* Level 2 Special Requirements Display */}
                  {membership.level === 2 && currentLevel === 1 && (
                    <div className="mb-6 p-4 rounded-2xl border border-honey/20 bg-gradient-to-r from-honey/5 to-orange-500/5">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-honey" />
                        <span className="font-semibold text-honey">直推要求</span>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {(directReferralsCount || 0) > 3 ? (
                          <span className="text-emerald-600 font-medium">
                            ✅ 已达标：{directReferralsCount}/3+ 人 (超出 {(directReferralsCount || 0) - 3} 人)
                          </span>
                        ) : (
                          <span className="text-orange-600 font-medium">
                            ❌ 未达标：{directReferralsCount || 0}/3+ 人 (还需 {Math.max(1, 4 - (directReferralsCount || 0))} 人)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground/80">
                        💡 只计算推荐链接直接注册的用户
                      </div>
                    </div>
                  )}

                  {/* Premium Benefits */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                      <Award className="h-5 w-5 text-honey" />
                      专属权益
                    </h4>
                    <ul className="space-y-3">
                      {membership.benefits.slice(0, 4).map((benefit, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm group/benefit">
                          <div className="p-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 transition-all duration-200 group-hover/benefit:scale-110">
                            <CheckCircle className="h-3 w-3 text-emerald-500" />
                          </div>
                          <span className="text-muted-foreground font-medium leading-relaxed">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Premium Action Button */}
                  <div className="pt-6">
                    {status === 'owned' ? (
                      <Button 
                        disabled 
                        className="w-full h-14 bg-gradient-to-r from-emerald-100 to-emerald-200 dark:from-emerald-900/50 dark:to-emerald-800/50 text-emerald-700 dark:text-emerald-400 hover:from-emerald-200 hover:to-emerald-300 dark:hover:from-emerald-800/50 dark:hover:to-emerald-700/50 font-bold text-base rounded-2xl border border-emerald-200 dark:border-emerald-800"
                        data-testid={`button-owned-${membership.level}`}
                      >
                        <CheckCircle className="h-5 w-5 mr-3" />
                        已购买成功
                      </Button>
                    ) : status === 'available' ? (
                      <Button 
                        onClick={() => handleClaimLevel(membership.level)}
                        disabled={claimState.loading}
                        className={`w-full h-14 font-bold text-base rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl ${
                          membership.isSpecial 
                            ? 'bg-gradient-to-r from-honey via-orange-500 to-honey hover:from-honey/90 hover:via-orange-500/90 hover:to-honey/90 text-black shadow-honey/30' 
                            : 'bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white shadow-gray-800/30'
                        }`}
                        data-testid={`button-claim-${membership.level}`}
                      >
                        {claimState.level === membership.level && claimState.loading ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                            处理中...
                          </>
                        ) : (
                          <>
                            <ArrowRight className="h-5 w-5 mr-3 transition-transform duration-200 group-hover:translate-x-1" />
                            立即购买 ${totalPrice}
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button 
                        disabled 
                        className="w-full h-14 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 text-muted-foreground font-semibold text-base rounded-2xl border border-gray-200 dark:border-gray-700"
                        data-testid={`button-locked-${membership.level}`}
                      >
                        <Lock className="h-5 w-5 mr-3" />
                        暂未解锁
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Premium Info Section */}
      <div className="mt-16 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-honey/10 via-orange-500/10 to-honey/10 rounded-3xl blur-xl"></div>
        <div className="relative p-8 bg-gradient-to-br from-white/90 via-white/95 to-white/90 dark:from-gray-900/90 dark:via-gray-800/95 dark:to-gray-900/90 rounded-3xl border border-white/20 dark:border-gray-700/30 backdrop-blur-lg shadow-2xl">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center gap-2">
              <Users className="h-6 w-6 text-honey" />
              <h3 className="text-xl font-bold text-foreground">{t('membership.progressInfo.title')}</h3>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('membership.progressInfo.description')}
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <span>• {t('membership.progressInfo.sequential')}</span>
              <span>• {t('membership.progressInfo.rewards')}</span>
              <span>• {t('membership.progressInfo.benefits')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
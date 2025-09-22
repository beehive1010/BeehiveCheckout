import { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useWallet } from '../hooks/useWallet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { Crown, Shield, Star, Zap, Gift, Lock, CheckCircle, Loader2, ArrowRight, Users, Award } from 'lucide-react';
import MembershipBadge from '../components/membership/MembershipBadge';
import { getMembershipLevel } from '../lib/config/membershipLevels';
import { Level2ClaimButton, LevelUpgradeButton } from '../components/membership';

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
  const queryClient = useQueryClient();
  const [userReferrer, setUserReferrer] = useState<string>('');

  // Fetch user's referrer from members table
  useEffect(() => {
    const fetchUserReferrer = async () => {
      if (!walletAddress) return;
      
      try {
        const { supabase } = await import('../lib/supabase');
        const { data: memberData } = await supabase
          .from('members')
          .select('referrer_wallet')
          .ilike('wallet_address', walletAddress)
          .single();
        
        if (memberData?.referrer_wallet) {
          setUserReferrer(memberData.referrer_wallet);
        }
      } catch (error) {
        console.warn('Failed to fetch user referrer:', error);
      }
    };

    fetchUserReferrer();
  }, [walletAddress]);

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

  // State for managing card-based upgrades
  const [upgradeState, setUpgradeState] = useState<{
    level: number | null;
    isProcessing: boolean;
  }>({
    level: null,
    isProcessing: false
  });

  // Handle direct upgrade from card - Use actual upgrade logic
  const handleCardUpgrade = async (targetLevel: number) => {
    if (!walletAddress) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    // Check if user can upgrade to this level
    if (targetLevel !== currentLevel + 1) {
      toast({
        title: "Sequential Upgrade Required",
        description: `You can only upgrade to Level ${currentLevel + 1}. Cannot skip levels.`,
        variant: "destructive",
      });
      return;
    }

    // For Level 2, check special requirements
    if (targetLevel === 2) {
      if (currentLevel !== 1 || (directReferralsCount || 0) < 3) {
        toast({
          title: "Requirements Not Met",
          description: "Level 2 requires Level 1 membership and 3+ direct referrals",
          variant: "destructive",
        });
        return;
      }
    }

    setUpgradeState({ level: targetLevel, isProcessing: true });
    
    try {
      // Import the upgrade logic dynamically
      const { claimNFT } = await import('../lib/nftClaim');
      
      await claimNFT({
        level: targetLevel,
        walletAddress,
        onProgress: (step: string) => {
          console.log(`🔄 Upgrade progress: ${step}`);
        }
      });

      toast({
        title: `Level ${targetLevel} Claimed!`,
        description: `Successfully upgraded to Level ${targetLevel}`,
        duration: 5000,
      });

      // Refresh data
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['user-status', walletAddress] });
        queryClient.invalidateQueries({ queryKey: ['/direct-referrals', walletAddress] });
      }, 2000);

    } catch (error: any) {
      console.error('Card upgrade error:', error);
      toast({
        title: "Upgrade Failed",
        description: error.message || "Failed to upgrade membership",
        variant: "destructive",
      });
    } finally {
      setUpgradeState({ level: null, isProcessing: false });
    }
  };

  // Define all 19 membership levels with progressive pricing and benefits
  const membershipLevels: MembershipLevel[] = [
    // Level 1: Bronze Bee
    {
      level: 1,
      price: 130,
      platformFee: 0,
      benefits: [
        t('benefits.basic.platformFeatures'),
        t('benefits.basic.matrixEntry'),
        t('benefits.basic.learningMaterials'),
        t('benefits.basic.communityAccess'),
        t('benefits.basic.tokenId1')
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
        t('benefits.enhanced.matrixRewards'),
        t('benefits.enhanced.premiumContent'),
        t('benefits.enhanced.referralBonuses'),
        t('benefits.enhanced.advancedFeatures'),
        t('benefits.enhanced.tokenId2'),
        t('membership.level2Requirements.needLevel1AndReferrals')
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
          level <= 5 ? t('benefits.goldBee.tier', { tier: level - 2 }) : 
          level <= 10 ? t('benefits.platinumBee.tier', { tier: level - 5 }) :
          level <= 15 ? t('benefits.diamondBee.tier', { tier: level - 10 }) :
          t('benefits.masterBee.tier', { tier: level - 15 }),
          t('benefits.enhancedMatrix', { maxLayer: Math.min(19, level * 2) }),
          t('benefits.bonusMultiplier', { multiplier: Math.min(10, level * 0.5) }),
          level >= 5 ? t('benefits.vipStatus') : t('benefits.premium'),
          level >= 10 ? t('benefits.exclusiveMerchant') : t('benefits.enhancedFeatures'),
          level >= 15 ? t('benefits.governance') : t('benefits.prioritySupport'),
          level >= 18 ? t('benefits.founderStatus') : t('benefits.eliteStatus'),
          t('benefits.tokenId', { level })
        ].filter(Boolean),
        icon: getIcon(),
        ...colors,
        isSpecial: false // Will be set dynamically based on availability
      };
    })
  ];

  // Note: Level claiming is now handled by specialized components in the Quick Upgrade section

  const getLevelStatus = (level: number) => {
    if (!currentLevel) return 'locked';
    if (level <= currentLevel) return 'owned';
    
    // Special logic for Level 2: requires Level 1 + direct referrals >= 3 (from referrals table)
    if (level === 2) {
      if (currentLevel >= 1 && (directReferralsCount || 0) >= 3) {
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

      {/* Direct NFT Claim Section - Using Dynamic ERC5115ClaimComponent */}
      {walletAddress && currentLevel > 0 && currentLevel < 19 && userReferrer && (
        <div className="mb-12">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
              <Zap className="h-6 w-6 text-honey" />
              {t('membership.quickUpgrade') || 'Quick NFT Upgrade'}
            </h2>
            <p className="text-muted-foreground">
              {t('membership.nftClaimDescription') || 'Use blockchain NFT claiming to upgrade your membership level instantly'}
            </p>
            <div className="mt-2 text-xs text-honey/80">
              {t('membership.nftClaimNote') || 'This uses the same smart contract as the welcome page with automatic level detection'}
            </div>
            
          </div>
          
          <div className="max-w-4xl mx-auto" data-testid="quick-upgrade-section">
            {/* Debug component selection */}
            {console.log('🎯 Membership Component Selection:', {
              currentLevel,
              currentLevelType: typeof currentLevel,
              directReferralsCount,
              directReferralsType: typeof directReferralsCount,
              condition1: currentLevel === 0,
              condition2: currentLevel === 1 && (directReferralsCount || 0) >= 3,
              condition3: currentLevel >= 1 && currentLevel < 19,
              selectedComponent: currentLevel === 0 ? 'needsActivation' : 
                                currentLevel === 1 && (directReferralsCount || 0) >= 3 ? 'Level2ClaimButton' :
                                currentLevel >= 1 && currentLevel < 19 ? 'LevelUpgradeButton' : 'unknown'
            })}
            
            {/* Dynamic component selection for membership upgrades only */}
            {currentLevel === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <p>{t('membership.needsActivation') || 'Please activate your Level 1 membership on the Welcome page first.'}</p>
                <a href="/welcome" className="text-honey hover:underline mt-2 inline-block">
                  {t('membership.goToWelcome') || 'Go to Welcome Page →'}
                </a>
              </div>
            ) : currentLevel === 1 && (directReferralsCount || 0) >= 3 ? (
              <Level2ClaimButton 
                onSuccess={() => {
                  toast({
                    title: t('membership.upgradeSuccess') || 'Upgrade Successful!',
                    description: t('membership.upgradeSuccessDescription') || 'Your membership has been upgraded successfully',
                    duration: 5000
                  });
                  // Refresh user data and referrals count after successful upgrade
                  console.log('✅ Level 2 claim successful - refreshing user data');
                  // Add a small delay to ensure database updates have been processed
                  setTimeout(() => {
                    queryClient.invalidateQueries({ queryKey: ['user-status', walletAddress] });
                    queryClient.invalidateQueries({ queryKey: ['/direct-referrals', walletAddress] });
                  }, 2000);
                }}
              />
            ) : currentLevel >= 1 && currentLevel < 19 ? (
              <LevelUpgradeButton 
                onSuccess={() => {
                  toast({
                    title: t('membership.upgradeSuccess') || 'Upgrade Successful!',
                    description: t('membership.upgradeSuccessDescription') || 'Your membership has been upgraded successfully',
                    duration: 5000
                  });
                  // Refresh user data after successful upgrade
                  console.log('✅ Level upgrade successful - refreshing user data');
                  // Add a small delay to ensure database updates have been processed
                  setTimeout(() => {
                    queryClient.invalidateQueries({ queryKey: ['user-status', walletAddress] });
                    queryClient.invalidateQueries({ queryKey: ['/direct-referrals', walletAddress] });
                  }, 2000);
                }}
                targetLevel={currentLevel + 1}
              />
            ) : (
              <div className="text-center p-8 text-muted-foreground">
                <p>{t('membership.maxLevelReached') || 'Maximum level reached!'}</p>
              </div>
            )}
          </div>
        </div>
      )}

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
                status === 'available' 
                  ? 'bg-gradient-to-br from-honey/20 via-orange-500/20 to-honey/20 blur-xl group-hover:blur-2xl group-hover:scale-105' 
                  : 'bg-gradient-to-br from-gray-200/20 via-gray-300/20 to-gray-200/20 dark:from-gray-700/20 dark:via-gray-600/20 dark:to-gray-700/20 blur-lg group-hover:blur-xl group-hover:scale-102'
              }`}></div>
              
              {/* Special Featured Badge - Show for available levels */}
              {status === 'available' && (
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
                status === 'available' 
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
                          status === 'available' 
                            ? 'bg-gradient-to-r from-honey/30 to-orange-500/30 blur-md group-hover:blur-lg' 
                            : 'bg-gradient-to-r from-gray-300/30 to-gray-400/30 dark:from-gray-600/30 dark:to-gray-700/30 blur-sm group-hover:blur-md'
                        }`}></div>
                        <div className={`relative p-4 rounded-2xl ${
                          status === 'available' 
                            ? 'bg-gradient-to-br from-honey/20 to-orange-500/20' 
                            : membership.bgColor
                        } backdrop-blur-sm`}>
                          <Icon className={`h-8 w-8 ${membership.color} transition-all duration-300 group-hover:scale-110`} />
                        </div>
                      </div>
                      
                      {/* Level Title */}
                      <div>
                        <CardTitle className={`text-2xl font-bold mb-1 ${
                          status === 'available' 
                            ? 'bg-gradient-to-r from-honey via-orange-500 to-honey bg-clip-text text-transparent' 
                            : 'text-foreground'
                        }`}>
                          Level {membership.level}
                        </CardTitle>
                        {status === 'owned' && (
                          <div className="flex items-center gap-2 text-emerald-600">
                            <CheckCircle className="h-5 w-5" />
                            <span className="text-sm font-semibold">{t('membership.status.owned')}</span>
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
                        <span className="font-semibold text-honey">{t('membership.directReferralRequirement')}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {(directReferralsCount || 0) >= 3 ? (
                          <span className="text-emerald-600 font-medium">
                            {t('membership.qualifiedStatus', { count: directReferralsCount, excess: (directReferralsCount || 0) - 3 })}
                          </span>
                        ) : (
                          <span className="text-orange-600 font-medium">
                            {t('membership.statusNotQualified', { count: directReferralsCount || 0, needed: Math.max(1, 3 - (directReferralsCount || 0)) })}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground/80">
                        {t('membership.directRegisterTip')}
                      </div>
                    </div>
                  )}

                  {/* Premium Benefits */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                      <Award className="h-5 w-5 text-honey" />
                      {t('membership.exclusiveBenefits')}
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

                  {/* Premium Action Button - Only display cards for information, actual claims handled in top section */}
                  <div className="pt-6">
                    {status === 'owned' ? (
                      <Button 
                        disabled 
                        className="w-full h-14 bg-gradient-to-r from-emerald-100 to-emerald-200 dark:from-emerald-900/50 dark:to-emerald-800/50 text-emerald-700 dark:text-emerald-400 hover:from-emerald-200 hover:to-emerald-300 dark:hover:from-emerald-800/50 dark:hover:to-emerald-700/50 font-bold text-base rounded-2xl border border-emerald-200 dark:border-emerald-800"
                        data-testid={`button-owned-${membership.level}`}
                      >
                        <CheckCircle className="h-5 w-5 mr-3" />
                        {t('membership.purchaseSuccess')}
                      </Button>
                    ) : status === 'available' ? (
                      <Button 
                        onClick={() => handleCardUpgrade(membership.level)}
                        disabled={upgradeState.isProcessing && upgradeState.level === membership.level}
                        className="w-full h-14 bg-gradient-to-r from-honey to-orange-500 hover:from-honey/90 hover:to-orange-500/90 text-white font-semibold text-base rounded-2xl border border-honey/30 transition-all duration-200 hover:scale-105 hover:shadow-lg disabled:opacity-75 disabled:cursor-not-allowed disabled:hover:scale-100"
                        data-testid={`button-available-${membership.level}`}
                      >
                        {upgradeState.isProcessing && upgradeState.level === membership.level ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <ArrowRight className="h-5 w-5 mr-3" />
                            {t('membership.upgradeNow') || `Upgrade to Level ${membership.level} - $${membership.price}`}
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
                        {t('membership.notUnlocked')}
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
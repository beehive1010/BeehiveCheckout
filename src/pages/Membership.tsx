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
import { Crown, Shield, Star, Zap, Gift, Lock, CheckCircle, Loader2, ArrowRight, Users } from 'lucide-react';
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

  // Fetch user's direct referrals count for Level 2 condition
  const { data: directReferralsCount } = useQuery({
    queryKey: ['/direct-referrals', walletAddress],
    enabled: !!walletAddress,
    queryFn: async () => {
      try {
        return await matrixService.countDirectReferrals(walletAddress!);
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
      price: 260,
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

    // Special condition for Level 2: Must have Level 1 AND more than 3 direct referrals
    if (level === 2) {
      if (!currentLevel || currentLevel < 1) {
        toast({
          title: t('membership.level2Requirements.title'),
          description: t('membership.level2Requirements.needLevel1'),
          variant: "destructive"
        });
        return;
      }
      
      const referrals = directReferralsCount || 0;
      if (referrals <= 3) {
        toast({
          title: t('membership.level2Requirements.title'),
          description: t('membership.level2Requirements.needReferrals', { current: referrals }),
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
      // Import upgrade service
      const { upgradeService } = await import('../lib/supabaseClient');

      toast({
        title: t('membership.claiming.started', { level }),
        description: t('membership.claiming.processing', { price: totalPrice }),
      });

      // Generate a transaction hash for this claim (in real app, this would come from blockchain)
      const transactionHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;

      // Call real Supabase API using working service
      const result = await upgradeService.processNFTUpgrade(walletAddress, {
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
        
        // Refresh the page data using React Query instead of full reload
        setTimeout(() => {
          window.location.reload();
        }, 2000);
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
    
    // Special logic for Level 2: requires Level 1 + direct referrals > 3
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
        
        {/* Current Level Display */}
        <div className="flex items-center justify-center gap-4 p-6 bg-gradient-to-r from-honey/10 to-orange-500/10 rounded-2xl border border-honey/30 max-w-md mx-auto">
          <MembershipBadge level={currentLevel || 1} />
          <div className="text-left">
            <p className="text-sm text-muted-foreground">{t('membership.currentLevel')}</p>
            <p className="text-2xl font-bold text-honey">Level {currentLevel || 1}</p>
            <p className="text-xs text-muted-foreground">{t('membership.directReferrals')}: {directReferralsCount || 0}</p>
          </div>
        </div>
      </div>

      {/* Membership Levels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {membershipLevels.map((membership) => {
          const status = getLevelStatus(membership.level);
          const totalPrice = membership.price + (membership.platformFee || 0);
          const Icon = membership.icon;
          
          return (
            <Card 
              key={membership.level}
              className={`relative transition-all duration-300 hover:shadow-lg ${membership.bgColor} ${membership.borderColor} ${
                membership.isSpecial ? 'ring-2 ring-honey/20' : ''
              } ${status === 'owned' ? 'opacity-75' : ''}`}
              data-testid={`card-membership-level-${membership.level}`}
            >
              {membership.isSpecial && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-honey text-black font-semibold px-3 py-1">
                    {t('membership.featured')}
                  </Badge>
                </div>
              )}
              
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-full ${membership.bgColor}`}>
                      <Icon className={`h-6 w-6 ${membership.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold">
                        Level {membership.level}
                      </CardTitle>
                      {status === 'owned' && (
                        <div className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Owned</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {status === 'locked' && (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Price */}
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <div className="text-3xl font-bold text-foreground">
                    ${membership.price}
                    {membership.platformFee && (
                      <span className="text-lg text-muted-foreground"> + ${membership.platformFee}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {membership.platformFee ? `Total: $${totalPrice} USDC` : '$USDC'}
                  </p>
                </div>

                {/* Benefits */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground">Benefits:</h4>
                  <ul className="space-y-2">
                    {membership.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Button */}
                <div className="pt-4">
                  {status === 'owned' ? (
                    <Button 
                      disabled 
                      className="w-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                      data-testid={`button-owned-${membership.level}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t('membership.owned')}
                    </Button>
                  ) : status === 'available' ? (
                    <Button 
                      onClick={() => handleClaimLevel(membership.level)}
                      disabled={claimState.loading}
                      className="w-full bg-honey hover:bg-honey/90 text-black font-semibold"
                      data-testid={`button-claim-${membership.level}`}
                    >
                      {claimState.level === membership.level && claimState.loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t('membership.claiming.inProgress')}
                        </>
                      ) : (
                        <>
                          <ArrowRight className="h-4 w-4 mr-2" />
                          {t('membership.claim')} ${totalPrice}
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button 
                      disabled 
                      className="w-full bg-muted text-muted-foreground"
                      data-testid={`button-locked-${membership.level}`}
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      {t('membership.locked')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Section */}
      <div className="mt-12 p-6 bg-gradient-to-r from-honey/5 to-orange-500/5 rounded-2xl border border-honey/20">
        <div className="text-center space-y-4">
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
  );
}
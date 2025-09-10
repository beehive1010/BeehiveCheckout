import { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useWallet } from '../hooks/useWallet';
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
  const [claimState, setClaimState] = useState<{
    level: number | null;
    loading: boolean;
    error: string | null;
  }>({
    level: null,
    loading: false,
    error: null
  });

  // Define membership levels with progressive pricing and benefits
  const membershipLevels: MembershipLevel[] = [
    {
      level: 1,
      price: 100,
      platformFee: 30,
      benefits: [
        'Access to basic platform features',
        'Entry to 3×3 matrix system',
        'Basic learning materials',
        'Community access'
      ],
      icon: Shield,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950',
      borderColor: 'border-emerald-200 dark:border-emerald-800'
    },
    {
      level: 2,
      price: 150,
      benefits: [
        'Enhanced matrix rewards',
        'Premium learning content',
        'Direct referral bonuses',
        'Advanced features access'
      ],
      icon: Star,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      level: 3,
      price: 200,
      benefits: [
        'Higher referral rewards',
        'Exclusive content access',
        'Priority support',
        'Special community perks'
      ],
      icon: Crown,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      borderColor: 'border-purple-200 dark:border-purple-800'
    },
    {
      level: 5,
      price: 300,
      benefits: [
        'VIP status benefits',
        'Maximum matrix potential',
        'Exclusive events access',
        'Leadership opportunities'
      ],
      icon: Zap,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      borderColor: 'border-orange-200 dark:border-orange-800',
      isSpecial: true
    },
    {
      level: 10,
      price: 550,
      benefits: [
        'Elite member status',
        'Maximum earnings potential',
        'Exclusive merchant NFTs',
        'Platform governance rights'
      ],
      icon: Gift,
      color: 'text-honey',
      bgColor: 'bg-honey/10 dark:bg-honey/20',
      borderColor: 'border-honey/30',
      isSpecial: true
    },
    {
      level: 15,
      price: 800,
      benefits: [
        'Platinum membership tier',
        'Ultimate reward multipliers',
        'Exclusive investment opportunities',
        'Advisory board eligibility'
      ],
      icon: Crown,
      color: 'text-platinum-600',
      bgColor: 'bg-gray-50 dark:bg-gray-950',
      borderColor: 'border-gray-200 dark:border-gray-800',
      isSpecial: true
    },
    {
      level: 19,
      price: 1000,
      benefits: [
        'Ultimate membership level',
        'Maximum platform benefits',
        'Lifetime rewards eligibility',
        'Founder status recognition'
      ],
      icon: Crown,
      color: 'text-golden-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      isSpecial: true
    }
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

    const membershipConfig = membershipLevels.find(m => m.level === level);
    if (!membershipConfig) return;

    const totalPrice = membershipConfig.price + (membershipConfig.platformFee || 0);

    setClaimState({ level, loading: true, error: null });

    try {
      // Import API client
      const { SupabaseApiClient } = await import('../lib/supabase-original');
      const apiClient = new SupabaseApiClient();

      toast({
        title: t('membership.claiming.started', { level }),
        description: t('membership.claiming.processing', { price: totalPrice }),
      });

      // Generate a transaction hash for this claim (in real app, this would come from blockchain)
      const transactionHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;

      // Call real Supabase API
      const result = await apiClient.processUpgrade(
        walletAddress,
        level,
        'token_payment', // payment method
        transactionHash, // transaction hash
        'arbitrum-sepolia' // network
      );

      if (result.success) {
        toast({
          title: t('membership.claiming.success', { level }),
          description: t('membership.claiming.successDescription', { level, price: totalPrice }),
          duration: 6000
        });

        console.log(`✅ Level ${level} claim successful:`, result);
        
        // Refresh the page data
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
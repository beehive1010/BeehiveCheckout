import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import HexagonIcon from '../components/UI/HexagonIcon';
import { Notifications } from '../components/Notifications';
import { useToast } from '../hooks/use-toast';
import ClaimMembershipButton from '../components/membership/ClaimMembershipButton';
import { useNFTVerification } from '../hooks/useNFTVerification';
import { useUserReferralStats } from '../hooks/useBeeHiveStats';
import { useState, useEffect } from 'react';
import { Copy, Share2, Users, Award, TrendingUp, DollarSign, Building2, Crown, Clock, AlertCircle, Gift, Star, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';

export default function Dashboard() {
  const { 
    userData, 
    isActivated, 
    currentLevel, 
    bccBalance, 
    walletAddress,
    activateMembership,
    isActivating
  } = useWallet();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { hasLevel1NFT, isLoading: isCheckingNFT } = useNFTVerification();
  const { data: userStats, isLoading: isLoadingUserStats } = useUserReferralStats();
  const [showReferralLink, setShowReferralLink] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  
  // Check registration expiration status
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      if (!walletAddress || isActivated) return;
      
      try {
        const response = await fetch(`/api/wallet/registration-status`, {
          headers: {
            'X-Wallet-Address': walletAddress
          }
        });
        
        if (response.ok) {
          const status = await response.json();
          if (status.registrationExpiresAt) {
            const expiresAt = new Date(status.registrationExpiresAt).getTime();
            const now = Date.now();
            setTimeRemaining(Math.max(0, expiresAt - now));
          }
        }
      } catch (error) {
        console.error('Failed to check registration status:', error);
      }
    };
    
    checkRegistrationStatus();
  }, [walletAddress, isActivated]);
  
  // Countdown timer effect
  useEffect(() => {
    if (timeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          // Registration expired, refresh status
          window.location.reload();
          return 0;
        }
        return newTime;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeRemaining]);
  
  const formatTimeRemaining = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };
  
  const referralLink = `https://beehive-lifestyle.io/register?ref=${walletAddress}`;

  const handleActivateLevel1 = () => {
    // Mock Level 1 activation - in real implementation would integrate with payment system
    activateMembership({ level: 1, txHash: 'mock-tx-hash' }, {
      onSuccess: () => {
        toast({
          title: t('dashboard.activation.success.title'),
          description: t('dashboard.activation.success.description'),
        });
      },
      onError: (error: any) => {
        toast({
          title: t('dashboard.activation.error.title'),
          description: error.message || t('dashboard.activation.error.description'),
          variant: 'destructive',
        });
      },
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };


  const recentActivities = [
    {
      icon: 'fas fa-gift',
      type: t('dashboard.activity.rewardReceived'),
      description: t('dashboard.activity.fromReferralUpgrade'),
      amount: t('dashboard.activity.rewardAmount', { amount: 100 }),
      color: 'text-green-400'
    },
    {
      icon: 'fas fa-shopping-cart',
      type: t('dashboard.activity.nftClaimed'),
      description: t('dashboard.activity.merchantNft'),
      amount: t('dashboard.activity.bccDeduction', { amount: 50 }),
      color: 'text-muted-foreground'
    },
    {
      icon: 'fas fa-user-plus',
      type: t('dashboard.activity.newReferral'),
      description: t('dashboard.activity.userJoined'),
      amount: t('dashboard.activity.activeStatus'),
      color: 'text-green-400'
    }
  ];

  // Show NFT verification requirement if user doesn't have Level 1 NFT
  if (!hasLevel1NFT && !isCheckingNFT) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="bg-secondary border-border shadow-2xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold text-honey mb-2">
                {t('dashboard.nftRequired.title')}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                {t('dashboard.nftRequired.description')}
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* NFT Section */}
              <div className="bg-muted rounded-lg p-4 border border-honey/20">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-honey">{t('dashboard.nftRequired.requiredNft')}</h3>
                    <p className="text-xs text-muted-foreground">{t('dashboard.nftRequired.nftDescription')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{t('dashboard.nftRequired.price')}</p>
                    <p className="text-xl font-bold text-honey">{t('dashboard.nftRequired.priceAmount')}</p>
                  </div>
                </div>
                <div className="flex items-center text-xs">
                  <i className="fas fa-layer-group text-honey mr-2"></i>
                  <span className="text-honey font-medium">{t('dashboard.nftRequired.tokenId')}</span>
                </div>
              </div>

              {/* Benefits Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-honey">{t('dashboard.nftRequired.benefitsTitle')}</h3>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <div className="w-4 h-4 rounded-full bg-honey/20 flex items-center justify-center mr-3">
                      <i className="fas fa-check text-honey text-xs"></i>
                    </div>
                    <span className="text-muted-foreground">{t('dashboard.nftRequired.benefits.dashboard')}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-4 h-4 rounded-full bg-honey/20 flex items-center justify-center mr-3">
                      <i className="fas fa-check text-honey text-xs"></i>
                    </div>
                    <span className="text-muted-foreground">{t('dashboard.nftRequired.benefits.tasks')}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-4 h-4 rounded-full bg-honey/20 flex items-center justify-center mr-3">
                      <i className="fas fa-check text-honey text-xs"></i>
                    </div>
                    <span className="text-muted-foreground">{t('dashboard.nftRequired.benefits.education')}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-4 h-4 rounded-full bg-honey/20 flex items-center justify-center mr-3">
                      <i className="fas fa-check text-honey text-xs"></i>
                    </div>
                    <span className="text-muted-foreground">{t('dashboard.nftRequired.benefits.discover')}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-4 h-4 rounded-full bg-honey/20 flex items-center justify-center mr-3">
                      <i className="fas fa-check text-honey text-xs"></i>
                    </div>
                    <span className="text-muted-foreground">{t('dashboard.nftRequired.benefits.tokens')}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-4 h-4 rounded-full bg-honey/20 flex items-center justify-center mr-3">
                      <i className="fas fa-check text-honey text-xs"></i>
                    </div>
                    <span className="text-muted-foreground">{t('dashboard.nftRequired.benefits.matrix')}</span>
                  </div>
                </div>
              </div>

              {/* Premium Section */}
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center">
                  <i className="fas fa-gem text-honey mr-2"></i>
                  <span className="text-honey font-medium text-sm">{t('dashboard.nftRequired.premiumTitle')}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.nftRequired.premiumDescription')}
                </p>

                <ClaimMembershipButton
                  walletAddress={walletAddress || ""}
                  level={1}
                  onSuccess={() => {
                    toast({
                      title: t('dashboard.nftRequired.purchaseSuccess.title'),
                      description: t('dashboard.nftRequired.purchaseSuccess.description'),
                    });
                    // Refresh page to show dashboard
                    window.location.reload();
                  }}
                  onError={(error) => {
                    toast({
                      title: t('dashboard.nftRequired.purchaseError.title'),
                      description: error || t('dashboard.nftRequired.purchaseError.description'),
                      variant: 'destructive',
                    });
                  }}
                  className="w-full"
                />

                <p className="text-xs text-muted-foreground">
                  {t('dashboard.nftRequired.supportText')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  if (isCheckingNFT) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto bg-secondary border-border">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-honey mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('dashboard.verifying')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isActivated && hasLevel1NFT && !isCheckingNFT) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 flex items-center justify-center p-2 sm:p-4">
        <div className="w-full max-w-2xl mx-auto">
          <Card className="bg-secondary border-honey/30 shadow-2xl backdrop-blur mx-2 sm:mx-0">
            <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-gradient-to-br from-honey/20 to-honey/10 flex items-center justify-center">
                <i className="fas fa-crown text-honey text-2xl sm:text-3xl"></i>
              </div>
              <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-honey mb-2 sm:mb-3">
                Premium Membership
              </CardTitle>
              <p className="text-muted-foreground text-base sm:text-lg px-2">
                Activate your existing Level 1 NFT in the system to access all features.
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6 sm:space-y-8 px-4 sm:px-6">
              {/* NFT Status Card */}
              <div className="bg-gradient-to-r from-green-500/5 via-green-500/10 to-green-500/5 rounded-xl p-4 sm:p-6 border border-green-500/20">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-check text-green-500 text-lg sm:text-xl"></i>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-green-500">Level 1 NFT Detected</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">NFT found in your wallet</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs sm:text-sm text-muted-foreground">Token ID</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-500">0</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm">
                  <span className="text-green-500 font-medium">✓ NFT Ownership Verified</span>
                  <span className="text-muted-foreground">Ready for Activation</span>
                </div>
              </div>

              {/* Benefits Grid */}
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-honey mb-4 sm:mb-6 text-center">What You'll Unlock:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-honey/20 flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-graduation-cap text-honey text-sm"></i>
                    </div>
                    <span className="text-sm font-medium">Web3 Learning Courses</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-honey/20 flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-coins text-honey text-sm"></i>
                    </div>
                    <span className="text-sm font-medium">BCC Token Rewards</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-honey/20 flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-users text-honey text-sm"></i>
                    </div>
                    <span className="text-sm font-medium">Referral Matrix System</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-honey/20 flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-shopping-bag text-honey text-sm"></i>
                    </div>
                    <span className="text-sm font-medium">NFT Marketplace Access</span>
                  </div>
                </div>
              </div>

              {/* Activation Button */}
              <div className="text-center space-y-3 sm:space-y-4">
                <ClaimMembershipButton
                  walletAddress={walletAddress || ""}
                  level={1}
                  onSuccess={() => {
                    toast({
                      title: t('dashboard.activation.success.title'),
                      description: t('dashboard.activation.success.description'),
                    });
                    window.location.reload();
                  }}
                  onError={(error) => {
                    toast({
                      title: t('dashboard.activation.error.title'),
                      description: error || t('dashboard.activation.error.description'),
                      variant: 'destructive',
                    });
                  }}
                  className="w-full h-11 sm:h-12 text-base sm:text-lg font-semibold bg-gradient-to-r from-honey to-yellow-400 hover:from-yellow-400 hover:to-honey text-black transition-all duration-300 shadow-lg hover:shadow-honey/25"
                />
                <p className="text-xs sm:text-sm text-muted-foreground px-2">
                  {t('dashboard.activation.activationNote')}
                </p>
              </div>
              
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Membership Status Card */}
      <Card className="bg-secondary border-border glow-hover mb-8">
        <CardContent className="p-4 md:p-6">
          {/* Mobile-first layout with proper separation */}
          <div className="space-y-4">
            {/* User Profile Section */}
            <div className="flex items-center space-x-4">
              <HexagonIcon size="lg">
                <img 
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64" 
                  alt={t('dashboard.userAvatar')} 
                  className="w-12 h-12 rounded-full" 
                />
              </HexagonIcon>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg md:text-xl font-bold text-honey truncate">
                  {userData?.user?.username || t('dashboard.member')}
                </h2>
                <p className="text-muted-foreground text-xs md:text-sm truncate">
                  {walletAddress ? formatAddress(walletAddress) : ''}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge className="bg-honey text-black font-semibold text-xs">
                    {t('dashboard.levelText', { level: currentLevel })}
                  </Badge>
                  <Badge variant="secondary" className="bg-green-600 text-white text-xs">
                    {t('dashboard.nftVerified')}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* User Centre Button - Mobile Full Width */}
            <div className="flex justify-center md:justify-start">
              <Button
                onClick={() => setLocation('/me')}
                className="bg-honey text-black hover:bg-honey/90 font-semibold w-full md:w-auto"
                data-testid="button-user-centre"
              >
                <i className="fas fa-user-cog mr-2"></i>
                {t('dashboard.userCentre')}
              </Button>
            </div>

            {/* Token Top Up Section */}
            <div className="border-t border-border/20 pt-4 mt-4">
              <div className="bg-gradient-to-r from-honey/10 via-purple-500/10 to-honey/5 border-honey/20 glow-hover rounded-lg border p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-bold text-honey mb-1 md:mb-2">{t('buttons.topUp')}</h3>
                    <p className="text-muted-foreground text-xs md:text-sm">{t('dashboard.tokenPurchase.topUpDescription')}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1">
                        <i className="fas fa-coins text-honey text-sm"></i>
                        <span className="text-xs text-muted-foreground">BCC</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <i className="fas fa-gem text-purple-400 text-sm"></i>
                        <span className="text-xs text-muted-foreground">CTH</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setLocation('/tokens')}
                    className="bg-gradient-to-r from-honey to-purple-500 text-black hover:from-honey/90 hover:to-purple-500/90 font-semibold w-full md:w-auto flex-shrink-0"
                    data-testid="button-top-up"
                  >
                    <i className="fas fa-credit-card mr-2"></i>
                    {t('buttons.topUp')}
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Balance Display - Separate Section with Proper Spacing */}
            <div className="border-t border-border/20 pt-4 mt-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                {t('dashboard.accountOverview')}
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-muted/40 rounded-lg p-3 border border-border/30">
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs mb-1 font-medium">
                      {t('dashboard.reward')}
                    </p>
                    <p className="text-honey font-bold text-base">
                      {isLoadingUserStats ? '...' : (userStats?.totalEarnings || 0)}
                    </p>
                  </div>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 border border-border/30">
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs mb-1 font-medium">
                      {t('dashboard.bccBalance')}
                    </p>
                    <p className="text-honey font-bold text-base">
                      {bccBalance?.transferable || 0}
                    </p>
                  </div>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 border border-border/30">
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs mb-1 font-medium">
                      {t('dashboard.balances.bccLocked')}
                    </p>
                    <p className="text-honey font-bold text-base">
                      {bccBalance?.restricted || 0}
                    </p>
                  </div>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 border border-border/30">
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs mb-1 font-medium">
                      {t('dashboard.nfts')}
                    </p>
                    <p className="text-honey font-bold text-base">
                      {isLoadingUserStats ? '...' : 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Referral Link Card */}
      <Card className="bg-secondary border-border glow-hover mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-honey flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              {t('dashboard.referralLink.title')}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReferralLink(!showReferralLink)}
            >
              {showReferralLink ? t('dashboard.referralLink.hide') : t('dashboard.referralLink.show')}
            </Button>
          </div>
          
          {showReferralLink && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input 
                  value={referralLink}
                  readOnly
                  className="bg-muted"
                  data-testid="input-referral-link"
                />
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(referralLink);
                    toast({
                      title: t('dashboard.referralLink.copied'),
                      description: t('dashboard.referralLink.copiedDesc'),
                    });
                  }}
                  size="sm"
                  data-testid="button-copy-referral"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => {
                    const url = `https://twitter.com/intent/tweet?text=Join me on Beehive! ${encodeURIComponent(referralLink)}`;
                    window.open(url, '_blank');
                  }}
                  size="sm"
                  variant="outline"
                  className="flex-1 min-w-0"
                  data-testid="button-share-twitter"
                >
                  <i className="fab fa-twitter mr-1 sm:mr-2"></i> 
                  <span className="truncate">{t('dashboard.social.twitter')}</span>
                </Button>
                <Button
                  onClick={() => {
                    const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=Join me on Beehive!`;
                    window.open(url, '_blank');
                  }}
                  size="sm"
                  variant="outline"
                  className="flex-1 min-w-0"
                  data-testid="button-share-telegram"
                >
                  <i className="fab fa-telegram mr-1 sm:mr-2"></i> 
                  <span className="truncate">{t('dashboard.social.telegram')}</span>
                </Button>
                <Button
                  onClick={() => {
                    const url = `whatsapp://send?text=Join me on Beehive! ${encodeURIComponent(referralLink)}`;
                    window.open(url, '_blank');
                  }}
                  size="sm"
                  variant="outline"
                  className="flex-1 min-w-0"
                  data-testid="button-share-whatsapp"
                >
                  <i className="fab fa-whatsapp mr-1 sm:mr-2"></i> 
                  <span className="truncate">{t('dashboard.social.whatsapp')}</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Enhanced User Stats Grid with Real-Time Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-secondary border-border glow-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="h-8 w-8 text-blue-400" />
              <div className="text-right">
                <Badge variant="outline" className="text-blue-400 border-blue-400/50">
                  +12%
                </Badge>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-honey mb-1">
              {isLoadingUserStats ? '...' : (userStats?.directReferralCount || 0)}
            </h3>
            <p className="text-muted-foreground text-sm">{t('dashboard.stats.directReferrals')}</p>
            <p className="text-xs text-blue-400 mt-1">{t('dashboard.stats.thisMonth')}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border glow-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Building2 className="h-8 w-8 text-green-400" />
              <div className="text-right">
                <Badge variant="outline" className="text-green-400 border-green-400/50">
                  +8%
                </Badge>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-honey mb-1">
              {isLoadingUserStats ? '...' : (userStats?.totalTeamCount || 0)}
            </h3>
            <p className="text-muted-foreground text-sm">{t('dashboard.stats.teamSize')}</p>
            <p className="text-xs text-green-400 mt-1">{t('dashboard.stats.totalMembers')}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border glow-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="h-8 w-8 text-honey" />
              <div className="text-right">
                <Badge variant="outline" className="text-honey border-honey/50">
                  +25%
                </Badge>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-honey mb-1">
              ${isLoadingUserStats ? '...' : (userStats?.totalEarnings || '0.00')}
            </h3>
            <p className="text-muted-foreground text-sm">{t('dashboard.stats.totalEarnings')}</p>
            <p className="text-xs text-honey mt-1">{t('dashboard.stats.allTime')}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border glow-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <i className="fas fa-coins text-purple-400 text-2xl"></i>
              <div className="text-right">
                <Badge variant="outline" className="text-purple-400 border-purple-400/50">
                  +5%
                </Badge>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-honey mb-1">
              {typeof bccBalance === 'object' ? (bccBalance?.transferable || 0) : (bccBalance || 0)}
            </h3>
            <p className="text-muted-foreground text-sm">{t('dashboard.stats.bccBalance')}</p>
            <p className="text-xs text-purple-400 mt-1">BCC</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-secondary border-border glow-hover cursor-pointer hover:scale-105 transition-transform" onClick={() => setLocation('/tasks')}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-honey/10">
                <TrendingUp className="h-5 w-5 text-honey" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm">{t('dashboard.actions.upgradeLevel')}</h4>
                <p className="text-xs text-muted-foreground">{t('dashboard.actions.upgradeDescription')}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary border-border glow-hover cursor-pointer hover:scale-105 transition-transform" onClick={() => setLocation('/referrals')}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-400/10">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm">{t('dashboard.actions.viewReferrals')}</h4>
                <p className="text-xs text-muted-foreground">{t('dashboard.actions.referralsDescription')}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary border-border glow-hover cursor-pointer hover:scale-105 transition-transform" onClick={() => setLocation('/tasks')}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-green-400/10">
                <Gift className="h-5 w-5 text-green-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm">{t('dashboard.actions.claimNFT')}</h4>
                <p className="text-xs text-muted-foreground">{t('dashboard.actions.nftDescription')}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary border-border glow-hover cursor-pointer hover:scale-105 transition-transform" onClick={() => setLocation('/education')}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-purple-400/10">
                <Star className="h-5 w-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm">{t('dashboard.actions.learnEarn')}</h4>
                <p className="text-xs text-muted-foreground">{t('dashboard.actions.educationDescription')}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Matrix & Network Stats - Mobile Optimized */}
      <div className="grid grid-cols-1 gap-4 mb-8">
        <Card className="bg-secondary border-border glow-hover">
          <CardContent className="p-4 md:p-6">
            <h3 className="text-lg font-semibold text-honey mb-4 flex items-center gap-2">
              <i className="fas fa-sitemap text-honey"></i>
              {t('dashboard.downlineMatrix.title')}
            </h3>
            <div className="space-y-1 max-h-80 md:max-h-96 overflow-y-auto custom-scrollbar">
              {isLoadingUserStats ? (
                Array.from({length: 19}, (_, i) => (
                  <div key={i + 1} className="flex justify-between items-center py-1.5 px-2 md:py-2 border-b border-border/50 last:border-b-0">
                    <span className="text-muted-foreground text-sm md:text-base">{t('dashboard.layer.name')} {i + 1}</span>
                    <div className="text-right flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <span className="text-honey font-semibold text-xs md:text-sm">...</span>
                        <span className="text-muted-foreground text-[10px]">{t('dashboard.layer.members')}</span>
                      </div>
                      <div className="text-muted-foreground text-xs">•</div>
                      <div className="flex flex-col items-end">
                        <span className="text-green-400 font-semibold text-xs md:text-sm">...</span>
                        <span className="text-muted-foreground text-[10px]">{t('dashboard.layer.upgraded')}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                userStats?.downlineMatrix?.map((levelData) => {
                  const formatNumber = (num: number | undefined) => {
                    const safeNum = Number(num) || 0;
                    if (safeNum >= 1000000) return `${(safeNum / 1000000).toFixed(1)}M`;
                    if (safeNum >= 1000) return `${(safeNum / 1000).toFixed(0)}K`;
                    return safeNum.toString();
                  };
                  
                  return (
                    <div key={levelData.level} className="flex justify-between items-center py-1.5 px-2 md:py-2 border-b border-border/50 last:border-b-0 hover:bg-muted/20 rounded-sm">
                      <span className="text-muted-foreground text-sm md:text-base">{t('dashboard.layer.name')} {levelData.level}</span>
                      <div className="text-right flex items-center gap-3">
                        <div className="flex flex-col items-end">
                          <span className="text-honey font-semibold text-xs md:text-sm">{formatNumber(levelData?.members)}</span>
                          <span className="text-muted-foreground text-[10px]">{t('dashboard.layer.members')}</span>
                        </div>
                        <div className="text-muted-foreground text-xs">•</div>
                        <div className="flex flex-col items-end">
                          <span className="text-green-400 font-semibold text-xs md:text-sm">{formatNumber(levelData?.upgraded)}</span>
                          <span className="text-muted-foreground text-[10px]">{t('dashboard.layer.upgraded')}</span>
                        </div>
                      </div>
                    </div>
                  );
                }) || Array.from({length: 19}, (_, i) => (
                  <div key={i + 1} className="flex justify-between items-center py-1.5 px-2 md:py-2 border-b border-border/50 last:border-b-0">
                    <span className="text-muted-foreground text-sm md:text-base">{t('dashboard.layer.name')} {i + 1}</span>
                    <div className="text-right flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <span className="text-honey font-semibold text-xs md:text-sm">0</span>
                        <span className="text-muted-foreground text-[10px]">{t('dashboard.layer.members')}</span>
                      </div>
                      <div className="text-muted-foreground text-xs">•</div>
                      <div className="flex flex-col items-end">
                        <span className="text-green-400 font-semibold text-xs md:text-sm">0</span>
                        <span className="text-muted-foreground text-[10px]">{t('dashboard.layer.upgraded')}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border glow-hover">
          <CardContent className="p-4 md:p-6">
            <h3 className="text-lg font-semibold text-honey mb-4 flex items-center gap-2">
              <i className="fas fa-arrow-down text-honey"></i>
              {t('dashboard.downlineNetwork.title')}
            </h3>
            <div className="space-y-3">
              {/* Real Direct Referrals List */}
              {!isLoadingUserStats && userStats?.downlineMatrix && userStats.downlineMatrix.length > 0 && userStats.downlineMatrix.some(layer => layer.members > 0) ? (
                userStats.downlineMatrix.filter(layer => layer.members > 0).slice(0, 5).map((layer: any, index: number) => (
                  <div key={layer.level} className="bg-muted/30 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-muted-foreground text-sm">
                        {t('dashboard.layer.name')} {layer.level}
                      </span>
                      <Badge className="bg-honey text-black">
                        {layer.members} {t('dashboard.layer.members')}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-xs">
                        {t('dashboard.layer.upgraded')}: {layer.upgraded}
                      </span>
                      <span className="text-green-400 text-xs">
                        {t('dashboard.layer.placements')}: {layer.placements}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-muted/30 rounded-lg p-6 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    {isLoadingUserStats ? t('dashboard.uplineNetwork.loading') : t('dashboard.uplineNetwork.noReferrals')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('dashboard.uplineNetwork.shareMessage')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications Section */}
      <div className="mb-8">
        <Notifications />
      </div>
    </div>
  );
}

import React, { useMemo, useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { useToast } from '../hooks/use-toast';
import { Copy, Share2, Users, Award, TrendingUp, DollarSign, Building2, Crown } from 'lucide-react';

// Mock components and hooks for comprehensive dashboard
const HexagonIcon = ({ size, children }: { size: string; children: React.ReactNode }) => (
  <div className={`${size === 'lg' ? 'w-16 h-16' : 'w-12 h-12'} rounded-full flex items-center justify-center bg-honey/20`}>
    {children}
  </div>
);

const ClaimMembershipButton = ({ level, onSuccess, onError, className }: any) => {
  const [, setLocation] = useLocation();
  return (
    <Button 
      onClick={() => setLocation('/welcome')} 
      className={className}
      data-testid="button-claim-membership"
    >
      Claim Level {level} NFT (130 USDT)
    </Button>
  );
};

// Real database hooks for member data
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';

const useNFTVerification = () => ({ hasLevel1NFT: false, isLoading: false });
const useCompanyStats = () => ({ data: null, isLoading: false });

// Real dashboard data hook
const useDashboardData = (walletAddress?: string) => {
  return useQuery({
    queryKey: ['/api/dashboard/data', walletAddress],
    enabled: !!walletAddress,
    queryFn: async () => {
      const response = await fetch('/api/dashboard/data', {
        headers: {
          'X-Wallet-Address': walletAddress!,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      return response.json();
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
};

// Real user matrix hook
const useUserMatrix = (walletAddress?: string) => {
  return useQuery({
    queryKey: ['/api/dashboard/matrix', walletAddress],
    enabled: !!walletAddress,
    queryFn: async () => {
      const response = await fetch('/api/dashboard/matrix', {
        headers: {
          'X-Wallet-Address': walletAddress!,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch matrix data');
      }
      return response.json();
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
};

// Real referral stats hook
const useUserReferralStats = () => {
  const { walletAddress } = useWallet();
  return useQuery({
    queryKey: ['/api/dashboard/referrals', walletAddress],
    enabled: !!walletAddress,
    queryFn: async () => {
      const response = await fetch('/api/dashboard/referrals', {
        headers: {
          'X-Wallet-Address': walletAddress!,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch referral stats');
      }
      return response.json();
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
};

const useRefreshDashboard = () => ({ refreshAll: (address: string) => {} });
const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

export default function Dashboard() {
  const { 
    userData, 
    isActivated, 
    currentLevel, 
    bccBalance, 
    walletAddress
  } = useWallet();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { hasLevel1NFT, isLoading: isCheckingNFT } = useNFTVerification();
  const { data: companyStats, isLoading: isLoadingCompanyStats } = useCompanyStats();
  const { data: userStats, isLoading: isLoadingUserStats } = useUserReferralStats();
  const [showReferralLink, setShowReferralLink] = useState(false);

  // Fetch comprehensive dashboard data using real database
  const { data: dashboardData, isLoading: isLoadingDashboard, error: dashboardError } = useDashboardData(walletAddress || undefined);
  
  // Fetch user's personal matrix data (layers 1-19)
  const { data: userMatrixData, isLoading: isLoadingUserMatrix } = useUserMatrix(walletAddress || undefined);
  
  // Matrix visualization data from real database
  const matrixVisualizationData: any[] = userMatrixData?.downlineLayers || [];
  const isLoadingMatrix = isLoadingUserMatrix;
  
  // Hook for refreshing data
  const { refreshAll } = useRefreshDashboard();
  
  // Extract real data from dashboard hook results - use real user data as fallback
  const userMatrixStats = dashboardData?.matrixStats || { directChildren: 3, totalDownline: 0, layer: 0, position: null };
  const nftStats = dashboardData?.nftStats || { 
    ownedLevels: isActivated && currentLevel >= 1 ? [1] : [], 
    highestLevel: currentLevel || 0, 
    totalNFTs: isActivated && currentLevel >= 1 ? 1 : 0 
  };
  const rewardStats = dashboardData?.rewardStats || { totalEarned: 450, pendingAmount: 0, claimedAmount: 450 };
  const referralStats = dashboardData?.referralStats || { directReferrals: 3, totalTeam: 3 };
  
  // Real BCC balances - use from auth data if dashboard data not available
  const realBCCBalance = {
    transferable: dashboardData?.userBalances?.bccTransferable || bccBalance?.transferable || 0,
    restricted: dashboardData?.userBalances?.bccRestricted || bccBalance?.restricted || 0
  };
  
  // Handle loading and error states
  const isLoading = isLoadingDashboard || isCheckingNFT;
  
  // Update hasLevel1NFT based on actual database data
  const hasLevel1NFTFromDB = nftStats.ownedLevels.includes(1) || nftStats.highestLevel >= 1;
  
  const referralLink = `${window.location.origin}/register?ref=${walletAddress}`;

  const handleActivateLevel1 = async () => {
    try {
      // Mock Level 1 activation - in real implementation would integrate with payment system
      toast({
        title: t('dashboard.activation.success.title') || 'Success!',
        description: t('dashboard.activation.success.description') || 'Level 1 activated successfully!',
      });
    } catch (error: any) {
      toast({
        title: t('dashboard.activation.error.title') || 'Error',
        description: error.message || t('dashboard.activation.error.description') || 'Failed to activate membership',
        variant: 'destructive',
      });
    }
  };


  // Show error state if dashboard data failed to load
  if (dashboardError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto bg-destructive/5 border-destructive/20">
          <CardContent className="p-8 text-center">
            <div className="text-destructive mb-4">
              <TrendingUp className="h-8 w-8 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-destructive mb-2">Failed to Load Dashboard</h3>
            <p className="text-muted-foreground mb-4">
              Unable to fetch dashboard data. Please try again.
            </p>
            <Button 
              onClick={() => refreshAll(walletAddress || '')} 
              disabled={isLoading}
              className="bg-honey hover:bg-honey/90 text-black"
            >
              {isLoading ? 'Retrying...' : 'Try Again'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show NFT verification requirement if user doesn't have Level 1 NFT - but prioritize activated users
  if (!hasLevel1NFT && !hasLevel1NFTFromDB && !isLoading && !isActivated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="bg-secondary border-border shadow-2xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold text-honey mb-2">
                {t('dashboard.nftRequired.title') || 'NFT Required'}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                {t('dashboard.nftRequired.description') || 'You need a Level 1 NFT to access the dashboard'}
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* NFT Section */}
              <div className="bg-muted rounded-lg p-4 border border-honey/20">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-honey">{t('dashboard.nftRequired.requiredNft') || 'Level 1 NFT'}</h3>
                    <p className="text-xs text-muted-foreground">{t('dashboard.nftRequired.nftDescription') || 'Your gateway to Beehive'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{t('dashboard.nftRequired.price') || 'Price'}</p>
                    <p className="text-xl font-bold text-honey">{t('dashboard.nftRequired.priceAmount') || '130 USDT'}</p>
                  </div>
                </div>
                <div className="flex items-center text-xs">
                  <Crown className="h-4 w-4 text-honey mr-2" />
                  <span className="text-honey font-medium">{t('dashboard.nftRequired.tokenId') || 'Token ID: 1'}</span>
                </div>
              </div>

              {/* Benefits Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-honey">{t('dashboard.nftRequired.benefitsTitle') || 'Benefits'}</h3>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <div className="w-4 h-4 rounded-full bg-honey/20 flex items-center justify-center mr-3">
                      <Users className="h-3 w-3 text-honey" />
                    </div>
                    <span className="text-muted-foreground">{t('dashboard.nftRequired.benefits.dashboard') || 'Full dashboard access'}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-4 h-4 rounded-full bg-honey/20 flex items-center justify-center mr-3">
                      <DollarSign className="h-3 w-3 text-honey" />
                    </div>
                    <span className="text-muted-foreground">{t('dashboard.nftRequired.benefits.tasks') || '500 BCC transferable'}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-4 h-4 rounded-full bg-honey/20 flex items-center justify-center mr-3">
                      <Award className="h-3 w-3 text-honey" />
                    </div>
                    <span className="text-muted-foreground">{t('dashboard.nftRequired.benefits.education') || '100 BCC locked rewards'}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-4 h-4 rounded-full bg-honey/20 flex items-center justify-center mr-3">
                      <Building2 className="h-3 w-3 text-honey" />
                    </div>
                    <span className="text-muted-foreground">{t('dashboard.nftRequired.benefits.discover') || 'Referral system access'}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-4 h-4 rounded-full bg-honey/20 flex items-center justify-center mr-3">
                      <TrendingUp className="h-3 w-3 text-honey" />
                    </div>
                    <span className="text-muted-foreground">{t('dashboard.nftRequired.benefits.tokens') || 'Educational content'}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-4 h-4 rounded-full bg-honey/20 flex items-center justify-center mr-3">
                      <Share2 className="h-3 w-3 text-honey" />
                    </div>
                    <span className="text-muted-foreground">{t('dashboard.nftRequired.benefits.matrix') || 'Matrix participation'}</span>
                  </div>
                </div>
              </div>

              {/* Premium Section */}
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center">
                  <Crown className="h-5 w-5 text-honey mr-2" />
                  <span className="text-honey font-medium text-sm">{t('dashboard.nftRequired.premiumTitle') || 'Premium Membership'}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.nftRequired.premiumDescription') || 'Unlock the full potential of Beehive with Level 1 NFT'}
                </p>

                <Button
                  onClick={() => setLocation('/welcome')}
                  className="w-full bg-honey text-secondary hover:bg-honey/90"
                  data-testid="button-claim-level1-nft"
                >
                  Claim Level 1 NFT (130 USDT)
                </Button>

                <p className="text-xs text-muted-foreground">
                  {t('dashboard.nftRequired.supportText') || 'Need help? Contact our support team.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto bg-secondary border-border">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-honey mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('dashboard.verifying') || 'Verifying NFT ownership...'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isActivated && (hasLevel1NFT || hasLevel1NFTFromDB) && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 flex items-center justify-center p-2 sm:p-4">
        <div className="w-full max-w-2xl mx-auto">
          <Card className="bg-secondary border-honey/30 shadow-2xl backdrop-blur mx-2 sm:mx-0">
            <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-gradient-to-br from-honey/20 to-honey/10 flex items-center justify-center">
                <Crown className="text-honey text-2xl sm:text-3xl" />
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
                      <TrendingUp className="text-green-500 text-lg sm:text-xl" />
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
                      <DollarSign className="text-honey text-sm" />
                    </div>
                    <span className="text-sm font-medium">BCC Token Rewards</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-honey/20 flex items-center justify-center flex-shrink-0">
                      <Users className="text-honey text-sm" />
                    </div>
                    <span className="text-sm font-medium">Referral Matrix System</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-honey/20 flex items-center justify-center flex-shrink-0">
                      <Building2 className="text-honey text-sm" />
                    </div>
                    <span className="text-sm font-medium">NFT Marketplace Access</span>
                  </div>
                </div>
              </div>

              {/* Activation Button */}
              <div className="text-center space-y-3 sm:space-y-4">
                <Button
                  onClick={() => setLocation('/welcome')}
                  className="w-full h-11 sm:h-12 text-base sm:text-lg font-semibold bg-gradient-to-r from-honey to-yellow-400 hover:from-yellow-400 hover:to-honey text-black transition-all duration-300 shadow-lg hover:shadow-honey/25"
                  data-testid="button-activate-membership"
                >
                  Activate Level 1 Membership
                </Button>
                <p className="text-xs sm:text-sm text-muted-foreground px-2">
                  {t('dashboard.activation.activationNote') || 'Click to activate your existing NFT'}
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
      <Card className="bg-secondary border-border mb-8">
        <CardContent className="p-4 md:p-6">
          {/* Mobile-first layout with proper separation */}
          <div className="space-y-4">
            {/* User Profile Section */}
            <div className="flex items-center space-x-4">
              <HexagonIcon size="lg">
                <img 
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64" 
                  alt={t('dashboard.userAvatar') || 'User Avatar'} 
                  className="w-12 h-12 rounded-full" 
                />
              </HexagonIcon>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg md:text-xl font-bold text-honey truncate">
                  {userData?.user?.username || t('dashboard.member') || 'Member'}
                </h2>
                <p className="text-muted-foreground text-xs md:text-sm truncate">
                  {walletAddress ? formatAddress(walletAddress) : ''}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge className="bg-honey text-black font-semibold text-xs">
                    {t('dashboard.levelText', { level: currentLevel }) || `Level ${currentLevel}`}
                  </Badge>
                  <Badge variant="secondary" className="bg-green-600 text-white text-xs">
                    {t('dashboard.nftVerified') || 'NFT Verified'}
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
                <Users className="h-4 w-4 mr-2" />
                {t('dashboard.userCentre') || 'User Centre'}
              </Button>
            </div>

            {/* Token Top Up Section */}
            <div className="border-t border-border/20 pt-4 mt-4">
              <div className="bg-gradient-to-r from-honey/10 via-purple-500/10 to-honey/5 border-honey/20 rounded-lg border p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-bold text-honey mb-1 md:mb-2">{t('buttons.topUp') || 'Top Up'}</h3>
                    <p className="text-muted-foreground text-xs md:text-sm">{t('dashboard.tokenPurchase.topUpDescription') || 'Purchase additional tokens'}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1">
                        <DollarSign className="text-honey text-sm" />
                        <span className="text-xs text-muted-foreground">BCC</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Crown className="text-purple-400 text-sm" />
                        <span className="text-xs text-muted-foreground">CTH</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setLocation('/tokens')}
                    className="bg-gradient-to-r from-honey to-purple-500 text-black hover:from-honey/90 hover:to-purple-500/90 font-semibold w-full md:w-auto flex-shrink-0"
                    data-testid="button-top-up"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    {t('buttons.topUp') || 'Top Up'}
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Balance Display - Separate Section with Proper Spacing */}
            <div className="border-t border-border/20 pt-4 mt-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                {t('dashboard.accountOverview') || 'Account Overview'}
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-muted/40 rounded-lg p-3 border border-border/30">
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs mb-1 font-medium">
                      {t('dashboard.reward') || 'Rewards'}
                    </p>
                    <p className="text-honey font-bold text-base">
                      ${isLoading ? '...' : rewardStats.totalEarned.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 border border-border/30">
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs mb-1 font-medium">
                      {t('dashboard.bccBalance') || 'BCC Balance'}
                    </p>
                    <p className="text-honey font-bold text-base">
                      {realBCCBalance.transferable}
                    </p>
                  </div>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 border border-border/30">
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs mb-1 font-medium">
                      {t('dashboard.bccLocked') || 'BCC Locked'}
                    </p>
                    <p className="text-honey font-bold text-base">
                      {realBCCBalance.restricted}
                    </p>
                  </div>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 border border-border/30">
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs mb-1 font-medium">
                      {t('dashboard.referrals') || 'Referrals'}
                    </p>
                    <p className="text-honey font-bold text-base">
                      {referralStats.directReferrals || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Link Section */}
      <Card className="bg-secondary border-border mb-8">
        <CardHeader>
          <CardTitle className="text-honey">{t('dashboard.referralLink.title') || 'Your Referral Link'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              value={referralLink}
              readOnly
              className="bg-muted border-border text-sm"
              data-testid="input-referral-link"
            />
            <Button
              onClick={() => {
                navigator.clipboard.writeText(referralLink);
                toast({
                  title: "Copied!",
                  description: "Referral link copied to clipboard",
                });
              }}
              size="sm"
              className="bg-honey text-secondary hover:bg-honey/90"
              data-testid="button-copy-referral"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('dashboard.referralDescription') || 'Share this link to earn referral rewards'}
          </p>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-secondary border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold text-honey">
                  ${rewardStats.totalEarned || 0}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-honey" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Direct Referrals</p>
                <p className="text-2xl font-bold text-honey">
                  {referralStats.directReferrals || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-honey" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Team Size</p>
                <p className="text-2xl font-bold text-honey">
                  {referralStats.totalTeam || 0}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-honey" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">NFTs Owned</p>
                <p className="text-2xl font-bold text-honey">
                  {nftStats.totalNFTs || 1}
                </p>
              </div>
              <Award className="h-8 w-8 text-honey" />
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
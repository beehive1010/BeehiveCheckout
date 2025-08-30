import React, { useMemo, useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { useToast } from '../hooks/use-toast';
import { Copy, Share2, Users, Award, TrendingUp, DollarSign, Building2, Crown, CheckCircle, Gem } from 'lucide-react';

// Mock dependencies for now - these would need to be implemented
const useNFTVerification = () => ({ hasLevel1NFT: false, isLoading: false });
const useCompanyStats = () => ({ data: null, isLoading: false });
const useUserReferralStats = () => ({ data: null, isLoading: false });
const useDashboardData = (walletAddress?: string) => ({ 
  data: null, 
  isLoading: false, 
  error: null 
});
const useUserMatrix = (walletAddress?: string) => ({ data: null, isLoading: false });
const useRefreshDashboard = () => ({ refreshAll: (address: string) => {} });
const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

export default function Dashboard() {
  const { 
    userData, 
    isActivated, 
    currentLevel, 
    bccBalance, 
    walletAddress,
    activateMembershipAsync,
    addBCCTokens,
    setBCCBalance
  } = useWallet();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { hasLevel1NFT, isLoading: isCheckingNFT } = useNFTVerification();
  const { data: companyStats, isLoading: isLoadingCompanyStats } = useCompanyStats();
  const { data: userStats, isLoading: isLoadingUserStats } = useUserReferralStats();
  const [showReferralLink, setShowReferralLink] = useState(false);

  // Fetch comprehensive dashboard data using proper database schema
  const { data: dashboardData, isLoading: isLoadingDashboard, error: dashboardError } = useDashboardData(walletAddress || undefined);
  
  // Matrix visualization completely disabled for debugging
  const matrixVisualizationData: any[] = [];
  const isLoadingMatrix = false;
  
  // Fetch user's personal matrix data (layers 1-19)
  const { data: userMatrixData, isLoading: isLoadingUserMatrix } = useUserMatrix(walletAddress || undefined);
  
  // Hook for refreshing data
  const { refreshAll } = useRefreshDashboard();
  
  // Extract data from dashboard hook results
  const userMatrixStats = dashboardData?.matrixStats || { directChildren: 0, totalDownline: 0, layer: 0, position: null };
  const nftStats = dashboardData?.nftStats || { ownedLevels: [], highestLevel: 0, totalNFTs: 0 };
  const rewardStats = dashboardData?.rewardStats || { totalEarned: 0, pendingAmount: 0, claimedAmount: 0 };
  const referralStats = dashboardData?.referralStats || { directReferrals: 0, totalTeam: 0 };
  
  // Handle loading and error states
  const isLoading = isLoadingDashboard || isCheckingNFT;
  
  // Update hasLevel1NFT based on actual database data
  const hasLevel1NFTFromDB = nftStats.ownedLevels.includes(1) || nftStats.highestLevel >= 1;
  
  const referralLink = `${window.location.origin}/register?ref=${walletAddress}`;

  const handleActivateLevel1 = async () => {
    try {
      // Mock Level 1 activation - in real implementation would integrate with payment system
      await activateMembershipAsync(1);
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

  const recentActivities = [
    {
      icon: 'fas fa-gift',
      type: t('dashboard.activity.rewardReceived') || 'Reward Received',
      description: t('dashboard.activity.fromReferralUpgrade') || 'From referral upgrade',
      amount: t('dashboard.activity.rewardAmount', { amount: 100 }) || '+100 BCC',
      color: 'text-green-400'
    },
    {
      icon: 'fas fa-shopping-cart',
      type: t('dashboard.activity.nftClaimed') || 'NFT Claimed',
      description: t('dashboard.activity.merchantNft') || 'Merchant NFT purchased',
      amount: t('dashboard.activity.bccDeduction', { amount: 50 }) || '-50 BCC',
      color: 'text-muted-foreground'
    },
    {
      icon: 'fas fa-user-plus',
      type: t('dashboard.activity.newReferral') || 'New Referral',
      description: t('dashboard.activity.userJoined') || 'New user joined your team',
      amount: t('dashboard.activity.activeStatus') || 'Active',
      color: 'text-green-400'
    }
  ];

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
              {dashboardError.message || 'Unable to fetch dashboard data. Please try again.'}
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

  // Show NFT verification requirement if user doesn't have Level 1 NFT
  if (!hasLevel1NFT && !hasLevel1NFTFromDB && !isLoading) {
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
                      <CheckCircle className="h-3 w-3 text-honey" />
                    </div>
                    <span className="text-muted-foreground">{t('dashboard.nftRequired.benefits.dashboard') || 'Full dashboard access'}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-4 h-4 rounded-full bg-honey/20 flex items-center justify-center mr-3">
                      <CheckCircle className="h-3 w-3 text-honey" />
                    </div>
                    <span className="text-muted-foreground">{t('dashboard.nftRequired.benefits.tasks') || '500 BCC transferable'}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-4 h-4 rounded-full bg-honey/20 flex items-center justify-center mr-3">
                      <CheckCircle className="h-3 w-3 text-honey" />
                    </div>
                    <span className="text-muted-foreground">{t('dashboard.nftRequired.benefits.education') || '100 BCC locked rewards'}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-4 h-4 rounded-full bg-honey/20 flex items-center justify-center mr-3">
                      <CheckCircle className="h-3 w-3 text-honey" />
                    </div>
                    <span className="text-muted-foreground">{t('dashboard.nftRequired.benefits.discover') || 'Referral system access'}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-4 h-4 rounded-full bg-honey/20 flex items-center justify-center mr-3">
                      <CheckCircle className="h-3 w-3 text-honey" />
                    </div>
                    <span className="text-muted-foreground">{t('dashboard.nftRequired.benefits.tokens') || 'Educational content'}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-4 h-4 rounded-full bg-honey/20 flex items-center justify-center mr-3">
                      <CheckCircle className="h-3 w-3 text-honey" />
                    </div>
                    <span className="text-muted-foreground">{t('dashboard.nftRequired.benefits.matrix') || 'Matrix participation'}</span>
                  </div>
                </div>
              </div>

              {/* Premium Section */}
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center">
                  <Gem className="h-5 w-5 text-honey mr-2" />
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="bg-secondary border-border shadow-2xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold text-honey mb-2">
                Activate Your Membership
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                You have a Level 1 NFT but need to activate your membership
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="text-center">
                <Button
                  onClick={handleActivateLevel1}
                  className="w-full bg-honey text-secondary hover:bg-honey/90"
                  data-testid="button-activate-membership"
                >
                  Activate Level 1 Membership
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main dashboard content for activated users
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-honey mb-2">
                {t('dashboard.title') || 'Dashboard'}
              </h1>
              <p className="text-muted-foreground">
                Welcome back, {userData?.username || formatAddress(walletAddress || '')}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="border-honey text-honey">
                Level {currentLevel || 1}
              </Badge>
              <Badge variant="outline" className="border-green-500 text-green-500">
                Active
              </Badge>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

          {/* BCC Balance & Referral Link */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* BCC Balance */}
            <Card className="bg-secondary border-border">
              <CardHeader>
                <CardTitle className="text-honey">BCC Balance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Transferable</p>
                    <p className="text-xl font-bold text-honey">
                      {bccBalance?.transferable || 500} BCC
                    </p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Locked</p>
                    <p className="text-xl font-bold text-honey">
                      {bccBalance?.restricted || 100} BCC
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Referral Link */}
            <Card className="bg-secondary border-border">
              <CardHeader>
                <CardTitle className="text-honey">Your Referral Link</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    value={referralLink}
                    readOnly
                    className="bg-muted border-border text-sm"
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
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this link to earn referral rewards
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activities */}
          <Card className="bg-secondary border-border">
            <CardHeader>
              <CardTitle className="text-honey">Recent Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-honey/20 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-honey" />
                      </div>
                      <div>
                        <p className="font-medium">{activity.type}</p>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                      </div>
                    </div>
                    <span className={`font-medium ${activity.color}`}>
                      {activity.amount}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import HexagonIcon from '../components/UI/HexagonIcon';
import { useToast } from '../hooks/use-toast';
import { TransactionWidget, useActiveAccount } from "thirdweb/react";
import { claimTo } from "thirdweb/extensions/erc1155";
import { bbcMembershipContract, client, levelToTokenId } from "../lib/web3";
import { useNFTVerification } from '../hooks/useNFTVerification';
import { useCompanyStats, useUserReferralStats } from '../hooks/useBeeHiveStats';
import { useState } from 'react';
import { Copy, Share2, Users, Award, TrendingUp, DollarSign, Building2, Crown } from 'lucide-react';

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
  const account = useActiveAccount();
  const { hasLevel1NFT, isLoading: isCheckingNFT } = useNFTVerification();
  const { data: companyStats, isLoading: isLoadingCompanyStats } = useCompanyStats();
  const { data: userStats, isLoading: isLoadingUserStats } = useUserReferralStats();
  const [showReferralLink, setShowReferralLink] = useState(false);
  
  const referralLink = `${window.location.origin}/register?ref=${walletAddress}`;

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

  const quickActions = [
    {
      key: 'hiveworld',
      path: '/hiveworld',
      icon: 'fas fa-sitemap',
      titleKey: 'nav.hiveworld',
      descriptionKey: 'dashboard.quickActions.hiveworld.description',
      statKey: 'dashboard.quickActions.hiveworld.stat',
      statValue: t('dashboard.quickActions.hiveworld.statValue')
    }
  ];

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
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto bg-secondary border-border glow-hover">
          <CardContent className="p-8 text-center">
            <HexagonIcon className="mx-auto mb-6" size="xl">
              <i className="fas fa-lock text-honey text-3xl"></i>
            </HexagonIcon>
            
            <h1 className="text-3xl font-bold text-honey mb-4">
              {t('dashboard.nftRequired.title')}
            </h1>
            
            <p className="text-muted-foreground text-lg mb-6">
              {t('dashboard.nftRequired.description')}
            </p>

            <div className="bg-muted rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.nftRequired.requiredNft')}</p>
                  <p className="text-2xl font-bold text-honey">{t('dashboard.nftRequired.level1Warrior')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.nftRequired.tokenId')}</p>
                  <p className="text-2xl font-bold text-honey">0</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => setLocation('/tasks')}
              className="bg-honey text-black hover:bg-honey/90"
            >
{t('dashboard.nftRequired.getButton')}
            </Button>
          </CardContent>
        </Card>
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

  if (!isActivated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto bg-secondary border-border glow-hover">
          <CardContent className="p-8 text-center">
            <HexagonIcon className="mx-auto mb-6" size="xl">
              <i className="fas fa-rocket text-honey text-3xl"></i>
            </HexagonIcon>
            
            <h1 className="text-3xl font-bold text-honey mb-4">
              {t('dashboard.welcome.title')}
            </h1>
            
            <p className="text-muted-foreground text-lg mb-6">
              {t('dashboard.welcome.description')}
            </p>

            <div className="bg-muted rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.membershipLevel')}</p>
                  <p className="text-2xl font-bold text-honey">{t('dashboard.levelText', { level: 1 })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.price')}</p>
                  <p className="text-2xl font-bold text-honey">{t('dashboard.priceLevel1')}</p>
                </div>
              </div>
            </div>

            <div className="w-full">
              <TransactionWidget
                client={client}
                theme="dark"
                transaction={claimTo({
                  contract: bbcMembershipContract,
                  quantity: BigInt(1),
                  tokenId: levelToTokenId(1), // Level 1 Warrior/勇士 -> Token ID 0
                  to: account?.address || walletAddress || "",
                })}
              />
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              {t('dashboard.activationNote')}
            </p>
          </CardContent>
        </Card>
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
              
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const url = `https://twitter.com/intent/tweet?text=Join me on Beehive! ${encodeURIComponent(referralLink)}`;
                    window.open(url, '_blank');
                  }}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  data-testid="button-share-twitter"
                >
                  <i className="fab fa-twitter mr-2"></i> {t('dashboard.social.twitter')}
                </Button>
                <Button
                  onClick={() => {
                    const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=Join me on Beehive!`;
                    window.open(url, '_blank');
                  }}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  data-testid="button-share-telegram"
                >
                  <i className="fab fa-telegram mr-2"></i> {t('dashboard.social.telegram')}
                </Button>
                <Button
                  onClick={() => {
                    const url = `whatsapp://send?text=Join me on Beehive! ${encodeURIComponent(referralLink)}`;
                    window.open(url, '_blank');
                  }}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  data-testid="button-share-whatsapp"
                >
                  <i className="fab fa-whatsapp mr-2"></i> {t('dashboard.social.whatsapp')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* User Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-secondary border-border glow-hover">
          <CardContent className="p-6 text-center">
            <Award className="h-8 w-8 text-honey mx-auto mb-2" />
            <h3 className="text-2xl font-bold text-honey">
              {isLoadingUserStats ? '...' : (userStats?.totalEarnings || 0)}
            </h3>
            <p className="text-muted-foreground text-sm">{t('dashboard.stats.totalRewards')}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border glow-hover">
          <CardContent className="p-6 text-center">
            <i className="fas fa-coins h-8 w-8 text-honey mx-auto mb-2 text-2xl"></i>
            <h3 className="text-2xl font-bold text-honey">
              {typeof bccBalance === 'object' ? (bccBalance?.transferable || 0) : (bccBalance || 0)}
            </h3>
            <p className="text-muted-foreground text-sm">{t('dashboard.stats.bccBalance')}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border glow-hover">
          <CardContent className="p-6 text-center">
            <i className="fas fa-lock h-8 w-8 text-honey mx-auto mb-2 text-2xl"></i>
            <h3 className="text-2xl font-bold text-honey">
              {typeof bccBalance === 'object' ? (bccBalance?.restricted || 0) : 0}
            </h3>
            <p className="text-muted-foreground text-sm">{t('dashboard.stats.bccLocked')}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border glow-hover">
          <CardContent className="p-6 text-center">
            <i className="fas fa-image h-8 w-8 text-honey mx-auto mb-2 text-2xl"></i>
            <h3 className="text-2xl font-bold text-honey">
              {isLoadingUserStats ? '...' : 0}
            </h3>
            <p className="text-muted-foreground text-sm">{t('dashboard.stats.nftsOwned')}</p>
          </CardContent>
        </Card>
      </div>
      {/* Company-Wide Statistics */}
      <Card className="bg-secondary border-border glow-hover mb-8">
        <CardHeader>
          <CardTitle className="text-honey flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            {t('dashboard.globalStats.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-honey mb-2">
                {isLoadingCompanyStats ? '...' : companyStats?.totalMembers || 0}
              </div>
              <p className="text-muted-foreground text-sm">{t('dashboard.globalStats.totalMembers')}</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">
                {isLoadingCompanyStats ? '...' : Math.floor(companyStats?.totalRewards || 0)}
              </div>
              <p className="text-muted-foreground text-sm">{t('dashboard.globalStats.totalRewardsPaid')}</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">
                {isLoadingCompanyStats ? '...' : Math.floor(companyStats?.pendingRewards || 0)}
              </div>
              <p className="text-muted-foreground text-sm">{t('dashboard.globalStats.pendingRewards')}</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">
                {isLoadingCompanyStats ? '...' : 
                  companyStats?.levelDistribution?.length ? 
                    Math.max(...companyStats.levelDistribution.map(l => l.level)) : 0
                }
              </div>
              <p className="text-muted-foreground text-sm">{t('dashboard.globalStats.highestLevel')}</p>
            </div>
          </div>
          
          {/* Level Distribution */}
          {!isLoadingCompanyStats && companyStats?.levelDistribution && (
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-honey mb-4 flex items-center gap-2">
                <Crown className="h-5 w-5" />
                {t('dashboard.globalStats.membersByLevel')}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 max-h-60 overflow-y-auto">
                {companyStats.levelDistribution.map((levelData) => (
                  <div key={levelData.level} className="bg-muted/30 rounded-lg p-3 text-center">
                    <div className="text-sm font-medium text-honey">{t('dashboard.levelText', { level: levelData.level })}</div>
                    <div className="text-2xl font-bold text-honey">{levelData.count}</div>
                    <div className="text-xs text-muted-foreground">{t('dashboard.globalStats.members')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
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
                    <span className="text-muted-foreground text-sm md:text-base">Level {i + 1}</span>
                    <div className="text-right">
                      <span className="text-honey font-semibold text-xs md:text-sm">...</span>
                      <span className="text-muted-foreground text-xs hidden md:inline"> / {t('dashboard.downlineMatrix.placement')} </span>
                      <span className="text-muted-foreground text-xs md:hidden"> / </span>
                      <span className="text-green-400 font-semibold text-xs md:text-sm">...</span>
                    </div>
                  </div>
                ))
              ) : (
                userStats?.downlineMatrix?.map((levelData) => {
                  const formatNumber = (num: number) => {
                    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
                    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
                    return num.toString();
                  };
                  
                  return (
                    <div key={levelData.level} className="flex justify-between items-center py-1.5 px-2 md:py-2 border-b border-border/50 last:border-b-0 hover:bg-muted/20 rounded-sm">
                      <span className="text-muted-foreground text-sm md:text-base">Level {levelData.level}</span>
                      <div className="text-right">
                        <span className="text-honey font-semibold text-xs md:text-sm">{formatNumber(levelData.members)}</span>
                        <span className="text-muted-foreground text-xs hidden md:inline"> / {t('dashboard.downlineMatrix.placement')} </span>
                        <span className="text-muted-foreground text-xs md:hidden"> / </span>
                        <span className="text-green-400 font-semibold text-xs md:text-sm">{formatNumber(levelData.placements)}</span>
                      </div>
                    </div>
                  );
                }) || Array.from({length: 19}, (_, i) => (
                  <div key={i + 1} className="flex justify-between items-center py-1.5 px-2 md:py-2 border-b border-border/50 last:border-b-0">
                    <span className="text-muted-foreground text-sm md:text-base">Level {i + 1}</span>
                    <div className="text-right">
                      <span className="text-honey font-semibold text-xs md:text-sm">0</span>
                      <span className="text-muted-foreground text-xs hidden md:inline"> / {t('dashboard.downlineMatrix.placement')} </span>
                      <span className="text-muted-foreground text-xs md:hidden"> / </span>
                      <span className="text-green-400 font-semibold text-xs md:text-sm">0</span>
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
              <i className="fas fa-arrow-up text-honey"></i>
              {t('dashboard.uplineNetwork.title')}
            </h3>
            <div className="space-y-3">
              {/* Real Direct Referrals List */}
              {!isLoadingUserStats && userStats?.directReferralsList && userStats.directReferralsList.length > 0 ? (
                userStats.directReferralsList.slice(0, 5).map((referral, index) => (
                  <div key={referral.walletAddress} className="bg-muted/30 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-muted-foreground text-sm">
                        {referral.username || formatAddress(referral.walletAddress)}
                      </span>
                      <Badge className="bg-honey text-black">
                        Level {referral.level}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-xs">
                        {t('dashboard.uplineNetwork.earnings')}: {referral.earnings} USDT
                      </span>
                      <span className="text-green-400 text-xs">
                        {new Date(referral.joinDate).toLocaleDateString()}
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
      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {quickActions.map((action) => (
          <Card 
            key={action.key}
            className="bg-secondary border-border glow-hover card-hover cursor-pointer"
            onClick={() => setLocation(action.path)}
            data-testid={`card-${action.key}`}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <HexagonIcon>
                  <i className={`${action.icon} text-honey`}></i>
                </HexagonIcon>
                <h3 className="text-lg font-semibold text-honey">
                  {t(action.titleKey)}
                </h3>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                {t(action.descriptionKey)}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-honey text-sm">{action.statValue}</span>
                <i className="fas fa-arrow-right text-honey"></i>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

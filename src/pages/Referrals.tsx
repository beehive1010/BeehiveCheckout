import { useWallet } from '../hooks/useWallet';
import { useUserReferralStats } from '../hooks/useBeeHiveStats';
import { useI18n } from '../contexts/I18nContext';
import { useToast } from '../hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import UserProfileCard from '../components/shared/UserProfileCard';
import { UsersIcon, ShareIcon, TrophyIcon } from '@heroicons/react/24/outline';
import ClaimableRewardsCard from '../components/rewards/ClaimableRewardsCard';
import DrillDownMatrixView from '../components/matrix/DrillDownMatrixView';
import ReferralsStats from '../components/referrals/ReferralsStats';
import ReferralStatsCard from '../components/referrals/ReferralStatsCard';
import { Link } from 'wouter';
import styles from '../styles/referrals/referrals.module.css';

export default function Referrals() {
  const { userData, walletAddress } = useWallet();
  const { data: userStats, isLoading: isLoadingUserStats } = useUserReferralStats();
  const { t } = useI18n();
  const { toast } = useToast();

  const referralLink = `${window.location.origin}/welcome?ref=${walletAddress}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: t('referrals.copied.title') || "Copied!",
      description: t('referrals.copied.description') || "Referral link copied to clipboard",
      duration: 2000
    });
  };

  return (
    <div className={`${styles.referralsContainer} container mx-auto px-4 py-8`}>
      {/* Header with UserProfile */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl lg:text-4xl font-bold text-honey mb-2">
            {t('nav.referrals') || 'Referrals & Matrix'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t('referrals.subtitle') || 'Build your 3x3 matrix network and earn rewards through referrals'}
          </p>
        </div>
        <UserProfileCard variant="compact" />
      </div>

      {/* Referral Link Section */}
      <Card className="bg-secondary border-border mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-honey">
            <ShareIcon className="w-5 h-5" />
            {t('referrals.yourLink') || 'Your Referral Link'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 px-3 py-2 bg-muted border border-border rounded-md text-xs sm:text-sm min-w-0"
            />
            <Button
              onClick={copyReferralLink}
              className="bg-honey text-secondary hover:bg-honey/90 w-full sm:w-auto px-4 py-2"
            >
              {t('referrals.copy') || 'Copy'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t('referrals.linkDescription') || 'Share this link to earn rewards when people join through your referral and activate membership'}
          </p>
        </CardContent>
      </Card>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="matrix" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="matrix">{t('referrals.tabs.matrix') || '3x3 Matrix'}</TabsTrigger>
          <TabsTrigger value="stats">{t('referrals.tabs.stats') || 'Statistics'}</TabsTrigger>
          <TabsTrigger value="rewards">{t('referrals.tabs.rewards') || 'Rewards'}</TabsTrigger>
        </TabsList>

        {/* Matrix Visualization Tab */}
        <TabsContent value="matrix" className="space-y-6">
          <DrillDownMatrixView 
            rootWalletAddress={walletAddress || ''}
            rootUser={{username: userData?.username, currentLevel: userData?.currentLevel}}
          />
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-6">
          {/* Referrals Statistics from Database Views */}
          <ReferralsStats 
            walletAddress={walletAddress || ''}
            className="mb-6"
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ReferralStatsCard 
              className="h-fit"
              onViewMatrix={() => {
                // Switch to matrix tab when view matrix is clicked
                const matrixTab = document.querySelector('[value="matrix"]') as HTMLElement;
                matrixTab?.click();
              }}
            />
          </div>
          
          {/* Legacy Stats Cards for Comparison */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-honey mb-4">{t('referrals.legacySystem') || 'Legacy System (For Comparison)'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card className="bg-secondary border-border">
              <CardContent className="p-4 sm:p-6 text-center">
                <UsersIcon className="w-6 h-6 sm:w-8 sm:h-8 text-honey mx-auto mb-2" />
                <div className="text-xl sm:text-2xl font-bold text-honey">
                  {userStats?.totalReferrals || userStats?.totalTeamCount || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('referrals.totalReferrals') || 'Total Referrals'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-secondary border-border">
              <CardContent className="p-4 sm:p-6 text-center">
                <TrophyIcon className="w-6 h-6 sm:w-8 sm:h-8 text-honey mx-auto mb-2" />
                <div className="text-xl sm:text-2xl font-bold text-honey">
                  {userStats?.directReferralCount || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('referrals.activeMembers') || 'Active Members'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-secondary border-border">
              <CardContent className="p-4 sm:p-6 text-center">
                <ShareIcon className="w-6 h-6 sm:w-8 sm:h-8 text-honey mx-auto mb-2" />
                <div className="text-xl sm:text-2xl font-bold text-honey">
                  ${userStats?.totalEarnings || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('referrals.totalEarnings') || 'Total Earnings'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-secondary border-border">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="w-6 h-6 sm:w-8 sm:h-8 text-honey mx-auto mb-2 bg-honey/20 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">3x3</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-honey">
                  {userStats?.matrixLevel || 1}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('referrals.matrixLayers') || 'Matrix Layers'}
                </p>
              </CardContent>
            </Card>
          </div>
          </div>

          {/* Recent Activity */}
          <Card className="bg-secondary border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-honey" />
                {t('referrals.recentActivity') || 'Recent Referral Activity'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingUserStats ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex justify-between items-center py-3">
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
                        <div className="h-3 bg-muted rounded w-20 animate-pulse"></div>
                      </div>
                      <div className="h-6 bg-muted rounded w-16 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : userStats?.recentReferrals && userStats.recentReferrals.length > 0 ? (
                <div className="space-y-3">
                  {userStats.recentReferrals.map((referral: any, index: number) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 border-b border-border/50 last:border-b-0 gap-2 sm:gap-0">
                      <div className="flex-1">
                        <p className="font-medium text-sm break-all">
                          {referral.walletAddress?.slice(0, 8)}...{referral.walletAddress?.slice(-6)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {referral.joinedAt ? new Date(referral.joinedAt).toLocaleDateString() : t('referrals.recentlyJoined') || 'Recently joined'}
                        </p>
                      </div>
                      <Badge variant={referral.activated ? 'default' : 'secondary'} className="self-start sm:self-center">
                        {referral.activated ? t('referrals.activated') || 'Activated' : t('referrals.pending') || 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  {t('referrals.noReferrals') || 'No referrals yet. Start sharing your link to build your 3x3 matrix!'}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="space-y-6">
          <ClaimableRewardsCard walletAddress={walletAddress || ''} />
          
          {/* Additional Rewards Information */}
          <Card className="bg-secondary border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrophyIcon className="w-5 h-5 text-honey" />
                {t('referrals.rewardSystemInfo') || 'Reward System Information'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">{t('referrals.matrixRewardsTitle') || 'Matrix Rewards'}</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• {t('referrals.rewards.level1Direct') || 'Level 1 Direct: $30 USDC per referral'}</li>
                    <li>• {t('referrals.rewards.level2Matrix') || 'Level 2 Matrix: $10 USDC per position'}</li>
                    <li>• {t('referrals.rewards.spilloverBonuses') || 'Spillover Bonuses: Additional rewards'}</li>
                    <li>• {t('referrals.rewards.claimWindow') || '72-hour claim window'}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">{t('referrals.bccTokenRewardsTitle') || 'BCC Token Rewards'}</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• {t('referrals.bccRewards.transferable') || 'Transferable BCC: Immediate use'}</li>
                    <li>• {t('referrals.bccRewards.locked') || 'Locked BCC: Tier-based release'}</li>
                    <li>• {t('referrals.bccRewards.multipliers') || 'Tier multipliers: 1.0x, 0.5x, 0.25x, 0.125x'}</li>
                    <li>• {t('referrals.bccRewards.upgrades') || 'Level upgrades unlock more BCC'}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Back to Dashboard Link */}
      <div className="mt-8 text-center">
        <Link href="/dashboard">
          <Button variant="outline" className="w-full sm:w-auto">
            ← {t('common.back') || 'Back to Dashboard'}
          </Button>
        </Link>
      </div>
    </div>
  );
}
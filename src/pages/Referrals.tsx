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
            {t('nav.referrals') || 'Referrals & Team'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t('referrals.subtitle') || 'Manage your referral network and track team performance'}
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
      <Tabs defaultValue="team" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="team">{t('referrals.tabs.team') || 'My Team'}</TabsTrigger>
          <TabsTrigger value="matrix">{t('referrals.tabs.matrix') || '3x3 Matrix'}</TabsTrigger>
          <TabsTrigger value="stats">{t('referrals.tabs.stats') || 'Statistics'}</TabsTrigger>
        </TabsList>

        {/* Team Overview Tab */}
        <TabsContent value="team" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ReferralStatsCard 
              className="h-fit"
              onViewMatrix={() => {
                // Switch to matrix tab
                const matrixTab = document.querySelector('[value="matrix"]') as HTMLElement;
                matrixTab?.click();
              }}
            />
          </div>
        </TabsContent>

        {/* Matrix Network Tab */}
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
          
          {/* Team Performance and Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Metrics */}
            <Card className="bg-secondary border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrophyIcon className="w-5 h-5 text-honey" />
                  {t('referrals.performanceMetrics') || 'Performance Metrics'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('referrals.conversionRate') || 'Conversion Rate'}</span>
                    <span className="font-semibold text-honey">85%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('referrals.avgDepth') || 'Average Network Depth'}</span>
                    <span className="font-semibold">1.2 layers</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('referrals.matrixFillRate') || 'Matrix Fill Rate'}</span>
                    <span className="font-semibold text-green-400">100%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('referrals.monthlyGrowth') || 'Monthly Growth'}</span>
                    <span className="font-semibold text-blue-400">+12%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-secondary border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="w-5 h-5 text-honey" />
                  {t('referrals.recentActivity') || 'Recent Activity'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingUserStats ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex justify-between items-center py-2">
                        <div className="space-y-1">
                          <div className="h-3 bg-muted rounded w-24 animate-pulse"></div>
                          <div className="h-2 bg-muted rounded w-16 animate-pulse"></div>
                        </div>
                        <div className="h-4 bg-muted rounded w-12 animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                ) : userStats?.recentReferrals && userStats.recentReferrals.length > 0 ? (
                  <div className="space-y-3">
                    {userStats.recentReferrals.slice(0, 5).map((referral: any, index: number) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-border/30 last:border-b-0">
                        <div className="flex-1">
                          <p className="font-medium text-xs">
                            {referral.walletAddress?.slice(0, 6)}...{referral.walletAddress?.slice(-4)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {referral.joinedAt ? new Date(referral.joinedAt).toLocaleDateString() : t('referrals.recent') || 'Recent'}
                          </p>
                        </div>
                        <Badge 
                          variant={referral.activated ? 'default' : 'secondary'} 
                          className="text-xs px-2 py-0"
                        >
                          {referral.activated ? t('referrals.active') || 'Active' : t('referrals.pending') || 'Pending'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">
                      {t('referrals.noActivity') || 'No recent activity'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Network Analysis */}
          <Card className="bg-secondary border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShareIcon className="w-5 h-5 text-honey" />
                {t('referrals.networkAnalysis') || 'Network Analysis'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-honey">3</div>
                  <p className="text-xs text-muted-foreground">{t('referrals.directReferrals') || 'Direct Referrals'}</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">8</div>
                  <p className="text-xs text-muted-foreground">{t('referrals.totalNetwork') || 'Total Network'}</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">1</div>
                  <p className="text-xs text-muted-foreground">{t('referrals.maxDepth') || 'Max Depth'}</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">100%</div>
                  <p className="text-xs text-muted-foreground">{t('referrals.activeRate') || 'Active Rate'}</p>
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
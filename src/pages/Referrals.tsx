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
import MatrixLayerStatsView from '../components/matrix/MatrixLayerStatsView';
import ReferralsStats from '../components/referrals/ReferralsStats';
import DataTest from '../components/test/DataTest';
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
      <Tabs defaultValue="test" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="test">Data Test</TabsTrigger>
          <TabsTrigger value="matrix">{t('referrals.tabs.matrix') || '3x3 Matrix'}</TabsTrigger>
          <TabsTrigger value="stats">{t('referrals.tabs.stats') || 'Statistics'}</TabsTrigger>
        </TabsList>

        {/* Matrix Network Tab */}
        <TabsContent value="matrix" className="space-y-6">
          {/* Matrix Layer Statistics */}
          <MatrixLayerStatsView 
            walletAddress={walletAddress || ''}
          />
          
          {/* Drill-down Matrix View */}
          <DrillDownMatrixView 
            rootWalletAddress={walletAddress || ''}
            rootUser={{username: userData?.username, currentLevel: userData?.currentLevel}}
          />
        </TabsContent>

        {/* Statistics Tab - Simplified */}
        <TabsContent value="stats" className="space-y-4">
          {/* Core Statistics Only */}
          <ReferralsStats 
            walletAddress={walletAddress || ''}
          />
          {/* Simple Activity Summary - Mobile Optimized */}
          <Card className="bg-secondary border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <UsersIcon className="w-4 h-4 text-honey" />
                {t('referrals.recentActivity') || 'Recent Activity'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {isLoadingUserStats ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="flex justify-between items-center py-2">
                      <div className="space-y-1">
                        <div className="h-3 bg-muted rounded w-20 animate-pulse"></div>
                        <div className="h-2 bg-muted rounded w-14 animate-pulse"></div>
                      </div>
                      <div className="h-4 bg-muted rounded w-10 animate-pulse"></div>
                    </div>
                  ))
                ) : userStats?.recentReferrals && userStats.recentReferrals.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {userStats.recentReferrals.slice(0, 6).map((referral: any, index: number) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-border/20 last:border-b-0">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-medium text-xs truncate">
                            {referral.walletAddress?.slice(0, 6)}...{referral.walletAddress?.slice(-4)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {referral.joinedAt ? new Date(referral.joinedAt).toLocaleDateString() : 'Recent'}
                          </p>
                        </div>
                        <Badge 
                          variant={referral.activated ? 'default' : 'secondary'} 
                          className="text-xs px-2 py-1 flex-shrink-0"
                        >
                          {referral.activated ? 'Active' : 'Pending'}
                        </Badge>
                      </div>
                    ))}
                    {userStats.recentReferrals.length > 6 && (
                      <div className="text-center pt-2">
                        <p className="text-xs text-muted-foreground">
                          +{userStats.recentReferrals.length - 6} more members
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  </div>
                )}
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
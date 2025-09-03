import { useWallet } from '../hooks/useWallet';
import { useUserReferralStats } from '../hooks/useBeeHiveStats';
import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { UsersIcon, ShareIcon, TrophyIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import ClaimableRewardsCard from '../components/rewards/ClaimableRewardsCard';
import ReferralsMatrixComponent from '../components/matrix/ReferralsMatrixComponent';
import { Link } from 'wouter';
import styles from '../styles/referrals/referrals.module.css';

export default function Referrals() {
  const { userData, walletAddress } = useWallet();
  const { data: userStats, isLoading: isLoadingUserStats } = useUserReferralStats();
  const { t } = useI18n();

  const referralLink = `${window.location.origin}/signup?ref=${walletAddress}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    // You could add a toast notification here
  };

  return (
    <div className={`${styles.referralsContainer} space-y-4 sm:space-y-6`}>
      {/* Header with Back Button */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/dashboard">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2 hover:bg-honey/10 border-honey/20"
            data-testid="button-back-to-dashboard"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{t('nav.back') || 'Back'}</span>
            <span className="sm:hidden">{t('nav.dashboard') || 'Dashboard'}</span>
          </Button>
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-honey">{t('nav.referrals') || 'Referrals'}</h1>
      </div>

      {/* Referral Link Section */}
      <Card className="bg-secondary border-border">
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
            {t('referrals.linkDescription') || 'Share this link to earn rewards when people join through your referral'}
          </p>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
              {userStats?.totalEarnings || 0} BCC
            </div>
            <p className="text-sm text-muted-foreground">
              {t('referrals.totalEarnings') || 'Total Earnings'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-secondary border-border">
          <CardContent className="p-4 sm:p-6 text-center">
            <Badge className="w-6 h-6 sm:w-8 sm:h-8 bg-honey text-secondary mx-auto mb-2 flex items-center justify-center text-xs sm:text-sm">
              {userStats?.matrixLevel || 1}
            </Badge>
            <div className="text-xl sm:text-2xl font-bold text-honey">
              Level {userStats?.matrixLevel || 1}
            </div>
            <p className="text-sm text-muted-foreground">
              {t('referrals.matrixLevel') || 'Matrix Level'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Claimable Rewards */}
      {walletAddress && <ClaimableRewardsCard walletAddress={walletAddress} />}

      {/* Matrix View */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey">
            {t('referrals.matrixView') || 'Your Matrix Network'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReferralsMatrixComponent walletAddress={walletAddress || ''} />
        </CardContent>
      </Card>

      {/* Recent Referrals */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey">
            {t('referrals.recentReferrals') || 'Recent Referrals'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingUserStats ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto"></div>
            </div>
          ) : userStats?.recentReferrals && userStats.recentReferrals.length > 0 ? (
            <div className="space-y-3">
              {userStats.recentReferrals.map((referral: any, index: number) => (
                <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 border-b border-border/50 last:border-b-0 gap-2 sm:gap-0">
                  <div className="flex-1">
                    <p className="font-medium text-sm break-all">
                      {referral.walletAddress?.slice(0, 6)}...{referral.walletAddress?.slice(-4)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(referral.joinedAt).toLocaleDateString()}
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
              {t('referrals.noReferrals') || 'No referrals yet. Start sharing your link!'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
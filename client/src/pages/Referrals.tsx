import { useWallet } from '../hooks/useWallet';
import { useUserReferralStats } from '../hooks/useBeeHiveStats';
import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { UsersIcon, ShareIcon, TrophyIcon } from '@heroicons/react/24/outline';

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
    <div className="space-y-6">
      {/* Referral Link Section */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-honey">
            <ShareIcon className="w-5 h-5" />
            {t('referrals.yourLink') || 'Your Referral Link'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm font-mono"
              data-testid="input-referral-link"
            />
            <Button
              onClick={copyReferralLink}
              className="btn-honey"
              data-testid="button-copy-link"
            >
              <i className="fas fa-copy mr-2"></i>
              {t('buttons.copy') || 'Copy'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Referral Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <UsersIcon className="w-8 h-8 text-blue-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-honey">
              {isLoadingUserStats ? '...' : (Number(userStats?.directReferralCount) || 0)}
            </div>
            <div className="text-muted-foreground text-sm">
              {t('referrals.directReferrals') || 'Direct Referrals'}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-sitemap text-green-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">
              {isLoadingUserStats ? '...' : (userStats?.totalTeamCount || 0)}
            </div>
            <div className="text-muted-foreground text-sm">
              {t('referrals.totalTeam') || 'Total Team'}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <TrophyIcon className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-honey">
              {isLoadingUserStats ? '...' : (Number(userStats?.totalEarnings || 0).toFixed(2))}
            </div>
            <div className="text-muted-foreground text-sm">
              {t('referrals.totalEarnings') || 'Total Earnings'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral History */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey">
            {t('referrals.recentActivity') || 'Recent Referral Activity'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <UsersIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('referrals.noActivity') || 'No recent referral activity'}</p>
            <p className="text-sm mt-2">
              {t('referrals.startSharing') || 'Start sharing your referral link to see activity here'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
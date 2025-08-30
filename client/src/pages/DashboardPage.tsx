import { useEffect, useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';

interface DashboardData {
  stats: {
    totalEarnings: number;
    referralCount: number;
    matrixLevel: number;
    bccBalance: {
      transferable: number;
      restricted: number;
    };
    membershipLevel: number;
    isActivated: boolean;
  };
}

export default function DashboardPage() {
  const { walletAddress, isConnected } = useWallet();
  const { t } = useI18n();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected && walletAddress) {
      // TODO: Implement dashboard data fetching
      setDashboardData({
        stats: {
          totalEarnings: 0,
          referralCount: 0,
          matrixLevel: 1,
          bccBalance: {
            transferable: 0,
            restricted: 0
          },
          membershipLevel: 0,
          isActivated: false
        }
      });
      setLoading(false);
    }
  }, [isConnected, walletAddress]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-honey mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-honey mb-2">
            {t('dashboard.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('dashboard.subtitle')}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-secondary rounded-lg p-6 border border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {t('dashboard.stats.totalEarnings')}
            </h3>
            <p className="text-2xl font-bold text-honey">
              ${dashboardData?.stats.totalEarnings || 0}
            </p>
          </div>

          <div className="bg-secondary rounded-lg p-6 border border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {t('dashboard.stats.referrals')}
            </h3>
            <p className="text-2xl font-bold text-honey">
              {dashboardData?.stats.referralCount || 0}
            </p>
          </div>

          <div className="bg-secondary rounded-lg p-6 border border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {t('dashboard.stats.matrixLevel')}
            </h3>
            <p className="text-2xl font-bold text-honey">
              {dashboardData?.stats.matrixLevel || 1}
            </p>
          </div>

          <div className="bg-secondary rounded-lg p-6 border border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {t('dashboard.stats.membershipLevel')}
            </h3>
            <p className="text-2xl font-bold text-honey">
              Level {dashboardData?.stats.membershipLevel || 0}
            </p>
          </div>
        </div>

        {/* BCC Balance */}
        <div className="bg-secondary rounded-lg p-6 border border-border">
          <h2 className="text-xl font-semibold text-honey mb-4">
            {t('dashboard.bccBalance.title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {t('dashboard.bccBalance.transferable')}
              </h3>
              <p className="text-xl font-bold">
                {dashboardData?.stats.bccBalance.transferable || 0} BCC
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {t('dashboard.bccBalance.restricted')}
              </h3>
              <p className="text-xl font-bold">
                {dashboardData?.stats.bccBalance.restricted || 0} BCC
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
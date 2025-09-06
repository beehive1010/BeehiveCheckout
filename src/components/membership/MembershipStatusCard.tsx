import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import HexagonIcon from './UI/HexagonIcon';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { dashboardService } from '../features/dashboard/services/dashboard.client';
import styles from '../features/dashboard/styles/dashboard.module.css';

interface MembershipStatusCardProps {
  userData: any;
  walletAddress: string;
  currentLevel: number;
  bccBalance: any;
  userStats: any;
  isLoadingUserStats: boolean;
}

export function MembershipStatusCard({ 
  userData, 
  walletAddress, 
  currentLevel, 
  bccBalance, 
  userStats, 
  isLoadingUserStats 
}: MembershipStatusCardProps) {
  const { t } = useI18n();
  const [, setLocation] = useLocation();

  return (
    <Card className={styles.membershipCard}>
      <CardContent className="p-4 md:p-6">
        <div className="space-y-4">
          {/* User Profile Section */}
          <div className={styles.userProfile}>
            <HexagonIcon size="lg">
              <img 
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64" 
                alt={t('dashboard.userAvatar')} 
                className="w-12 h-12 rounded-full" 
              />
            </HexagonIcon>
            <div className={styles.userInfo}>
              <h2 className={styles.userName}>
                {userData?.user?.username || t('dashboard.member')}
              </h2>
              <p className={styles.walletAddress}>
                {walletAddress ? dashboardService.formatAddress(walletAddress) : ''}
              </p>
              <div className={styles.userBadges}>
                <Badge className="bg-honey text-black font-semibold text-xs">
                  {t('dashboard.levelText', { level: currentLevel })}
                </Badge>
                <Badge variant="secondary" className="bg-green-600 text-white text-xs">
                  {t('dashboard.nftVerified')}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* User Centre Button */}
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
          <div className={styles.topUpSection}>
            <div className={styles.topUpCard}>
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
          
          {/* Balance Display */}
          <div className={styles.balanceSection}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              {t('dashboard.accountOverview')}
            </h3>
            <div className={styles.balanceGrid}>
              <div className={styles.balanceCard}>
                <p className={styles.balanceLabel}>
                  {t('dashboard.reward')}
                </p>
                <p className={styles.balanceValue}>
                  {isLoadingUserStats ? '...' : (userStats?.totalEarnings || 0)}
                </p>
              </div>
              <div className={styles.balanceCard}>
                <p className={styles.balanceLabel}>
                  {t('dashboard.bccBalance')}
                </p>
                <p className={styles.balanceValue}>
                  {bccBalance?.transferable || 0}
                </p>
              </div>
              <div className={styles.balanceCard}>
                <p className={styles.balanceLabel}>
                  {t('dashboard.balances.bccLocked')}
                </p>
                <p className={styles.balanceValue}>
                  {bccBalance?.restricted || 0}
                </p>
              </div>
              <div className={styles.balanceCard}>
                <p className={styles.balanceLabel}>
                  {t('dashboard.nfts')}
                </p>
                <p className={styles.balanceValue}>
                  {isLoadingUserStats ? '...' : 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
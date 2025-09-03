import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import styles from '@/styles/dashboard/dashboard.module.css';

interface MatrixNetworkStatsProps {
  userStats: any;
  isLoadingUserStats: boolean;
}

export function MatrixNetworkStats({ userStats, isLoadingUserStats }: MatrixNetworkStatsProps) {
  const { t } = useI18n();

  const renderLoadingRows = () => 
    Array.from({length: 19}, (_, i) => (
      <div key={i + 1} className={styles.matrixRow}>
        <span className={styles.matrixLevel}>{t('dashboard.layer.name')} {i + 1}</span>
        <div className={styles.matrixStats}>
          <div className={styles.matrixStatGroup}>
            <span className={`${styles.matrixStatValue} text-honey`}>...</span>
            <span className={styles.matrixStatLabel}>{t('dashboard.layer.members')}</span>
          </div>
          <div className={styles.matrixSeparator}>•</div>
          <div className={styles.matrixStatGroup}>
            <span className={`${styles.matrixStatValue} text-green-400`}>...</span>
            <span className={styles.matrixStatLabel}>{t('dashboard.layer.upgraded')}</span>
          </div>
        </div>
      </div>
    ));

  const renderMatrixRows = () => {
    // Always render 19 layers with proper data structure
    return Array.from({length: 19}, (_, i) => (
      <div key={i + 1} className={styles.matrixRow}>
        <span className={styles.matrixLevel}>{t('dashboard.layer.name')} {i + 1}</span>
        <div className={styles.matrixStats}>
          <div className={styles.matrixStatGroup}>
            <span className={`${styles.matrixStatValue} text-honey`}>0</span>
            <span className={styles.matrixStatLabel}>{t('dashboard.layer.members')}</span>
          </div>
          <div className={styles.matrixSeparator}>•</div>
          <div className={styles.matrixStatGroup}>
            <span className={`${styles.matrixStatValue} text-green-400`}>0</span>
            <span className={styles.matrixStatLabel}>{t('dashboard.layer.upgraded')}</span>
          </div>
        </div>
      </div>
    ));
  };

  const renderNetworkContent = () => {
    if (!isLoadingUserStats && userStats?.downlineMatrix && userStats.downlineMatrix.length > 0 && userStats.downlineMatrix.some((layer: any) => layer.members > 0)) {
      return userStats.downlineMatrix.filter((layer: any) => layer.members > 0).slice(0, 5).map((layer: any) => (
        <div key={layer.level} className="bg-muted/30 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground text-sm">
              {t('dashboard.layer.name')} {layer.level}
            </span>
            <Badge className="bg-honey text-black">
              {layer.members} {t('dashboard.layer.members')}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">
              {t('dashboard.layer.upgraded')}: {layer.upgraded}
            </span>
            <span className="text-green-400 text-xs">
              {t('dashboard.layer.placements')}: {layer.placements}
            </span>
          </div>
        </div>
      ));
    }

    return (
      <div className={styles.emptyState}>
        <Users className={styles.emptyStateIcon} />
        <p className={styles.emptyStateText}>
          {isLoadingUserStats ? t('dashboard.uplineNetwork.loading') : t('dashboard.uplineNetwork.noReferrals')}
        </p>
        <p className={styles.emptyStateSubtext}>
          {t('dashboard.uplineNetwork.shareMessage')}
        </p>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-4 mb-8">
      {/* Matrix Stats */}
      <Card className={styles.matrixCard}>
        <CardContent className="p-4 md:p-6">
          <h3 className={styles.matrixTitle}>
            <i className="fas fa-sitemap text-honey"></i>
            {t('dashboard.downlineMatrix.title')}
          </h3>
          <div className={`${styles.matrixList} space-y-1 custom-scrollbar`}>
            {isLoadingUserStats ? renderLoadingRows() : renderMatrixRows()}
          </div>
        </CardContent>
      </Card>
      
      {/* Network Stats */}
      <Card className={styles.matrixCard}>
        <CardContent className="p-4 md:p-6">
          <h3 className={styles.matrixTitle}>
            <i className="fas fa-arrow-down text-honey"></i>
            {t('dashboard.downlineNetwork.title')}
          </h3>
          <div className="space-y-3">
            {renderNetworkContent()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
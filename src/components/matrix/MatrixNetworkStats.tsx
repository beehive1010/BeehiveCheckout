import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useWeb3 } from '@/contexts/Web3Context';
import { useQuery } from '@tanstack/react-query';
import styles from '@/styles/dashboard/dashboard.module.css';

interface MatrixNetworkStatsProps {
  userStats: any;
  isLoadingUserStats: boolean;
}

export function MatrixNetworkStats({ userStats, isLoadingUserStats }: MatrixNetworkStatsProps) {
  const { t } = useI18n();
  const { address } = useWeb3();

  // Fetch matrix layers data
  const { data: matrixData, isLoading: isLoadingMatrix } = useQuery({
    queryKey: ['matrix-layers', address],
    queryFn: async () => {
      if (!address) return null;
      
      const response = await fetch('/api/matrix/layers', {
        headers: {
          'x-wallet-address': address
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch matrix data');
      }
      
      return response.json();
    },
    enabled: !!address
  });

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
    // Always render 19 layers with real data from API
    return Array.from({length: 19}, (_, i) => {
      const layerNum = i + 1;
      const layerData = matrixData?.layers?.find((layer: any) => layer.layer === layerNum);
      const memberCount = layerData?.filledPositions || 0;
      const upgradeCount = layerData?.members?.filter((m: any) => m.isActive).length || 0;
      
      return (
        <div key={layerNum} className={styles.matrixRow}>
          <span className={styles.matrixLevel}>{t('dashboard.layer.name')} {layerNum}</span>
          <div className={styles.matrixStats}>
            <div className={styles.matrixStatGroup}>
              <span className={`${styles.matrixStatValue} text-honey`}>{memberCount}</span>
              <span className={styles.matrixStatLabel}>{t('dashboard.layer.members')}</span>
            </div>
            <div className={styles.matrixSeparator}>•</div>
            <div className={styles.matrixStatGroup}>
              <span className={`${styles.matrixStatValue} text-green-400`}>{upgradeCount}</span>
              <span className={styles.matrixStatLabel}>{t('dashboard.layer.upgraded')}</span>
            </div>
          </div>
          {memberCount > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              L:{layerData?.leftCount || 0} M:{layerData?.middleCount || 0} R:{layerData?.rightCount || 0}
            </div>
          )}
        </div>
      );
    });
  };

  const renderNetworkContent = () => {
    // Use real matrix data instead of userStats
    const activeLayers = matrixData?.layers?.filter((layer: any) => layer.filledPositions > 0) || [];
    
    if (!isLoadingMatrix && !isLoadingUserStats && activeLayers.length > 0) {
      return activeLayers.slice(0, 5).map((layer: any) => (
        <div key={layer.layer} className="bg-muted/30 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground text-sm">
              {t('dashboard.layer.name')} {layer.layer}
            </span>
            <Badge className="bg-honey text-black">
              {layer.filledPositions} {t('dashboard.layer.members')}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">
              {t('dashboard.layer.upgraded')}: {layer.members?.filter((m: any) => m.isActive).length || 0}
            </span>
            <span className="text-green-400 text-xs">
              Fill: {Math.round(layer.fillPercentage || 0)}%
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            L:{layer.leftCount} • M:{layer.middleCount} • R:{layer.rightCount}
          </div>
        </div>
      ));
    }

    return (
      <div className={styles.emptyState}>
        <Users className={styles.emptyStateIcon} />
        <p className={styles.emptyStateText}>
          {(isLoadingUserStats || isLoadingMatrix) ? t('dashboard.uplineNetwork.loading') : t('dashboard.uplineNetwork.noReferrals')}
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
            {(isLoadingUserStats || isLoadingMatrix) ? renderLoadingRows() : renderMatrixRows()}
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
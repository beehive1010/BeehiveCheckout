import { useWallet } from '../hooks/useWallet';
import { useUserMatrixLayers, useMatrixStats, useMemberLayerView } from '../hooks/useMatrixV2';
import { useRewardSummary } from '../hooks/useRewardsV2';
import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { UsersIcon, ShareIcon, TrophyIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

function Referrals() {
  const { userData, walletAddress } = useWallet();
  const { data: matrixStats, isLoading: isLoadingMatrix } = useMatrixStats();
  const { data: memberLayers, isLoading: isLoadingLayers } = useMemberLayerView();
  const { data: rewardSummary, isLoading: isLoadingRewards } = useRewardSummary();
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

      {/* Matrix Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-layer-group text-blue-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">
              {isLoadingMatrix ? '...' : (matrixStats?.globalPosition !== null ? matrixStats.globalPosition + 1 : '-')}
            </div>
            <div className="text-muted-foreground text-sm">
              {t('matrix.globalPosition') || 'Global Position'}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-layer-group text-green-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">
              {isLoadingMatrix ? '...' : (matrixStats?.matrixLayer || 0)}
            </div>
            <div className="text-muted-foreground text-sm">
              {t('matrix.currentLayer') || 'Current Layer'}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <UsersIcon className="w-8 h-8 text-purple-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-honey">
              {isLoadingRewards ? '...' : (rewardSummary?.activeLayerPositions || 0)}
            </div>
            <div className="text-muted-foreground text-sm">
              {t('matrix.activePositions') || 'Active Positions'}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <TrophyIcon className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-honey">
              ${isLoadingRewards ? '...' : (rewardSummary?.totalEarnedUsd?.toFixed(2) || '0.00')}
            </div>
            <div className="text-muted-foreground text-sm">
              {t('rewards.totalEarned') || 'Total Earned'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Matrix Position Display */}
      {matrixStats && (
        <Card className="bg-secondary border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-honey">
              <i className="fas fa-cube"></i>
              {t('matrix.myPosition') || 'My Matrix Position'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/40 rounded-lg p-4 border border-honey/20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Layer</p>
                  <p className="text-2xl font-bold text-honey">
                    {matrixStats.matrixLayer || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Position</p>
                  <p className="text-lg font-semibold text-green-400">
                    {matrixStats.matrixPositionName || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Global #</p>
                  <p className="text-lg font-semibold text-blue-400">
                    {matrixStats.globalPosition !== null ? matrixStats.globalPosition + 1 : '-'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Layer Structure View */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-honey">
            <i className="fas fa-layer-group"></i>
            {t('matrix.layerStructure') || '19-Layer Matrix Structure'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingLayers ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t('common.loading') || 'Loading...'}</p>
            </div>
          ) : !memberLayers || memberLayers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <i className="fas fa-layer-group text-4xl mx-auto mb-4 opacity-50"></i>
              <p>{t('matrix.noLayers') || 'No matrix layers found'}</p>
              <p className="text-sm mt-2">
                {t('matrix.activateToJoin') || 'Activate membership to join the matrix system'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Layer 1 (1×3 positions) */}
              {[1, 2, 3, 4, 5].map(layerNum => {
                const layerMembers = memberLayers.filter(m => m.layer === layerNum);
                const capacity = Math.pow(3, layerNum);
                const filled = layerMembers.length;
                const fillPercentage = (filled / capacity) * 100;
                
                return (
                  <div key={layerNum} className="border border-border/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
                          Layer {layerNum}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {filled}/{capacity} positions
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="w-24 bg-muted rounded-full h-2">
                          <div 
                            className="bg-honey h-2 rounded-full transition-all duration-300"
                            style={{ width: `${fillPercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {fillPercentage.toFixed(1)}% filled
                        </span>
                      </div>
                    </div>
                    
                    {layerMembers.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {layerMembers.slice(0, 6).map((member, idx) => (
                          <div key={idx} className="bg-muted/50 rounded p-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-honey truncate">
                                {member.username || member.memberWallet.slice(0, 8) + '...'}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {member.positionName}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Levels: {member.ownedLevels.join(', ') || 'None'}
                            </div>
                          </div>
                        ))}
                        {layerMembers.length > 6 && (
                          <div className="bg-muted/30 rounded p-2 text-sm text-center text-muted-foreground">
                            +{layerMembers.length - 6} more...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {memberLayers.some(m => m.layer > 5) && (
                <div className="text-center">
                  <Button variant="outline" className="border-honey/30 text-honey hover:bg-honey/10">
                    <ArrowRightIcon className="w-4 h-4 mr-2" />
                    {t('matrix.viewAllLayers') || 'View All 19 Layers'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Referrals;
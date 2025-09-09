import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Eye, 
  Share, 
  Copy, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Crown,
  User,
  UserPlus
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { callEdgeFunction } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useI18n } from '@/contexts/I18nContext';

interface MatrixMember {
  walletAddress: string;
  username?: string;
  level: number;
  layer: number;
  position: number;
  isActive: boolean;
  placedAt: string;
  downlineCount: number;
}

interface MatrixData {
  rootWallet: string;
  members: MatrixMember[];
  totalLayers: number;
  totalMembers: number;
  myPosition?: {
    layer: number;
    position: number;
    parent?: string;
  };
}

interface ReferralMatrixVisualizationProps {
  rootWallet?: string;
  maxLayers?: number;
}

const ReferralMatrixVisualization: React.FC<ReferralMatrixVisualizationProps> = ({ 
  rootWallet,
  maxLayers = 5 
}) => {
  const { walletAddress, isConnected } = useWallet();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [matrixData, setMatrixData] = useState<MatrixData | null>(null);
  const [selectedLayer, setSelectedLayer] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewMode, setViewMode] = useState<'tree' | 'grid'>('tree');
  const [referralLink, setReferralLink] = useState('');

  const effectiveRootWallet = rootWallet || walletAddress;

  useEffect(() => {
    if (isConnected && effectiveRootWallet) {
      loadMatrixData();
      generateReferralLink();
    }
  }, [isConnected, effectiveRootWallet]);

  const loadMatrixData = async () => {
    if (!effectiveRootWallet) return;

    try {
      setLoading(true);

      // 使用真实的Supabase Edge Function获取矩阵数据
      const matrixResult = await callEdgeFunction('matrix', {
        action: 'get-matrix',
        rootWallet: effectiveRootWallet,
        maxLayers
      }, walletAddress);

      if (matrixResult?.success) {
        setMatrixData(matrixResult.data);
      } else {
        throw new Error(matrixResult?.error || '获取矩阵数据失败');
      }

    } catch (error) {
      console.error('Failed to load matrix data:', error);
      toast.error(t('membershipSystem.matrix.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const generateReferralLink = async () => {
    if (!walletAddress) return;

    const baseUrl = window.location.origin;
    const referralUrl = `${baseUrl}?ref=${walletAddress}`;
    setReferralLink(referralUrl);
  };

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success(t('membershipSystem.matrix.success.linkCopied'));
    } catch (error) {
      toast.error(t('membershipSystem.matrix.errors.copyFailed'));
    }
  };

  const shareReferralLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('membershipSystem.matrix.share.title'),
          text: t('membershipSystem.matrix.share.text'),
          url: referralLink
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      copyReferralLink();
    }
  };

  const renderMatrixNode = (member: MatrixMember | null, layer: number, position: number) => {
    const isEmpty = !member;
    const isMe = member?.walletAddress === walletAddress;
    const isRoot = layer === 0;
    
    return (
      <div
        key={`${layer}-${position}`}
        className={`
          relative p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer
          ${isEmpty ? 'border-dashed border-muted bg-muted/20' : ''}
          ${isMe ? 'border-honey bg-honey/10' : ''}
          ${isRoot ? 'border-purple-500 bg-purple-500/10' : ''}
          ${member && !isMe && !isRoot ? 'border-primary bg-primary/5 hover:bg-primary/10' : ''}
          ${!isEmpty ? 'hover:scale-105' : ''}
        `}
        style={{
          minWidth: `${80 * zoomLevel}px`,
          minHeight: `${60 * zoomLevel}px`,
        }}
      >
        {isEmpty ? (
          <div className="text-center text-muted-foreground">
            <UserPlus className="h-6 w-6 mx-auto mb-1" />
            <div className="text-xs">{t('membershipSystem.matrix.visualization.available')}</div>
          </div>
        ) : (
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              {isRoot && <Crown className="h-4 w-4 text-purple-500 mr-1" />}
              {isMe && <Badge variant="secondary" className="text-xs">{t('membershipSystem.matrix.visualization.you')}</Badge>}
              <User className="h-4 w-4" />
            </div>
            <div className="text-xs font-semibold truncate">
              {member.username || `${member.walletAddress.slice(0, 6)}...`}
            </div>
            <div className="text-xs text-muted-foreground">
              L{member.level} • {member.downlineCount} refs
            </div>
            <div className={`text-xs ${member.isActive ? 'text-green-500' : 'text-orange-500'}`}>
              {member.isActive ? t('membershipSystem.matrix.visualization.active') : t('membershipSystem.matrix.visualization.inactive')}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTreeView = () => {
    if (!matrixData) return null;

    const layers = [];
    
    for (let layer = 0; layer <= selectedLayer; layer++) {
      const layerMembers = matrixData.members.filter(m => m.layer === layer);
      const positionsInLayer = layer === 0 ? 1 : Math.pow(3, layer);
      
      const layerNodes = [];
      for (let position = 1; position <= positionsInLayer; position++) {
        const member = layerMembers.find(m => m.position === position);
        layerNodes.push(renderMatrixNode(member || null, layer, position));
      }

      layers.push(
        <div key={layer} className="flex flex-wrap justify-center gap-2 mb-4">
          <div className="text-center w-full mb-2">
            <Badge variant="outline">
              {layer === 0 ? t('membershipSystem.matrix.visualization.layerRoot') : t('membershipSystem.matrix.visualization.layerNumber', { layer })} 
              ({layerMembers.length}/{positionsInLayer})
            </Badge>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {layerNodes}
          </div>
        </div>
      );
    }

    return <div className="space-y-4">{layers}</div>;
  };

  const renderGridView = () => {
    if (!matrixData) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {matrixData.members
          .filter(m => m.layer <= selectedLayer)
          .map(member => renderMatrixNode(member, member.layer, member.position))
        }
      </div>
    );
  };

  const renderStats = () => {
    if (!matrixData) return null;

    const layerStats = [];
    for (let layer = 1; layer <= maxLayers; layer++) {
      const layerMembers = matrixData.members.filter(m => m.layer === layer);
      const maxPositions = Math.pow(3, layer);
      const fillPercentage = (layerMembers.length / maxPositions) * 100;

      layerStats.push(
        <div key={layer} className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Layer {layer}</span>
            <span>{layerMembers.length}/{maxPositions}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-honey h-2 rounded-full transition-all duration-300"
              style={{ width: `${fillPercentage}%` }}
            />
          </div>
        </div>
      );
    }

    return layerStats;
  };

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t('membershipSystem.wallet.connectTitle')}</h2>
          <p className="text-muted-foreground">
            {t('membershipSystem.matrix.connectDescription')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('membershipSystem.matrix.title')}
              {matrixData && (
                <Badge variant="secondary">
                  {t('membershipSystem.matrix.stats.totalMembers', { count: matrixData.totalMembers })}
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoomLevel(1)}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'tree' ? 'grid' : 'tree')}
              >
                <Eye className="h-4 w-4" />
                {viewMode === 'tree' ? t('membershipSystem.matrix.controls.gridView') : t('membershipSystem.matrix.controls.treeView')}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Matrix Visualization */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">{t('membershipSystem.matrix.controls.viewLayer')}</label>
                  <select
                    value={selectedLayer}
                    onChange={(e) => setSelectedLayer(Number(e.target.value))}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    {Array.from({ length: maxLayers }, (_, i) => i + 1).map(layer => (
                      <option key={layer} value={layer}>
                        {t('membershipSystem.matrix.visualization.layerNumber', { layer })}
                      </option>
                    ))}
                  </select>
                </div>

                {matrixData?.myPosition && (
                  <Badge variant="secondary">
                    {t('membershipSystem.matrix.stats.yourPosition', { layer: matrixData.myPosition.layer, position: matrixData.myPosition.position })}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[600px]">
                {viewMode === 'tree' ? renderTreeView() : renderGridView()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics & Controls */}
        <div className="space-y-6">
          {/* Layer Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('membershipSystem.matrix.layerFillStatus')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderStats()}
            </CardContent>
          </Card>

          {/* Referral Link */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('membershipSystem.matrix.referralLink.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="flex-1 px-2 py-1 text-xs bg-muted border rounded"
                />
                <Button size="sm" variant="outline" onClick={copyReferralLink}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              
              <Button
                onClick={shareReferralLink}
                className="w-full"
                size="sm"
              >
                <Share className="h-4 w-4 mr-2" />
                {t('membershipSystem.matrix.referralLink.share')}
              </Button>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('membershipSystem.matrix.quickStats.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {matrixData && (
                <>
                  <div className="flex justify-between">
                    <span>{t('membershipSystem.matrix.quickStats.totalMembers')}</span>
                    <span className="font-semibold">{matrixData.totalMembers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('membershipSystem.matrix.quickStats.activeLayers')}</span>
                    <span className="font-semibold">
                      {Math.max(...matrixData.members.map(m => m.layer))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('membershipSystem.matrix.quickStats.yourDirectRefs')}</span>
                    <span className="font-semibold">
                      {matrixData.members.filter(m => m.layer === 1).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('membershipSystem.matrix.quickStats.matrixDepth')}</span>
                    <span className="font-semibold">{t('membershipSystem.matrix.quickStats.layersCount', { count: maxLayers })}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReferralMatrixVisualization;
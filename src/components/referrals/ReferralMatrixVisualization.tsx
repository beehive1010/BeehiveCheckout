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
import { supabase } from '@/lib/supabase';
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
  maxLayers = 19 
}) => {
  const { walletAddress, isConnected } = useWallet();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [matrixData, setMatrixData] = useState<MatrixData | null>(null);
  const [selectedLayer, setSelectedLayer] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewMode, setViewMode] = useState<'layer' | 'grid'>('layer');
  const [referralLink, setReferralLink] = useState('');
  const [selectedMember, setSelectedMember] = useState<MatrixMember | null>(null);

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

      // Get matrix data from individual_matrix_placements table
      const { data: matrixPlacements, error } = await supabase
        .from('individual_matrix_placements')
        .select(`
          member_wallet,
          layer_in_owner_matrix,
          position_in_layer,
          placed_at,
          members!member_wallet (
            current_level,
            activation_rank
          ),
          users!member_wallet (
            username
          )
        `)
        .eq('matrix_owner', effectiveRootWallet)
        .order('layer_in_owner_matrix')
        .order('position_in_layer');

      if (error) {
        throw new Error(`Failed to load matrix data: ${error.message}`);
      }

      // Transform data to MatrixMember format
      const members: MatrixMember[] = matrixPlacements?.map(placement => ({
        walletAddress: placement.member_wallet,
        username: placement.users?.username,
        level: placement.members?.current_level || 1,
        layer: placement.layer_in_owner_matrix,
        position: parseInt(placement.position_in_layer || '0'),
        isActive: (placement.members?.current_level || 0) > 0,
        placedAt: placement.placed_at,
        downlineCount: 0 // TODO: Calculate downline count
      })) || [];

      // Create matrix data structure
      const totalLayers = Math.max(...members.map(m => m.layer), 0);
      const totalMembers = members.length;

      const matrixData: MatrixData = {
        rootWallet: effectiveRootWallet,
        members,
        totalLayers,
        totalMembers,
        myPosition: members.find(m => m.walletAddress === walletAddress) ? {
          layer: members.find(m => m.walletAddress === walletAddress)!.layer,
          position: members.find(m => m.walletAddress === walletAddress)!.position
        } : undefined
      };

      setMatrixData(matrixData);

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

  const handleMemberClick = (member: MatrixMember) => {
    setSelectedMember(member);
    // 可以在这里添加查看该用户下级的逻辑
    toast.success(`查看 ${member.username || member.walletAddress.slice(0, 8)} 的详细信息`);
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

  const renderLayerView = () => {
    if (!matrixData) return null;

    const layerMembers = matrixData.members.filter(m => m.layer === selectedLayer);
    
    // 对于Layer 1，显示L、M、R三个位置
    if (selectedLayer === 1) {
      const leftMember = layerMembers.find(m => m.position === 1);
      const middleMember = layerMembers.find(m => m.position === 2);
      const rightMember = layerMembers.find(m => m.position === 3);

      return (
        <div className="space-y-6">
          <div className="text-center">
            <Badge variant="outline" className="text-lg px-4 py-2">
              Layer {selectedLayer} ({layerMembers.length}/3)
            </Badge>
          </div>
          
          <div className="flex justify-center items-center gap-8">
            <div className="text-center">
              <div className="text-sm font-medium mb-2 text-muted-foreground">LEFT</div>
              {renderMatrixNode(leftMember || null, selectedLayer, 1)}
            </div>
            
            <div className="text-center">
              <div className="text-sm font-medium mb-2 text-muted-foreground">MIDDLE</div>
              {renderMatrixNode(middleMember || null, selectedLayer, 2)}
            </div>
            
            <div className="text-center">
              <div className="text-sm font-medium mb-2 text-muted-foreground">RIGHT</div>
              {renderMatrixNode(rightMember || null, selectedLayer, 3)}
            </div>
          </div>
        </div>
      );
    }

    // 对于更高层级，按L-M-R模式分组显示
    const positions = ['L', 'M', 'R'];
    const positionGroups = positions.map(pos => ({
      position: pos,
      members: layerMembers.filter(m => {
        if (pos === 'L') return m.position >= 1 && m.position <= Math.pow(3, selectedLayer-1);
        if (pos === 'M') return m.position > Math.pow(3, selectedLayer-1) && m.position <= Math.pow(3, selectedLayer-1) * 2;
        return m.position > Math.pow(3, selectedLayer-1) * 2;
      })
    }));

    return (
      <div className="space-y-6">
        <div className="text-center">
          <Badge variant="outline" className="text-lg px-4 py-2">
            Layer {selectedLayer} ({layerMembers.length}/{Math.pow(3, selectedLayer)})
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {positionGroups.map(group => (
            <div key={group.position} className="space-y-4">
              <div className="text-center">
                <Badge 
                  variant="outline" 
                  className={`
                    ${group.position === 'L' ? 'border-green-400 text-green-400' : 
                      group.position === 'M' ? 'border-blue-400 text-blue-400' : 
                      'border-purple-400 text-purple-400'}
                  `}
                >
                  {group.position === 'L' ? 'LEFT LEG' : 
                   group.position === 'M' ? 'MIDDLE LEG' : 
                   'RIGHT LEG'} ({group.members.length})
                </Badge>
                <div className="text-sm text-muted-foreground mt-1">
                  {group.members.length} members
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {group.members.slice(0, 6).map(member => (
                  <div key={member.walletAddress} className="cursor-pointer" onClick={() => handleMemberClick(member)}>
                    {renderMatrixNode(member, selectedLayer, member.position)}
                  </div>
                ))}
                {group.members.length > 6 && (
                  <div className="text-center p-3 border-2 border-dashed border-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      +{group.members.length - 6} more members
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
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
                onClick={() => setViewMode(viewMode === 'layer' ? 'grid' : 'layer')}
              >
                <Eye className="h-4 w-4" />
                {viewMode === 'layer' ? 'Grid View' : 'Layer View'}
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
                {viewMode === 'layer' ? renderLayerView() : renderGridView()}
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
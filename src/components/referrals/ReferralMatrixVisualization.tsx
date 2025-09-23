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
import { supabase } from '../../lib/supabase';
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

export default function ReferralMatrixVisualization({ 
  rootWallet, 
  maxLayers = 5 
}: ReferralMatrixVisualizationProps) {
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

      // Get referral data from matrix_referrals_tree_view
      const { data: matrixPlacements, error } = await supabase
        .from('matrix_referrals_tree_view')
        .select(`
          member_wallet,
          matrix_root_wallet,
          layer,
          position,
          referral_type,
          child_activation_time
        `)
        .eq('matrix_root_wallet', effectiveRootWallet)
        .order('child_activation_time');

      if (error) {
        throw new Error(`Failed to load matrix data: ${error.message}`);
      }

      // Get additional member and user info
      const memberWallets = matrixPlacements?.map(p => p.member_wallet).filter((w): w is string => Boolean(w)) || [];
      
      let membersData: any[] = [];
      let usersData: any[] = [];
      
      if (memberWallets.length > 0) {
        const [membersResult, usersResult] = await Promise.allSettled([
          supabase.from('members').select('wallet_address, current_level').in('wallet_address', memberWallets),
          supabase.from('users').select('wallet_address, username').in('wallet_address', memberWallets)
        ]);
        
        if (membersResult.status === 'fulfilled' && membersResult.value.data) {
          membersData = membersResult.value.data;
        }
        if (usersResult.status === 'fulfilled' && usersResult.value.data) {
          usersData = usersResult.value.data;
        }
      }

      const membersMap = new Map(membersData.map(m => [m.wallet_address, m]));
      const usersMap = new Map(usersData.map(u => [u.wallet_address, u]));

      // Transform data to MatrixMember format using matrix_referrals_tree_view data
      const members: MatrixMember[] = matrixPlacements?.map(placement => {
        // Convert position from L/M/R to 1/2/3 for internal use
        let positionNumber = 0;
        if (placement.position === 'L') positionNumber = 1;
        else if (placement.position === 'M') positionNumber = 2;
        else if (placement.position === 'R') positionNumber = 3;
        else positionNumber = parseInt(placement.position || '0');

        const memberInfo = membersMap.get(placement.member_wallet || '');
        const userInfo = usersMap.get(placement.member_wallet || '');

        return {
          walletAddress: placement.member_wallet || '',
          username: userInfo?.username || undefined,
          level: memberInfo?.current_level || 1,
          layer: placement.layer || 1,
          position: positionNumber,
          isActive: Boolean(memberInfo?.current_level && memberInfo.current_level > 0),
          placedAt: placement.child_activation_time || new Date().toISOString(),
          downlineCount: 0 // TODO: Calculate downline count
        };
      }).filter(member => member.walletAddress) || [];

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
        onClick={() => member && handleMemberClick(member)}
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
              <div className="text-sm font-medium mb-2 text-muted-foreground">{t('referrals.matrixPosition.left').toUpperCase()}</div>
              {renderMatrixNode(leftMember || null, selectedLayer, 1)}
            </div>
            
            <div className="text-center">
              <div className="text-sm font-medium mb-2 text-muted-foreground">{t('referrals.matrixPosition.middle').toUpperCase()}</div>
              {renderMatrixNode(middleMember || null, selectedLayer, 2)}
            </div>
            
            <div className="text-center">
              <div className="text-sm font-medium mb-2 text-muted-foreground">{t('referrals.matrixPosition.right').toUpperCase()}</div>
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
        if (pos === 'L') return m.position === 1;
        if (pos === 'M') return m.position === 2;
        if (pos === 'R') return m.position === 3;
        return false;
      })
    }));

    return (
      <div className="space-y-6">
        <div className="text-center">
          <Badge variant="outline" className="text-lg px-4 py-2">
            Layer {selectedLayer} ({layerMembers.length} members)
          </Badge>
        </div>
        
        <div className="grid grid-cols-3 gap-8">
          {positionGroups.map(group => (
            <div key={group.position} className="text-center">
              <div className="text-sm font-medium mb-4 text-muted-foreground">
                {group.position === 'L' ? t('referrals.matrixPosition.left').toUpperCase() : 
                 group.position === 'M' ? t('referrals.matrixPosition.middle').toUpperCase() : 
                 t('referrals.matrixPosition.right').toUpperCase()}
              </div>
              <div className="space-y-3">
                {group.members.length > 0 ? (
                  group.members.map(member => renderMatrixNode(member, selectedLayer, member.position))
                ) : (
                  renderMatrixNode(null, selectedLayer, group.position === 'L' ? 1 : group.position === 'M' ? 2 : 3)
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('membershipSystem.matrix.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-honey">
            <Users className="h-5 w-5" />
            {t('membershipSystem.matrix.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {matrixData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-honey/10 rounded-lg">
                <div className="text-2xl font-bold text-honey">{matrixData.totalMembers}</div>
                <div className="text-sm text-muted-foreground">{t('membershipSystem.matrix.stats.totalMembers')}</div>
              </div>
              <div className="text-center p-3 bg-purple-500/10 rounded-lg">
                <div className="text-2xl font-bold text-purple-500">{matrixData.totalLayers}</div>
                <div className="text-sm text-muted-foreground">{t('membershipSystem.matrix.stats.totalLayers')}</div>
              </div>
              <div className="text-center p-3 bg-green-500/10 rounded-lg">
                <div className="text-2xl font-bold text-green-500">
                  {matrixData.members.filter(m => m.isActive).length}
                </div>
                <div className="text-sm text-muted-foreground">{t('membershipSystem.matrix.stats.activeMembers')}</div>
              </div>
              <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                <div className="text-2xl font-bold text-blue-500">
                  {matrixData.myPosition ? `L${matrixData.myPosition.layer}` : 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">{t('membershipSystem.matrix.stats.myPosition')}</div>
              </div>
            </div>
          )}

          {/* Referral Link Section */}
          <div className="bg-secondary rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold mb-2">{t('membershipSystem.matrix.referralLink.title')}</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={referralLink} 
                readOnly 
                className="flex-1 px-3 py-2 text-sm bg-background border rounded-md"
              />
              <Button onClick={copyReferralLink} variant="outline" size="sm">
                <Copy className="h-4 w-4" />
              </Button>
              <Button onClick={shareReferralLink} variant="outline" size="sm">
                <Share className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="text-sm">{t('membershipSystem.matrix.controls.viewMode')}:</span>
              <Button
                variant={viewMode === 'layer' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('layer')}
              >
                {t('membershipSystem.matrix.controls.layerView')}
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                {t('membershipSystem.matrix.controls.gridView')}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm">{Math.round(zoomLevel * 100)}%</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matrix Visualization */}
      {matrixData && viewMode === 'layer' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('membershipSystem.matrix.visualization.title')}</CardTitle>
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(matrixData.totalLayers, maxLayers) }, (_, i) => i + 1).map(layer => (
                  <Button
                    key={layer}
                    variant={selectedLayer === layer ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedLayer(layer)}
                  >
                    L{layer}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderLayerView()}
          </CardContent>
        </Card>
      )}

      {/* Selected Member Details */}
      {selectedMember && (
        <Card>
          <CardHeader>
            <CardTitle>{t('membershipSystem.matrix.memberDetails.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t('membershipSystem.matrix.memberDetails.wallet')}</label>
                <p className="text-sm text-muted-foreground font-mono">{selectedMember.walletAddress}</p>
              </div>
              <div>
                <label className="text-sm font-medium">{t('membershipSystem.matrix.memberDetails.username')}</label>
                <p className="text-sm text-muted-foreground">{selectedMember.username || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium">{t('membershipSystem.matrix.memberDetails.level')}</label>
                <p className="text-sm text-muted-foreground">Level {selectedMember.level}</p>
              </div>
              <div>
                <label className="text-sm font-medium">{t('membershipSystem.matrix.memberDetails.position')}</label>
                <p className="text-sm text-muted-foreground">
                  Layer {selectedMember.layer}, Position {selectedMember.position === 1 ? t('referrals.matrixPosition.left') : selectedMember.position === 2 ? t('referrals.matrixPosition.middle') : t('referrals.matrixPosition.right')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
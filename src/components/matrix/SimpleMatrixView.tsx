import React, {useEffect, useState} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {ChevronLeft, ChevronRight, Trophy, Users} from 'lucide-react';
import {supabase} from '../../lib/supabase';
import { useI18n } from '../../contexts/I18nContext';

interface MatrixMember {
  walletAddress: string;
  username?: string;
  level: number;
  isActive: boolean;
  layer: number;
  position: string;
  isDirect?: boolean;
  isSpillover?: boolean;
  referrerWallet?: string;
}

interface MatrixLayerData {
  left: MatrixMember[];
  middle: MatrixMember[];
  right: MatrixMember[];
}

interface SimpleMatrixViewProps {
  walletAddress: string;
  rootUser?: { username: string; currentLevel: number };
  onNavigateToMember?: (memberWallet: string) => void;
}

const SimpleMatrixView: React.FC<SimpleMatrixViewProps> = ({ walletAddress, rootUser, onNavigateToMember }) => {
  const { t } = useI18n();
  const [currentLayer, setCurrentLayer] = useState(1);
  const [matrixData, setMatrixData] = useState<{ [key: number]: MatrixLayerData }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load matrix data from Supabase using optimized tree view
  useEffect(() => {
    const loadMatrixData = async () => {
      if (!walletAddress) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Get complete 19-layer matrix tree from referrals table with direct/spillover info
        const { data: treeData, error } = await supabase
          .from('referrals')
          .select(`
            member_wallet,
            matrix_root_wallet,
            matrix_layer,
            matrix_position,
            is_direct_referral,
            is_spillover_placement,
            placed_at,
            referrer_wallet,
            member_activation_sequence
          `)
          .eq('matrix_root_wallet', walletAddress.toLowerCase()) // Use ilike for case-insensitive comparison
          .order('matrix_layer')
          .order('member_activation_sequence');
        
        if (!error && treeData) {
          console.log(`🔍 SimpleMatrixView: Raw tree data for ${walletAddress}:`, treeData.length, 'records');
          console.log(`🔍 SimpleMatrixView: Sample data:`, treeData.slice(0, 5));
          
          const organizedData: { [key: number]: MatrixLayerData } = {};
          
          // Initialize all 19 layers
          for (let i = 1; i <= 19; i++) {
            organizedData[i] = { left: [], middle: [], right: [] };
          }
          
          // Get user and member information
          const memberWallets = treeData.map(node => node.member_wallet);
          let usersData = [];
          let membersDetailData = [];

          if (memberWallets.length > 0) {
            const [usersResult, membersResult] = await Promise.allSettled([
              supabase
                .from('users')
                .select('wallet_address, username')
                .in('wallet_address', memberWallets),
              supabase
                .from('members')
                .select('wallet_address, current_level')
                .in('wallet_address', memberWallets)
            ]);

            if (usersResult.status === 'fulfilled' && usersResult.value.data) {
              usersData = usersResult.value.data;
            }
            if (membersResult.status === 'fulfilled' && membersResult.value.data) {
              membersDetailData = membersResult.value.data;
            }
          }

          // Organize matrix data by layer and position (from referrals table)
          treeData.forEach((node: any) => {
            const layer = node.matrix_layer;
            const position = node.matrix_position;
            
            console.log(`🔍 Processing node:`, { 
              layer, 
              position, 
              member_wallet: node.member_wallet,
              isDirect: node.is_direct_referral,
              isSpillover: node.is_spillover_placement
            });

            const userData = usersData.find(u => 
              u.wallet_address.toLowerCase() === node.member_wallet.toLowerCase()
            );
            const memberDetail = membersDetailData.find(m => 
              m.wallet_address.toLowerCase() === node.member_wallet.toLowerCase()
            );
            
            const member: MatrixMember = {
              walletAddress: node.member_wallet,
              username: userData?.username || `User${node.member_wallet.slice(-4)}`,
              level: memberDetail?.current_level || 1,
              isActive: true, // All in matrix are ActiveMember
              layer: layer,
              position: position,
              isDirect: node.is_direct_referral || false,
              isSpillover: node.is_spillover_placement || false,
              referrerWallet: node.referrer_wallet
            };
            
            // Distribute to L-M-R based on position
            if (organizedData[layer]) {
              const pos = String(position).toUpperCase();
              
              if (pos === 'L') {
                organizedData[layer].left.push(member);
              } else if (pos === 'M') {
                organizedData[layer].middle.push(member);
              } else if (pos === 'R') {
                organizedData[layer].right.push(member);
              }
            }
          });
          
          // Debug: Log layer data summary with detailed info
          const layersWithData = Object.keys(organizedData)
            .map(layer => parseInt(layer))
            .filter(layer => {
              const data = organizedData[layer];
              return (data.left.length + data.middle.length + data.right.length) > 0;
            });
          
          console.log(`🔍 SimpleMatrixView: Layers with data:`, layersWithData);
          console.log(`🔍 SimpleMatrixView: Highest layer with data:`, Math.max(...layersWithData, 0));
          
          // Log detailed layer breakdown
          layersWithData.forEach(layer => {
            const data = organizedData[layer];
            console.log(`🔍 Layer ${layer} details:`, {
              left: data.left.length,
              middle: data.middle.length,
              right: data.right.length,
              total: data.left.length + data.middle.length + data.right.length
            });
          });
          
          setMatrixData(organizedData);
        } else {
          // Initialize empty matrix if no data
          const emptyData: { [key: number]: MatrixLayerData } = {};
          for (let i = 1; i <= 19; i++) {
            emptyData[i] = { left: [], middle: [], right: [] };
          }
          setMatrixData(emptyData);
        }
      } catch (error: any) {
        console.error('Error loading matrix tree data:', error);
        setError(error.message || t('matrix.errors.loadTreeDataFailed'));
        
        // Initialize empty matrix on error
        const emptyData: { [key: number]: MatrixLayerData } = {};
        for (let i = 1; i <= 19; i++) {
          emptyData[i] = { left: [], middle: [], right: [] };
        }
        setMatrixData(emptyData);
      } finally {
        setLoading(false);
      }
    };

    loadMatrixData();
  }, [walletAddress]);

  const currentData = matrixData[currentLayer] || { left: [], middle: [], right: [] };

  const renderMemberCard = (member: any) => (
    <div 
      key={member.walletAddress} 
      className="bg-background border border-honey/20 rounded-lg p-3 text-center cursor-pointer hover:bg-honey/10 transition-all"
      onClick={() => {
        if (onNavigateToMember) {
          console.log('📊 Simple matrix navigating to member:', member.walletAddress);
          onNavigateToMember(member.walletAddress);
        }
      }}
    >
      <div className="w-12 h-12 bg-gradient-to-br from-honey to-honey/80 rounded-full mx-auto mb-2 flex items-center justify-center">
        <span className="text-black font-bold text-sm">
          {member.username?.charAt(0).toUpperCase() || 'U'}
        </span>
      </div>
      <div className="text-sm font-medium truncate">{member.username || t('matrix.ui.unknown')}</div>
      <div className="text-xs text-muted-foreground">
        {member.walletAddress?.slice(0, 6)}...{member.walletAddress?.slice(-4)}
      </div>
      <Badge variant={member.isActive ? 'default' : 'secondary'} className="mt-1 text-xs">
        L{member.level}
      </Badge>
    </div>
  );

  const renderEmptySlot = () => (
    <div className="bg-muted/20 border-2 border-dashed border-muted rounded-lg p-3 text-center">
      <div className="w-12 h-12 border-2 border-dashed border-muted rounded-full mx-auto mb-2 flex items-center justify-center">
        <Users className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="text-xs text-muted-foreground">Empty</div>
    </div>
  );

  return (
    <Card className="bg-secondary border-border">
      <CardHeader>
        <CardTitle className="text-honey flex items-center space-x-2">
          <Trophy className="h-5 w-5" />
          <span>{t('referrals.matrixSystem.matrixNetworkLayer', { layer: currentLayer })}</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Loading.tsx State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto mb-2"></div>
            <div className="text-sm text-muted-foreground">Loading matrix data...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <div className="text-red-400 mb-2">⚠️ Error loading matrix data</div>
            <div className="text-xs text-muted-foreground">{error}</div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Layer Navigation */}
        {!loading && !error && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentLayer(Math.max(1, currentLayer - 1))}
              disabled={currentLayer <= 1}
              className="border-honey/30 text-honey hover:bg-honey hover:text-black"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="text-center">
              <Badge variant="outline" className="text-lg px-4 py-2">
                Layer {currentLayer} / 19
              </Badge>
              <div className="text-xs text-muted-foreground mt-1">
                Max capacity: {Math.pow(3, currentLayer)} positions
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentLayer(Math.min(19, currentLayer + 1))}
              disabled={currentLayer >= 19}
              className="border-honey/30 text-honey hover:bg-honey hover:text-black"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Layer Quick Navigation */}
          <div className="flex flex-wrap justify-center gap-1">
            {Array.from({ length: 19 }, (_, i) => {
              const layerNum = i + 1;
              const isActive = layerNum === currentLayer;
              const layerData = matrixData[layerNum];
              const memberCount = (layerData?.left?.length || 0) + (layerData?.middle?.length || 0) + (layerData?.right?.length || 0);
              
              return (
                <Button
                  key={layerNum}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentLayer(layerNum)}
                  className={`h-8 w-10 text-xs ${
                    isActive 
                      ? 'bg-honey text-black' 
                      : memberCount > 0 
                        ? 'border-honey/30 text-honey hover:bg-honey/20' 
                        : 'border-muted text-muted-foreground'
                  }`}
                >
                  {layerNum}
                  {memberCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                  )}
                </Button>
              );
            })}
          </div>
        </div>
        )}

        {!loading && !error && (
        <>
        {/* L-M-R Matrix Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Leg */}
          <div className="space-y-4">
            <div className="text-center">
              <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-400">
                LEFT LEG ({currentData.left.length})
              </Badge>
            </div>
            <div className="space-y-3 min-h-[200px]">
              {currentData.left.length > 0 ? (
                currentData.left.slice(0, 8).map(renderMemberCard)
              ) : (
                <div className="text-center py-8">
                  {renderEmptySlot()}
                  <p className="text-xs text-muted-foreground mt-2">No members yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Middle Leg */}
          <div className="space-y-4">
            <div className="text-center">
              <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-400">
                MIDDLE LEG ({currentData.middle.length})
              </Badge>
            </div>
            <div className="space-y-3 min-h-[200px]">
              {currentData.middle.length > 0 ? (
                currentData.middle.slice(0, 8).map(renderMemberCard)
              ) : (
                <div className="text-center py-8">
                  {renderEmptySlot()}
                  <p className="text-xs text-muted-foreground mt-2">No members yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Leg */}
          <div className="space-y-4">
            <div className="text-center">
              <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30 text-purple-400">
                RIGHT LEG ({currentData.right.length})
              </Badge>
            </div>
            <div className="space-y-3 min-h-[200px]">
              {currentData.right.length > 0 ? (
                currentData.right.slice(0, 8).map(renderMemberCard)
              ) : (
                <div className="text-center py-8">
                  {renderEmptySlot()}
                  <p className="text-xs text-muted-foreground mt-2">No members yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Layer Summary */}
        <div className="grid grid-cols-3 gap-4 text-center pt-4 border-t border-border">
          <div className="bg-green-500/5 rounded-lg p-3 border border-green-500/20">
            <div className="text-xl font-bold text-green-400">{currentData.left.length}</div>
            <div className="text-xs text-muted-foreground">{t('referrals.matrixPosition.leftPosition')}</div>
          </div>
          <div className="bg-blue-500/5 rounded-lg p-3 border border-blue-500/20">
            <div className="text-xl font-bold text-blue-400">{currentData.middle.length}</div>
            <div className="text-xs text-muted-foreground">{t('referrals.matrixPosition.middlePosition')}</div>
          </div>
          <div className="bg-purple-500/5 rounded-lg p-3 border border-purple-500/20">
            <div className="text-xl font-bold text-purple-400">{currentData.right.length}</div>
            <div className="text-xs text-muted-foreground">{t('referrals.matrixPosition.rightPosition')}</div>
          </div>
        </div>
        </>
        )}
      </CardContent>
    </Card>
  );
};

export default SimpleMatrixView;
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Users, Trophy } from 'lucide-react';
import { matrixService } from '@/lib/supabaseClient';
import { useI18n } from '@/contexts/I18nContext';

interface MatrixMember {
  walletAddress: string;
  username?: string;
  level: number;
  isActive: boolean;
  layer: number;
  position: string;
}

interface MatrixLayerData {
  left: MatrixMember[];
  middle: MatrixMember[];
  right: MatrixMember[];
}

interface SimpleMatrixViewProps {
  walletAddress: string;
  rootUser?: { username: string; currentLevel: number };
}

const SimpleMatrixView: React.FC<SimpleMatrixViewProps> = ({ walletAddress, rootUser }) => {
  const { t } = useI18n();
  const [currentLayer, setCurrentLayer] = useState(1);
  const [matrixData, setMatrixData] = useState<{ [key: number]: MatrixLayerData }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load matrix data from Supabase
  useEffect(() => {
    const loadMatrixData = async () => {
      if (!walletAddress) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Get matrix tree data
        const result = await matrixService.getMatrixTree(walletAddress);
        
        if (result.success && result.matrix) {
          const organizedData: { [key: number]: MatrixLayerData } = {};
          
          // Initialize all 19 layers
          for (let i = 1; i <= 19; i++) {
            organizedData[i] = { left: [], middle: [], right: [] };
          }
          
          // Organize referrals by layer and position
          result.matrix.forEach((referral: any) => {
            if (!referral.matrix_layer || !referral.matrix_position) return;
            
            const layer = referral.matrix_layer;
            const position = referral.matrix_position;
            
            const member: MatrixMember = {
              walletAddress: referral.member_wallet,
              username: referral.member_info?.username || `User${referral.member_wallet.slice(-4)}`,
              level: 1, // You can get this from members table if needed
              isActive: referral.is_active,
              layer: layer,
              position: position
            };
            
            // Distribute to L-M-R based on position
            // In 3x3 matrix: positions are typically ordered sequentially
            // We'll map them to L-M-R columns
            if (organizedData[layer]) {
              const positionNumber = parseInt(position) || 0;
              if (positionNumber % 3 === 1) {
                organizedData[layer].left.push(member);
              } else if (positionNumber % 3 === 2) {
                organizedData[layer].middle.push(member);
              } else {
                organizedData[layer].right.push(member);
              }
            }
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
        console.error('Error loading matrix data:', error);
        setError(error.message || 'Failed to load matrix data');
        
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
    <div key={member.walletAddress} className="bg-background border border-honey/20 rounded-lg p-3 text-center">
      <div className="w-12 h-12 bg-gradient-to-br from-honey to-honey/80 rounded-full mx-auto mb-2 flex items-center justify-center">
        <span className="text-black font-bold text-sm">
          {member.username?.charAt(0).toUpperCase() || 'U'}
        </span>
      </div>
      <div className="text-sm font-medium truncate">{member.username || 'Unknown'}</div>
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
          <span>3×3 Matrix Network - Layer {currentLayer}</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Loading State */}
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
            <div className="text-xs text-muted-foreground">Right Leg</div>
          </div>
        </div>
        </>
        )}
      </CardContent>
    </Card>
  );
};

export default SimpleMatrixView;
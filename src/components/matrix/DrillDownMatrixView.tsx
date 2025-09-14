import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ChevronRight, Users, Trophy, ArrowLeft, Home } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useI18n } from '../../contexts/I18nContext';

interface MatrixMember {
  walletAddress: string;
  username?: string;
  level: number;
  isActive: boolean;
  layer: number;
  position: 'L' | 'M' | 'R';
  placedAt?: string;
}

interface MatrixNode {
  member: MatrixMember | null;
  left: MatrixMember[];
  middle: MatrixMember[];
  right: MatrixMember[];
}

interface NavigationPath {
  walletAddress: string;
  username: string;
  position?: 'L' | 'M' | 'R';
  layer: number;
}

interface DrillDownMatrixViewProps {
  rootWalletAddress: string;
  rootUser?: { username: string; currentLevel: number };
}

const DrillDownMatrixView: React.FC<DrillDownMatrixViewProps> = ({ 
  rootWalletAddress, 
  rootUser 
}) => {
  const { t } = useI18n();
  const [currentNode, setCurrentNode] = useState<MatrixNode | null>(null);
  const [navigationPath, setNavigationPath] = useState<NavigationPath[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with root user
  useEffect(() => {
    loadMemberMatrix(rootWalletAddress, true);
  }, [rootWalletAddress]);

  const loadMemberMatrix = async (walletAddress: string, isRoot = false) => {
    setLoading(true);
    setError(null);

    try {
      // Use matrix Edge Function to get all layers data
      console.log(`🔍 Loading matrix for wallet: ${walletAddress}, showing all 19 layers`);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/matrix`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress
        },
        body: JSON.stringify({
          action: 'get-matrix',
          rootWallet: walletAddress,
          maxLayers: 19
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load matrix data');
      }

      const matrixData = result.data;
      
      console.log(`🔍 Matrix data for ${walletAddress}:`, matrixData);

      if (matrixData && matrixData.matrix_data) {
        // Parse matrix data from Edge Function response
        const allLayers = matrixData.matrix_data.by_layer || {};
        const currentLayer = 1; // Start with layer 1
        
        // Get members for the current layer (first layer by default)
        const layerMembers = allLayers[currentLayer] || [];
        
        // Group members by position (L, M, R)
        const leftMembers: MatrixMember[] = [];
        const middleMembers: MatrixMember[] = [];
        const rightMembers: MatrixMember[] = [];
        
        layerMembers.forEach((member: any) => {
          const memberData: MatrixMember = {
            walletAddress: member.wallet_address,
            username: member.members?.username || `User_${member.wallet_address.slice(-6)}`,
            level: member.members?.current_level || 1,
            isActive: member.is_activated || member.members?.is_activated || false,
            layer: member.layer,
            position: member.position as 'L' | 'M' | 'R',
            placedAt: member.created_at || new Date().toISOString()
          };
          
          // Only include members directly under this root (not nested)
          if (member.parent_wallet === walletAddress) {
            if (member.position === 'L') leftMembers.push(memberData);
            else if (member.position === 'M') middleMembers.push(memberData);
            else if (member.position === 'R') rightMembers.push(memberData);
          }
        });

        // Create current member info
        const currentMember: MatrixMember = {
          walletAddress: walletAddress,
          username: isRoot 
            ? (rootUser?.username || `User_${walletAddress.slice(-6)}`) 
            : `User_${walletAddress.slice(-6)}`,
          level: isRoot 
            ? (rootUser?.currentLevel || 1) 
            : 1,
          isActive: true,
          layer: navigationPath.length,
          position: navigationPath.length > 0 ? (navigationPath[navigationPath.length - 1].position || 'L') : 'L'
        };

        const nodeData: MatrixNode = {
          member: currentMember,
          left: leftMembers,
          middle: middleMembers,
          right: rightMembers
        };

        setCurrentNode(nodeData);
        
        if (isRoot) {
          setNavigationPath([{
            walletAddress: walletAddress,
            username: currentMember.username,
            layer: 0
          }]);
        }

      } else {
        // No referrals - create empty matrix
        const currentMember: MatrixMember = {
          walletAddress: walletAddress,
          username: isRoot ? (rootUser?.username || `User${walletAddress.slice(-4)}`) : `User${walletAddress.slice(-4)}`,
          level: isRoot ? (rootUser?.currentLevel || 1) : 1,
          isActive: true,
          layer: navigationPath.length,
          position: navigationPath.length > 0 ? (navigationPath[navigationPath.length - 1].position || 'L') : 'L'
        };

        setCurrentNode({
          member: currentMember,
          left: [],
          middle: [],
          right: []
        });
        
        if (isRoot) {
          setNavigationPath([{
            walletAddress: walletAddress,
            username: currentMember.username,
            layer: 0
          }]);
        }
      }
    } catch (error: any) {
      console.error('Error loading matrix data:', error);
      setError(error.message || 'Failed to load matrix data');
    } finally {
      setLoading(false);
    }
  };

  // transformToMatrixMember function no longer needed as we use matrix_structure_view

  const handleMemberClick = async (member: MatrixMember) => {
    if (!member.walletAddress) return;

    // Add to navigation path
    const newPath = [...navigationPath, {
      walletAddress: member.walletAddress,
      username: member.username || `User${member.walletAddress.slice(-4)}`,
      position: member.position,
      layer: member.layer
    }];
    
    setNavigationPath(newPath);
    await loadMemberMatrix(member.walletAddress);
  };

  const navigateToLevel = async (pathIndex: number) => {
    if (pathIndex >= navigationPath.length) return;

    const targetPath = navigationPath.slice(0, pathIndex + 1);
    setNavigationPath(targetPath);
    
    const targetWallet = targetPath[targetPath.length - 1].walletAddress;
    await loadMemberMatrix(targetWallet);
  };

  const goToRoot = async () => {
    setNavigationPath([navigationPath[0]]);
    await loadMemberMatrix(rootWalletAddress, true);
  };

  const renderMemberCard = (member: MatrixMember | null, position: 'L' | 'M' | 'R') => {
    const isEmpty = !member;
    const positionColors = {
      L: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
      M: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
      R: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' }
    };
    const colors = positionColors[position];

    return (
      <div 
        className={`
          relative h-24 md:h-32 rounded-lg border-2 flex flex-col items-center justify-center p-2 md:p-4 transition-all cursor-pointer text-center
          ${isEmpty 
            ? 'border-dashed border-muted-foreground/30 bg-muted/20 hover:bg-muted/30' 
            : `${colors.border} ${colors.bg} hover:bg-opacity-80`
          }
        `}
        onClick={() => member && handleMemberClick(member)}
        data-testid={`matrix-position-${position}`}
      >
        {member ? (
          <>
            <div className="w-16 h-16 bg-gradient-to-br from-honey to-honey/80 rounded-full flex items-center justify-center mb-2 shadow-lg">
              <span className="text-black font-bold text-lg">
                {member.username?.charAt(0).toUpperCase() || member.walletAddress?.charAt(2).toUpperCase()}
              </span>
            </div>
            
            <div className="text-center">
              <div className="text-sm font-medium truncate max-w-full mb-1">
                {member.username || `User${member.walletAddress?.slice(-4)}`}
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                {member.walletAddress?.slice(0, 6)}...{member.walletAddress?.slice(-4)}
              </div>
              <Badge 
                variant={member.isActive ? 'default' : 'secondary'} 
                className={`text-xs ${
                  member.isActive 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-500 text-white'
                }`}
              >
                L{member.level}
              </Badge>
            </div>

            {/* Click indicator */}
            <div className="absolute top-2 right-2">
              <ChevronRight className="h-4 w-4 text-honey" />
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 border-2 border-dashed border-muted-foreground/30 rounded-full mx-auto mb-2 flex items-center justify-center">
              <Users className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <div className="text-sm text-muted-foreground">Available</div>
            <div className="text-xs text-muted-foreground/70 mt-1">
              Position {position}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>3×3 Matrix Network</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto mb-2"></div>
            <div className="text-sm text-muted-foreground">Loading matrix data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>3×3 Matrix Network</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-red-400 mb-2">⚠️ Error loading matrix data</div>
            <div className="text-xs text-muted-foreground">{error}</div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => loadMemberMatrix(rootWalletAddress, true)}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-secondary border-border">
      <CardHeader>
        <CardTitle className="text-honey flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>3×3 Matrix Network (19 Layers)</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="border-honey text-honey">
              Current: Layer {Math.max(navigationPath.length, 1)}
            </Badge>
            <Badge variant="outline" className="border-blue-400 text-blue-400">
              Max: 19 Layers
            </Badge>
          </div>
        </CardTitle>
        
        {/* Layer Progress Indicator */}
        <div className="flex items-center space-x-2 mt-3">
          <span className="text-xs text-muted-foreground">Depth:</span>
          <div className="flex-1 bg-muted rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-honey to-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((Math.max(navigationPath.length, 1) / 19) * 100, 100)}%` }}
            ></div>
          </div>
          <span className="text-xs text-honey font-semibold">
            {Math.max(navigationPath.length, 1)}/19
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Navigation Breadcrumb */}
        {navigationPath.length > 1 && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToRoot}
                className="border-honey/30 text-honey hover:bg-honey hover:text-black"
              >
                <Home className="h-4 w-4 mr-1" />
                Root
              </Button>
              {navigationPath.length > 2 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateToLevel(navigationPath.length - 2)}
                  className="border-honey/30 text-honey hover:bg-honey hover:text-black"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
            </div>
            
            {/* Breadcrumb Path */}
            <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
              <span>Path:</span>
              {navigationPath.map((node, index) => (
                <React.Fragment key={node.walletAddress}>
                  {index > 0 && <ChevronRight className="h-3 w-3" />}
                  <button
                    onClick={() => navigateToLevel(index)}
                    className="hover:text-honey transition-colors cursor-pointer"
                  >
                    {node.username}
                    {node.position && ` (${node.position})`}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Current Member Info */}
        {currentNode?.member && (
          <div className="text-center bg-gradient-to-r from-honey/5 to-honey/10 rounded-lg p-4 border border-honey/20">
            <div className="w-20 h-20 bg-gradient-to-br from-honey to-honey/80 rounded-full mx-auto mb-3 flex items-center justify-center shadow-lg">
              <span className="text-black font-bold text-xl">
                {currentNode.member.username?.charAt(0).toUpperCase() || currentNode.member.walletAddress?.charAt(2).toUpperCase()}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-honey mb-1">
              {currentNode.member.username || `User${currentNode.member.walletAddress?.slice(-4)}`}
            </h3>
            <div className="text-sm text-muted-foreground mb-2">
              {currentNode.member.walletAddress?.slice(0, 8)}...{currentNode.member.walletAddress?.slice(-4)}
            </div>
            <Badge className="bg-honey text-black">
              Level {currentNode.member.level}
            </Badge>
          </div>
        )}

        {/* 19-Layer Matrix Overview - Mobile Optimized */}
        <div className="bg-muted/30 rounded-lg p-3 md:p-4 border border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <h4 className="text-sm font-semibold text-honey">19-Layer Network</h4>
            <Badge variant="secondary" className="text-xs self-start sm:self-center">
              Tap layer to explore
            </Badge>
          </div>
          
          {/* Layer visualization - First 10 layers */}
          <div className="space-y-2">
            <div className="flex gap-1">
              {Array.from({ length: 10 }, (_, i) => {
                const layer = i + 1;
                const isCurrentLayer = layer === Math.max(navigationPath.length, 1);
                const hasData = layer <= (Math.max(navigationPath.length, 1) + 1);
                
                return (
                  <div
                    key={layer}
                    className={`
                      flex-1 h-8 rounded text-xs flex items-center justify-center cursor-pointer transition-all
                      ${isCurrentLayer 
                        ? 'bg-honey text-black font-bold' 
                        : hasData 
                          ? 'bg-honey/20 text-honey hover:bg-honey/30' 
                          : 'bg-muted text-muted-foreground hover:bg-muted/70'
                      }
                    `}
                    title={`Layer ${layer}${isCurrentLayer ? ' (Current)' : ''}`}
                  >
                    {layer}
                  </div>
                );
              })}
            </div>
            
            {/* Second row - Layers 11-19 */}
            <div className="flex gap-1">
              {Array.from({ length: 9 }, (_, i) => {
                const layer = i + 11;
                const isCurrentLayer = layer === Math.max(navigationPath.length, 1);
                const hasData = layer <= (Math.max(navigationPath.length, 1) + 1);
                
                return (
                  <div
                    key={layer}
                    className={`
                      flex-1 h-8 rounded text-xs flex items-center justify-center cursor-pointer transition-all
                      ${isCurrentLayer 
                        ? 'bg-honey text-black font-bold' 
                        : hasData 
                          ? 'bg-honey/20 text-honey hover:bg-honey/30' 
                          : 'bg-muted text-muted-foreground hover:bg-muted/70'
                      }
                    `}
                    title={`Layer ${layer}${isCurrentLayer ? ' (Current)' : ''}`}
                  >
                    {layer}
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Layer 1</span>
            <span>Layer 19</span>
          </div>
        </div>

        {/* L-M-R Matrix Display - Mobile Optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
          {/* Left Position */}
          <div className="space-y-2 md:space-y-4">
            <div className="text-center">
              <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-400 text-xs">
                LEFT ({currentNode?.left.length || 0})
              </Badge>
            </div>
            {renderMemberCard(currentNode?.left[0] || null, 'L')}
          </div>

          {/* Middle Position */}
          <div className="space-y-2 md:space-y-4">
            <div className="text-center">
              <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-400 text-xs">
                MIDDLE ({currentNode?.middle.length || 0})
              </Badge>
            </div>
            {renderMemberCard(currentNode?.middle[0] || null, 'M')}
          </div>

          {/* Right Position */}
          <div className="space-y-2 md:space-y-4">
            <div className="text-center">
              <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30 text-purple-400 text-xs">
                RIGHT ({currentNode?.right.length || 0})
              </Badge>
            </div>
            {renderMemberCard(currentNode?.right[0] || null, 'R')}
          </div>
        </div>

        {/* Help Text */}
        <div className="text-center text-sm text-muted-foreground bg-muted/20 rounded-lg p-3">
          <p>点击任意会员查看其下级 L-M-R 矩阵</p>
          <p className="text-xs mt-1">Click any member to view their L-M-R downline matrix</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DrillDownMatrixView;
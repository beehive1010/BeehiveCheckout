import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Users, Trophy, ArrowLeft, Home } from 'lucide-react';
import { matrixService } from '@/lib/supabaseClient';
import { useI18n } from '@/contexts/I18nContext';

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
      // Get matrix tree data for this specific member
      const result = await matrixService.getMatrixTree(walletAddress);
      
      if (result.success && result.matrix) {
        // Find direct referrals of this member (their L-M-R)
        const directReferrals = result.matrix.filter((ref: any) => 
          ref.referrer_wallet?.toLowerCase() === walletAddress.toLowerCase() && 
          ref.matrix_layer === 1 // Direct referrals are at layer 1 relative to this member
        );

        // Group by position
        const leftMembers = directReferrals
          .filter((ref: any) => ref.matrix_position === 'L' || ref.matrix_position === '1')
          .map(transformToMatrixMember);
        
        const middleMembers = directReferrals
          .filter((ref: any) => ref.matrix_position === 'M' || ref.matrix_position === '2')
          .map(transformToMatrixMember);
        
        const rightMembers = directReferrals
          .filter((ref: any) => ref.matrix_position === 'R' || ref.matrix_position === '3')
          .map(transformToMatrixMember);

        // Create current member info
        const currentMember: MatrixMember = {
          walletAddress: walletAddress,
          username: isRoot ? (rootUser?.username || `User${walletAddress.slice(-4)}`) : `User${walletAddress.slice(-4)}`,
          level: isRoot ? (rootUser?.currentLevel || 1) : 1,
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
      }
    } catch (error: any) {
      console.error('Error loading matrix data:', error);
      setError(error.message || 'Failed to load matrix data');
    } finally {
      setLoading(false);
    }
  };

  const transformToMatrixMember = (referral: any): MatrixMember => ({
    walletAddress: referral.member_wallet,
    username: referral.member_info?.username || `User${referral.member_wallet.slice(-4)}`,
    level: 1,
    isActive: referral.is_active,
    layer: navigationPath.length + 1,
    position: referral.matrix_position === '1' ? 'L' : 
             referral.matrix_position === '2' ? 'M' : 
             referral.matrix_position === '3' ? 'R' : referral.matrix_position
  });

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
          relative h-32 rounded-lg border-2 flex flex-col items-center justify-center p-4 transition-all cursor-pointer
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
            <span>3×3 Matrix Network</span>
          </div>
          <Badge variant="outline" className="border-honey text-honey">
            Layer {navigationPath.length}
          </Badge>
        </CardTitle>
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

        {/* L-M-R Matrix Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Position */}
          <div className="space-y-4">
            <div className="text-center">
              <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-400">
                LEFT LEG ({currentNode?.left.length || 0})
              </Badge>
            </div>
            {renderMemberCard(currentNode?.left[0] || null, 'L')}
          </div>

          {/* Middle Position */}
          <div className="space-y-4">
            <div className="text-center">
              <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-400">
                MIDDLE LEG ({currentNode?.middle.length || 0})
              </Badge>
            </div>
            {renderMemberCard(currentNode?.middle[0] || null, 'M')}
          </div>

          {/* Right Position */}
          <div className="space-y-4">
            <div className="text-center">
              <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30 text-purple-400">
                RIGHT LEG ({currentNode?.right.length || 0})
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
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Users, 
  Crown, 
  TrendingUp, 
  Eye, 
  EyeOff,
  Layers,
  Target,
  Gift,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '../ui/toast-system';
import { LoadingSpinner, CenteredSpinner } from '../ui/loading-spinner';
import { FadeTransition, ScaleTransition, StaggeredList } from '../ui/transitions';
import { cn } from '../../lib/utils';
import { useI18n } from '../../contexts/I18nContext';

interface MatrixPosition {
  id: string;
  level: number;
  layer: number;
  position: 'left' | 'right';
  wallet_address?: string;
  is_filled: boolean;
  member_level?: number;
  is_active: boolean;
  joined_at?: string;
  avatar?: string;
  username?: string;
}

interface LayerReward {
  layer: number;
  reward_amount: number;
  is_claimable: boolean;
  claimed_at?: string;
  expires_at?: string;
  status: 'pending' | 'claimable' | 'claimed' | 'expired';
}

interface MatrixVisualizationProps {
  walletAddress: string;
  className?: string;
}

// Mock data - would come from API in real implementation
const mockMatrixData: MatrixPosition[] = [
  // Layer 1
  { id: '1-1-left', level: 1, layer: 1, position: 'left', wallet_address: '0xabc...123', is_filled: true, member_level: 2, is_active: true, joined_at: '2024-01-15', username: 'Alice' },
  { id: '1-1-right', level: 1, layer: 1, position: 'right', is_filled: false, is_active: false },
  
  // Layer 2 
  { id: '2-1-left', level: 1, layer: 2, position: 'left', wallet_address: '0xdef...456', is_filled: true, member_level: 1, is_active: true, joined_at: '2024-02-01', username: 'Bob' },
  { id: '2-1-right', level: 1, layer: 2, position: 'right', is_filled: false, is_active: false },
  { id: '2-2-left', level: 2, layer: 2, position: 'left', wallet_address: '0x789...def', is_filled: true, member_level: 3, is_active: true, joined_at: '2024-02-10', username: 'Charlie' },
  { id: '2-2-right', level: 2, layer: 2, position: 'right', is_filled: false, is_active: false },
  
  // Layer 3 - partially filled
  { id: '3-1-left', level: 1, layer: 3, position: 'left', wallet_address: '0x111...aaa', is_filled: true, member_level: 1, is_active: true, joined_at: '2024-02-20', username: 'David' },
  { id: '3-1-right', level: 1, layer: 3, position: 'right', is_filled: false, is_active: false },
  { id: '3-2-left', level: 2, layer: 3, position: 'left', is_filled: false, is_active: false },
  { id: '3-2-right', level: 2, layer: 3, position: 'right', is_filled: false, is_active: false },
  { id: '3-3-left', level: 3, layer: 3, position: 'left', is_filled: false, is_active: false },
  { id: '3-3-right', level: 3, layer: 3, position: 'right', is_filled: false, is_active: false },
  { id: '3-4-left', level: 4, layer: 3, position: 'left', is_filled: false, is_active: false },
  { id: '3-4-right', level: 4, layer: 3, position: 'right', is_filled: false, is_active: false },
];

const mockLayerRewards: LayerReward[] = [
  { layer: 1, reward_amount: 50, is_claimable: true, status: 'claimable', expires_at: '2024-09-10T12:00:00Z' },
  { layer: 2, reward_amount: 100, is_claimable: false, status: 'pending' },
  { layer: 3, reward_amount: 200, is_claimable: false, status: 'pending' },
];

export const MatrixVisualization: React.FC<MatrixVisualizationProps> = ({
  walletAddress,
  className
}) => {
  const { t } = useI18n();
  const [activeLayer, setActiveLayer] = useState(1);
  const [showEmptyPositions, setShowEmptyPositions] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const layerData = useMemo(() => {
    return mockMatrixData.filter(pos => pos.layer === activeLayer);
  }, [activeLayer]);

  const layerStats = useMemo(() => {
    const totalPositions = Math.pow(2, activeLayer);
    const filledPositions = layerData.filter(pos => pos.is_filled).length;
    const activeMembers = layerData.filter(pos => pos.is_active).length;
    
    return {
      totalPositions,
      filledPositions,
      activeMembers,
      fillPercentage: (filledPositions / totalPositions) * 100
    };
  }, [layerData, activeLayer]);

  const getPositionStyle = (position: MatrixPosition, index: number) => {
    const baseClasses = 'relative p-3 rounded-lg border-2 transition-all duration-300';
    
    if (!position.is_filled && !showEmptyPositions) {
      return cn(baseClasses, 'border-dashed border-muted bg-muted/20 opacity-50');
    }

    if (position.is_filled && position.is_active) {
      return cn(baseClasses, 'border-green-500 bg-green-50 dark:bg-green-900/20 hover:shadow-lg hover:scale-105');
    }

    if (position.is_filled && !position.is_active) {
      return cn(baseClasses, 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20');
    }

    return cn(baseClasses, 'border-dashed border-muted-foreground/30 bg-muted/10 hover:bg-muted/20');
  };

  const renderPosition = (position: MatrixPosition, index: number) => (
    <ScaleTransition key={position.id} show={true}>
      <div className={getPositionStyle(position, index)}>
        {position.is_filled ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-honey to-honey/80 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {position.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {position.username || `User ${index + 1}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Level {position.member_level}
                  </div>
                </div>
              </div>
              <Badge variant={position.is_active ? 'default' : 'secondary'}>
                {position.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <div>Position: {position.position}</div>
              {position.joined_at && (
                <div>Joined: {new Date(position.joined_at).toLocaleDateString()}</div>
              )}
            </div>

            {position.wallet_address && (
              <div className="text-xs font-mono bg-muted p-1 rounded">
                {position.wallet_address.slice(0, 6)}...{position.wallet_address.slice(-4)}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 space-y-2">
            <Users className="h-6 w-6 mx-auto text-muted-foreground/50" />
            <div className="text-sm text-muted-foreground">
              Empty Position
            </div>
            <div className="text-xs text-muted-foreground">
              {position.position} • Level {position.level}
            </div>
          </div>
        )}
      </div>
    </ScaleTransition>
  );

  const renderLayerReward = (reward: LayerReward) => {
    const getRewardStatusColor = (status: string) => {
      switch (status) {
        case 'claimable': return 'text-green-600 dark:text-green-400';
        case 'claimed': return 'text-blue-600 dark:text-blue-400';
        case 'expired': return 'text-red-600 dark:text-red-400';
        default: return 'text-yellow-600 dark:text-yellow-400';
      }
    };

    const getRewardStatusIcon = (status: string) => {
      switch (status) {
        case 'claimable': return <Gift className="h-4 w-4" />;
        case 'claimed': return <CheckCircle className="h-4 w-4" />;
        case 'expired': return <AlertCircle className="h-4 w-4" />;
        default: return <Clock className="h-4 w-4" />;
      }
    };

    return (
      <div key={reward.layer} className="flex items-center justify-between p-3 border rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-honey/10 rounded-full">
            {getRewardStatusIcon(reward.status)}
          </div>
          <div>
            <div className="font-medium">Layer {reward.layer} Reward</div>
            <div className="text-sm text-muted-foreground">
              ${reward.reward_amount} USDT
            </div>
          </div>
        </div>
        <div className="text-right">
          <Badge 
            variant={reward.status === 'claimable' ? 'default' : 'secondary'}
            className={getRewardStatusColor(reward.status)}
          >
            {reward.status.charAt(0).toUpperCase() + reward.status.slice(1)}
          </Badge>
          {reward.expires_at && reward.status === 'claimable' && (
            <div className="text-xs text-muted-foreground mt-1">
              Expires: {new Date(reward.expires_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <CenteredSpinner className="h-96" />;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Layers className="h-5 w-5 text-honey" />
          <span>{t('referrals.matrixSystem.title')}</span>
        </CardTitle>
        <CardDescription>
          Your referral matrix structure and layer rewards
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={`layer-${activeLayer}`} onValueChange={(value) => setActiveLayer(parseInt(value.split('-')[1]))}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="layer-1">Layer 1</TabsTrigger>
              <TabsTrigger value="layer-2">Layer 2</TabsTrigger>
              <TabsTrigger value="layer-3">Layer 3</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowEmptyPositions(!showEmptyPositions)}
              >
                {showEmptyPositions ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showEmptyPositions ? 'Hide Empty' : 'Show Empty'}
              </Button>
            </div>
          </div>

          {/* Layer Statistics */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-honey">{layerStats.totalPositions}</div>
              <div className="text-xs text-muted-foreground">Total Positions</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{layerStats.filledPositions}</div>
              <div className="text-xs text-muted-foreground">Filled</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{layerStats.activeMembers}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{layerStats.fillPercentage.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Fill Rate</div>
            </div>
          </div>

          <TabsContent value="layer-1" className="mt-0">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold mb-2">Layer 1 (2 positions)</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                {layerData
                  .filter(pos => showEmptyPositions || pos.is_filled)
                  .map((position, index) => renderPosition(position, index))
                }
              </div>
            </div>
          </TabsContent>

          <TabsContent value="layer-2" className="mt-0">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold mb-2">Layer 2 (4 positions)</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
                {layerData
                  .filter(pos => showEmptyPositions || pos.is_filled)
                  .map((position, index) => renderPosition(position, index))
                }
              </div>
            </div>
          </TabsContent>

          <TabsContent value="layer-3" className="mt-0">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold mb-2">Layer 3 (8 positions)</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StaggeredList 
                  show={true} 
                  staggerDelay={50}
                  className="contents"
                >
                  {layerData
                    .filter(pos => showEmptyPositions || pos.is_filled)
                    .map((position, index) => renderPosition(position, index))
                  }
                </StaggeredList>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Layer Rewards Section */}
        <div className="mt-8 space-y-4">
          <h3 className="font-semibold flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Layer Rewards</span>
          </h3>
          <div className="space-y-3">
            {mockLayerRewards.map(renderLayerReward)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          <Button size="sm" className="flex-1">
            <TrendingUp className="h-4 w-4 mr-2" />
            Invite Members
          </Button>
          <Button size="sm" variant="outline" className="flex-1">
            <Gift className="h-4 w-4 mr-2" />
            Claim Rewards
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatrixVisualization;
import React, { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useToast } from '../hooks/use-toast';
import { useI18n } from '../contexts/I18nContext';
import { typedApiClient, ApiException, TypedApiClient } from '../lib/apiClient';
import type { UpgradePathResponse, NFTUpgradeResponse } from '../../types/api.types';
import { 
  Crown, 
  Loader2, 
  CheckCircle, 
  Lock, 
  Users, 
  Trophy, 
  ArrowRight,
  Zap,
  Target,
  Gift,
  CreditCard
} from 'lucide-react';

interface NFTLevelConfig {
  level: number;
  tokenId: number;
  priceUSDT: number;
  requiredDirectReferrals: number;
  requiredPreviousLevel: number | null;
  layerRewardsUnlocked: number[];
  levelName: string;
  description: string;
  eligible?: boolean;
  reason?: string;
  requirements?: any;
}

interface NFTLevelUpgradeProps {
  className?: string;
  onUpgradeSuccess?: () => void;
  showFullPath?: boolean;
}

export function NFTLevelUpgrade({ 
  className = "", 
  onUpgradeSuccess,
  showFullPath = false 
}: NFTLevelUpgradeProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const account = useActiveAccount();
  const queryClient = useQueryClient();
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [upgradeState, setUpgradeState] = useState<{
    loading: boolean;
    level: number | null;
  }>({
    loading: false,
    level: null
  });

  // Fetch user's upgrade path using typed API client
  const { data: upgradePath, isLoading, error } = useQuery({
    queryKey: ['/api/nft/upgrade-path', account?.address],
    enabled: !!account?.address,
    queryFn: async () => {
      try {
        const response = await typedApiClient.getUpgradePath(account!.address);
        if (TypedApiClient.isSuccessResponse(response)) {
          return response.data;
        }
        throw new ApiException({
          code: 'UPGRADE_PATH_ERROR',
          message: response.error || 'Failed to fetch upgrade path',
        });
      } catch (error) {
        if (error instanceof ApiException) {
          throw error;
        }
        throw new ApiException({
          code: 'NETWORK_ERROR',
          message: 'Failed to fetch upgrade path',
        });
      }
    },
    staleTime: 30000, // 30 seconds
  });

  // Handle NFT level upgrade using typed API client
  const upgradeMutation = useMutation({
    mutationFn: async (level: number) => {
      try {
        const response = await typedApiClient.processUpgrade(
          account!.address,
          level,
          'purchase', // Default to purchase, can be expanded later
          `upgrade_tx_${Date.now()}`,
          'ethereum' // Default network
        );

        if (TypedApiClient.isSuccessResponse(response)) {
          return response.data;
        }
        
        throw new ApiException({
          code: 'UPGRADE_FAILED',
          message: response.error || 'Upgrade failed',
          details: response.details ? { details: response.details } : undefined,
        });
      } catch (error) {
        if (error instanceof ApiException) {
          throw error;
        }
        throw new ApiException({
          code: 'NETWORK_ERROR',
          message: 'Network error during upgrade',
        });
      }
    },
    onSuccess: (result) => {
      toast({
        title: "🎉 Upgrade Successful!",
        description: result.message,
        duration: 6000
      });

      // Refresh upgrade path
      queryClient.invalidateQueries({ queryKey: ['/api/nft/upgrade-path'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });

      if (onUpgradeSuccess) {
        onUpgradeSuccess();
      }

      setUpgradeState({ loading: false, level: null });
      setSelectedLevel(null);
    },
    onError: (error: any) => {
      toast({
        title: "Upgrade Failed",
        description: error.message || 'Failed to upgrade NFT level',
        variant: "destructive"
      });
      setUpgradeState({ loading: false, level: null });
    }
  });

  const handleUpgrade = async (level: number) => {
    if (!account?.address) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }

    setUpgradeState({ loading: true, level });
    upgradeMutation.mutate(level);
  };

  const renderLevelCard = (levelConfig: NFTLevelConfig, type: 'eligible' | 'future') => {
    const isSelected = selectedLevel === levelConfig.level;
    const isUpgrading = upgradeState.loading && upgradeState.level === levelConfig.level;

    return (
      <Card 
        key={levelConfig.level}
        className={`transition-all duration-200 ${
          type === 'eligible' 
            ? 'border-honey/30 hover:border-honey/50 cursor-pointer bg-gradient-to-br from-honey/5 to-honey/10' 
            : 'border-muted/30 bg-muted/20'
        } ${isSelected ? 'ring-2 ring-honey shadow-lg' : ''}`}
        onClick={() => type === 'eligible' && setSelectedLevel(isSelected ? null : levelConfig.level)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className={`text-lg ${type === 'eligible' ? 'text-honey' : 'text-muted-foreground'}`}>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Level {levelConfig.level}
              </div>
            </CardTitle>
            <Badge variant="outline" className={`${
              type === 'eligible' 
                ? 'bg-honey/10 text-honey border-honey/30' 
                : 'bg-muted/10 text-muted-foreground border-muted/30'
            }`}>
              Token #{levelConfig.tokenId}
            </Badge>
          </div>
          <div className="text-sm font-medium text-foreground">
            {levelConfig.levelName}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {levelConfig.description}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold text-foreground">
                {levelConfig.priceUSDT} USDT
              </div>
              <div className="flex items-center gap-1 text-sm text-honey">
                <Target className="h-4 w-4" />
                {levelConfig.layerRewardsUnlocked.length} Layers
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Requirements:</div>
            <div className="space-y-1">
              {levelConfig.requiredDirectReferrals > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <Users className="h-3 w-3" />
                  <span className={type === 'eligible' ? 'text-green-400' : 'text-muted-foreground'}>
                    {levelConfig.requiredDirectReferrals} direct referrals
                  </span>
                </div>
              )}
              {levelConfig.requiredPreviousLevel && (
                <div className="flex items-center gap-2 text-xs">
                  <Lock className="h-3 w-3" />
                  <span className={type === 'eligible' ? 'text-green-400' : 'text-muted-foreground'}>
                    Level {levelConfig.requiredPreviousLevel} NFT
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Layer Rewards Preview */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-honey">Layer Rewards Unlocked:</div>
            <div className="flex flex-wrap gap-1">
              {levelConfig.layerRewardsUnlocked.slice(0, 5).map(layer => (
                <Badge key={layer} variant="secondary" className="text-xs">
                  L{layer}
                </Badge>
              ))}
              {levelConfig.layerRewardsUnlocked.length > 5 && (
                <Badge variant="secondary" className="text-xs">
                  +{levelConfig.layerRewardsUnlocked.length - 5} more
                </Badge>
              )}
            </div>
          </div>

          {/* Action Button */}
          {type === 'eligible' ? (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleUpgrade(levelConfig.level);
              }}
              disabled={isUpgrading}
              className="w-full bg-honey hover:bg-honey/90 text-black"
            >
              {isUpgrading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Upgrading...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Upgrade Now
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-2">
              <Button disabled className="w-full" variant="outline">
                <Lock className="mr-2 h-4 w-4" />
                Locked
              </Button>
              {levelConfig.reason && (
                <p className="text-xs text-muted-foreground text-center">
                  {levelConfig.reason}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className={`${className}`}>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-y-4 flex-col">
              <Loader2 className="h-8 w-8 animate-spin text-honey" />
              <p className="text-sm text-muted-foreground">Loading upgrade options...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`${className}`}>
        <Card className="border-destructive/20">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive">Failed to load upgrade options</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="mt-4"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No wallet connected
  if (!account?.address) {
    return (
      <div className={`${className}`}>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Connect your wallet to view upgrade options</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { currentLevel, directReferrals, eligibleUpgrades, futureUpgrades, summary } = upgradePath || {};

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Current Status */}
      <Card className="bg-secondary border-honey/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-honey">
            <Trophy className="h-5 w-5" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-honey">{currentLevel || 0}</div>
              <div className="text-xs text-muted-foreground">Current Level</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{directReferrals || 0}</div>
              <div className="text-xs text-muted-foreground">Direct Referrals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{summary?.maxLayersUnlocked || 0}</div>
              <div className="text-xs text-muted-foreground">Layers Unlocked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{summary?.totalLevelsRemaining || 0}</div>
              <div className="text-xs text-muted-foreground">Levels Remaining</div>
            </div>
          </div>

          {summary?.nextAvailableLevel && (
            <div className="bg-honey/5 rounded-lg p-3 border border-honey/20">
              <div className="flex items-center gap-2 text-honey">
                <ArrowRight className="h-4 w-4" />
                <span className="font-medium">Next Available: Level {summary.nextAvailableLevel}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Eligible Upgrades */}
      {eligibleUpgrades && eligibleUpgrades.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <h3 className="text-lg font-semibold text-green-400">Available Upgrades</h3>
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
              {eligibleUpgrades.length} available
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eligibleUpgrades.slice(0, showFullPath ? eligibleUpgrades.length : 3).map(level => 
              renderLevelCard(level, 'eligible')
            )}
          </div>
        </div>
      )}

      {/* Future Upgrades Preview */}
      {futureUpgrades && futureUpgrades.length > 0 && showFullPath && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-muted-foreground">Future Upgrades</h3>
            <Badge variant="outline" className="bg-muted/10 text-muted-foreground border-muted/30">
              {futureUpgrades.length} locked
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {futureUpgrades.slice(0, 6).map(level => 
              renderLevelCard(level, 'future')
            )}
          </div>
        </div>
      )}

      {/* No Upgrades Available */}
      {(!eligibleUpgrades || eligibleUpgrades.length === 0) && currentLevel < 19 && (
        <Card className="border-yellow-500/20">
          <CardContent className="pt-6 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Users className="h-8 w-8 text-yellow-500" />
              </div>
              <div>
                <h3 className="font-semibold text-yellow-500 mb-2">More Referrals Needed</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You need more direct referrals to unlock the next upgrade level.
                </p>
                <Button variant="outline" className="border-yellow-500/30 text-yellow-500">
                  <Gift className="mr-2 h-4 w-4" />
                  Invite Friends
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Master Level Achievement */}
      {currentLevel === 19 && (
        <Card className="bg-gradient-to-br from-honey/10 to-honey/5 border-honey/30">
          <CardContent className="pt-6 text-center">
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-honey/20 flex items-center justify-center">
                <Crown className="h-10 w-10 text-honey" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-honey mb-2">Master Level Achieved! 👑</h3>
                <p className="text-muted-foreground">
                  You've reached the highest level and can now claim 100% of all Layer 19 rewards.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default NFTLevelUpgrade;
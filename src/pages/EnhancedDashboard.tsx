import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { useActiveWallet } from 'thirdweb/react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import Navigation from '../components/shared/Navigation';
import { 
  authService, 
  memberService, 
  balanceService, 
  matrixService, 
  rewardService 
} from '../lib/supabaseClient';
import { 
  Users, 
  DollarSign, 
  Activity, 
  TrendingUp, 
  Crown, 
  Layers, 
  ArrowUpRight,
  RefreshCw,
  Award,
  Timer,
  Coins,
  BarChart3,
  Copy,
  Share2,
  Building2,
  Gift,
  ShoppingCart,
  Loader2,
  User,
  Network
} from 'lucide-react';

// Data interfaces based on database types
interface DashboardStats {
  balance: {
    totalBcc: number;
    transferableBcc: number;
    lockedBcc: number;
    restrictedBcc: number;
    totalUsdtEarned: number;
    availableRewards: number;
    pendingRewards: number;
  };
  matrix: {
    directReferrals: number;
    totalTeamSize: number;
    maxLayer: number;
    layers: MatrixLayer[];
    recentActivity: any[];
  };
  rewards: {
    claimableRewards: any[];
    pendingRewards: any[];
    totalClaimed: number;
    totalPending: number;
  };
  member: {
    currentLevel: number;
    activationRank: number | null;
    tierLevel: number | null;
    isActivated: boolean;
    activatedAt: string | null;
    levelsOwned: number[];
  };
}

interface MatrixLayer {
  layer: number;
  positions: MatrixPosition[];
  filledPositions: number;
  totalPositions: number;
}

interface MatrixPosition {
  position: string;
  memberWallet?: string;
  username?: string;
  level?: number;
  isActive: boolean;
}

// Load dashboard data using proper Supabase services
const loadDashboardData = async (walletAddress: string) => {
  console.log('🔄 Loading dashboard data for:', walletAddress);
  console.time('⏱️ Total dashboard load time');
  
  try {
    // Load all data concurrently using proper services
    console.time('⏱️ API calls');
    const [
      memberResult,
      balanceResult,
      matrixResult,
      rewardResult
    ] = await Promise.allSettled([
      authService.getMemberInfo(walletAddress),
      balanceService.getUserBalance(walletAddress),
      matrixService.getMatrixStats(walletAddress),
      rewardService.getClaimableRewards(walletAddress)
    ]);
    console.timeEnd('⏱️ API calls');

    console.log('📊 Dashboard API results:', {
      member: memberResult.status === 'fulfilled' ? 'success' : 'failed',
      balance: balanceResult.status === 'fulfilled' ? 'success' : 'failed', 
      matrix: matrixResult.status === 'fulfilled' ? 'success' : 'failed',
      rewards: rewardResult.status === 'fulfilled' ? 'success' : 'failed'
    });

    console.log('🔍 Raw memberResult:', memberResult);
    if (memberResult.status === 'fulfilled') {
      console.log('🔍 memberResult.value:', memberResult.value);
    }

    // Extract data from results
    const memberData = memberResult.status === 'fulfilled' ? memberResult.value.data : null;
    const memberApiResponse = memberResult.status === 'fulfilled' ? memberResult.value : null; // Keep full API response
    const balanceData = balanceResult.status === 'fulfilled' ? balanceResult.value : null;
    const matrixData = matrixResult.status === 'fulfilled' ? matrixResult.value : null;
    const rewardsData = rewardResult.status === 'fulfilled' ? rewardResult.value : null;

    // Get matrix layers for 3x3 visualization
    let matrixLayers: MatrixLayer[] = [];
    try {
      const matrixTreeResult = await matrixService.getMatrixTree(walletAddress, 3);
      if (matrixTreeResult.success) {
        matrixLayers = buildMatrixLayers(matrixTreeResult.matrix || []);
      }
    } catch (error) {
      console.warn('Matrix tree load failed:', error);
    }

    return {
      member: memberData,
      memberApiResponse: memberApiResponse, // Include the full API response for isActivated field
      balance: balanceData?.balance || balanceData,
      matrix: {
        ...matrixData,
        layers: matrixLayers
      },
      rewards: rewardsData
    };

  } catch (error) {
    console.error('❌ Dashboard data loading failed:', error);
    throw error;
  }
};

// Build 3x3 matrix layers from referrals data
const buildMatrixLayers = (referrals: any[]): MatrixLayer[] => {
  const layers: MatrixLayer[] = [];
  
  // Process first 3 layers for 3x3 matrix visualization
  for (let layerNum = 1; layerNum <= 3; layerNum++) {
    const layerReferrals = referrals.filter(r => r.layer === layerNum);
    const totalPositions = Math.pow(3, layerNum); // Layer 1=3, Layer 2=9, Layer 3=27
    
    const positions: MatrixPosition[] = [];
    
    // Create positions for this layer
    for (let pos = 1; pos <= totalPositions; pos++) {
      const referral = layerReferrals.find(r => r.position === pos.toString());
      
      positions.push({
        position: pos.toString(),
        memberWallet: referral?.member_wallet,
        username: referral?.member_info?.username,
        level: referral?.member_info?.current_level,
        isActive: referral?.is_active || false
      });
    }
    
    layers.push({
      layer: layerNum,
      positions,
      filledPositions: layerReferrals.length,
      totalPositions
    });
  }
  
  return layers;
};

export default function EnhancedDashboard() {
  const { walletAddress, userData } = useWallet();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const activeWallet = useActiveWallet();
  
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataMethod] = useState<'functions' | 'views' | 'tables'>('functions'); // 固定使用functions数据源

  const loadComponentData = async () => {
    if (!walletAddress) return;
    
    const startTime = performance.now();
    console.log('⏱️ Starting dashboard data load for wallet:', walletAddress);
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Loading dashboard for wallet:', walletAddress);
      
      // Use the external loadDashboardData function
      const data = await loadDashboardData(walletAddress);
      
      console.log('✅ Dashboard data loaded:', data);
      console.log('🔍 Member activation debug:', {
        memberApiResponseExists: !!data?.memberApiResponse,
        isActivatedValue: data?.memberApiResponse?.isActivated,
        memberApiResponseFull: data?.memberApiResponse,
        memberDataActivated: data?.member?.is_activated,
        memberDataActive: data?.member?.is_active,
        memberDataFull: data?.member
      });

      // Transform data to consistent format based on database structure
      setDashboardStats({
        balance: {
          totalBcc: data?.balance?.total_bcc || data?.balance?.bcc_transferable + data?.balance?.bcc_locked + data?.balance?.bcc_restricted || 0,
          transferableBcc: data?.balance?.bcc_transferable || 0,
          lockedBcc: data?.balance?.bcc_locked || 0,
          restrictedBcc: data?.balance?.bcc_restricted || 0,
          totalUsdtEarned: data?.balance?.total_usdt_earned || 0,
          availableRewards: data?.balance?.pending_rewards_usdt || 0,
          pendingRewards: data?.rewards?.pending?.length || 0
        },
        matrix: {
          directReferrals: data?.member?.total_direct_referrals || 0,
          totalTeamSize: data?.member?.total_team_size || 0,
          maxLayer: data?.member?.max_layer || 0,
          layers: data?.matrix?.layers || [],
          recentActivity: data?.matrix?.recentActivity || []
        },
        rewards: {
          claimableRewards: data?.rewards?.claimable || [],
          pendingRewards: data?.rewards?.pending || [],
          totalClaimed: data?.rewards?.totalClaimed || 0,
          totalPending: data?.rewards?.pending?.length || 0
        },
        member: {
          currentLevel: data?.member?.current_level || 1,
          activationRank: data?.member?.activation_rank,
          tierLevel: data?.member?.tier_level,
          // Use the API response's isActivated field, with fallback logic
          isActivated: data?.memberApiResponse?.isActivated ?? 
                       (data?.member?.is_active === true && (data?.member?.current_level || 0) > 0) ?? 
                       false,
          activatedAt: data?.member?.activated_at,
          levelsOwned: Array.isArray(data?.member?.levels_owned) ? data?.member?.levels_owned : [data?.member?.current_level || 1]
        }
      });

      const finalIsActivated = data?.memberApiResponse?.isActivated ?? 
                           (data?.member?.is_active === true && (data?.member?.current_level || 0) > 0) ?? 
                           false;
      
      console.log('🔍 Final dashboard member state:', {
        apiIsActivated: data?.memberApiResponse?.isActivated,
        fallbackActivated: (data?.member?.is_active === true && (data?.member?.current_level || 0) > 0),
        finalIsActivated: finalIsActivated,
        memberIsActive: data?.member?.is_active,
        memberCurrentLevel: data?.member?.current_level
      });
      
      const totalTime = performance.now() - startTime;
      console.log(`⏱️ Dashboard data load completed in: ${totalTime.toFixed(2)}ms`);
      
    } catch (err: any) {
      const totalTime = performance.now() - startTime;
      console.error('❌ Dashboard load error:', err);
      console.log(`⏱️ Dashboard load failed after: ${totalTime.toFixed(2)}ms`);
      setError(err.message || 'Failed to load dashboard data');
      
      // Set default data to prevent crashes
      setDashboardStats({
        balance: {
          totalBcc: 0,
          transferableBcc: 0,
          lockedBcc: 0,
          restrictedBcc: 0,
          totalUsdtEarned: 0,
          availableRewards: 0,
          pendingRewards: 0
        },
        matrix: {
          directReferrals: 0,
          totalTeamSize: 0,
          maxLayer: 0,
          layers: [],
          recentActivity: []
        },
        rewards: {
          claimableRewards: [],
          pendingRewards: [],
          totalClaimed: 0,
          totalPending: 0
        },
        member: {
          currentLevel: 1,
          activationRank: null,
          tierLevel: null,
          isActivated: false,
          activatedAt: null,
          levelsOwned: [1]
        }
      });
    } finally {
      setIsLoading(false);
      const totalTime = performance.now() - startTime;
      console.log(`⏱️ Dashboard component load completed in: ${totalTime.toFixed(2)}ms`);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      loadComponentData();
    }
  }, [walletAddress, dataMethod]);

  const copyReferralLink = async () => {
    // Get the original wallet address (not lowercase) from activeWallet
    const originalWalletAddress = activeWallet?.getAccount()?.address || walletAddress;
    // Use current page URL as base for referral link
    const baseUrl = window.location.origin;
    const referralLink = `${baseUrl}/register?ref=${originalWalletAddress}`;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({
        title: t('dashboard.linkCopied.title') || 'Link Copied!',
        description: t('dashboard.linkCopied.description') || 'Referral link copied to clipboard.',
      });
    } catch (err) {
      console.error('Failed to copy referral link:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-honey" />
        <span className="ml-2 text-muted-foreground">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-red-500">Error: {error}</div>
        <Button onClick={loadComponentData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!dashboardStats) {
    return <div>No data available</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-honey">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your BeeHive overview</p>
      </div>

      {/* 用户信息 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-honey" />
            User Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Status</div>
                <Badge variant="secondary" className={`${
                  dashboardStats.member.isActivated 
                    ? 'bg-green-600 text-white' 
                    : 'bg-red-600 text-white'
                }`}>
                  {dashboardStats.member.isActivated ? 'Activated' : 'Not Activated'}
                </Badge>
              </div>
              <div className="space-y-1 text-right">
                <div className="text-sm text-muted-foreground">Current Level</div>
                <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                  Level {dashboardStats.member.currentLevel}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Activation Rank</div>
                <div className="text-sm font-semibold">
                  #{dashboardStats.member.activationRank || 'Not ranked'}
                </div>
              </div>
              <div className="space-y-1 text-right">
                <div className="text-sm text-muted-foreground">Tier Level</div>
                <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
                  Tier {dashboardStats.member.tierLevel || 1}
                </Badge>
              </div>
            </div>
            
            {dashboardStats.member.activatedAt && (
              <div className="text-center pt-2 border-t border-border/50">
                <div className="text-xs text-muted-foreground">
                  Activated: {new Date(dashboardStats.member.activatedAt).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 奖励余额 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-green-400" />
            Reward Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Earned</span>
              <span className="text-xl font-bold text-green-400">${dashboardStats.balance.totalUsdtEarned.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Available</span>
              <span className="text-lg font-semibold text-blue-400">${dashboardStats.balance.availableRewards.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pending</span>
              <span className="text-lg font-semibold text-purple-400">{dashboardStats.rewards.totalPending}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BCC余额 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Coins className="h-5 w-5 text-honey" />
            BCC Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total BCC</span>
              <span className="text-xl font-bold text-honey">{dashboardStats.balance.totalBcc}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-sm font-semibold text-green-400">{dashboardStats.balance.transferableBcc}</div>
                <div className="text-xs text-muted-foreground">Transferable</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-orange-400">{dashboardStats.balance.lockedBcc}</div>
                <div className="text-xs text-muted-foreground">Locked</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-red-400">{dashboardStats.balance.restrictedBcc}</div>
                <div className="text-xs text-muted-foreground">Restricted</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 推荐链接组件 - 显示链接 */}
      <Card className="border-honey/20 bg-gradient-to-r from-honey/5 to-yellow-400/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Share2 className="h-5 w-5 text-honey" />
            {t('dashboard.referralLink.title') || 'Referral Link'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {t('dashboard.shareToEarn') || 'Share your link to earn commissions from your referrals'}
            </div>
            
            {/* 显示实际链接 */}
            <div className="bg-background/50 rounded-lg p-3 border border-border/50">
              <div className="text-xs text-muted-foreground mb-1">Your Referral Link:</div>
              <div className="text-sm font-mono break-all text-honey">
                {`${window.location.origin}/register?ref=${(activeWallet?.getAccount()?.address || walletAddress)}`}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={copyReferralLink} className="bg-honey hover:bg-honey/90 text-black font-semibold flex-1">
                <Copy className="h-4 w-4 mr-2" />
                {t('dashboard.referralLink.copy') || 'Copy Link'}
              </Button>
              <Button 
                onClick={() => setLocation('/referrals')} 
                variant="outline"
                className="border-honey/30 text-honey hover:bg-honey/10"
              >
                <Users className="h-4 w-4 mr-2" />
                Network
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3x3 Matrix Visualization */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Network className="h-5 w-5 text-purple-400" />
            3×3 Matrix Network
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Matrix Statistics */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-400">{dashboardStats.matrix.directReferrals}</div>
                <div className="text-xs text-muted-foreground">Direct Referrals</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-400">{dashboardStats.matrix.totalTeamSize}</div>
                <div className="text-xs text-muted-foreground">Total Team</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-400">{dashboardStats.matrix.maxLayer}</div>
                <div className="text-xs text-muted-foreground">Max Layer</div>
              </div>
            </div>

            {/* Matrix Layers Visualization */}
            {dashboardStats.matrix.layers.map((layer, index) => (
              <div key={layer.layer} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    Layer {layer.layer}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {layer.filledPositions}/{layer.totalPositions}
                  </Badge>
                </div>
                
                {/* Matrix Grid */}
                <div className={`grid gap-2 ${
                  layer.layer === 1 ? 'grid-cols-3' : 
                  layer.layer === 2 ? 'grid-cols-3' : 
                  'grid-cols-6'
                }`}>
                  {layer.positions.slice(0, layer.layer === 1 ? 3 : layer.layer === 2 ? 9 : 12).map((position) => (
                    <div
                      key={position.position}
                      className={`
                        aspect-square rounded-lg border-2 flex items-center justify-center text-xs
                        ${position.memberWallet 
                          ? 'border-green-400 bg-green-400/10 text-green-400' 
                          : 'border-gray-500 bg-gray-500/10 text-gray-400'
                        }
                      `}
                    >
                      {position.memberWallet ? (
                        <div className="text-center">
                          <div className="font-mono text-xs">
                            {position.memberWallet.slice(-4)}
                          </div>
                          {position.level && (
                            <div className="text-xs opacity-60">
                              L{position.level}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="text-xs opacity-60">
                            {position.position}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {layer.layer === 3 && layer.positions.length > 12 && (
                    <div className="col-span-6 text-center">
                      <Badge variant="outline" className="text-xs">
                        +{layer.positions.length - 12} more positions
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {dashboardStats.matrix.layers.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <div className="text-muted-foreground">No matrix data yet</div>
                <div className="text-xs text-muted-foreground">Start referring members to build your network</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 推荐和奖励页面导航 */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setLocation('/referrals')}>
          <CardContent className="p-4 text-center space-y-2">
            <Users className="h-8 w-8 text-blue-400 mx-auto" />
            <div className="font-semibold">Referrals</div>
            <div className="text-2xl font-bold text-honey">{dashboardStats.matrix.directReferrals}</div>
            <div className="text-xs text-muted-foreground">Direct referrals</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setLocation('/rewards')}>
          <CardContent className="p-4 text-center space-y-2">
            <Award className="h-8 w-8 text-green-400 mx-auto" />
            <div className="font-semibold">Rewards</div>
            <div className="text-2xl font-bold text-green-400">{dashboardStats.rewards.totalClaimed}</div>
            <div className="text-xs text-muted-foreground">Total claimed</div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
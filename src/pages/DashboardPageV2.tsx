import React, { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { useToast } from '../hooks/use-toast';
import { Copy, Share2, Users, Award, TrendingUp, DollarSign, Building2, Crown, Gift, ShoppingCart, Activity, Coins, Loader2, RefreshCw, ArrowUpRight, Layers, Timer } from 'lucide-react';

// Import V2 hooks and components
import { 
  useDashboardV2, 
  useBalanceBreakdownV2, 
  useRefreshDashboardV2,
  useGlobalPoolStatsV2,
  useMatrixHealthV2
} from '../hooks/useDashboardV2';
import ClaimableRewardsCardV2 from '../components/rewards/ClaimableRewardsCardV2';
import MemberGuard from '../components/guards/MemberGuard';

// Utility components
const HexagonIcon = ({ size, children }: { size: string; children: React.ReactNode }) => (
  <div className={`${size === 'lg' ? 'w-16 h-16' : 'w-12 h-12'} rounded-full flex items-center justify-center bg-honey/20`}>
    {children}
  </div>
);

const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

function DashboardV2() {
  const { 
    userData, 
    isActivated, 
    currentLevel, 
    walletAddress
  } = useWallet();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);

  // V2 Dashboard data
  const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError } = useDashboardV2(walletAddress || undefined);
  const { data: balanceBreakdown, isLoading: isBalanceLoading } = useBalanceBreakdownV2(walletAddress || undefined);
  const { data: globalPoolStats } = useGlobalPoolStatsV2();
  const { data: matrixHealth } = useMatrixHealthV2();
  const { refreshAll } = useRefreshDashboardV2();

  const isLoading = isDashboardLoading || isBalanceLoading;

  const referralLink = `${window.location.origin}/register?ref=${walletAddress}`;

  const handleRefresh = async () => {
    if (!walletAddress) return;
    
    try {
      await refreshAll(walletAddress);
      toast({
        title: "Dashboard Refreshed",
        description: "All data has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh dashboard data",
        variant: "destructive",
      });
    }
  };

  // Show error state if dashboard data failed to load
  if (dashboardError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto bg-destructive/5 border-destructive/20">
          <CardContent className="p-8 text-center">
            <div className="text-destructive mb-4">
              <TrendingUp className="h-8 w-8 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-destructive mb-2">Failed to Load Dashboard V2</h3>
            <p className="text-muted-foreground mb-4">
              Unable to fetch enhanced dashboard data. Please try again.
            </p>
            <Button 
              onClick={handleRefresh} 
              disabled={isLoading}
              className="bg-honey hover:bg-honey/90 text-black"
            >
              {isLoading ? 'Retrying...' : 'Try Again'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is activated
  if (!isActivated && !isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="bg-secondary border-border shadow-2xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold text-honey mb-2">
                Account Activation Required
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Please activate your Level 1 membership to access the enhanced dashboard
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => setLocation('/welcome')}
                className="w-full bg-honey text-secondary hover:bg-honey/90"
              >
                Activate Membership
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto bg-secondary border-border">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-honey mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading enhanced dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Enhanced Header with System Status */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-honey">Enhanced Dashboard</h1>
          <p className="text-muted-foreground">Layer-based matrix system with intelligent rewards</p>
        </div>
        <div className="flex items-center gap-2">
          {matrixHealth && (
            <Badge 
              variant={matrixHealth.status === 'healthy' ? 'default' : 'destructive'}
              className={matrixHealth.status === 'healthy' ? 'bg-green-500/10 text-green-400 border-green-500/30' : ''}
            >
              Matrix System {matrixHealth.status}
            </Badge>
          )}
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="border-honey text-honey hover:bg-honey hover:text-secondary"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Enhanced Membership Status Card */}
      <Card className="bg-secondary border-border mb-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <HexagonIcon size="lg">
                <img 
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64" 
                  alt="User Avatar" 
                  className="w-12 h-12 rounded-full" 
                />
              </HexagonIcon>
              <div>
                <h2 className="text-xl font-bold text-honey">
                  {userData?.user?.username || 'Matrix Member'}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {walletAddress ? formatAddress(walletAddress) : ''}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge className="bg-honey text-black font-semibold">
                    Level {currentLevel}
                  </Badge>
                  <Badge variant="secondary" className="bg-green-600 text-white">
                    Matrix Active
                  </Badge>
                  {balanceBreakdown?.activation?.tier && (
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                      Tier {balanceBreakdown.activation.tier}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Global Pool</div>
              <div className="text-lg font-bold text-honey">
                {globalPoolStats ? `${globalPoolStats.globalPool.totalMembersActivated.toLocaleString()}` : '...'}
              </div>
              <div className="text-xs text-muted-foreground">Active Members</div>
            </div>
          </div>

          {/* Enhanced Balance Display with V2 Data */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg p-4 border border-green-500/20">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-5 w-5 text-green-400" />
                <ArrowUpRight className="h-4 w-4 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-green-400">
                ${dashboardData?.rewards.totalEarnings.toFixed(2) || '0.00'}
              </div>
              <div className="text-xs text-muted-foreground">Total USDT Earned</div>
            </div>

            <div className="bg-gradient-to-br from-honey/10 to-honey/5 rounded-lg p-4 border border-honey/20">
              <div className="flex items-center justify-between mb-2">
                <Coins className="h-5 w-5 text-honey" />
                <span className="text-xs bg-honey/20 text-honey px-2 py-1 rounded-full">
                  {balanceBreakdown?.bcc.transferable || 0}T
                </span>
              </div>
              <div className="text-2xl font-bold text-honey">
                {dashboardData?.balance.bcc.total || 0}
              </div>
              <div className="text-xs text-muted-foreground">Total BCC Balance</div>
            </div>

            <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg p-4 border border-blue-500/20">
              <div className="flex items-center justify-between mb-2">
                <Layers className="h-5 w-5 text-blue-400" />
                <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">
                  L{dashboardData?.matrix.deepestLayer || 0}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-blue-400">
                {dashboardData?.matrix.totalTeamSize || 0}
              </div>
              <div className="text-xs text-muted-foreground">Matrix Team Size</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg p-4 border border-purple-500/20">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-5 w-5 text-purple-400" />
                <Timer className="h-4 w-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-purple-400">
                {dashboardData?.rewards.pendingCount || 0}
              </div>
              <div className="text-xs text-muted-foreground">Pending Rewards</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics Toggle */}
      <div className="mb-6">
        <Button
          onClick={() => setShowAdvancedStats(!showAdvancedStats)}
          variant="outline"
          className="border-honey/30 text-honey hover:bg-honey/10"
        >
          <Activity className="h-4 w-4 mr-2" />
          {showAdvancedStats ? 'Hide' : 'Show'} Advanced Analytics
        </Button>
      </div>

      {/* Advanced Performance Metrics */}
      {showAdvancedStats && (
        <Card className="bg-secondary border-border mb-8">
          <CardHeader>
            <CardTitle className="text-honey flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Matrix Performance Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/40 rounded-lg">
                <div className="text-lg font-bold text-honey">
                  {dashboardData?.performance.spilloverRate.toFixed(1) || '0.0'}%
                </div>
                <div className="text-xs text-muted-foreground">Spillover Rate</div>
              </div>
              <div className="text-center p-3 bg-muted/40 rounded-lg">
                <div className="text-lg font-bold text-honey">
                  {dashboardData?.matrix.activationRate.toFixed(1) || '0.0'}%
                </div>
                <div className="text-xs text-muted-foreground">Activation Rate</div>
              </div>
              <div className="text-center p-3 bg-muted/40 rounded-lg">
                <div className="text-lg font-bold text-honey">
                  {dashboardData?.performance.growthVelocity.toFixed(1) || '0.0'}
                </div>
                <div className="text-xs text-muted-foreground">Growth/Day</div>
              </div>
              <div className="text-center p-3 bg-muted/40 rounded-lg">
                <div className="text-lg font-bold text-honey">
                  ${dashboardData?.performance.rewardEfficiency.toFixed(2) || '0.00'}
                </div>
                <div className="text-xs text-muted-foreground">Reward Efficiency</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Referral Link Section */}
      <Card className="bg-secondary border-border mb-8">
        <CardHeader>
          <CardTitle className="text-honey flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Matrix Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              value={referralLink}
              readOnly
              className="bg-muted border-border text-sm"
            />
            <Button
              onClick={() => {
                navigator.clipboard.writeText(referralLink);
                toast({
                  title: "Copied!",
                  description: "Matrix referral link copied to clipboard",
                });
              }}
              size="sm"
              className="bg-honey text-secondary hover:bg-honey/90"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
            <p className="font-medium mb-1">Matrix Referral Benefits:</p>
            <ul className="space-y-1">
              <li>• Referrals placed in your 3x3 matrix automatically</li>
              <li>• Earn layer-based rewards up to 19 levels deep</li>
              <li>• Intelligent spillover system maximizes your earnings</li>
              <li>• 72-hour rollup system protects reward distribution</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* V2 Claimable Rewards Component */}
      {walletAddress && <ClaimableRewardsCardV2 walletAddress={walletAddress} />}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <Button
          onClick={() => setLocation('/me')}
          className="bg-honey text-black hover:bg-honey/90 h-12"
        >
          <Users className="h-5 w-5 mr-2" />
          Matrix Profile
        </Button>
        <Button
          onClick={() => setLocation('/tokens')}
          variant="outline"
          className="border-honey text-honey hover:bg-honey hover:text-black h-12"
        >
          <DollarSign className="h-5 w-5 mr-2" />
          Token Management
        </Button>
        <Button
          onClick={() => setLocation('/education')}
          variant="outline"
          className="border-honey text-honey hover:bg-honey hover:text-black h-12"
        >
          <Building2 className="h-5 w-5 mr-2" />
          Matrix Education
        </Button>
      </div>
    </div>
  );
}

// Export Dashboard wrapped with MemberGuard for Level 1 requirement
export default function ProtectedDashboardV2() {
  return (
    <MemberGuard requireLevel={1}>
      <DashboardV2 />
    </MemberGuard>
  );
}
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { membershipLevels } from '../lib/config/membershipLevels';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Clock, Users, TrendingUp, AlertCircle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

export default function Referrals() {
  const { walletAddress, userData } = useWallet();
  const { t } = useI18n();
  const [copySuccess, setCopySuccess] = useState(false);
  const [isRewardStructureOpen, setIsRewardStructureOpen] = useState(true);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number | null>(null);
  const [layerNavigationMode, setLayerNavigationMode] = useState<'overview' | 'detail'>('overview');

  // Fetch user referral statistics
  const { data: userStats, isLoading: isStatsLoading } = useQuery<any>({
    queryKey: ['/api/beehive/user-stats', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await fetch(`/api/beehive/user-stats/${walletAddress}`, { 
        credentials: 'include',
        headers: { 'x-wallet-address': walletAddress }
      });
      if (!response.ok) throw new Error('Failed to fetch user stats');
      return response.json();
    },
    enabled: !!walletAddress
  });

  // Use 19-layer system data only
  const totalTeamCount = userStats?.totalTeamCount || 0;
  const directReferrals = Number(userStats?.directReferralCount) || 0;
  
  // Fetch real layer members data with real-time updates
  const { data: layerMembersData, isLoading: isLayerMembersLoading } = useQuery({
    queryKey: ['/api/referrals/layer-members', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await fetch(`/api/referrals/layer-members?t=${Date.now()}`, {
        headers: { 
          'X-Wallet-Address': walletAddress,
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch layer members');
      return response.json();
    },
    enabled: !!walletAddress,
    staleTime: 2000, // 2 seconds
    refetchInterval: 4000, // Real-time polling every 4 seconds for downline updates
    refetchIntervalInBackground: true,
  });

  // Fetch real reward notifications with real-time updates
  const { data: notificationsData, isLoading: isNotificationsLoading } = useQuery({
    queryKey: ['/api/notifications/rewards', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await fetch(`/api/notifications/rewards?t=${Date.now()}`, {
        headers: { 
          'X-Wallet-Address': walletAddress,
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch reward notifications');
      }
      return response.json();
    },
    enabled: !!walletAddress,
    staleTime: 1000, // 1 second for fastest notification updates
    refetchInterval: 3000, // Real-time polling every 3 seconds for new notifications
    refetchIntervalInBackground: true,
  });

  const isMatrixLoading = isStatsLoading;
  const isLayersLoading = isLayerMembersLoading || isNotificationsLoading;

  // Create layer data structure from real data
  const layerData = {
    layers: layerMembersData?.layers || [],
    notifications: notificationsData?.notifications || []
  };
  
  
  // Calculate countdown timers with real data
  const [timers, setTimers] = useState<{ [key: string]: string }>({});
  
  useEffect(() => {
    if (!layerData?.notifications || layerData.notifications.length === 0) return;
    
    const interval = setInterval(() => {
      const newTimers: { [key: string]: string } = {};
      
      layerData.notifications.forEach((notif: any) => {
        if (notif.status === 'pending' && notif.expiresAt) {
          const timeRemaining = new Date(notif.expiresAt).getTime() - Date.now();
          if (timeRemaining > 0) {
            const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
            const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
            newTimers[notif.id] = `${hours}h ${minutes}m ${seconds}s`;
          } else {
            newTimers[notif.id] = 'Expired';
          }
        } else if (notif.status === 'claimable') {
          newTimers[notif.id] = 'Ready to Claim';
        } else {
          newTimers[notif.id] = notif.status === 'claimed' ? 'Claimed' : 'Expired';
        }
      });
      
      setTimers(newTimers);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [layerData]);

  // Use real earnings data from database when available
  const directReferralCountForEarnings = Number(userStats?.directReferralCount) || 0;
  
  // Calculate real unclaimed rewards from notifications (pending + claimable)
  const unclaimedRewards = layerData.notifications
    .filter((notif: any) => notif.status === 'pending' || notif.status === 'claimable')
    .reduce((total: number, notif: any) => total + (notif.rewardAmount / 100), 0); // Convert from cents
  
  const totalClaimedRewards = layerData.notifications
    .filter((notif: any) => notif.status === 'claimed')
    .reduce((total: number, notif: any) => total + (notif.rewardAmount / 100), 0); // Convert from cents
  
  // Check if user has real earnings data, otherwise use calculated display values
  const hasRealEarnings = userStats?.totalEarnings !== undefined && userStats?.totalEarnings !== null;
  const realTotalEarnings = Number(userStats?.totalEarnings || 0);
  const realPendingCommissions = Number(userStats?.pendingCommissions || 0);
  
  // Use real data from backend API (backend returns values already converted to dollars)
  const referralStats = {
    directReferrals: directReferralCountForEarnings,
    totalTeam: userStats?.totalTeamCount || 0,
    totalEarnings: parseFloat(userStats?.totalEarnings || '0'),
    monthlyEarnings: parseFloat(userStats?.monthlyEarnings || '0'),
    pendingCommissions: parseFloat(userStats?.pendingCommissions || '0'),
    nextPayout: userStats?.nextPayout || 'TBA',
    unclaimedCount: layerData.notifications.filter((notif: any) => notif.status === 'pending' || notif.status === 'claimable').length
  };

  // Use only 19-layer system data
  const userMatrixPosition = null;
  const directReferralsList = [];
  

  const referralLink = `https://beehive-lifestyle.io/register?ref=${walletAddress}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Layer navigation functions
  const goToLayerDetail = (layerIndex: number) => {
    setSelectedLayerIndex(layerIndex);
    setLayerNavigationMode('detail');
  };

  const goBackToOverview = () => {
    setSelectedLayerIndex(null);
    setLayerNavigationMode('overview');
  };

  const goToNextLayer = () => {
    if (selectedLayerIndex !== null && selectedLayerIndex < layerData.layers.length - 1) {
      setSelectedLayerIndex(selectedLayerIndex + 1);
    }
  };

  const goToPreviousLayer = () => {
    if (selectedLayerIndex !== null && selectedLayerIndex > 0) {
      setSelectedLayerIndex(selectedLayerIndex - 1);
    }
  };

  // Get current selected layer data
  const selectedLayer = selectedLayerIndex !== null ? layerData.layers[selectedLayerIndex] : null;
  const canGoNext = selectedLayerIndex !== null && selectedLayerIndex < layerData.layers.length - 1;
  const canGoPrevious = selectedLayerIndex !== null && selectedLayerIndex > 0;

  return (
    <div className="space-y-6">
      {/* Referral Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-users text-honey text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">{isStatsLoading ? '...' : referralStats.directReferrals}</div>
            <div className="text-muted-foreground text-sm">{t('me.referral.directReferrals')}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-sitemap text-blue-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">{isStatsLoading ? '...' : referralStats.totalTeam}</div>
            <div className="text-muted-foreground text-sm">{t('me.referral.totalTeamSize')}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-dollar-sign text-green-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">{isStatsLoading ? '...' : Number(referralStats.totalEarnings || 0).toFixed(2)}</div>
            <div className="text-muted-foreground text-sm">{t('me.referral.totalEarnings')}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-calendar text-purple-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">{isStatsLoading ? '...' : Number(referralStats.monthlyEarnings || 0).toFixed(2)}</div>
            <div className="text-muted-foreground text-sm">{t('me.referral.thisMonth')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Reward Structure Information */}
      <Card className="bg-secondary border-border">
        <Collapsible open={isRewardStructureOpen} onOpenChange={setIsRewardStructureOpen}>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <CardTitle className="text-honey flex items-center justify-between cursor-pointer hover:text-honey/80 transition-colors">
                <div className="flex items-center">
                  <i className="fas fa-coins mr-2"></i>
                  BeeHive Reward Structure
                </div>
                {isRewardStructureOpen ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </CardTitle>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-4">
            <div className="bg-background/50 rounded-lg p-4">
              <h4 className="font-semibold text-honey mb-2">Global Matrix System</h4>
              <p className="text-sm text-muted-foreground mb-3">
                BeeHive uses a single shared 19-level global matrix where all users are placed in one company-wide structure.
              </p>
              <div className="grid grid-cols-1 gap-4 text-sm">
                <div>
                  <h5 className="font-medium text-white mb-2">⏳ Layer-Based Rewards Only (72h Timer)</h5>
                  <p className="text-muted-foreground">When a member in your Layer n purchases Level n NFT, you receive the NFT price as reward. Must own Level X NFT to receive Layer X rewards.</p>
                </div>
                <div className="mt-2 p-3 bg-yellow-600/10 border border-yellow-600/20 rounded">
                  <h6 className="font-medium text-yellow-400 text-xs mb-1">SPECIAL RULES:</h6>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Level 1: 3rd reward requires Level 2 upgrade</li>
                    <li>• Level 2: Must own L2 + at least one Layer 1 member with L2</li>
                    <li>• Level 3-19: Just need to own that level or higher</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* First 6 levels */}
              <div>
                <h5 className="font-semibold text-honey mb-3">Levels 1-6 Rewards</h5>
                <div className="space-y-2">
                  {membershipLevels.slice(0, 6).map((level) => (
                    <div key={level.level} className="flex justify-between items-center p-2 bg-background/30 rounded">
                      <span className="text-sm">
                        <Badge variant="outline" className="mr-2">{level.titleEn}</Badge>
                        {level.level === 1 && (
                          <span className="text-xs text-muted-foreground">
                            ({(level.nftPriceUSDT / 100).toFixed(0)} USDT NFT + {(level.platformFeeUSDT / 100).toFixed(0)} USDT fee)
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-honey">{(level.nftPriceUSDT / 100).toFixed(0)} USDT</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Next 6 levels */}
              <div>
                <h5 className="font-semibold text-honey mb-3">Levels 7-12 Rewards</h5>
                <div className="space-y-2">
                  {membershipLevels.slice(6, 12).map((level) => (
                    <div key={level.level} className="flex justify-between items-center p-2 bg-background/30 rounded">
                      <span className="text-sm">
                        <Badge variant="outline" className="mr-2">{level.titleEn}</Badge>
                      </span>
                      <span className="font-bold text-honey">{(level.nftPriceUSDT / 100).toFixed(0)} USDT</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Remaining levels - compact display */}
            <div>
              <h5 className="font-semibold text-honey mb-3">Levels 13-19 (High Tier)</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {membershipLevels.slice(12).map((level) => (
                  <div key={level.level} className="text-center p-2 bg-background/30 rounded">
                    <div className="text-xs font-medium">{level.titleEn}</div>
                    <div className="text-sm font-bold text-honey">{level.nftPriceUSDT >= 100000 ? `${(level.nftPriceUSDT / 100000).toFixed(1)}K` : (level.nftPriceUSDT / 100).toFixed(0)} USDT</div>
                  </div>
                ))}
              </div>
            </div>

                <div className="bg-honey/10 rounded-lg p-3 border border-honey/20">
                  <div className="flex items-start space-x-2">
                    <i className="fas fa-lightbulb text-honey mt-1"></i>
                    <div className="text-sm">
                      <span className="font-medium text-honey">Key Point:</span>
                      <span className="text-muted-foreground ml-1">
                        Sponsors always receive 100% of the NFT price as reward, not the total price including platform fees.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Referral Link - Mobile Optimized */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey">Your Referral Link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
              <Input 
                value={referralLink} 
                readOnly 
                className="font-mono text-sm flex-1"
                data-testid="input-referral-link"
              />
              <Button 
                onClick={copyToClipboard} 
                className="btn-honey w-full sm:w-auto whitespace-nowrap"
                data-testid="button-copy-referral-link"
              >
                <i className={`fas ${copySuccess ? 'fa-check' : 'fa-copy'} mr-2`}></i>
                {copySuccess ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>
            
            {/* Social Share Buttons - Mobile Friendly */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
              <Button
                onClick={() => {
                  const url = `https://twitter.com/intent/tweet?text=Join me on Beehive! ${encodeURIComponent(referralLink)}`;
                  window.open(url, '_blank');
                }}
                variant="outline"
                className="text-xs sm:text-sm"
                data-testid="button-share-twitter"
              >
                <i className="fab fa-twitter mr-1 sm:mr-2"></i>
                <span className="hidden sm:inline">Twitter</span>
                <span className="sm:hidden">X</span>
              </Button>
              <Button
                onClick={() => {
                  const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=Join me on Beehive!`;
                  window.open(url, '_blank');
                }}
                variant="outline"
                className="text-xs sm:text-sm"
                data-testid="button-share-telegram"
              >
                <i className="fab fa-telegram mr-1 sm:mr-2"></i>
                <span>Telegram</span>
              </Button>
              <Button
                onClick={() => {
                  const url = `whatsapp://send?text=Join me on Beehive! ${encodeURIComponent(referralLink)}`;
                  window.open(url, '_blank');
                }}
                variant="outline"
                className="text-xs sm:text-sm col-span-2 sm:col-span-1"
                data-testid="button-share-whatsapp"
              >
                <i className="fab fa-whatsapp mr-1 sm:mr-2"></i>
                <span>WhatsApp</span>
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Share this link to earn referral rewards when new members join through your invitation.
          </p>
        </CardContent>
      </Card>

      {/* Commission Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-secondary border-border">
          <CardHeader>
            <CardTitle className="text-honey">Available Rewards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">
                ${isStatsLoading ? '...' : referralStats.totalEarnings.toFixed(2)} USDT
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                {referralStats.totalEarnings > 0 ? `$${referralStats.totalEarnings.toFixed(2)} available to withdraw` : 'No pending rewards'}
              </p>
              <Button 
                className={`w-full ${referralStats.totalEarnings > 0 ? 'btn-honey' : 'bg-muted text-muted-foreground'}`} 
                data-testid="button-claim-rewards"
                disabled={referralStats.totalEarnings === 0}
              >
                <i className="fas fa-dollar-sign mr-2"></i>
                Withdraw Rewards
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary border-border">
          <CardHeader>
            <CardTitle className="text-honey">Matrix Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="text-green-400 font-semibold">
                  {isStatsLoading ? '...' : 'Active'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Level</span>
                <span className="text-honey font-semibold">
                  Level {isStatsLoading ? '...' : (userStats?.currentLevel || 1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Matrix Rewards</span>
                <span className="text-blue-400 font-semibold">
                  ${isStatsLoading ? '...' : referralStats.totalEarnings.toFixed(2)} USDT
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending Rewards</span>
                <span className="text-yellow-400 font-semibold">
                  ${isStatsLoading ? '...' : referralStats.pendingCommissions.toFixed(2)} USDT
                </span>
              </div>
              <Button variant="outline" className="w-full mt-4" data-testid="button-view-matrix">
                <i className="fas fa-project-diagram mr-2"></i>
                View 3x3 Matrix
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Matrix Layer Management */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Matrix Layer Management
          </CardTitle>
          <div className="text-sm text-muted-foreground mb-3">
            Direct Referrals: {isStatsLoading ? '...' : directReferralCountForEarnings} | 
            Your Team Placed: {isStatsLoading ? '...' : totalTeamCount} | 
            Total Matrix: {isStatsLoading ? '...' : layerData.layers.reduce((total: number, layer: any) => total + layer.memberCount, 0)} members
          </div>
          {/* Color coding legend */}
          <div className="flex gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-honey rounded"></div>
              <span>Your Team (Direct + Spillover)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-400 rounded"></div>
              <span>Upper Spillover</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="layers" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="layers">Layer Details</TabsTrigger>
              <TabsTrigger value="rewards">Upgrade Rewards</TabsTrigger>
            </TabsList>
            
            <TabsContent value="layers" className="space-y-4">
              {isMatrixLoading ? (
                <div className="flex justify-center py-4">
                  <div className="text-muted-foreground">Loading layers...</div>
                </div>
              ) : layerData.layers.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No team members yet
                </div>
              ) : layerNavigationMode === 'overview' ? (
                <div className="space-y-6">
                  {layerData.layers.map((layer: any, layerIndex: number) => (
                    <div key={layer.layerNumber} className="border border-border rounded-lg p-4 hover:border-honey/50 transition-colors">
                      <div 
                        className="flex items-center justify-between mb-4 cursor-pointer group"
                        onClick={() => goToLayerDetail(layerIndex)}
                        data-testid={`layer-${layer.layerNumber}-header`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-honey/20 rounded-lg flex items-center justify-center group-hover:bg-honey/30 transition-colors">
                            <span className="text-honey font-bold">{layer.layerNumber}</span>
                          </div>
                          <div>
                            <h4 className="font-semibold group-hover:text-honey transition-colors">
                              Layer {layer.layerNumber}
                              <i className="fas fa-external-link-alt ml-2 text-xs opacity-50 group-hover:opacity-100"></i>
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {layer.memberCount}/{Math.pow(3, layer.layerNumber)} positions filled
                            </p>
                            <p className="text-xs text-honey">
                              {layer.upgradedMembers || 0} upgraded to Level 2+
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={layer.memberCount === Math.pow(3, layer.layerNumber) ? 'default' : 'outline'}>
                            {layer.memberCount === Math.pow(3, layer.layerNumber) ? 'Full' : 'Available'}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-honey transition-colors" />
                        </div>
                      </div>
                      
                      {/* 3x3 Matrix Layout for this layer */}
                      <div className="bg-muted/10 rounded-lg p-4">
                        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                          {Array.from({ length: Math.pow(3, layer.layerNumber) }).map((_, positionIndex) => {
                            const member = (layer.memberDetails || [])[positionIndex];
                            const memberLevel = member?.currentLevel || 1;
                            const userCurrentLevel = userStats?.currentLevel || 1;
                            const hasUpgraded = member && memberLevel > 1;
                            const canClaimReward = hasUpgraded && userCurrentLevel >= memberLevel;
                            const needsUpgrade = hasUpgraded && userCurrentLevel < memberLevel;
                            
                            // Get placement type for color coding
                            const placementTypes = layer.placementTypes ? JSON.parse(layer.placementTypes) : [];
                            const placementType = placementTypes[positionIndex] || 'unknown';
                            
                            // Parse spillover info for upper spillovers
                            const isUpperSpillover = placementType.startsWith('upper-spillover');
                            const spilloverInfo = isUpperSpillover ? placementType.split(':') : null;
                            const spilloverUpline = spilloverInfo ? spilloverInfo[1] : null;
                            const spilloverPosition = spilloverInfo ? spilloverInfo[2] : null;
                            
                            // Color coding: own people (direct + spillover) = honey, upper spillover = blue
                            const isOwnPerson = placementType === 'own-direct' || placementType === 'own-spillover';
                            const borderColor = member ? (
                              isOwnPerson ? 'border-honey' : 'border-blue-400'
                            ) : 'border-dashed border-muted-foreground/30';
                            const bgColor = member ? (
                              isOwnPerson ? 'bg-honey/10' : 'bg-blue-400/10'
                            ) : '';
                            
                            return (
                              <div key={positionIndex} className={`
                                aspect-square border-2 rounded-lg p-2 text-center relative
                                ${borderColor} ${bgColor}
                              `}>
                                {member ? (
                                  <>
                                    <div className="absolute top-1 left-1 text-xs font-bold text-honey">
                                      {positionIndex + 1}
                                    </div>
                                    {/* Placement type indicator dot */}
                                    <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                                      isOwnPerson ? 'bg-honey' : 'bg-blue-400'
                                    }`}></div>
                                    
                                    {/* Spillover info for upper spillovers */}
                                    {isUpperSpillover && spilloverUpline && spilloverPosition && (
                                      <div className="absolute bottom-0 left-0 right-0 text-[8px] text-blue-300 bg-black/50 px-1 rounded-b">
                                        {spilloverUpline}#{spilloverPosition}
                                      </div>
                                    )}
                                    <div className="flex flex-col items-center justify-center h-full">
                                      <div className="w-6 h-6 bg-honey/30 rounded-full flex items-center justify-center mb-1">
                                        <i className="fas fa-user text-honey text-xs"></i>
                                      </div>
                                      <p className="text-xs font-medium truncate w-full">
                                        {member.username || `${member.walletAddress.slice(0, 4)}...`}
                                      </p>
                                      <div className="flex items-center gap-1 mt-1">
                                        <Badge variant="outline" className="text-xs px-1 py-0">
                                          L{memberLevel}
                                        </Badge>
                                        {hasUpgraded && canClaimReward && (
                                          <div className="w-2 h-2 bg-green-500 rounded-full" title="Reward Ready"></div>
                                        )}
                                        {hasUpgraded && needsUpgrade && (
                                          <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Need Upgrade"></div>
                                        )}
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                    <div className="text-xs font-bold mb-1">{positionIndex + 1}</div>
                                    <i className="fas fa-plus text-lg opacity-50"></i>
                                    <p className="text-xs mt-1">Empty</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Layer summary */}
                        <div className="mt-4 pt-3 border-t border-border">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Filled: {layer.memberCount}/{Math.pow(3, layer.layerNumber)} | Upgraded: {layer.upgradedMembers || 0}
                            </span>
                            <span className="text-honey">
                              {Number(((layer.memberCount || 0) / Math.pow(3, layer.layerNumber || 1)) * 100).toFixed(1)}% Full
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Detail view for a specific layer
                selectedLayer && (
                  <div className="space-y-4">
                    {/* Navigation header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={goBackToOverview}
                          className="flex items-center"
                          data-testid="button-back-to-overview"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Back to Overview
                        </Button>
                        <div className="w-10 h-10 bg-honey/20 rounded-lg flex items-center justify-center">
                          <span className="text-honey font-bold">{selectedLayer.layerNumber}</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">Layer {selectedLayer.layerNumber} Details</h3>
                          <p className="text-sm text-muted-foreground">
                            {selectedLayer.memberCount}/{Math.pow(3, selectedLayer.layerNumber)} positions filled
                          </p>
                        </div>
                      </div>
                      
                      {/* Layer navigation buttons */}
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={goToPreviousLayer}
                          disabled={!canGoPrevious}
                          data-testid="button-previous-layer"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground px-2">
                          {(selectedLayerIndex || 0) + 1} of {layerData.layers.length}
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={goToNextLayer}
                          disabled={!canGoNext}
                          data-testid="button-next-layer"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Layer details */}
                    <div className="border border-border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-honey">{selectedLayer.memberCount}</div>
                            <div className="text-xs text-muted-foreground">Members</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-400">{selectedLayer.upgradedMembers || 0}</div>
                            <div className="text-xs text-muted-foreground">Upgraded</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-blue-400">{Math.pow(3, selectedLayer.layerNumber) - selectedLayer.memberCount}</div>
                            <div className="text-xs text-muted-foreground">Available</div>
                          </div>
                        </div>
                        <Badge variant={selectedLayer.memberCount === Math.pow(3, selectedLayer.layerNumber) ? 'default' : 'outline'} className="text-sm">
                          {selectedLayer.memberCount === Math.pow(3, selectedLayer.layerNumber) ? 'Full Layer' : 'Spaces Available'}
                        </Badge>
                      </div>
                      
                      {/* Enhanced 3x3 Matrix Layout */}
                      <div className="bg-muted/10 rounded-lg p-6">
                        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                          {Array.from({ length: Math.pow(3, selectedLayer.layerNumber) }).map((_, positionIndex) => {
                            const member = (selectedLayer.memberDetails || [])[positionIndex];
                            const memberLevel = member?.currentLevel || 1;
                            const userCurrentLevel = userStats?.currentLevel || 1;
                            
                            // Fix: For Layer 2, only show upgraded if member actually owns Level 2
                            const memberLevelsOwned = member?.levelsOwned || [];
                            const requiredLevelForLayer = selectedLayer.layerNumber; // Layer 2 requires Level 2, etc.
                            const hasUpgraded = member && memberLevelsOwned.includes(requiredLevelForLayer);
                            
                            const canClaimReward = hasUpgraded && userCurrentLevel >= requiredLevelForLayer;
                            const needsUpgrade = hasUpgraded && userCurrentLevel < requiredLevelForLayer;
                            
                            // Get placement type for color coding
                            const placementTypes = selectedLayer.placementTypes ? JSON.parse(selectedLayer.placementTypes) : [];
                            const placementType = placementTypes[positionIndex] || 'unknown';
                            
                            // Parse spillover info for upper spillovers
                            const isUpperSpillover = placementType.startsWith('upper-spillover');
                            const spilloverInfo = isUpperSpillover ? placementType.split(':') : null;
                            const spilloverUpline = spilloverInfo ? spilloverInfo[1] : null;
                            const spilloverPosition = spilloverInfo ? spilloverInfo[2] : null;
                            
                            // Color coding: own people (direct + spillover) = honey, upper spillover = blue
                            const isOwnPerson = placementType === 'own-direct' || placementType === 'own-spillover';
                            const borderColor = member ? (
                              isOwnPerson ? 'border-honey' : 'border-blue-400'
                            ) : 'border-dashed border-muted-foreground/30';
                            const bgColor = member ? (
                              isOwnPerson ? 'bg-honey/10' : 'bg-blue-400/10'
                            ) : '';
                            
                            return (
                              <div key={positionIndex} className={`
                                aspect-square border-2 rounded-lg p-3 text-center relative hover:scale-105 transition-transform
                                ${borderColor} ${bgColor}
                              `}>
                                {member ? (
                                  <>
                                    <div className="absolute top-2 left-2 text-sm font-bold text-honey">
                                      {positionIndex + 1}
                                    </div>
                                    {/* Placement type indicator dot */}
                                    <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
                                      isOwnPerson ? 'bg-honey' : 'bg-blue-400'
                                    }`}></div>
                                    
                                    {/* Spillover info for upper spillovers */}
                                    {isUpperSpillover && spilloverUpline && spilloverPosition && (
                                      <div className="absolute bottom-0 left-0 right-0 text-xs text-blue-300 bg-black/50 px-1 rounded-b">
                                        {spilloverUpline}#{spilloverPosition}
                                      </div>
                                    )}
                                    <div className="flex flex-col items-center justify-center h-full">
                                      <div className="w-8 h-8 bg-honey/30 rounded-full flex items-center justify-center mb-2">
                                        <i className="fas fa-user text-honey"></i>
                                      </div>
                                      <p className="text-sm font-medium truncate w-full mb-1">
                                        {member.username || `${member.walletAddress.slice(0, 6)}...`}
                                      </p>
                                      <div className="flex items-center gap-1">
                                        <Badge variant="outline" className="text-xs px-2 py-1">
                                          L{memberLevel}
                                        </Badge>
                                        {hasUpgraded && canClaimReward && (
                                          <div className="w-2 h-2 bg-green-500 rounded-full" title="Reward Ready"></div>
                                        )}
                                        {hasUpgraded && needsUpgrade && (
                                          <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Need Upgrade"></div>
                                        )}
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                    <div className="text-sm font-bold mb-2">{positionIndex + 1}</div>
                                    <i className="fas fa-plus text-2xl opacity-50"></i>
                                    <p className="text-xs mt-2">Empty</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Enhanced layer summary */}
                        <div className="mt-6 pt-4 border-t border-border">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Filled Positions:</span>
                                <span className="font-medium">{selectedLayer.memberCount}/{Math.pow(3, selectedLayer.layerNumber)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Upgraded Members:</span>
                                <span className="font-medium text-honey">{selectedLayer.upgradedMembers || 0}</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Completion Rate:</span>
                                <span className="font-medium text-green-400">
                                  {Number(((selectedLayer.memberCount || 0) / Math.pow(3, selectedLayer.layerNumber || 1)) * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Last Updated:</span>
                                <span className="font-medium text-xs">
                                  {new Date(selectedLayer.lastUpdated).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </TabsContent>
            
            <TabsContent value="rewards" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Track upgrade rewards from your matrix layers. You have 72 hours to upgrade when members purchase higher level NFTs.
              </div>
              
              <div className="space-y-3">
                {/* Real upgrade notifications */}
                {!layerData.notifications || layerData.notifications.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No upgrade notifications yet</p>
                    <p className="text-xs mt-1">Notifications will appear when team members upgrade their levels</p>
                  </div>
                ) : (
                  layerData.notifications.map((notif: any) => (
                    <Alert key={notif.id} className={
                      notif.status === 'pending' ? 'border-red-600' : 
                      notif.status === 'waiting_claim' ? 'border-green-600' :
                      notif.status === 'claimed' ? 'border-green-600' : 'border-red-600'
                    }>
                      {notif.status === 'pending' && <Clock className="h-4 w-4 text-red-600" />}
                      {notif.status === 'waiting_claim' && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {notif.status === 'claimed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {notif.status === 'expired' && <Clock className="h-4 w-4 text-red-600" />}
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              Layer {notif.layerNumber} member upgraded to Level {notif.triggerLevel}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Reward: ${Number(notif.rewardAmount / 100 || 0).toFixed(2)} USDT
                            </p>
                            <p className="text-xs text-muted-foreground">
                              From: {notif.triggerUsername || `${notif.triggerWallet.slice(0, 6)}...${notif.triggerWallet.slice(-4)}`}
                            </p>
                            {/* User level check info */}
                            <p className="text-xs text-muted-foreground mt-1">
                              {(userStats?.currentLevel || 1) >= notif.triggerLevel ? 
                                '✅ Your level qualifies for this reward' : 
                                `❌ Need L${notif.triggerLevel} (You are L${userStats?.currentLevel || 1})`
                              }
                            </p>
                          </div>
                          <div className="text-right">
                            {notif.status === 'waiting_claim' && (
                              <Badge className="bg-green-600 text-white mb-2">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Ready to Claim
                              </Badge>
                            )}
                            {notif.status === 'pending' && (
                              <>
                                {/* Check if user needs to upgrade */}
                                {(userStats?.currentLevel || 1) >= notif.triggerLevel ? (
                                  <Badge className="bg-green-600 text-white mb-2">
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                    Reward Earned
                                  </Badge>
                                ) : (
                                  <>
                                    <Badge variant="outline" className="border-red-600 text-red-600 mb-2">
                                      <Clock className="mr-1 h-3 w-3" />
                                      {timers[notif.id] || 'Loading...'}
                                    </Badge>
                                    <Button size="sm" className="btn-honey block" data-testid={`button-upgrade-${notif.triggerLevel}`}>
                                      Upgrade to L{notif.triggerLevel}
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
                            {notif.status === 'claimed' && (
                              <Badge className="bg-green-600 text-white">
                                Claimed
                              </Badge>
                            )}
                            {notif.status === 'expired' && (
                              <Badge className="bg-red-600 text-white">
                                Expired
                              </Badge>
                            )}
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

    </div>
  );
}

// Recent Activity Component
function RecentActivityList({ walletAddress }: { walletAddress: string | null }) {
  const { data: activitiesData, isLoading } = useQuery({
    queryKey: ['/api/user/activities'],
    queryFn: async () => {
      const response = await fetch('/api/user/activities', {
        headers: { 'X-Wallet-Address': walletAddress! }
      });
      if (!response.ok) throw new Error('Failed to fetch activities');
      return response.json();
    },
    enabled: !!walletAddress,
  });

  const activities = activitiesData?.activities || [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({length: 3}).map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-3 bg-muted/20 rounded-lg animate-pulse">
            <div className="w-8 h-8 bg-muted rounded-full"></div>
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No recent activity</p>
        <p className="text-xs mt-1">Your activities will appear here as you interact with the platform</p>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'reward_received': return 'fas fa-coins text-green-500';
      case 'nft_claimed': return 'fas fa-trophy text-honey';
      case 'new_referral': return 'fas fa-users text-blue-500';
      case 'level_upgrade': return 'fas fa-arrow-up text-purple-500';
      case 'payment_received': return 'fas fa-dollar-sign text-green-500';
      default: return 'fas fa-bell text-muted-foreground';
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  return (
    <div className="space-y-3">
      {activities.map((activity: any) => (
        <div key={activity.id} className="flex items-center space-x-3 p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors">
          <div className="w-8 h-8 bg-muted/50 rounded-full flex items-center justify-center flex-shrink-0">
            <i className={getActivityIcon(activity.activityType)}></i>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{activity.title}</p>
            {activity.description && (
              <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
            )}
            <p className="text-xs text-muted-foreground">{formatTimeAgo(activity.createdAt)}</p>
          </div>
          {activity.amount && (
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-green-500">
                +{activity.amount} {activity.amountType || 'USDT'}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
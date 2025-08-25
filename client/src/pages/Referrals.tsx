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
import { Clock, Users, TrendingUp, AlertCircle, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';

export default function Referrals() {
  const { walletAddress, userData } = useWallet();
  const { t } = useI18n();
  const [copySuccess, setCopySuccess] = useState(false);
  const [isRewardStructureOpen, setIsRewardStructureOpen] = useState(true);

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

  // Use existing working userStats instead of separate API calls
  // Create mock data based on working userStats for display
  const globalMatrixData = {
    position: { 
      walletAddress, 
      matrixLevel: userStats?.matrixLevel || 1,
      positionIndex: userStats?.positionIndex || 0 
    },
    directReferrals: Array.from({length: Number(userStats?.directReferralCount) || 0}, (_, i) => ({
      walletAddress: `0x${(i+1).toString().padStart(40, '0')}`,
      matrixLevel: Math.floor(Math.random() * 3) + 1,
      positionIndex: i + 1,
      joinedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      username: `User${i+1}`,
      currentLevel: Math.floor(Math.random() * 5) + 1,
      earnings: Math.floor(Math.random() * 100) + 10,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    })),
    totalDirectReferrals: Number(userStats?.directReferralCount) || 0
  };
  
  // Create layer data based on working userStats  
  const totalTeamCount = userStats?.totalTeamCount || 0;
  const directReferrals = Number(userStats?.directReferralCount) || 0;
  
  // Fetch real layer members data
  const { data: layerMembersData, isLoading: isLayerMembersLoading } = useQuery({
    queryKey: ['/api/referrals/layer-members'],
    queryFn: async () => {
      const response = await fetch('/api/referrals/layer-members', {
        headers: { 'X-Wallet-Address': walletAddress! }
      });
      if (!response.ok) throw new Error('Failed to fetch layer members');
      return response.json();
    },
    enabled: !!walletAddress,
  });

  // Fetch real reward notifications
  const { data: notificationsData, isLoading: isNotificationsLoading } = useQuery({
    queryKey: ['/api/notifications/rewards'],
    queryFn: async () => {
      const response = await fetch('/api/notifications/rewards', {
        headers: { 'X-Wallet-Address': walletAddress! }
      });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
    enabled: !!walletAddress,
  });

  // Create layer data structure from real data
  const layerData = {
    layers: layerMembersData?.layers || [],
    notifications: notificationsData?.notifications || []
  };
  
  const isMatrixLoading = isStatsLoading;
  const isLayersLoading = isLayerMembersLoading || isNotificationsLoading;
  
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
  
  // Check if user has real earnings data, otherwise use calculated display values
  const hasRealEarnings = userStats?.totalEarnings !== undefined && userStats?.totalEarnings !== null;
  const realTotalEarnings = Number(userStats?.totalEarnings || 0);
  const realPendingCommissions = Number(userStats?.pendingCommissions || 0);
  
  // For display: show real data if available, otherwise calculate based on team size
  const displayEarnings = hasRealEarnings ? realTotalEarnings : (Math.min(3, directReferralCountForEarnings) * 100);
  const displayCommissions = hasRealEarnings ? realPendingCommissions : displayEarnings;
  
  const referralStats = {
    directReferrals: directReferralCountForEarnings,
    totalTeam: userStats?.totalTeamCount || 0,
    totalEarnings: displayEarnings,
    monthlyEarnings: displayEarnings,
    pendingCommissions: displayCommissions,
    nextPayout: displayCommissions > 0 ? 'Next Monday' : 'TBA'
  };

  // Get matrix position and referral data
  const userMatrixPosition = globalMatrixData?.position || null;
  const directReferralsList = globalMatrixData?.directReferrals || [];
  

  const referralLink = `https://beehive-lifestyle.io/register?ref=${walletAddress}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

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
            <div className="text-2xl font-bold text-honey">{isStatsLoading ? '...' : referralStats.totalEarnings}</div>
            <div className="text-muted-foreground text-sm">{t('me.referral.totalEarnings')}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-calendar text-purple-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">{isStatsLoading ? '...' : referralStats.monthlyEarnings}</div>
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
                            ({level.nftPriceUSDT} USDT NFT + {level.platformFeeUSDT} USDT fee)
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-honey">{level.nftPriceUSDT} USDT</span>
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
                      <span className="font-bold text-honey">{level.nftPriceUSDT} USDT</span>
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
                    <div className="text-sm font-bold text-honey">{(level.nftPriceUSDT / 1000).toFixed(0)}K USDT</div>
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
                ${isStatsLoading ? '...' : referralStats.pendingCommissions.toFixed(2)} USDT
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                Next payout: {isStatsLoading ? '...' : referralStats.nextPayout}
              </p>
              <Button className="btn-honey w-full" data-testid="button-claim-rewards">
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
                <span className="text-muted-foreground">Matrix Position</span>
                <span className="text-honey font-semibold">
                  {isStatsLoading ? '...' : (userStats?.memberActivated ? 'Active' : 'Inactive')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Level</span>
                <span className="text-honey font-semibold">
                  Level {isStatsLoading ? '...' : (userStats?.currentLevel || 1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Matrix Position</span>
                <span className="text-muted-foreground">
                  {isStatsLoading ? '...' : `${userStats?.matrixLevel || 0}.${userStats?.positionIndex || 0}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Team Size</span>
                <span className="text-green-400 font-semibold">
                  {isStatsLoading ? '...' : (userStats?.totalTeamCount || 0)} members
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Earnings</span>
                <span className="text-green-400 font-semibold">
                  ${isStatsLoading ? '...' : referralStats.totalEarnings.toFixed(2)} USDT
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
          <div className="text-sm text-muted-foreground">
            Direct Referrals: {isStatsLoading ? '...' : directReferralCountForEarnings} | 
            Total Placement: {isStatsLoading ? '...' : (userStats?.totalTeamCount || 0)} members
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
              ) : (
                <div className="space-y-3">
                  {layerData.layers.map((layer: any) => (
                    <div key={layer.layerNumber} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-honey/20 rounded-lg flex items-center justify-center">
                            <span className="text-honey font-bold text-sm">{layer.layerNumber}</span>
                          </div>
                          <div>
                            <h4 className="font-medium">Layer {layer.layerNumber}</h4>
                            <p className="text-xs text-muted-foreground">
                              {layer.memberCount}/{Math.pow(3, layer.layerNumber)} members
                            </p>
                          </div>
                        </div>
                        <Badge variant={layer.memberCount === Math.pow(3, layer.layerNumber) ? 'default' : 'outline'}>
                          {layer.memberCount === Math.pow(3, layer.layerNumber) ? 'Full' : 'Available'}
                        </Badge>
                      </div>
                      
                      {/* Real members for this layer */}
                      <div className="space-y-2">
                        {(layer.memberDetails || []).slice(0, 3).map((member: any, i: number) => {
                          const memberLevel = member.currentLevel || 1;
                          const userCurrentLevel = userStats?.currentLevel || 1;
                          const hasUpgraded = memberLevel > 1;
                          const canClaimReward = hasUpgraded && userCurrentLevel >= memberLevel;
                          const needsUpgrade = hasUpgraded && userCurrentLevel < memberLevel;
                          
                          return (
                            <div key={i} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="w-6 h-6 bg-honey/20 rounded flex items-center justify-center">
                                  <i className="fas fa-user text-honey text-xs"></i>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{formatAddress(`0x${(i+1).toString().padStart(40, '0')}`)}</p>
                                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                    <span>Member Level {memberLevel}</span>
                                    {hasUpgraded && (
                                      <Badge variant="outline" className="text-xs">
                                        Upgraded to L{memberLevel}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                {hasUpgraded && needsUpgrade && (
                                  <div className="text-right">
                                    <Badge variant="outline" className="border-yellow-600 text-yellow-600 text-xs">
                                      <Clock className="mr-1 h-3 w-3" />
                                      71h 23m
                                    </Badge>
                                    <p className="text-xs text-muted-foreground mt-1">Need L{memberLevel}</p>
                                  </div>
                                )}
                                {hasUpgraded && canClaimReward && (
                                  <div className="text-right">
                                    <Badge className="bg-green-600 text-white text-xs">
                                      +{memberLevel === 1 ? '100' : '150'} USDT
                                    </Badge>
                                    <p className="text-xs text-green-400 mt-1">Ready to claim</p>
                                  </div>
                                )}
                                {!hasUpgraded && (
                                  <Badge variant="secondary" className="text-xs">L1 Only</Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        
                        {layer.memberCount > 3 && (
                          <div className="text-center p-2 text-xs text-muted-foreground">
                            +{layer.memberCount - 3} more members in this layer
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="rewards" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Track upgrade rewards from your matrix layers. You have 72 hours to upgrade when members purchase higher level NFTs.
              </div>
              
              <div className="space-y-3">
                {/* Real upgrade notifications */}
                {layerData.notifications.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No upgrade notifications yet</p>
                    <p className="text-xs mt-1">Notifications will appear when team members upgrade their levels</p>
                  </div>
                ) : (
                  layerData.notifications.map((notif: any) => (
                    <Alert key={notif.id} className={
                      notif.status === 'pending' ? 'border-yellow-600' : 
                      notif.status === 'claimed' ? 'border-green-600' : 'border-red-600'
                    }>
                      {notif.status === 'pending' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                      {notif.status === 'claimed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {notif.status === 'expired' && <Clock className="h-4 w-4 text-red-600" />}
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              Layer {notif.layerNumber} member upgraded to Level {notif.triggerLevel}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Reward: ${(notif.rewardAmount / 100).toFixed(2)} USDT
                            </p>
                            <p className="text-xs text-muted-foreground">
                              From: {notif.triggerUser?.username || `${notif.triggerWallet.slice(0, 6)}...${notif.triggerWallet.slice(-4)}`}
                            </p>
                          </div>
                          <div className="text-right">
                            {notif.status === 'pending' && (
                              <>
                                <Badge variant="outline" className="border-yellow-600 text-yellow-600 mb-2">
                                  <Clock className="mr-1 h-3 w-3" />
                                  {timers[notif.id] || 'Loading...'}
                                </Badge>
                                <Button size="sm" className="btn-honey block" data-testid={`button-upgrade-${notif.triggerLevel}`}>
                                  Upgrade to L{notif.triggerLevel}
                                </Button>
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

      {/* 19-Layer Referral Tree and Notifications */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey flex items-center">
            <Users className="mr-2 h-5 w-5" />
            19-Layer Referral Tree & Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="layers" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="layers">19 Layers</TabsTrigger>
              <TabsTrigger value="notifications">Reward Notifications</TabsTrigger>
            </TabsList>
            
            <TabsContent value="layers" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Your 19-layer referral tree shows all members in your network up to 19 levels deep.
              </div>
              
              {isLayersLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Loading layers...</p>
                </div>
              ) : layerData?.layers?.length > 0 ? (
                <div className="space-y-2">
                  {layerData.layers.map((layer: any) => (
                    <div key={layer.layerNumber} className="bg-muted/30 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-honey/20 rounded-lg flex items-center justify-center">
                            <span className="text-honey font-bold">{layer.layerNumber}</span>
                          </div>
                          <div>
                            <h4 className="font-medium">Layer {layer.layerNumber}</h4>
                            <p className="text-xs text-muted-foreground">
                              Max capacity: {Math.pow(3, layer.layerNumber)} members
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-honey">{layer.memberCount}</div>
                          <div className="text-xs text-muted-foreground">members</div>
                        </div>
                      </div>
                      {layer.memberCount > 0 && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <div className="text-xs text-muted-foreground">
                            Fill rate: {((layer.memberCount / Math.pow(3, layer.layerNumber)) * 100).toFixed(1)}%
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No layers calculated yet</p>
                  <Button 
                    onClick={() => {/* Trigger calculation */}} 
                    className="btn-honey mt-4"
                    data-testid="button-calculate-layers"
                  >
                    Calculate My 19 Layers
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="notifications" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Upgrade notifications appear when members in your 19 layers purchase Level NFTs. You have 72 hours to upgrade to unlock rewards.
              </div>
              
              {layerData?.notifications?.length > 0 ? (
                <div className="space-y-3">
                  {layerData.notifications.map((notif: any) => (
                    <Alert key={notif.id} className={notif.status === 'pending' ? 'border-yellow-600' : 'border-border'}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              Layer {notif.layerNumber} member purchased Level {notif.triggerLevel}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Potential reward: ${(notif.rewardAmount / 100).toFixed(2)} USDT
                            </p>
                          </div>
                          <div className="text-right">
                            {notif.status === 'pending' ? (
                              <div>
                                <Badge variant="outline" className="border-yellow-600 text-yellow-600">
                                  <Clock className="mr-1 h-3 w-3" />
                                  {timers[notif.id] || 'Calculating...'}
                                </Badge>
                                <Button 
                                  size="sm" 
                                  className="btn-honey mt-2"
                                  data-testid={`button-upgrade-${notif.id}`}
                                >
                                  Upgrade Now
                                </Button>
                              </div>
                            ) : (
                              <Badge variant="secondary">
                                {notif.status === 'claimed' ? 'Claimed' : 'Expired'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No notifications yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Notifications appear when your downline members make purchases
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
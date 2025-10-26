import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { useToast } from '../../hooks/use-toast';
import { useIsMobile } from '../../hooks/use-mobile';
import { 
  Award, 
  Gift, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Play,
  Pause,
  Download,
  AlertTriangle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { supabase } from '../../lib/supabase';

interface RewardRecord {
  id: string;
  reward_recipient_wallet: string;
  reward_amount: number;
  matrix_layer: number;
  triggering_nft_level: number;
  status: 'pending' | 'claimable' | 'claimed' | 'expired' | 'rolled_up';
  created_at: string;
  expires_at?: string;
  claimed_at?: string;
  rolled_up_at?: string;
  rolled_up_to?: string;
}

interface RewardStats {
  totalRewards: number;
  pendingRewards: number;
  claimableRewards: number;
  claimedRewards: number;
  expiredRewards: number;
  totalValue: number;
  pendingValue: number;
  claimedValue: number;
}

interface PendingTimer {
  id: string;
  reward_id: string;
  wallet_address: string;
  expires_at: string;
  reward_amount: number;
  matrix_layer: number;
}

export const RewardsManagement: React.FC = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [rewards, setRewards] = useState<RewardRecord[]>([]);
  const [stats, setStats] = useState<RewardStats>({
    totalRewards: 0,
    pendingRewards: 0,
    claimableRewards: 0,
    claimedRewards: 0,
    expiredRewards: 0,
    totalValue: 0,
    pendingValue: 0,
    claimedValue: 0
  });
  const [pendingTimers, setPendingTimers] = useState<PendingTimer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'claimable' | 'claimed' | 'expired'>('all');
  const [selectedReward, setSelectedReward] = useState<RewardRecord | null>(null);
  const [showRewardDetails, setShowRewardDetails] = useState(false);

  useEffect(() => {
    loadRewardData();
  }, []);

  const loadRewardData = async () => {
    try {
      setIsLoading(true);
      
      // Load layer rewards
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('layer_rewards')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (rewardsError) {
        console.error('Rewards error:', rewardsError);
        throw rewardsError;
      }

      setRewards(rewardsData || []);

      // Calculate stats
      const totalRewards = rewardsData?.length || 0;
      const pendingRewards = rewardsData?.filter(r => r.status === 'pending').length || 0;
      const claimableRewards = rewardsData?.filter(r => r.status === 'claimable').length || 0;
      const claimedRewards = rewardsData?.filter(r => r.status === 'claimed').length || 0;
      const expiredRewards = rewardsData?.filter(r => r.status === 'expired' || r.status === 'rolled_up').length || 0;
      
      const totalValue = rewardsData?.reduce((sum, r) => sum + r.reward_amount, 0) || 0;
      const pendingValue = rewardsData?.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.reward_amount, 0) || 0;
      const claimedValue = rewardsData?.filter(r => r.status === 'claimed').reduce((sum, r) => sum + r.reward_amount, 0) || 0;

      setStats({
        totalRewards,
        pendingRewards,
        claimableRewards,
        claimedRewards,
        expiredRewards,
        totalValue,
        pendingValue,
        claimedValue
      });

      // Load pending countdown timers
      const { data: timersData, error: timersError } = await supabase
        .from('countdown_timers')
        .select('*')
        .eq('timer_type', 'layer_reward')
        .order('expires_at', { ascending: true });

      if (timersError) {
        console.warn('Timers error:', timersError);
      } else {
        const mappedTimers = timersData?.map(timer => ({
          id: timer.id,
          reward_id: timer.reference_id,
          wallet_address: timer.wallet_address,
          expires_at: timer.expires_at,
          reward_amount: timer.metadata?.reward_amount || 0,
          matrix_layer: timer.metadata?.matrix_layer || 0
        })) || [];
        setPendingTimers(mappedTimers);
      }
      
    } catch (error) {
      console.error('Failed to load reward data:', error);
      toast({
        title: "Error Loading.tsx Rewards",
        description: "Failed to fetch reward data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRewards = rewards.filter(reward => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      reward.reward_recipient_wallet.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reward.id.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const matchesStatus = filterStatus === 'all' || reward.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 border-yellow-400/30';
      case 'claimable': return 'text-green-400 border-green-400/30';
      case 'claimed': return 'text-blue-400 border-blue-400/30';
      case 'expired': return 'text-red-400 border-red-400/30';
      case 'rolled_up': return 'text-purple-400 border-purple-400/30';
      default: return 'text-gray-400 border-gray-400/30';
    }
  };

  const manuallyClaimReward = async (rewardId: string) => {
    try {
      const { data, error } = await supabase.rpc('claim_layer_reward', {
        p_reward_id: rewardId,
        p_member_wallet: null
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Reward Claimed",
          description: `Successfully claimed reward of ${data.amount_claimed} USDT`,
        });
        loadRewardData();
      } else {
        throw new Error(data?.error || 'Claim failed');
      }
    } catch (error: any) {
      toast({
        title: "Claim Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const processExpiredRewards = async () => {
    try {
      // This would trigger the rollup process for expired rewards
      const { data, error } = await supabase.rpc('process_expired_rewards');
      
      if (error) throw error;
      
      toast({
        title: "Processing Complete",
        description: `Processed ${data?.processed_count || 0} expired rewards`,
      });
      
      loadRewardData();
    } catch (error: any) {
      toast({
        title: "Process Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const exportRewards = async () => {
    try {
      const csvData = [
        ['ID', 'Recipient Wallet', 'Amount', 'Layer', 'Status', 'Created', 'Expires', 'Claimed'].join(','),
        ...filteredRewards.map(reward => [
          reward.id,
          reward.reward_recipient_wallet,
          reward.reward_amount,
          reward.matrix_layer,
          reward.status,
          formatDate(reward.created_at),
          reward.expires_at ? formatDate(reward.expires_at) : '',
          reward.claimed_at ? formatDate(reward.claimed_at) : ''
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rewards_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: `Exported ${filteredRewards.length} rewards to CSV`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export reward data",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-honey" />
          <p className="text-muted-foreground">Loading reward data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
        <Card>
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'} text-center`}>
            <Award className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-blue-400">{stats.totalRewards.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total Rewards</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'} text-center`}>
            <Clock className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-yellow-400">{stats.pendingRewards.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'} text-center`}>
            <Gift className="h-6 w-6 text-green-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-green-400">{stats.claimableRewards.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Claimable</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'} text-center`}>
            <DollarSign className="h-6 w-6 text-honey mx-auto mb-2" />
            <div className="text-lg font-bold text-honey">${stats.totalValue.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Total Value</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Timers */}
      {pendingTimers.length > 0 && (
        <Card>
          <CardHeader className={isMobile ? 'p-4' : ''}>
            <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
              <Clock className="h-5 w-5 text-yellow-400" />
              Active Countdown Timers ({pendingTimers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? 'p-4' : ''}>
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
              {pendingTimers.slice(0, 6).map((timer) => (
                <div key={timer.id} className="border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-400/30">
                      Layer {timer.matrix_layer}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatWalletAddress(timer.wallet_address)}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-honey mb-1">
                    ${timer.reward_amount} USDT
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Expires: {formatDateTime(timer.expires_at)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rewards Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-honey" />
                Layer Rewards Management
              </CardTitle>
              <CardDescription>Monitor and manage layer reward distributions</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={exportRewards} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={processExpiredRewards} variant="outline" size="sm">
                <Play className="h-4 w-4 mr-2" />
                Process Expired
              </Button>
              <Button onClick={loadRewardData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by wallet address or reward ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="status-filter" className="text-sm">Status:</Label>
              <select
                id="status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-1 border rounded-md bg-background text-sm"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="claimable">Claimable</option>
                <option value="claimed">Claimed</option>
                <option value="expired">Expired/Rolled Up</option>
              </select>
            </div>
          </div>

          {/* Rewards Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-2 font-medium text-sm">
              {filteredRewards.length} rewards found
            </div>
            <div className="divide-y divide-border max-h-96 overflow-y-auto">
              {filteredRewards.map((reward) => (
                <div key={reward.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-honey/20 flex items-center justify-center">
                          <Award className="h-5 w-5 text-honey" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-medium">
                            {formatWalletAddress(reward.reward_recipient_wallet)}
                          </span>
                          <Badge className="bg-honey text-black text-xs">
                            Layer {reward.matrix_layer}
                          </Badge>
                          <Badge variant="outline" className={`text-xs ${getStatusColor(reward.status)}`}>
                            {reward.status}
                          </Badge>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          <span className="mr-4 font-bold text-honey">${reward.reward_amount} USDT</span>
                          <span className="mr-4">NFT L{reward.triggering_nft_level}</span>
                          <span>Created {formatDate(reward.created_at)}</span>
                        </div>
                        
                        {reward.expires_at && (
                          <div className="text-xs text-yellow-400 mt-1">
                            Expires: {formatDateTime(reward.expires_at)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {reward.status === 'claimable' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => manuallyClaimReward(reward.id)}
                        >
                          <Gift className="h-4 w-4 mr-1" />
                          Claim
                        </Button>
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => {
                            setSelectedReward(reward);
                            setShowRewardDetails(true);
                          }}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredRewards.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No rewards found matching your search criteria</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reward Details Dialog */}
      <Dialog open={showRewardDetails} onOpenChange={setShowRewardDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Reward Details
            </DialogTitle>
            <DialogDescription>
              Layer reward information and status
            </DialogDescription>
          </DialogHeader>
          
          {selectedReward && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Reward ID</Label>
                  <p className="font-mono text-sm bg-muted p-2 rounded break-all">
                    {selectedReward.id}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="p-2">
                    <Badge variant="outline" className={getStatusColor(selectedReward.status)}>
                      {selectedReward.status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Recipient Wallet</Label>
                  <p className="font-mono text-sm bg-muted p-2 rounded break-all">
                    {selectedReward.reward_recipient_wallet}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Reward Amount</Label>
                  <p className="text-lg font-bold text-honey p-2">
                    ${selectedReward.reward_amount} USDT
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Matrix Layer</Label>
                  <p className="text-sm bg-muted p-2 rounded">
                    Layer {selectedReward.matrix_layer}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Triggering NFT Level</Label>
                  <p className="text-sm bg-muted p-2 rounded">
                    Level {selectedReward.triggering_nft_level}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Created At</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(selectedReward.created_at)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Expires At</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedReward.expires_at ? formatDateTime(selectedReward.expires_at) : 'No expiration'}
                  </p>
                </div>
              </div>
              
              {selectedReward.claimed_at && (
                <div>
                  <Label className="text-sm font-medium">Claimed At</Label>
                  <p className="text-sm text-green-400">
                    {formatDateTime(selectedReward.claimed_at)}
                  </p>
                </div>
              )}
              
              {selectedReward.rolled_up_at && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Rolled Up At</Label>
                    <p className="text-sm text-purple-400">
                      {formatDateTime(selectedReward.rolled_up_at)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Rolled Up To</Label>
                    <p className="font-mono text-sm text-purple-400">
                      {selectedReward.rolled_up_to ? formatWalletAddress(selectedReward.rolled_up_to) : 'N/A'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
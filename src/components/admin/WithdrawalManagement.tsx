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
  Banknote, 
  DollarSign, 
  TrendingDown, 
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
  AlertTriangle,
  ExternalLink,
  Wallet,
  ArrowUpRight
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

interface WithdrawalRecord {
  id: string;
  user_wallet: string;
  amount: string;
  target_chain_id: number;
  token_address: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  user_signature?: string;
  user_transaction_hash?: string;
  fee_transaction_hash?: string;
  created_at: string;
  completed_at?: string;
  failed_at?: string;
  failure_reason?: string;
  metadata?: any;
}

interface WithdrawalStats {
  totalWithdrawals: number;
  pendingWithdrawals: number;
  completedWithdrawals: number;
  failedWithdrawals: number;
  totalVolume: number;
  pendingVolume: number;
  completedVolume: number;
  averageAmount: number;
}

interface ChainInfo {
  [chainId: number]: {
    name: string;
    symbol: string;
    icon: string;
  };
}

const CHAIN_INFO: ChainInfo = {
  1: { name: 'Ethereum', symbol: 'ETH', icon: '🔷' },
  137: { name: 'Polygon', symbol: 'MATIC', icon: '🟣' },
  42161: { name: 'Arbitrum One', symbol: 'ARB', icon: '🔵' },
  10: { name: 'Optimism', symbol: 'OP', icon: '🔴' },
  56: { name: 'BSC', symbol: 'BNB', icon: '🟡' },
  8453: { name: 'Base', symbol: 'BASE', icon: '🔵' }
};

export const WithdrawalManagement: React.FC = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [stats, setStats] = useState<WithdrawalStats>({
    totalWithdrawals: 0,
    pendingWithdrawals: 0,
    completedWithdrawals: 0,
    failedWithdrawals: 0,
    totalVolume: 0,
    pendingVolume: 0,
    completedVolume: 0,
    averageAmount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRecord | null>(null);
  const [showWithdrawalDetails, setShowWithdrawalDetails] = useState(false);

  useEffect(() => {
    loadWithdrawalData();
  }, []);

  const loadWithdrawalData = async () => {
    try {
      setIsLoading(true);
      
      // Load withdrawal records
      const { data: withdrawalData, error: withdrawalError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (withdrawalError) {
        console.error('Withdrawal error:', withdrawalError);
        throw withdrawalError;
      }

      setWithdrawals(withdrawalData || []);

      // Calculate stats
      const totalWithdrawals = withdrawalData?.length || 0;
      const pendingWithdrawals = withdrawalData?.filter(w => w.status === 'pending' || w.status === 'processing').length || 0;
      const completedWithdrawals = withdrawalData?.filter(w => w.status === 'completed').length || 0;
      const failedWithdrawals = withdrawalData?.filter(w => w.status === 'failed' || w.status === 'cancelled').length || 0;
      
      const totalVolume = withdrawalData?.reduce((sum, w) => sum + parseFloat(w.amount || '0'), 0) || 0;
      const pendingVolume = withdrawalData?.filter(w => w.status === 'pending' || w.status === 'processing').reduce((sum, w) => sum + parseFloat(w.amount || '0'), 0) || 0;
      const completedVolume = withdrawalData?.filter(w => w.status === 'completed').reduce((sum, w) => sum + parseFloat(w.amount || '0'), 0) || 0;
      const averageAmount = totalWithdrawals > 0 ? totalVolume / totalWithdrawals : 0;

      setStats({
        totalWithdrawals,
        pendingWithdrawals,
        completedWithdrawals,
        failedWithdrawals,
        totalVolume,
        pendingVolume,
        completedVolume,
        averageAmount
      });
      
    } catch (error) {
      console.error('Failed to load withdrawal data:', error);
      toast({
        title: "Error Loading.tsx Withdrawals",
        description: "Failed to fetch withdrawal data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWithdrawals = withdrawals.filter(withdrawal => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      withdrawal.user_wallet.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.user_transaction_hash?.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const matchesStatus = filterStatus === 'all' || 
      withdrawal.status === filterStatus ||
      (filterStatus === 'pending' && (withdrawal.status === 'pending' || withdrawal.status === 'processing')) ||
      (filterStatus === 'failed' && (withdrawal.status === 'failed' || withdrawal.status === 'cancelled'));

    return matchesSearch && matchesStatus;
  });

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTxHash = (hash: string) => {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
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
      case 'processing': return 'text-blue-400 border-blue-400/30';
      case 'completed': return 'text-green-400 border-green-400/30';
      case 'failed': return 'text-red-400 border-red-400/30';
      case 'cancelled': return 'text-gray-400 border-gray-400/30';
      default: return 'text-gray-400 border-gray-400/30';
    }
  };

  const getChainInfo = (chainId: number) => {
    return CHAIN_INFO[chainId] || { name: `Chain ${chainId}`, symbol: 'UNK', icon: '❓' };
  };

  const getExplorerUrl = (chainId: number, txHash: string) => {
    const explorers: { [key: number]: string } = {
      1: 'https://etherscan.io/tx/',
      137: 'https://polygonscan.com/tx/',
      42161: 'https://arbiscan.io/tx/',
      10: 'https://optimistic.etherscan.io/tx/',
      56: 'https://bscscan.com/tx/',
      8453: 'https://basescan.org/tx/'
    };
    return explorers[chainId] ? `${explorers[chainId]}${txHash}` : '#';
  };

  const updateWithdrawalStatus = async (withdrawalId: string, newStatus: 'completed' | 'failed', reason?: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (newStatus === 'failed') {
        updateData.failed_at = new Date().toISOString();
        if (reason) updateData.failure_reason = reason;
      }

      const { error } = await supabase
        .from('withdrawal_requests')
        .update(updateData)
        .eq('id', withdrawalId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Withdrawal marked as ${newStatus}`,
      });

      loadWithdrawalData();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const exportWithdrawals = async () => {
    try {
      const csvData = [
        ['ID', 'User Wallet', 'Amount', 'Chain', 'Status', 'Created', 'Completed', 'TX Hash'].join(','),
        ...filteredWithdrawals.map(withdrawal => [
          withdrawal.id,
          withdrawal.user_wallet,
          withdrawal.amount,
          getChainInfo(withdrawal.target_chain_id).name,
          withdrawal.status,
          formatDate(withdrawal.created_at),
          withdrawal.completed_at ? formatDate(withdrawal.completed_at) : '',
          withdrawal.user_transaction_hash || ''
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `withdrawals_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: `Exported ${filteredWithdrawals.length} withdrawals to CSV`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export withdrawal data",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-honey" />
          <p className="text-muted-foreground">Loading withdrawal data...</p>
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
            <Banknote className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-blue-400">{stats.totalWithdrawals.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total Withdrawals</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'} text-center`}>
            <Clock className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-yellow-400">{stats.pendingWithdrawals.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'} text-center`}>
            <CheckCircle className="h-6 w-6 text-green-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-green-400">{stats.completedWithdrawals.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'} text-center`}>
            <DollarSign className="h-6 w-6 text-honey mx-auto mb-2" />
            <div className="text-lg font-bold text-honey">${stats.totalVolume.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Total Volume</div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
        <Card>
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'} text-center`}>
            <TrendingDown className="h-5 w-5 text-purple-400 mx-auto mb-2" />
            <div className="text-md font-bold text-purple-400">${stats.pendingVolume.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Pending Volume</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'} text-center`}>
            <ArrowUpRight className="h-5 w-5 text-green-400 mx-auto mb-2" />
            <div className="text-md font-bold text-green-400">${stats.completedVolume.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Completed Volume</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'} text-center`}>
            <Wallet className="h-5 w-5 text-blue-400 mx-auto mb-2" />
            <div className="text-md font-bold text-blue-400">${stats.averageAmount.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Average Amount</div>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawals Management */}
      <Card>
        <CardHeader className={isMobile ? 'p-4' : ''}>
          <div className={`flex ${isMobile ? 'flex-col gap-4' : 'items-center justify-between'}`}>
            <div>
              <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
                <Banknote className="h-5 w-5 text-honey" />
                Withdrawal Management
              </CardTitle>
              <CardDescription className={isMobile ? 'text-xs' : ''}>Monitor and manage user withdrawals</CardDescription>
            </div>
            <div className={`flex ${isMobile ? 'flex-wrap' : 'items-center'} gap-2`}>
              <Button onClick={exportWithdrawals} variant="outline" size={isMobile ? 'sm' : 'sm'}>
                <Download className="h-4 w-4 mr-2" />
                {isMobile ? 'Export' : 'Export CSV'}
              </Button>
              <Button onClick={loadWithdrawalData} variant="outline" size={isMobile ? 'sm' : 'sm'}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className={`space-y-4 ${isMobile ? 'p-4' : ''}`}>
          {/* Search and Filters */}
          <div className={`flex ${isMobile ? 'flex-col' : 'flex-col md:flex-row'} gap-4`}>
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by wallet, withdrawal ID, or transaction hash..."
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
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Withdrawals Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className={`bg-muted font-medium ${isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-2 text-sm'}`}>
              {filteredWithdrawals.length} withdrawals found
            </div>
            <div className={`divide-y divide-border overflow-y-auto ${isMobile ? 'max-h-[60vh]' : 'max-h-96'}`}>
              {filteredWithdrawals.map((withdrawal) => {
                const chainInfo = getChainInfo(withdrawal.target_chain_id);
                return (
                  <div key={withdrawal.id} className={`hover:bg-muted/30 transition-colors ${isMobile ? 'p-3' : 'p-4'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-honey/20 flex items-center justify-center">
                            <Banknote className="h-5 w-5 text-honey" />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className={`flex items-center gap-2 mb-1 ${isMobile ? 'flex-wrap' : ''}`}>
                            <span className={`font-mono font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
                              {formatWalletAddress(withdrawal.user_wallet)}
                            </span>
                            <Badge className={`bg-honey text-black ${isMobile ? 'text-[10px] px-1.5 py-0.5' : 'text-xs'}`}>
                              ${parseFloat(withdrawal.amount).toFixed(2)}
                            </Badge>
                            <Badge variant="outline" className={`${isMobile ? 'text-[10px] px-1.5 py-0.5' : 'text-xs'} ${getStatusColor(withdrawal.status)}`}>
                              {withdrawal.status}
                            </Badge>
                          </div>

                          <div className={`text-muted-foreground ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                            <span className={`flex items-center gap-1 ${isMobile ? 'mb-1' : 'mr-4 inline-flex'}`}>
                              <span>{chainInfo.icon}</span>
                              <span>{chainInfo.name}</span>
                            </span>
                            {withdrawal.user_transaction_hash && (
                              <span className={isMobile ? 'block mb-1' : 'mr-4'}>TX: {formatTxHash(withdrawal.user_transaction_hash)}</span>
                            )}
                            <span className={isMobile ? 'block' : ''}>{isMobile ? formatDate(withdrawal.created_at).slice(0, -5) : `Created ${formatDate(withdrawal.created_at)}`}</span>
                          </div>
                        </div>
                      </div>


                      <div className="flex items-center gap-2">
                        {withdrawal.user_transaction_hash && !isMobile && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(getExplorerUrl(withdrawal.target_chain_id, withdrawal.user_transaction_hash!), '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className={isMobile ? 'h-5 w-5' : 'h-4 w-4'} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {withdrawal.user_transaction_hash && isMobile && (
                              <>
                                <DropdownMenuItem onClick={() => window.open(getExplorerUrl(withdrawal.target_chain_id, withdrawal.user_transaction_hash!), '_blank')}>
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  View on Explorer
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem onClick={() => {
                              setSelectedWithdrawal(withdrawal);
                              setShowWithdrawalDetails(true);
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {withdrawal.status === 'pending' || withdrawal.status === 'processing' ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => updateWithdrawalStatus(withdrawal.id, 'completed')}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Mark Completed
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => updateWithdrawalStatus(withdrawal.id, 'failed', 'Manually failed by admin')}
                                  className="text-red-600"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Mark Failed
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {filteredWithdrawals.length === 0 && (
                <div className={`text-center text-muted-foreground ${isMobile ? 'p-6' : 'p-8'}`}>
                  <Banknote className={`mx-auto mb-4 opacity-50 ${isMobile ? 'h-10 w-10' : 'h-12 w-12'}`} />
                  <p className={isMobile ? 'text-sm' : ''}>No withdrawals found matching your search criteria</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Details Dialog */}
      <Dialog open={showWithdrawalDetails} onOpenChange={setShowWithdrawalDetails}>
        <DialogContent className={isMobile ? 'max-w-[95vw] max-h-[90vh] overflow-y-auto p-4' : 'max-w-2xl'}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
              <Banknote className={isMobile ? 'h-4 w-4' : 'h-5 w-5'} />
              Withdrawal Details
            </DialogTitle>
            <DialogDescription className={isMobile ? 'text-xs' : ''}>
              Complete withdrawal information and transaction details
            </DialogDescription>
          </DialogHeader>

          {selectedWithdrawal && (
            <div className={isMobile ? 'space-y-3' : 'space-y-4'}>
              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <div>
                  <Label className="text-sm font-medium">Withdrawal ID</Label>
                  <p className="font-mono text-sm bg-muted p-2 rounded break-all">
                    {selectedWithdrawal.id}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="p-2">
                    <Badge variant="outline" className={getStatusColor(selectedWithdrawal.status)}>
                      {selectedWithdrawal.status}
                    </Badge>
                  </div>
                </div>
              </div>


              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <div>
                  <Label className={isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}>User Wallet</Label>
                  <p className={`font-mono bg-muted p-2 rounded break-all ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    {selectedWithdrawal.user_wallet}
                  </p>
                </div>
                <div>
                  <Label className={isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}>Amount</Label>
                  <p className={`font-bold text-honey p-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
                    ${parseFloat(selectedWithdrawal.amount).toFixed(2)} USDT
                  </p>
                </div>
              </div>

              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <div>
                  <Label className={isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}>Target Chain</Label>
                  <div className={`flex items-center gap-2 p-2 ${isMobile ? 'text-xs' : ''}`}>
                    <span>{getChainInfo(selectedWithdrawal.target_chain_id).icon}</span>
                    <span>{getChainInfo(selectedWithdrawal.target_chain_id).name}</span>
                  </div>
                </div>
                <div>
                  <Label className={isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}>Token Address</Label>
                  <p className={`font-mono bg-muted p-2 rounded break-all ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                    {selectedWithdrawal.token_address}
                  </p>
                </div>
              </div>
              
              {selectedWithdrawal.user_transaction_hash && (
                <div>
                  <Label className={isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}>Transaction Hash</Label>
                  <div className={`flex items-center gap-2 ${isMobile ? 'flex-col items-stretch' : ''}`}>
                    <p className={`font-mono bg-muted p-2 rounded break-all flex-1 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                      {selectedWithdrawal.user_transaction_hash}
                    </p>
                    <Button
                      size={isMobile ? 'sm' : 'sm'}
                      variant="outline"
                      className={isMobile ? 'w-full' : ''}
                      onClick={() => window.open(getExplorerUrl(selectedWithdrawal.target_chain_id, selectedWithdrawal.user_transaction_hash!), '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {isMobile ? 'View on Explorer' : ''}
                    </Button>
                  </div>
                </div>
              )}

              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <div>
                  <Label className={isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}>Created At</Label>
                  <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    {formatDateTime(selectedWithdrawal.created_at)}
                  </p>
                </div>
                <div>
                  <Label className={isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}>Completed At</Label>
                  <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    {selectedWithdrawal.completed_at ? formatDateTime(selectedWithdrawal.completed_at) : 'Not completed'}
                  </p>
                </div>
              </div>

              {selectedWithdrawal.failure_reason && (
                <div>
                  <Label className={isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}>Failure Reason</Label>
                  <p className={`text-red-400 bg-red-500/10 p-2 rounded ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    {selectedWithdrawal.failure_reason}
                  </p>
                </div>
              )}

              {selectedWithdrawal.metadata && (
                <div>
                  <Label className={isMobile ? 'text-xs font-medium' : 'text-sm font-medium'}>Metadata</Label>
                  <pre className={`bg-muted p-2 rounded overflow-x-auto ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                    {JSON.stringify(selectedWithdrawal.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
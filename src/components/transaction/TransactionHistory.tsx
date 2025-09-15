import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Search,
  Filter,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  Gift,
  CreditCard,
  Coins,
  TrendingUp,
  Users,
  ExternalLink
} from 'lucide-react';
import { useToast } from '../ui/toast-system';
import { LoadingSpinner } from '../ui/loading-spinner';
import { FadeTransition, StaggeredList } from '../ui/transitions';
import { cn } from '../../lib/utils';
import { transactionService } from '@/lib/supabaseClient';

interface Transaction {
  id: string;
  type: 'nft_purchase' | 'reward_claim' | 'bcc_transfer' | 'usdt_withdrawal' | 'referral_bonus' | 'level_unlock';
  category: 'debit' | 'credit';
  amount: number;
  currency: 'BCC' | 'USDT' | 'USDC' | 'ETH';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  title: string;
  description: string;
  created_at: string;
  completed_at?: string;
  transaction_hash?: string;
  from_address?: string;
  to_address?: string;
  network?: string;
  metadata?: Record<string, any>;
}

interface TransactionHistoryProps {
  walletAddress: string;
  className?: string;
}

interface TransactionStats {
  totalSpent: number;
  totalRewards: number;
  totalTransactions: number;
  netEarnings: number;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  walletAddress,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats>({
    totalSpent: 0,
    totalRewards: 0,
    totalTransactions: 0,
    netEarnings: 0
  });
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  // Load transaction data
  useEffect(() => {
    const loadTransactions = async () => {
      if (!walletAddress) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Load transaction history
        const { data: transactionData, error: transactionError, partialData } = await transactionService.getTransactionHistory(walletAddress);
        
        setTransactions(transactionData || []);
        
        // Show warning for partial data but don't fail completely
        if (transactionError && partialData) {
          toast({
            title: 'Partial data loaded',
            description: 'Some transaction data could not be loaded, but showing available transactions.',
            variant: 'warning'
          });
        } else if (transactionError && !partialData) {
          throw new Error(transactionError.message || 'Failed to load transactions');
        }
        
        // Load transaction statistics - make it non-blocking
        try {
          const statsData = await transactionService.getTransactionStats(walletAddress);
          setStats(statsData);
        } catch (statsError: any) {
          console.error('Error loading stats:', statsError);
          // Keep default stats on error, don't fail the whole component
          toast({
            title: 'Statistics unavailable',
            description: 'Transaction statistics could not be loaded.',
            variant: 'warning'
          });
        }
        
      } catch (error: any) {
        console.error('Error loading transactions:', error);
        setError(error.message || 'Failed to load transaction data');
        toast({
          title: 'Error',
          description: 'Failed to load transaction history',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadTransactions();
  }, [walletAddress, toast]);

  const filteredTransactions = useMemo(() => {
    // Create a copy to avoid mutating state
    let filtered = [...transactions];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(tx =>
        tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.transaction_hash?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedFilter !== 'all') {
      if (selectedFilter === 'income') {
        filtered = filtered.filter(tx => tx.category === 'credit');
      } else if (selectedFilter === 'expenses') {
        filtered = filtered.filter(tx => tx.category === 'debit');
      } else {
        filtered = filtered.filter(tx => tx.type === selectedFilter);
      }
    }

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [transactions, searchQuery, selectedFilter]);

  const getTransactionIcon = (type: string, category: string) => {
    switch (type) {
      case 'nft_purchase':
        return <CreditCard className="h-5 w-5" />;
      case 'reward_claim':
        return <Gift className="h-5 w-5" />;
      case 'bcc_transfer':
        return category === 'credit' ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />;
      case 'usdt_withdrawal':
        return <ArrowUpRight className="h-5 w-5" />;
      case 'referral_bonus':
        return <Users className="h-5 w-5" />;
      case 'level_unlock':
        return <TrendingUp className="h-5 w-5" />;
      default:
        return <Coins className="h-5 w-5" />;
    }
  };

  const getTransactionColor = (type: string, category: string) => {
    if (category === 'credit') {
      return 'text-green-600 dark:text-green-400';
    } else {
      return 'text-red-600 dark:text-red-400';
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: { variant: 'default' as const, color: 'text-green-600', icon: <CheckCircle className="h-3 w-3" /> },
      pending: { variant: 'secondary' as const, color: 'text-yellow-600', icon: <Clock className="h-3 w-3" /> },
      failed: { variant: 'destructive' as const, color: 'text-red-600', icon: <AlertCircle className="h-3 w-3" /> },
      cancelled: { variant: 'outline' as const, color: 'text-muted-foreground', icon: <AlertCircle className="h-3 w-3" /> }
    };

    const config = variants[status as keyof typeof variants] || variants.pending;

    return (
      <Badge variant={config.variant} className="flex items-center space-x-1">
        {config.icon}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  const formatAmount = (amount: number, currency: string, category: string) => {
    const sign = category === 'credit' ? '+' : '-';
    return `${sign}${amount.toLocaleString()} ${currency}`;
  };

  const exportTransactions = () => {
    // In a real implementation, this would generate and download a CSV/PDF
    toast.info('Export Started', 'Your transaction history is being prepared for download.');
  };

  const renderTransaction = (transaction: Transaction, index: number) => (
    <div
      key={transaction.id}
      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center space-x-4">
        <div className={cn(
          'p-2 rounded-full',
          transaction.category === 'credit' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'
        )}>
          <div className={getTransactionColor(transaction.type, transaction.category)}>
            {getTransactionIcon(transaction.type, transaction.category)}
          </div>
        </div>

        <div className="space-y-1">
          <div className="font-medium">{transaction.title}</div>
          <div className="text-sm text-muted-foreground">
            {transaction.description}
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(transaction.created_at).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="text-right space-y-2">
        <div className={cn('font-semibold', getTransactionColor(transaction.type, transaction.category))}>
          {formatAmount(transaction.amount, transaction.currency, transaction.category)}
        </div>
        {getStatusBadge(transaction.status)}
        {transaction.transaction_hash && (
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
            <ExternalLink className="h-3 w-3 mr-1" />
            View
          </Button>
        )}
      </div>
    </div>
  );

  const transactionStats = useMemo(() => {
    const completed = filteredTransactions.filter(tx => tx.status === 'completed');
    const totalIncome = completed.filter(tx => tx.category === 'credit').reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpenses = completed.filter(tx => tx.category === 'debit').reduce((sum, tx) => sum + tx.amount, 0);
    const pendingCount = filteredTransactions.filter(tx => tx.status === 'pending').length;

    return { totalIncome, totalExpenses, pendingCount, totalTransactions: filteredTransactions.length };
  }, [filteredTransactions]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-honey" />
          <span>Transaction History</span>
        </CardTitle>
        <CardDescription>
          Complete history of your platform transactions and activities
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <LoadingSpinner size="large" />
            <div className="text-sm text-muted-foreground mt-2">Loading transaction history...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <div className="text-red-400 mb-2">⚠️ Error loading transactions</div>
            <div className="text-xs text-muted-foreground">{error}</div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Transaction Stats */}
        {!isLoading && !error && (
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              ${stats.totalRewards.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Total Rewards</div>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-lg font-bold text-red-600 dark:text-red-400">
              ${stats.totalSpent.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Total Spent</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className={`text-lg font-bold ${stats.netEarnings >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              ${stats.netEarnings.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Net Earnings</div>
          </div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {stats.totalTransactions}
            </div>
            <div className="text-xs text-muted-foreground">Total Transactions</div>
          </div>
        </div>
        )}

        {/* Search and Filter */}
        {!isLoading && !error && (
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="all">All Transactions</option>
            <option value="income">Income</option>
            <option value="expenses">Expenses</option>
            <option value="nft_purchase">NFT Purchases</option>
            <option value="reward_claim">Reward Claims</option>
            <option value="bcc_transfer">BCC Transfers</option>
            <option value="usdt_withdrawal">USDT Withdrawals</option>
          </select>
          <Button size="sm" variant="outline" onClick={exportTransactions}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
        )}

        {/* Transaction List */}
        <div className="space-y-3">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions found</p>
              <p className="text-sm">Your transaction history will appear here</p>
            </div>
          ) : (
            <StaggeredList show={true} staggerDelay={50}>
              {filteredTransactions.map((transaction, index) => 
                renderTransaction(transaction, index)
              )}
            </StaggeredList>
          )}
        </div>

        {/* Load More */}
        {filteredTransactions.length > 0 && (
          <div className="text-center">
            <Button variant="outline">
              Load More Transactions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionHistory;
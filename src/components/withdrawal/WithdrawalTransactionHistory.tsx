import React from 'react';
import {useQuery} from '@tanstack/react-query';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {useToast} from '@/hooks/use-toast';
import {useI18n} from '@/contexts/I18nContext';
import {AlertCircle, ArrowLeft, CheckCircle, Clock, Copy, ExternalLink, RefreshCw, XCircle} from 'lucide-react';
import {useIsMobile} from '@/hooks/use-mobile';

interface WithdrawalTransaction {
  id: string;
  amount: number;
  target_chain_id: number;
  target_token_symbol: string;
  user_transaction_hash: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  metadata?: {
    net_amount?: number;
    fee_amount?: number;
    target_token?: {
      symbol: string;
      name: string;
    };
    is_cross_chain?: boolean;
    processing_method?: string;
    estimated_completion_minutes?: number;
    thirdweb_swap_queue_id?: string;
    thirdweb_send_queue_id?: string;
    swap_transaction_hash?: string;
    send_transaction_hash?: string;
    webhook_event?: string;
    processed_at?: string;
    message?: string;
  };
}

interface WithdrawalTransactionHistoryProps {
  walletAddress: string;
  onBack: () => void;
}

// Chain name mapping
const CHAIN_NAMES: { [key: number]: { name: string; explorer: string; icon: string } } = {
  1: { name: 'Ethereum', explorer: 'https://etherscan.io/tx/', icon: '🔷' },
  137: { name: 'Polygon', explorer: 'https://polygonscan.com/tx/', icon: '🟣' },
  42161: { name: 'Arbitrum', explorer: 'https://arbiscan.io/tx/', icon: '🔵' },
  10: { name: 'Optimism', explorer: 'https://optimistic.etherscan.io/tx/', icon: '🔴' },
  56: { name: 'BSC', explorer: 'https://bscscan.com/tx/', icon: '🟡' },
  8453: { name: 'Base', explorer: 'https://basescan.org/tx/', icon: '🔵' }
};

export default function WithdrawalTransactionHistory({ walletAddress, onBack }: WithdrawalTransactionHistoryProps) {
  const { toast } = useToast();
  const { t } = useI18n();
  const isMobile = useIsMobile();

  // Fetch withdrawal transactions
  const { data: transactions, isLoading, refetch } = useQuery<WithdrawalTransaction[]>({
    queryKey: ['withdrawal-transactions', walletAddress],
    enabled: !!walletAddress,
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
    queryFn: async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/withdrawal-history`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'get-withdrawal-history',
          walletAddress: walletAddress
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch withdrawal transactions');
      }
      
      const result = await response.json();
      return result.transactions || [];
    },
  });

  // Copy transaction hash to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: t('common.address_copied'),
        description: `${text.slice(0, 8)}...${text.slice(-6)}`,
      });
    });
  };

  // Get status icon and color
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: 'text-yellow-500', bgColor: 'bg-yellow-50', label: t('common.pending') };
      case 'processing':
        return { icon: AlertCircle, color: 'text-blue-500', bgColor: 'bg-blue-50', label: t('withdrawal.processing') };
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-50', label: t('common.success') };
      case 'failed':
        return { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-50', label: t('common.failed_status') };
      default:
        return { icon: Clock, color: 'text-gray-500', bgColor: 'bg-gray-50', label: status };
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Get transaction hash to display (prioritize send over swap)
  const getDisplayHash = (transaction: WithdrawalTransaction) => {
    return transaction.metadata?.send_transaction_hash || 
           transaction.user_transaction_hash || 
           transaction.metadata?.swap_transaction_hash;
  };

  return (
    <Card className="bg-gradient-to-br from-white via-slate-50 to-gray-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-xl">
      <CardHeader className={`${isMobile ? 'p-4 pb-2' : 'p-6 pb-4'}`}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-slate-900 dark:text-slate-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="text-lg font-bold">{t('withdrawal.transaction_history')}</div>
              <div className="text-sm font-normal text-slate-600 dark:text-slate-400">
                {t('withdrawal.track_withdrawal_status')}
              </div>
            </div>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className={`space-y-4 ${isMobile ? 'p-4 pt-2' : 'p-6 pt-4'}`}>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto mb-2"></div>
            <p className="text-slate-600 dark:text-slate-400">{t('common.loading')}</p>
          </div>
        ) : !transactions || transactions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-slate-400 mb-2">
              <Clock className="h-8 w-8 mx-auto" />
            </div>
            <p className="text-slate-600 dark:text-slate-400">{t('withdrawal.no_transactions')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => {
              const statusConfig = getStatusConfig(transaction.status);
              const StatusIcon = statusConfig.icon;
              const chainInfo = CHAIN_NAMES[transaction.target_chain_id];
              const displayHash = getDisplayHash(transaction);

              return (
                <Card key={transaction.id} className="border border-slate-200 dark:border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${statusConfig.bgColor}`}>
                          <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {transaction.amount} USDT → {transaction.metadata?.net_amount || (transaction.amount - 2)} {transaction.target_token_symbol}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            {chainInfo?.icon} {chainInfo?.name || `Chain ${transaction.target_chain_id}`}
                            {transaction.metadata?.is_cross_chain && ' • Cross-chain'}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className={statusConfig.color}>
                        {statusConfig.label}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">{t('withdrawal.created_at')}:</span>
                        <span>{formatDate(transaction.created_at)}</span>
                      </div>
                      
                      {transaction.completed_at && (
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">{t('withdrawal.completed_at')}:</span>
                          <span>{formatDate(transaction.completed_at)}</span>
                        </div>
                      )}

                      {transaction.metadata?.fee_amount && (
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">{t('withdrawal.network_fee')}:</span>
                          <span>{transaction.metadata.fee_amount} USDT</span>
                        </div>
                      )}

                      {displayHash && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400">{t('common.transaction_hash')}:</span>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                              {displayHash.slice(0, 8)}...{displayHash.slice(-6)}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(displayHash)}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            {chainInfo && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`${chainInfo.explorer}${displayHash}`, '_blank')}
                                className="h-6 w-6 p-0"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {transaction.metadata?.message && (
                        <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs">
                          {transaction.metadata.message}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
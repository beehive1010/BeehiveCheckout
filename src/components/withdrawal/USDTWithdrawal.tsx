import {useState} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useToast} from '@/hooks/use-toast';
import {useActiveAccount, useActiveWalletChain} from 'thirdweb/react';
import {useWallet} from '@/hooks/useWallet';
import {useIsMobile} from '@/hooks/use-mobile';
import {ArrowRight, Coins, Loader2, RefreshCw, Zap} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {useI18n} from '@/contexts/I18nContext';

interface USDTBalance {
  balance: number;
  balanceUSD: string;
  lastUpdated: string;
  error?: string;
}

// Supported chains for withdrawal
const SUPPORTED_CHAINS = {
  42161: { name: 'Arbitrum', symbol: 'ARB', icon: '🔵', fee: 2.0, native: true },
  1: { name: 'Ethereum', symbol: 'ETH', icon: '🔷', fee: 15.0, native: false },
  137: { name: 'Polygon', symbol: 'MATIC', icon: '🟣', fee: 1.0, native: false },
  10: { name: 'Optimism', symbol: 'OP', icon: '🔴', fee: 1.5, native: false },
  56: { name: 'BSC', symbol: 'BNB', icon: '🟡', fee: 1.0, native: false },
  8453: { name: 'Base', symbol: 'BASE', icon: '🔵', fee: 1.5, native: false }
};

export default function USDTWithdrawal() {
  const { toast } = useToast();
  const { t } = useI18n();
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const { userData } = useWallet();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  const memberWalletAddress = userData?.wallet_address || account?.address;
  const currentChainId = activeChain?.id || 42161; // Default to Arbitrum
  const currentChain = SUPPORTED_CHAINS[currentChainId as keyof typeof SUPPORTED_CHAINS];
  
  const [amount, setAmount] = useState('');
  const [targetChain, setTargetChain] = useState(currentChainId.toString());
  const [selectedToken, setSelectedToken] = useState('USDT'); // 添加目标代币选择
  const [isProcessing, setIsProcessing] = useState(false);

  // Get reward balance
  const { data: balance, isLoading: balanceLoading, refetch } = useQuery<USDTBalance>({
    queryKey: ['user-balance', memberWalletAddress],
    enabled: !!memberWalletAddress,
    queryFn: async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/balance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
          'Content-Type': 'application/json',
          'x-wallet-address': memberWalletAddress!,
        },
        body: JSON.stringify({ action: 'get-balance' }),
      });
      
      if (!response.ok) throw new Error('Failed to fetch balance');
      
      const result = await response.json();
      const balanceAmount = result.balance?.reward_balance || 0;
      
      return {
        balance: Math.round(balanceAmount * 100),
        balanceUSD: balanceAmount.toFixed(2),
        lastUpdated: new Date().toISOString()
      };
    },
  });

  // Withdrawal mutation with real backend call
  const withdrawalMutation = useMutation({
    mutationFn: async (data: { amount: number; chainId: number }) => {
      setIsProcessing(true);
      
      const targetChainInfo = SUPPORTED_CHAINS[data.chainId as keyof typeof SUPPORTED_CHAINS];
      if (!targetChainInfo) throw new Error('Unsupported chain selected');
      
      const fee = targetChainInfo.fee;
      const netAmount = data.amount - fee;
      
      if (netAmount <= 0) {
        throw new Error(`Amount too small. Minimum: ${(fee + 0.01).toFixed(2)} USDT (includes ${fee} USDT fee)`);
      }

      if (!memberWalletAddress) {
        throw new Error('Wallet address not found');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !anonKey) {
        throw new Error('Missing Supabase configuration');
      }

      console.log(`🚀 Starting withdrawal: ${netAmount} USDT to ${targetChainInfo.name} (fee: ${fee} USDT)`);

      // Call withdrawal API endpoint (backend handles thirdweb credentials securely)
      const response = await fetch(`${supabaseUrl}/functions/v1/withdrawal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
          'Content-Type': 'application/json',
          'x-wallet-address': memberWalletAddress,
        },
        body: JSON.stringify({
          action: 'process-withdrawal',
          amount: data.amount,
          recipientAddress: memberWalletAddress,
          targetChainId: data.chainId,
          targetTokenSymbol: selectedToken || 'USDT', // 从UI获取目标代币
          memberWallet: memberWalletAddress,
          sourceChainId: 42161, // Arbitrum One (where our USDT is held)
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Withdrawal API error:', errorText);
        throw new Error(`Withdrawal failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Withdrawal API result:', result);

      if (!result.success) {
        throw new Error(result.error || 'Withdrawal failed');
      }

      return {
        success: true,
        transactionHash: result.transaction_hash || result.send_queue_id,
        netAmount: result.net_amount,
        fee: result.fee_amount,
        chain: result.target_token?.symbol || targetChainInfo.name,
        isCrossChain: result.is_cross_chain,
        withdrawalId: result.withdrawal_id,
        processingMethod: result.processing_method,
        estimatedMinutes: result.estimated_completion_minutes,
        message: result.message
      };
    },
    onSuccess: (data) => {
      toast({
        title: data.isCrossChain
          ? t('withdrawal.crossChainProcessing')
          : t('withdrawal.processing'),
        description: data.message || t('withdrawal.estimatedArrival', {
          amount: data.netAmount,
          chain: data.chain,
          minutes: data.estimatedMinutes
        }),
      });
      
      setAmount('');
      setIsProcessing(false);
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
    },
    onError: (error: any) => {
      toast({
        title: t('withdrawal.withdrawal_failed'),
        description: error.message,
        variant: 'destructive',
      });
      setIsProcessing(false);
    },
  });

  const handleWithdraw = () => {
    const withdrawAmount = parseFloat(amount);
    
    if (!amount || withdrawAmount <= 0) {
      toast({
        title: t('withdrawal.invalid_amount'),
        description: t('withdrawal.enter_valid_amount'),
        variant: 'destructive',
      });
      return;
    }

    if (!memberWalletAddress) {
      toast({
        title: t('withdrawal.wallet_required'),
        description: t('withdrawal.connect_wallet'),
        variant: 'destructive',
      });
      return;
    }

    if (!balance || withdrawAmount > parseFloat(balance.balanceUSD)) {
      toast({
        title: t('withdrawal.insufficient_balance'),
        description: t('withdrawal.available_balance_is', { amount: balance?.balanceUSD || '0' }),
        variant: 'destructive',
      });
      return;
    }

    withdrawalMutation.mutate({
      amount: withdrawAmount,
      chainId: parseInt(targetChain)
    });
  };

  const targetChainInfo = SUPPORTED_CHAINS[parseInt(targetChain) as keyof typeof SUPPORTED_CHAINS];
  const fee = targetChainInfo?.fee || 2.0;
  const netAmount = parseFloat(amount || '0') - fee;

  return (
    <Card className="bg-gradient-to-br from-white via-slate-50 to-gray-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-xl">
      <CardHeader className={`${isMobile ? 'p-4 pb-2' : 'p-6 pb-4'}`}>
        <CardTitle className="flex items-center gap-3 text-slate-900 dark:text-slate-100">
          <div className="w-10 h-10 bg-gradient-to-br from-honey/60 to-amber-400 rounded-xl flex items-center justify-center">
            <Coins className="h-5 w-5 text-black" />
          </div>
          <div>
            <div className="text-lg font-bold">{t('withdrawal.title')}</div>
            <div className="text-sm font-normal text-slate-600 dark:text-slate-400">
              {t('withdrawal.subtitle')}
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className={`space-y-4 ${isMobile ? 'p-4 pt-2' : 'p-6 pt-4'}`}>
        {/* Reward Balance - Centered on Mobile */}
        <div className={`${isMobile ? 'text-center' : 'flex items-center justify-between'} bg-gradient-to-r from-honey/10 via-amber-50 to-honey/10 dark:from-honey/10 dark:via-slate-800 dark:to-honey/10 p-4 rounded-xl border border-honey/20`}>
          <div className={isMobile ? 'space-y-1' : ''}>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('withdrawal.available_balance')}
            </div>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span className="text-2xl font-bold text-honey">
                ${balanceLoading ? '---' : balance?.balanceUSD || '0.00'}
              </span>
              <span className="text-sm text-slate-500">USDT</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                disabled={balanceLoading}
                className="h-8 w-8 p-0"
                data-testid="button-refresh-balance"
              >
                <RefreshCw className={`h-4 w-4 ${balanceLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Wallet Address - Centered on Mobile */}
        {memberWalletAddress && (
          <div className={`${isMobile ? 'text-center' : ''} text-sm text-slate-600 dark:text-slate-400`}>
            <span className="font-medium">{t('withdrawal.wallet')}: </span>
            <span className="font-mono">
              {`${memberWalletAddress.slice(0, 6)}...${memberWalletAddress.slice(-4)}`}
            </span>
          </div>
        )}

        {/* Multi-chain Info */}
        <Alert className="border-honey/30 bg-honey/5">
          <Zap className="h-4 w-4 text-honey" />
          <AlertDescription className="text-sm">
            <strong>{t('withdrawal.multi_chain_support')}:</strong> {t('withdrawal.multi_chain_description')}
          </AlertDescription>
        </Alert>

        {/* Chain Selection */}
        <div className="space-y-2">
          <Label htmlFor="target-chain" className="text-sm font-medium">
            {t('withdrawal.withdrawal_chain')}
          </Label>
          <Select value={targetChain} onValueChange={setTargetChain}>
            <SelectTrigger data-testid="select-chain">
              <SelectValue placeholder={t('withdrawal.select_target_chain')} />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SUPPORTED_CHAINS).map(([chainId, info]) => (
                <SelectItem key={chainId} value={chainId}>
                  <div className="flex items-center gap-2">
                    <span>{info.icon}</span>
                    <span>{info.name}</span>
                    <Badge variant="outline" className="ml-auto">
                      {info.fee} USDT fee
                    </Badge>
                    {info.native && (
                      <Badge className="bg-honey text-black">Native</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Token Selection - 根据选择的链动态显示可用代币 */}
        <div className="space-y-2">
          <Label htmlFor="target-token" className="text-sm font-medium">
            {t('withdrawal.target_token')}
          </Label>
          <Select value={selectedToken} onValueChange={setSelectedToken}>
            <SelectTrigger data-testid="select-token">
              <SelectValue placeholder={t('withdrawal.select_target_token')} />
            </SelectTrigger>
            <SelectContent>
              {/* 始终支持 USDT */}
              <SelectItem value="USDT">
                <div className="flex items-center gap-2">
                  <span>💰</span>
                  <span>USDT</span>
                  <Badge variant="outline">Stablecoin</Badge>
                </div>
              </SelectItem>
              
              {/* 根据选择的链显示原生代币 */}
              {targetChainInfo?.native && (
                <SelectItem value={targetChainInfo.symbol}>
                  <div className="flex items-center gap-2">
                    <span>{targetChainInfo.icon}</span>
                    <span>{targetChainInfo.symbol}</span>
                    <Badge className="bg-honey text-black">Native Token</Badge>
                    {parseInt(targetChain) !== 42161 && (
                      <Badge variant="outline" className="text-xs">Cross-chain</Badge>
                    )}
                  </div>
                </SelectItem>
              )}

              {/* USDC 支持 */}
              {[1, 137, 42161, 10, 8453].includes(parseInt(targetChain)) && (
                <SelectItem value="USDC">
                  <div className="flex items-center gap-2">
                    <span>🔵</span>
                    <span>USDC</span>
                    <Badge variant="outline">Stablecoin</Badge>
                  </div>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          
          {/* 代币切换提示 */}
          {selectedToken !== 'USDT' && (
            <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg">
              <Zap className="h-3 w-3 inline mr-1" />
              Cross-chain conversion: USDT → {selectedToken} on {targetChainInfo?.name}
            </div>
          )}
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-sm font-medium">
            {t('withdrawal.withdrawal_amount')} (USDT)
          </Label>
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t('withdrawal.enter_amount')}
            min="0"
            step="0.01"
            className="text-lg"
            data-testid="input-amount"
          />
          {amount && (
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>{t('withdrawal.amount')}:</span>
                <span>{parseFloat(amount).toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between">
                <span>{t('withdrawal.network_fee')}:</span>
                <span>-{fee.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>{t('withdrawal.you_receive')}:</span>
                <span className={netAmount > 0 ? 'text-green-600' : 'text-red-500'}>
                  {Math.max(0, netAmount).toFixed(2)} USDT
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Withdrawal Button */}
        <Button
          onClick={handleWithdraw}
          disabled={!amount || parseFloat(amount) <= 0 || isProcessing || !memberWalletAddress}
          className="w-full h-12 bg-gradient-to-r from-honey to-amber-400 hover:from-honey/90 hover:to-amber-400/90 text-black font-semibold"
          data-testid="button-withdraw"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('withdrawal.processing')}
            </>
          ) : (
            <>
              {t('withdrawal.withdraw_to')} {targetChainInfo?.name || t('withdrawal.selected_chain')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        {/* Cross-chain Note */}
        {parseInt(targetChain) !== 42161 && (
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <Zap className="h-3 w-3 inline mr-1" />
            {t('withdrawal.cross_chain_note', { targetChain: targetChainInfo?.name })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
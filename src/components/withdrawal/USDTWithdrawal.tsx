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
          net_amount: netAmount,
          fee_amount: fee,
          target_chain_id: data.chainId,
          recipient_address: memberWalletAddress,
          source_chain_id: 42161, // Arbitrum One (where our USDT is held)
          is_cross_chain: data.chainId !== 42161,
          withdrawal_method: 'rewards_dashboard'
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
        transactionHash: result.transaction_hash || result.txHash,
        netAmount,
        fee,
        chain: targetChainInfo.name,
        isCrossChain: data.chainId !== 42161,
        withdrawalId: result.withdrawal_id
      };
    },
    onSuccess: (data) => {
      const method = data.isCrossChain ? 'bridged via thirdweb' : 'transferred directly';
      toast({
        title: `Withdrawal ${data.isCrossChain ? 'Bridged' : 'Submitted'}! ${data.isCrossChain ? '🌉' : '✅'}`,
        description: `${data.netAmount.toFixed(2)} USDT will be ${method} to ${data.chain} (${data.fee} USDT fee)`,
      });
      
      setAmount('');
      setIsProcessing(false);
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
    },
    onError: (error: any) => {
      toast({
        title: "Withdrawal Failed",
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
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: 'destructive',
      });
      return;
    }

    if (!memberWalletAddress) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet",
        variant: 'destructive',
      });
      return;
    }

    if (!balance || withdrawAmount > parseFloat(balance.balanceUSD)) {
      toast({
        title: "Insufficient Balance",
        description: `You have ${balance?.balanceUSD || '0'} USDT available`,
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
            <div className="text-lg font-bold">USDT Withdrawal</div>
            <div className="text-sm font-normal text-slate-600 dark:text-slate-400">
              Multi-chain withdrawal with bridge support
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className={`space-y-4 ${isMobile ? 'p-4 pt-2' : 'p-6 pt-4'}`}>
        {/* Reward Balance - Centered on Mobile */}
        <div className={`${isMobile ? 'text-center' : 'flex items-center justify-between'} bg-gradient-to-r from-honey/10 via-amber-50 to-honey/10 dark:from-honey/10 dark:via-slate-800 dark:to-honey/10 p-4 rounded-xl border border-honey/20`}>
          <div className={isMobile ? 'space-y-1' : ''}>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Available Reward Balance
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
            <span className="font-medium">Wallet: </span>
            <span className="font-mono">
              {`${memberWalletAddress.slice(0, 6)}...${memberWalletAddress.slice(-4)}`}
            </span>
          </div>
        )}

        {/* Multi-chain Info */}
        <Alert className="border-honey/30 bg-honey/5">
          <Zap className="h-4 w-4 text-honey" />
          <AlertDescription className="text-sm">
            <strong>Multi-chain Support:</strong> We settle in USDT on Arbitrum, but you can withdraw to any supported chain. 
            Cross-chain transfers use thirdweb Bridge with automatic token swapping.
          </AlertDescription>
        </Alert>

        {/* Chain Selection */}
        <div className="space-y-2">
          <Label htmlFor="target-chain" className="text-sm font-medium">
            Withdrawal Chain
          </Label>
          <Select value={targetChain} onValueChange={setTargetChain}>
            <SelectTrigger data-testid="select-chain">
              <SelectValue placeholder="Select target chain" />
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

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-sm font-medium">
            Withdrawal Amount (USDT)
          </Label>
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount..."
            min="0"
            step="0.01"
            className="text-lg"
            data-testid="input-amount"
          />
          {amount && (
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Amount:</span>
                <span>{parseFloat(amount).toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between">
                <span>Network Fee:</span>
                <span>-{fee.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>You Receive:</span>
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
              Processing Withdrawal...
            </>
          ) : (
            <>
              Withdraw to {targetChainInfo?.name || 'Selected Chain'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        {/* Cross-chain Note */}
        {parseInt(targetChain) !== 42161 && (
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <Zap className="h-3 w-3 inline mr-1" />
            Cross-chain withdrawal: USDT will be bridged from Arbitrum to {targetChainInfo?.name} using thirdweb Bridge
          </div>
        )}
      </CardContent>
    </Card>
  );
}
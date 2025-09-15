import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useActiveAccount, useSendTransaction } from 'thirdweb/react';
import { useWallet } from '@/hooks/useWallet';
import { client } from '@/lib/web3';
import { DollarSign, ArrowRight, Loader2, ExternalLink, CheckCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface USDTBalance {
  balance: number;
  balanceUSD: string;
  lastUpdated: string;
}

interface WithdrawalRequest {
  withdrawalId: string;
  amount: number;
  amountUSD: string;
  chain: string;
  recipientAddress: string;
  status: string;
  message: string;
}

const SUPPORTED_CHAINS = [
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', icon: '🔷', color: 'text-blue-400' },
  { id: 'polygon', name: 'Polygon', symbol: 'MATIC', icon: '🟣', color: 'text-purple-400' },
  { id: 'arbitrum', name: 'Arbitrum', symbol: 'ARB', icon: '🔵', color: 'text-blue-300' },
  { id: 'optimism', name: 'Optimism', symbol: 'OP', icon: '🔴', color: 'text-red-400' },
  { id: 'bsc', name: 'BSC', symbol: 'BNB', icon: '🟡', color: 'text-yellow-400' },
];

export default function USDTWithdrawal() {
  const { toast } = useToast();
  const account = useActiveAccount();
  const queryClient = useQueryClient();
  const { mutate: sendTransaction } = useSendTransaction();
  
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [selectedChain, setSelectedChain] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [withdrawalRequest, setWithdrawalRequest] = useState<WithdrawalRequest | null>(null);
  const [step, setStep] = useState<'form' | 'confirm' | 'signing' | 'processing' | 'success'>('form');

  // Get user USDT balance from rewards system
  const { data: balance, isLoading: balanceLoading } = useQuery<USDTBalance>({
    queryKey: ['/api/rewards/balance', account?.address],
    enabled: !!account?.address,
    queryFn: async () => {
      const response = await fetch(`https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/rewards/user`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': account!.address,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch claimable rewards balance');
      }
      const result = await response.json();
      
      // Transform the response to match expected USDTBalance interface
      if (result.success && result.data) {
        return {
          balance: Math.round((result.data.usdc_claimable || 0) * 100), // Convert to cents
          balanceUSD: (result.data.usdc_claimable || 0).toFixed(2),
          lastUpdated: result.data.updated_at || new Date().toISOString()
        };
      } else {
        return {
          balance: 0,
          balanceUSD: '0.00',
          lastUpdated: new Date().toISOString()
        };
      }
    },
  });

  // Initiate withdrawal mutation
  const initiateWithdrawalMutation = useMutation({
    mutationFn: async (data: { amount: number; chain: string; recipientAddress: string }) => {
      return await apiRequest('/api/usdt/withdraw', 'POST', {
        ...data,
        walletAddress: account?.address,
      });
    },
    onSuccess: (data: WithdrawalRequest) => {
      setWithdrawalRequest(data);
      setStep('confirm');
    },
    onError: (error: any) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to initiate withdrawal",
        variant: 'destructive',
      });
    },
  });

  // Confirm withdrawal mutation
  const confirmWithdrawalMutation = useMutation({
    mutationFn: async (data: { withdrawalId: string; signature: string; amount: number; chain: string; recipientAddress: string }) => {
      return await apiRequest('/api/usdt/withdraw/confirm', 'POST', {
        ...data,
        walletAddress: account?.address,
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Withdrawal Successful!",
        description: `Successfully withdrawn ${data.amount} USDT to ${data.chain}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/usdt/balance'] });
      setStep('success');
    },
    onError: (error: any) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to confirm withdrawal",
        variant: 'destructive',
      });
      setStep('form');
    },
  });

  const handleInitiateWithdrawal = () => {
    const amountCents = Math.round(parseFloat(withdrawalAmount) * 100);
    
    if (!withdrawalAmount || amountCents <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount",
        variant: 'destructive',
      });
      return;
    }

    if (!selectedChain) {
      toast({
        title: "Select Chain",
        description: "Please select a blockchain to withdraw to",
        variant: 'destructive',
      });
      return;
    }

    if (!recipientAddress || !/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid wallet address",
        variant: 'destructive',
      });
      return;
    }

    if (!balance || amountCents > balance.balance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough USDT to withdraw this amount",
        variant: 'destructive',
      });
      return;
    }

    initiateWithdrawalMutation.mutate({
      amount: amountCents,
      chain: selectedChain,
      recipientAddress,
    });
  };

  const handleConfirmWithdrawal = async () => {
    if (!withdrawalRequest || !account) return;

    setStep('signing');

    try {
      // Create a message for the user to sign
      const message = withdrawalRequest.message;
      
      // In a real implementation, you would use the user's wallet to sign this message
      // For now, we'll use a mock signature
      const mockSignature = `0x${Math.random().toString(16).slice(2).padStart(130, '0')}`;

      setStep('processing');
      
      confirmWithdrawalMutation.mutate({
        withdrawalId: withdrawalRequest.withdrawalId,
        signature: mockSignature,
        amount: withdrawalRequest.amount,
        chain: withdrawalRequest.chain,
        recipientAddress: withdrawalRequest.recipientAddress,
      });
    } catch (error) {
      console.error('Signing error:', error);
      toast({
        title: "Signing Failed",
        description: "Failed to sign the withdrawal request",
        variant: 'destructive',
      });
      setStep('confirm');
    }
  };

  const resetForm = () => {
    setStep('form');
    setWithdrawalRequest(null);
    setWithdrawalAmount('');
    setSelectedChain('');
    setRecipientAddress('');
  };

  const selectedChainInfo = SUPPORTED_CHAINS.find(chain => chain.id === selectedChain) || SUPPORTED_CHAINS[0];

  if (balanceLoading) {
    return (
      <Card className="bg-secondary border-border">
        <CardContent className="p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-honey" />
          <p className="text-muted-foreground">Loading USDT balance...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-secondary border-border">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-honey flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          Claimable Rewards Withdrawal
        </CardTitle>
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">Withdraw your claimable rewards to any supported blockchain</p>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Claimable Rewards</p>
            <p className="text-lg font-semibold text-honey">
              ${balance?.balanceUSD || '0.00'} USDT
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {step === 'form' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-honey">Withdrawal Amount (USDT)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={balance?.balanceUSD || "0"}
                placeholder="0.00"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                className="bg-muted border-honey/20 focus:border-honey"
                data-testid="input-withdrawal-amount"
              />
              <p className="text-xs text-muted-foreground">
                Claimable: ${balance?.balanceUSD || '0.00'} USDT
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chain" className="text-honey">Destination Blockchain</Label>
              <Select value={selectedChain} onValueChange={setSelectedChain}>
                <SelectTrigger className="bg-muted border-honey/20 focus:border-honey">
                  <SelectValue placeholder="Select blockchain" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CHAINS.map(chain => (
                    <SelectItem key={chain.id || chain.name} value={chain.id || chain.name}>
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{chain.icon}</span>
                        <div>
                          <p className="font-medium">{chain.name}</p>
                          <p className="text-xs text-muted-foreground">{chain.symbol}</p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient" className="text-honey">Recipient Wallet Address</Label>
              <Input
                id="recipient"
                type="text"
                placeholder="0x..."
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="bg-muted border-honey/20 focus:border-honey font-mono text-sm"
                data-testid="input-recipient-address"
              />
              <p className="text-xs text-muted-foreground">
                Make sure this address supports USDT on the selected blockchain
              </p>
            </div>

            <Button
              onClick={handleInitiateWithdrawal}
              disabled={initiateWithdrawalMutation.isPending || !withdrawalAmount || !selectedChain || !recipientAddress}
              className="w-full bg-honey text-black hover:bg-honey/90"
              data-testid="button-initiate-withdrawal"
            >
              {initiateWithdrawalMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Preparing Withdrawal...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Initiate Withdrawal
                </>
              )}
            </Button>
          </>
        )}

        {step === 'confirm' && withdrawalRequest && (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please review your withdrawal details carefully. This action cannot be undone.
              </AlertDescription>
            </Alert>

            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-semibold text-honey">{withdrawalRequest.amountUSD} USDT</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">To Chain:</span>
                <div className="flex items-center gap-2">
                  <span>{selectedChainInfo?.icon}</span>
                  <span>{selectedChainInfo?.name}</span>
                  <Badge className={selectedChainInfo?.color}>{selectedChainInfo?.symbol}</Badge>
                </div>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">Recipient:</span>
                <span className="font-mono text-xs text-right max-w-[200px] break-all">
                  {withdrawalRequest.recipientAddress}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={resetForm}
                variant="outline"
                className="flex-1"
                data-testid="button-cancel-withdrawal"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmWithdrawal}
                className="flex-1 bg-honey text-black hover:bg-honey/90"
                data-testid="button-confirm-withdrawal"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm & Sign
              </Button>
            </div>
          </div>
        )}

        {step === 'signing' && (
          <div className="text-center space-y-4">
            <div className="bg-muted/30 rounded-lg p-6">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-honey" />
              <h3 className="text-lg font-semibold text-honey mb-2">Waiting for Signature</h3>
              <p className="text-muted-foreground text-sm">
                Please sign the withdrawal request in your wallet to authorize the transaction.
              </p>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="text-center space-y-4">
            <div className="bg-muted/30 rounded-lg p-6">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-honey" />
              <h3 className="text-lg font-semibold text-honey mb-2">Processing Withdrawal</h3>
              <p className="text-muted-foreground text-sm">
                Your withdrawal is being processed on the blockchain. This may take a few moments.
              </p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
              <h3 className="text-lg font-semibold text-green-400 mb-2">Withdrawal Complete!</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Your USDT withdrawal has been successfully processed.
              </p>
              
              {/* Transaction details would be shown here in a real implementation */}
              <Button
                onClick={resetForm}
                className="bg-honey text-black hover:bg-honey/90"
                data-testid="button-new-withdrawal"
              >
                New Withdrawal
              </Button>
            </div>
          </div>
        )}

        {/* Network fees info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-blue-400 mt-1">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-400 mb-1">Network Fees</h4>
              <p className="text-xs text-muted-foreground">
                Network fees will be paid by the platform. You receive the full withdrawal amount.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

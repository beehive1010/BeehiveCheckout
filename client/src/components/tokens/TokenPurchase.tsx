import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '../../contexts/I18nContext';
import { PayEmbed } from 'thirdweb/react';
import { client, paymentChains, contractAddresses } from '../../lib/web3';
import { useActiveAccount } from 'thirdweb/react';
import { Coins, Zap, ArrowRight, Loader2 } from 'lucide-react';

interface TokenBalance {
  BCC: {
    transferable: number;
    restricted: number;
    total: number;
  };
  CTH: {
    balance: number;
  };
}

export default function TokenPurchase() {
  const { t } = useI18n();
  const { toast } = useToast();
  const account = useActiveAccount();
  const queryClient = useQueryClient();

  const [tokenType, setTokenType] = useState<'BCC' | 'CTH'>('BCC');
  const [tokenAmount, setTokenAmount] = useState('100');
  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [showPayEmbed, setShowPayEmbed] = useState(false);
  const [purchaseId, setPurchaseId] = useState<string>('');

  // Get user token balances
  const { data: balances, isLoading: balancesLoading } = useQuery<TokenBalance>({
    queryKey: ['/api/tokens/balances'],
    queryFn: async () => {
      const response = await fetch('/api/tokens/balances', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch balances');
      return response.json();
    },
    enabled: !!account?.address,
  });

  // Get purchase history
  const { data: purchases, isLoading: purchasesLoading } = useQuery<any[]>({
    queryKey: ['/api/tokens/purchases'],
    queryFn: async () => {
      const response = await fetch('/api/tokens/purchases', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch purchases');
      return response.json();
    },
    enabled: !!account?.address,
  });

  // Create token purchase mutation
  const createPurchaseMutation = useMutation({
    mutationFn: async (data: {
      tokenType: string;
      tokenAmount: number;
      sourceChain: string;
    }) => {
      const response = await apiRequest('POST', `/api/tokens/purchase`, {
        ...data,
        walletAddress: account?.address,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setPurchaseId(data.purchase.id);
      setShowPayEmbed(true);
      toast({
        title: "Purchase Created",
        description: `Ready to purchase ${tokenAmount} ${tokenType} tokens`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create purchase",
        variant: "destructive",
      });
    },
  });

  // Confirm purchase mutation (after payment)
  const confirmPurchaseMutation = useMutation({
    mutationFn: async (data: { purchaseId: string; txHash: string }) => {
      const response = await apiRequest('POST', `/api/tokens/confirm-purchase`, {
        ...data,
        walletAddress: account?.address,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tokens/balances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tokens/purchases'] });
      setShowPayEmbed(false);
      setPurchaseId('');
      setTokenAmount('100');
      toast({
        title: "Tokens Airdropped! 🪂",
        description: `${tokenAmount} ${tokenType} tokens have been added to your wallet`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to confirm purchase",
        variant: "destructive",
      });
    },
  });

  const handleCreatePurchase = () => {
    if (!account?.address) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to purchase tokens",
        variant: "destructive",
      });
      return;
    }

    const amount = parseInt(tokenAmount);
    if (amount <= 0 || isNaN(amount)) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid token amount",
        variant: "destructive",
      });
      return;
    }

    createPurchaseMutation.mutate({
      tokenType,
      tokenAmount: amount,
      sourceChain: selectedChain,
    });
  };

  const handlePaymentSuccess = (result: any) => {
    const txHash = result?.transactionHash || result?.txHash || `purchase-${Date.now()}`;
    confirmPurchaseMutation.mutate({
      purchaseId,
      txHash,
    });
  };

  const usdtAmount = parseInt(tokenAmount) * 0.01; // 1 token = 0.01 USDT
  const selectedPaymentChain = paymentChains.find(chain => chain.chain?.name?.toLowerCase() === selectedChain);

  if (!account?.address) {
    return (
      <Card className="border-honey/20 bg-gradient-to-br from-background to-secondary/20">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Coins className="h-12 w-12 mx-auto mb-4 text-honey" />
            <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-muted-foreground">
              Connect your wallet to purchase BCC and CTH tokens
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-testid="token-purchase-container">
      {/* Purchase Form */}
      <Card className="lg:col-span-2 border-honey/20 bg-gradient-to-br from-background to-secondary/20">
        <CardHeader className="border-b border-honey/10 bg-honey/5">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-honey" />
            Purchase Tokens
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Buy BCC and CTH tokens at 1 token = 0.01 USDT across multiple chains
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {!showPayEmbed ? (
            <>
              {/* Token Type Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Token Type</Label>
                  <Select value={tokenType} onValueChange={(value: 'BCC' | 'CTH') => setTokenType(value)}>
                    <SelectTrigger data-testid="select-token-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BCC">BCC (Beehive Crypto Coin)</SelectItem>
                      <SelectItem value="CTH">CTH (Centauri Honey)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Payment Chain</Label>
                  <Select value={selectedChain} onValueChange={setSelectedChain}>
                    <SelectTrigger data-testid="select-payment-chain">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentChains.map((chain) => (
                        <SelectItem key={chain.chain.name} value={chain.chain.name.toLowerCase()}>
                          <div className="flex items-center gap-2">
                            <i className={chain.icon}></i>
                            {chain.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <Label>Token Amount</Label>
                <Input
                  type="number"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  placeholder="Enter token amount"
                  min="1"
                  data-testid="input-token-amount"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Total Cost: ${usdtAmount.toFixed(2)} USDT
                </p>
              </div>

              {/* Token Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg border-2 transition-all ${tokenType === 'BCC' ? 'border-honey bg-honey/10' : 'border-border bg-secondary/50'}`}>
                  <h4 className="font-semibold text-honey mb-2">BCC Token</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Transferable utility token for marketplace purchases and rewards
                  </p>
                  <div className="text-xs text-honey">
                    • Use in NFT Marketplace<br/>
                    • Education Course Access<br/>
                    • Advertisement NFTs
                  </div>
                </div>

                <div className={`p-4 rounded-lg border-2 transition-all ${tokenType === 'CTH' ? 'border-honey bg-honey/10' : 'border-border bg-secondary/50'}`}>
                  <h4 className="font-semibold text-honey mb-2">CTH Token</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Native gas token for Alpha Centauri chain transactions
                  </p>
                  <div className="text-xs text-honey">
                    • Network Gas Fees<br/>
                    • Chain Operations<br/>
                    • Transaction Costs
                  </div>
                </div>
              </div>

              {/* Purchase Button */}
              <Button
                onClick={handleCreatePurchase}
                disabled={createPurchaseMutation.isPending}
                className="w-full bg-honey hover:bg-honey/90 text-black font-semibold"
                data-testid="button-create-purchase"
              >
                {createPurchaseMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Purchase...
                  </>
                ) : (
                  <>
                    Purchase {tokenAmount} {tokenType} Tokens
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </>
          ) : (
            // Payment Embed
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Complete Your Payment</h3>
                <p className="text-muted-foreground">
                  Pay ${usdtAmount.toFixed(2)} USDT to receive {tokenAmount} {tokenType} tokens
                </p>
              </div>

              {selectedPaymentChain && (
                <PayEmbed
                  client={client}
                  payOptions={{
                    mode: "direct_payment",
                    paymentInfo: {
                      amount: usdtAmount.toString(),
                      chain: selectedPaymentChain.chain,
                      token: { address: selectedPaymentChain.usdtAddress },
                      recipient: selectedPaymentChain.bridgeWallet,
                    },
                    metadata: {
                      name: `${tokenAmount} ${tokenType} Tokens`,
                      description: `Purchase ${tokenAmount} ${tokenType} tokens for ${usdtAmount.toFixed(2)} USDT`,
                    },
                  }}
                  onPaymentSuccess={handlePaymentSuccess}
                  className="mx-auto"
                />
              )}

              <Button
                variant="outline"
                onClick={() => {
                  setShowPayEmbed(false);
                  setPurchaseId('');
                }}
                className="w-full"
                data-testid="button-cancel-payment"
              >
                Cancel Payment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Balance & History Sidebar */}
      <div className="space-y-6">
        {/* Current Balances */}
        <Card className="border-honey/20 bg-gradient-to-br from-background to-secondary/20">
          <CardHeader className="border-b border-honey/10 bg-honey/5">
            <CardTitle className="text-lg">Your Token Balances</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {balancesLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-secondary rounded"></div>
                <div className="h-4 bg-secondary rounded w-3/4"></div>
              </div>
            ) : balances ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm">BCC Total:</span>
                  <span className="font-semibold text-honey">{balances.BCC.total.toLocaleString()}</span>
                </div>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Transferable:</span>
                    <span>{balances.BCC.transferable.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Restricted:</span>
                    <span>{balances.BCC.restricted.toLocaleString()}</span>
                  </div>
                </div>
                <hr className="border-honey/20" />
                <div className="flex justify-between items-center">
                  <span className="text-sm">CTH Balance:</span>
                  <span className="font-semibold text-honey">{balances.CTH.balance.toLocaleString()}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No balances found</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Purchases */}
        <Card className="border-honey/20 bg-gradient-to-br from-background to-secondary/20">
          <CardHeader className="border-b border-honey/10 bg-honey/5">
            <CardTitle className="text-lg">Recent Purchases</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {purchasesLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-secondary rounded"></div>
                <div className="h-4 bg-secondary rounded w-2/3"></div>
              </div>
            ) : purchases && Array.isArray(purchases) && purchases.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {purchases.slice(0, 5).map((purchase: any) => (
                  <div key={purchase.id} className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-medium">{purchase.tokenAmount} {purchase.tokenType}</span>
                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                        purchase.status === 'airdropped' ? 'bg-green-500/20 text-green-400' :
                        purchase.status === 'paid' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {purchase.status}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      ${(purchase.usdtAmount * 0.01).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No purchases yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
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
    enabled: !!account?.address,
    queryFn: async () => {
      const response = await fetch('/api/tokens/balances', {
        headers: {
          'X-Wallet-Address': account!.address,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch token balances');
      }
      return response.json();
    },
  });

  // Get purchase history
  const { data: purchases, isLoading: purchasesLoading } = useQuery<any[]>({
    queryKey: ['/api/tokens/purchases'],
    enabled: !!account?.address,
    queryFn: async () => {
      const response = await fetch('/api/tokens/purchases', {
        headers: {
          'X-Wallet-Address': account!.address,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch purchase history');
      }
      return response.json();
    },
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
        title: t('tokenPurchase.messages.purchaseCreated'),
        description: t('tokenPurchase.messages.readyToPurchase', { amount: tokenAmount, token: tokenType }),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('tokenPurchase.messages.error'),
        description: error?.message || t('tokenPurchase.messages.createFailed'),
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
        title: t('tokenPurchase.messages.tokensAirdropped'),
        description: t('tokenPurchase.messages.tokensAdded', { amount: tokenAmount, token: tokenType }),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('tokenPurchase.messages.error'),
        description: error?.message || t('tokenPurchase.messages.confirmFailed'),
        variant: "destructive",
      });
    },
  });

  const handleCreatePurchase = () => {
    if (!account?.address) {
      toast({
        title: t('tokenPurchase.messages.walletNotConnected'),
        description: t('tokenPurchase.messages.connectToPurchase'),
        variant: "destructive",
      });
      return;
    }

    const amount = parseInt(tokenAmount);
    if (amount <= 0 || isNaN(amount)) {
      toast({
        title: t('tokenPurchase.messages.invalidAmount'),
        description: t('tokenPurchase.messages.enterValidAmount'),
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
            <h3 className="text-xl font-semibold mb-2">{t('tokenPurchase.connectWallet.title')}</h3>
            <p className="text-muted-foreground">
              {t('tokenPurchase.connectWallet.description')}
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
            {t('tokenPurchase.title')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('tokenPurchase.description')}
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {!showPayEmbed ? (
            <>
              {/* Token Type Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('tokenPurchase.form.tokenType')}</Label>
                  <Select value={tokenType} onValueChange={(value: 'BCC' | 'CTH') => setTokenType(value)}>
                    <SelectTrigger data-testid="select-token-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BCC">{t('tokenPurchase.tokens.bcc.name')}</SelectItem>
                      <SelectItem value="CTH">{t('tokenPurchase.tokens.cth.name')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{t('tokenPurchase.form.paymentChain')}</Label>
                  <Select value={selectedChain} onValueChange={setSelectedChain}>
                    <SelectTrigger data-testid="select-payment-chain">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentChains.map((chain) => (
                        <SelectItem key={chain.chain?.name || chain.name} value={chain.chain?.name?.toLowerCase() || chain.name.toLowerCase()}>
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
                <Label>{t('tokenPurchase.form.tokenAmount')}</Label>
                <Input
                  type="number"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  placeholder={t('tokenPurchase.form.enterAmount')}
                  min="1"
                  data-testid="input-token-amount"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('tokenPurchase.form.totalCost', { amount: usdtAmount.toFixed(2) })}
                </p>
              </div>

              {/* Token Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg border-2 transition-all ${tokenType === 'BCC' ? 'border-honey bg-honey/10' : 'border-border bg-secondary/50'}`}>
                  <h4 className="font-semibold text-honey mb-2">{t('tokenPurchase.tokens.bcc.title')}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('tokenPurchase.tokens.bcc.description')}
                  </p>
                  <div className="text-xs text-honey">
                    • {t('tokenPurchase.tokens.bcc.uses.marketplace')}<br/>
                    • {t('tokenPurchase.tokens.bcc.uses.education')}<br/>
                    • {t('tokenPurchase.tokens.bcc.uses.advertisement')}
                  </div>
                </div>

                <div className={`p-4 rounded-lg border-2 transition-all ${tokenType === 'CTH' ? 'border-honey bg-honey/10' : 'border-border bg-secondary/50'}`}>
                  <h4 className="font-semibold text-honey mb-2">{t('tokenPurchase.tokens.cth.title')}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('tokenPurchase.tokens.cth.description')}
                  </p>
                  <div className="text-xs text-honey">
                    • {t('tokenPurchase.tokens.cth.uses.gas')}<br/>
                    • {t('tokenPurchase.tokens.cth.uses.operations')}<br/>
                    • {t('tokenPurchase.tokens.cth.uses.transactions')}
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
                    {t('tokenPurchase.buttons.creating')}
                  </>
                ) : (
                  <>
                    {t('tokenPurchase.buttons.purchase', { amount: tokenAmount, token: tokenType })}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </>
          ) : (
            // Payment Embed
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">{t('tokenPurchase.payment.title')}</h3>
                <p className="text-muted-foreground">
                  {t('tokenPurchase.payment.description', { amount: usdtAmount.toFixed(2), tokenAmount, tokenType })}
                </p>
              </div>

              {selectedPaymentChain && (
                <div className="text-center space-y-4">
                  <PayEmbed
                    client={client}
                    payOptions={{
                      mode: "direct_payment",
                      paymentInfo: {
                        amount: usdtAmount.toString(),
                        chain: selectedPaymentChain.chain,
                        token: { address: selectedPaymentChain.usdtAddress },
                        sellerAddress: selectedPaymentChain.bridgeWallet,
                      },
                      metadata: {
                        name: `${tokenAmount} ${tokenType} Tokens`,
                        description: `Purchase ${tokenAmount} ${tokenType} tokens for ${usdtAmount.toFixed(2)} USDT`,
                      },
                    }}
                    className="mx-auto"
                  />
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      {t('tokenPurchase.testnet.warning')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('tokenPurchase.testnet.note')}
                    </p>
                  </div>
                </div>
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
                {t('tokenPurchase.buttons.cancelPayment')}
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
            <CardTitle className="text-lg">{t('tokenPurchase.balances.title')}</CardTitle>
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
                  <span className="text-sm">{t('tokenPurchase.balances.bccTotal')}</span>
                  <span className="font-semibold text-honey">{balances.BCC.total.toLocaleString()}</span>
                </div>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>{t('tokenPurchase.balances.transferable')}</span>
                    <span>{balances.BCC.transferable.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('tokenPurchase.balances.restricted')}</span>
                    <span>{balances.BCC.restricted.toLocaleString()}</span>
                  </div>
                </div>
                <hr className="border-honey/20" />
                <div className="flex justify-between items-center">
                  <span className="text-sm">{t('tokenPurchase.balances.cthBalance')}</span>
                  <span className="font-semibold text-honey">{balances.CTH.balance.toLocaleString()}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t('tokenPurchase.balances.noBalances')}</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Purchases */}
        <Card className="border-honey/20 bg-gradient-to-br from-background to-secondary/20">
          <CardHeader className="border-b border-honey/10 bg-honey/5">
            <CardTitle className="text-lg">{t('tokenPurchase.history.title')}</CardTitle>
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
              <p className="text-sm text-muted-foreground">{t('tokenPurchase.history.noPurchases')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
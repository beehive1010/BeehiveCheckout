import React, {useCallback, useState} from 'react';
import {useActiveAccount} from 'thirdweb/react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {Card, CardContent, CardHeader, CardTitle} from './ui/card';
import {Button} from './ui/button';
import {Badge} from './ui/badge';
import {Input} from './ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from './ui/select';
import {useToast} from '../hooks/use-toast';
import {useI18n} from '../contexts/I18nContext';
import {arbitrum, base, ethereum, polygon} from 'thirdweb/chains';
import Web3BuyModal from './Web3BuyModal';
import {
    ArrowRight,
    CheckCircle,
    Clock,
    Coins,
    CreditCard,
    ExternalLink,
    Info,
    Loader2,
    Network,
    ShoppingCart,
    Shuffle,
    Wallet,
    Zap
} from 'lucide-react';

interface BccPurchaseConfig {
  exchangeRate: number;
  minimumPurchaseUSDC: number;
  maximumPurchaseUSDC: number;
  companyServerWallet: string;
  supportedNetworks: Record<string, NetworkConfig>;
  paymentMethods: string[];
  processingTimeEstimate: string;
}

interface NetworkConfig {
  chainId: number;
  name: string;
  usdcContract: string;
  bridgeSupported: boolean;
}

interface BccPurchaseInterfaceProps {
  className?: string;
  onPurchaseSuccess?: () => void;
  showBalance?: boolean;
}

// ThirdWeb Buy Configuration
interface BuyConfig {
  mode: 'direct' | 'fund_wallet';
  prefillBuy: {
    amount: string;
    token?: {
      address: string;
      chainId: number;
    };
  };
  buyForTx: {
    transactionId: string;
  };
}

export function BccPurchaseInterface({ 
  className = "",
  onPurchaseSuccess,
  showBalance = true
}: BccPurchaseInterfaceProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const account = useActiveAccount();
  const queryClient = useQueryClient();
  
  const [purchaseAmount, setPurchaseAmount] = useState<number>(100);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('arbitrum-one');
  const [paymentMethod, setPaymentMethod] = useState<string>('thirdweb_bridge');
  const [purchaseStep, setPurchaseStep] = useState<'config' | 'confirm' | 'processing' | 'completed'>('config');
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [showWeb3BuyModal, setShowWeb3BuyModal] = useState<boolean>(false);
  const [buyMode, setBuyMode] = useState<'traditional' | 'web3_buy'>('traditional');

  // Fetch BCC purchase configuration
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['/api/bcc/purchase-config', account?.address],
    enabled: !!account?.address,
    queryFn: async (): Promise<{ success: boolean; config: BccPurchaseConfig }> => {
      const baseUrl = 'https://cdjmtevekxpmgrixkiqt.supabase.co/functions/v1';
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${baseUrl}/bcc-purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'X-Wallet-Address': account!.address,
        },
        body: JSON.stringify({ action: 'get-config' })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch purchase configuration: ${errorText}`);
      }
      
      return response.json();
    },
  });

  // Fetch current BCC balance
  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['/api/bcc/spending-balance', account?.address],
    enabled: !!account?.address && showBalance,
    queryFn: async () => {
      const baseUrl = 'https://cdjmtevekxpmgrixkiqt.supabase.co/functions/v1';
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${baseUrl}/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'X-Wallet-Address': account!.address,
        },
        body: JSON.stringify({ action: 'get-balance' })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch BCC balance: ${errorText}`);
      }
      
      return response.json();
    },
  });

  // Create BCC purchase order
  const createPurchaseMutation = useMutation({
    mutationFn: async (purchaseData: any) => {
      const baseUrl = 'https://cdjmtevekxpmgrixkiqt.supabase.co/functions/v1';
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${baseUrl}/bcc-purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'X-Wallet-Address': account!.address
        },
        body: JSON.stringify({ action: 'create-purchase', ...purchaseData })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Purchase failed');
      }

      return response.json();
    },
    onSuccess: (result) => {
      setCurrentOrder(result);
      setPurchaseStep('confirm');
      toast({
        title: "Purchase Order Created",
        description: `Send ${result.amountUSDC} USDC to receive ${result.amountBCC} BCC tokens`,
        duration: 6000
      });
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || 'Failed to create purchase order',
        variant: "destructive"
      });
    }
  });

  // Confirm payment
  const confirmPaymentMutation = useMutation({
    mutationFn: async (confirmData: any) => {
      const baseUrl = 'https://cdjmtevekxpmgrixkiqt.supabase.co/functions/v1';
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${baseUrl}/bcc-purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'X-Wallet-Address': account!.address
        },
        body: JSON.stringify({ action: 'confirm-payment', ...confirmData })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Payment confirmation failed');
      }

      return response.json();
    },
    onSuccess: (result) => {
      setPurchaseStep('completed');
      queryClient.invalidateQueries({ queryKey: ['/api/bcc/spending-balance'] });
      
      toast({
        title: "🎉 BCC Tokens Credited!",
        description: result.message,
        duration: 8000
      });

      if (onPurchaseSuccess) {
        onPurchaseSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Payment Confirmation Failed",
        description: error.message || 'Failed to confirm payment',
        variant: "destructive"
      });
    }
  });

  const handleCreatePurchase = () => {
    if (!config?.config) return;

    const purchaseData = {
      amountUSDC: purchaseAmount,
      network: selectedNetwork,
      paymentMethod,
      bridgeUsed: paymentMethod === 'thirdweb_bridge'
    };

    createPurchaseMutation.mutate(purchaseData);
  };

  const handleConfirmPayment = () => {
    if (!currentOrder) return;

    const confirmData = {
      orderId: currentOrder.orderId,
      transactionHash: `manual_confirm_${Date.now()}`, // In real implementation, get from user input
      actualAmountReceived: currentOrder.amountUSDC
    };

    setPurchaseStep('processing');
    confirmPaymentMutation.mutate(confirmData);
  };

  const bccAmount = purchaseAmount * (config?.config.exchangeRate || 1);
  const selectedNetworkConfig = config?.config.supportedNetworks[selectedNetwork];

  // Define supported chains for Web3 Buy
  const supportedBuyChains = [
    { chain: ethereum, name: 'Ethereum', symbol: 'ETH', color: 'text-blue-400' },
    { chain: polygon, name: 'Polygon', symbol: 'MATIC', color: 'text-purple-400' },
    { chain: arbitrum, name: 'Arbitrum', symbol: 'ARB', color: 'text-blue-300' },
    { chain: base, name: 'Base', symbol: 'ETH', color: 'text-blue-500' }
  ];

  // Web3 Buy handlers
  const handleWeb3BuySuccess = useCallback((details: any) => {
    console.log('🎉 Web3 Buy successful:', details);
    
    // Update balance and trigger success flow
    queryClient.invalidateQueries({ queryKey: ['/api/bcc/spending-balance'] });
    
    toast({
      title: "🎉 Purchase Successful!",
      description: `Successfully purchased ${bccAmount} BCC tokens via Web3 bridge`,
      duration: 8000
    });

    if (onPurchaseSuccess) {
      onPurchaseSuccess();
    }

    setBuyMode('traditional');
    setPurchaseStep('completed');
  }, [bccAmount, onPurchaseSuccess, queryClient, toast]);

  const handleWeb3BuyError = useCallback((error: any) => {
    console.error('❌ Web3 Buy failed:', error);
    
    toast({
      title: "Purchase Failed",
      description: error?.message || "Failed to complete Web3 purchase. Please try again.",
      variant: "destructive"
    });
  }, [toast]);

  // Launch Web3 Buy flow
  const handleWeb3BuyLaunch = useCallback(() => {
    if (!account?.address || !purchaseAmount) {
      toast({
        title: "Invalid Configuration",
        description: "Please connect wallet and set purchase amount",
        variant: "destructive"
      });
      return;
    }

    console.log('🚀 Opening Web3 Buy modal for:', {
      wallet: account.address,
      amount: purchaseAmount,
      expectedBCC: bccAmount
    });

    setShowWeb3BuyModal(true);
  }, [account?.address, purchaseAmount, bccAmount, toast]);

  // Show loading state
  if (configLoading) {
    return (
      <div className={`${className}`}>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-y-4 flex-col">
              <Loader2 className="h-8 w-8 animate-spin text-honey" />
              <p className="text-sm text-muted-foreground">Loading purchase options...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!account?.address) {
    return (
      <div className={`${className}`}>
        <Card>
          <CardContent className="pt-6 text-center">
            <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Connect your wallet to purchase BCC tokens</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Web3 Buy Modal */}
      <Web3BuyModal
        isOpen={showWeb3BuyModal}
        onClose={() => setShowWeb3BuyModal(false)}
        purchaseAmount={purchaseAmount}
        expectedBCC={bccAmount}
        onSuccess={handleWeb3BuySuccess}
        onError={handleWeb3BuyError}
      />

      {/* Current Balance Display */}
      {showBalance && balance && (
        <Card className="bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Coins className="w-8 h-8 text-green-400" />
                <div>
                  <h3 className="font-bold text-lg text-green-400">Current BCC Balance</h3>
                  <p className="text-sm text-muted-foreground">Available for spending on NFTs and courses</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-400">
                  {balance.balance.totalSpendable} BCC
                </div>
                <p className="text-sm text-muted-foreground">
                  ${balance.balance.totalSpendable} value
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchase Interface */}
      <Card className="border-honey/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-honey">
            <CreditCard className="h-5 w-5" />
            Purchase BCC Tokens
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="w-4 h-4" />
            <span>Pay with USDC to receive BCC tokens for platform purchases</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {purchaseStep === 'config' && (
            <div className="space-y-6">
              {/* Purchase Mode Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Purchase Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={buyMode === 'traditional' ? "default" : "outline"}
                    onClick={() => setBuyMode('traditional')}
                    className={buyMode === 'traditional' ? "bg-honey hover:bg-honey/90 text-black" : ""}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Traditional
                  </Button>
                  <Button
                    variant={buyMode === 'web3_buy' ? "default" : "outline"}
                    onClick={() => setBuyMode('web3_buy')}
                    className={buyMode === 'web3_buy' ? "bg-honey hover:bg-honey/90 text-black" : ""}
                  >
                    <Shuffle className="mr-2 h-4 w-4" />
                    Web3 Shuffle
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {buyMode === 'traditional' 
                    ? "Manual USDC transfer with order confirmation"
                    : "Direct crypto-to-crypto purchase via thirdweb bridge"
                  }
                </p>
              </div>

              {/* Purchase Amount */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Purchase Amount (USDC)</label>
                <div className="space-y-2">
                  <Input
                    type="number"
                    value={purchaseAmount}
                    onChange={(e) => setPurchaseAmount(Number(e.target.value))}
                    min={config?.config.minimumPurchaseUSDC || 10}
                    max={config?.config.maximumPurchaseUSDC || 10000}
                    placeholder="Enter USDC amount"
                    className="text-lg"
                  />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Min: ${config?.config.minimumPurchaseUSDC} USDC</span>
                    <span>Max: ${config?.config.maximumPurchaseUSDC} USDC</span>
                  </div>
                </div>
              </div>

              {/* Exchange Preview */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">You pay:</span>
                  <span className="font-bold">{purchaseAmount} USDC</span>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-honey" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">You receive:</span>
                  <span className="font-bold text-green-400">{bccAmount} BCC</span>
                </div>
                <div className="text-center text-xs text-muted-foreground">
                  Exchange Rate: 1 USDC = {config?.config.exchangeRate || 1} BCC
                </div>
              </div>

              {/* Network Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Payment Network</label>
                <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(config?.config.supportedNetworks || {}).map(([key, network]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Network className="w-4 h-4" />
                          {network.name}
                          <Badge variant="secondary" className="text-xs">
                            Chain {network.chainId}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Payment Method</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thirdweb_bridge">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Thirdweb Shuffle (Recommended)
                      </div>
                    </SelectItem>
                    <SelectItem value="direct_transfer">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        Direct Transfer
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Network Info */}
              {selectedNetworkConfig && (
                <div className="bg-blue-500/5 rounded-lg p-4 border border-blue-500/20">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-blue-400">
                      <Network className="w-4 h-4" />
                      <span className="font-medium">{selectedNetworkConfig.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Chain ID: {selectedNetworkConfig.chainId}</div>
                      <div>USDC Contract: {selectedNetworkConfig.usdcContract.slice(0, 10)}...{selectedNetworkConfig.usdcContract.slice(-8)}</div>
                      <div>Shuffle Support: {selectedNetworkConfig.bridgeSupported ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Traditional Purchase Flow */}
              {buyMode === 'traditional' && (
                <>
                  {/* Processing Time */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Estimated processing time: {config?.config.processingTimeEstimate}</span>
                  </div>

                  {/* Create Purchase Button */}
                  <Button
                    onClick={handleCreatePurchase}
                    disabled={createPurchaseMutation.isPending || !purchaseAmount}
                    className="w-full bg-honey hover:bg-honey/90 text-black"
                    size="lg"
                  >
                    {createPurchaseMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Order...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Create Purchase Order
                      </>
                    )}
                  </Button>
                </>
              )}

              {/* Web3 Shuffle Purchase Flow */}
              {buyMode === 'web3_buy' && (
                <div className="space-y-6">
                  {/* Web3 Buy Info */}
                  <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-green-500/10 rounded-lg p-6 border border-blue-500/20">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <Shuffle className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-blue-400">ThirdWeb Shuffle Purchase</h3>
                          <p className="text-sm text-muted-foreground">Direct crypto-to-crypto conversion</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-green-400" />
                          <span className="text-green-400">Instant Processing</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="w-4 h-4 text-blue-400" />
                          <span className="text-blue-400">No Manual Transfer</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-purple-400" />
                          <span className="text-purple-400">Auto-Credited</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Supported Chains Display */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Supported Networks</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {supportedBuyChains.map((chainInfo, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                          <Network className={`w-4 h-4 ${chainInfo.color}`} />
                          <div>
                            <div className="font-medium text-sm">{chainInfo.name}</div>
                            <div className="text-xs text-muted-foreground">{chainInfo.symbol}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Web3 Buy Instructions */}
                  <div className="bg-honey/5 rounded-lg p-4 border border-honey/20">
                    <h4 className="font-medium text-honey mb-2">How Web3 Shuffle Works:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>1. Connect your wallet with any supported token</li>
                      <li>2. Select the amount and token you want to spend</li>
                      <li>3. Shuffle automatically converts to USDC and credits BCC</li>
                      <li>4. Tokens appear in your balance instantly</li>
                    </ul>
                  </div>

                  {/* Launch Web3 Buy Button */}
                  <div className="space-y-3">
                    <Button
                      onClick={() => {
                        // Implementation will be added based on thirdweb's Buy SDK
                        handleWeb3BuyLaunch();
                      }}
                      disabled={!purchaseAmount || purchaseAmount < 10}
                      className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 hover:opacity-90 text-white"
                      size="lg"
                    >
                      <Shuffle className="mr-2 h-4 w-4" />
                      Launch Web3 Shuffle Purchase ({purchaseAmount} USDC → {bccAmount} BCC)
                    </Button>
                    
                    {/* Web3 Buy Widget Placeholder */}
                    <div id="thirdweb-buy-widget" className="hidden">
                      {/* ThirdWeb Buy widget will be mounted here */}
                    </div>
                  </div>

                  {/* Fallback to Traditional */}
                  <div className="text-center">
                    <Button
                      variant="outline"
                      onClick={() => setBuyMode('traditional')}
                      className="border-honey/30 text-honey hover:bg-honey/10"
                    >
                      Use Traditional Method Instead
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {purchaseStep === 'confirm' && currentOrder && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-green-400 mb-2">Purchase Order Created</h3>
                <p className="text-muted-foreground">Complete your payment to receive BCC tokens</p>
              </div>

              <div className="bg-muted/30 rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Order ID:</span>
                    <div className="font-mono text-xs bg-background px-2 py-1 rounded mt-1">
                      {currentOrder.orderId}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount to Pay:</span>
                    <div className="font-bold text-lg">{currentOrder.amountUSDC} USDC</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">You'll Receive:</span>
                    <div className="font-bold text-lg text-green-400">{currentOrder.amountBCC} BCC</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Network:</span>
                    <div className="font-medium">{currentOrder.networkInfo.name}</div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <span className="text-muted-foreground text-sm">Company Wallet:</span>
                  <div className="font-mono text-sm bg-background px-3 py-2 rounded mt-1 flex items-center justify-between">
                    <span>{currentOrder.companyWallet}</span>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Send exactly <strong>{currentOrder.amountUSDC} USDC</strong> to the company wallet address above on <strong>{currentOrder.networkInfo.name}</strong>.
                </p>
                <p className="text-xs text-muted-foreground">
                  After sending the payment, click the confirmation button below. Your BCC tokens will be credited within {config?.config.processingTimeEstimate}.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setPurchaseStep('config')}
                  className="flex-1"
                >
                  Back to Configuration
                </Button>
                <Button
                  onClick={handleConfirmPayment}
                  disabled={confirmPaymentMutation.isPending}
                  className="flex-1 bg-green-500 hover:bg-green-500/90"
                >
                  {confirmPaymentMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirm Payment Sent
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {purchaseStep === 'processing' && (
            <div className="text-center space-y-4 py-8">
              <Loader2 className="w-12 h-12 animate-spin text-honey mx-auto" />
              <div>
                <h3 className="text-lg font-bold text-honey mb-2">Processing Payment</h3>
                <p className="text-muted-foreground">
                  We're confirming your payment and crediting your BCC tokens...
                </p>
              </div>
            </div>
          )}

          {purchaseStep === 'completed' && (
            <div className="text-center space-y-6 py-8">
              <div>
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-green-400 mb-2">Purchase Completed! 🎉</h3>
                <p className="text-muted-foreground mb-4">
                  Your BCC tokens have been successfully credited to your account
                </p>
              </div>

              <div className="bg-green-500/5 rounded-lg p-6 border border-green-500/20">
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-green-400">
                    +{currentOrder?.amountBCC} BCC
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Added to your balance
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPurchaseStep('config');
                    setCurrentOrder(null);
                    setPurchaseAmount(100);
                  }}
                  className="flex-1"
                >
                  Buy More BCC
                </Button>
                <Button
                  onClick={() => window.location.href = '/tasks'}
                  className="flex-1 bg-honey hover:bg-honey/90 text-black"
                >
                  Browse NFTs & Courses
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default BccPurchaseInterface;
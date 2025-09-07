import React, { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { 
  MULTI_CHAIN_CONFIG,
  getSupportedPaymentChains,
  getChainConfig,
  calculateTransactionFee,
  validatePaymentAmount
} from '../../lib/web3/multi-chain-config';
import { 
  multiChainPaymentProcessor,
  getUSDCBalance,
  formatUSDCAmount,
  type PaymentRequest,
  type PaymentResult
} from '../../lib/web3/multi-chain-payment';
import { useToast } from '../../hooks/use-toast';
import { 
  Wallet,
  ArrowLeftRight,
  Clock,
  DollarSign,
  Network,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Info,
  ExternalLink
} from 'lucide-react';

interface MultiChainPaymentSelectorProps {
  amount: number;
  paymentPurpose: 'membership_activation' | 'nft_upgrade' | 'token_purchase';
  level?: number;
  onPaymentSuccess: (result: PaymentResult) => void;
  onPaymentError: (error: string) => void;
  className?: string;
}

export function MultiChainPaymentSelector({
  amount,
  paymentPurpose,
  level,
  onPaymentSuccess,
  onPaymentError,
  className = ""
}: MultiChainPaymentSelectorProps) {
  const account = useActiveAccount();
  const { toast } = useToast();

  // State management
  const [selectedChainId, setSelectedChainId] = useState<number>(MULTI_CHAIN_CONFIG.arbitrum.chainId);
  const [paymentAmount, setPaymentAmount] = useState<number>(amount);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [feeCalculation, setFeeCalculation] = useState<any>(null);
  const [bridgeMode, setBridgeMode] = useState(false);

  const supportedChains = getSupportedPaymentChains().filter(chain => !chain.isTestnet);
  const selectedChain = getChainConfig(selectedChainId);

  // Load user balance when chain or account changes
  useEffect(() => {
    if (account?.address && selectedChainId) {
      loadUserBalance();
    }
  }, [account?.address, selectedChainId]);

  // Calculate fees when amount or chain changes
  useEffect(() => {
    if (selectedChainId && paymentAmount > 0) {
      const fees = calculateTransactionFee(selectedChainId, paymentAmount);
      setFeeCalculation(fees);
    }
  }, [selectedChainId, paymentAmount]);

  // Reset bridge mode if testnet is selected
  useEffect(() => {
    if (selectedChain && selectedChain.isTestnet) {
      setBridgeMode(false);
    }
  }, [selectedChain]);

  const loadUserBalance = async () => {
    if (!account?.address) return;
    
    setBalanceLoading(true);
    try {
      const balance = await getUSDCBalance(account.address, selectedChainId);
      if (balance.error) {
        console.warn('Balance check failed:', balance.error);
        setUserBalance(0);
      } else {
        setUserBalance(balance.balance);
      }
    } catch (error) {
      console.error('Failed to load balance:', error);
      setUserBalance(0);
    } finally {
      setBalanceLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!account?.address || !selectedChain) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to continue",
        variant: "destructive"
      });
      return;
    }

    // Validate payment amount
    const validation = validatePaymentAmount(paymentAmount, selectedChainId);
    if (!validation.isValid) {
      onPaymentError(validation.error!);
      return;
    }

    // Check sufficient balance
    if (userBalance < paymentAmount) {
      onPaymentError(`Insufficient USDC balance. Required: ${formatUSDCAmount(paymentAmount)}, Available: ${formatUSDCAmount(userBalance)}`);
      return;
    }

    setIsProcessing(true);

    try {
      const paymentRequest: PaymentRequest = {
        amount: paymentAmount,
        sourceChainId: selectedChainId,
        targetChainId: bridgeMode ? MULTI_CHAIN_CONFIG.arbitrum.chainId : undefined,
        payerAddress: account.address,
        paymentPurpose,
        level,
        referenceId: `${paymentPurpose}_${Date.now()}`
      };

      const result = await multiChainPaymentProcessor.processPayment(paymentRequest, account);

      if (result.success) {
        toast({
          title: "Payment Successful! 🎉",
          description: `Transaction confirmed on ${selectedChain.name}`,
          duration: 5000
        });
        onPaymentSuccess(result);
      } else {
        onPaymentError(result.error || 'Payment processing failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      onPaymentError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const getChainIcon = (chainId: number) => {
    const config = getChainConfig(chainId);
    return config?.icon || 'fas fa-link';
  };

  const getChainColor = (chainId: number) => {
    const config = getChainConfig(chainId);
    return config?.color || 'text-gray-400';
  };

  const hasInsufficientBalance = userBalance > 0 && userBalance < paymentAmount;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-honey mb-2">Multi-Chain Payment</h3>
        <p className="text-muted-foreground">
          Pay with USDC on any supported blockchain network
        </p>
      </div>

      <Card className="border-honey/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-honey" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount (USDC)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="pl-10"
                min="1"
                max="10000"
                step="0.01"
                disabled={isProcessing}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum: $1 USDC • Maximum: $10,000 USDC per transaction
            </p>
          </div>

          <Separator />

          {/* Chain Selection */}
          <div className="space-y-4">
            <Label>Select Blockchain Network</Label>
            
            <Select 
              value={selectedChainId.toString()} 
              onValueChange={(value) => setSelectedChainId(Number(value))}
              disabled={isProcessing}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a network" />
              </SelectTrigger>
              <SelectContent>
                {supportedChains.map((chain) => (
                  <SelectItem key={chain.chainId} value={chain.chainId.toString()}>
                    <div className="flex items-center gap-3">
                      <i className={`${chain.icon} ${chain.color}`} />
                      <div>
                        <div className="font-medium">{chain.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Gas: ~${chain.averageGasFee} • {chain.symbol}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Selected Chain Info */}
            {selectedChain && (
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center`}>
                      <i className={`${selectedChain.icon} ${selectedChain.color} text-sm`} />
                    </div>
                    <div>
                      <div className="font-medium">{selectedChain.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Chain ID: {selectedChain.chainId}
                      </div>
                    </div>
                  </div>
                  <Badge variant={selectedChain.isTestnet ? "secondary" : "default"}>
                    {selectedChain.isTestnet ? "Testnet" : "Mainnet"}
                  </Badge>
                </div>

                {/* Balance Display */}
                <div className="mt-3 pt-3 border-t border-muted">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Your USDC Balance:</span>
                    <div className="flex items-center gap-2">
                      {balanceLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <span className={`font-medium ${hasInsufficientBalance ? 'text-destructive' : 'text-green-400'}`}>
                            {formatUSDCAmount(userBalance)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={loadUserBalance}
                            className="h-6 w-6 p-0"
                          >
                            <i className="fas fa-refresh text-xs" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Fee Calculation */}
          {feeCalculation && (
            <div className="space-y-3">
              <Label>Transaction Fees</Label>
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Payment Amount:</span>
                  <span>{formatUSDCAmount(paymentAmount)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Network Fee ({selectedChain?.name}):</span>
                  <span>{formatUSDCAmount(feeCalculation.networkFee)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Platform Fee (0.5%):</span>
                  <span>{formatUSDCAmount(feeCalculation.platformFee)}</span>
                </div>
                {bridgeMode && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Bridge Fee:</span>
                    <span>$2.00 USDC</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total Cost:</span>
                  <span>{formatUSDCAmount(paymentAmount + feeCalculation.totalFee + (bridgeMode ? 2 : 0))}</span>
                </div>
                <div className="flex justify-between text-sm text-green-400">
                  <span>Net Amount:</span>
                  <span>{formatUSDCAmount(feeCalculation.netAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Bridge Mode Toggle - Only for mainnet chains */}
          {selectedChainId !== MULTI_CHAIN_CONFIG.arbitrum.chainId && selectedChain && !selectedChain.isTestnet && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="bridge-mode"
                  checked={bridgeMode}
                  onChange={(e) => setBridgeMode(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="bridge-mode" className="flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4" />
                  Bridge to Arbitrum (Primary Network)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                {bridgeMode ? 
                  "Your payment will be bridged to Arbitrum One for platform use. Additional $2 bridge fee applies." :
                  "Payment will remain on selected network. Manual bridging may be required later."
                }
              </p>
            </div>
          )}

          {/* Testnet Bridge Restriction Notice */}
          {selectedChain && selectedChain.isTestnet && selectedChainId !== MULTI_CHAIN_CONFIG.arbitrum.chainId && (
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Info className="h-4 w-4" />
                <span className="text-sm font-medium">Testnet Payment</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Testnet payments remain on the test network and cannot be bridged to mainnet.
              </p>
            </div>
          )}

          {/* Error States */}
          {hasInsufficientBalance && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Insufficient Balance</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                You need {formatUSDCAmount(paymentAmount - userBalance)} more USDC to complete this transaction.
              </p>
            </div>
          )}

          {/* Payment Button */}
          <Button
            onClick={handlePayment}
            disabled={isProcessing || !account?.address || hasInsufficientBalance || paymentAmount <= 0}
            className="w-full bg-honey hover:bg-honey/90 text-black"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Pay {formatUSDCAmount(paymentAmount)} USDC
              </>
            )}
          </Button>

          {/* Transaction Time Estimate */}
          {selectedChain && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Estimated completion: ~{Math.ceil((selectedChain.blockTime * selectedChain.confirmationBlocks) / 60)} minutes
                {bridgeMode && " + 20 minutes for bridging"}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/30 border-muted">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-honey mt-0.5" />
            <div className="space-y-2 text-sm">
              <div className="font-medium text-honey">Payment Information</div>
              <ul className="text-muted-foreground space-y-1">
                <li>• Payments are processed directly on the blockchain</li>
                <li>• All fees are calculated in real-time based on network conditions</li>
                <li>• Bridge payments may take additional time to complete</li>
                <li>• Transaction hashes will be provided for verification</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
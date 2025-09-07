import React, { useState } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useI18n } from '../../contexts/I18nContext';
import { useWeb3 } from '../../contexts/Web3Context';
import { ACTIVATION_BUTTONS, PRIMARY_NETWORK_INFO } from '../../lib/web3/network-config';
import { updatedApiClient } from '../../lib/apiClientUpdated';
import { MultiChainPaymentSelector } from '../payment/MultiChainPaymentSelector';
import { type PaymentResult } from '../../lib/web3/multi-chain-payment';
import { 
  Crown, 
  Network, 
  TestTube, 
  CheckCircle, 
  ExternalLink,
  CreditCard,
  Users,
  Loader2,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

interface ArbitrumMembershipActivationProps {
  onSuccess: () => void;
  referrerWallet?: string;
  className?: string;
}

type ActivationMethod = 'mainnet' | 'testnet' | 'simulation';

interface ActivationState {
  method: ActivationMethod | null;
  loading: boolean;
  error: string | null;
  txHash?: string;
  showPayment: boolean;
  paymentCompleted: boolean;
}

/**
 * Arbitrum Membership Activation Component
 * Implements the exact activation flow from MarketingPlan.md:
 * - Mainnet (Arbitrum One)
 * - Testnet (Arbitrum Sepolia) 
 * - Simulation button (for testing)
 * Total cost: 130 USDC (100 USDC NFT + 30 USDC activation fee)
 */
export function ArbitrumMembershipActivation({ 
  onSuccess, 
  referrerWallet,
  className = "" 
}: ArbitrumMembershipActivationProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const account = useActiveAccount();
  const { checkMembershipStatus } = useWeb3();
  
  const [activationState, setActivationState] = useState<ActivationState>({
    method: null,
    loading: false,
    error: null,
    showPayment: false,
    paymentCompleted: false
  });

  // Handle activation button click - shows payment selector for mainnet/testnet
  const handleActivation = async (method: ActivationMethod) => {
    if (!account?.address) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }

    if (method === 'simulation') {
      // Process simulation immediately
      await processActivation(method);
    } else {
      // Show payment selector for mainnet/testnet
      setActivationState({
        method,
        loading: false,
        error: null,
        showPayment: true,
        paymentCompleted: false
      });
    }
  };

  // Handle successful payment from MultiChainPaymentSelector
  const handlePaymentSuccess = async (paymentResult: PaymentResult) => {
    if (!activationState.method) return;
    
    setActivationState(prev => ({
      ...prev,
      paymentCompleted: true,
      txHash: paymentResult.transactionHash
    }));

    // Process activation after successful payment
    await processActivation(activationState.method, paymentResult);
  };

  // Handle payment error
  const handlePaymentError = (error: string) => {
    setActivationState(prev => ({
      ...prev,
      error: error
    }));

    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive"
    });
  };

  // Go back to method selection
  const handleBackToSelection = () => {
    setActivationState({
      method: null,
      loading: false,
      error: null,
      showPayment: false,
      paymentCompleted: false
    });
  };

  // Process activation after payment or for simulation
  const processActivation = async (method: ActivationMethod, paymentResult?: PaymentResult) => {
    setActivationState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Step 1: Register user if not exists (preserves wallet case as required)
      const registerResult = await updatedApiClient.authenticateUser(account.address);
      
      if (!registerResult.success) {
        console.warn('Registration warning:', registerResult.error);
      }

      // Step 2: Process NFT upgrade to Level 1 according to MarketingPlan.md
      // All three methods follow the same activation logic
      const upgradeData = {
        level: 1, // NFT Level 1 as per MarketingPlan.md
        transactionHash: method === 'simulation' 
          ? `0x${Date.now().toString(16)}` // Generate demo hash for simulation
          : paymentResult?.transactionHash || `0x${Date.now().toString(16)}`, // Use actual payment tx hash
        payment_amount_usdc: method === 'simulation' ? 0 : 130, // 130 USDC total cost
        paymentMethod: method,
        network: method === 'mainnet' ? 'arbitrum' : 'arbitrumSepolia',
        paymentChain: paymentResult?.sourceChain || (method === 'mainnet' ? 'arbitrum' : 'arbitrumSepolia'),
        bridged: paymentResult?.bridged || false
      };

      const activationResult = await updatedApiClient.processNFTUpgrade(
        account.address,
        upgradeData
      );

      if (activationResult.success) {
        // Success notification
        toast({
          title: "🎉 Membership Activated!",
          description: `Level 1 NFT claimed successfully on ${getMethodDisplayName(method)}`,
          duration: 5000
        });

        // Update transaction hash if available
        if (activationResult.data?.nft?.transactionHash) {
          setActivationState(prev => ({
            ...prev,
            txHash: activationResult.data!.nft!.transactionHash
          }));
        }

        // Refresh membership status and notify parent
        await checkMembershipStatus();
        onSuccess();
      } else {
        throw new Error(activationResult.error || 'Activation failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setActivationState(prev => ({
        ...prev,
        error: errorMessage
      }));

      toast({
        title: "Activation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setActivationState(prev => ({ ...prev, loading: false }));
    }
  };

  const getMethodDisplayName = (method: ActivationMethod): string => {
    switch (method) {
      case 'mainnet': return 'Arbitrum One';
      case 'testnet': return 'Arbitrum Sepolia';
      case 'simulation': return 'Simulation Mode';
      default: return 'Unknown';
    }
  };

  const getMethodIcon = (method: ActivationMethod) => {
    switch (method) {
      case 'mainnet': return <Crown className="h-5 w-5" />;
      case 'testnet': return <Network className="h-5 w-5" />;
      case 'simulation': return <TestTube className="h-5 w-5" />;
      default: return <Crown className="h-5 w-5" />;
    }
  };

  const getMethodColor = (method: ActivationMethod) => {
    switch (method) {
      case 'mainnet': return 'text-honey border-honey/20';
      case 'testnet': return 'text-blue-400 border-blue-400/20';
      case 'simulation': return 'text-green-400 border-green-400/20';
      default: return 'text-honey border-honey/20';
    }
  };

  const getButtonColor = (method: ActivationMethod) => {
    switch (method) {
      case 'mainnet': return 'bg-honey hover:bg-honey/90 text-black';
      case 'testnet': return 'bg-blue-500 hover:bg-blue-500/90 text-white';
      case 'simulation': return 'bg-green-500 hover:bg-green-500/90 text-white';
      default: return 'bg-honey hover:bg-honey/90 text-black';
    }
  };

  // Show payment selector for mainnet/testnet activations
  if (activationState.showPayment && (activationState.method === 'mainnet' || activationState.method === 'testnet')) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToSelection}
            className="flex items-center gap-2 text-muted-foreground hover:text-honey"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Methods
          </Button>
        </div>

        <div className="text-center mb-6">
          <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30 mb-4">
            {getMethodDisplayName(activationState.method)} Payment
          </Badge>
          <h2 className="text-2xl font-bold text-honey mb-2">
            Complete Your Activation
          </h2>
          <p className="text-muted-foreground">
            Pay 130 USDC to activate Level 1 membership
          </p>
        </div>

        {/* Multi-chain payment selector */}
        <MultiChainPaymentSelector
          amount={130}
          paymentPurpose="membership_activation"
          level={1}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
        />

        {/* Loading state during activation processing */}
        {activationState.paymentCompleted && activationState.loading && (
          <Card className="bg-muted/30 border-muted">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-honey" />
                <span className="text-honey font-medium">Processing activation...</span>
              </div>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Confirming your membership and setting up rewards...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {activationState.error && (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Activation Error</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {activationState.error}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Section */}
      <div className="text-center">
        <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30 mb-4">
          Choose Activation Method
        </Badge>
        <h2 className="text-2xl font-bold text-honey mb-2">
          Claim NFT Token ID 1
        </h2>
        <p className="text-muted-foreground">
          All methods activate Level 1 membership with identical rewards
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Total Cost: 130 USDC (100 USDC NFT + 30 USDC activation fee)
        </p>
      </div>

      {/* Activation Buttons - Exactly as specified in MarketingPlan.md */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Mainnet (Arbitrum One) */}
        <Card className={`${getMethodColor('mainnet')} hover:border-honey/40 transition-colors`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-honey">
              {getMethodIcon('mainnet')}
              Mainnet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
                Arbitrum One
              </Badge>
              <p className="text-sm text-muted-foreground">
                Activate on Arbitrum One mainnet. Real USDC required.
              </p>
              <div className="text-lg font-semibold text-honey">
                130 USDC
              </div>
            </div>
            <Button 
              onClick={() => handleActivation('mainnet')}
              disabled={activationState.loading}
              className={`w-full ${getButtonColor('mainnet')}`}
            >
              {activationState.loading && activationState.method === 'mainnet' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <Crown className="mr-2 h-4 w-4" />
                  Activate Mainnet
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 2. Testnet (Arbitrum Sepolia) */}
        <Card className={`${getMethodColor('testnet')} hover:border-blue-400/40 transition-colors`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-400">
              {getMethodIcon('testnet')}
              Testnet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                Arbitrum Sepolia
              </Badge>
              <p className="text-sm text-muted-foreground">
                Activate on Arbitrum Sepolia testnet. Test USDC used.
              </p>
              <div className="text-lg font-semibold text-blue-400">
                130 Test USDC
              </div>
            </div>
            <Button 
              onClick={() => handleActivation('testnet')}
              disabled={activationState.loading}
              className={`w-full ${getButtonColor('testnet')}`}
            >
              {activationState.loading && activationState.method === 'testnet' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <Network className="mr-2 h-4 w-4" />
                  Activate Testnet
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 3. Simulation button (for testing) */}
        <Card className={`${getMethodColor('simulation')} hover:border-green-400/40 transition-colors`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-400">
              {getMethodIcon('simulation')}
              Simulation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                For Testing
              </Badge>
              <p className="text-sm text-muted-foreground">
                Simulate activation for testing purposes. No payment required.
              </p>
              <div className="text-lg font-semibold text-green-400">
                FREE
              </div>
            </div>
            <Button 
              onClick={() => handleActivation('simulation')}
              disabled={activationState.loading}
              className={`w-full ${getButtonColor('simulation')}`}
            >
              {activationState.loading && activationState.method === 'simulation' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Simulating...
                </>
              ) : (
                <>
                  <TestTube className="mr-2 h-4 w-4" />
                  Simulate Activation
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Referrer Information */}
      {referrerWallet && (
        <Card className="bg-muted/30 border-muted">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-honey" />
              <span className="text-sm font-medium text-honey">Referrer Information</span>
            </div>
            <div className="text-sm text-muted-foreground">
              <span>Referred by: </span>
              <code className="bg-muted px-2 py-1 rounded text-xs">
                {referrerWallet.slice(0, 6)}...{referrerWallet.slice(-4)}
              </code>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              You'll be placed in your referrer's matrix and they'll earn rewards from your activation.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current Primary Network Status */}
      <Card className="bg-muted/30 border-muted">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <Network className="h-4 w-4 text-honey" />
            <span className="text-sm font-medium text-honey">Primary Network Status</span>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>Current Environment: <span className="text-honey">{PRIMARY_NETWORK_INFO.isTestnet ? 'Development' : 'Production'}</span></div>
            <div>Primary Network: <span className="text-honey">{PRIMARY_NETWORK_INFO.displayName}</span></div>
            <div>Chain ID: <span className="text-honey">{PRIMARY_NETWORK_INFO.chain.id}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {activationState.error && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Activation Failed</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {activationState.error}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Success Display with Transaction Hash */}
      {activationState.txHash && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Activation Successful</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Transaction: <code className="bg-muted px-2 py-1 rounded text-xs">{activationState.txHash}</code>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Footer Information */}
      <div className="text-center text-xs text-muted-foreground space-y-1">
        <p>🎯 All activation methods provide Level 1 membership with NFT Token ID 1</p>
        <p>💰 Rewards: 500 BCC transferable + 10,350 BCC locked + referral bonuses</p>
        <p>📊 Matrix System: 3×3 referral structure with 19 layers of rewards</p>
      </div>
    </div>
  );
}
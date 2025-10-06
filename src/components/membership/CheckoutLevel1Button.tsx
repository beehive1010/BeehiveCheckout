import { useState, useEffect } from 'react';
import { useActiveAccount, useActiveWalletChain, useSwitchActiveWalletChain } from 'thirdweb/react';
import { getContract, prepareContractCall, sendAndConfirmTransaction } from 'thirdweb';
import { arbitrum } from 'thirdweb/chains';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { client } from '../../lib/thirdwebClient';
import { useToast } from '../../hooks/use-toast';
import { useI18n } from '../../contexts/I18nContext';
import { Crown, Loader2, Check, AlertCircle, Zap, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import RegistrationModal from '../modals/RegistrationModal';

interface CheckoutLevel1ButtonProps {
  referrerWallet?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export function CheckoutLevel1Button({
  referrerWallet,
  onSuccess,
  onError,
  className = ''
}: CheckoutLevel1ButtonProps) {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const switchChain = useSwitchActiveWalletChain();
  const { toast } = useToast();
  const { t } = useI18n();

  const [isRegistered, setIsRegistered] = useState(false);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true);
  const [hasNFT, setHasNFT] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);

  const USDT_CONTRACT = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'; // Arbitrum USDT
  const SERVER_WALLET = import.meta.env.VITE_SERVER_WALLET_ADDRESS || '0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c'; // Server wallet address
  const LEVEL_1_PRICE_USDT = 130;
  const LEVEL_1_PRICE_WEI = BigInt(LEVEL_1_PRICE_USDT) * BigInt('1000000'); // 6 decimals - 130000000
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';

  // Debug: Log the transfer amount
  console.log('💰 CheckoutLevel1Button - Transfer amount:', {
    LEVEL_1_PRICE_USDT,
    LEVEL_1_PRICE_WEI: LEVEL_1_PRICE_WEI.toString(),
    SERVER_WALLET
  });

  // Check network status
  useEffect(() => {
    if (activeChain?.id && activeChain.id !== arbitrum.id) {
      setIsWrongNetwork(true);
    } else {
      setIsWrongNetwork(false);
    }
  }, [activeChain?.id]);

  // Check user registration and NFT ownership
  useEffect(() => {
    if (account?.address) {
      checkRegistration();
      checkNFTOwnership();
    }
  }, [account?.address]);

  const checkRegistration = async () => {
    if (!account?.address) return;

    setIsCheckingRegistration(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('wallet_address, username')
        .ilike('wallet_address', account.address)
        .single();

      if (data && !error) {
        setIsRegistered(true);
        console.log('✅ User registered:', data.username);
      } else {
        setIsRegistered(false);
        console.log('⚠️ User not registered');
      }
    } catch (error) {
      console.error('Error checking registration:', error);
      setIsRegistered(false);
    } finally {
      setIsCheckingRegistration(false);
    }
  };

  const checkNFTOwnership = async () => {
    if (!account?.address) return;

    try {
      const response = await fetch(`${API_BASE}/activate-membership`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'x-wallet-address': account.address
        },
        body: JSON.stringify({
          action: 'check-nft-ownership',
          level: 1
        })
      });

      const result = await response.json();
      if (result.success && result.hasNFT) {
        setHasNFT(true);
        console.log('✅ User already owns Level 1 NFT');
      }
    } catch (error) {
      console.warn('Failed to check NFT ownership:', error);
    }
  };

  const handleSwitchNetwork = async () => {
    if (!switchChain) return;

    try {
      setIsProcessing(true);
      await switchChain(arbitrum);
      toast({
        title: t('wallet.networkSwitched'),
        description: t('wallet.networkSwitchedDesc'),
        variant: "default",
      });
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      toast({
        title: t('wallet.networkSwitchFailed'),
        description: error.message || t('wallet.networkSwitchFailedDesc'),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async (result: any) => {
    console.log('💰 Payment transaction confirmed:', result);

    toast({
      title: '✅ Payment Received',
      description: 'Processing NFT claim via server wallet...',
      duration: 5000
    });

    setIsProcessing(true);

    try {
      // Call checkout-payment Edge Function
      const response = await fetch(`${API_BASE}/checkout-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
        },
        body: JSON.stringify({
          userWallet: account?.address,
          referrerWallet: referrerWallet,
          paymentTxHash: result.transactionHash,
          level: 1
        })
      });

      const checkoutResult = await response.json();

      if (checkoutResult.success) {
        toast({
          title: '🎉 Level 1 NFT Claimed!',
          description: 'Welcome to BEEHIVE! Redirecting to dashboard...',
          variant: "default",
          duration: 5000
        });

        console.log('✅ Checkout completed:', checkoutResult);

        onSuccess?.();

        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } else {
        throw new Error(checkoutResult.error || 'Checkout processing failed');
      }
    } catch (error: any) {
      console.error('❌ Checkout error:', error);
      toast({
        title: '⚠️ Processing Error',
        description: error.message || 'Failed to process payment. Please contact support.',
        variant: 'destructive',
        duration: 8000
      });
      onError?.(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentError = (error: any) => {
    console.error('❌ Payment transaction error:', error);

    const errorMessage = error?.message || 'Payment failed';
    toast({
      title: 'Payment Failed',
      description: errorMessage,
      variant: 'destructive',
      duration: 5000
    });

    onError?.(errorMessage);
  };

  if (!account) {
    return (
      <Card className={`border-yellow-500/30 bg-yellow-500/5 ${className}`}>
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
          <p className="text-yellow-400 font-semibold">Connect Wallet to Continue</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please connect your wallet to purchase Level 1 NFT
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isCheckingRegistration) {
    return (
      <Card className={className}>
        <CardContent className="pt-6 text-center">
          <Loader2 className="h-12 w-12 text-honey mx-auto mb-3 animate-spin" />
          <p className="text-muted-foreground">Checking registration status...</p>
        </CardContent>
      </Card>
    );
  }

  const handleRegistrationComplete = () => {
    console.log('✅ Registration completed');
    setShowRegistrationModal(false);
    // Recheck registration status
    setTimeout(() => {
      checkRegistration();
    }, 1000);
  };

  if (!isRegistered) {
    return (
      <>
        <Card className={`border-yellow-500/30 bg-yellow-500/5 ${className}`}>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
            <p className="text-yellow-400 font-semibold">Registration Required</p>
            <p className="text-sm text-muted-foreground mt-2 mb-4">
              Please complete registration before purchasing NFT
            </p>
            <Button
              onClick={() => setShowRegistrationModal(true)}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Register Now
            </Button>
          </CardContent>
        </Card>

        {account?.address && (
          <RegistrationModal
            isOpen={showRegistrationModal}
            onClose={() => setShowRegistrationModal(false)}
            walletAddress={account.address}
            referrerWallet={referrerWallet}
            onRegistrationComplete={handleRegistrationComplete}
          />
        )}
      </>
    );
  }

  if (hasNFT) {
    return (
      <Card className={`border-green-500/30 bg-green-500/5 ${className}`}>
        <CardContent className="pt-6 text-center">
          <Check className="h-12 w-12 text-green-400 mx-auto mb-3" />
          <p className="text-green-400 font-semibold">Already Own Level 1 NFT</p>
          <p className="text-sm text-muted-foreground mt-2">
            You already have Level 1 membership activated
          </p>
        </CardContent>
      </Card>
    );
  }

  const usdtContract = getContract({
    client,
    address: USDT_CONTRACT,
    chain: arbitrum
  });

  // Prepare USDT transfer to server wallet
  const prepareTransferTransaction = () => {
    return prepareContractCall({
      contract: usdtContract,
      method: "function transfer(address to, uint256 amount) returns (bool)",
      params: [
        SERVER_WALLET as `0x${string}`,
        LEVEL_1_PRICE_WEI
      ]
    });
  };

  // Handle payment with manual transaction sending
  const handlePayment = async () => {
    if (!account?.address || isProcessing) return;

    setIsProcessing(true);
    try {
      console.log('💰 Preparing USDT transfer:', {
        from: account.address,
        to: SERVER_WALLET,
        amount: LEVEL_1_PRICE_WEI.toString(),
        amountInUSDT: LEVEL_1_PRICE_USDT
      });

      toast({
        title: '💳 Confirm Payment',
        description: `Please confirm the ${LEVEL_1_PRICE_USDT} USDT payment in your wallet`,
        duration: 5000
      });

      const transferTx = prepareTransferTransaction();
      const result = await sendAndConfirmTransaction({
        transaction: transferTx,
        account: account
      });

      console.log('✅ Payment confirmed:', result.transactionHash);
      await handlePaymentSuccess(result);

    } catch (error: any) {
      console.error('❌ Payment error:', error);
      handlePaymentError(error);
    }
  };

  // Debug: Log transaction details
  console.log('🔍 Transfer Transaction Details:', {
    contract: USDT_CONTRACT,
    to: SERVER_WALLET,
    amount: LEVEL_1_PRICE_WEI.toString(),
    amountInUSDT: LEVEL_1_PRICE_USDT,
    decimals: 6
  });

  return (
    <Card className={`bg-gradient-to-br from-honey/5 to-honey/15 border-honey/30 ${className}`}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-honey" />
            <CardTitle className="text-lg sm:text-xl">Level 1 NFT Purchase</CardTitle>
          </div>
          <Badge className="bg-honey/20 text-honey border-honey/50 w-fit">
            {LEVEL_1_PRICE_USDT} USDT
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Checkout Flow Info */}
        <div className="p-3 sm:p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 flex-shrink-0" />
            <p className="text-xs sm:text-sm font-medium text-blue-400">Secure Server Wallet Checkout</p>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <ArrowRight className="h-3 w-3 text-blue-400 flex-shrink-0 mt-0.5" />
              <span>1. You pay 130 USDT to secure server wallet</span>
            </div>
            <div className="flex items-start gap-2">
              <ArrowRight className="h-3 w-3 text-blue-400 flex-shrink-0 mt-0.5" />
              <span>2. Server wallet claims NFT directly to your wallet</span>
            </div>
            <div className="flex items-start gap-2">
              <ArrowRight className="h-3 w-3 text-blue-400 flex-shrink-0 mt-0.5" />
              <span>3. 30 USDT platform fee sent to admin (100 USDT for NFT)</span>
            </div>
            <div className="flex items-start gap-2">
              <ArrowRight className="h-3 w-3 text-blue-400 flex-shrink-0 mt-0.5" />
              <span>4. Automatic membership activation</span>
            </div>
          </div>
        </div>

        {/* Wrong Network Warning */}
        {isWrongNetwork && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-yellow-800">Wrong Network</span>
            </div>
            <p className="text-xs text-yellow-700 mb-3">
              Switch to Arbitrum One to continue
            </p>
            <Button
              onClick={handleSwitchNetwork}
              disabled={isProcessing}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
              size="sm"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Switching...
                </>
              ) : (
                'Switch to Arbitrum One'
              )}
            </Button>
          </div>
        )}

        {/* Payment Amount Display */}
        {!isWrongNetwork && (
          <div className="p-3 sm:p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">Payment Amount:</span>
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{LEVEL_1_PRICE_USDT}</span>
                <span className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">USDT</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground break-all sm:break-normal">
              Transfer to: {SERVER_WALLET.slice(0, 6)}...{SERVER_WALLET.slice(-4)}
            </div>
          </div>
        )}

        {/* Payment Button */}
        {!isWrongNetwork && (
          <Button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-honey to-orange-500 hover:from-honey/90 hover:to-orange-500/90 text-white font-semibold py-4 sm:py-6 text-base sm:text-lg rounded-lg transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Crown className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Pay {LEVEL_1_PRICE_USDT} USDT
              </>
            )}
          </Button>
        )}

        {/* Additional Info */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>💳 USDT payment on Arbitrum One</p>
          <p>🔒 Secure server wallet processing</p>
          <p>⚡ Instant NFT delivery to your wallet</p>
          <p>✅ Automatic membership activation</p>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useActiveAccount, useActiveWalletChain, useSwitchActiveWalletChain } from 'thirdweb/react';
import { getContract, prepareContractCall, sendTransaction, waitForReceipt } from 'thirdweb';
import { arbitrum } from 'thirdweb/chains';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { client } from '../../lib/thirdwebClient';
import { useToast } from '../../hooks/use-toast';
import { useI18n } from '../../contexts/I18nContext';
import { Crown, Loader2, Check, AlertCircle } from 'lucide-react';
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
  // ===== ALL HOOKS MUST BE CALLED UNCONDITIONALLY =====
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

  // Constants
  const USDT_CONTRACT = '0x6B174f1f3B7f92E048f0f15FD2b22c167DA6F008';
  const SERVER_WALLET = import.meta.env.VITE_SERVER_WALLET_ADDRESS || '0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c';
  const LEVEL_1_PRICE_USDT = 130;
  const LEVEL_1_PRICE_WEI = BigInt(LEVEL_1_PRICE_USDT) * BigInt('1000000');
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';

  // Check network status
  useEffect(() => {
    if (activeChain?.id && activeChain.id !== arbitrum.id) {
      setIsWrongNetwork(true);
    } else {
      setIsWrongNetwork(false);
    }
  }, [activeChain?.id]);

  // Check registration
  const checkRegistration = useCallback(async () => {
    if (!account?.address) return;

    setIsCheckingRegistration(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('wallet_address, username')
        .ilike('wallet_address', account.address)
        .single();

      setIsRegistered(data && !error);
    } catch (error) {
      setIsRegistered(false);
    } finally {
      setIsCheckingRegistration(false);
    }
  }, [account?.address]);

  // Check NFT ownership
  const checkNFTOwnership = useCallback(async () => {
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
      }
    } catch (error) {
      console.warn('Failed to check NFT ownership:', error);
    }
  }, [account?.address, API_BASE]);

  // Run checks when account changes
  useEffect(() => {
    if (account?.address) {
      checkRegistration();
      checkNFTOwnership();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.address]);

  // Registration complete handler
  const handleRegistrationComplete = useCallback(() => {
    setShowRegistrationModal(false);
    setTimeout(() => checkRegistration(), 1000);
  }, [checkRegistration]);

  // ===== ALL HOOKS ABOVE THIS LINE =====
  // ===== CONDITIONAL RENDERING BELOW =====

  // Render states
  let content = null;

  if (!account) {
    content = (
      <Card className={`border-yellow-500/30 bg-yellow-500/5 ${className}`}>
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
          <p className="text-yellow-400 font-semibold">Connect Wallet to Continue</p>
        </CardContent>
      </Card>
    );
  } else if (isCheckingRegistration) {
    content = (
      <Card className={className}>
        <CardContent className="pt-6 text-center">
          <Loader2 className="h-12 w-12 text-honey mx-auto mb-3 animate-spin" />
          <p className="text-muted-foreground">Checking registration status...</p>
        </CardContent>
      </Card>
    );
  } else if (!isRegistered) {
    content = (
      <>
        <Card className={`border-yellow-500/30 bg-yellow-500/5 ${className}`}>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
            <p className="text-yellow-400 font-semibold">Registration Required</p>
            <Button
              onClick={() => setShowRegistrationModal(true)}
              className="w-full mt-4 bg-yellow-600 hover:bg-yellow-700 text-white"
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
  } else if (hasNFT) {
    content = (
      <Card className={`border-green-500/30 bg-green-500/5 ${className}`}>
        <CardContent className="pt-6 text-center">
          <Check className="h-12 w-12 text-green-400 mx-auto mb-3" />
          <p className="text-green-400 font-semibold">Already Own Level 1 NFT</p>
        </CardContent>
      </Card>
    );
  } else {
    // Main payment UI
    const handlePayment = async () => {
      if (!account?.address || isProcessing) return;

      setIsProcessing(true);
      try {
        toast({
          title: '💳 Confirm Payment',
          description: `Please confirm the ${LEVEL_1_PRICE_USDT} USDT payment`,
          duration: 5000
        });

        const usdtContract = getContract({
          client,
          address: USDT_CONTRACT,
          chain: arbitrum
        });

        const transferTx = prepareContractCall({
          contract: usdtContract,
          method: "function transfer(address to, uint256 amount) returns (bool)",
          params: [SERVER_WALLET as `0x${string}`, LEVEL_1_PRICE_WEI]
        });

        const txHash = await sendTransaction({
          transaction: transferTx,
          account: account
        });

        toast({
          title: '⏳ Transaction Pending',
          description: 'Waiting for confirmation...',
          duration: 3000
        });

        await waitForReceipt({
          client,
          chain: arbitrum,
          transactionHash: txHash
        });

        // Call checkout-payment
        const response = await fetch(`${API_BASE}/checkout-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            userWallet: account.address,
            referrerWallet: referrerWallet,
            paymentTxHash: txHash,
            level: 1
          })
        });

        const result = await response.json();

        if (result.success) {
          toast({
            title: '🎉 Level 1 NFT Claimed!',
            description: 'Redirecting to dashboard...',
            duration: 5000
          });
          onSuccess?.();
          setTimeout(() => window.location.href = '/dashboard', 2000);
        } else {
          throw new Error(result.error || 'Checkout failed');
        }
      } catch (error: any) {
        toast({
          title: 'Payment Failed',
          description: error.message,
          variant: 'destructive'
        });
        onError?.(error.message);
      } finally {
        setIsProcessing(false);
      }
    };

    content = (
      <Card className={`bg-gradient-to-br from-honey/5 to-honey/15 border-honey/30 ${className}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-honey" />
              <CardTitle>Level 1 Membership</CardTitle>
            </div>
            <Badge className="bg-honey/20 text-honey">{LEVEL_1_PRICE_USDT} USDT</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isWrongNetwork && switchChain && (
            <Button
              onClick={() => switchChain(arbitrum)}
              className="w-full mb-4 bg-yellow-600"
            >
              Switch to Arbitrum
            </Button>
          )}
          {!isWrongNetwork && (
            <Button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-honey to-orange-500"
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Processing...</>
              ) : (
                <><Crown className="mr-2 h-5 w-5" />Pay {LEVEL_1_PRICE_USDT} USDT</>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return content;
}

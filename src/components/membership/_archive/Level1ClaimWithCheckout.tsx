import { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { CheckoutWidget } from 'thirdweb/react';
import { createThirdwebClient, defineChain } from 'thirdweb';
import { arbitrum } from 'thirdweb/chains';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { useI18n } from '../../contexts/I18nContext';
import { Crown, Loader2, Check, AlertCircle, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface Level1ClaimWithCheckoutProps {
  referrerWallet?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export function Level1ClaimWithCheckout({
  referrerWallet,
  onSuccess,
  onError,
  className = ''
}: Level1ClaimWithCheckoutProps) {
  const account = useActiveAccount();
  const { toast } = useToast();
  const { t } = useI18n();

  const [isRegistered, setIsRegistered] = useState(false);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true);
  const [hasNFT, setHasNFT] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const LEVEL_1_PRICE_USDT = 130;
  const SERVER_WALLET = import.meta.env.VITE_SERVER_WALLET_ADDRESS || '0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c';
  const USDT_CONTRACT = '0x6B174f1f3B7f92E048f0f15FD2b22c167DA6F008';
  const THIRDWEB_CLIENT_ID = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

  const client = createThirdwebClient({
    clientId: THIRDWEB_CLIENT_ID,
  });

  // Check user registration
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
        .eq('wallet_address', account.address.toLowerCase())
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
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/activate-membership`,
        {
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
        }
      );

      const result = await response.json();
      if (result.success && result.hasNFT) {
        setHasNFT(true);
        console.log('✅ User already owns Level 1 NFT');
      }
    } catch (error) {
      console.warn('Failed to check NFT ownership:', error);
    }
  };

  const handlePaymentSuccess = async (paymentResult: any) => {
    console.log('🎉 Payment received:', paymentResult);

    toast({
      title: '💳 Payment Received!',
      description: 'Processing NFT minting...',
      duration: 5000
    });

    // Call backend to mint and send NFT
    try {
      const mintResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mint-and-send-nft`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'x-wallet-address': account?.address || ''
          },
          body: JSON.stringify({
            recipientAddress: account?.address,
            level: 1,
            paymentTransactionHash: paymentResult.transactionHash,
            paymentAmount: LEVEL_1_PRICE_USDT,
            referrerWallet: referrerWallet
          })
        }
      );

      if (mintResponse.ok) {
        const mintResult = await mintResponse.json();
        console.log('✅ NFT minted and sent:', mintResult);

        toast({
          title: '✅ NFT Sent!',
          description: 'Welcome to BEEHIVE Level 1',
          duration: 5000
        });

        setShowPayEmbed(false);
        onSuccess?.();
      } else {
        throw new Error('Minting failed');
      }
    } catch (error) {
      console.error('Minting error:', error);
      toast({
        title: '⚠️ Minting Pending',
        description: 'Payment received, but NFT minting is processing. Please refresh in a moment.',
        duration: 8000
      });
    }
  };

  if (!account) {
    return (
      <Card className={`border-yellow-500/30 bg-yellow-500/5 ${className}`}>
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
          <p className="text-yellow-400 font-semibold">Connect Wallet to Claim</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please connect your wallet to claim Level 1 NFT
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
          <p className="text-muted-foreground">Checking registration...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isRegistered) {
    return (
      <Card className={`border-red-500/30 bg-red-500/5 ${className}`}>
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-semibold">Registration Required</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please complete registration before claiming NFT
          </p>
        </CardContent>
      </Card>
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

  return (
    <Card className={`bg-gradient-to-br from-honey/5 to-honey/15 border-honey/30 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-honey" />
            <CardTitle className="text-xl">Level 1 NFT (Checkout Test)</CardTitle>
          </div>
          <Badge className="bg-honey/20 text-honey border-honey/50">
            {LEVEL_1_PRICE_USDT} USDT
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Info Box */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <Zap className="h-4 w-4 text-blue-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-400">Pay with Checkout Widget</p>
              <p className="text-xs text-muted-foreground mt-1">
                Server wallet will mint and send NFT to you after payment confirmation
              </p>
            </div>
          </div>
        </div>

        {/* Checkout Widget */}
        <div className="flex justify-center">
          <CheckoutWidget
            client={client}
            image="https://beehive1010.github.io/level1.png"
            name="BEEHIVE Level 1 Membership"
            currency="USD"
            chain={defineChain(42161)}
            amount={LEVEL_1_PRICE_USDT.toString()}
            tokenAddress={USDT_CONTRACT}
            seller={SERVER_WALLET}
            buttonLabel="CLAIM LEVEL 1 NFT"
            onTransactionSuccess={handlePaymentSuccess}
            onError={(error) => {
              console.error('Payment error:', error);
              toast({
                title: 'Payment Failed',
                description: error.message || 'Please try again',
                variant: 'destructive'
              });
              onError?.(error.message || 'Payment failed');
            }}
          />
        </div>

        {/* Payment Info */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>💳 Multi-chain payment supported</p>
          <p>🤖 Server mints and sends NFT</p>
          <p>⚡ Automatic membership activation</p>
          <p>✅ One-click process</p>
        </div>
      </CardContent>
    </Card>
  );
}

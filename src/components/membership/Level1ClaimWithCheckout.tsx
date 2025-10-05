import { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { PayEmbed } from 'thirdweb/react';
import { createThirdwebClient } from 'thirdweb';
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
  const [showPayEmbed, setShowPayEmbed] = useState(false);

  const LEVEL_1_PRICE_USDT = 130;
  const SERVER_WALLET = import.meta.env.VITE_SERVER_WALLET_ADDRESS || '0x0bA198F73DF3A1374a49Acb2c293ccA20e150Fe0';
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
        {!showPayEmbed ? (
          <>
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

            {/* Start Payment Button */}
            <Button
              onClick={() => setShowPayEmbed(true)}
              className="w-full bg-gradient-to-r from-honey to-orange-500 hover:from-honey/90 hover:to-orange-500/90 text-white font-semibold py-3 rounded-lg transition-all"
            >
              <Crown className="h-5 w-5 mr-2" />
              Pay {LEVEL_1_PRICE_USDT} USDT
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <PayEmbed
              client={client}
              payOptions={{
                mode: 'direct_payment',
                paymentInfo: {
                  amount: LEVEL_1_PRICE_USDT.toString(),
                  chain: arbitrum,
                  token: {
                    address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // USDT
                    symbol: 'USDT',
                    decimals: 6
                  },
                  sellerAddress: SERVER_WALLET
                },
                metadata: {
                  level: '1',
                  buyer: account.address,
                  referrer: referrerWallet || 'none'
                }
              }}
              onPaymentSuccess={handlePaymentSuccess}
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

            <Button
              variant="outline"
              onClick={() => setShowPayEmbed(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Payment Info */}
        {!showPayEmbed && (
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>💳 Multi-chain payment supported</p>
            <p>🤖 Server mints and sends NFT</p>
            <p>⚡ Automatic membership activation</p>
            <p>✅ One-click process</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

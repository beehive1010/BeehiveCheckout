import { useState, useEffect } from 'react';
import { TransactionButton, useActiveAccount } from 'thirdweb/react';
import { getContract, prepareContractCall } from 'thirdweb';
import { arbitrumSepolia } from 'thirdweb/chains';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { client } from '../../lib/thirdwebClient';
import { useToast } from '../../hooks/use-toast';
import { useI18n } from '../../contexts/I18nContext';
import { Crown, Loader2, Check, AlertCircle, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface Level1ClaimButtonWithPayModalProps {
  referrerWallet?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export function Level1ClaimButtonWithPayModal({
  referrerWallet,
  onSuccess,
  onError,
  className = ''
}: Level1ClaimButtonWithPayModalProps) {
  const account = useActiveAccount();
  const { toast } = useToast();
  const { t } = useI18n();

  const [isRegistered, setIsRegistered] = useState(false);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true);
  const [hasNFT, setHasNFT] = useState(false);

  const NFT_CONTRACT = import.meta.env.VITE_MEMBERSHIP_NFT_CONTRACT;
  const USDT_CONTRACT = '0xb67f84e6148D087D4fc5F390BedC75597770f6c0'; // Arbitrum USDT
  const LEVEL_1_PRICE_USDT = 130;
  const LEVEL_1_PRICE_WEI = BigInt(LEVEL_1_PRICE_USDT) * BigInt('1000000'); // 6 decimals

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
    if (!account?.address || !NFT_CONTRACT) return;

    try {
      const nftContract = getContract({
        client,
        address: NFT_CONTRACT,
        chain: arbitrumSepolia
      });

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

  const handleSuccess = async (result: any) => {
    console.log('🎉 Transaction successful:', result);

    toast({
      title: '🎉 Level 1 NFT Claimed!',
      description: 'Processing membership activation...',
      duration: 5000
    });

    // Call backend to activate membership
    try {
      const activateResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/activate-membership`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'x-wallet-address': account?.address || ''
          },
          body: JSON.stringify({
            transactionHash: result.transactionHash,
            level: 1,
            paymentMethod: 'multi_chain',
            paymentAmount: LEVEL_1_PRICE_USDT,
            referrerWallet: referrerWallet
          })
        }
      );

      if (activateResponse.ok) {
        const activateResult = await activateResponse.json();
        console.log('✅ Membership activated:', activateResult);

        toast({
          title: '✅ Membership Activated!',
          description: 'Welcome to BEEHIVE Level 1',
          duration: 5000
        });

        onSuccess?.();
      } else {
        throw new Error('Activation failed');
      }
    } catch (error) {
      console.error('Activation error:', error);
      toast({
        title: '⚠️ Activation Pending',
        description: 'NFT claimed, but activation is processing. Please refresh in a moment.',
        duration: 8000
      });
    }
  };

  const handleError = (error: any) => {
    console.error('❌ Transaction error:', error);

    const errorMessage = error?.message || 'Transaction failed';
    toast({
      title: 'Claim Failed',
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

  const nftContract = getContract({
    client,
    address: NFT_CONTRACT,
    chain: arbitrumSepolia
  });

  // Prepare claim transaction
  const claimTransaction = prepareContractCall({
    contract: nftContract,
    method: "function claim(address to, uint256 tokenId, uint256 quantity, address currency, uint256 pricePerToken) payable",
    params: [
      account.address,
      BigInt(1), // Level 1 token ID
      BigInt(1), // Quantity
      USDT_CONTRACT, // USDT currency
      LEVEL_1_PRICE_WEI // Price
    ]
  });

  return (
    <Card className={`bg-gradient-to-br from-honey/5 to-honey/15 border-honey/30 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-honey" />
            <CardTitle className="text-xl">Level 1 NFT</CardTitle>
          </div>
          <Badge className="bg-honey/20 text-honey border-honey/50">
            {LEVEL_1_PRICE_USDT} USDT
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Multi-Chain Payment Info */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <Zap className="h-4 w-4 text-blue-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-400">Multi-Chain Payment Enabled</p>
              <p className="text-xs text-muted-foreground mt-1">
                Pay with USDT from any supported chain. Thirdweb will handle the bridging automatically.
              </p>
            </div>
          </div>
        </div>

        {/* TransactionButton with PayModal */}
        <TransactionButton
          transaction={() => claimTransaction}
          onTransactionConfirmed={handleSuccess}
          onError={handleError}
          className="w-full !bg-gradient-to-r !from-honey !to-orange-500 hover:!from-honey/90 hover:!to-orange-500/90 !text-white !font-semibold !py-3 !rounded-lg !transition-all"
          // Enable Pay Modal for multi-chain support
          payModal={{
            theme: 'dark',
            // Supported chains for payment
            supportedTokens: {
              // Users can pay with USDT from these chains
              1: [{ address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', name: 'USDT', symbol: 'USDT' }], // Ethereum
              137: [{ address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', name: 'USDT', symbol: 'USDT' }], // Polygon
              42161: [{ address: USDT_CONTRACT, name: 'USDT', symbol: 'USDT' }], // Arbitrum
              10: [{ address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', name: 'USDT', symbol: 'USDT' }], // Optimism
              8453: [{ address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', name: 'USDT', symbol: 'USDT' }], // Base
              56: [{ address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', name: 'USDT', symbol: 'USDT' }], // BSC
            }
          }}
        >
          <div className="flex items-center justify-center gap-2">
            <Crown className="h-5 w-5" />
            <span>Claim Level 1 NFT - {LEVEL_1_PRICE_USDT} USDT</span>
          </div>
        </TransactionButton>

        {/* Payment Info */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>💳 Multi-chain payment supported</p>
          <p>🌉 Automatic cross-chain bridging</p>
          <p>⚡ Instant NFT minting</p>
          <p>✅ One-click activation</p>
        </div>
      </CardContent>
    </Card>
  );
}

import {useEffect, useState, useRef} from 'react';
import {useActiveAccount, useActiveWalletChain, useSwitchActiveWalletChain, CheckoutWidget} from 'thirdweb/react';
import {createThirdwebClient, defineChain} from 'thirdweb';
import {getContract} from 'thirdweb';
import {arbitrum} from 'thirdweb/chains';
import {balanceOf} from 'thirdweb/extensions/erc1155';
import {Button} from '../ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '../ui/card';
import {Badge} from '../ui/badge';
import {useToast} from '../../hooks/use-toast';
import {Clock, Coins, Crown, Loader2, Star, TrendingUp, X} from 'lucide-react';
import {supabase} from '../../lib/supabase';
import {useI18n} from '../../contexts/I18nContext';
import {client} from '../../lib/thirdwebClient';

interface Level2ClaimButtonV2Props {
  onSuccess?: () => void;
  className?: string;
}

export function Level2ClaimButtonV2({ onSuccess, className = '' }: Level2ClaimButtonV2Props): JSX.Element {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const switchChain = useSwitchActiveWalletChain();
  const { toast } = useToast();
  const { t } = useI18n();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [canClaimLevel2, setCanClaimLevel2] = useState(false);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [directReferralsCount, setDirectReferralsCount] = useState(0);
  const [alreadyOwnsLevel2, setAlreadyOwnsLevel2] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const paymentModalRef = useRef<HTMLDivElement | null>(null);

  const LEVEL_2_PRICE_USDT = 150;
  const SERVER_WALLET = import.meta.env.VITE_SERVER_WALLET_ADDRESS || '0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c';
  const USDT_CONTRACT = '0x6B174f1f3B7f92E048f0f15FD2b22c167DA6F008'; // Arbitrum Sepolia USDT
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';
  const NFT_CONTRACT = "0xe57332db0B8d7e6aF8a260a4fEcfA53104728693"; // V4 Contract on Arbitrum Sepolia

  const checkoutClient = createThirdwebClient({
    clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID || client.clientId,
  });

  // Check network status
  useEffect(() => {
    if (activeChain?.id && activeChain.id !== arbitrum.id) {
      setIsWrongNetwork(true);
    } else {
      setIsWrongNetwork(false);
    }
  }, [activeChain?.id]);

  // Check Level 2 eligibility
  useEffect(() => {
    if (account?.address) {
      checkLevel2Eligibility();
    }
  }, [account?.address]);

  const checkLevel2Eligibility = async () => {
    if (!account?.address) return;

    setIsCheckingEligibility(true);
    try {
      console.log('🔍 Checking Level 2 eligibility for:', account.address);

      // Check if user has Level 1 membership but not Level 2
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('current_level, wallet_address')
        .eq('wallet_address', account.address.toLowerCase())
        .single();

      if (memberError || !memberData) {
        console.log('❌ User not found in members table - must claim Level 1 first');
        setCanClaimLevel2(false);
        setIsCheckingEligibility(false);
        return;
      }

      if (memberData.current_level < 1) {
        console.log(`❌ User current level: ${memberData.current_level}, must claim Level 1 first`);
        setCanClaimLevel2(false);
        setIsCheckingEligibility(false);
        return;
      }

      if (memberData.current_level >= 2) {
        console.log(`✅ User already has Level ${memberData.current_level}, no need to claim Level 2`);
        setCanClaimLevel2(false);
        setAlreadyOwnsLevel2(true);
        setIsCheckingEligibility(false);
        return;
      }

      // Check direct referrals requirement
      const { getDirectReferralCount } = await import('../../lib/services/directReferralService');
      const currentDirectReferrals = await getDirectReferralCount(account.address);
      setDirectReferralsCount(currentDirectReferrals);

      const hasThreeDirectReferrals = currentDirectReferrals >= 3;

      if (!hasThreeDirectReferrals) {
        console.log(`❌ Level 2 requires 3+ direct referrals. User has ${currentDirectReferrals}`);
        setCanClaimLevel2(false);
        setIsCheckingEligibility(false);
        return;
      }

      console.log(`✅ Direct referrals check passed: ${currentDirectReferrals}/3`);

      // Check if user already owns Level 2 NFT on blockchain
      try {
        const nftContract = getContract({
          client,
          address: NFT_CONTRACT,
          chain: arbitrum
        });

        const level2Balance = await balanceOf({
          contract: nftContract,
          owner: account.address,
          tokenId: BigInt(2)
        });

        if (Number(level2Balance) > 0) {
          console.log('❌ User already owns Level 2 NFT');
          setAlreadyOwnsLevel2(true);
          setCanClaimLevel2(false);
          setIsCheckingEligibility(false);
          return;
        }
      } catch (nftCheckError) {
        console.warn('⚠️ Could not check Level 2 NFT balance:', nftCheckError);
      }

      // All checks passed
      console.log('✅ User eligible for Level 2 claim');
      setCanClaimLevel2(true);

    } catch (error) {
      console.error('❌ Error checking Level 2 eligibility:', error);
      setCanClaimLevel2(false);
    } finally {
      setIsCheckingEligibility(false);
    }
  };

  const handleSwitchNetwork = async () => {
    if (!switchChain) return;

    try {
      setIsProcessing(true);
      await switchChain(arbitrum);
      toast({
        title: 'Network Switched',
        description: 'Successfully switched to Arbitrum One',
        variant: "default",
      });
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      toast({
        title: 'Network Switch Failed',
        description: error.message || 'Could not switch to Arbitrum One. Please switch manually in your wallet.',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Get NFT contract
  const nftContract = getContract({
    client,
    address: NFT_CONTRACT,
    chain: arbitrum
  });

  // Open payment modal
  const handleClaimLevel2 = () => {
    if (!account?.address || !canClaimLevel2 || alreadyOwnsLevel2 || isWrongNetwork) {
      return;
    }
    setShowPaymentModal(true);
  };

  // Handle payment success
  const handlePaymentSuccess = async (result: any) => {
    console.log('🎉 Payment successful:', result);
    setShowPaymentModal(false);

    toast({
      title: '💳 Payment Received!',
      description: 'Processing Level 2 NFT minting...',
      duration: 5000
    });

    setIsProcessing(true);
    setCurrentStep('Minting and sending Level 2 NFT...');

    try {
      // Call level-upgrade Edge Function
      const upgradeResponse = await fetch(`${API_BASE}/level-upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'x-wallet-address': account?.address || ''
        },
        body: JSON.stringify({
          recipientAddress: account?.address,
          targetLevel: 2,
          paymentTransactionHash: result.transactionHash,
          paymentAmount: LEVEL_2_PRICE_USDT
        })
      });

      if (upgradeResponse.ok) {
        const upgradeResult = await upgradeResponse.json();
        console.log('✅ Level 2 upgrade processed:', upgradeResult);

        toast({
          title: '🎉 Level 2 Upgrade Complete!',
          description: 'NFT sent to your wallet! Layer 2 rewards processed.',
          variant: "default",
          duration: 3000,
        });

        setShowPaymentModal(false);

        if (onSuccess) {
          onSuccess();
        }

        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        throw new Error('Level 2 upgrade failed');
      }
    } catch (error) {
      console.error('❌ Level 2 upgrade error:', error);
      toast({
        title: '⚠️ Upgrade Pending',
        description: 'Payment received, processing upgrade. Please refresh in a moment.',
        duration: 8000
      });
    } finally {
      setIsProcessing(false);
      setCurrentStep('');
      checkLevel2Eligibility();
    }
  };

  return (
    <Card className={`bg-gradient-to-br from-blue/5 to-blue/15 border-blue/30 ${className}`}>
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center mb-3">
          <TrendingUp className="h-8 w-8 text-blue-400 mr-2" />
          <Badge className="bg-blue-400/20 text-blue-400 border-blue-400/50">
            Level 2 Upgrade
          </Badge>
        </div>
        <CardTitle className="text-2xl text-blue-400 mb-2">
          Claim Level 2 NFT
        </CardTitle>
        <p className="text-muted-foreground">
          Upgrade from Level 1 to Level 2 membership
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Level Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-lg border border-orange-500/20">
            <Coins className="h-6 w-6 text-orange-400 mx-auto mb-2" />
            <h3 className="font-semibold text-orange-400 mb-1">
              {LEVEL_2_PRICE_USDT} USDT
            </h3>
            <p className="text-xs text-muted-foreground">Level 2 Price</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20">
            <Crown className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <h3 className="font-semibold text-blue-400 mb-1">Level 2</h3>
            <p className="text-xs text-muted-foreground">Target Level</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg border border-purple-500/20">
            <Star className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <h3 className="font-semibold text-purple-400 mb-1">Layer 2</h3>
            <p className="text-xs text-muted-foreground">Rewards Trigger</p>
          </div>
        </div>

        {/* Direct Referrals Status */}
        <div className={`p-4 rounded-lg border ${
          directReferralsCount >= 3
            ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20'
            : 'bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${
              directReferralsCount >= 3 ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
            }`}></div>
            <span className={`text-sm font-medium ${
              directReferralsCount >= 3 ? 'text-emerald-600' : 'text-amber-600'
            }`}>
              Direct Referrals: {directReferralsCount}/3
            </span>
          </div>
          <p className={`text-xs ${
            directReferralsCount >= 3 ? 'text-emerald-600' : 'text-amber-600'
          }`}>
            {directReferralsCount >= 3
              ? '✅ Qualified for Level 2 upgrade'
              : `❌ Need ${3 - directReferralsCount} more direct referrals`
            }
          </p>
        </div>

        {/* Claim Button */}
        <div className="space-y-4">
          {/* Show network switch button if on wrong network */}
          {isWrongNetwork && account?.address && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-yellow-800">Wrong Network</span>
              </div>
              <p className="text-xs text-yellow-700 mb-3">
                You're on {activeChain?.id === 1 ? 'Ethereum Mainnet' : `Network ${activeChain?.id}`}.
                Switch to Arbitrum One to claim your Level 2 NFT.
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
                    Switching Network...
                  </>
                ) : (
                  'Switch to Arbitrum One'
                )}
              </Button>
            </div>
          )}

          {alreadyOwnsLevel2 ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-green-800 font-semibold">✅ You already own Level 2 NFT</p>
              <p className="text-xs text-green-700 mt-1">Your Level 2 membership is active</p>
            </div>
          ) : (
            <Button
              onClick={handleClaimLevel2}
              disabled={!account?.address || isWrongNetwork || !canClaimLevel2 || isCheckingEligibility || isProcessing}
              className="w-full h-12 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-400/90 hover:to-blue-600/90 text-white font-semibold text-lg shadow-lg transition-all disabled:opacity-50"
            >
              {!account?.address ? (
                <>
                  <Crown className="mr-2 h-5 w-5" />
                  Connect Wallet
                </>
              ) : isWrongNetwork ? (
                <>
                  <Crown className="mr-2 h-5 w-5" />
                  Switch Network First
                </>
              ) : isCheckingEligibility ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Checking Eligibility...
                </>
              ) : !canClaimLevel2 ? (
                <>
                  <Crown className="mr-2 h-5 w-5" />
                  Requirements Not Met
                </>
              ) : isProcessing ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Upgrade to Level 2 - {LEVEL_2_PRICE_USDT} USDT</span>
                </div>
              )}
            </Button>
          )}

          {/* Progress indicator */}
          {isProcessing && currentStep && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border/50">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-blue-400 animate-pulse" />
                <span className="text-muted-foreground">{currentStep}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Do not close this page while processing...
              </div>
            </div>
          )}
        </div>

        {/* Additional Information */}
        <div className="text-center text-xs text-muted-foreground pt-2 space-y-1">
          <p>📈 Level 1 → Level 2 upgrade</p>
          <p>💳 USDT payment on Arbitrum One</p>
          <p>⚡ Instant level activation</p>
          <p>💰 Layer 2 rewards ({LEVEL_2_PRICE_USDT} USDT) processed</p>
        </div>
      </CardContent>

      {/* CheckoutWidget Payment Modal */}
      {showPaymentModal && account?.address && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)} />
          <div ref={paymentModalRef} className="relative p-4 max-h-[min(90vh,800px)] overflow-y-auto bg-black rounded-2xl w-full max-w-[500px] min-h-[600px]">
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors"
              aria-label="Close payment modal"
            >
              <X size={24} />
            </button>
            <CheckoutWidget
              client={checkoutClient}
              image="https://beehive1010.github.io/level2.png"
              name="BEEHIVE Level 2 Membership"
              currency="USD"
              chain={defineChain(42161)}
              amount={LEVEL_2_PRICE_USDT.toString()}
              tokenAddress={USDT_CONTRACT}
              seller={SERVER_WALLET}
              buttonLabel="PAY & UPGRADE TO LEVEL 2"
              onTransactionSuccess={handlePaymentSuccess}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

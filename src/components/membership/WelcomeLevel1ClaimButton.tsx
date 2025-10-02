import {useEffect, useState, useCallback} from 'react';
import {useActiveAccount, useActiveWalletChain, useSwitchActiveWalletChain, PayEmbed} from 'thirdweb/react';
import {getContract} from 'thirdweb';
import {arbitrum} from 'thirdweb/chains';
import {balanceOf, claimTo} from 'thirdweb/extensions/erc1155';
import {Button} from '../ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '../ui/card';
import {Badge} from '../ui/badge';
import {useToast} from '../../hooks/use-toast';
import {Coins, Crown, Gift, Loader2, Zap, X} from 'lucide-react';
import {supabase} from '../../lib/supabaseClient';
import {authService} from '../../lib/supabase';
import {useI18n} from '../../contexts/I18nContext';
import RegistrationModal from '../modals/RegistrationModal';
import ErrorBoundary from '../ui/error-boundary';
import {client} from '../../lib/thirdwebClient';

interface WelcomeLevel1ClaimButtonProps {
  onSuccess?: () => void;
  referrerWallet?: string;
  className?: string;
}

export function WelcomeLevel1ClaimButton({ onSuccess, referrerWallet, className = '' }: WelcomeLevel1ClaimButtonProps): JSX.Element {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const switchChain = useSwitchActiveWalletChain();
  const { toast } = useToast();
  const { t } = useI18n();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [isStabilizing, setIsStabilizing] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [hasNFT, setHasNFT] = useState(false);
  const [showPayEmbed, setShowPayEmbed] = useState(false);

  // Fixed Level 1 pricing and info
  const LEVEL_1_PRICE_USDC = 130;
  const LEVEL_1_PRICE_WEI = BigInt(LEVEL_1_PRICE_USDC) * BigInt('1000000'); // 130 * 10^6 (USDC has 6 decimals)

  const API_BASE = 'https://cdjmtevekxpmgrixkiqt.supabase.co/functions/v1';
  const PAYMENT_TOKEN_CONTRACT = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'; // Arbitrum USDC (native)
  const NFT_CONTRACT = import.meta.env.VITE_MEMBERSHIP_NFT_CONTRACT; // Use env variable

  // Check network status
  useEffect(() => {
    if (activeChain?.id && activeChain.id !== arbitrum.id) {
      setIsWrongNetwork(true);
    } else {
      setIsWrongNetwork(false);
    }
  }, [activeChain?.id]);

  // Check eligibility
  useEffect(() => {
    if (account?.address && referrerWallet) {
      checkEligibility();
    }
  }, [account?.address, referrerWallet]);

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

  const handleRegistrationComplete = useCallback(() => {
    console.log('✅ Registration completed - closing modal');
    setShowRegistrationModal(false);
    setIsStabilizing(true);

    // Add stabilization delay to prevent ThirdWeb DOM errors
    setTimeout(() => {
      setIsStabilizing(false);
      checkEligibility();
    }, 1000);
  }, []);

  // Add stabilization effect for ThirdWeb DOM errors
  useEffect(() => {
    if (showRegistrationModal) {
      setIsStabilizing(true);
      const stabilizeTimer = setTimeout(() => {
        setIsStabilizing(false);
      }, 800);

      return () => clearTimeout(stabilizeTimer);
    }
  }, [showRegistrationModal]);

  const checkEligibility = async () => {
    console.log('🔍 Checking Level 1 NFT claim eligibility...');

    if (!account?.address) {
      setIsEligible(false);
      return;
    }

    // Validate referrer requirements
    if (!referrerWallet) {
      toast({
        title: t('claim.referrerRequired'),
        description: t('claim.referrerRequiredDesc'),
        variant: "destructive",
      });
      setIsEligible(false);
      return;
    }

    // Prevent self-referral
    if (referrerWallet.toLowerCase() === account.address.toLowerCase()) {
      toast({
        title: t('claim.selfReferralNotAllowed'),
        description: t('claim.selfReferralNotAllowedDesc'),
        variant: "destructive",
      });
      setIsEligible(false);
      return;
    }

    try {
      // 1. Check if user is registered
      console.log('🔍 Checking user registration status...');

      try {
        const { data: userData } = await authService.getUser(account.address);

        if (!userData) {
          console.log('❌ User not registered:', {
            walletAddress: account.address
          });

          // Show user-friendly message
          toast({
            title: t('registration.required'),
            description: t('registration.requiredDesc'),
            duration: 3000
          });

          setIsEligible(false);

          // Add stabilization delay before showing modal
          setIsStabilizing(true);
          setTimeout(() => {
            setIsStabilizing(false);
            setTimeout(() => {
              setShowRegistrationModal(true);
            }, 300);
          }, 800);
          return;
        }

        console.log('✅ User registration confirmed:', {
          walletAddress: userData.wallet_address,
          username: userData.username
        });

      } catch (registrationError) {
        console.error('❌ Failed to check user registration:', registrationError);

        // Treat as unregistered and show registration modal
        toast({
          title: "Registration Check Failed",
          description: "Please complete your registration to proceed.",
          duration: 3000
        });

        setIsEligible(false);

        setTimeout(() => {
          setShowRegistrationModal(true);
        }, 500);
        return;
      }

      // 2. Validate referrer with fallback logic
      console.log('🔍 Validating referrer...');

      let referrerData = null;
      let isValidReferrer = false;

      try {
        // First try to get referrer as activated member
        const membershipResult = await authService.isActivatedMember(referrerWallet);

        if (membershipResult.isActivated && membershipResult.memberData) {
          referrerData = membershipResult.memberData;
          isValidReferrer = true;
          console.log('✅ Referrer found as activated member:', {
            wallet: membershipResult.memberData.wallet_address,
            username: membershipResult.memberData.username
          });
        } else {
          // Fallback: try to get referrer as registered user
          const { data: userReferrer } = await authService.getUser(referrerWallet);

          if (userReferrer) {
            referrerData = userReferrer;
            isValidReferrer = true;
            console.log('✅ Referrer found as registered user:', {
              wallet: userReferrer.wallet_address,
              username: userReferrer.username
            });
          }
        }
      } catch (referrerError) {
        console.error('❌ Error validating referrer:', referrerError);
      }

      if (!isValidReferrer || !referrerData) {
        console.log('❌ Referrer validation failed - referrer not found:', {
          referrerWallet
        });
        toast({
          title: t('claim.invalidReferrer'),
          description: t('claim.referrerMustBeRegistered') || 'Referrer must be a registered user on the platform',
          variant: "destructive",
        });
        setIsEligible(false);
        return;
      }

      console.log('✅ Referrer validation passed:', {
        referrerWallet: referrerData.wallet_address,
        referrerUsername: referrerData.username
      });

      // 3. Check if already owns NFT
      const nftContract = getContract({
        client,
        address: NFT_CONTRACT,
        chain: arbitrum
      });

      const balance = await balanceOf({
        contract: nftContract,
        owner: account.address,
        tokenId: BigInt(1)
      });

      if (Number(balance) > 0) {
        console.log('✅ User already owns Level 1 NFT');
        setHasNFT(true);
        setIsEligible(false);
        return;
      }

      // All checks passed
      console.log('✅ All eligibility checks passed');
      setIsEligible(true);
      setHasNFT(false);
    } catch (error) {
      console.error('❌ Eligibility check failed:', error);
      setIsEligible(false);
    }
  };

  // Get NFT contract
  const nftContract = getContract({
    client,
    address: NFT_CONTRACT,
    chain: arbitrum
  });

  // Open PayEmbed modal (with registration check)
  const handleOpenPayEmbed = async () => {
    if (!account?.address) {
      toast({
        title: t('wallet.connectRequired'),
        description: t('wallet.connectRequiredDesc'),
        variant: "destructive",
      });
      return;
    }

    if (isWrongNetwork) {
      toast({
        title: t('wallet.wrongNetwork'),
        description: t('wallet.switchToArbitrum'),
        variant: "destructive",
      });
      return;
    }

    if (hasNFT) {
      toast({
        title: t('claim.alreadyOwnsNFT'),
        description: t('claim.alreadyOwnsNFTDesc'),
        variant: "default",
      });
      return;
    }

    // Check if user is registered before opening PayEmbed
    try {
      console.log('🔍 Checking registration status for:', account.address);
      const userResult = await authService.getUser(account.address);
      console.log('📊 User check result:', userResult);

      const userData = userResult?.data;

      if (!userData) {
        console.log('❌ User not registered - showing registration modal');
        toast({
          title: t('registration.required') || 'Registration Required',
          description: t('registration.requiredDesc') || 'Please register to claim your NFT',
          duration: 3000
        });

        setIsStabilizing(true);
        setTimeout(() => {
          setIsStabilizing(false);
          setTimeout(() => {
            console.log('🔄 Opening registration modal');
            setShowRegistrationModal(true);
          }, 300);
        }, 800);
        return;
      }

      console.log('✅ User is registered:', userData);

      // User is registered and eligible, open PayEmbed
      if (isEligible) {
        console.log('✅ Opening PayEmbed');
        setShowPayEmbed(true);
      } else {
        console.log('⚠️ Re-checking eligibility...');
        // Re-check eligibility
        await checkEligibility();
        if (isEligible) {
          setShowPayEmbed(true);
        } else {
          toast({
            title: t('claim.notEligible') || 'Not Eligible',
            description: t('claim.checkRequirements') || 'Please check requirements',
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('❌ Error checking registration:', error);

      // If error occurs, assume user is not registered and show registration modal
      console.log('⚠️ Treating error as not registered - showing registration modal');
      toast({
        title: t('registration.required') || 'Registration Required',
        description: t('registration.requiredDesc') || 'Please register to claim your NFT',
        duration: 3000
      });

      setIsStabilizing(true);
      setTimeout(() => {
        setIsStabilizing(false);
        setTimeout(() => {
          console.log('🔄 Opening registration modal (from error)');
          setShowRegistrationModal(true);
        }, 300);
      }, 800);
    }
  };

  // Close PayEmbed modal
  const handleClosePayEmbed = () => {
    setShowPayEmbed(false);
  };

  return (
    <ErrorBoundary>
      <Card className={`bg-gradient-to-br from-honey/5 to-honey/15 border-honey/30 ${className}`}>
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center mb-3">
            <Crown className="h-8 w-8 text-honey mr-2" />
            <Badge className="bg-honey/20 text-honey border-honey/50">
              Welcome Level 1 NFT
            </Badge>
          </div>
          <CardTitle className="text-2xl text-honey mb-2">
            Claim Level 1 NFT
          </CardTitle>
          <p className="text-muted-foreground">
            Join the BEEHIVE community with your first membership NFT
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Benefits Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-lg border border-orange-500/20">
              <Coins className="h-6 w-6 text-orange-400 mx-auto mb-2" />
              <h3 className="font-semibold text-orange-400 mb-1">{LEVEL_1_PRICE_USDC} USDC</h3>
              <p className="text-xs text-muted-foreground">Level 1 Price</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg border border-purple-500/20">
              <Crown className="h-6 w-6 text-purple-400 mx-auto mb-2" />
              <h3 className="font-semibold text-purple-400 mb-1">Level 1</h3>
              <p className="text-xs text-muted-foreground">Membership NFT</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20">
              <Gift className="h-6 w-6 text-blue-400 mx-auto mb-2" />
              <h3 className="font-semibold text-blue-400 mb-1">Matrix</h3>
              <p className="text-xs text-muted-foreground">3×3 referral system</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg border border-green-500/20">
              <Zap className="h-6 w-6 text-green-400 mx-auto mb-2" />
              <h3 className="font-semibold text-green-400 mb-1">Instant</h3>
              <p className="text-xs text-muted-foreground">Activation</p>
            </div>
          </div>

          {/* Multi-Chain Payment Info */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-400">Multi-Chain Payment Enabled</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pay with USDC from any supported chain. Thirdweb will handle the bridging automatically.
                </p>
              </div>
            </div>
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
                  Switch to Arbitrum One to claim your NFT.
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

            {hasNFT ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <p className="text-green-800 font-semibold">✅ You already own Level 1 NFT</p>
                <p className="text-xs text-green-700 mt-1">Your membership is active</p>
              </div>
            ) : (
              <Button
                onClick={handleOpenPayEmbed}
                disabled={!account?.address || isWrongNetwork || isStabilizing || isProcessing}
                className="w-full h-12 bg-gradient-to-r from-honey to-orange-500 hover:from-honey/90 hover:to-orange-500/90 text-white font-semibold text-lg shadow-lg transition-all disabled:opacity-50"
              >
                {!account?.address ? (
                  <>
                    <Crown className="mr-2 h-5 w-5" />
                    {t('claim.connectWalletToClaimNFT')}
                  </>
                ) : isWrongNetwork ? (
                  <>
                    <Crown className="mr-2 h-5 w-5" />
                    Switch Network First
                  </>
                ) : isStabilizing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Stabilizing...
                  </>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Crown className="h-5 w-5" />
                    <span>{isEligible ? `Claim Level 1 - ${LEVEL_1_PRICE_USDC} USDC` : 'Register & Claim Level 1'}</span>
                  </div>
                )}
              </Button>
            )}

            {/* Progress indicator */}
            {isProcessing && currentStep && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 text-honey animate-spin" />
                  <span className="text-muted-foreground">{currentStep}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t('claim.doNotClosePageWarning')}
                </div>
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className="text-center text-xs text-muted-foreground pt-2 space-y-1">
            <p>💳 Multi-chain payment supported</p>
            <p>🌉 Automatic cross-chain bridging</p>
            <p>⚡ Instant membership activation</p>
            <p>✅ One-click NFT minting</p>
          </div>
        </CardContent>
      </Card>

      {/* Registration Modal */}
      <RegistrationModal
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        walletAddress={account?.address || ''}
        referrerWallet={referrerWallet}
        onRegistrationComplete={handleRegistrationComplete}
      />

      {/* PayEmbed Modal */}
      {showPayEmbed && account?.address && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClosePayEmbed} />
          <div
            className="relative p-4 max-h-[min(90vh,800px)] overflow-y-auto bg-black rounded-2xl w-full max-w-[500px]"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={handleClosePayEmbed}
              className="absolute top-4 right-4 z-10 text-gray-400 hover:text-white p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
              title="Close"
            >
              <X size={24} />
            </button>
            <PayEmbed
              client={client}
              payOptions={{
                mode: "transaction",
                transaction: claimTo({
                  contract: nftContract,
                  to: account.address,
                  tokenId: BigInt(1),
                  quantity: BigInt(1),
                }),
                metadata: {
                  name: "BEEHIVE Level 1 Membership NFT",
                  image: "https://your-nft-image-url.com/level1.png",
                },
                buyWithCrypto: {
                  testMode: false,
                },
              }}
              theme="dark"
              onPaymentSuccess={async (result) => {
                console.log('🎉 Payment successful:', result);
                setShowPayEmbed(false);

                toast({
                  title: '🎉 Level 1 NFT Claimed!',
                  description: 'Processing membership activation...',
                  duration: 5000
                });

                setIsProcessing(true);
                setCurrentStep('Activating membership...');

                try {
                  // Activate membership
                  const activateResponse = await fetch(`${API_BASE}/activate-membership`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                      'x-wallet-address': account.address
                    },
                    body: JSON.stringify({
                      transactionHash: result.transactionHash,
                      level: 1,
                      paymentMethod: 'multi_chain',
                      paymentAmount: LEVEL_1_PRICE_USDC,
                      referrerWallet: referrerWallet
                    })
                  });

                  if (activateResponse.ok) {
                    toast({
                      title: '🎉 Welcome to BEEHIVE!',
                      description: 'Your Level 1 membership is now active.',
                      variant: "default",
                      duration: 6000,
                    });
                    if (onSuccess) {
                      onSuccess();
                    }
                  }
                } catch (error) {
                  console.error('❌ Activation error:', error);
                  toast({
                    title: '⚠️ Activation Pending',
                    description: 'NFT claimed, please refresh to complete activation.',
                    duration: 8000
                  });
                } finally {
                  setIsProcessing(false);
                  setCurrentStep('');
                  checkEligibility();
                }
              }}
            />
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
}

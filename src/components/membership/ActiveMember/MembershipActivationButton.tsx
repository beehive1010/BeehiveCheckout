

import { useEffect, useState, useCallback } from 'react';
import { useActiveAccount, useActiveWalletChain, useSwitchActiveWalletChain } from 'thirdweb/react';
import { arbitrum } from 'thirdweb/chains';
import { balanceOf } from 'thirdweb/extensions/erc1155';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { useToast } from '../../../hooks/use-toast';
import { Coins, Crown, Gift, Loader2, Zap } from 'lucide-react';
import { authService } from '../../../lib/supabase';
import { useI18n } from '../../../contexts/I18nContext';
import RegistrationModal from '../../modals/RegistrationModal';
import ErrorBoundary from '../../ui/error-boundary';
import { useMembershipNFT } from '../../../hooks/useMembershipNFT';
import { useNFTClaim } from '../core/NFTClaimButton';

interface MembershipActivationButtonProps {
  onSuccess?: () => void;
  referrerWallet?: string;
  className?: string;
}

const LEVEL_1_PRICE = 130;

export function MembershipActivationButton({
  onSuccess,
  referrerWallet,
  className = '',
}: MembershipActivationButtonProps): JSX.Element {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const switchChain = useSwitchActiveWalletChain();
  const { toast } = useToast();
  const { t } = useI18n();
  const { nftContract } = useMembershipNFT();
  const { claimNFT, isProcessing, currentStep } = useNFTClaim();

  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [isStabilizing, setIsStabilizing] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [hasNFT, setHasNFT] = useState(false);

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
      await switchChain(arbitrum);
      toast({
        title: t('wallet.networkSwitched'),
        description: t('wallet.networkSwitchedDesc'),
        variant: 'default',
      });
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      toast({
        title: t('wallet.networkSwitchFailed'),
        description: error.message || t('wallet.networkSwitchFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleRegistrationComplete = useCallback(() => {
    console.log('✅ Registration completed - closing modal');
    setShowRegistrationModal(false);
    setIsStabilizing(true);

    setTimeout(() => {
      setIsStabilizing(false);
      checkEligibility();
    }, 1000);
  }, []);

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

    if (!referrerWallet) {
      toast({
        title: t('claim.referrerRequired'),
        description: t('claim.referrerRequiredDesc'),
        variant: 'destructive',
      });
      setIsEligible(false);
      return;
    }

    if (referrerWallet.toLowerCase() === account.address.toLowerCase()) {
      toast({
        title: t('claim.selfReferralNotAllowed'),
        description: t('claim.selfReferralNotAllowedDesc'),
        variant: 'destructive',
      });
      setIsEligible(false);
      return;
    }

    try {
      // Check if user is registered
      console.log('🔍 Checking user registration status...');

      try {
        const { data: userData } = await authService.getUser(account.address);

        if (!userData) {
          console.log('❌ User not registered:', {
            walletAddress: account.address,
          });

          toast({
            title: t('registration.required'),
            description: t('registration.requiredDesc'),
            duration: 3000,
          });

          setIsEligible(false);

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
          username: userData.username,
        });
      } catch (registrationError) {
        console.error('❌ Failed to check user registration:', registrationError);

        toast({
          title: 'Registration Check Failed',
          description: 'Please complete your registration to proceed.',
          duration: 3000,
        });

        setIsEligible(false);

        setTimeout(() => {
          setShowRegistrationModal(true);
        }, 500);
        return;
      }

      // Validate referrer
      console.log('🔍 Validating referrer...');

      let referrerData = null;
      let isValidReferrer = false;

      try {
        const membershipResult = await authService.isActivatedMember(referrerWallet);

        if (membershipResult.isActivated && membershipResult.memberData) {
          referrerData = membershipResult.memberData;
          isValidReferrer = true;
          console.log('✅ Referrer found as activated member:', {
            wallet: membershipResult.memberData.wallet_address,
            username: membershipResult.memberData.username,
          });
        } else {
          const { data: userReferrer } = await authService.getUser(referrerWallet);

          if (userReferrer) {
            referrerData = userReferrer;
            isValidReferrer = true;
            console.log('✅ Referrer found as registered user:', {
              wallet: userReferrer.wallet_address,
              username: userReferrer.username,
            });
          }
        }
      } catch (referrerError) {
        console.error('❌ Error validating referrer:', referrerError);
      }

      if (!isValidReferrer || !referrerData) {
        console.log('❌ Referrer validation failed - referrer not found:', {
          referrerWallet,
        });
        toast({
          title: t('claim.invalidReferrer'),
          description:
            t('claim.referrerMustBeRegistered') || 'Referrer must be a registered user on the platform',
          variant: 'destructive',
        });
        setIsEligible(false);
        return;
      }

      console.log('✅ Referrer validation passed:', {
        referrerWallet: referrerData.wallet_address,
        referrerUsername: referrerData.username,
      });

      // Check if already owns NFT
      const balance = await balanceOf({
        contract: nftContract,
        owner: account.address,
        tokenId: BigInt(1),
      });

      if (Number(balance) > 0) {
        console.log('✅ User already owns Level 1 NFT');
        setHasNFT(true);
        setIsEligible(false);
        return;
      }

      console.log('✅ All eligibility checks passed');
      setIsEligible(true);
      setHasNFT(false);
    } catch (error) {
      console.error('❌ Eligibility check failed:', error);
      setIsEligible(false);
    }
  };

  const handleActivate = async () => {
    if (!account?.address || isProcessing || hasNFT) {
      return;
    }

    if (isWrongNetwork) {
      toast({
        title: t('wallet.wrongNetwork'),
        description: t('wallet.switchToArbitrum'),
        variant: 'destructive',
      });
      return;
    }

    // Check registration before proceeding
    try {
      console.log('🔍 Checking registration status for:', account.address);
      const userResult = await authService.getUser(account.address);

      if (!userResult?.data) {
        console.log('❌ User not registered - showing registration modal');
        toast({
          title: t('registration.required') || 'Registration Required',
          description: t('registration.requiredDesc') || 'Please register to claim your NFT',
          duration: 3000,
        });
        setShowRegistrationModal(true);
        return;
      }

      // Use the core claim function
      const result = await claimNFT({
        level: 1,
        priceUSDT: LEVEL_1_PRICE,
        activationEndpoint: 'mint-and-send-nft',
        activationPayload: {
          referrerWallet: referrerWallet,
        },
        onSuccess: () => {
          toast({
            title: '🎉 Welcome to BEEHIVE!',
            description: 'Level 1 membership activated! Redirecting to dashboard...',
            variant: 'default',
            duration: 3000,
          });

          setHasNFT(true);

          if (onSuccess) {
            onSuccess();
          }

          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1500);
        },
        onError: () => {
          checkEligibility();
        },
      });

      if (result.success) {
        console.log('✅ Activation successful:', result.txHash);
      }
    } catch (error: any) {
      console.error('❌ Activation error:', error);
    }
  };

  return (
    <ErrorBoundary>
      <Card className={`bg-gradient-to-br from-honey/5 to-honey/15 border-honey/30 ${className}`}>
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center mb-3">
            <Crown className="h-8 w-8 text-honey mr-2" />
            <Badge className="bg-honey/20 text-honey border-honey/50">Level 1 Activation</Badge>
          </div>
          <CardTitle className="text-2xl text-honey mb-2">Activate Membership</CardTitle>
          <p className="text-muted-foreground">Join the BEEHIVE community with Level 1 NFT</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Benefits Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-lg border border-orange-500/20">
              <Coins className="h-6 w-6 text-orange-400 mx-auto mb-2" />
              <h3 className="font-semibold text-orange-400 mb-1">{LEVEL_1_PRICE} USDT</h3>
              <p className="text-xs text-muted-foreground">Activation Price</p>
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

          {/* Network Info */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-400">Arbitrum One - USDT Payment</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pay with USDT on Arbitrum One. Make sure you're on the correct network.
                </p>
              </div>
            </div>
          </div>

          {/* Activation Button */}
          <div className="space-y-4">
            {isWrongNetwork && account?.address && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-950 dark:border-yellow-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Wrong Network</span>
                </div>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                  You're on {activeChain?.id === 1 ? 'Ethereum Mainnet' : `Network ${activeChain?.id}`}. Switch
                  to Arbitrum One to activate your membership.
                </p>
                <Button
                  onClick={handleSwitchNetwork}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                  size="sm"
                >
                  Switch to Arbitrum One
                </Button>
              </div>
            )}

            {hasNFT ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center dark:bg-green-950 dark:border-green-800">
                <p className="text-green-800 dark:text-green-200 font-semibold">✅ You already own Level 1 NFT</p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">Your membership is active</p>
              </div>
            ) : (
              <Button
                onClick={handleActivate}
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
                ) : isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Crown className="mr-2 h-5 w-5" />
                    Activate Level 1 - {LEVEL_1_PRICE} USDT
                  </>
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
            <p>💳 Direct USDT payment on Arbitrum</p>
            <p>⚡ Instant activation after claim</p>
            <p>✅ One-click process with approval</p>
          </div>
        </CardContent>
      </Card>

      {/* Registration Modal */}
      {account?.address && (
        <RegistrationModal
          isOpen={showRegistrationModal}
          onClose={() => setShowRegistrationModal(false)}
          walletAddress={account.address}
          referrerWallet={referrerWallet}
          onRegistrationComplete={handleRegistrationComplete}
        />
      )}
    </ErrorBoundary>
  );
}

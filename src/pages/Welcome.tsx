import React, {useEffect, useState} from 'react';
import {useNFTClaim} from '../components/membership/core/NFTClaimButton';
import {useLocation} from 'wouter';
import {Button} from '../components/ui/button';
import {Loader2, Crown} from 'lucide-react';
import {referralService} from '../api/landing/referral.client';
import {authService} from '../lib/supabase';
import {Card, CardContent} from '../components/ui/card';
import {Badge} from '../components/ui/badge';
import {Crown, RefreshCw, User, Users} from 'lucide-react';
import {useI18n} from '../contexts/I18nContext';
import {useWallet} from '../hooks/useWallet';
import {useWeb3} from '../contexts/Web3Context';
import ErrorBoundary from '../components/ui/error-boundary';

export default function Welcome() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { account } = useWeb3();
  const { refreshUserData, userStatus, isUserLoading } = useWallet();
  const [referrerWallet, setReferrerWallet] = useState<string>('');
  const [referrerInfo, setReferrerInfo] = useState<{ username?: string; wallet: string } | null>(null);
  const [isLoadingReferrer, setIsLoadingReferrer] = useState(false);
  const [isCheckingMembership, setIsCheckingMembership] = useState(false);
  const [noReferrerError, setNoReferrerError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use core NFTClaim hook
  const { claimNFT, isProcessing, currentStep } = useNFTClaim();

  // Get referrer from URL params and localStorage with immediate fallback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');

    // Priority 1: URL parameter (highest priority)
    if (ref && ref.startsWith('0x') && ref.length === 42) {
      setReferrerWallet(ref);
      referralService.handleReferralParameter();
      setNoReferrerError(false);
      console.log('🔗 Referrer detected from URL:', ref);
    } else {
      // Priority 2: Check localStorage for stored referrer
      const storedReferrer = referralService.getReferrerWallet();
      if (storedReferrer && storedReferrer.startsWith('0x') && storedReferrer.length === 42) {
        setReferrerWallet(storedReferrer);
        setNoReferrerError(false);
        console.log('🔗 Referrer loaded from storage:', storedReferrer);
      } else {
        // Priority 3: Use default referrer ONLY if no URL param and no localStorage
        const defaultReferrer = '0x3C1FF5B4BE2A1FB8c157aF55aa6450eF66D7E242';
        setReferrerWallet(defaultReferrer);
        // Store the default referrer to localStorage so Registration can access it
        localStorage.setItem('beehive-referrer', defaultReferrer);
        setNoReferrerError(false);
        console.log('🔧 No referrer from URL or storage, using default referrer:', defaultReferrer);
      }
    }
  }, []);

  // Load referrer information
  useEffect(() => {
    const loadReferrerInfo = async () => {
      if (!referrerWallet) {
        setReferrerInfo(null);
        return;
      }

      setIsLoadingReferrer(true);
      try {
        const { data } = await authService.getUser(referrerWallet);
        if (data) {
          setReferrerInfo({
            username: data.username,
            wallet: referrerWallet
          });
        } else {
          setReferrerInfo({ wallet: referrerWallet });
        }
      } catch (error) {
        console.warn('Failed to load referrer info:', error);
        setReferrerInfo({ wallet: referrerWallet });
      } finally {
        setIsLoadingReferrer(false);
      }
    };

    loadReferrerInfo();
  }, [referrerWallet]);


  // Use useWallet data to redirect if user is already activated
  useEffect(() => {
    let isMounted = true;
    let redirectTimeout: NodeJS.Timeout;

    // Wait for userStatus to load
    if (isUserLoading) {
      setIsCheckingMembership(true);
      return;
    }

    setIsCheckingMembership(false);

    // Only redirect if user is fully activated
    if (userStatus?.isActivated && userStatus?.membershipLevel >= 1) {
      // Wait 500ms before redirecting to ensure data is stable
      redirectTimeout = setTimeout(() => {
        if (isMounted) {
          console.log('✅ Welcome: User already activated (Level', userStatus.membershipLevel, ') - redirecting to dashboard');
          setLocation('/dashboard');
        }
      }, 500);
    } else {
      console.log('🎯 Welcome: User not activated yet - showing claim interface');
    }

    return () => {
      isMounted = false;
      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
      }
    };
  }, [userStatus, isUserLoading, setLocation]); // 使用 useWallet 的数据

  const handleClaim = async () => {
    if (!account?.address) {
      return;
    }

    if (!referrerWallet) {
      alert('Referrer wallet is required');
      return;
    }

    console.log('🎯 Starting Level 1 NFT claim with core hook...');

    const result = await claimNFT({
      level: 1,
      priceUSDT: 130,
      activationEndpoint: 'activate-membership',
      activationPayload: {
        referrerWallet: referrerWallet,
      },
      onSuccess: () => {
        console.log('✅ Level 1 NFT claimed and activated successfully!');
        setTimeout(() => {
          setLocation('/dashboard');
        }, 1500);
      },
      onError: (error) => {
        console.error('❌ Claim error:', error);
      },
    });

    if (result.success) {
      console.log('✅ Claim successful, txHash:', result.txHash);
    } else {
      console.error('❌ Claim failed:', result.error);
    }
  };


  // Handle manual status refresh - only use useWallet refresh
  const handleRefreshStatus = async () => {
    if (!account?.address) return;

    setIsRefreshing(true);
    console.log('🔄 Manual refresh: Updating user status...');

    try {
      // Force refresh user data from useWallet
      refreshUserData();

      // Wait for refresh to complete
      setTimeout(() => {
        if (userStatus?.isActivated) {
          console.log('✅ Manual refresh: User is now activated - redirecting to dashboard');
          setLocation('/dashboard');
        } else {
          console.log('ℹ️ Manual refresh: User status updated but still not activated');
        }
        setIsRefreshing(false);
      }, 2000);
    } catch (error) {
      console.error('❌ Manual refresh error:', error);
      setIsRefreshing(false);
    }
  };

  // Note: Default referrer handling is now done immediately in the first useEffect above

  // Removed auto-refresh useEffect to prevent infinite loops
  // Users can manually refresh using the "Refresh Status" button if needed

  // Show loading state while checking membership
  if (isCheckingMembership) {
    return (
      <div className="min-h-screen bg-background py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-honey border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('welcome.checkingMembership')}</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background py-4 sm:py-8">
        <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            {t('welcome.title')}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-2">
            {t('welcome.subtitle')}
          </p>
          
          {/* Status Refresh Button */}
          <div className="flex justify-center mb-4">
            <button
              onClick={handleRefreshStatus}
              disabled={isRefreshing || isUserLoading}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-honey/10 hover:bg-honey/20 text-honey border border-honey/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="Refresh activation status"
            >
              <RefreshCw className={`h-4 w-4 ${(isRefreshing || isUserLoading) ? 'animate-spin' : ''}`} />
              <span>
                {isRefreshing ? t('welcome.refreshing') : t('welcome.refreshStatus')}
              </span>
            </button>
          </div>
          
          {/* Status indicator */}
          {userStatus && (
            <div className="mb-4 space-y-2">
              <Badge
                variant={userStatus.isActivated ? "default" : "secondary"}
                className={`${userStatus.isActivated ? 'bg-green-100 text-green-800 border-green-200' : 'bg-orange-100 text-orange-800 border-orange-200'}`}
              >
                {userStatus.isActivated ?
                  t('welcome.statusActivated', { level: userStatus.membershipLevel }) :
                  t('welcome.statusNotActivated')
                }
              </Badge>
              
              {/* Show hint if user is registered but not activated (might need refresh) */}
              {userStatus.isRegistered && !userStatus.isActivated && (
                <div className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-2 max-w-md mx-auto">
                  {t('welcome.refreshHint')}
                </div>
              )}
            </div>
          )}
          
          {/* Referrer Information Card - Always show since referrer is required */}
          <Card className="max-w-md mx-auto mt-4 border-honey/30 bg-honey/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-center space-x-3">
                <Users className="h-5 w-5 text-honey" />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">{t('welcome.referredBy')}:</p>
                  {isLoadingReferrer ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin h-4 w-4 border-2 border-honey border-t-transparent rounded-full"></div>
                      <span className="text-sm text-honey">{t('common.loading')}</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {referrerInfo?.username && (
                        <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
                          <User className="h-3 w-3 mr-1" />
                          {referrerInfo.username}
                        </Badge>
                      )}
                      <div className="font-mono text-xs text-muted-foreground">
                        {referrerWallet.slice(0, 8)}...{referrerWallet.slice(-6)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-3 text-center">
                <div className="flex items-center justify-center space-x-1 text-xs text-honey/80">
                  <Crown className="h-3 w-3" />
                  <span>{t('welcome.matrixPlacement')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Level 1 NFT Claim Button - Using core hook with activate-membership */}
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={handleClaim}
            disabled={!account?.address || isProcessing || !referrerWallet}
            className="w-full h-14 bg-gradient-to-r from-honey to-orange-500 hover:from-honey/90 hover:to-orange-500/90 text-white font-semibold text-lg shadow-lg transition-all disabled:opacity-50"
          >
            {!account?.address ? (
              <>
                <Crown className="mr-2 h-5 w-5" />
                {t('claim.connectWalletToClaimNFT')}
              </>
            ) : isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {currentStep || 'Processing...'}
              </>
            ) : (
              <>
                <Crown className="mr-2 h-5 w-5" />
                Claim Level 1 - 130 USDT
              </>
            )}
          </Button>

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

        <div className="mt-6 text-center text-sm text-muted-foreground space-y-3 max-w-md mx-auto">
          <div className="p-4 bg-secondary/30 rounded-lg border border-honey/10">
            <p className="text-xs font-medium text-foreground mb-2">📋 Quick Start Guide</p>
            <div className="space-y-1.5 text-xs">
              <p>{t('welcome.instructions.step1')}</p>
              <p>{t('welcome.instructions.step2')}</p>
            </div>
          </div>
          <div className="p-3 bg-honey/5 border border-honey/20 rounded-lg">
            <p className="text-xs text-honey/90 font-medium">
              {t('welcome.matrixPlacementInfo')}
            </p>
          </div>
        </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

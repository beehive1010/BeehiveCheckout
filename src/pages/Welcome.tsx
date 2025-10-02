import React, {useEffect, useState} from 'react';
import {WelcomeLevel1ClaimButton} from '../components/membership/WelcomeLevel1ClaimButton';
import {useLocation} from 'wouter';
import {useActiveAccount} from 'thirdweb/react';
import {referralService} from '../api/landing/referral.client';
import {authService} from '../lib/supabase';
import {Card, CardContent} from '../components/ui/card';
import {Badge} from '../components/ui/badge';
import {Crown, RefreshCw, User, Users} from 'lucide-react';
import {useI18n} from '../contexts/I18nContext';
import {useWallet} from '../hooks/useWallet';
import ErrorBoundary from '../components/ui/error-boundary';

export default function Welcome() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const account = useActiveAccount();
  const { refreshUserData, userStatus, isUserLoading } = useWallet();
  const [referrerWallet, setReferrerWallet] = useState<string>('');
  const [referrerInfo, setReferrerInfo] = useState<{ username?: string; wallet: string } | null>(null);
  const [isLoadingReferrer, setIsLoadingReferrer] = useState(false);
  const [isCheckingMembership, setIsCheckingMembership] = useState(false);
  const [noReferrerError, setNoReferrerError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get referrer from URL params and localStorage with immediate fallback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');

    if (ref && ref.startsWith('0x') && ref.length === 42) {
      setReferrerWallet(ref);
      referralService.handleReferralParameter();
      setNoReferrerError(false);
      console.log('🔗 Referrer detected from URL:', ref);
    } else {
      // Check localStorage for stored referrer
      const storedReferrer = referralService.getReferrerWallet();
      if (storedReferrer && storedReferrer.startsWith('0x') && storedReferrer.length === 42) {
        setReferrerWallet(storedReferrer);
        setNoReferrerError(false);
        console.log('🔗 Referrer loaded from storage:', storedReferrer);
      } else {
        // Immediately set default referrer instead of setting error first
        const defaultReferrer = '0x0000000000000000000000000000000000000001';
        setReferrerWallet(defaultReferrer);
        // Store the default referrer to localStorage so Registration can access it
        localStorage.setItem('beehive-referrer', defaultReferrer);
        setNoReferrerError(false);
        console.log('🔧 No valid referrer found, using default referrer immediately:', defaultReferrer);
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


  // Check if user is already an activated member and redirect to dashboard
  useEffect(() => {
    const checkMembershipStatus = async () => {
      if (!account?.address) return;

      setIsCheckingMembership(true);
      try {
        console.log('🔍 Welcome page: Checking membership status for:', account.address);
        const membershipResult = await authService.isActivatedMember(account.address);
        console.log('📊 Welcome page: Membership result:', membershipResult);
        console.log('📊 Welcome page: isActivated =', membershipResult.isActivated);
        console.log('📊 Welcome page: memberData =', membershipResult.memberData);
        console.log('📊 Welcome page: current_level =', membershipResult.memberData?.current_level);

        // Only redirect if BOTH conditions are met:
        // 1. User is activated in database (isActivated = true)
        // 2. User has Level 1 or higher (current_level >= 1)
        const isActivated = membershipResult.isActivated;
        const currentLevel = membershipResult.memberData?.current_level || 0;
        const shouldRedirect = isActivated && currentLevel >= 1;

        console.log('📊 Welcome page: Condition check - isActivated:', isActivated, 'currentLevel:', currentLevel, 'shouldRedirect:', shouldRedirect);

        if (shouldRedirect) {
          console.log('✅ Welcome page: User is fully activated (Level', currentLevel, ') - redirecting to dashboard');
          setLocation('/dashboard');
          return;
        }

        console.log('🎯 Welcome page: User needs activation (isActivated:', isActivated, ', Level:', currentLevel, ') - showing claim interface');
      } catch (error) {
        console.warn('⚠️ Welcome page: Failed to check membership status:', error);
        // Continue showing welcome page on error - let user try to claim
      } finally {
        setIsCheckingMembership(false);
      }
    };

    checkMembershipStatus();
  }, [account?.address, setLocation]);

  const handleActivationComplete = () => {
    console.log('✅ Level 1 NFT claim and activation completed - redirecting to dashboard');
    
    // WelcomeLevel1ClaimButton already handles:
    // ✅ User registration check/modal
    // ✅ USDC approval and payment
    // ✅ NFT minting on blockchain
    // ✅ Database activation via multiple fallbacks
    // ✅ Matrix placement and member setup
    
    // Add small delay to ensure all processes complete
    setTimeout(() => {
      console.log('🔄 Redirecting to dashboard after complete Level 1 activation...');
      setLocation('/dashboard');
    }, 2000); // 2 second delay for thorough processing
  };


  // Handle manual status refresh
  const handleRefreshStatus = async () => {
    if (!account?.address) return;
    
    setIsRefreshing(true);
    console.log('🔄 Manual refresh: Updating user status...');
    
    try {
      // Force refresh user data from useWallet
      refreshUserData();
      
      // Also check membership status again
      const membershipResult = await authService.isActivatedMember(account.address);
      console.log('📊 Manual refresh: Updated membership result:', membershipResult);
      
      if (membershipResult.isActivated && membershipResult.memberData?.current_level >= 1) {
        console.log('✅ Manual refresh: User is now activated - redirecting to dashboard');
        setTimeout(() => {
          setLocation('/dashboard');
        }, 1000);
      } else {
        console.log('ℹ️ Manual refresh: User status updated but still not activated');
      }
    } catch (error) {
      console.error('❌ Manual refresh error:', error);
    } finally {
      // Reset refreshing state after delay
      setTimeout(() => {
        setIsRefreshing(false);
      }, 2000);
    }
  };

  // Note: Default referrer handling is now done immediately in the first useEffect above

  // Auto-detect status inconsistency and prompt user to refresh
  useEffect(() => {
    if (userStatus && account?.address && !isUserLoading && !isRefreshing) {
      // Check if user might be activated but cache shows otherwise
      const suspectedActivated = userStatus.isRegistered && !userStatus.isActivated;
      
      if (suspectedActivated) {
        // Check with server after a delay
        const checkServerStatus = setTimeout(async () => {
          try {
            const serverStatus = await authService.isActivatedMember(account.address);
            if (serverStatus.isActivated && !userStatus.isActivated) {
              console.log('🔍 Detected status inconsistency: server says activated but cache says not');
              // Auto-refresh after showing message briefly
              setTimeout(() => {
                console.log('🔄 Auto-refreshing due to detected inconsistency...');
                refreshUserData();
              }, 1000);
            }
          } catch (error) {
            console.warn('Status inconsistency check failed:', error);
          }
        }, 3000); // Check after 3 seconds

        return () => clearTimeout(checkServerStatus);
      }
    }
  }, [userStatus, account?.address, isUserLoading, isRefreshing, refreshUserData]);

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
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            {t('welcome.title')}
          </h1>
          <p className="text-xl text-muted-foreground mb-2">
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
                {isRefreshing ? 'Refreshing...' : 'Refresh Status'}
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
                  `✅ Activated (Level ${userStatus.membershipLevel})` : 
                  '⏳ Not Activated'
                }
              </Badge>
              
              {/* Show hint if user is registered but not activated (might need refresh) */}
              {userStatus.isRegistered && !userStatus.isActivated && (
                <div className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-2 max-w-md mx-auto">
                  💡 If you've already claimed your NFT, try clicking "Refresh Status" above
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
        
        <div className="max-w-lg mx-auto">
          <WelcomeLevel1ClaimButton
            onSuccess={handleActivationComplete}
            referrerWallet={referrerWallet}
            className="w-full"
          />
          
          {/* Referrer information for the claim */}
          {referrerWallet && (
            <div className="mt-4 p-3 bg-honey/5 border border-honey/20 rounded-lg">
              <div className="text-center text-sm text-muted-foreground">
                <span className="font-medium text-honey">Matrix Placement:</span> You will be placed under{' '}
                {referrerInfo?.username ? (
                  <span className="font-medium">{referrerInfo.username}</span>
                ) : (
                  <span className="font-mono text-xs">{referrerWallet.slice(0, 8)}...{referrerWallet.slice(-6)}</span>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-8 text-center text-sm text-muted-foreground space-y-2">
          <p className="mb-2">{t('welcome.instructions.step1')}</p>
          <p>{t('welcome.instructions.step2')}</p>
          <div className="p-3 bg-secondary/50 rounded-lg mt-4">
            <p className="text-xs text-honey/90">
              {t('welcome.matrixPlacementInfo')}
            </p>
          </div>
        </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

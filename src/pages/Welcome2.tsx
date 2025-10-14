/**
 * Welcome2 Page - PayEmbed Version
 *
 * Same validation and registration logic as Welcome.tsx
 * Uses BeehiveMembershipClaimList with PayEmbed for Level 1 activation
 */

import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { referralService } from '../api/landing/referral.client';
import { authService } from '../lib/supabase';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Crown, RefreshCw, User, Users, Sparkles, CheckCircle } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { useWallet } from '../hooks/useWallet';
import { useWeb3 } from '../contexts/Web3Context';
import ErrorBoundary from '../components/ui/error-boundary';
import { BeehiveMembershipClaimList } from '../components/membership/claim/BeehiveMembershipClaimList';
import { motion } from 'framer-motion';
import { useToast } from '../hooks/use-toast';
import RegistrationModal from '../components/modals/RegistrationModal';

export default function Welcome2() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { account } = useWeb3();
  const { refreshUserData, userStatus, isUserLoading } = useWallet();
  const { toast } = useToast();
  const [referrerWallet, setReferrerWallet] = useState<string>('');
  const [referrerInfo, setReferrerInfo] = useState<{ username?: string; wallet: string } | null>(null);
  const [isLoadingReferrer, setIsLoadingReferrer] = useState(false);
  const [isCheckingMembership, setIsCheckingMembership] = useState(false);
  const [noReferrerError, setNoReferrerError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasCheckedOnMount, setHasCheckedOnMount] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);

  // Get referrer from URL params and localStorage with immediate fallback
  // EXACT SAME LOGIC AS Welcome.tsx
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
  // EXACT SAME LOGIC AS Welcome.tsx
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

  // Check if user is registered and show registration modal if needed
  useEffect(() => {
    if (!account?.address || isUserLoading) {
      return;
    }

    // If user is connected but not registered, show registration modal
    if (!userStatus?.isRegistered) {
      console.log('⚠️ Welcome2: User not registered - showing registration modal');
      setShowRegistrationModal(true);
    }
  }, [account?.address, userStatus?.isRegistered, isUserLoading]);

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
          console.log('✅ Welcome2: User already activated (Level', userStatus.membershipLevel, ') - redirecting to dashboard');
          setLocation('/dashboard');
        }
      }, 500);
    } else {
      console.log('🎯 Welcome2: User not activated yet - showing PayEmbed claim interface');
    }

    return () => {
      isMounted = false;
      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
      }
    };
  }, [userStatus, isUserLoading, setLocation]);

  const handleActivationComplete = () => {
    console.log('✅ Level 1 NFT claim and activation completed (PayEmbed) - redirecting to dashboard');

    // Add small delay to ensure all processes complete
    setTimeout(() => {
      console.log('🔄 Redirecting to dashboard after complete Level 1 activation...');
      setLocation('/dashboard');
    }, 2000); // 2 second delay for thorough processing
  };

  // Handle registration completion
  const handleRegistrationComplete = () => {
    console.log('✅ Welcome2: Registration completed');
    setShowRegistrationModal(false);

    // Refresh user data to get updated registration status
    refreshUserData();

    toast({
      title: '✅ Registration Successful',
      description: 'You can now proceed to claim your membership!',
      duration: 3000,
    });
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
          toast({
            title: '🔄 Status Updated',
            description: 'Your status has been refreshed',
            duration: 3000,
          });
        }
        setIsRefreshing(false);
      }, 2000);
    } catch (error) {
      console.error('❌ Manual refresh error:', error);
      toast({
        title: '❌ Refresh Failed',
        description: 'Failed to update status',
        variant: 'destructive',
        duration: 3000,
      });
      setIsRefreshing(false);
    }
  };

  // Show loading state while checking membership
  if (isCheckingMembership) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-honey mx-auto mb-4"></div>
          <p className="text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12 max-w-7xl">
          {/* Hero Section - Responsive Mobile Design */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 sm:mb-10 md:mb-12"
          >
            <div className="flex items-center justify-center gap-3 mb-4 sm:mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              >
                <Crown className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 text-honey" />
              </motion.div>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-5 md:mb-6 px-2">
              <span className="bg-gradient-to-r from-honey via-orange-500 to-honey bg-clip-text text-transparent">
                {t('welcome.title')}
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-6 sm:mb-7 md:mb-8 px-4">
              {t('welcome.subtitle')}
            </p>

            {/* Stats Banner - Responsive Mobile Design */}
            <div className="relative max-w-4xl mx-auto mb-6 sm:mb-8 px-2">
              <div className="absolute inset-0 bg-gradient-to-r from-honey/20 via-orange-500/20 to-honey/20 rounded-2xl sm:rounded-3xl blur-xl"></div>
              <div className="relative grid grid-cols-3 gap-3 sm:gap-4 md:gap-6 p-4 sm:p-6 md:p-8 bg-gradient-to-br from-gray-900/90 via-gray-800/95 to-gray-900/90 rounded-2xl sm:rounded-3xl border border-gray-700/30 backdrop-blur-lg">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-honey mb-1 sm:mb-2">$130</div>
                  <div className="text-xs sm:text-sm text-gray-400">{t('welcome.price')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-honey mb-1 sm:mb-2">19</div>
                  <div className="text-xs sm:text-sm text-gray-400">{t('welcome.levels')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-honey mb-1 sm:mb-2">∞</div>
                  <div className="text-xs sm:text-sm text-gray-400">{t('welcome.potential')}</div>
                </div>
              </div>
            </div>

            {/* Status Badges - Responsive Mobile Design */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 flex-wrap mb-6 sm:mb-8 px-2">
              {account && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm">
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  {t('wallet.connected')}
                </Badge>
              )}
              {userStatus?.isRegistered && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm">
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  {t('auth.registered')}
                </Badge>
              )}
              {referrerWallet && (
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm max-w-full truncate">
                  <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="truncate">{t('referral.referrer')}: {referrerInfo?.username || `${referrerWallet.substring(0, 6)}...`}</span>
                </Badge>
              )}
            </div>

            {/* Refresh Button - Responsive Mobile Design */}
            <div className="flex justify-center">
              <button
                onClick={handleRefreshStatus}
                disabled={isRefreshing || !account}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? t('common.refreshing') : t('common.refresh')}
              </button>
            </div>
          </motion.div>

          {/* Main Content - PayEmbed Level 1 Claim Component */}
          <div className="max-w-5xl mx-auto px-2 sm:px-0">
            <BeehiveMembershipClaimList
              maxLevel={1}
              referrerWallet={referrerWallet || undefined}
              onSuccess={handleActivationComplete}
            />
          </div>

          {/* Information Cards - Responsive Mobile Design */}
          <div className="max-w-5xl mx-auto mt-8 sm:mt-10 md:mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 px-2 sm:px-0">
            <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-gray-700/30">
              <CardContent className="p-4 sm:p-5 md:p-6">
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-honey flex items-center gap-2">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('welcome.whatsIncluded')}
                </h3>
                <ul className="space-y-2 text-gray-300 text-xs sm:text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500 flex-shrink-0" />
                    <span>{t('welcome.feature1')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500 flex-shrink-0" />
                    <span>{t('welcome.feature2')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500 flex-shrink-0" />
                    <span>{t('welcome.feature3')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500 flex-shrink-0" />
                    <span>{t('welcome.feature4')}</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-gray-700/30">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-honey flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  {t('welcome.nextSteps')}
                </h3>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-honey font-semibold">1.</span>
                    {t('welcome.step1')}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-honey font-semibold">2.</span>
                    {t('welcome.step2')}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-honey font-semibold">3.</span>
                    {t('welcome.step3')}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-honey font-semibold">4.</span>
                    {t('welcome.step4')}
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Registration Modal */}
        {account?.address && (
          <RegistrationModal
            isOpen={showRegistrationModal}
            onClose={() => setShowRegistrationModal(false)}
            walletAddress={account.address}
            onRegistrationComplete={handleRegistrationComplete}
            referrerWallet={referrerWallet || undefined}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

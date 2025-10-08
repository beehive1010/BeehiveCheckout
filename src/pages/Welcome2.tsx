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

  // Check if user is already an activated member and redirect to dashboard
  // EXACT SAME ULTRA-STRICT VALIDATION AS Welcome.tsx
  // 🔧 FIX: Only check on initial mount, not on every wallet reconnect
  useEffect(() => {
    const checkMembershipStatus = async () => {
      if (!account?.address) return;

      // 🔧 ANTI-FLASH FIX: Only check once on initial page load
      // After claim success, user should be redirected by handleActivationComplete
      // Don't auto-redirect on wallet reconnect to prevent flash/loop
      if (hasCheckedOnMount) {
        console.log('⏭️ Welcome2: Skipping auto-check (already checked on mount)');
        return;
      }

      setIsCheckingMembership(true);
      try {
        console.log('🔍 Welcome2 page: Checking membership status for:', account.address);
        const membershipResult = await authService.isActivatedMember(account.address);
        console.log('📊 Welcome2 page: Membership result:', JSON.stringify(membershipResult, null, 2));

        // Mark as checked
        setHasCheckedOnMount(true);

        // ULTRA-STRICT CHECK: Only redirect if ALL conditions are met
        const memberData = membershipResult.memberData;
        const currentLevel = memberData?.current_level || 0;
        const activationSequence = memberData?.activation_sequence || 0;
        const activationTime = memberData?.activation_time;

        // User MUST have:
        // 1. current_level >= 1 (has NFT)
        // 2. activation_sequence > 0 (went through activation process)
        // 3. activation_time exists (timestamp of activation)
        const hasValidLevel = currentLevel >= 1;
        const hasValidSequence = activationSequence > 0;
        const hasActivationTime = !!activationTime;

        // ALL three conditions must be true to redirect
        const shouldRedirect = hasValidLevel && hasValidSequence && hasActivationTime;

        console.log('📊 Welcome2 page: Ultra-strict activation check:');
        console.log('  - memberData:', memberData);
        console.log('  - currentLevel:', currentLevel, '→', hasValidLevel ? '✅' : '❌');
        console.log('  - activationSequence:', activationSequence, '→', hasValidSequence ? '✅' : '❌');
        console.log('  - activationTime:', activationTime, '→', hasActivationTime ? '✅' : '❌');
        console.log('  - shouldRedirect:', shouldRedirect);

        if (shouldRedirect) {
          console.log('✅ Welcome2 page: User has claimed NFT (Level', currentLevel, ') - redirecting to dashboard');
          setLocation('/dashboard');
          return;
        }

        console.log('🎯 Welcome2 page: User has NOT claimed NFT yet - showing PayEmbed claim interface');
      } catch (error) {
        console.warn('⚠️ Welcome2 page: Failed to check membership status:', error);
        setHasCheckedOnMount(true); // Mark as checked even on error
        // Continue showing welcome page on error - let user try to claim
      } finally {
        setIsCheckingMembership(false);
      }
    };

    checkMembershipStatus();
  }, [account?.address, setLocation, hasCheckedOnMount]);

  const handleActivationComplete = () => {
    console.log('✅ Level 1 NFT claim and activation completed (PayEmbed) - redirecting to dashboard');

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

      // Use ultra-strict validation (same as auto-check)
      const memberData = membershipResult.memberData;
      const currentLevel = memberData?.current_level || 0;
      const activationSequence = memberData?.activation_sequence || 0;
      const activationTime = memberData?.activation_time;

      const hasValidLevel = currentLevel >= 1;
      const hasValidSequence = activationSequence > 0;
      const hasActivationTime = !!activationTime;
      const shouldRedirect = hasValidLevel && hasValidSequence && hasActivationTime;

      if (shouldRedirect) {
        console.log('✅ Manual refresh: User is now activated - redirecting to dashboard');
        setTimeout(() => {
          setLocation('/dashboard');
        }, 1000);
      } else {
        console.log('ℹ️ Manual refresh: User status updated but still not activated');
        // Show toast to inform user
        toast({
          title: '🔄 Status Updated',
          description: 'Your status has been refreshed',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('❌ Manual refresh error:', error);
      toast({
        title: '❌ Refresh Failed',
        description: 'Failed to update status',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      // Reset refreshing state after delay
      setTimeout(() => {
        setIsRefreshing(false);
      }, 2000);
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
        <div className="container mx-auto px-4 py-12 max-w-7xl">
          {/* Hero Section - Matching Beehive Style */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              >
                <Crown className="h-16 w-16 text-honey" />
              </motion.div>
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-honey via-orange-500 to-honey bg-clip-text text-transparent">
                {t('welcome.title')}
              </span>
            </h1>

            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              {t('welcome.subtitle')}
            </p>

            {/* Stats Banner - Matching Welcome.tsx style */}
            <div className="relative max-w-4xl mx-auto mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-honey/20 via-orange-500/20 to-honey/20 rounded-3xl blur-xl"></div>
              <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 p-8 bg-gradient-to-br from-gray-900/90 via-gray-800/95 to-gray-900/90 rounded-3xl border border-gray-700/30 backdrop-blur-lg">
                <div className="text-center">
                  <div className="text-4xl font-bold text-honey mb-2">$130</div>
                  <div className="text-sm text-gray-400">{t('welcome.price')}</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-honey mb-2">19</div>
                  <div className="text-sm text-gray-400">{t('welcome.levels')}</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-honey mb-2">∞</div>
                  <div className="text-sm text-gray-400">{t('welcome.potential')}</div>
                </div>
              </div>
            </div>

            {/* Status Badges - Matching Beehive style */}
            <div className="flex items-center justify-center gap-4 flex-wrap mb-8">
              {account && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-4 py-2">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('wallet.connected')}
                </Badge>
              )}
              {userStatus?.isRegistered && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-4 py-2">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('auth.registered')}
                </Badge>
              )}
              {referrerWallet && (
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 px-4 py-2">
                  <Sparkles className="h-4 w-4 mr-2" />
                  {t('referral.referrer')}: {referrerInfo?.username || `${referrerWallet.substring(0, 8)}...`}
                </Badge>
              )}
            </div>

            {/* Refresh Button - Matching Welcome.tsx */}
            <div className="flex justify-center">
              <button
                onClick={handleRefreshStatus}
                disabled={isRefreshing || !account}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? t('common.refreshing') : t('common.refresh')}
              </button>
            </div>
          </motion.div>

          {/* Main Content - PayEmbed Level 1 Claim Component */}
          <div className="max-w-5xl mx-auto">
            <BeehiveMembershipClaimList
              maxLevel={1}
              referrerWallet={referrerWallet || undefined}
              onSuccess={handleActivationComplete}
            />
          </div>

          {/* Information Cards - Matching Welcome.tsx style */}
          <div className="max-w-5xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-gray-700/30">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-honey flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t('welcome.whatsIncluded')}
                </h3>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    {t('welcome.feature1')}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    {t('welcome.feature2')}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    {t('welcome.feature3')}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    {t('welcome.feature4')}
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
      </div>
    </ErrorBoundary>
  );
}

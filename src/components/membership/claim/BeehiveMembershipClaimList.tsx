/**
 * Beehive Membership NFT Claim List
 *
 * Premium black/gold UI with animations
 * Complete integration with Supabase functions
 */

import { useState } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { useI18n } from '../../../contexts/I18nContext';
import { useToast } from '../../../hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MembershipBadge from '../MembershipBadge';
import { ClaimMembershipNFTButton } from './ClaimMembershipNFTButton';
import {
  Crown, Users, Gift, CheckCircle, Lock, Zap,
  Shield, Star, Award, AlertCircle, ArrowRight
} from 'lucide-react';

// Membership levels (matching Membership.tsx style)
const MEMBERSHIP_LEVELS = [
  {
    level: 1,
    price: 130,
    benefits: [
      'Platform Features',
      'Matrix Entry',
      'Learning Materials',
      'Community Access'
    ],
    icon: Shield,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    borderColor: 'border-emerald-200 dark:border-emerald-800'
  },
  {
    level: 2,
    price: 150,
    benefits: [
      'Matrix Rewards',
      'Premium Content',
      'Referral Bonuses',
      'Advanced Features',
      'Requires 3+ Referrals'
    ],
    icon: Star,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800',
    isSpecial: true
  },
  {
    level: 3,
    price: 200,
    benefits: [
      'Gold Tier Benefits',
      'Enhanced Matrix',
      'Bonus Multiplier',
      'Premium Status'
    ],
    icon: Crown,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    borderColor: 'border-purple-200 dark:border-purple-800'
  },
  {
    level: 4,
    price: 250,
    benefits: [
      'Platinum Benefits',
      'Maximum Matrix',
      'VIP Status',
      'Enhanced Features'
    ],
    icon: Zap,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    borderColor: 'border-orange-200 dark:border-orange-800'
  },
  {
    level: 5,
    price: 300,
    benefits: [
      'Diamond Benefits',
      'Full Matrix Access',
      'Elite Status',
      'Governance Rights'
    ],
    icon: Award,
    color: 'text-honey',
    bgColor: 'bg-honey/10 dark:bg-honey/20',
    borderColor: 'border-honey/30'
  },
];

interface BeehiveMembershipClaimListProps {
  onSuccess?: (level: number) => void;
  maxLevel?: number;
  referrerWallet?: string;
}

export function BeehiveMembershipClaimList({
  onSuccess,
  maxLevel = 5,
  referrerWallet,
}: BeehiveMembershipClaimListProps) {
  const { t } = useI18n();
  const account = useActiveAccount();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  // Fetch user status
  const { data: userStatus, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user-status', account?.address],
    enabled: !!account?.address,
    queryFn: async () => {
      const API_BASE = import.meta.env.VITE_API_BASE_URL ||
        'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';

      const response = await fetch(`${API_BASE}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': account!.address,
        },
        body: JSON.stringify({ action: 'get-user' }),
      });

      if (!response.ok) throw new Error('Failed to fetch user status');
      return response.json();
    },
  });

  // Fetch direct referrals
  const { data: directReferralsCount = 0 } = useQuery({
    queryKey: ['/direct-referrals', account?.address],
    enabled: !!account?.address && userStatus?.isRegistered,
    queryFn: async () => {
      const { getDirectReferralCount } = await import('../../../lib/services/directReferralService');
      return getDirectReferralCount(account!.address);
    },
  });

  const isRegistered = userStatus?.isRegistered ?? false;
  const currentLevel = userStatus?.membershipLevel ?? 0;

  const displayedLevels = MEMBERSHIP_LEVELS.slice(0, maxLevel);

  const getLevelStatus = (level: number) => {
    if (!isRegistered) return 'not_registered';
    if (level <= currentLevel) return 'owned';
    if (level > currentLevel + 1) return 'locked';
    if (level === 2 && directReferralsCount < 3) return 'needs_referrals';
    return 'available';
  };

  return (
    <div className="w-full">
      {/* Premium Header - Beehive Style */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Crown className="h-10 w-10 text-honey" />
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-honey via-honey/90 to-honey/70 bg-clip-text text-transparent">
            {t('membership.title')}
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
          {t('membership.subtitle')}
        </p>

        {/* Current Level Display - Matching Membership.tsx */}
        {isRegistered && currentLevel > 0 && (
          <div className="relative max-w-lg mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-honey/20 via-orange-500/20 to-honey/20 rounded-3xl blur-xl"></div>
            <div className="relative flex items-center justify-center gap-6 p-8 bg-gradient-to-br from-white/90 via-white/95 to-white/90 dark:from-gray-900/90 dark:via-gray-800/95 dark:to-gray-900/90 rounded-3xl border border-white/20 dark:border-gray-700/30 backdrop-blur-lg shadow-2xl">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-honey/30 to-orange-500/30 rounded-full blur-md"></div>
                <MembershipBadge level={currentLevel} />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-muted-foreground/80 mb-1">{t('membership.currentLevel')}</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-honey via-orange-500 to-honey bg-clip-text text-transparent">
                  Level {currentLevel}
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {t('membership.directReferrals')}: <span className="font-semibold text-honey">{directReferralsCount}</span>
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Premium Membership Levels Grid - Responsive Mobile Design */}
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
        <AnimatePresence mode="popLayout">
          {displayedLevels.map((membership, index) => {
            const Icon = membership.icon;
            const status = getLevelStatus(membership.level);
            const isSelected = selectedLevel === membership.level;
            const isAvailable = status === 'available';
            const isOwned = status === 'owned';
            const isLocked = status === 'locked' || status === 'needs_referrals';
            const totalPrice = membership.price;

            return (
              <motion.div
                key={membership.level}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.1,
                }}
                whileHover={!isLocked ? { y: -8 } : {}}
                onClick={() => !isLocked && setSelectedLevel(isSelected ? null : membership.level)}
                className={`group relative transition-all duration-500 ${!isLocked ? 'cursor-pointer' : ''} ${
                  isOwned ? 'opacity-80' : ''
                }`}
              >
                {/* Background Glow Effect - Beehive Style */}
                <div className={`absolute -inset-1 rounded-3xl transition-all duration-500 ${
                  isAvailable && isSelected
                    ? 'bg-gradient-to-br from-honey/20 via-orange-500/20 to-honey/20 blur-xl group-hover:blur-2xl group-hover:scale-105'
                    : isAvailable
                    ? 'bg-gradient-to-br from-honey/10 via-orange-500/10 to-honey/10 blur-lg opacity-0 group-hover:opacity-100'
                    : 'bg-gradient-to-br from-gray-200/20 via-gray-300/20 to-gray-200/20 dark:from-gray-700/20 dark:via-gray-600/20 dark:to-gray-700/20 blur-lg'
                }`}></div>

                {/* Featured Badge */}
                {isAvailable && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-honey/50 to-orange-500/50 rounded-full blur-md"></div>
                      <Badge className="relative bg-gradient-to-r from-honey via-orange-500 to-honey text-black font-bold px-4 py-2 text-sm shadow-lg">
                        ✨ {t('membership.featured')}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Main Card */}
                <Card className={`relative z-10 overflow-hidden border-0 bg-gradient-to-br from-white/95 via-white/98 to-white/95 dark:from-gray-900/95 dark:via-gray-800/98 dark:to-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl transition-all duration-500 ${
                  isAvailable && isSelected
                    ? 'ring-2 ring-honey/30 shadow-honey/20'
                    : 'shadow-gray-200/50 dark:shadow-gray-800/50'
                } group-hover:shadow-3xl`}>

                  {/* Owned Badge */}
                  {isOwned && (
                    <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10">
                      <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs sm:text-sm">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {t('membership.status.owned')}
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="relative p-4 sm:p-6 md:p-8 pb-3 sm:pb-4 md:pb-6">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                        {/* Icon with Glow */}
                        <div className="relative">
                          <div className={`absolute inset-0 rounded-xl sm:rounded-2xl transition-all duration-300 ${
                            isAvailable
                              ? 'bg-gradient-to-r from-honey/30 to-orange-500/30 blur-md group-hover:blur-lg'
                              : 'bg-gradient-to-r from-gray-300/30 to-gray-400/30 dark:from-gray-600/30 dark:to-gray-700/30 blur-sm group-hover:blur-md'
                          }`}></div>
                          <div className={`relative p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl ${
                            isAvailable
                              ? 'bg-gradient-to-br from-honey/20 to-orange-500/20'
                              : membership.bgColor
                          } backdrop-blur-sm`}>
                            <Icon className={`h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 ${membership.color} transition-all duration-300 group-hover:scale-110`} />
                          </div>
                        </div>

                        {/* Level Title */}
                        <div>
                          <CardTitle className={`text-xl sm:text-2xl font-bold mb-1 ${
                            isAvailable
                              ? 'bg-gradient-to-r from-honey via-orange-500 to-honey bg-clip-text text-transparent'
                              : 'text-foreground'
                          }`}>
                            Level {membership.level}
                          </CardTitle>
                        </div>
                      </div>

                      {isLocked && (
                        <div className="p-1.5 sm:p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                          <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Premium Price Display */}
                    <div className={`text-center p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl ${
                      isAvailable
                        ? 'bg-gradient-to-br from-honey/10 via-orange-500/10 to-honey/10 border border-honey/20'
                        : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200/50 dark:border-gray-700/50'
                    } backdrop-blur-sm transition-all duration-300 group-hover:scale-105`}>
                      <div className={`text-3xl sm:text-4xl font-bold mb-1 sm:mb-2 ${
                        isAvailable
                          ? 'bg-gradient-to-r from-honey via-orange-500 to-honey bg-clip-text text-transparent'
                          : 'text-foreground'
                      }`}>
                        ${membership.price}
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                        {t('membership.usdcPayment')}
                      </p>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-6 md:p-8 pt-3 sm:pt-4 space-y-4 sm:space-y-6">
                    {/* Level 2 Special Requirements */}
                    {membership.level === 2 && currentLevel === 1 && (
                      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-honey/20 bg-gradient-to-r from-honey/5 to-orange-500/5">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-honey" />
                          <span className="font-semibold text-sm sm:text-base text-honey">{t('membership.directReferralRequirement')}</span>
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground mb-2">
                          {directReferralsCount >= 3 ? (
                            <span className="text-emerald-600 font-medium">
                              ✅ {directReferralsCount}/3+ referrals (Qualified)
                            </span>
                          ) : (
                            <span className="text-orange-600 font-medium">
                              ⚠️ {directReferralsCount}/3+ referrals (Need {3 - directReferralsCount} more)
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Premium Benefits */}
                    <div className="space-y-3 sm:space-y-4">
                      <h4 className="font-bold text-base sm:text-lg text-foreground mb-3 sm:mb-4 flex items-center gap-2">
                        <Award className="h-4 w-4 sm:h-5 sm:w-5 text-honey" />
                        {t('membership.exclusiveBenefits')}
                      </h4>
                      <ul className="space-y-2 sm:space-y-3">
                        {membership.benefits.slice(0, 4).map((benefit, idx) => (
                          <li key={idx} className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm group/benefit">
                            <div className="p-0.5 sm:p-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 transition-all duration-200 group-hover/benefit:scale-110 flex-shrink-0 mt-0.5">
                              <CheckCircle className="h-3 w-3 text-emerald-500" />
                            </div>
                            <span className="text-muted-foreground font-medium leading-relaxed">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Premium Action Button */}
                    {!isOwned && (
                      <div className="pt-4 sm:pt-6">
                        <ClaimMembershipNFTButton
                          level={membership.level}
                          price={totalPrice}
                          referrerWallet={referrerWallet}
                          disabled={!isAvailable || !isSelected}
                          isSelected={isSelected}
                          currentLevel={currentLevel}
                          directReferralsCount={directReferralsCount}
                          onSuccess={() => {
                            setSelectedLevel(null);
                            queryClient.invalidateQueries({ queryKey: ['user-status'] });
                            onSuccess?.(membership.level);
                          }}
                        />
                      </div>
                    )}

                    {isSelected && isAvailable && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <Badge className="w-full justify-center bg-honey/20 text-honey border-honey/30">
                          Selected - Click claim button above
                        </Badge>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Registration Prompt */}
      {!isRegistered && account && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-16 relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-honey/10 via-orange-500/10 to-honey/10 rounded-3xl blur-xl"></div>
          <div className="relative p-8 bg-gradient-to-br from-white/90 via-white/95 to-white/90 dark:from-gray-900/90 dark:via-gray-800/95 dark:to-gray-900/90 rounded-3xl border border-white/20 dark:border-gray-700/30 backdrop-blur-lg shadow-2xl">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-honey flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-xl text-foreground mb-2">
                  {t('membership.registrationRequired')}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {t('membership.registrationRequiredDesc')}
                </p>
                <a
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-honey to-orange-500 hover:from-honey/90 hover:to-orange-500/90 text-white font-semibold shadow-lg shadow-honey/30 hover:shadow-honey/50 transition-all"
                >
                  <Users className="h-4 w-4" />
                  {t('auth.registerNow')}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

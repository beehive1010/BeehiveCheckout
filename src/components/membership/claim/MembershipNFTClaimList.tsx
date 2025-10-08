/**
 * Membership NFT Claim List
 *
 * Premium UI with black/gold theme, animations, and complete flow:
 * 1. Registration check
 * 2. Referrer validation
 * 3. USDT approval
 * 4. PayEmbed purchase
 * 5. Membership activation
 */

import { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { useI18n } from '../../../contexts/I18nContext';
import { useToast } from '../../../hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import MembershipBadge from '../MembershipBadge';
import { ClaimMembershipNFTButton } from './ClaimMembershipNFTButton';
import {
  Crown, Users, Gift, CheckCircle, Lock, Zap,
  Shield, Star, Award, AlertCircle, Sparkles
} from 'lucide-react';

// Membership levels configuration
const MEMBERSHIP_LEVELS = [
  {
    level: 1,
    name: 'Bronze Bee',
    price: 130,
    benefits: ['Platform access', 'Matrix entry', 'Basic rewards', 'Community support'],
    icon: Shield,
    color: 'text-emerald-400',
    bgGradient: 'from-emerald-900/20 to-emerald-800/10',
    glowColor: 'shadow-emerald-500/20',
    borderGlow: 'hover:shadow-emerald-500/40',
  },
  {
    level: 2,
    name: 'Silver Bee',
    price: 150,
    benefits: ['Enhanced rewards', 'Referral bonuses', 'Premium content', 'Priority support'],
    icon: Star,
    color: 'text-blue-400',
    bgGradient: 'from-blue-900/20 to-blue-800/10',
    glowColor: 'shadow-blue-500/20',
    borderGlow: 'hover:shadow-blue-500/40',
    requiresDirectReferrals: 3,
  },
  {
    level: 3,
    name: 'Gold Bee',
    price: 200,
    benefits: ['VIP features', 'Higher multiplier', 'Exclusive events', 'Advanced analytics'],
    icon: Crown,
    color: 'text-purple-400',
    bgGradient: 'from-purple-900/20 to-purple-800/10',
    glowColor: 'shadow-purple-500/20',
    borderGlow: 'hover:shadow-purple-500/40',
  },
  {
    level: 4,
    name: 'Platinum Bee',
    price: 250,
    benefits: ['Elite status', 'Maximum rewards', 'Private coaching', 'Beta access'],
    icon: Zap,
    color: 'text-orange-400',
    bgGradient: 'from-orange-900/20 to-orange-800/10',
    glowColor: 'shadow-orange-500/20',
    borderGlow: 'hover:shadow-orange-500/40',
  },
  {
    level: 5,
    name: 'Diamond Bee',
    price: 300,
    benefits: ['Founder perks', 'Governance rights', 'Revenue share', 'Lifetime benefits'],
    icon: Award,
    color: 'text-honey',
    bgGradient: 'from-honey/20 to-orange-500/10',
    glowColor: 'shadow-honey/30',
    borderGlow: 'hover:shadow-honey/50',
  },
];

interface MembershipNFTClaimListProps {
  onSuccess?: (level: number) => void;
  maxLevel?: number; // Show levels up to maxLevel
  referrerWallet?: string;
}

export function MembershipNFTClaimList({
  onSuccess,
  maxLevel = 5,
  referrerWallet,
}: MembershipNFTClaimListProps) {
  const { t } = useI18n();
  const account = useActiveAccount();
  const { toast } = useToast();
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null);

  // Fetch user status
  const { data: userStatus, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user-status', account?.address],
    enabled: !!account?.address,
    queryFn: async () => {
      const API_BASE =
        import.meta.env.VITE_API_BASE_URL ||
        'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';

      const response = await fetch(`${API_BASE}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': account!.address,
        },
        body: JSON.stringify({
          action: 'get-user',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user status');
      }

      return response.json();
    },
  });

  // Fetch direct referrals count
  const { data: directReferralsCount = 0 } = useQuery({
    queryKey: ['direct-referrals', account?.address],
    enabled: !!account?.address && userStatus?.isRegistered,
    queryFn: async () => {
      const { getDirectReferralCount } = await import(
        '../../../lib/services/directReferralService'
      );
      return getDirectReferralCount(account!.address);
    },
  });

  const isRegistered = userStatus?.isRegistered ?? false;
  const currentLevel = userStatus?.membershipLevel ?? 0;

  // Filter levels to display
  const displayedLevels = MEMBERSHIP_LEVELS.slice(0, maxLevel);

  // Handle level selection
  const handleLevelClick = (level: number) => {
    if (level <= currentLevel) {
      toast({
        title: '✅ Already Owned',
        description: `You already own Level ${level}`,
        duration: 3000,
      });
      return;
    }

    if (!isRegistered) {
      toast({
        title: '⚠️ Registration Required',
        description: 'Please register first before claiming NFTs',
        variant: 'destructive',
      });
      return;
    }

    setSelectedLevel(selectedLevel === level ? null : level);
  };

  // Check if level is claimable
  const isLevelClaimable = (level: number) => {
    if (!isRegistered) return false;
    if (level <= currentLevel) return false; // Already owned
    if (level > currentLevel + 1) return false; // Must upgrade sequentially

    // Level 2 requires 3+ direct referrals
    if (level === 2 && directReferralsCount < 3) return false;

    return true;
  };

  return (
    <div className="w-full">
      {/* Header with stats */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-honey/20"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-honey via-orange-400 to-honey bg-clip-text text-transparent mb-2">
              {t('membership.upgradeTitle')}
            </h2>
            <p className="text-gray-400">
              {isRegistered
                ? `Current Level: ${currentLevel} | Direct Referrals: ${directReferralsCount}`
                : 'Please register to start claiming'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {currentLevel > 0 && <MembershipBadge level={currentLevel} />}
          </div>
        </div>
      </motion.div>

      {/* Level cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {displayedLevels.map((membership, index) => {
            const Icon = membership.icon;
            const isOwned = membership.level <= currentLevel;
            const isClaimable = isLevelClaimable(membership.level);
            const isSelected = selectedLevel === membership.level;
            const isHovered = hoveredLevel === membership.level;
            const isLocked = !isOwned && !isClaimable;

            // Level 2 special requirements
            const needsReferrals =
              membership.level === 2 &&
              currentLevel === 1 &&
              directReferralsCount < 3;

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
                  layout: { duration: 0.3 },
                }}
                whileHover={{ y: -8 }}
                onMouseEnter={() => setHoveredLevel(membership.level)}
                onMouseLeave={() => setHoveredLevel(null)}
                onClick={() => handleLevelClick(membership.level)}
                className="cursor-pointer relative group"
              >
                {/* Glow effect */}
                <div
                  className={`absolute -inset-1 rounded-2xl blur-xl transition-all duration-500 ${
                    isSelected || isHovered
                      ? 'bg-gradient-to-r from-honey via-orange-500 to-honey opacity-75'
                      : 'bg-gradient-to-r from-gray-600 to-gray-700 opacity-0 group-hover:opacity-50'
                  }`}
                />

                <Card
                  className={`relative overflow-hidden transition-all duration-300 ${
                    isSelected
                      ? 'ring-2 ring-honey shadow-2xl border-honey/50'
                      : 'border-gray-800 hover:border-honey/30'
                  } ${
                    isOwned ? 'bg-emerald-950/20' : 'bg-black/90'
                  } backdrop-blur-xl`}
                >
                  {/* Owned badge */}
                  {isOwned && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-4 right-4 z-10"
                    >
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Owned
                      </Badge>
                    </motion.div>
                  )}

                  {/* Locked overlay */}
                  {isLocked && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center">
                      <div className="text-center">
                        <Lock className="h-12 w-12 text-gray-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">
                          {membership.level === 2 && needsReferrals
                            ? `Need ${3 - directReferralsCount} more referrals`
                            : 'Locked'}
                        </p>
                      </div>
                    </div>
                  )}

                  <CardHeader className="pb-4">
                    {/* Icon and title */}
                    <div className="flex items-center gap-4 mb-4">
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                        className={`p-4 rounded-xl bg-gradient-to-br ${membership.bgGradient} ${membership.glowColor} shadow-lg`}
                      >
                        <Icon className={`h-8 w-8 ${membership.color}`} />
                      </motion.div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">
                          {membership.name}
                        </h3>
                        <p className="text-sm text-gray-400">Level {membership.level}</p>
                      </div>
                    </div>

                    {/* Price card */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className={`p-4 rounded-xl border backdrop-blur-sm ${
                        isClaimable
                          ? 'bg-gradient-to-br from-honey/10 to-orange-500/10 border-honey/30'
                          : 'bg-gray-900/50 border-gray-800'
                      }`}
                    >
                      <div className="text-center">
                        <p className="text-4xl font-bold bg-gradient-to-r from-honey to-orange-400 bg-clip-text text-transparent">
                          ${membership.price}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">USDT Payment</p>
                      </div>
                    </motion.div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Benefits list */}
                    <div>
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-gray-300">
                        <Sparkles className="h-4 w-4 text-honey" />
                        Benefits:
                      </h4>
                      <ul className="space-y-2">
                        {membership.benefits.map((benefit, idx) => (
                          <motion.li
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 + idx * 0.05 }}
                            className="flex items-start gap-2 text-sm text-gray-400"
                          >
                            <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <span>{benefit}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>

                    {/* Special requirement for Level 2 */}
                    {membership.level === 2 && currentLevel === 1 && (
                      <div
                        className={`p-3 rounded-lg border ${
                          directReferralsCount >= 3
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-orange-500/10 border-orange-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm">
                          {directReferralsCount >= 3 ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-emerald-400" />
                              <span className="text-emerald-400">
                                {directReferralsCount}/3 referrals ✓
                              </span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4 text-orange-400" />
                              <span className="text-orange-400">
                                Need {3 - directReferralsCount} more referrals
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Claim button */}
                    {!isOwned && (
                      <ClaimMembershipNFTButton
                        level={membership.level}
                        price={membership.price}
                        referrerWallet={referrerWallet}
                        disabled={!isClaimable || !isSelected}
                        isSelected={isSelected}
                        currentLevel={currentLevel}
                        directReferralsCount={directReferralsCount}
                        onSuccess={() => {
                          setSelectedLevel(null);
                          onSuccess?.(membership.level);
                        }}
                        className="w-full"
                      />
                    )}

                    {/* Selected indicator */}
                    {isSelected && !isOwned && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <Badge className="w-full justify-center bg-honey/20 text-honey border-honey/30">
                          <Zap className="h-3 w-3 mr-1" />
                          Selected - Click claim to proceed
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

      {/* Registration prompt */}
      {!isRegistered && account && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-orange-900/20 to-red-900/20 border border-orange-500/30"
        >
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-orange-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg text-orange-400 mb-2">
                Registration Required
              </h3>
              <p className="text-gray-300 mb-4">
                Please complete registration before claiming membership NFTs.
              </p>
              <a
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-honey to-orange-500 text-black font-semibold hover:shadow-lg hover:shadow-honey/50 transition-all"
              >
                <Users className="h-4 w-4" />
                Register Now
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

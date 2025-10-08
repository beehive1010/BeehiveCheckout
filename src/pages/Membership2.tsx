/**
 * Membership2 Page - PayEmbed Version
 *
 * Uses BeehiveMembershipClaimList for all membership upgrades (Level 2-19)
 * with PayEmbed purchase flow
 */

import { useActiveAccount } from 'thirdweb/react';
import { useQuery } from '@tanstack/react-query';
import { BeehiveMembershipClaimList } from '../components/membership/claim/BeehiveMembershipClaimList';
import { Card, CardContent } from '../components/ui/card';
import { useI18n } from '../contexts/I18nContext';
import { useToast } from '../hooks/use-toast';
import { Crown, TrendingUp, Users, Award } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Membership2() {
  const { t } = useI18n();
  const account = useActiveAccount();
  const { toast } = useToast();

  // Fetch user status
  const { data: userStatus } = useQuery({
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

  // Fetch referrer wallet
  const { data: referrerWallet } = useQuery({
    queryKey: ['referrer', account?.address],
    enabled: !!account?.address && userStatus?.isRegistered,
    queryFn: async () => {
      const { supabase } = await import('../lib/supabase');
      const { data } = await supabase
        .from('members')
        .select('referrer_wallet')
        .ilike('wallet_address', account!.address)
        .maybeSingle();

      return data?.referrer_wallet || null;
    },
  });

  const currentLevel = userStatus?.membershipLevel ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-gray-700/30 backdrop-blur-lg">
              <CardContent className="p-6 text-center">
                <Crown className="h-8 w-8 text-honey mx-auto mb-3" />
                <div className="text-3xl font-bold text-white mb-1">{currentLevel}</div>
                <div className="text-sm text-gray-400">Current Level</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-gray-700/30 backdrop-blur-lg">
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white mb-1">{19 - currentLevel}</div>
                <div className="text-sm text-gray-400">Levels Remaining</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-gray-700/30 backdrop-blur-lg">
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white mb-1">3×3</div>
                <div className="text-sm text-gray-400">Matrix Structure</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-gray-700/30 backdrop-blur-lg">
              <CardContent className="p-6 text-center">
                <Award className="h-8 w-8 text-purple-500 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white mb-1">19</div>
                <div className="text-sm text-gray-400">Max Layers</div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Main Content - Membership Claim List */}
        <BeehiveMembershipClaimList
          maxLevel={19}
          referrerWallet={referrerWallet || undefined}
          onSuccess={(level) => {
            console.log(`✅ Level ${level} upgrade started`);
            toast({
              title: '🎉 Purchase Flow Started',
              description: `Proceeding to payment for Level ${level}`,
              duration: 3000,
            });
          }}
        />

        {/* Bottom Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 relative max-w-4xl mx-auto"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-honey/10 via-orange-500/10 to-honey/10 rounded-3xl blur-xl"></div>
          <div className="relative p-8 bg-gradient-to-br from-gray-900/90 via-gray-800/95 to-gray-900/90 rounded-3xl border border-gray-700/30 backdrop-blur-lg text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              Upgrade Your Membership
            </h3>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Each level unlocks more rewards and benefits. Upgrade sequentially from Level {currentLevel} to Level {currentLevel + 1} to continue your journey.
            </p>
            <div className="flex items-center justify-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-gray-400">Available to Claim</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                <span className="text-gray-400">Locked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-honey"></div>
                <span className="text-gray-400">Owned</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

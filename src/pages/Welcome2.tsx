/**
 * Welcome2 Page - PayEmbed Version
 *
 * Uses BeehiveMembershipClaimList for Level 1 activation
 * with PayEmbed purchase flow
 */

import { useActiveAccount } from 'thirdweb/react';
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { BeehiveMembershipClaimList } from '../components/membership/claim/BeehiveMembershipClaimList';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useI18n } from '../contexts/I18nContext';
import { Crown, Sparkles, ArrowRight, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Welcome2() {
  const { t } = useI18n();
  const account = useActiveAccount();
  const [, setLocation] = useLocation();
  const [referrerWallet, setReferrerWallet] = useState<string | null>(null);

  // Get referrer from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferrerWallet(ref);
      localStorage.setItem('referrer', ref);
    } else {
      const stored = localStorage.getItem('referrer');
      if (stored) setReferrerWallet(stored);
    }
  }, []);

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

  const isRegistered = userStatus?.isRegistered ?? false;
  const isActivated = userStatus?.isMember ?? false;
  const currentLevel = userStatus?.membershipLevel ?? 0;

  // Redirect if already activated
  useEffect(() => {
    if (isActivated && currentLevel > 0) {
      setLocation('/dashboard');
    }
  }, [isActivated, currentLevel, setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Hero Section */}
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
              Welcome to Beehive
            </span>
          </h1>

          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Start your journey with Level 1 Membership NFT
          </p>

          {/* Stats Banner */}
          <div className="relative max-w-4xl mx-auto mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-honey/20 via-orange-500/20 to-honey/20 rounded-3xl blur-xl"></div>
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 p-8 bg-gradient-to-br from-gray-900/90 via-gray-800/95 to-gray-900/90 rounded-3xl border border-gray-700/30 backdrop-blur-lg">
              <div className="text-center">
                <div className="text-4xl font-bold text-honey mb-2">$130</div>
                <div className="text-sm text-gray-400">Entry Price (USDT)</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-honey mb-2">19</div>
                <div className="text-sm text-gray-400">Maximum Levels</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-honey mb-2">∞</div>
                <div className="text-sm text-gray-400">Earning Potential</div>
              </div>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {account && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-4 py-2">
                <CheckCircle className="h-4 w-4 mr-2" />
                Wallet Connected
              </Badge>
            )}
            {isRegistered && (
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-4 py-2">
                <CheckCircle className="h-4 w-4 mr-2" />
                Registered
              </Badge>
            )}
            {referrerWallet && (
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 px-4 py-2">
                <Sparkles className="h-4 w-4 mr-2" />
                Referrer: {referrerWallet.substring(0, 8)}...
              </Badge>
            )}
          </div>
        </motion.div>

        {/* Main Content - Level 1 Claim */}
        <div className="max-w-5xl mx-auto">
          <BeehiveMembershipClaimList
            maxLevel={1}
            referrerWallet={referrerWallet || undefined}
            onSuccess={(level) => {
              console.log(`✅ Level ${level} activation started`);
              // Will redirect to dashboard after successful activation
            }}
          />
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 max-w-5xl mx-auto">
          <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-gray-700/30 backdrop-blur-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-honey">
                <Sparkles className="h-5 w-5" />
                What's Included
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-300">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Full platform access and features</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Entry to 19-layer 3×3 matrix system</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Earn from referrals and matrix rewards</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Access to learning materials</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-gray-700/30 backdrop-blur-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-honey">
                <ArrowRight className="h-5 w-5" />
                Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-300">
              <div className="flex items-start gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-honey/20 text-honey font-bold text-sm flex-shrink-0">
                  1
                </div>
                <span>Click "Claim Level 1" button above</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-honey/20 text-honey font-bold text-sm flex-shrink-0">
                  2
                </div>
                <span>Approve USDT spending (one-time)</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-honey/20 text-honey font-bold text-sm flex-shrink-0">
                  3
                </div>
                <span>Complete payment on PayEmbed page</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-honey/20 text-honey font-bold text-sm flex-shrink-0">
                  4
                </div>
                <span>Membership activated automatically!</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        {!isRegistered && account && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 text-center"
          >
            <Card className="max-w-2xl mx-auto bg-gradient-to-br from-orange-900/20 to-red-900/20 border-orange-500/30">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-orange-400 mb-4">
                  Registration Required
                </h3>
                <p className="text-gray-300 mb-6">
                  Please register before claiming your membership NFT
                </p>
                <a
                  href="/register"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-honey to-orange-500 hover:from-honey/90 hover:to-orange-500/90 text-white font-semibold shadow-lg shadow-honey/30 hover:shadow-honey/50 transition-all"
                >
                  Register Now
                  <ArrowRight className="h-5 w-5" />
                </a>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/**
 * Test Page: PayEmbed-style Membership NFT Claim
 *
 * This page demonstrates the StarNFT-inspired claim flow:
 * 1. Display membership levels (1-19) in a grid
 * 2. Click to select a level
 * 3. Approve USDT if needed
 * 4. Navigate to /purchase page with PayEmbed
 */

import { useState } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useI18n } from '../contexts/I18nContext';
import { BeehiveMembershipClaimList } from '../components/membership/claim/BeehiveMembershipClaimList';
import MembershipBadge from '../components/membership/MembershipBadge';
import { Crown, Users, Gift, CheckCircle } from 'lucide-react';

// Membership levels configuration (similar to StarNFT tiers)
const MEMBERSHIP_LEVELS = [
  {
    level: 1,
    name: 'Bronze Bee',
    price: 130,
    benefits: ['Platform access', 'Matrix entry', 'Basic rewards'],
    icon: Crown,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950',
  },
  {
    level: 2,
    name: 'Silver Bee',
    price: 150,
    benefits: ['Enhanced rewards', 'Referral bonuses', '3+ direct referrals required'],
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
  },
  {
    level: 3,
    name: 'Gold Bee',
    price: 200,
    benefits: ['Premium features', 'Higher multiplier', 'VIP support'],
    icon: Gift,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
  },
  {
    level: 4,
    name: 'Platinum Bee',
    price: 250,
    benefits: ['Elite status', 'Exclusive rewards', 'Priority access'],
    icon: Crown,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
  },
  {
    level: 5,
    name: 'Diamond Bee',
    price: 300,
    benefits: ['Maximum rewards', 'Founder perks', 'Governance rights'],
    icon: Crown,
    color: 'text-honey',
    bgColor: 'bg-honey/10',
  },
];

export default function TestPayEmbedClaim() {
  const { t } = useI18n();
  const account = useActiveAccount();
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-honey via-orange-500 to-honey bg-clip-text text-transparent">
          🧪 PayEmbed Claim Test
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Test the StarNFT-inspired claim flow: Select → Approve → Purchase with PayEmbed
        </p>
        {account && (
          <p className="mt-4 text-sm text-muted-foreground">
            Connected: {account.address.substring(0, 10)}...{account.address.slice(-8)}
          </p>
        )}
      </div>

      {/* Info Banner */}
      <Card className="mb-8 border-honey/20 bg-honey/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-honey/20">
              <CheckCircle className="h-6 w-6 text-honey" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">How it works:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Click on a membership level card to select it</li>
                <li>Click the "Claim Level X" button</li>
                <li>Approve USDT spending if needed (one-time)</li>
                <li>You'll be redirected to the purchase page with PayEmbed</li>
                <li>Complete payment using PayEmbed (supports multiple payment methods)</li>
                <li>NFT will be minted and membership activated</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Beehive Premium Membership List */}
      <BeehiveMembershipClaimList
        maxLevel={5}
        onSuccess={(level) => {
          console.log(`✅ Level ${level} claim flow started successfully`);
        }}
      />

      {/* Development Notes */}
      <Card className="mt-12 border-blue-500/20 bg-blue-500/5">
        <CardHeader>
          <CardTitle className="text-blue-600 dark:text-blue-400">
            🔧 Development Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Component:</strong> <code>ClaimMembershipNFT.tsx</code>
          </p>
          <p>
            <strong>Flow:</strong> Based on StarNFT claim pattern (approve → navigate to purchase page)
          </p>
          <p>
            <strong>Contract:</strong> 0xe57332db0B8d7e6aF8a260a4fEcfA53104728693 (Arbitrum)
          </p>
          <p>
            <strong>Payment:</strong> USDT on Arbitrum (6 decimals)
          </p>
          <p>
            <strong>Next Step:</strong> Create /purchase page with PayEmbed integration
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

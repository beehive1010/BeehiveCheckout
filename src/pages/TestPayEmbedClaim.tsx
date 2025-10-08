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
import { ClaimMembershipNFT } from '../components/membership/claim/ClaimMembershipNFT';
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

      {/* Membership Levels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MEMBERSHIP_LEVELS.map((membership) => {
          const Icon = membership.icon;
          const isSelected = selectedLevel === membership.level;

          return (
            <Card
              key={membership.level}
              onClick={() => setSelectedLevel(membership.level)}
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                isSelected
                  ? 'ring-2 ring-honey shadow-honey/20 border-honey/30'
                  : 'hover:border-honey/20'
              }`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${membership.bgColor}`}>
                      <Icon className={`h-6 w-6 ${membership.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{membership.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">Level {membership.level}</p>
                    </div>
                  </div>
                  <MembershipBadge level={membership.level} />
                </div>

                {/* Price */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200/50 dark:border-gray-700/50">
                  <div className="text-3xl font-bold text-foreground">${membership.price}</div>
                  <p className="text-sm text-muted-foreground">USDT Payment</p>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Benefits */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Gift className="h-4 w-4 text-honey" />
                    Benefits:
                  </h4>
                  <ul className="space-y-2">
                    {membership.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Claim Button */}
                <ClaimMembershipNFT
                  level={membership.level}
                  disabled={!isSelected}
                  onSuccess={() => {
                    console.log(`✅ Level ${membership.level} claim flow started`);
                  }}
                  onError={(error) => {
                    console.error(`❌ Level ${membership.level} claim error:`, error);
                  }}
                />

                {isSelected && (
                  <Badge className="w-full justify-center bg-honey/20 text-honey border-honey/30">
                    Selected
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

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

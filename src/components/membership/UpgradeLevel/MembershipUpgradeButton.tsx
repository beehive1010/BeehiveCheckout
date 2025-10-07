/**
 * Membership Upgrade Button (Level 2-19)
 *
 * Handles membership level upgrades with specific requirements:
 * - Level 2: Requires 3+ direct referrals
 * - Level 3-19: Sequential upgrade (must own previous level)
 * - Dynamic pricing based on level
 */

import { useEffect, useState } from 'react';
import { useActiveAccount, useActiveWalletChain, useSwitchActiveWalletChain } from 'thirdweb/react';
import { arbitrum } from 'thirdweb/chains';
import { getContract } from 'thirdweb';
import { balanceOf } from 'thirdweb/extensions/erc1155';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { Coins, Crown, Loader2, Star, TrendingUp, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../contexts/I18nContext';
import { client } from '../../lib/thirdwebClient';
import { useNFTClaim } from './core/NFTClaimButton';

interface MembershipUpgradeButtonProps {
  targetLevel: number; // 2-19
  currentLevel: number;
  directReferralsCount: number;
  onSuccess?: () => void;
  className?: string;
}

// Level pricing configuration
const LEVEL_PRICING: Record<number, number> = {
  2: 150,
  3: 200,
  4: 250,
  5: 300,
  6: 350,
  7: 400,
  8: 450,
  9: 500,
  10: 550,
  11: 600,
  12: 650,
  13: 700,
  14: 750,
  15: 800,
  16: 850,
  17: 900,
  18: 950,
  19: 1000,
};

// Level requirements
interface LevelRequirement {
  directReferrals: number;
  description: string;
}

const getLevelRequirements = (level: number): LevelRequirement => {
  if (level === 2) {
    return {
      directReferrals: 3,
      description: 'Level 2 requires 3+ direct referrals',
    };
  }
  // Levels 3-19 only require sequential upgrade
  return {
    directReferrals: 0,
    description: `Sequential upgrade from Level ${level - 1}`,
  };
};

const NFT_CONTRACT = '0xe57332db0B8d7e6aF8a260a4fEcfA53104728693';

export function MembershipUpgradeButton({
  targetLevel,
  currentLevel,
  directReferralsCount,
  onSuccess,
  className = '',
}: MembershipUpgradeButtonProps): JSX.Element {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const switchChain = useSwitchActiveWalletChain();
  const { toast } = useToast();
  const { t } = useI18n();
  const { claimNFT, isProcessing, currentStep } = useNFTClaim();

  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [canUpgrade, setCanUpgrade] = useState(false);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);
  const [alreadyOwnsLevel, setAlreadyOwnsLevel] = useState(false);

  const levelPrice = LEVEL_PRICING[targetLevel] || 0;
  const requirements = getLevelRequirements(targetLevel);

  // Check network status
  useEffect(() => {
    if (activeChain?.id && activeChain.id !== arbitrum.id) {
      setIsWrongNetwork(true);
    } else {
      setIsWrongNetwork(false);
    }
  }, [activeChain?.id]);

  // Check eligibility
  useEffect(() => {
    if (account?.address) {
      checkUpgradeEligibility();
    }
  }, [account?.address, targetLevel, currentLevel, directReferralsCount]);

  const handleSwitchNetwork = async () => {
    if (!switchChain) return;

    try {
      await switchChain(arbitrum);
      toast({
        title: 'Network Switched',
        description: 'Successfully switched to Arbitrum One',
        variant: 'default',
      });
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      toast({
        title: 'Network Switch Failed',
        description: error.message || 'Could not switch to Arbitrum One. Please switch manually in your wallet.',
        variant: 'destructive',
      });
    }
  };

  const checkUpgradeEligibility = async () => {
    if (!account?.address) return;

    setIsCheckingEligibility(true);
    try {
      console.log(`🔍 Checking Level ${targetLevel} upgrade eligibility for:`, account.address);

      // Check 1: Must own previous level (sequential upgrade)
      if (currentLevel !== targetLevel - 1) {
        console.log(
          `❌ User current level: ${currentLevel}, but target level ${targetLevel} requires level ${targetLevel - 1}`
        );
        setCanUpgrade(false);
        setIsCheckingEligibility(false);
        return;
      }

      // Check 2: Level 2 requires 3+ direct referrals
      if (targetLevel === 2 && directReferralsCount < requirements.directReferrals) {
        console.log(
          `❌ Level 2 requires ${requirements.directReferrals}+ direct referrals. User has ${directReferralsCount}`
        );
        setCanUpgrade(false);
        setIsCheckingEligibility(false);
        return;
      }

      // Check 3: Verify not already owned on blockchain
      try {
        const nftContract = getContract({
          client,
          address: NFT_CONTRACT,
          chain: arbitrum,
        });

        const levelBalance = await balanceOf({
          contract: nftContract,
          owner: account.address,
          tokenId: BigInt(targetLevel),
        });

        if (Number(levelBalance) > 0) {
          console.log(`❌ User already owns Level ${targetLevel} NFT`);
          setAlreadyOwnsLevel(true);
          setCanUpgrade(false);
          setIsCheckingEligibility(false);
          return;
        }
      } catch (nftCheckError) {
        console.warn(`⚠️ Could not check Level ${targetLevel} NFT balance:`, nftCheckError);
      }

      // All checks passed
      console.log(`✅ User eligible for Level ${targetLevel} upgrade`);
      setCanUpgrade(true);
    } catch (error) {
      console.error(`❌ Error checking Level ${targetLevel} eligibility:`, error);
      setCanUpgrade(false);
    } finally {
      setIsCheckingEligibility(false);
    }
  };

  const handleUpgrade = async () => {
    if (!account?.address || !canUpgrade || isWrongNetwork || isProcessing) {
      return;
    }

    // Use the core claim function
    const result = await claimNFT({
      level: targetLevel,
      priceUSDT: levelPrice,
      activationEndpoint: 'level-upgrade',
      activationPayload: {
        targetLevel: targetLevel,
        network: 'mainnet',
      },
      onSuccess: () => {
        toast({
          title: `🎉 Level ${targetLevel} Upgrade Complete!`,
          description: `Your Level ${targetLevel} membership is now active. Refreshing...`,
          variant: 'default',
          duration: 3000,
        });

        if (onSuccess) {
          onSuccess();
        }

        setTimeout(() => {
          window.location.reload();
        }, 1500);
      },
      onError: () => {
        checkUpgradeEligibility();
      },
    });

    if (result.success) {
      console.log(`✅ Level ${targetLevel} upgrade successful:`, result.txHash);
    }
  };

  const getLevelIcon = () => {
    if (targetLevel <= 2) return TrendingUp;
    if (targetLevel <= 5) return Crown;
    if (targetLevel <= 10) return Star;
    return Crown;
  };

  const Icon = getLevelIcon();

  return (
    <Card className={`bg-gradient-to-br from-blue/5 to-blue/15 border-blue/30 ${className}`}>
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center mb-3">
          <Icon className="h-8 w-8 text-blue-400 mr-2" />
          <Badge className="bg-blue-400/20 text-blue-400 border-blue-400/50">
            Level {targetLevel} Upgrade
          </Badge>
        </div>
        <CardTitle className="text-2xl text-blue-400 mb-2">Upgrade to Level {targetLevel}</CardTitle>
        <p className="text-muted-foreground">
          Upgrade from Level {currentLevel} to Level {targetLevel} membership
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Level Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-lg border border-orange-500/20">
            <Coins className="h-6 w-6 text-orange-400 mx-auto mb-2" />
            <h3 className="font-semibold text-orange-400 mb-1">{levelPrice} USDT</h3>
            <p className="text-xs text-muted-foreground">Level {targetLevel} Price</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20">
            <Crown className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <h3 className="font-semibold text-blue-400 mb-1">Level {targetLevel}</h3>
            <p className="text-xs text-muted-foreground">Target Level</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg border border-purple-500/20">
            <Star className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <h3 className="font-semibold text-purple-400 mb-1">Layer {targetLevel}</h3>
            <p className="text-xs text-muted-foreground">Rewards Trigger</p>
          </div>
        </div>

        {/* Direct Referrals Status (only for Level 2) */}
        {targetLevel === 2 && (
          <div
            className={`p-4 rounded-lg border ${
              directReferralsCount >= 3
                ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20'
                : 'bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Users className={`h-5 w-5 ${directReferralsCount >= 3 ? 'text-emerald-400' : 'text-amber-400'}`} />
              <div
                className={`w-2 h-2 rounded-full ${
                  directReferralsCount >= 3 ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
              ></div>
              <span
                className={`text-sm font-medium ${
                  directReferralsCount >= 3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                Direct Referrals: {directReferralsCount}/3
              </span>
            </div>
            <p
              className={`text-xs ${
                directReferralsCount >= 3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {directReferralsCount >= 3
                ? '✅ Qualified for Level 2 upgrade'
                : `❌ Need ${3 - directReferralsCount} more direct referrals`}
            </p>
          </div>
        )}

        {/* Sequential Upgrade Info (Level 3+) */}
        {targetLevel > 2 && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-400">Sequential Upgrade</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {requirements.description}. No additional referral requirements.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade Button */}
        <div className="space-y-4">
          {/* Wrong network warning */}
          {isWrongNetwork && account?.address && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-950 dark:border-yellow-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Wrong Network</span>
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                You're on {activeChain?.id === 1 ? 'Ethereum Mainnet' : `Network ${activeChain?.id}`}. Switch to
                Arbitrum One to upgrade.
              </p>
              <Button
                onClick={handleSwitchNetwork}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                size="sm"
              >
                Switch to Arbitrum One
              </Button>
            </div>
          )}

          {alreadyOwnsLevel ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center dark:bg-green-950 dark:border-green-800">
              <p className="text-green-800 dark:text-green-200 font-semibold">
                ✅ You already own Level {targetLevel} NFT
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                Your Level {targetLevel} membership is active
              </p>
            </div>
          ) : (
            <Button
              onClick={handleUpgrade}
              disabled={
                !account?.address || isWrongNetwork || !canUpgrade || isCheckingEligibility || isProcessing
              }
              className="w-full h-12 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-400/90 hover:to-blue-600/90 text-white font-semibold text-lg shadow-lg transition-all disabled:opacity-50"
            >
              {!account?.address ? (
                <>
                  <Crown className="mr-2 h-5 w-5" />
                  Connect Wallet
                </>
              ) : isWrongNetwork ? (
                <>
                  <Crown className="mr-2 h-5 w-5" />
                  Switch Network First
                </>
              ) : isCheckingEligibility ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Checking Eligibility...
                </>
              ) : !canUpgrade ? (
                <>
                  <Crown className="mr-2 h-5 w-5" />
                  Requirements Not Met
                </>
              ) : isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Upgrade to Level {targetLevel} - {levelPrice} USDT
                </>
              )}
            </Button>
          )}

          {/* Progress indicator */}
          {isProcessing && currentStep && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border/50">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                <span className="text-muted-foreground">{currentStep}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Please do not close this page...</div>
            </div>
          )}
        </div>

        {/* Additional Information */}
        <div className="text-center text-xs text-muted-foreground pt-2 space-y-1">
          <p>💳 Direct USDT payment on Arbitrum</p>
          <p>⚡ Instant upgrade after claim</p>
          <p>🎁 Layer {targetLevel} rewards activated</p>
        </div>
      </CardContent>
    </Card>
  );
}

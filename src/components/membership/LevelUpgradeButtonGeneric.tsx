import {useEffect, useState} from 'react';
import {useActiveAccount, useActiveWalletChain, useSwitchActiveWalletChain, PayEmbed} from 'thirdweb/react';
import {getContract} from 'thirdweb';
import {arbitrum} from 'thirdweb/chains';
import {balanceOf, claimTo} from 'thirdweb/extensions/erc1155';
import {Button} from '../ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '../ui/card';
import {Badge} from '../ui/badge';
import {useToast} from '../../hooks/use-toast';
import {Clock, Coins, Crown, Loader2, Star, TrendingUp, X} from 'lucide-react';
import {supabase} from '../../lib/supabase';
import {useI18n} from '../../contexts/I18nContext';
import {client} from '../../lib/thirdwebClient';

interface LevelUpgradeButtonGenericProps {
  targetLevel: number;
  currentLevel: number;
  directReferralsCount: number;
  onSuccess?: () => void;
  className?: string;
}

// Dynamic pricing based on level (Layer 2-19: 150-1000 USDC)
const getLevelPrice = (level: number): number => {
  const prices: Record<number, number> = {
    1: 130,   // Level 1 activation
    2: 150,   // Level 2 upgrade
    3: 200,   // Level 3 upgrade
    4: 250,   // Level 4 upgrade
    5: 300,   // Level 5 upgrade
    6: 350,   // Level 6 upgrade
    7: 400,   // Level 7 upgrade
    8: 450,   // Level 8 upgrade
    9: 500,   // Level 9 upgrade
    10: 550,  // Level 10 upgrade
    11: 600,  // Level 11 upgrade
    12: 650,  // Level 12 upgrade
    13: 700,  // Level 13 upgrade
    14: 750,  // Level 14 upgrade
    15: 800,  // Level 15 upgrade
    16: 850,  // Level 16 upgrade
    17: 900,  // Level 17 upgrade
    18: 950,  // Level 18 upgrade
    19: 1000  // Level 19 upgrade
  };
  return prices[level] || (level <= 19 ? 130 + (level - 1) * 50 : 0);
};

// Level requirements
const getLevelRequirements = (level: number): { directReferrals: number; description: string } => {
  if (level === 2) return { directReferrals: 3, description: "Level 2 requires 3+ direct referrals" };
  // For Level 3+, no additional referral requirements
  return { directReferrals: 0, description: `Sequential upgrade from Level ${level - 1}` };
};

export function LevelUpgradeButtonGeneric({
  targetLevel,
  currentLevel,
  directReferralsCount,
  onSuccess,
  className = ''
}: LevelUpgradeButtonGenericProps): JSX.Element {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const switchChain = useSwitchActiveWalletChain();
  const { toast } = useToast();
  const { t } = useI18n();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [canClaimLevel, setCanClaimLevel] = useState(false);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [showPayEmbed, setShowPayEmbed] = useState(false);

  // Dynamic pricing and requirements
  const LEVEL_PRICE_USDC = getLevelPrice(targetLevel);
  const LEVEL_PRICE_WEI = BigInt(LEVEL_PRICE_USDC) * BigInt('1000000'); // USDC has 6 decimals
  const LEVEL_REQUIREMENTS = getLevelRequirements(targetLevel);

  const API_BASE = 'https://cdjmtevekxpmgrixkiqt.supabase.co/functions/v1';
  const PAYMENT_TOKEN_CONTRACT = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"; // Arbitrum USDC (native)
  const NFT_CONTRACT = "0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8"; // ARB ONE Membership Contract

  // Check network status
  useEffect(() => {
    if (activeChain?.id && activeChain.id !== arbitrum.id) {
      setIsWrongNetwork(true);
    } else {
      setIsWrongNetwork(false);
    }
  }, [activeChain?.id]);

  // Check level eligibility
  useEffect(() => {
    if (account?.address) {
      checkLevelEligibility();
    }
  }, [account?.address, targetLevel, currentLevel, directReferralsCount]);

  const checkLevelEligibility = async () => {
    if (!account?.address) return;

    setIsCheckingEligibility(true);
    try {
      console.log(`🔍 Checking Level ${targetLevel} eligibility for:`, account.address);

      // Check if user is at the correct current level
      if (currentLevel !== targetLevel - 1) {
        console.log(`❌ User current level: ${currentLevel}, but target level ${targetLevel} requires level ${targetLevel - 1}`);
        setCanClaimLevel(false);
        setIsCheckingEligibility(false);
        return;
      }

      // Check special requirements for Level 2
      if (targetLevel === 2 && directReferralsCount < LEVEL_REQUIREMENTS.directReferrals) {
        console.log(`❌ Level 2 requires ${LEVEL_REQUIREMENTS.directReferrals}+ direct referrals. User has ${directReferralsCount}`);
        setCanClaimLevel(false);
        setIsCheckingEligibility(false);
        return;
      }

      // Check if user already owns the target level NFT on blockchain
      try {
        const nftContract = getContract({
          client,
          address: NFT_CONTRACT,
          chain: arbitrum
        });

        const levelBalance = await balanceOf({
          contract: nftContract,
          owner: account.address,
          tokenId: BigInt(targetLevel)
        });

        if (Number(levelBalance) > 0) {
          console.log(`❌ User already owns Level ${targetLevel} NFT`);
          setCanClaimLevel(false);
          setIsCheckingEligibility(false);
          return;
        }
      } catch (nftCheckError) {
        console.warn(`⚠️ Could not check Level ${targetLevel} NFT balance:`, nftCheckError);
      }

      // All checks passed
      console.log(`✅ User eligible for Level ${targetLevel} claim`);
      setCanClaimLevel(true);

    } catch (error) {
      console.error(`❌ Error checking Level ${targetLevel} eligibility:`, error);
      setCanClaimLevel(false);
    } finally {
      setIsCheckingEligibility(false);
    }
  };

  const handleSwitchNetwork = async () => {
    if (!switchChain) return;

    try {
      setIsProcessing(true);
      await switchChain(arbitrum);
      toast({
        title: t('wallet.networkSwitched'),
        description: t('wallet.networkSwitchedDesc'),
        variant: "default",
      });
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      toast({
        title: t('wallet.networkSwitchFailed'),
        description: error.message || t('wallet.networkSwitchFailedDesc'),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Open PayEmbed modal
  const handleOpenPayEmbed = () => {
    if (!canClaimLevel || isWrongNetwork || !account?.address) {
      return;
    }
    setShowPayEmbed(true);
  };

  // Close PayEmbed modal
  const handleClosePayEmbed = () => {
    setShowPayEmbed(false);
  };

  const getLevelIcon = () => {
    if (targetLevel <= 2) return TrendingUp;
    if (targetLevel <= 5) return Crown;
    if (targetLevel <= 10) return Star;
    return Crown;
  };

  const getLevelColor = () => {
    if (targetLevel === 2) return 'from-blue-400 to-blue-600';
    if (targetLevel <= 5) return 'from-purple-400 to-purple-600';
    if (targetLevel <= 10) return 'from-orange-400 to-orange-600';
    return 'from-honey to-orange-500';
  };

  const Icon = getLevelIcon();

  // Get NFT contract
  const nftContract = getContract({
    client,
    address: NFT_CONTRACT,
    chain: arbitrum
  });

  return (
    <Card className={`bg-gradient-to-br from-blue/5 to-blue/15 border-blue/30 ${className}`}>
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center mb-3">
          <Icon className="h-8 w-8 text-blue-400 mr-2" />
          <Badge className="bg-blue-400/20 text-blue-400 border-blue-400/50">
            Level {targetLevel} Upgrade
          </Badge>
        </div>
        <CardTitle className="text-2xl text-blue-400 mb-2">
          Claim Level {targetLevel} NFT
        </CardTitle>
        <p className="text-muted-foreground">
          Upgrade from Level {currentLevel} to Level {targetLevel} membership
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Level Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-lg border border-orange-500/20">
            <Coins className="h-6 w-6 text-orange-400 mx-auto mb-2" />
            <h3 className="font-semibold text-orange-400 mb-1">
              {LEVEL_PRICE_USDC} USDC
            </h3>
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

        {/* Requirements Display */}
        {targetLevel === 2 && LEVEL_REQUIREMENTS.directReferrals > 0 && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <h4 className="font-semibold text-orange-800 mb-2">Level 2 Requirements:</h4>
            <p className="text-sm text-orange-700 mb-2">
              • Must own Level 1 NFT ✅
            </p>
            <p className="text-sm text-orange-700">
              • Need {LEVEL_REQUIREMENTS.directReferrals}+ direct referrals
              {directReferralsCount >= LEVEL_REQUIREMENTS.directReferrals ? ' ✅' : ` (${directReferralsCount}/${LEVEL_REQUIREMENTS.directReferrals})`}
            </p>
          </div>
        )}

        {/* Claim Button */}
        <div className="space-y-4">
          {/* Show network switch button if on wrong network */}
          {isWrongNetwork && account?.address && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-yellow-800">Wrong Network</span>
              </div>
              <p className="text-xs text-yellow-700 mb-3">
                You're on {activeChain?.id === 1 ? 'Ethereum Mainnet' : `Network ${activeChain?.id}`}.
                Switch to Arbitrum One to claim your Level {targetLevel} NFT.
              </p>
              <Button
                onClick={handleSwitchNetwork}
                disabled={isProcessing}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                size="sm"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Switching Network...
                  </>
                ) : (
                  'Switch to Arbitrum One'
                )}
              </Button>
            </div>
          )}

          <Button
            onClick={handleOpenPayEmbed}
            disabled={!account?.address || isWrongNetwork || !canClaimLevel || isCheckingEligibility || isProcessing}
            className={`w-full h-12 bg-gradient-to-r ${getLevelColor()} hover:from-blue-400/90 hover:to-blue-600/90 text-white font-semibold text-lg shadow-lg transition-all disabled:opacity-50`}
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
            ) : !canClaimLevel ? (
              <>
                <Crown className="mr-2 h-5 w-5" />
                Requirements Not Met
              </>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Icon className="h-5 w-5" />
                <span>Upgrade to Level {targetLevel} - {LEVEL_PRICE_USDC} USDC</span>
              </div>
            )}
          </Button>

          {/* Progress indicator */}
          {isProcessing && currentStep && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border/50">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-blue-400 animate-pulse" />
                <span className="text-muted-foreground">{currentStep}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Do not close this page while processing...
              </div>
            </div>
          )}
        </div>

        {/* Additional Information */}
        <div className="text-center text-xs text-muted-foreground pt-2 space-y-1">
          <p>📈 Level {currentLevel} → Level {targetLevel} upgrade</p>
          <p>💳 Multi-chain payment supported</p>
          <p>🌉 Automatic cross-chain bridging</p>
          <p>⚡ Instant level activation</p>
          <p>💰 Layer {targetLevel} rewards ({LEVEL_PRICE_USDC} USDC) processed</p>
        </div>
      </CardContent>

      {/* PayEmbed Modal */}
      {showPayEmbed && account?.address && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClosePayEmbed} />
          <div
            className="relative p-4 max-h-[min(90vh,800px)] overflow-y-auto bg-black rounded-2xl w-full max-w-[500px]"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={handleClosePayEmbed}
              className="absolute top-4 right-4 z-10 text-gray-400 hover:text-white p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
              title="Close"
            >
              <X size={24} />
            </button>
            <PayEmbed
              client={client}
              payOptions={{
                mode: "transaction",
                transaction: claimTo({
                  contract: nftContract,
                  to: account.address,
                  tokenId: BigInt(targetLevel),
                  quantity: BigInt(1),
                }),
                metadata: {
                  name: `BEEHIVE Level ${targetLevel} Membership NFT`,
                  image: `https://your-nft-image-url.com/level${targetLevel}.png`,
                },
              }}
              onPaymentSuccess={async (result) => {
                console.log(`🎉 Level ${targetLevel} Payment successful:`, result);
                setShowPayEmbed(false);

                toast({
                  title: `🎉 Level ${targetLevel} NFT Claimed!`,
                  description: `Processing Level ${targetLevel} upgrade...`,
                  duration: 5000
                });

                setIsProcessing(true);
                setCurrentStep(t('membership.claiming.processing', { level: targetLevel }));

                try {
                  await new Promise(resolve => setTimeout(resolve, 3000));

                  const upgradeResponse = await fetch(`${API_BASE}/level-upgrade`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                      'x-wallet-address': account.address,
                    },
                    body: JSON.stringify({
                      action: 'upgrade_level',
                      walletAddress: account.address,
                      targetLevel: targetLevel,
                      transactionHash: result.transactionHash,
                      network: 'mainnet'
                    })
                  });

                  const upgradeResult = await upgradeResponse.json();

                  if (upgradeResult.success) {
                    console.log(`✅ Level ${targetLevel} upgrade processed successfully:`, upgradeResult);
                    toast({
                      title: t('membership.claiming.successEmoji', { level: targetLevel }),
                      description: `Congratulations! Your Level ${targetLevel} membership is now active. Layer ${targetLevel} rewards have been processed.`,
                      variant: "default",
                      duration: 6000,
                    });

                    if (onSuccess) {
                      onSuccess();
                    }
                  } else {
                    throw new Error(`Level upgrade failed: ${upgradeResult.error || upgradeResult.message}`);
                  }
                } catch (error: any) {
                  console.error(`❌ Level ${targetLevel} backend processing error:`, error);
                  toast({
                    title: t('membership.claiming.successCheck', { level: targetLevel }),
                    description: `Your Level ${targetLevel} NFT is minted on blockchain. Backend activation is pending.`,
                    variant: "default",
                    duration: 8000,
                  });
                } finally {
                  setIsProcessing(false);
                  setCurrentStep('');
                  await checkLevelEligibility();
                }
              }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

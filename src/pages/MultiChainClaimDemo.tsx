import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { MultiChainNFTClaimButton } from '../components/membership';
import { useWallet } from '../hooks/useWallet';
import { Crown, Zap, Gift, Star, Sparkles } from 'lucide-react';

export default function MultiChainClaimDemo() {
  const { walletAddress } = useWallet();
  const [selectedLevel, setSelectedLevel] = useState(1);

  const membershipLevels = [
    {
      level: 1,
      name: 'Starter Bee',
      price: 130,
      icon: Crown,
      color: 'from-orange-500 to-yellow-500',
      benefits: ['Matrix Position', 'Direct Rewards', 'Level 1 Access']
    },
    {
      level: 2,
      name: 'Worker Bee',
      price: 260,
      icon: Zap,
      color: 'from-blue-500 to-cyan-500',
      benefits: ['Enhanced Matrix', 'Layer Rewards', 'Level 2 Access']
    },
    {
      level: 3,
      name: 'Queen Bee',
      price: 520,
      icon: Gift,
      color: 'from-purple-500 to-pink-500',
      benefits: ['Premium Matrix', 'Maximum Rewards', 'Level 3 Access']
    },
    {
      level: 4,
      name: 'Elite Bee',
      price: 1040,
      icon: Star,
      color: 'from-green-500 to-emerald-500',
      benefits: ['Elite Status', 'Priority Support', 'Level 4 Access']
    },
    {
      level: 5,
      name: 'Master Bee',
      price: 2080,
      icon: Sparkles,
      color: 'from-red-500 to-rose-500',
      benefits: ['Master Status', 'VIP Benefits', 'Level 5 Access']
    }
  ];

  const handleClaimSuccess = () => {
    console.log(`Level ${selectedLevel} claimed successfully!`);
  };

  const handleClaimError = (error: string) => {
    console.error(`Claim error:`, error);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-honey to-orange-500 bg-clip-text text-transparent">
          Multi-Chain NFT Membership
        </h1>
        <p className="text-muted-foreground text-lg">
          Claim your BEEHIVE membership NFT using any supported blockchain
        </p>
        <Badge className="mt-4 bg-blue-500/20 text-blue-400 border-blue-500/50">
          Pay from Ethereum, Polygon, Arbitrum, Optimism, Base, or BSC
        </Badge>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="pt-6 text-center">
            <div className="bg-blue-500/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Crown className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="font-semibold mb-2 text-blue-400">Multi-Chain Support</h3>
            <p className="text-sm text-muted-foreground">
              Pay with USDC from 6+ blockchains
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardContent className="pt-6 text-center">
            <div className="bg-purple-500/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Zap className="h-6 w-6 text-purple-400" />
            </div>
            <h3 className="font-semibold mb-2 text-purple-400">Automatic Bridging</h3>
            <p className="text-sm text-muted-foreground">
              Seamless cross-chain transactions
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6 text-center">
            <div className="bg-green-500/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Gift className="h-6 w-6 text-green-400" />
            </div>
            <h3 className="font-semibold mb-2 text-green-400">Instant Activation</h3>
            <p className="text-sm text-muted-foreground">
              NFT minted immediately after payment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Membership Levels Tabs */}
      <Tabs defaultValue="1" className="w-full" onValueChange={(value) => setSelectedLevel(parseInt(value))}>
        <TabsList className="grid w-full grid-cols-5 mb-6">
          {membershipLevels.map((level) => (
            <TabsTrigger key={level.level} value={level.level.toString()} className="relative">
              <level.icon className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Level {level.level}</span>
              <span className="sm:hidden">{level.level}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {membershipLevels.map((level) => (
          <TabsContent key={level.level} value={level.level.toString()}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Level Info Card */}
              <Card className={`bg-gradient-to-br ${level.color} bg-opacity-10 border-opacity-30`}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`bg-gradient-to-br ${level.color} p-3 rounded-lg`}>
                      <level.icon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{level.name}</CardTitle>
                      <p className="text-muted-foreground">Level {level.level} Membership</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{level.price} USDC</span>
                    <Badge className={`bg-gradient-to-r ${level.color} text-white border-0`}>
                      One-time Payment
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm uppercase text-muted-foreground">Benefits</h4>
                    {level.benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${level.color}`}></div>
                        <span className="text-sm">{benefit}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>✅ Lifetime membership access</p>
                      <p>✅ NFT minted to your wallet</p>
                      <p>✅ Immediate matrix placement</p>
                      <p>✅ Earn from referrals</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Claim Component */}
              <div className="space-y-4">
                <MultiChainNFTClaimButton
                  level={level.level}
                  priceUSDC={level.price}
                  walletAddress={walletAddress || ''}
                  onSuccess={handleClaimSuccess}
                  onError={handleClaimError}
                  buttonText={`Claim ${level.name}`}
                />

                {/* Info Cards */}
                <Card className="border-yellow-500/30 bg-yellow-500/5">
                  <CardContent className="pt-4">
                    <h4 className="font-semibold text-yellow-400 mb-2 text-sm">💡 How it works</h4>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Select your preferred payment network</li>
                      <li>Ensure you have {level.price} USDC in your wallet</li>
                      <li>Click claim and approve the transaction</li>
                      <li>NFT will be minted to Arbitrum automatically</li>
                    </ol>
                  </CardContent>
                </Card>

                <Card className="border-blue-500/30 bg-blue-500/5">
                  <CardContent className="pt-4">
                    <h4 className="font-semibold text-blue-400 mb-2 text-sm">🌉 Supported Networks</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <span>⟠</span>
                        <span>Ethereum</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>⬡</span>
                        <span>Polygon</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>◆</span>
                        <span>Arbitrum</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>🔴</span>
                        <span>Optimism</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>🔵</span>
                        <span>Base</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>🟡</span>
                        <span>BSC</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Footer Note */}
      <Card className="mt-8 border-muted">
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            🔐 All transactions are secured by smart contracts on the blockchain.
            Your NFT membership is non-custodial and fully owned by you.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

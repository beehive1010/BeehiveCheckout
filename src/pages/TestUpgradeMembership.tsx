import { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { useI18n } from '../contexts/I18nContext';
import { useWallet } from '../hooks/useWallet';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';
import { LevelUpgradeButton } from '../components/membership/LevelUpgradeButton';
import { Level2ClaimButtonV2 } from '../components/membership/Level2ClaimButtonV2';
import { Crown, Shield, Star, Zap, Lock, CheckCircle, Loader2, TrendingUp } from 'lucide-react';
import { LEVEL_PRICING } from '../hooks/useNFTLevelClaim';

interface LevelState {
  level: number;
  status: 'owned' | 'available' | 'locked';
  price: number;
}

export default function TestUpgradeMembership() {
  const { t } = useI18n();
  const account = useActiveAccount();
  const { currentLevel, walletAddress } = useWallet();
  const { toast } = useToast();
  const [levelStates, setLevelStates] = useState<LevelState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLevel, setUserLevel] = useState<number>(0);

  // Initialize level states for levels 3-19
  useEffect(() => {
    const initializeLevelStates = () => {
      const levels: LevelState[] = [];
      for (let level = 3; level <= 19; level++) {
        levels.push({
          level,
          status: 'locked', // Will be updated based on user's current level
          price: LEVEL_PRICING[level as keyof typeof LEVEL_PRICING] || 0
        });
      }
      setLevelStates(levels);
    };

    initializeLevelStates();
  }, []);

  // Fetch user's current level from database
  useEffect(() => {
    const fetchUserLevel = async () => {
      if (!account?.address) {
        setUserLevel(0);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data: memberData, error } = await supabase
          .from('members')
          .select('current_level, wallet_address')
          .eq('wallet_address', account.address.toLowerCase())
          .single();

        let fetchedLevel = 0;
        if (!error && memberData) {
          fetchedLevel = memberData.current_level || 0;
          console.log(`📊 Test page - Current user level: ${fetchedLevel}`);
        } else {
          console.log('❌ Test page - User not found in members table');
        }

        setUserLevel(fetchedLevel);
        
        // Update level states based on user's current level
        setLevelStates(prevStates => 
          prevStates.map(levelState => {
            if (levelState.level <= fetchedLevel) {
              return { ...levelState, status: 'owned' };
            } else if (levelState.level === fetchedLevel + 1) {
              return { ...levelState, status: 'available' };
            } else {
              return { ...levelState, status: 'locked' };
            }
          })
        );

      } catch (error) {
        console.error('❌ Test page - Error fetching user level:', error);
        setUserLevel(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserLevel();
  }, [account?.address]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'owned':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'available':
        return <Star className="h-5 w-5 text-yellow-500" />;
      case 'locked':
        return <Lock className="h-5 w-5 text-gray-400" />;
      default:
        return <Crown className="h-5 w-5 text-blue-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'owned':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200 dark:border-emerald-700';
      case 'available':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700';
      case 'locked':
        return 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700';
    }
  };

  const handleLevelUpgradeSuccess = () => {
    toast({
      title: "Upgrade Successful!",
      description: "Your membership has been upgraded successfully. Refreshing level states...",
      duration: 5000,
    });

    // Refresh user level and states after successful upgrade
    setTimeout(() => {
      window.location.reload(); // Simple refresh for now
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-muted-foreground">Loading membership levels...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          🧪 Test Upgrade Membership
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
          Test page for membership upgrade functionality. Shows levels 3-19 with different states based on your current membership level.
        </p>
        
        {/* Current Status */}
        <div className="inline-flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-blue-500" />
            <span className="font-semibold">Current Level:</span>
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              Level {userLevel}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            <span className="font-semibold">Wallet:</span>
            <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              {account?.address ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : 'Not connected'}
            </code>
          </div>
        </div>
      </div>

      {!account?.address ? (
        <div className="text-center py-12">
          <Crown className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-muted-foreground mb-2">
            Connect Your Wallet
          </h3>
          <p className="text-muted-foreground">
            Please connect your wallet to test the membership upgrade functionality.
          </p>
        </div>
      ) : (
        <>
          {/* Level Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {levelStates.map((levelState) => (
              <Card 
                key={levelState.level} 
                className={`transition-all duration-200 hover:shadow-lg ${
                  levelState.status === 'owned' 
                    ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800'
                    : levelState.status === 'available'
                    ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 ring-2 ring-yellow-300 dark:ring-yellow-700'
                    : 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800'
                }`}
              >
                <CardHeader className="text-center pb-3">
                  <div className="flex items-center justify-center mb-2">
                    {getStatusIcon(levelState.status)}
                  </div>
                  <CardTitle className="text-lg">
                    Level {levelState.level}
                  </CardTitle>
                  <Badge className={`text-xs ${getStatusColor(levelState.status)}`}>
                    {levelState.status.toUpperCase()}
                  </Badge>
                </CardHeader>

                <CardContent className="text-center space-y-4">
                  <div className="text-2xl font-bold text-orange-500">
                    {levelState.price.toLocaleString()} USDT
                  </div>

                  {levelState.status === 'owned' ? (
                    <Button 
                      disabled 
                      className="w-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900 dark:text-emerald-300"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Owned
                    </Button>
                  ) : levelState.status === 'available' ? (
                    <div className="space-y-2">
                      {levelState.level === 2 ? (
                        <Level2ClaimButtonV2
                          onSuccess={handleLevelUpgradeSuccess}
                          className="w-full"
                        />
                      ) : (
                        <LevelUpgradeButton
                          targetLevel={levelState.level}
                          onSuccess={handleLevelUpgradeSuccess}
                          className="w-full"
                        />
                      )}
                    </div>
                  ) : (
                    <Button 
                      disabled 
                      className="w-full bg-gray-100 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-500"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Locked
                    </Button>
                  )}

                  <div className="text-xs text-muted-foreground">
                    {levelState.status === 'owned' && 'You own this level'}
                    {levelState.status === 'available' && 'Available to purchase'}
                    {levelState.status === 'locked' && `Requires Level ${levelState.level - 1}`}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Available Upgrade Section */}
          {userLevel > 0 && userLevel < 19 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-center mb-6">
                🚀 Your Next Upgrade
              </h2>
              <div className="max-w-2xl mx-auto">
                {userLevel === 1 ? (
                  <Level2ClaimButtonV2
                    onSuccess={handleLevelUpgradeSuccess}
                  />
                ) : (
                  <LevelUpgradeButton
                    targetLevel={userLevel + 1}
                    onSuccess={handleLevelUpgradeSuccess}
                  />
                )}
              </div>
            </div>
          )}

          {/* Debug Info */}
          <div className="mt-12 p-6 bg-muted/30 rounded-lg border border-dashed">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              🔧 Debug Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Current Level (useWallet):</strong> {currentLevel}
              </div>
              <div>
                <strong>Current Level (Database):</strong> {userLevel}
              </div>
              <div>
                <strong>Wallet Address:</strong> {walletAddress || 'Not connected'}
              </div>
              <div>
                <strong>Next Available Level:</strong> {userLevel < 19 ? userLevel + 1 : 'Max reached'}
              </div>
              <div className="md:col-span-2">
                <strong>Level States:</strong>
                <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                  {JSON.stringify(levelStates, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
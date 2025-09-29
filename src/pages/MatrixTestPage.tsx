import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useWallet } from '../hooks/useWallet';
import { useWeb3 } from '../contexts/Web3Context';
import { 
  NetworkIcon, 
  UserIcon, 
  ShieldCheckIcon, 
  ChartBarIcon,
  CubeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const MatrixTestPage: React.FC = () => {
  const [matrixData, setMatrixData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWallet, setCurrentWallet] = useState<string | null>(null);
  
  // Use same user data connection as other components
  const { walletAddress, isConnected } = useWeb3();
  const { userStatus, isUserLoading } = useWallet();

  // Fallback test wallets for demonstration
  const testWallets = [
    '0x0000000000000000000000000000000000000001',
    '0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC',
    '0x9C30721F8EbAe0a68577A83C4fc2F7A698E2a501'
  ];

  const loadMatrixData = async (walletAddress: string) => {
    setLoading(true);
    setError(null);
    setCurrentWallet(walletAddress);
    
    try {
      console.log('Testing matrix data for wallet:', walletAddress);
      
      // Use matrix-view Edge Function instead of direct database query
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/matrix-view`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress,
        },
        body: JSON.stringify({
          action: 'get-matrix-tree'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Matrix API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Matrix API returned error');
      }
      
      console.log('Matrix data from Edge Function:', result.data);
      
      // Transform the data to match the expected format
      const treeMembers = result.data.tree_members || [];
      const matrixData = treeMembers.map((member: any) => ({
        matrix_layer: member.layer,
        layer: member.layer,
        matrix_position: member.matrix_position,
        position: member.matrix_position,
        member_wallet: member.wallet_address,
        parent_wallet: member.parent_wallet,
        referrer_wallet: member.parent_wallet,
        is_active: member.is_activated,
        is_activated: member.is_activated,
        placed_at: member.joined_at,
        created_at: member.joined_at,
        activation_time: member.joined_at
      }));
      
      setMatrixData(matrixData);
      
    } catch (error: any) {
      console.error('Error loading matrix data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Priority: Use connected wallet address, fallback to first test wallet
    const addressToLoad = walletAddress || testWallets[0];
    if (addressToLoad) {
      loadMatrixData(addressToLoad);
    }
  }, [walletAddress, isConnected]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Advanced Header with Glassmorphism */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-honey/10 via-transparent to-honey/5"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.1),transparent_70%)]"></div>
        <div className="relative container mx-auto px-6 pt-12 pb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-honey/10 border border-honey/20">
                  <CubeIcon className="w-8 h-8 text-honey" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-honey via-honey/80 to-honey/60 bg-clip-text text-transparent">
                    Matrix Analytics
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    Advanced matrix visualization & testing environment
                  </p>
                </div>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-4">
              <Badge variant="outline" className="px-4 py-2 bg-background/80 backdrop-blur-sm border-honey/30">
                <NetworkIcon className="w-4 h-4 mr-2" />
                Live Network
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 space-y-8 pb-12">
      
        {/* Connection Status Dashboard */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Wallet Status */}
          <Card className="bg-gradient-to-br from-background via-background to-muted/30 border-border/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <div className={`p-2 rounded-lg ${isConnected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  <NetworkIcon className="w-5 h-5" />
                </div>
                Wallet Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge 
                  variant={isConnected ? "default" : "secondary"} 
                  className={`${isConnected ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}
                >
                  {isConnected ? (
                    <><CheckCircleIcon className="w-3 h-3 mr-1" /> Connected</>
                  ) : (
                    <><XCircleIcon className="w-3 h-3 mr-1" /> Disconnected</>
                  )}
                </Badge>
              </div>
              {walletAddress && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Address</span>
                  <div className="font-mono text-sm bg-muted/50 px-3 py-2 rounded-lg border border-border/50">
                    {walletAddress.slice(0, 8)}...{walletAddress.slice(-4)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Status */}
          <Card className="bg-gradient-to-br from-background via-background to-muted/30 border-border/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <UserIcon className="w-5 h-5" />
                </div>
                User Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {userStatus ? (
                <>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Registration</span>
                      <Badge variant={userStatus.isRegistered ? "default" : "secondary"} className={userStatus.isRegistered ? 'bg-green-500/10 text-green-400 border-green-500/30' : ''}>
                        {userStatus.isRegistered ? "✅ Registered" : "❌ Not Registered"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Activation</span>
                      <Badge variant={userStatus.isActivated ? "default" : "secondary"} className={userStatus.isActivated ? 'bg-green-500/10 text-green-400 border-green-500/30' : ''}>
                        {userStatus.isActivated ? "✅ Activated" : "❌ Not Activated"}
                      </Badge>
                    </div>
                    {userStatus.memberData?.current_level && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Level</span>
                        <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
                          Level {userStatus.memberData.current_level}
                        </Badge>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="w-6 h-6 mx-auto mb-2 animate-spin rounded-full border-b-2 border-honey"></div>
                  <span className="text-sm text-muted-foreground">Loading user data...</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-gradient-to-br from-background via-background to-muted/30 border-border/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <div className="p-2 rounded-lg bg-honey/10 text-honey">
                  <ChartBarIcon className="w-5 h-5" />
                </div>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={() => walletAddress && loadMatrixData(walletAddress)}
                disabled={!walletAddress || loading}
                className="w-full bg-honey/10 text-honey hover:bg-honey/20 border border-honey/30"
                variant="outline"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Refresh Matrix Data
              </Button>
              <div className="text-xs text-muted-foreground text-center">
                {walletAddress 
                  ? "Using connected wallet for matrix data" 
                  : "Connect wallet to view your matrix"}
              </div>
            </CardContent>
          </Card>
        </div>
      
        {/* Test Environment */}
        <Card className="bg-gradient-to-br from-background via-background to-muted/30 border-border/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <EyeIcon className="w-5 h-5" />
              </div>
              Test Environment
              <Badge variant="outline" className="ml-auto bg-purple-500/10 text-purple-400 border-purple-500/30">
                Development
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Explore matrix data with test wallets or analyze your connected wallet's network structure
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {walletAddress && (
                <Button
                  onClick={() => loadMatrixData(walletAddress)}
                  disabled={loading}
                  className="bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30"
                  variant="outline"
                >
                  <div className="flex flex-col items-center gap-1">
                    <NetworkIcon className="w-4 h-4" />
                    <span className="text-xs">Your Wallet</span>
                    <span className="text-xs font-mono opacity-70">
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </span>
                  </div>
                </Button>
              )}
              {testWallets.map((wallet, index) => (
                <Button
                  key={wallet}
                  onClick={() => loadMatrixData(wallet)}
                  disabled={loading}
                  className="bg-honey/10 text-honey hover:bg-honey/20 border border-honey/30"
                  variant="outline"
                >
                  <div className="flex flex-col items-center gap-1">
                    <CubeIcon className="w-4 h-4" />
                    <span className="text-xs">Test #{index + 1}</span>
                    <span className="text-xs font-mono opacity-70">
                      {wallet.slice(0, 6)}...{wallet.slice(-4)}
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card className="bg-gradient-to-br from-background via-background to-muted/30 border-border/50 backdrop-blur-sm">
            <CardContent className="text-center py-12">
              <div className="space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 mx-auto">
                    <div className="absolute inset-0 rounded-full border-4 border-honey/20"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-honey border-t-transparent animate-spin"></div>
                    <div className="absolute inset-2 rounded-full bg-honey/10 flex items-center justify-center">
                      <CubeIcon className="w-6 h-6 text-honey" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">Analyzing Matrix Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Fetching network structure and member relationships...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="bg-gradient-to-br from-red-500/5 via-background to-background border-red-500/20 backdrop-blur-sm">
            <CardContent className="text-center py-12">
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center">
                  <XCircleIcon className="w-8 h-8 text-red-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-red-400">Analysis Failed</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">{error}</p>
                </div>
                <Button 
                  onClick={() => currentWallet && loadMatrixData(currentWallet)}
                  className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30"
                  variant="outline"
                >
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                  Retry Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Matrix Data Display */}
        {!loading && !error && (
          <Card className="bg-gradient-to-br from-background via-background to-muted/30 border-border/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-honey/10 text-honey">
                      <ChartBarIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Matrix Analysis Results</h2>
                      <p className="text-sm text-muted-foreground">Network structure and member distribution</p>
                    </div>
                  </div>
                  {currentWallet && (
                    <div className="flex items-center gap-2 pl-11">
                      <span className="text-sm text-muted-foreground">Analyzing:</span>
                      <div className="flex items-center gap-2 bg-muted/50 px-3 py-1 rounded-lg border border-border/50">
                        <span className="font-mono text-sm">
                          {currentWallet.slice(0, 12)}...{currentWallet.slice(-6)}
                        </span>
                        {currentWallet === walletAddress && (
                          <Badge variant="default" className="text-xs bg-green-500/10 text-green-400 border-green-500/30">
                            Your Wallet
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30 px-4 py-2">
                    <CubeIcon className="w-4 h-4 mr-2" />
                    {matrixData.length} Records
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
            {matrixData.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 bg-muted/50 rounded-full flex items-center justify-center">
                  <CubeIcon className="w-10 h-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Matrix Data Found</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  This wallet doesn't have any matrix records yet. Try connecting a different wallet or contact support if you believe this is an error.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Enhanced Summary Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border border-green-500/20 p-4 hover:border-green-500/40 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <CubeIcon className="w-5 h-5 text-green-400" />
                        </div>
                        <div className="text-2xl font-bold text-green-400">
                          {matrixData.length}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-foreground">Total Records</div>
                      <div className="text-xs text-muted-foreground">Network positions tracked</div>
                    </div>
                  </div>

                  <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 p-4 hover:border-blue-500/40 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <ChartBarIcon className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="text-2xl font-bold text-blue-400">
                          {matrixData.length > 0 ? Math.max(...matrixData.map(r => r.matrix_layer || r.layer || 0), 0) : 0}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-foreground">Max Layer</div>
                      <div className="text-xs text-muted-foreground">Deepest network level</div>
                    </div>
                  </div>

                  <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 p-4 hover:border-purple-500/40 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                          <UserIcon className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="text-2xl font-bold text-purple-400">
                          {new Set(matrixData.map(r => r.member_wallet)).size}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-foreground">Unique Members</div>
                      <div className="text-xs text-muted-foreground">Individual participants</div>
                    </div>
                  </div>

                  <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-honey/10 via-honey/5 to-transparent border border-honey/20 p-4 hover:border-honey/40 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-honey/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="p-2 bg-honey/10 rounded-lg">
                          <ShieldCheckIcon className="w-5 h-5 text-honey" />
                        </div>
                        <div className="text-2xl font-bold text-honey">
                          {matrixData.filter(r => r.is_active || r.is_activated).length}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-foreground">Active Records</div>
                      <div className="text-xs text-muted-foreground">Verified members</div>
                    </div>
                  </div>
                </div>

                {/* Advanced Layer Visualization */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-honey/10 rounded-lg">
                      <ChartBarIcon className="w-5 h-5 text-honey" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Network Layer Analysis</h3>
                      <p className="text-sm text-muted-foreground">Distribution of members across matrix layers</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {Object.entries(
                      matrixData.reduce((acc: any, record) => {
                        const layer = record.matrix_layer || record.layer || 1;
                        if (!acc[layer]) acc[layer] = [];
                        acc[layer].push(record);
                        return acc;
                      }, {})
                    ).map(([layer, records]: [string, any[]]) => (
                      <div key={layer} className="group">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30 px-4 py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-honey rounded-full"></div>
                                Layer {layer}
                              </div>
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {records.length} members positioned
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {Math.round((records.length / matrixData.length) * 100)}% of network
                          </div>
                        </div>
                        
                        <div className="grid md:grid-cols-3 gap-4">
                          {['L', 'M', 'R'].map(position => {
                            const positionRecords = records.filter(r =>
                              (r.matrix_position || r.position) === position ||
                              (r.matrix_position || r.position)?.endsWith('.' + position)
                            );
                            const positionIcons = { L: '👈', M: '🎯', R: '👉' };
                            return (
                              <div key={position} className="group/position relative overflow-hidden rounded-xl bg-gradient-to-br from-muted/30 via-muted/10 to-transparent border border-border/50 p-4 hover:border-honey/30 transition-all duration-300">
                                <div className="absolute inset-0 bg-gradient-to-r from-honey/5 to-transparent opacity-0 group-hover/position:opacity-100 transition-opacity"></div>
                                <div className="relative space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">{positionIcons[position as keyof typeof positionIcons]}</span>
                                      <span className="font-semibold text-foreground">Position {position}</span>
                                    </div>
                                    <Badge variant={positionRecords.length > 0 ? "default" : "secondary"} className={positionRecords.length > 0 ? 'bg-green-500/10 text-green-400 border-green-500/30' : ''}>
                                      {positionRecords.length}
                                    </Badge>
                                  </div>
                                  
                                  <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {positionRecords.length > 0 ? positionRecords.map((record, idx) => (
                                      <div key={idx} className="flex items-center justify-between p-2 bg-background/50 rounded-lg border border-border/30">
                                        <div className="space-y-1">
                                          <div className="font-mono text-xs text-foreground">
                                            {record.member_wallet?.slice(0, 10)}...{record.member_wallet?.slice(-4)}
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <div className={`w-2 h-2 rounded-full ${(record.is_active || record.is_activated) ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                            <span className="text-xs text-muted-foreground">
                                              {(record.is_active || record.is_activated) ? 'Active' : 'Inactive'}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <ClockIcon className="w-3 h-3 text-muted-foreground" />
                                        </div>
                                      </div>
                                    )) : (
                                      <div className="text-center py-4">
                                        <div className="w-8 h-8 mx-auto mb-2 bg-muted/50 rounded-full flex items-center justify-center">
                                          <UserIcon className="w-4 h-4 text-muted-foreground/50" />
                                        </div>
                                        <span className="text-xs text-muted-foreground">Position available</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Advanced Data Table */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <CubeIcon className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground">Detailed Network Records</h3>
                        <p className="text-sm text-muted-foreground">Complete matrix positioning data</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                      {matrixData.length} Records
                    </Badge>
                  </div>
                  
                  <div className="rounded-xl border border-border/50 overflow-hidden bg-gradient-to-br from-background via-background to-muted/30">
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="bg-gradient-to-r from-muted/80 to-muted/60 border-b border-border/50">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <ChartBarIcon className="w-4 h-4" />
                                Layer
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <CubeIcon className="w-4 h-4" />
                                Position
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <UserIcon className="w-4 h-4" />
                                Member
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <NetworkIcon className="w-4 h-4" />
                                Referrer
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <ShieldCheckIcon className="w-4 h-4" />
                                Status
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <ClockIcon className="w-4 h-4" />
                                Placed At
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {matrixData.map((record, idx) => (
                            <tr key={idx} className="hover:bg-muted/30 transition-colors group">
                              <td className="px-4 py-3">
                                <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
                                  {record.matrix_layer || record.layer}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">
                                    {(record.matrix_position || record.position) === 'L' ? '👈' : 
                                     (record.matrix_position || record.position) === 'M' ? '🎯' : '👉'}
                                  </span>
                                  <span className="text-sm font-medium text-foreground">
                                    {record.matrix_position || record.position}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-mono text-sm bg-muted/50 px-3 py-1 rounded-lg border border-border/30 inline-block group-hover:border-honey/30 transition-colors">
                                  {record.member_wallet?.slice(0, 12)}...{record.member_wallet?.slice(-6)}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-mono text-sm text-muted-foreground">
                                  {record.referrer_wallet?.slice(0, 12)}...{record.referrer_wallet?.slice(-6)}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge 
                                  variant={(record.is_active || record.is_activated) ? "default" : "secondary"}
                                  className={`${(record.is_active || record.is_activated) 
                                    ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                                    : 'bg-red-500/10 text-red-400 border-red-500/30'}`}
                                >
                                  <div className="flex items-center gap-1">
                                    <div className={`w-2 h-2 rounded-full ${(record.is_active || record.is_activated) ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                    {(record.is_active || record.is_activated) ? 'Active' : 'Inactive'}
                                  </div>
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">
                                {record.placed_at ? new Date(record.placed_at).toLocaleDateString() :
                                 record.created_at ? new Date(record.created_at).toLocaleDateString() :
                                 record.activation_time ? new Date(record.activation_time).toLocaleDateString() : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MatrixTestPage;
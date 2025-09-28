import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '../hooks/useWallet';
import { useWeb3 } from '../contexts/Web3Context';

const MatrixTestPage: React.FC = () => {
  const [matrixData, setMatrixData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWallet, setCurrentWallet] = useState<string | null>(null);
  
  // Use same user data connection as other components
  const { walletAddress, isConnected } = useWeb3();
  const { userQuery } = useWallet();

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
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-honey">Matrix Data Test Page</h1>
        <p className="text-muted-foreground">
          This page uses the same user data connection as other components in the app. 
          It automatically loads matrix data for your connected wallet or allows testing with sample wallets.
        </p>
      </div>
      
      {/* User Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle>User Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
              </Badge>
              {walletAddress && (
                <span className="font-mono text-sm">
                  {walletAddress.slice(0, 8)}...{walletAddress.slice(-4)}
                </span>
              )}
            </div>
            {userQuery.data && (
              <div className="flex flex-wrap gap-2">
                <Badge variant={userQuery.data.isRegistered ? "default" : "secondary"}>
                  {userQuery.data.isRegistered ? "✅ Registered" : "❌ Not Registered"}
                </Badge>
                <Badge variant={userQuery.data.isActivated ? "default" : "secondary"}>
                  {userQuery.data.isActivated ? "✅ Activated" : "❌ Not Activated"}
                </Badge>
                {userQuery.data.memberData?.current_level && (
                  <Badge variant="outline">
                    Level {userQuery.data.memberData.current_level}
                  </Badge>
                )}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {walletAddress 
                ? "Using connected wallet for matrix data" 
                : "No wallet connected - using test wallet"}
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Wallet Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Test Wallets (Alternative)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {walletAddress && (
              <button
                onClick={() => loadMatrixData(walletAddress)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                🔗 Current: {walletAddress.slice(0, 8)}...{walletAddress.slice(-4)}
              </button>
            )}
            {testWallets.map(wallet => (
              <button
                key={wallet}
                onClick={() => loadMatrixData(wallet)}
                className="px-4 py-2 bg-honey text-black rounded hover:bg-honey/80"
              >
                {wallet.slice(0, 8)}...{wallet.slice(-4)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto mb-2"></div>
            <p>Loading matrix data...</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-red-400 mb-2">❌ Error</div>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Matrix Data Display */}
      {!loading && !error && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <div className="space-y-1">
                <span>Matrix Data Results</span>
                {currentWallet && (
                  <div className="text-sm font-normal text-muted-foreground flex items-center gap-2">
                    <span>Viewing:</span>
                    <span className="font-mono bg-muted px-2 py-1 rounded">
                      {currentWallet.slice(0, 12)}...{currentWallet.slice(-6)}
                    </span>
                    {currentWallet === walletAddress && (
                      <Badge variant="default" className="text-xs">Your Wallet</Badge>
                    )}
                  </div>
                )}
              </div>
              <Badge variant="outline">
                {matrixData.length} records found
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {matrixData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No matrix records found for this wallet
              </p>
            ) : (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-green-500/10 rounded p-3 border border-green-500/30">
                    <div className="text-lg font-bold text-green-400">
                      {matrixData.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Records</div>
                  </div>
                  <div className="bg-blue-500/10 rounded p-3 border border-blue-500/30">
                    <div className="text-lg font-bold text-blue-400">
                      {matrixData.length > 0 ? Math.max(...matrixData.map(r => r.matrix_layer || r.layer || 0), 0) : 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Max Layer</div>
                  </div>
                  <div className="bg-purple-500/10 rounded p-3 border border-purple-500/30">
                    <div className="text-lg font-bold text-purple-400">
                      {new Set(matrixData.map(r => r.member_wallet)).size}
                    </div>
                    <div className="text-xs text-muted-foreground">Unique Members</div>
                  </div>
                  <div className="bg-honey/10 rounded p-3 border border-honey/30">
                    <div className="text-lg font-bold text-honey">
                      {matrixData.filter(r => r.is_active || r.is_activated).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Active Records</div>
                  </div>
                </div>

                {/* Layer Groups */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-honey">Layer Distribution</h3>
                  {Object.entries(
                    matrixData.reduce((acc: any, record) => {
                      const layer = record.matrix_layer || record.layer || 1;
                      if (!acc[layer]) acc[layer] = [];
                      acc[layer].push(record);
                      return acc;
                    }, {})
                  ).map(([layer, records]: [string, any[]]) => (
                    <div key={layer} className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">Layer {layer}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {records.length} members
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {['L', 'M', 'R'].map(position => {
                          const positionRecords = records.filter(r =>
                            (r.matrix_position || r.position) === position ||
                            (r.matrix_position || r.position)?.endsWith('.' + position)
                          );
                          return (
                            <div key={position} className="border rounded p-3 space-y-2">
                              <div className="font-semibold text-center">
                                Position {position} ({positionRecords.length})
                              </div>
                              {positionRecords.map((record, idx) => (
                                <div key={idx} className="text-xs space-y-1">
                                  <div className="font-mono">
                                    {record.member_wallet?.slice(0, 8)}...{record.member_wallet?.slice(-4)}
                                  </div>
                                  <div className="text-muted-foreground">
                                    {(record.is_active || record.is_activated) ? '🟢 Active' : '🔴 Inactive'}
                                  </div>
                                </div>
                              ))}
                              {positionRecords.length === 0 && (
                                <div className="text-center text-muted-foreground text-xs">
                                  Empty
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Raw Data Table */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-honey">Raw Data</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-border rounded">
                      <thead className="bg-muted">
                        <tr>
                          <th className="border border-border px-2 py-1 text-xs">Layer</th>
                          <th className="border border-border px-2 py-1 text-xs">Position</th>
                          <th className="border border-border px-2 py-1 text-xs">Member</th>
                          <th className="border border-border px-2 py-1 text-xs">Referrer</th>
                          <th className="border border-border px-2 py-1 text-xs">Active</th>
                          <th className="border border-border px-2 py-1 text-xs">Placed At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matrixData.map((record, idx) => (
                          <tr key={idx} className="hover:bg-muted/50">
                            <td className="border border-border px-2 py-1 text-xs">{record.matrix_layer || record.layer}</td>
                            <td className="border border-border px-2 py-1 text-xs">{record.matrix_position || record.position}</td>
                            <td className="border border-border px-2 py-1 text-xs font-mono">
                              {record.member_wallet?.slice(0, 8)}...{record.member_wallet?.slice(-4)}
                            </td>
                            <td className="border border-border px-2 py-1 text-xs font-mono">
                              {record.referrer_wallet?.slice(0, 8)}...{record.referrer_wallet?.slice(-4)}
                            </td>
                            <td className="border border-border px-2 py-1 text-xs">
                              {(record.is_active || record.is_activated) ? '✅' : '❌'}
                            </td>
                            <td className="border border-border px-2 py-1 text-xs">
                              {record.placed_at ? new Date(record.placed_at).toLocaleString() :
                               record.created_at ? new Date(record.created_at).toLocaleString() :
                               record.activation_time ? new Date(record.activation_time).toLocaleString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
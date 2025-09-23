import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const MatrixTestPage: React.FC = () => {
  const [matrixData, setMatrixData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testWallets = [
    '0x0000000000000000000000000000000000000001',
    '0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC',
    '0x9C30721F8EbAe0a68577A83C4fc2F7A698E2a501'
  ];

  const loadMatrixData = async (walletAddress: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Testing matrix data for wallet:', walletAddress);
      
      // Test direct query to matrix_referrals_tree_view
      const { data: referralsData, error: referralsError } = await supabase
        .from('matrix_referrals_tree_view')
        .select('*')
        .eq('matrix_root_wallet', walletAddress)
        .order('layer')
        .order('position');
      
      if (referralsError) {
        console.error('Referrals query error:', referralsError);
        setError(`Referrals query error: ${referralsError.message}`);
        return;
      }
      
      console.log('Referrals data:', referralsData);
      setMatrixData(referralsData || []);
      
    } catch (error: any) {
      console.error('Error loading matrix data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load data for first test wallet on mount
    if (testWallets.length > 0) {
      loadMatrixData(testWallets[0]);
    }
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-honey">Matrix Data Test Page</h1>
      
      {/* Wallet Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Test Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
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
              <span>Matrix Data Results</span>
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
                      {Math.max(...matrixData.map(r => r.matrix_layer || 0), 0)}
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
                      {matrixData.filter(r => r.is_active).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Active Records</div>
                  </div>
                </div>

                {/* Layer Groups */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-honey">Layer Distribution</h3>
                  {Object.entries(
                    matrixData.reduce((acc: any, record) => {
                      const layer = record.matrix_layer || 1;
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
                          const positionRecords = records.filter(r => r.matrix_position === position);
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
                                    {record.is_active ? '🟢 Active' : '🔴 Inactive'}
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
                            <td className="border border-border px-2 py-1 text-xs">{record.matrix_layer}</td>
                            <td className="border border-border px-2 py-1 text-xs">{record.matrix_position}</td>
                            <td className="border border-border px-2 py-1 text-xs font-mono">
                              {record.member_wallet?.slice(0, 8)}...{record.member_wallet?.slice(-4)}
                            </td>
                            <td className="border border-border px-2 py-1 text-xs font-mono">
                              {record.referrer_wallet?.slice(0, 8)}...{record.referrer_wallet?.slice(-4)}
                            </td>
                            <td className="border border-border px-2 py-1 text-xs">
                              {record.is_active ? '✅' : '❌'}
                            </td>
                            <td className="border border-border px-2 py-1 text-xs">
                              {new Date(record.placed_at).toLocaleString()}
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
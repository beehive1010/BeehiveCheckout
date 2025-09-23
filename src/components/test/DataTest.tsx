import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { supabase } from '../../lib/supabase';

interface DataTestProps {
  walletAddress: string;
}

const DataTest: React.FC<DataTestProps> = ({ walletAddress }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testReferrerStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Testing referrer_stats for:', walletAddress);
      const { data, error } = await supabase
        .from('referrer_stats')
        .select('*')
        .eq('referrer', walletAddress);

      if (error) {
        console.error('referrer_stats error:', error);
        setError(`referrer_stats: ${error.message}`);
        return;
      }

      console.log('referrer_stats data:', data);
      setData(prev => ({ ...prev, referrer_stats: data }));
    } catch (err) {
      console.error('referrer_stats exception:', err);
      setError(`referrer_stats exception: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const testMatrixLayers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Testing matrix_layers_view for:', walletAddress);
      const { data, error } = await supabase
        .from('matrix_layers_view')
        .select('*')
        .eq('matrix_root_wallet', walletAddress)
        .limit(5);

      if (error) {
        console.error('matrix_layers_view error:', error);
        setError(`matrix_layers_view: ${error.message}`);
        return;
      }

      console.log('matrix_layers_view data:', data);
      setData(prev => ({ ...prev, matrix_layers_view: data }));
    } catch (err) {
      console.error('matrix_layers_view exception:', err);
      setError(`matrix_layers_view exception: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const testMatrixReferralsTreeView = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Testing matrix_referrals_tree_view for:', walletAddress);
      const { data, error } = await supabase
        .from('matrix_referrals_tree_view')
        .select('*')
        .eq('matrix_root_wallet', walletAddress)
        .limit(10);

      if (error) {
        console.error('matrix_referrals_tree_view error:', error);
        setError(`matrix_referrals_tree_view: ${error.message}`);
        return;
      }

      console.log('matrix_referrals_tree_view data:', data);
      setData(prev => ({ ...prev, matrix_referrals_tree_view: data }));
    } catch (err) {
      console.error('matrix_referrals_tree_view exception:', err);
      setError(`matrix_referrals_tree_view exception: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const testWalletWithData = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'; // This wallet has data

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Test Component</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm">Testing wallet: <code>{walletAddress}</code></p>
          <p className="text-xs text-muted-foreground">
            Note: Your wallet may not have data yet. Try with test wallet: <code>{testWalletWithData}</code>
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Button onClick={testReferrerStats} disabled={loading}>
              Test referrer_stats
            </Button>
            <Button onClick={testMatrixLayers} disabled={loading}>
              Test matrix_layers_view
            </Button>
            <Button onClick={testMatrixReferralsTreeView} disabled={loading}>
              Test matrix_referrals_tree_view
            </Button>
          </div>

          {loading && <p className="text-blue-500">Loading...</p>}
          {error && <p className="text-red-500 text-xs">{error}</p>}
          
          {data && (
            <div className="mt-4 p-3 bg-muted rounded">
              <h4 className="font-medium mb-2">Results:</h4>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DataTest;
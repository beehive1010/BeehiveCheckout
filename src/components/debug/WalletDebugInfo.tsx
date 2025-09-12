import React from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { useWallet } from '../../hooks/useWallet';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export default function WalletDebugInfo() {
  const { isConnected, walletAddress, account, wallet } = useWeb3();
  const { userData } = useWallet();

  // Test with a known wallet address to see if data loads
  const testWalletAddress = '0xF9e54564D273531F97F95291BAF0C3d74F337937';

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Debug: Wallet Connection Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p><strong>Is Connected:</strong> {isConnected ? 'Yes' : 'No'}</p>
          <p><strong>Wallet Address:</strong> {walletAddress || 'None'}</p>
          <p><strong>Account:</strong> {account?.address || 'None'}</p>
          <p><strong>Wallet Type:</strong> {wallet?.id || 'None'}</p>
          <p><strong>User Data:</strong> {userData ? 'Loaded' : 'Not loaded'}</p>
          <hr />
          <p><strong>Test Wallet (for debugging):</strong> {testWalletAddress}</p>
          <p><em>If wallet not connected, consider using test address temporarily</em></p>
        </div>
      </CardContent>
    </Card>
  );
}
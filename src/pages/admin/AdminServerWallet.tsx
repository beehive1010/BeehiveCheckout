import { ServerWalletPanel } from '../../components/admin/ServerWalletPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Wallet, Info } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';

export default function AdminServerWallet() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-honey flex items-center gap-3">
          <Wallet className="h-8 w-8" />
          Server Wallet Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitor and manage server wallet balances, deposits, and withdrawals across multiple chains
        </p>
      </div>

      {/* Info Card */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Server Wallet Address:</strong> {import.meta.env.VITE_SERVER_WALLET_ADDRESS}
          <br />
          <strong>Supported Chains:</strong> Arbitrum One, Ethereum, Polygon
          <br />
          <strong>Supported Tokens:</strong> USDT (Primary), Native tokens (ETH, MATIC, ARB)
        </AlertDescription>
      </Alert>

      {/* Server Wallet Panel */}
      <ServerWalletPanel />
    </div>
  );
}

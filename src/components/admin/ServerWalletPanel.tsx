import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { useToast } from '../../hooks/use-toast';
import { 
  Wallet, 
  DollarSign, 
  QrCode, 
  Copy, 
  RefreshCw, 
  Eye,
  EyeOff,
  ExternalLink,
  Coins,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

// Admin wallet address for withdrawals
const ADMIN_WALLET_ADDRESS = '0x0bA198F73DF3A1374a49Acb2c293ccA20e150Fe0';

// Supported chains configuration
const SUPPORTED_CHAINS = [
  {
    id: 42161,
    name: 'Arbitrum One',
    symbol: 'ARB',
    icon: '🔵',
    usdtAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // ✅ Correct Arbitrum USDT address
    testUsdtAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    decimals: 6, // ✅ USDT uses 6 decimals
    explorer: 'https://arbiscan.io'
  },
  { 
    id: 1, 
    name: 'Ethereum', 
    symbol: 'ETH', 
    icon: '🔷',
    usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
    explorer: 'https://etherscan.io'
  },
  { 
    id: 137, 
    name: 'Polygon', 
    symbol: 'MATIC', 
    icon: '🟣',
    usdtAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    decimals: 6,
    explorer: 'https://polygonscan.com'
  }
];

interface WalletBalance {
  chain: string;
  chainId: number;
  usdt: string;
  testUsdt?: string;
  native: string;
  lastUpdated: string;
  status: 'healthy' | 'warning' | 'error';
}

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

// Simple QR Code component (you might want to use a proper QR library like qrcode-generator)
const QRCode: React.FC<QRCodeProps> = ({ value, size = 200, className }) => {
  return (
    <div className={`bg-white p-4 rounded-lg ${className}`} style={{ width: size, height: size }}>
      <div className="w-full h-full bg-black/10 rounded flex items-center justify-center text-xs text-center break-all">
        QR Code for:<br/>{value.slice(0, 20)}...
      </div>
    </div>
  );
};

export const ServerWalletPanel: React.FC = () => {
  const { toast } = useToast();
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPrivateInfo, setShowPrivateInfo] = useState(false);
  const [selectedChainForDeposit, setSelectedChainForDeposit] = useState<number | null>(null);
  
  // Server wallet address from env
  const serverWalletAddress = import.meta.env.VITE_SERVER_WALLET_ADDRESS;
  
  useEffect(() => {
    loadWalletBalances();
  }, []);
  
  const loadWalletBalances = async () => {
    try {
      setIsLoading(true);

      // Call get-balances Edge Function
      const API_BASE = import.meta.env.VITE_API_BASE_URL ||
        'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';

      const response = await fetch(`${API_BASE}/get-balances?address=${serverWalletAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': `${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch balances from API');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch balances');
      }

      // Transform API response to match WalletBalance interface
      const balances: WalletBalance[] = data.balances.map((b: any) => ({
        chain: b.chain,
        chainId: b.chainId,
        usdt: b.usdt,
        testUsdt: b.testUsdt,
        native: b.native,
        lastUpdated: new Date(b.lastUpdated).toLocaleString(),
        status: b.status
      }));

      setWalletBalances(balances);

      console.log('✅ Loaded balances from API:', balances);
    } catch (error) {
      console.error('Failed to load wallet balances:', error);

      // Fallback: show error state for all chains
      const errorBalances: WalletBalance[] = SUPPORTED_CHAINS.map(chain => ({
        chain: chain.name,
        chainId: chain.id,
        usdt: 'Error',
        native: 'Error',
        lastUpdated: new Date().toLocaleString(),
        status: 'error'
      }));

      setWalletBalances(errorBalances);

      toast({
        title: "Error Loading Balances",
        description: "Failed to fetch server wallet balances",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const handleWithdrawToAdmin = async (chainId: number) => {
    const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
    const balance = walletBalances.find(b => b.chainId === chainId);

    if (!chain || !balance || balance.usdt === 'Error') {
      toast({
        title: "Withdrawal Failed",
        description: "Cannot withdraw: Invalid balance",
        variant: "destructive"
      });
      return;
    }

    const usdtAmount = parseFloat(balance.usdt);
    if (usdtAmount <= 0) {
      toast({
        title: "Withdrawal Failed",
        description: "No USDT balance to withdraw",
        variant: "destructive"
      });
      return;
    }

    // Confirm withdrawal
    const confirmed = window.confirm(
      `Withdraw ${balance.usdt} USDT from ${chain.name} to Admin wallet?\n\n` +
      `From: Server Wallet\n` +
      `To: ${ADMIN_WALLET_ADDRESS}\n` +
      `Amount: ${balance.usdt} USDT\n` +
      `Chain: ${chain.name}\n\n` +
      `Fee will be deducted from the amount.`
    );

    if (!confirmed) return;

    try {
      toast({
        title: "Processing Withdrawal",
        description: "Initiating transfer to admin wallet...",
      });

      // Call existing withdrawal Edge Function
      const API_BASE = import.meta.env.VITE_API_BASE_URL ||
        'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';

      const response = await fetch(`${API_BASE}/withdrawal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': `${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'process-withdrawal',
          amount: usdtAmount,
          recipientAddress: ADMIN_WALLET_ADDRESS,
          sourceChainId: chainId,
          targetChainId: chainId,
          selectedToken: 'USDT',
          targetTokenSymbol: 'USDT',
          memberWallet: serverWalletAddress, // Use server wallet as "member" for admin withdrawals
          skipBalanceCheck: true, // Skip database balance check for admin withdrawals - use on-chain balance
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Withdrawal failed');
      }

      const result = await response.json();

      // Log admin withdrawal to separate table
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        await fetch(`${supabaseUrl}/rest/v1/admin_wallet_withdrawals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            chain_id: chainId,
            chain_name: chain.name,
            from_address: serverWalletAddress,
            to_address: ADMIN_WALLET_ADDRESS,
            token_address: chain.usdtAddress,
            amount: result.net_amount || usdtAmount,
            transaction_hash: result.transaction_hash || result.send_queue_id || 'pending',
            status: 'completed'
          })
        });
      } catch (logError) {
        console.warn('Failed to log admin withdrawal:', logError);
      }

      toast({
        title: "✅ Withdrawal Successful",
        description: `${result.net_amount || usdtAmount} USDT sent to Admin wallet`,
      });

      console.log('Withdrawal result:', result);

      // Refresh balances
      setTimeout(() => {
        loadWalletBalances();
      }, 3000);

    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast({
        title: "❌ Withdrawal Failed",
        description: error.message || "Failed to execute withdrawal",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };
  
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  if (!serverWalletAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Server Wallet Management
          </CardTitle>
          <CardDescription>Monitor and manage server wallet balances</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Server wallet address not configured. Please set VITE_SERVER_WALLET_ADDRESS in environment variables.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Server Wallet Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-honey" />
            Server Wallet Management
          </CardTitle>
          <CardDescription>Monitor and manage server wallet balances across all chains</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wallet Address */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Server Wallet Address</label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <code className="flex-1 text-sm font-mono">
                {showPrivateInfo ? serverWalletAddress : formatAddress(serverWalletAddress)}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowPrivateInfo(!showPrivateInfo)}
              >
                {showPrivateInfo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(serverWalletAddress, 'Wallet address')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Refresh Button */}
          <div className="flex justify-end">
            <Button
              onClick={loadWalletBalances}
              disabled={isLoading}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Balances
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SUPPORTED_CHAINS.map((chain) => {
          const balance = walletBalances.find(b => b.chainId === chain.id);
          return (
            <Card key={chain.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <span>{chain.icon}</span>
                  {chain.name}
                </CardTitle>
                {balance && getStatusIcon(balance.status)}
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-6 bg-muted animate-pulse rounded" />
                    <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                  </div>
                ) : balance ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">USDT</span>
                      <span className={`font-bold ${getStatusColor(balance.status)}`}>
                        {balance.usdt === 'Error' ? 'Error' : `${balance.usdt} USDT`}
                      </span>
                    </div>
                    
                    {balance.testUsdt && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Test USDT</span>
                        <span className="font-bold text-blue-400">
                          {balance.testUsdt} TEST
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{chain.symbol}</span>
                      <span className="font-bold text-muted-foreground">
                        {balance.native === 'Error' ? 'Error' : `${balance.native} ${chain.symbol}`}
                      </span>
                    </div>
                    
                    <div className="pt-2 border-t border-border space-y-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => setSelectedChainForDeposit(chain.id)}
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        Show Deposit
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full bg-honey hover:bg-honey/90 text-black"
                        onClick={() => handleWithdrawToAdmin(chain.id)}
                        disabled={balance.usdt === 'Error' || parseFloat(balance.usdt) <= 0}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Withdraw to Admin
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <span className="text-sm text-muted-foreground">Failed to load</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Deposit Modal */}
      {selectedChainForDeposit && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-honey" />
                Deposit to {SUPPORTED_CHAINS.find(c => c.id === selectedChainForDeposit)?.name}
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedChainForDeposit(null)}
              >
                ✕
              </Button>
            </div>
            <CardDescription>
              Send USDT or native tokens to this address on {SUPPORTED_CHAINS.find(c => c.id === selectedChainForDeposit)?.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* QR Code */}
              <div className="flex flex-col items-center space-y-4">
                <QRCode value={serverWalletAddress} size={200} />
                <div className="text-center">
                  <p className="text-sm font-medium">Scan to deposit</p>
                  <p className="text-xs text-muted-foreground">
                    Works with any wallet app
                  </p>
                </div>
              </div>
              
              {/* Address & Instructions */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Wallet Address</label>
                  <div className="mt-1 p-3 bg-muted rounded-lg">
                    <code className="text-sm font-mono break-all">
                      {serverWalletAddress}
                    </code>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={() => copyToClipboard(serverWalletAddress, 'Deposit address')}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Address
                  </Button>
                </div>
                
                {/* Supported Tokens */}
                <div>
                  <label className="text-sm font-medium">Supported Tokens</label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">USDT</span>
                      <Badge variant="outline">Primary</Badge>
                    </div>
                    {SUPPORTED_CHAINS.find(c => c.id === selectedChainForDeposit)?.testUsdtAddress && (
                      <div className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">Test USDT</span>
                        <Badge variant="secondary">Testing</Badge>
                      </div>
                    )}
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">
                        {SUPPORTED_CHAINS.find(c => c.id === selectedChainForDeposit)?.symbol}
                      </span>
                      <Badge variant="outline">Gas</Badge>
                    </div>
                  </div>
                </div>
                
                {/* Explorer Link */}
                <div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const chain = SUPPORTED_CHAINS.find(c => c.id === selectedChainForDeposit);
                      if (chain?.explorer) {
                        window.open(`${chain.explorer}/address/${serverWalletAddress}`, '_blank');
                      }
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on Explorer
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Warning */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Only send tokens on the {SUPPORTED_CHAINS.find(c => c.id === selectedChainForDeposit)?.name} network. 
                Tokens sent on other networks will be lost permanently.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
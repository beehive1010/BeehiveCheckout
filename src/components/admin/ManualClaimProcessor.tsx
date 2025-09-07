import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { useToast } from '../../hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ManualClaimProcessorProps {
  className?: string;
}

export function ManualClaimProcessor({ className = '' }: ManualClaimProcessorProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [result, setResult] = useState<any>(null);

  const API_BASE = import.meta.env.VITE_API_BASE;

  const handleManualProcess = async () => {
    if (!transactionHash || !walletAddress) {
      toast({
        title: "Missing Information",
        description: "Please provide both transaction hash and wallet address",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      console.log('🔧 Processing manual claim:', { transactionHash, walletAddress });

      const response = await fetch(`${API_BASE}/nft-upgrades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress
        },
        body: JSON.stringify({
          action: 'manual-process-claim',
          transactionHash: transactionHash,
          level: 1,
          force: false
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (data.success) {
        setResult(data);
        toast({
          title: "✅ Success!",
          description: data.message || "Claim processed successfully",
          variant: "default",
        });
      } else {
        throw new Error(data.error || 'Processing failed');
      }

    } catch (error) {
      console.error('❌ Manual processing error:', error);
      setResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Failed to process claim manually",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className={`bg-gradient-to-br from-blue/5 to-blue/15 border-blue/30 ${className}`}>
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl text-blue mb-2">
          Manual Claim Processor
        </CardTitle>
        <p className="text-muted-foreground">
          Process successful blockchain claims that failed backend processing
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Transaction Hash
            </label>
            <Input
              type="text"
              placeholder="0x..."
              value={transactionHash}
              onChange={(e) => setTransactionHash(e.target.value)}
              className="font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Wallet Address
            </label>
            <Input
              type="text"
              placeholder="0x..."
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="font-mono"
            />
          </div>

          <Button 
            onClick={handleManualProcess}
            disabled={!transactionHash || !walletAddress || isProcessing}
            className="w-full h-12 bg-gradient-to-r from-blue to-blue/80 hover:from-blue/90 hover:to-blue/70"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Process Claim Manually
              </>
            )}
          </Button>
        </div>

        {/* Results Display */}
        {result && (
          <div className={`mt-6 p-4 rounded-lg border ${
            result.success 
              ? 'bg-green-500/10 border-green-500/30 text-green-700' 
              : 'bg-red-500/10 border-red-500/30 text-red-700'
          }`}>
            <div className="flex items-center mb-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-2" />
              )}
              <span className="font-semibold">
                {result.success ? 'Success' : 'Failed'}
              </span>
            </div>
            
            {result.success ? (
              <div className="space-y-2 text-sm">
                <p><strong>Message:</strong> {result.message}</p>
                {result.data?.verification && (
                  <p><strong>Verified:</strong> {result.data.verification.verified ? 'Yes' : 'No'}</p>
                )}
                {result.data?.purchase && (
                  <p><strong>Database Updated:</strong> Yes</p>
                )}
              </div>
            ) : (
              <div className="text-sm">
                <p><strong>Error:</strong> {result.error}</p>
                {result.details && (
                  <p><strong>Details:</strong> {result.details}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium text-blue mb-2">📋 Instructions</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>1. Enter the transaction hash from successful blockchain claim</p>
            <p>2. Enter the wallet address that made the claim</p>
            <p>3. Click "Process Claim Manually" to retry backend processing</p>
            <p>4. This will verify the transaction and update the database</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
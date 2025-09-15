import React, { useState, useCallback } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useToast } from '../hooks/use-toast';
import { client } from '../lib/web3';
import { ethereum, polygon, arbitrum, base } from 'thirdweb/chains';
import { 
  Shuffle, // Using Shuffle to represent bridge/swap functionality
  Wallet, 
  CreditCard, 
  Zap, 
  CheckCircle, 
  Network,
  Loader2,
  ExternalLink,
  ArrowRight
} from 'lucide-react';

interface Web3BuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseAmount: number;
  expectedBCC: number;
  onSuccess: (details: any) => void;
  onError: (error: any) => void;
}

// Supported chains for Web3 Buy
const supportedChains = [
  { 
    chain: ethereum, 
    name: 'Ethereum', 
    symbol: 'ETH', 
    color: 'text-blue-400',
    tokens: ['ETH', 'USDC', 'USDT', 'DAI']
  },
  { 
    chain: polygon, 
    name: 'Polygon', 
    symbol: 'MATIC', 
    color: 'text-purple-400',
    tokens: ['MATIC', 'USDC', 'USDT', 'DAI']
  },
  { 
    chain: arbitrum, 
    name: 'Arbitrum', 
    symbol: 'ARB', 
    color: 'text-blue-300',
    tokens: ['ETH', 'ARB', 'USDC', 'USDT']
  },
  { 
    chain: base, 
    name: 'Base', 
    symbol: 'ETH', 
    color: 'text-blue-500',
    tokens: ['ETH', 'USDC', 'USDT', 'DAI']
  }
];

export function Web3BuyModal({
  isOpen,
  onClose,
  purchaseAmount,
  expectedBCC,
  onSuccess,
  onError
}: Web3BuyModalProps) {
  const { toast } = useToast();
  const account = useActiveAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedChain, setSelectedChain] = useState(supportedChains[0]);

  const handleBuyLaunch = useCallback(async () => {
    if (!account?.address) {
      onError(new Error('Wallet not connected'));
      return;
    }

    setIsProcessing(true);

    try {
      console.log('🚀 Starting Web3 Buy flow:', {
        wallet: account.address,
        amount: purchaseAmount,
        chain: selectedChain.name,
        expectedBCC
      });

      // This is where thirdweb's Buy SDK would be integrated
      // For now, we'll simulate the buy process
      
      toast({
        title: "🔗 Launching Shuffle",
        description: `Initiating purchase on ${selectedChain.name}...`,
        duration: 4000
      });

      // Simulate the buy process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate success
      const mockTransaction = {
        transactionHash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`,
        chainId: selectedChain.chain.id,
        amount: purchaseAmount,
        fromToken: 'ETH',
        toToken: 'USDC',
        bccTokens: expectedBCC,
        timestamp: new Date().toISOString()
      };

      console.log('✅ Web3 Buy completed:', mockTransaction);
      
      onSuccess(mockTransaction);
      onClose();
      
      toast({
        title: "🎉 Purchase Successful!",
        description: `Successfully purchased ${expectedBCC} BCC tokens via ${selectedChain.name}`,
        duration: 8000
      });

    } catch (error: any) {
      console.error('❌ Web3 Buy failed:', error);
      onError(error);
      
      toast({
        title: "Purchase Failed",
        description: error.message || 'Failed to complete Web3 purchase',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [account?.address, purchaseAmount, selectedChain, expectedBCC, onSuccess, onError, onClose, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-blue-500" />
            Web3 Shuffle Purchase
          </DialogTitle>
          <DialogDescription>
            Buy BCC tokens directly using crypto from any supported network
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Purchase Summary */}
          <div className="bg-gradient-to-r from-blue-500/10 to-green-500/10 rounded-lg p-4 border border-blue-500/20">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-400">${purchaseAmount}</div>
                <div className="text-sm text-muted-foreground">USDC Value</div>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-honey" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">{expectedBCC}</div>
                <div className="text-sm text-muted-foreground">BCC Tokens</div>
              </div>
            </div>
          </div>

          {/* Chain Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Select Network</label>
            <div className="grid grid-cols-2 gap-3">
              {supportedChains.map((chainInfo, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedChain(chainInfo)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedChain.chain.id === chainInfo.chain.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-muted hover:border-muted-foreground/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Network className={`w-5 h-5 ${chainInfo.color}`} />
                    <div>
                      <div className="font-medium">{chainInfo.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {chainInfo.tokens.slice(0, 3).join(', ')}
                        {chainInfo.tokens.length > 3 && ' +more'}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-sm font-medium text-green-400">Instant</div>
              <div className="text-xs text-muted-foreground">No waiting time</div>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Shuffle className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-sm font-medium text-blue-400">Auto-Shuffle</div>
              <div className="text-xs text-muted-foreground">Any token to BCC</div>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-sm font-medium text-purple-400">Secure</div>
              <div className="text-xs text-muted-foreground">ThirdWeb powered</div>
            </div>
          </div>

          {/* Integration Notice */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ExternalLink className="w-4 h-4 text-yellow-500" />
              </div>
              <div>
                <h4 className="font-medium text-yellow-500 mb-1">Development Integration</h4>
                <p className="text-sm text-muted-foreground">
                  This demonstrates the Web3 bridge interface. Full ThirdWeb Buy SDK integration 
                  will enable real crypto-to-crypto purchases across all supported networks.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBuyLaunch}
              disabled={isProcessing || !account?.address}
              className="flex-1 bg-gradient-to-r from-blue-500 to-green-500 hover:opacity-90 text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Shuffle className="mr-2 h-4 w-4" />
                  Launch Web3 Purchase
                </>
              )}
            </Button>
          </div>

          {/* Connected Wallet Info */}
          {account?.address && (
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Connected Wallet</span>
                </div>
                <div className="font-mono text-sm">
                  {account.address.slice(0, 6)}...{account.address.slice(-4)}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default Web3BuyModal;
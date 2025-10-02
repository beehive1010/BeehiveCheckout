import { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useToast } from '../../hooks/use-toast';
import { useI18n } from '../../contexts/I18nContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useActiveAccount, useSendTransaction } from 'thirdweb/react';
import { getContract, prepareTransaction, toWei } from 'thirdweb';
import { transfer } from 'thirdweb/extensions/erc20';
import { 
  client, 
  contractAddresses, 
  getUSDCContract,
  paymentChains,
  alphaCentauri,
  arbitrumSepolia
} from '../../lib/web3';
import { getMembershipLevel } from '../../lib/config/membershipLevels';
import { Loader2, Check, AlertCircle, ChevronDown } from 'lucide-react';
import { membershipEventEmitter } from '../../lib/membership/events';

interface MultiChainMembershipClaimProps {
  walletAddress: string;
  level: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

type ClaimState = 'idle' | 'selecting' | 'approving' | 'transferring' | 'verifying' | 'success' | 'error';

export default function MultiChainMembershipClaim({
  walletAddress,
  level,
  onSuccess,
  onError,
  className = ''
}: MultiChainMembershipClaimProps) {
  const [claimState, setClaimState] = useState<ClaimState>('idle');
  const [selectedChainId, setSelectedChainId] = useState<number>(421614); // Default to Arbitrum Sepolia
  const [showChainSelector, setShowChainSelector] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const { toast } = useToast();
  const { t } = useI18n();
  const account = useActiveAccount();
  const { mutate: sendTransaction, isPending: isSending } = useSendTransaction();

  const membershipConfig = getMembershipLevel(level);
  
  if (!membershipConfig) {
    return (
      <div className="text-center p-4">
        <p className="text-red-500 text-sm">Invalid membership level</p>
      </div>
    );
  }

  const getChainName = (chainId: number): string => {
    const chainNames: Record<number, string> = {
      1: 'Ethereum',
      137: 'Polygon',
      42161: 'Arbitrum',
      421614: 'Arbitrum Sepolia',
      10: 'Optimism',
      56: 'BSC',
      8453: 'Base',
      141941: 'Alpha Centauri'
    };
    return chainNames[chainId] || 'Unknown Chain';
  };

  const getBridgeWallet = (chainId: number): string => {
    const chainMap: Record<number, keyof typeof contractAddresses.BRIDGE_WALLETS> = {
      1: 'ethereum',
      137: 'polygon',
      42161: 'arbitrum',
      421614: 'arbitrumSepolia',
      10: 'optimism',
      56: 'bsc',
      8453: 'base'
    };
    
    const chainKey = chainMap[chainId];
    return chainKey ? contractAddresses.BRIDGE_WALLETS[chainKey] : '';
  };

  const handlePurchase = async () => {
    if (!account || !membershipConfig) {
      toast({
        title: 'Error',
        description: 'Please connect your wallet first',
        variant: 'destructive'
      });
      return;
    }

    try {
      setClaimState('selecting');
      setErrorMessage('');
      
      // Get the bridge wallet for selected chain
      const bridgeWallet = getBridgeWallet(selectedChainId);
      if (!bridgeWallet) {
        throw new Error(`Bridge wallet not configured for chain ${selectedChainId}`);
      }

      // Get USDC contract for selected chain
      const usdtContract = getUSDCContract(selectedChainId);
      const priceInWei = toWei((membershipConfig.priceUSDC / 100).toString());

      setClaimState('transferring');
      
      // Prepare USDC transfer to bridge wallet
      const transaction = transfer({
        contract: usdtContract,
        to: bridgeWallet,
        amount: priceInWei.toString()
      });

      sendTransaction(transaction, {
        gasless: true, // Enable gas sponsorship for multi-chain claims
        onSuccess: async (result) => {
          setTxHash(result.transactionHash);
          setClaimState('verifying');
          
          // Call backend to process the payment and mint NFT
          await processServerSideClaim(result.transactionHash, selectedChainId);
        },
        onError: (error) => {
          console.error('Transfer failed:', error);
          setErrorMessage(error.message || 'Transfer failed');
          setClaimState('error');
          onError?.(error.message || 'Transfer failed');
        }
      });

    } catch (error: any) {
      console.error('Purchase failed:', error);
      setErrorMessage(error.message || 'Purchase failed');
      setClaimState('error');
      onError?.(error.message || 'Purchase failed');
    }
  };

  const processServerSideClaim = async (txHash: string, chainId: number) => {
    try {
      // Call backend to verify payment and mint NFT
      const response = await fetch('/api/membership/multi-chain-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress
        },
        body: JSON.stringify({
          level,
          transactionHash: txHash,
          chainId,
          priceUSDC: membershipConfig!.priceUSDC,
          userWallet: account!.address
        })
      });

      if (!response.ok) {
        throw new Error('Server verification failed');
      }

      const result = await response.json();
      
      setClaimState('success');
      
      toast({
        title: 'NFT Claimed Successfully! 🎉',
        description: `Level ${level} ${membershipConfig!.titleEn} NFT has been minted to your wallet`,
      });
      
      // Emit event for other components to refresh
      membershipEventEmitter.emit({
        type: 'MEMBERSHIP_PERSISTED',
        payload: { 
          walletAddress,
          level, 
          orderId: result.mintTxHash,
          activated: true,
          previousLevel: level - 1,
          timestamp: Date.now()
        }
      });
      
      onSuccess?.();
      
    } catch (error: any) {
      console.error('Server processing failed:', error);
      setErrorMessage(error.message || 'Server processing failed');
      setClaimState('error');
      onError?.(error.message || 'Server processing failed');
    }
  };

  const resetClaim = () => {
    setClaimState('idle');
    setErrorMessage('');
    setTxHash('');
  };

  const renderClaimState = () => {
    switch (claimState) {
      case 'idle':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-honey">
                ${(membershipConfig.priceUSDC / 100).toFixed(2)}
              </span>
              <Badge variant="outline" className="text-honey border-honey">
                USDC
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Selected Chain:</span>
                <button
                  onClick={() => setShowChainSelector(true)}
                  className="flex items-center gap-1 text-honey hover:text-honey/80 transition-colors"
                >
                  {getChainName(selectedChainId)}
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <Button
              onClick={handlePurchase}
              className="w-full bg-honey text-secondary hover:bg-honey/90 font-semibold"
              disabled={!account}
            >
              {account ? `Purchase Level ${level} NFT` : 'Connect Wallet'}
            </Button>
          </div>
        );

      case 'selecting':
      case 'transferring':
        return (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-honey" />
            <p className="text-sm text-center text-muted-foreground">
              {claimState === 'selecting' ? 'Preparing transaction...' : 'Transferring USDC...'}
            </p>
          </div>
        );

      case 'verifying':
        return (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-honey" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Payment confirmed! Minting NFT...
              </p>
              {txHash && (
                <p className="text-xs text-muted-foreground mt-2">
                  TX: {txHash.slice(0, 8)}...{txHash.slice(-8)}
                </p>
              )}
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-green-500 mb-2">NFT Claimed Successfully!</p>
              <p className="text-sm text-muted-foreground">
                Level {level} {membershipConfig.titleEn} NFT minted to your wallet
              </p>
            </div>
            <Button
              onClick={resetClaim}
              variant="outline"
              className="w-full border-honey text-honey hover:bg-honey/10"
            >
              Close
            </Button>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-red-500 mb-2">Purchase Failed</p>
              <p className="text-sm text-muted-foreground">
                {errorMessage}
              </p>
            </div>
            <Button
              onClick={resetClaim}
              variant="outline"
              className="w-full border-honey text-honey hover:bg-honey/10"
            >
              Try Again
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className={className}>
        {renderClaimState()}
      </div>

      {/* Chain Selector Modal */}
      <Dialog open={showChainSelector} onOpenChange={setShowChainSelector}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-honey">Select Payment Chain</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {paymentChains.map((chain) => (
              <button
                key={chain.id}
                onClick={() => {
                  setSelectedChainId(chain.id);
                  setShowChainSelector(false);
                }}
                className={`w-full p-3 rounded-lg border text-left transition-colors ${
                  selectedChainId === chain.id
                    ? 'border-honey bg-honey/10'
                    : 'border-border hover:border-honey/50'
                }`}
              >
                <div className="font-medium">{chain.name}</div>
                <div className="text-sm text-muted-foreground">
                  Pay with USDC on {chain.name}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
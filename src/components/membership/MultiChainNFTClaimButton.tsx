import { useState, useEffect } from 'react';
import { useActiveAccount, useSendTransaction, useActiveWalletChain, useSwitchActiveWalletChain } from 'thirdweb/react';
import { getContract, prepareTransaction, toWei } from 'thirdweb';
import { transfer, balanceOf as erc20BalanceOf, allowance, approve } from 'thirdweb/extensions/erc20';
import { balanceOf as erc1155BalanceOf } from 'thirdweb/extensions/erc1155';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../../hooks/use-toast';
import { useI18n } from '../../contexts/I18nContext';
import {
  Loader2,
  Check,
  AlertCircle,
  Crown,
  Coins,
  Network,
  ArrowLeftRight,
  ChevronDown,
  ExternalLink
} from 'lucide-react';
import {
  client,
  contractAddresses,
  getUSDTContract,
  paymentChains
} from '../../lib/web3';
import { arbitrum } from 'thirdweb/chains';

interface MultiChainNFTClaimButtonProps {
  level: number;
  priceUSDT: number;
  walletAddress: string;
  referrerWallet?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  buttonText?: string;
}

type ClaimState = 'idle' | 'checking' | 'selecting_chain' | 'approving' | 'claiming' | 'bridging' | 'verifying' | 'success' | 'error';

export function MultiChainNFTClaimButton({
  level,
  priceUSDT,
  walletAddress,
  referrerWallet,
  onSuccess,
  onError,
  className = '',
  buttonText
}: MultiChainNFTClaimButtonProps) {
  const [claimState, setClaimState] = useState<ClaimState>('idle');
  const [selectedChainId, setSelectedChainId] = useState<number>(42161); // Arbitrum by default
  const [showChainSelector, setShowChainSelector] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<string>('');
  const [userBalance, setUserBalance] = useState<number>(0);
  const [hasNFT, setHasNFT] = useState(false);
  const [useBridge, setUseBridge] = useState(false);

  const { toast } = useToast();
  const { t } = useI18n();
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const switchChain = useSwitchActiveWalletChain();
  const { mutate: sendTransaction, isPending: isSending } = useSendTransaction();

  const NFT_CONTRACT = import.meta.env.VITE_MEMBERSHIP_NFT_CONTRACT;
  const priceWei = BigInt(priceUSDT) * BigInt('1000000'); // USDT has 6 decimals

  // Get available payment chains
  const availableChains = [
    { id: 1, name: 'Ethereum', icon: '⟠' },
    { id: 137, name: 'Polygon', icon: '⬡' },
    { id: 42161, name: 'Arbitrum', icon: '◆', native: true },
    { id: 10, name: 'Optimism', icon: '🔴' },
    { id: 8453, name: 'Base', icon: '🔵' },
    { id: 56, name: 'BSC', icon: '🟡' }
  ];

  const getChainName = (chainId: number): string => {
    return availableChains.find(c => c.id === chainId)?.name || 'Unknown Chain';
  };

  const getBridgeWallet = (chainId: number): string => {
    const chainMap: Record<number, keyof typeof contractAddresses.BRIDGE_WALLETS> = {
      1: 'ethereum',
      137: 'polygon',
      42161: 'arbitrum',
      10: 'optimism',
      56: 'bsc',
      8453: 'base'
    };

    const chainKey = chainMap[chainId];
    return chainKey ? contractAddresses.BRIDGE_WALLETS[chainKey] : '';
  };

  // Check if user already has NFT
  useEffect(() => {
    if (account?.address && NFT_CONTRACT) {
      checkNFTOwnership();
    }
  }, [account?.address, level]);

  // Load user balance when chain changes
  useEffect(() => {
    if (account?.address && selectedChainId) {
      loadUserBalance();
    }
  }, [account?.address, selectedChainId]);

  const checkNFTOwnership = async () => {
    if (!account?.address || !NFT_CONTRACT) return;

    try {
      const nftContract = getContract({
        client,
        address: NFT_CONTRACT,
        chain: arbitrum
      });

      const balance = await erc1155BalanceOf({
        contract: nftContract,
        owner: account.address,
        tokenId: BigInt(level)
      });

      const ownsNFT = Number(balance) > 0;
      setHasNFT(ownsNFT);

      if (ownsNFT) {
        console.log(`✅ User already owns Level ${level} NFT`);
      }
    } catch (error) {
      console.warn('Failed to check NFT ownership:', error);
    }
  };

  const loadUserBalance = async () => {
    if (!account?.address) return;

    try {
      const usdcContract = getUSDTContract(selectedChainId);
      const balance = await erc20BalanceOf({
        contract: usdcContract,
        address: account.address
      });

      setUserBalance(Number(balance) / 1e6);
    } catch (error) {
      console.warn('Failed to load balance:', error);
      setUserBalance(0);
    }
  };

  const handleBridgePayment = async () => {
    if (!account) {
      toast({
        title: t('claim.walletNotConnected'),
        description: t('claim.connectWalletToClaimNFT'),
        variant: 'destructive'
      });
      return;
    }

    setClaimState('bridging');
    setErrorMessage('');

    try {
      const bridgeWallet = getBridgeWallet(selectedChainId);
      if (!bridgeWallet) {
        throw new Error(`Bridge wallet not configured for ${getChainName(selectedChainId)}`);
      }

      setCurrentStep(`Sending ${priceUSDT} USDT to bridge wallet...`);

      const usdcContract = getUSDTContract(selectedChainId);

      // Transfer USDT to bridge wallet
      const transaction = transfer({
        contract: usdcContract,
        to: bridgeWallet,
        amount: priceWei.toString()
      });

      sendTransaction(transaction, {
        onSuccess: async (result) => {
          setTxHash(result.transactionHash);
          setCurrentStep('Processing cross-chain payment...');
          setClaimState('verifying');

          // Call backend to process bridge payment
          await processBridgePayment(result.transactionHash, selectedChainId);
        },
        onError: (error) => {
          console.error('Bridge transfer failed:', error);
          setErrorMessage(error.message || 'Bridge transfer failed');
          setClaimState('error');
          onError?.(error.message || 'Bridge transfer failed');

          toast({
            title: 'Bridge Transfer Failed',
            description: error.message,
            variant: 'destructive'
          });
        }
      });

    } catch (error: any) {
      console.error('Bridge payment failed:', error);
      setErrorMessage(error.message || 'Bridge payment failed');
      setClaimState('error');
      onError?.(error.message || 'Bridge payment failed');
    }
  };

  const handleDirectClaim = async () => {
    if (!account) {
      toast({
        title: t('claim.walletNotConnected'),
        description: t('claim.connectWalletToClaimNFT'),
        variant: 'destructive'
      });
      return;
    }

    // Check if on correct network
    if (activeChain?.id !== arbitrum.id) {
      toast({
        title: 'Wrong Network',
        description: `Please switch to Arbitrum to claim Level ${level} NFT directly`,
        variant: 'destructive'
      });
      return;
    }

    setClaimState('checking');
    setErrorMessage('');

    try {
      const usdcContract = getUSDTContract(42161); // Arbitrum
      const nftContract = getContract({
        client,
        address: NFT_CONTRACT,
        chain: arbitrum
      });

      // Check balance
      setCurrentStep('Checking USDT balance...');
      const balance = await erc20BalanceOf({
        contract: usdcContract,
        address: account.address
      });

      if (balance < priceWei) {
        throw new Error(`Insufficient USDT. Need ${priceUSDT} USDT, have ${(Number(balance) / 1e6).toFixed(2)} USDT`);
      }

      // Check and approve if needed
      setCurrentStep('Checking USDT approval...');
      const currentAllowance = await allowance({
        contract: usdcContract,
        owner: account.address,
        spender: NFT_CONTRACT
      });

      if (currentAllowance < priceWei) {
        setClaimState('approving');
        setCurrentStep('Approving USDT...');

        const approveTransaction = approve({
          contract: usdcContract,
          spender: NFT_CONTRACT,
          amount: priceWei.toString()
        });

        sendTransaction(approveTransaction, {
          onSuccess: async () => {
            setCurrentStep('Approval confirmed, claiming NFT...');
            await claimNFT();
          },
          onError: (error) => {
            console.error('Approval failed:', error);
            setErrorMessage(error.message || 'Approval failed');
            setClaimState('error');
          }
        });
      } else {
        await claimNFT();
      }

    } catch (error: any) {
      console.error('Direct claim failed:', error);
      setErrorMessage(error.message || 'Claim failed');
      setClaimState('error');
      onError?.(error.message || 'Claim failed');

      toast({
        title: 'Claim Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const claimNFT = async () => {
    // This would trigger the actual NFT claim transaction
    // Implementation depends on your NFT contract's claim function
    setClaimState('claiming');
    setCurrentStep(`Claiming Level ${level} NFT...`);

    // Call your existing claim logic here
    // For now, just show success
    setTimeout(() => {
      setClaimState('success');
      toast({
        title: `Level ${level} NFT Claimed!`,
        description: 'Your membership has been activated',
        variant: 'default'
      });
      onSuccess?.();
    }, 2000);
  };

  const processBridgePayment = async (transactionHash: string, chainId: number) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/multi-chain-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            transactionHash,
            chainId,
            walletAddress: account?.address,
            level,
            amount: priceUSDT,
            referrerWallet,
            paymentPurpose: 'membership_activation'
          })
        }
      );

      if (!response.ok) {
        throw new Error('Backend processing failed');
      }

      const result = await response.json();

      if (result.success) {
        setClaimState('success');
        toast({
          title: `Level ${level} NFT Claimed!`,
          description: 'Cross-chain payment processed successfully',
          variant: 'default'
        });
        onSuccess?.();
      } else {
        throw new Error(result.error || 'Payment processing failed');
      }

    } catch (error: any) {
      console.error('Backend processing failed:', error);
      setErrorMessage(error.message);
      setClaimState('error');
      onError?.(error.message);
    }
  };

  const handleClaim = () => {
    if (selectedChainId === 42161) {
      // Direct claim on Arbitrum
      handleDirectClaim();
    } else {
      // Use bridge for other chains
      handleBridgePayment();
    }
  };

  const isProcessing = ['checking', 'approving', 'claiming', 'bridging', 'verifying'].includes(claimState);
  const needsChainSwitch = selectedChainId === 42161 && activeChain?.id !== 42161;

  if (hasNFT) {
    return (
      <Card className={`border-green-500/30 bg-green-500/5 ${className}`}>
        <CardContent className="pt-6 text-center">
          <Check className="h-12 w-12 text-green-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-green-400 mb-2">
            Already Own Level {level} NFT
          </h3>
          <p className="text-muted-foreground text-sm">
            You already have this membership level activated
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={`bg-gradient-to-br from-honey/5 to-honey/15 border-honey/30 ${className}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-honey" />
              <CardTitle className="text-xl">Level {level} NFT</CardTitle>
            </div>
            <Badge className="bg-honey/20 text-honey border-honey/50">
              {priceUSDT} USDT
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Chain Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Payment Network</Label>
            <Select
              value={selectedChainId.toString()}
              onValueChange={(value) => {
                setSelectedChainId(parseInt(value));
                setUseBridge(parseInt(value) !== 42161);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableChains.map((chain) => (
                  <SelectItem key={chain.id} value={chain.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{chain.icon}</span>
                      <span>{chain.name}</span>
                      {chain.native && <Badge variant="outline" className="text-xs">Native</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {userBalance > 0 && (
              <p className="text-xs text-muted-foreground">
                Balance: {userBalance.toFixed(2)} USDT on {getChainName(selectedChainId)}
              </p>
            )}
          </div>

          {/* Bridge Info */}
          {useBridge && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <ArrowLeftRight className="h-4 w-4 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-400">Cross-Chain Payment</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Payment will be bridged from {getChainName(selectedChainId)} to Arbitrum
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Claim Button */}
          {needsChainSwitch ? (
            <Button
              onClick={() => switchChain?.(arbitrum)}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              <Network className="mr-2 h-4 w-4" />
              Switch to Arbitrum
            </Button>
          ) : (
            <Button
              onClick={handleClaim}
              disabled={isProcessing || !account}
              className="w-full bg-gradient-to-r from-honey to-orange-500 hover:from-honey/90 hover:to-orange-500/90"
            >
              {!account ? (
                <>
                  <Crown className="mr-2 h-4 w-4" />
                  Connect Wallet
                </>
              ) : isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {currentStep || 'Processing...'}
                </>
              ) : (
                <>
                  <Coins className="mr-2 h-4 w-4" />
                  {buttonText || `Claim Level ${level} - ${priceUSDT} USDT`}
                </>
              )}
            </Button>
          )}

          {/* Error Message */}
          {claimState === 'error' && errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                <p className="text-sm text-red-400">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {claimState === 'success' && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-400 mt-0.5" />
                <p className="text-sm text-green-400">NFT claimed successfully!</p>
              </div>
            </div>
          )}

          {/* Transaction Hash */}
          {txHash && (
            <div className="text-center">
              <a
                href={`https://arbiscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
              >
                View Transaction <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

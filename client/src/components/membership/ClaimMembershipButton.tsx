import { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import { useI18n } from '../../contexts/I18nContext';
import { getMembershipLevel } from '../../lib/config/membershipLevels';
import { membershipEventEmitter } from '../../lib/membership/events';
import { ConnectButton } from "thirdweb/react";
import { client, alphaCentauri, bbcMembershipContract, levelToTokenId, paymentChains } from '../../lib/web3';
import { PayEmbed } from "thirdweb/react";
import { Card, CardContent } from '../ui/card';

type ClaimState = 'idle' | 'approving' | 'paying' | 'verifying' | 'persisting' | 'success' | 'error';

interface ClaimMembershipButtonProps {
  walletAddress: string;
  level: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function ClaimMembershipButton({
  walletAddress,
  level,
  onSuccess,
  onError,
  disabled = false,
  className = ''
}: ClaimMembershipButtonProps) {
  const [claimState, setClaimState] = useState<ClaimState>('idle');
  const [txHash, setTxHash] = useState<string>('');
  const [doubleClickGuard, setDoubleClickGuard] = useState(false);
  const [selectedChain, setSelectedChain] = useState(paymentChains[0]); // Default to Ethereum
  const [showChainSelector, setShowChainSelector] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();

  const membershipLevel = getMembershipLevel(level);

  if (!membershipLevel) {
    return null;
  }

  const handlePaymentSuccess = useCallback(async (result: any) => {
    try {
      const transactionHash = result.transactionHash;
      setTxHash(transactionHash);
      setClaimState('verifying');

      // Emit payment completed event
      membershipEventEmitter.emit({
        type: 'MEMBERSHIP_PAYMENT_COMPLETED',
        payload: {
          walletAddress,
          level,
          priceUSDT: membershipLevel.priceUSDT,
          txHash: transactionHash,
          chain: alphaCentauri.name || 'Alpha-centauri',
          timestamp: Date.now()
        }
      });

      // Start verification process
      await verifyAndPersist(transactionHash);
    } catch (error) {
      console.error('Payment success handler error:', error);
      handleError('Failed to process payment success', 'payment');
    }
  }, [walletAddress, level, membershipLevel.priceUSDT]);

  const verifyAndPersist = async (transactionHash: string) => {
    try {
      // Emit verification started event
      membershipEventEmitter.emit({
        type: 'MEMBERSHIP_VERIFICATION_STARTED',
        payload: {
          walletAddress,
          level,
          txHash: transactionHash,
          timestamp: Date.now()
        }
      });

      // Verify on-chain with retry logic
      const verified = await verifyOnChain(transactionHash);
      
      if (!verified) {
        throw new Error('On-chain verification failed');
      }

      // Emit verification completed event
      membershipEventEmitter.emit({
        type: 'MEMBERSHIP_VERIFICATION_COMPLETED',
        payload: {
          walletAddress,
          level,
          txHash: transactionHash,
          verified: true,
          timestamp: Date.now()
        }
      });

      setClaimState('persisting');

      // Persist to database and activate membership
      await persistMembership(transactionHash);
      
      setClaimState('success');
      
      toast({
        title: String(t('membership.purchase.success.title')),
        description: String(t('membership.purchase.success.description')),
      });

      onSuccess?.();
      
    } catch (error) {
      console.error('Verification and persistence error:', error);
      handleError('Failed to verify and persist membership', 'verification');
    }
  };

  const verifyOnChain = async (transactionHash: string): Promise<boolean> => {
    // Retry logic with exponential backoff
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        // Check if the wallet now owns the BBC token for the given level
        const response = await fetch('/api/membership/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Wallet-Address': walletAddress,
          },
          body: JSON.stringify({ 
            txHash: transactionHash,
            level 
          }),
        });

        if (response.ok) {
          const result = await response.json();
          return result.verified;
        }
        
        // If not verified yet, wait and retry
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } catch (error) {
        console.error(`Verification attempt ${attempt + 1} failed:`, error);
        if (attempt === 4) { // Last attempt
          throw error;
        }
      }
    }
    
    return false;
  };

  const persistMembership = async (transactionHash: string) => {
    try {
      const response = await fetch('/api/membership/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress,
        },
        body: JSON.stringify({
          level,
          txHash: transactionHash,
          priceUSDT: membershipLevel.priceUSDT,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to persist membership');
      }

      const result = await response.json();
      
      // Emit persistence event
      membershipEventEmitter.emit({
        type: 'MEMBERSHIP_PERSISTED',
        payload: {
          walletAddress,
          level,
          orderId: result.orderId,
          activated: result.activated,
          previousLevel: result.previousLevel,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Persistence error:', error);
      throw error;
    }
  };

  const handleError = (message: string, stage: 'payment' | 'verification' | 'persistence') => {
    setClaimState('error');
    
    membershipEventEmitter.emit({
      type: 'MEMBERSHIP_ERROR',
      payload: {
        walletAddress,
        level,
        error: message,
        stage,
        timestamp: Date.now()
      }
    });

    toast({
      title: String(t('membership.purchase.error.title')),
      description: String(t('membership.purchase.error.description')),
      variant: 'destructive',
    });

    onError?.(message);
  };

  const handleStartPurchase = () => {
    if (doubleClickGuard || disabled) return;
    setShowChainSelector(true);
  };

  const handleChainSelected = (chain: typeof paymentChains[0]) => {
    setSelectedChain(chain);
    setShowChainSelector(false);
    setDoubleClickGuard(true);
    setClaimState('paying');

    // Emit purchase started event
    membershipEventEmitter.emit({
      type: 'MEMBERSHIP_PURCHASE_STARTED',
      payload: {
        walletAddress,
        level,
        priceUSDT: membershipLevel.priceUSDT,
        selectedChain: chain.name,
        timestamp: Date.now()
      }
    });

    // Reset guard after 2 seconds
    setTimeout(() => setDoubleClickGuard(false), 2000);
  };

  const getButtonText = () => {
    switch (claimState) {
      case 'paying':
        return String(t('membership.purchase.paying'));
      case 'verifying':
        return String(t('membership.purchase.verifying'));
      case 'persisting':
        return String(t('membership.purchase.finalizing'));
      case 'success':
        return String(t('membership.purchase.completed'));
      case 'error':
        return String(t('membership.purchase.retry'));
      default:
        return String(t('membership.purchase.button'));
    }
  };

  const isButtonDisabled = disabled || doubleClickGuard || ['paying', 'verifying', 'persisting', 'success'].includes(claimState);

  if (!walletAddress) {
    return (
      <div className={className}>
        <ConnectButton 
          client={client}
          connectButton={{
            label: String(t('membership.purchase.connectWallet'))
          }}
        />
      </div>
    );
  }

  // Chain Selector Modal
  if (showChainSelector) {
    return (
      <div className={`${className} space-y-4`}>
        <Card className="bg-secondary border-border">
          <CardContent className="p-4">
            <div className="text-center mb-4">
              <h3 className="text-honey font-semibold mb-2">Select Payment Chain</h3>
              <p className="text-sm text-muted-foreground">
                Choose which blockchain to pay USDT on for your Level {level} membership
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {paymentChains.map((chain) => (
                <Button
                  key={chain.name}
                  onClick={() => handleChainSelected(chain)}
                  variant="outline"
                  className="h-auto p-4 justify-start hover:bg-honey/10 hover:border-honey/30"
                  data-testid={`button-select-${chain.name.toLowerCase()}`}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center ${chain.color}`}>
                      <i className={`${chain.icon} text-sm`}></i>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{chain.name}</p>
                      <p className="text-xs text-muted-foreground">Pay with USDT • Gas in {chain.symbol}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-honey">${membershipLevel.priceUSDT}</p>
                      <p className="text-xs text-muted-foreground">USDT</p>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
            
            <Button
              onClick={() => setShowChainSelector(false)}
              variant="outline"
              className="w-full mt-4"
              data-testid="button-cancel-chain-selector"
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (claimState === 'paying') {
    return (
      <div className={`${className} space-y-4`}>
        {/* Selected Chain Info */}
        <div className="bg-secondary/50 rounded-lg p-3 border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-6 h-6 rounded-full bg-muted flex items-center justify-center ${selectedChain.color}`}>
                <i className={`${selectedChain.icon} text-xs`}></i>
              </div>
              <span className="text-sm font-medium">{selectedChain.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">USDT Payment</span>
          </div>
        </div>

        <PayEmbed
          client={client}
          payOptions={{
            mode: "direct_payment",
            paymentInfo: {
              amount: membershipLevel.priceUSDT.toString(),
              sellerAddress: selectedChain.bridgeWallet,
              chain: selectedChain.chain,
              token: {
                address: selectedChain.usdtAddress,
                symbol: 'USDT',
                name: 'Tether USD',
              },
            },
            metadata: {
              name: `Beehive L${level} Membership (${selectedChain.name})`,
              description: `Level ${level} membership upgrade via ${selectedChain.name} USDT`,
              image: "/membership-badge.png",
            },
          }}
          theme="dark"
        />
        
        <Button
          onClick={() => {
            setClaimState('idle');
            setShowChainSelector(false);
          }}
          variant="outline"
          className="w-full"
          data-testid="button-cancel-payment"
        >
          {String(t('membership.purchase.cancel'))}
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleStartPurchase}
      disabled={isButtonDisabled}
      className={`w-full transition-all duration-200 ${
        claimState === 'success' 
          ? 'bg-green-600 hover:bg-green-700' 
          : 'bg-honey hover:bg-honey/90 text-black'
      } ${className}`}
      data-testid={`button-claim-membership-${level}`}
    >
      {['verifying', 'persisting'].includes(claimState) && (
        <i className="fas fa-spinner fa-spin mr-2"></i>
      )}
      {claimState === 'success' && (
        <i className="fas fa-check mr-2"></i>
      )}
      {claimState === 'error' && (
        <i className="fas fa-exclamation-triangle mr-2"></i>
      )}
      {getButtonText()}
    </Button>
  );
}
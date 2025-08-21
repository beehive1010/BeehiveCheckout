import { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import { useI18n } from '../../contexts/I18nContext';
import { getMembershipLevel } from '../../lib/config/membershipLevels';
import { membershipEventEmitter } from '../../lib/membership/events';
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { client, alphaCentauri, bbcMembershipContract, levelToTokenId, paymentChains } from '../../lib/web3';
import { PayEmbed } from "thirdweb/react";
import { Card, CardContent } from '../ui/card';
import { FiX } from 'react-icons/fi';
import { getApprovalForTransaction } from 'thirdweb/extensions/erc20';
import { sendAndConfirmTransaction, prepareTransaction } from 'thirdweb';

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
  const [isApproving, setIsApproving] = useState(false);
  const account = useActiveAccount();
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

  const handleChainSelected = async (chain: typeof paymentChains[0]) => {
    if (!account) return;
    
    setSelectedChain(chain);
    setShowChainSelector(false);
    setDoubleClickGuard(true);

    try {
      setIsApproving(true);
      setClaimState('approving');
      
      // Get USDT contract for the selected chain
      const usdtContract = {
        client,
        chain: chain.chain,
        address: chain.usdtAddress,
      };

      // Create a dummy transaction to check for approvals needed
      const dummyTransaction = prepareTransaction({
        to: chain.bridgeWallet,
        value: BigInt(0),
        data: "0x",
        client,
        chain: chain.chain,
      });

      // Check if approval is needed for USDT transfers
      const approveTx = await getApprovalForTransaction({
        transaction: dummyTransaction,
        account,
      });

      if (approveTx) {
        try {
          await sendAndConfirmTransaction({ account, transaction: approveTx });
          toast({
            title: "USDT Approved",
            description: "USDT spending approved! You can now proceed with payment.",
          });
        } catch (error: any) {
          if (error.message?.includes('insufficient funds')) {
            toast({
              title: "Insufficient Gas",
              description: "You don't have enough gas to approve USDT spending.",
              variant: 'destructive',
            });
          } else {
            toast({
              title: "Approval Failed",
              description: "Failed to approve USDT spending. Please try again.",
              variant: 'destructive',
            });
          }
          setClaimState('idle');
          setIsApproving(false);
          return;
        }
      }

      // Proceed to payment
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

    } catch (error) {
      console.error('Chain selection error:', error);
      toast({
        title: "Preparation Failed",
        description: "Failed to prepare payment. Please try again.",
        variant: 'destructive',
      });
      setClaimState('idle');
    } finally {
      setIsApproving(false);
      // Reset guard after 2 seconds
      setTimeout(() => setDoubleClickGuard(false), 2000);
    }
  };

  const getButtonText = () => {
    switch (claimState) {
      case 'approving':
        return isApproving ? String(t('membership.purchase.approving')) : String(t('membership.purchase.preparing'));
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
        return String(t('membership.purchase.button')).replace('{level}', level.toString()).replace('{price}', membershipLevel.priceUSDT.toString());
    }
  };

  const isButtonDisabled = disabled || doubleClickGuard || isApproving || ['approving', 'paying', 'verifying', 'persisting', 'success'].includes(claimState);

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
              <h3 className="text-honey font-semibold mb-2">{String(t('membership.purchase.selectChain'))}</h3>
              <p className="text-sm text-muted-foreground">
                {String(t('membership.purchase.selectChainDescription')).replace('{level}', level.toString())}
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
                      <p className="text-xs text-muted-foreground">{String(t('membership.purchase.payWithGas')).replace('{symbol}', chain.symbol)}</p>
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
              {String(t('common.cancel'))}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (claimState === 'paying') {
    return (
      <div className="w-full space-y-4">
        {/* Payment Header */}
        <div className="bg-secondary/30 rounded-lg p-4 border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center ${selectedChain.color}`}>
                <i className={`${selectedChain.icon} text-sm`}></i>
              </div>
              <div>
                <p className="font-medium">{selectedChain.name}</p>
                <p className="text-xs text-muted-foreground">USDT Payment</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-honey">${membershipLevel.priceUSDT}</p>
              <p className="text-xs text-muted-foreground">Level {level} Membership</p>
            </div>
          </div>
        </div>

        {/* Simple PayEmbed Container */}
        <div className="border rounded-lg overflow-hidden">
          <PayEmbed
            client={client}
            payOptions={{
              mode: "direct_payment",
              paymentInfo: {
                amount: (membershipLevel.priceUSDT * 1000000).toString(), // Convert to USDT wei (6 decimals)
                sellerAddress: selectedChain.bridgeWallet,
                chain: selectedChain.chain,
                token: {
                  address: selectedChain.usdtAddress,
                  symbol: 'USDT',
                  name: 'Tether USD',
                },
              },
              metadata: {
                name: `Beehive Level ${level} Membership`,
                description: `Exclusive Level ${level} membership with special privileges and rewards`,
              },
              onPurchaseSuccess: handlePaymentSuccess,
            }}
            theme="dark"
          />
        </div>

        {/* Cancel Button */}
        <Button
          onClick={() => {
            setClaimState('idle');
            setShowChainSelector(false);
          }}
          variant="outline"
          className="w-full"
          data-testid="button-cancel-payment"
        >
          <FiX className="mr-2" />
          Cancel Payment
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleStartPurchase}
      disabled={isButtonDisabled}
      className={`w-full transition-all duration-200 relative ${
        claimState === 'success' 
          ? 'bg-green-600 hover:bg-green-700' 
          : claimState === 'approving'
          ? 'bg-blue-600 hover:bg-blue-700'
          : 'bg-honey hover:bg-honey/90 text-black'
      } ${className}`}
      data-testid={`button-claim-membership-${level}`}
    >
      <div className="flex items-center justify-center gap-2">
        {['approving', 'verifying', 'persisting'].includes(claimState) && (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
        )}
        {claimState === 'success' && (
          <i className="fas fa-check"></i>
        )}
        {claimState === 'error' && (
          <i className="fas fa-exclamation-triangle"></i>
        )}
        <span>{getButtonText()}</span>
        {claimState === 'idle' && (
          <span className="text-lg">🔥</span>
        )}
      </div>
    </Button>
  );
}
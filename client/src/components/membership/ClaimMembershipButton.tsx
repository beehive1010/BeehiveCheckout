import { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import { useI18n } from '../../contexts/I18nContext';
import { getMembershipLevel } from '../../lib/config/membershipLevels';
import { membershipEventEmitter } from '../../lib/membership/events';
import { ConnectButton } from "thirdweb/react";
import { client, alphaCentauri } from '../../lib/web3';
import { PayEmbed } from "thirdweb/react";

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
          chain: alphaCentauri.name,
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
    
    setDoubleClickGuard(true);
    setClaimState('paying');
    
    // Emit purchase started event
    membershipEventEmitter.emit({
      type: 'MEMBERSHIP_PURCHASE_STARTED',
      payload: {
        walletAddress,
        level,
        priceUSDT: membershipLevel.priceUSDT,
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
          chain={chain}
          connectButton={{
            label: String(t('membership.purchase.connectWallet'))
          }}
        />
      </div>
    );
  }

  if (claimState === 'paying') {
    return (
      <div className={`${className} space-y-4`}>
        <PayEmbed
          client={client}
          payOptions={{
            mode: "direct_payment",
            paymentInfo: {
              amount: membershipLevel.priceUSDT.toString(),
              sellerAddress: process.env.VITE_SELLER_ADDRESS || "",
            },
            metadata: {
              name: `Beehive L${level} Membership`,
              description: `Level ${level} membership upgrade`,
              image: "/membership-badge.png",
            },
          }}
          onPaymentSuccess={handlePaymentSuccess}
          onError={(error: any) => handleError(error.message || 'Payment failed', 'payment')}
        />
        
        <Button
          onClick={() => setClaimState('idle')}
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
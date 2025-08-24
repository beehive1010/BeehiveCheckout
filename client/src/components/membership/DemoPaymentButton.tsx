import { useState } from 'react';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import { useI18n } from '../../contexts/I18nContext';
import { membershipEventEmitter } from '../../lib/membership/events';
import { useActiveAccount } from "thirdweb/react";
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { DollarSign, Zap, Gift } from 'lucide-react';

type DemoState = 'idle' | 'paying' | 'verifying' | 'claiming' | 'success' | 'error';

interface DemoPaymentButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function DemoPaymentButton({
  onSuccess,
  onError,
  disabled = false,
  className = ''
}: DemoPaymentButtonProps) {
  const [demoState, setDemoState] = useState<DemoState>('idle');
  const account = useActiveAccount();
  const { toast } = useToast();
  const { t } = useI18n();

  const handleDemoPayment = async () => {
    if (!account?.address) {
      toast({
        title: 'Wallet Required',
        description: 'Please connect your wallet to proceed with demo payment',
        variant: 'destructive',
      });
      return;
    }

    try {
      setDemoState('paying');
      console.log('🎯 Starting demo payment for 130 USDT and Level 1 NFT claim...');
      
      // Step 1: Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 2: Activate membership with demo payment
      setDemoState('verifying');
      console.log('💰 Simulating 130 USDT payment...');
      
      const membershipResponse = await fetch('/api/membership/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': account.address,
        },
        body: JSON.stringify({
          level: 1,
          txHash: `demo_payment_${Date.now()}`,
          priceUSDT: 130
        }),
      });

      if (!membershipResponse.ok) {
        throw new Error('Failed to activate membership');
      }

      const membershipData = await membershipResponse.json();
      console.log('✅ Membership activated:', membershipData);
      
      // Step 3: Simulate Level 1 NFT claim
      setDemoState('claiming');
      console.log('🏆 Claiming Level 1 NFT...');
      
      // Simulate NFT minting process
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('🎉 Level 1 NFT claimed successfully!');
      
      setDemoState('success');
      
      toast({
        title: 'Demo Complete! 🎉',
        description: 'Demo payment of 130 USDT processed and Level 1 NFT claimed!',
      });
      
      // Emit success events
      membershipEventEmitter.emit({
        type: 'MEMBERSHIP_PERSISTED',
        payload: {
          walletAddress: account.address,
          level: 1,
          orderId: `demo_${Date.now()}`,
          activated: true,
          previousLevel: 0,
          timestamp: Date.now()
        }
      });
      
      onSuccess?.();
      
    } catch (error) {
      console.error('Demo payment error:', error);
      setDemoState('error');
      toast({
        title: 'Demo Failed',
        description: 'Demo payment process failed. Please try again.',
        variant: 'destructive',
      });
      onError?.('Demo payment failed');
    }
  };

  const getButtonText = () => {
    switch (demoState) {
      case 'paying':
        return 'Processing Payment...';
      case 'verifying':
        return 'Verifying Transaction...';
      case 'claiming':
        return 'Claiming NFT...';
      case 'success':
        return 'Demo Complete! ✅';
      case 'error':
        return 'Try Demo Again';
      default:
        return 'Demo: Pay 130 USDT & Claim Level 1 NFT';
    }
  };

  const getButtonColor = () => {
    switch (demoState) {
      case 'success':
        return 'bg-green-600 hover:bg-green-700';
      case 'error':
        return 'bg-red-600 hover:bg-red-700';
      default:
        return 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700';
    }
  };

  const isButtonDisabled = disabled || ['paying', 'verifying', 'claiming', 'success'].includes(demoState);

  return (
    <Card className={`bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30 ${className}`}>
      <CardHeader className="text-center">
        <CardTitle className="text-honey flex items-center justify-center gap-2">
          <Zap className="h-5 w-5" />
          Demo Payment System
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Simulate the full payment and NFT claiming process
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-secondary/50 rounded-lg p-3">
            <DollarSign className="h-6 w-6 text-green-400 mx-auto mb-2" />
            <div className="text-sm font-medium">Payment</div>
            <div className="text-xs text-muted-foreground">130 USDT</div>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <Gift className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <div className="text-sm font-medium">NFT Claim</div>
            <div className="text-xs text-muted-foreground">Level 1</div>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <Zap className="h-6 w-6 text-honey mx-auto mb-2" />
            <div className="text-sm font-medium">Activation</div>
            <div className="text-xs text-muted-foreground">Instant</div>
          </div>
        </div>

        <Button
          onClick={handleDemoPayment}
          disabled={isButtonDisabled}
          className={`w-full h-14 text-white font-semibold text-lg ${getButtonColor()}`}
          data-testid="button-demo-payment"
        >
          <div className="flex items-center justify-center gap-2">
            {['paying', 'verifying', 'claiming'].includes(demoState) && (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            )}
            {demoState === 'success' && (
              <Gift className="h-5 w-5" />
            )}
            {demoState === 'error' && (
              <Zap className="h-5 w-5" />
            )}
            <span>{getButtonText()}</span>
          </div>
        </Button>

        {demoState === 'success' && (
          <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4 text-center">
            <div className="text-green-400 font-medium mb-1">🎉 Demo Completed Successfully!</div>
            <div className="text-xs text-muted-foreground">
              Membership activated and Level 1 NFT claimed
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center">
          ⚠️ This is a demo simulation for testing purposes only
        </div>
      </CardContent>
    </Card>
  );
}
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
      
      // Step 2: Call our new NFT Level 1 activation function directly
      setDemoState('verifying');
      console.log('🎯 Activating NFT Level 1 membership with complete workflow...');
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const activationResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/activate_nft_level1_membership`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          p_wallet_address: account.address,
          p_referrer_wallet: '0x0000000000000000000000000000000000000001', // Root as referrer for demo
          p_transaction_hash: `demo_nft_claim_${Date.now()}`
        }),
      });

      if (!activationResponse.ok) {
        const errorText = await activationResponse.text();
        console.error('Activation failed:', errorText);
        throw new Error(`Failed to activate NFT Level 1 membership: ${errorText}`);
      }

      const activationResult = await activationResponse.json();
      console.log('✅ NFT Level 1 activation result:', activationResult);
      
      if (!activationResult.success) {
        throw new Error(activationResult.error || 'NFT Level 1 activation failed');
      }
      
      // Step 3: Claim Level 1 NFT via thirdweb Engine
      setDemoState('claiming');
      console.log('🏆 Claiming Level 1 NFT...');
      
      const nftResponse = await fetch('/api/demo/claim-nft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': account.address,
        },
        body: JSON.stringify({ level: 1 }),
      });

      if (nftResponse.ok) {
        const nftData = await nftResponse.json();
        console.log('🎉 Level 1 NFT claimed successfully!', nftData);
        if (nftData.realNFT) {
          console.log('🚀 Real NFT minted via thirdweb Engine! TX:', nftData.txHash);
        } else {
          console.log('🎭 NFT claim simulated for demo purposes');
        }
      } else {
        console.log('⚠️ NFT claim failed, continuing with demo...');
      }
      
      setDemoState('success');
      
      toast({
        title: 'Demo Complete! 🎉',
        description: 'Demo payment of 130 USDT processed and Level 1 NFT claimed!',
      });
      
      // Emit success events with activation result data
      membershipEventEmitter.emit({
        type: 'MEMBERSHIP_PERSISTED',
        payload: {
          walletAddress: account.address,
          level: 1,
          orderId: activationResult.membership_id,
          activated: true,
          previousLevel: 0,
          timestamp: Date.now(),
          activationRank: activationResult.activation_rank,
          platformFee: activationResult.platform_fee_usdc,
          rewardTriggered: {
            root: activationResult.matrix_root,
            amount: activationResult.reward_amount_usdc,
            status: activationResult.reward_status
          }
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
import React, { useState } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useToast } from '../hooks/use-toast';
import { useI18n } from '../contexts/I18nContext';
import { useWeb3 } from '../contexts/Web3Context';
import { useLocation } from 'wouter';
import { getReferrerInfo, hasRealReferrer } from '../lib/referrerUtils';
import { 
  Crown, 
  Zap, 
  Gift, 
  Loader2, 
  CheckCircle, 
  ExternalLink,
  CreditCard,
  Users
} from 'lucide-react';

interface MembershipClaimButtonsProps {
  onSuccess: () => void;
  referrerWallet?: string;
  className?: string;
}

export function MembershipClaimButtons({ 
  onSuccess, 
  referrerWallet,
  className = "" 
}: MembershipClaimButtonsProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const account = useActiveAccount();
  const { isSupabaseAuthenticated } = useWeb3();
  const [, setLocation] = useLocation();
  const [claimState, setClaimState] = useState<{
    method: string | null;
    loading: boolean;
    error: string | null;
  }>({
    method: null,
    loading: false,
    error: null
  });

  // Get referrer display info using utility
  const referrerInfo = getReferrerInfo(referrerWallet);

  const handleClaim = async (claimMethod: 'purchase' | 'demo' | 'referral_bonus') => {
    if (!account?.address) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }

    // Note: With the simplified auth flow, wallet connection is sufficient
    // The Supabase auth function will handle user registration and activation automatically

    setClaimState({ method: claimMethod, loading: true, error: null });

    try {
      // STEP 1: First ensure user is registered
      const registerResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': account.address
        },
        body: JSON.stringify({
          action: 'register',
          referrerWallet: referrerWallet || null,
          username: `user_${account.address.slice(-6)}`,
          email: null
        })
      });

      const registerResult = await registerResponse.json();
      console.log('📝 Registration result:', registerResult);

      // STEP 2: Now activate membership (NFT claim)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': account.address
        },
        body: JSON.stringify({
          action: 'activate-membership'
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "🎉 Membership Activated!",
          description: result.message,
          duration: 5000
        });

        console.log('✅ Membership activation successful:', result);
        onSuccess();
      } else {
        throw new Error(result.error || 'Failed to claim NFT Token ID 1');
      }
    } catch (error: any) {
      console.error('Claim error:', error);
      setClaimState({ method: null, loading: false, error: error.message });
      
      toast({
        title: "Claim Failed",
        description: error.message || 'Failed to claim NFT Token ID 1',
        variant: "destructive"
      });
    } finally {
      setClaimState({ method: null, loading: false, error: null });
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-honey mb-2">
          Activate Your Membership
        </h2>
        <p className="text-muted-foreground">
          Claim NFT Token ID 1 to unlock Level 1 membership and start earning rewards
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Purchase Button */}
        <Card className="border-honey/20 hover:border-honey/40 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-honey">
              <CreditCard className="h-5 w-5" />
              Purchase NFT
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
                Token ID 1
              </Badge>
              <p className="text-sm text-muted-foreground">
                Purchase NFT Token ID 1 with USDT to activate your Level 1 membership
              </p>
              <div className="text-lg font-semibold text-honey">
                100 USDT
              </div>
            </div>
            <Button 
              onClick={() => handleClaim('purchase')}
              disabled={claimState.loading}
              className="w-full bg-honey hover:bg-honey/90 text-black"
            >
              {claimState.loading && claimState.method === 'purchase' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Purchase Now
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Demo Claim Button */}
        <Card className="border-green-500/20 hover:border-green-500/40 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-400">
              <Zap className="h-5 w-5" />
              Demo Claim
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                Free Trial
              </Badge>
              <p className="text-sm text-muted-foreground">
                Try the platform with a demo activation. Perfect for testing features.
              </p>
              <div className="text-lg font-semibold text-green-400">
                FREE
              </div>
            </div>
            <Button 
              onClick={() => handleClaim('demo')}
              disabled={claimState.loading}
              className="w-full bg-green-500 hover:bg-green-500/90 text-black"
            >
              {claimState.loading && claimState.method === 'demo' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Demo Claim
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Referral Bonus Button */}
        <Card className="border-purple-500/20 hover:border-purple-500/40 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-400">
              <Gift className="h-5 w-5" />
              Referral Bonus
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                Special Offer
              </Badge>
              <p className="text-sm text-muted-foreground">
                {referrerInfo.hasReferrer 
                  ? "Claim your referral bonus activation from your sponsor"
                  : "Requires a referral link to unlock this option"
                }
              </p>
              <div className="text-lg font-semibold text-purple-400">
                BONUS
              </div>
            </div>
            <Button 
              onClick={() => handleClaim('referral_bonus')}
              disabled={claimState.loading || !referrerInfo.hasReferrer}
              className="w-full bg-purple-500 hover:bg-purple-500/90 text-white disabled:opacity-50"
            >
              {claimState.loading && claimState.method === 'referral_bonus' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <Gift className="mr-2 h-4 w-4" />
                  {referrerInfo.hasReferrer ? 'Claim Bonus' : 'No Referrer'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {referrerInfo.hasReferrer && (
        <Card className="bg-muted/30 border-muted">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-honey" />
              <span className="text-sm font-medium text-honey">Referrer Information</span>
            </div>
            <div className="text-sm text-muted-foreground">
              <span>Referred by: </span>
              <code className="bg-muted px-2 py-1 rounded text-xs">
                {referrerInfo.displayText}
              </code>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              You'll be placed in your referrer's matrix and they'll earn rewards from your activation.
            </p>
          </CardContent>
        </Card>
      )}

      {claimState.error && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <ExternalLink className="h-4 w-4" />
              <span className="font-medium">Claim Failed</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {claimState.error}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="text-center text-xs text-muted-foreground">
        <p>
          🎯 All claim methods activate Level 1 membership with NFT Token ID 1
        </p>
        <p>
          💰 Rewards: 500 BCC transferable + 10,350 BCC locked + referral bonuses
        </p>
      </div>
    </div>
  );
}

export default MembershipClaimButtons;
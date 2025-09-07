import React, { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { useActiveAccount } from 'thirdweb/react';
import { useWeb3 } from '../contexts/Web3Context';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { Loader2, Crown, Shield, Zap, Users, Database, CreditCard } from 'lucide-react';
import { ERC5115ClaimComponent } from '../components/membership/ERC5115ClaimComponent';
import { BlockchainSyncButton } from '../components/shared/BlockchainSyncButton';

export default function Welcome() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const account = useActiveAccount();
  const { checkMembershipStatus, isSupabaseAuthenticated } = useWeb3();
  
  const [isLoading, setIsLoading] = useState(true);
  const [referrerWallet, setReferrerWallet] = useState<string | null>(null);

  // Get referrer from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    if (refParam && refParam.startsWith('0x') && refParam.length === 42) {
      // Keep original case as specified - wallet addresses must be case-preserved
      setReferrerWallet(refParam);
    }
    
    // Simulate loading time for better UX
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Handle wallet not connected
  useEffect(() => {
    if (!account?.address) {
      setLocation('/');
      return;
    }
  }, [account?.address, setLocation]);

  // Handle successful membership claim
  const handleClaimSuccess = async () => {
    // Refresh membership status and let Web3Context handle routing
    await checkMembershipStatus();
    
    // Small delay for UI feedback, then let the context handle routing
    setTimeout(() => {
      if (window.location.pathname === '/welcome') {
        // If still on welcome page, force redirect to dashboard
        setLocation('/dashboard');
      }
    }, 1000);
  };

  // Show loading state
  if (isLoading || !account?.address) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-honey" />
              <div className="text-center">
                <h3 className="font-medium text-honey">Loading...</h3>
                <p className="text-sm text-muted-foreground">
                  Preparing your membership activation
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Section */}
        <div className="text-center mb-8">
          <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30 mb-4">
            Welcome to Beehive Platform
          </Badge>
          <h1 className="text-4xl font-bold text-honey mb-4">
            Activate Your Membership
          </h1>
          <p className="text-xl text-muted-foreground mb-2">
            Claim your unique ERC-5115 NFT (Token ID 1) to unlock full platform access
          </p>
          <p className="text-muted-foreground">
            Free testnet claim with instant membership activation
          </p>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-honey/5 to-honey/10 border-honey/20">
            <CardContent className="pt-6 text-center">
              <Crown className="h-8 w-8 text-honey mx-auto mb-2" />
              <h3 className="font-semibold text-honey mb-1">Level 1 Access</h3>
              <p className="text-xs text-muted-foreground">
                Unlock dashboard and basic features
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
            <CardContent className="pt-6 text-center">
              <Database className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <h3 className="font-semibold text-green-400 mb-1">BCC Rewards</h3>
              <p className="text-xs text-muted-foreground">
                500 transferable + 10,350 locked tokens
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <h3 className="font-semibold text-purple-400 mb-1">Referral System</h3>
              <p className="text-xs text-muted-foreground">
                Join the 3×3 matrix network
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
            <CardContent className="pt-6 text-center">
              <Zap className="h-8 w-8 text-blue-400 mx-auto mb-2" />
              <h3 className="font-semibold text-blue-400 mb-1">USDT Rewards</h3>
              <p className="text-xs text-muted-foreground">
                Earn from network activities
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ERC-5115 NFT Claim for Membership Activation */}
        <ERC5115ClaimComponent 
          onSuccess={handleClaimSuccess}
          referrerWallet={referrerWallet || undefined}
          className="mb-8"
        />


        {/* Status Sync Section */}
        <Card className="mb-6 bg-muted/30 border-dashed">
          <CardContent className="pt-6 text-center">
            <h3 className="font-semibold text-foreground mb-2">Having Issues?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              If your NFT claim succeeded on blockchain but membership isn't activated, sync your status
            </p>
            <BlockchainSyncButton className="mb-2" />
            <p className="text-xs text-muted-foreground">
              This will check blockchain and update your membership status
            </p>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="text-center">
          <Button 
            variant="outline"
            onClick={() => setLocation('/')}
            className="mr-4"
          >
            Back to Home
          </Button>
          <Button 
            variant="ghost"
            onClick={() => setLocation('/register')}
            className="text-muted-foreground hover:text-foreground"
          >
            Need to register first?
          </Button>
        </div>

        {/* Network Information */}
        <div className="text-center text-xs text-muted-foreground mt-8 space-y-1">
          <p>🎯 All methods activate Level 1 membership with NFT Token ID 1</p>
          <p>💰 Rewards: 500 BCC transferable + 10,350 BCC locked + referral bonuses</p>
          <p>🌐 Connected: {account?.address?.slice(0, 8)}...{account?.address?.slice(-6)}</p>
        </div>
      </div>
    </div>
  );
}

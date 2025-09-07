import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { Crown, Gift, Sparkles, Loader2 } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { useI18n } from '../../contexts/I18nContext';
import { useLocation } from 'wouter';
import { ERC5115ClaimComponent } from '../membership/ERC5115ClaimComponent';

interface WelcomeState {
  showClaimComponent: boolean;
  userLevel: number;
  isActivated: boolean;
}

export default function WelcomePage() {
  const { walletAddress } = useWallet();
  const { toast } = useToast();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  
  const [isLoading, setIsLoading] = useState(true);
  const [welcomeState, setWelcomeState] = useState<WelcomeState>({
    showClaimComponent: true,
    userLevel: 0,
    isActivated: false,
  });

  useEffect(() => {
    if (walletAddress) {
      checkUserStatus();
    }
  }, [walletAddress]);

  const checkUserStatus = async () => {
    if (!walletAddress) return;

    setIsLoading(true);
    try {
      // Check user status via Edge Function - simplified to use only users table
      const response = await fetch('https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress,
        },
        body: JSON.stringify({
          action: 'get-user'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to check user status');
      }

      const userResult = await response.json();
      
      if (userResult.success && userResult.user) {
        setWelcomeState({
          showClaimComponent: !userResult.user.is_activated,
          userLevel: userResult.user.current_level || 0,
          isActivated: userResult.user.is_activated || false,
        });
        
        // If user is already activated, redirect to dashboard
        if (userResult.user.is_activated) {
          setLocation('/dashboard');
        }
      }

    } catch (error) {
      console.error('Error checking user status:', error);
      toast({
        title: t('welcome.errorLoading') || 'Error Loading',
        description: t('welcome.pleaseRefresh') || 'Please refresh the page',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimSuccess = () => {
    toast({
      title: t('welcome.claimSuccessful') || 'NFT Claimed Successfully!',
      description: t('welcome.redirectingToDashboard') || 'Redirecting to dashboard...',
      duration: 3000,
    });
    
    // Redirect to dashboard after successful claim
    setTimeout(() => {
      setLocation('/dashboard');
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-honey" />
            <p className="text-honey">{t('welcome.checkingStatus') || 'Checking status...'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="bg-honey/10 p-3 rounded-full">
            <Crown className="h-8 w-8 text-honey" />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2 text-honey">
          {t('welcome.title') || 'Welcome to Beehive'}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t('welcome.subtitle') || 'Claim your Level 1 NFT to unlock membership benefits'}
        </p>
      </div>

      {/* Benefits Section */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="border-honey/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-honey">
              <Gift className="h-5 w-5" />
              Level 1 NFT
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Price:</span>
                <span className="font-semibold">100 USDC</span>
              </div>
              <div className="flex justify-between">
                <span>Platform Fee:</span>
                <span className="font-semibold">30 USDC</span>
              </div>
              <hr className="border-honey/20" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-honey">130 USDC</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-500">
              <Sparkles className="h-5 w-5" />
              BCC Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>NFT Reward:</span>
                <span className="font-semibold text-honey">130 BCC</span>
              </div>
              <div className="flex justify-between">
                <span>Welcome Bonus:</span>
                <span className="font-semibold text-green-500">500 BCC</span>
              </div>
              <hr className="border-green-500/20" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total BCC:</span>
                <span className="text-green-500">630 BCC</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-500">
              <Crown className="h-5 w-5" />
              Membership Benefits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-honey rounded-full"></div>
                Access to referral system
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-honey rounded-full"></div>
                Earn from team building
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-honey rounded-full"></div>
                NFT marketplace access
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-honey rounded-full"></div>
                Progressive level unlocks
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* NFT Claim Component */}
      {welcomeState.showClaimComponent && (
        <Card className="border-honey/30 bg-honey/5">
          <CardHeader>
            <CardTitle className="text-center text-honey">
              🎯 Claim Your Level 1 NFT
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ERC5115ClaimComponent 
              onSuccess={handleClaimSuccess}
              className="w-full"
            />
          </CardContent>
        </Card>
      )}
      
      {/* Already Activated Message */}
      {welcomeState.isActivated && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-500/10 p-3 rounded-full">
                <Crown className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-green-500 mb-2">
              🎉 Membership Already Active!
            </h3>
            <p className="text-muted-foreground mb-4">
              You already have Level {welcomeState.userLevel} membership. 
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
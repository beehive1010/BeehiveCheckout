import React, { useEffect, useState } from 'react';
import { ERC5115ClaimComponent } from '../components/membership/ERC5115ClaimComponent';
import { useLocation } from 'wouter';
import { useActiveAccount } from 'thirdweb/react';
import { referralService } from '../api/landing/referral.client';
import { authService } from '../lib/supabaseClient';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Users, User, Crown } from 'lucide-react';

export default function Welcome() {
  const [, setLocation] = useLocation();
  const account = useActiveAccount();
  const [referrerWallet, setReferrerWallet] = useState<string>('');
  const [referrerInfo, setReferrerInfo] = useState<{ username?: string; wallet: string } | null>(null);
  const [isLoadingReferrer, setIsLoadingReferrer] = useState(false);
  const [isCheckingMembership, setIsCheckingMembership] = useState(false);

  // Get referrer from URL params and localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      setReferrerWallet(ref);
      referralService.handleReferralParameter();
      console.log('🔗 Referrer detected from URL:', ref);
    } else {
      // Check localStorage for stored referrer
      const storedReferrer = referralService.getReferrerWallet();
      if (storedReferrer) {
        setReferrerWallet(storedReferrer);
        console.log('🔗 Referrer loaded from storage:', storedReferrer);
      }
    }
  }, []);

  // Load referrer information
  useEffect(() => {
    const loadReferrerInfo = async () => {
      if (!referrerWallet) {
        setReferrerInfo(null);
        return;
      }

      setIsLoadingReferrer(true);
      try {
        const { data } = await authService.getUser(referrerWallet);
        if (data) {
          setReferrerInfo({
            username: data.username,
            wallet: referrerWallet
          });
        } else {
          setReferrerInfo({ wallet: referrerWallet });
        }
      } catch (error) {
        console.warn('Failed to load referrer info:', error);
        setReferrerInfo({ wallet: referrerWallet });
      } finally {
        setIsLoadingReferrer(false);
      }
    };

    loadReferrerInfo();
  }, [referrerWallet]);

  // Check if user is already an activated member and redirect to dashboard
  useEffect(() => {
    const checkMembershipStatus = async () => {
      if (!account?.address) return;
      
      setIsCheckingMembership(true);
      try {
        console.log('🔍 Checking membership status for:', account.address);
        const membershipResult = await authService.isActivatedMember(account.address);
        console.log('📊 Membership result:', membershipResult);
        
        if (membershipResult.isActivated && membershipResult.memberData?.current_level >= 1) {
          console.log('✅ User is already activated member - redirecting to dashboard');
          setLocation('/dashboard');
          return;
        }
      } catch (error) {
        console.warn('⚠️ Failed to check membership status:', error);
      } finally {
        setIsCheckingMembership(false);
      }
    };

    checkMembershipStatus();
  }, [account?.address, setLocation]);

  const handleActivationComplete = () => {
    console.log('✅ NFT claim and activation completed - redirecting to dashboard');
    setLocation('/dashboard');
  };

  // Show loading state while checking membership
  if (isCheckingMembership) {
    return (
      <div className="min-h-screen bg-background py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-honey border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking membership status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Welcome to Beehive Community
          </h1>
          <p className="text-xl text-muted-foreground mb-2">
            Activate your Level 1 membership by claiming your ERC-5115 NFT
          </p>
          
          {/* Referrer Information Card */}
          {referrerWallet && (
            <Card className="max-w-md mx-auto mt-4 border-honey/30 bg-honey/5">
              <CardContent className="pt-4">
                <div className="flex items-center justify-center space-x-3">
                  <Users className="h-5 w-5 text-honey" />
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Referred by:</p>
                    {isLoadingReferrer ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin h-4 w-4 border-2 border-honey border-t-transparent rounded-full"></div>
                        <span className="text-sm text-honey">Loading...</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {referrerInfo?.username && (
                          <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
                            <User className="h-3 w-3 mr-1" />
                            {referrerInfo.username}
                          </Badge>
                        )}
                        <div className="font-mono text-xs text-muted-foreground">
                          {referrerWallet.slice(0, 8)}...{referrerWallet.slice(-6)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-3 text-center">
                  <div className="flex items-center justify-center space-x-1 text-xs text-honey/80">
                    <Crown className="h-3 w-3" />
                    <span>You'll be placed in their 3×3 matrix system</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        <ERC5115ClaimComponent 
          onSuccess={handleActivationComplete}
          referrerWallet={referrerWallet}
        />
        
        <div className="mt-8 text-center text-sm text-muted-foreground space-y-2">
          <p className="mb-2">🎯 Connect your wallet and claim your NFT to activate Level 1 membership</p>
          <p>⚡ This will enable access to the 3x3 referral matrix and BCC reward system</p>
          {referrerWallet && (
            <div className="p-3 bg-secondary/50 rounded-lg mt-4">
              <p className="text-xs text-honey/90">
                💡 <strong>Matrix Placement:</strong> You'll be automatically placed in the first available slot in your referrer's matrix tree, 
                following the 3×3 structure (Layer 1→2→3...). This determines your position for earning layer rewards.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Manual Activation Button
 *
 * Used to manually trigger membership activation after PayEmbed purchase
 * Similar flow to WelcomeLevel1ClaimButton but for existing NFT holders
 */

import { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { balanceOf } from 'thirdweb/extensions/erc1155';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { authService } from '@/lib/supabase';
import { useI18n } from '@/contexts/I18nContext';
import RegistrationModal from '@/components/modals/RegistrationModal';
import { useMembershipNFT } from '@/hooks/useMembershipNFT';

interface ManualActivationButtonProps {
  level?: number;
  onSuccess?: () => void;
  className?: string;
}

export function ManualActivationButton({
  level = 1,
  onSuccess,
  className = ''
}: ManualActivationButtonProps) {
  const account = useActiveAccount();
  const { toast } = useToast();
  const { t } = useI18n();
  const { nftContract, client } = useMembershipNFT();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [hasNFT, setHasNFT] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [checking, setChecking] = useState(true);

  const API_BASE = import.meta.env.VITE_API_BASE_URL ||
    'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';

  // Check status on mount and when account changes
  useEffect(() => {
    if (account?.address) {
      checkStatus();
    }
  }, [account?.address, level]);

  const checkStatus = async () => {
    if (!account?.address) {
      setChecking(false);
      return;
    }

    try {
      setChecking(true);
      console.log('🔍 Checking activation status for:', account.address);

      // 1. Check NFT ownership
      console.log('  📦 Checking NFT ownership...');
      const balance = await balanceOf({
        contract: nftContract,
        owner: account.address,
        tokenId: BigInt(level)
      });

      const ownsNFT = Number(balance) > 0;
      setHasNFT(ownsNFT);
      console.log(`  ${ownsNFT ? '✅' : '❌'} NFT ownership:`, ownsNFT);

      // 2. Check user registration
      console.log('  👤 Checking user registration...');
      const { data: userData } = await authService.getUser(account.address);
      const registered = !!userData;
      setIsRegistered(registered);
      console.log(`  ${registered ? '✅' : '❌'} User registration:`, registered);

      // 3. Check member activation
      console.log('  🎯 Checking member activation...');
      const membershipResult = await authService.isActivatedMember(account.address);
      const activated = membershipResult.isActivated &&
        membershipResult.memberData?.current_level >= level;
      setIsActivated(activated);
      console.log(`  ${activated ? '✅' : '❌'} Member activation:`, activated);

      console.log('📊 Status Summary:', {
        hasNFT: ownsNFT,
        isRegistered: registered,
        isActivated: activated
      });

    } catch (error) {
      console.error('❌ Status check failed:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleActivate = async () => {
    if (!account?.address) return;

    try {
      setIsProcessing(true);

      // Step 1: Check registration
      if (!isRegistered) {
        console.log('❌ User not registered - showing registration modal');
        toast({
          title: t('registration.required') || 'Registration Required',
          description: t('registration.requiredDesc') || 'Please register to activate your membership',
          duration: 3000
        });
        setShowRegistrationModal(true);
        return;
      }

      // Step 2: Check NFT ownership
      if (!hasNFT) {
        console.log('❌ User does not own NFT');
        toast({
          title: 'NFT Required',
          description: `You must own Level ${level} NFT to activate`,
          variant: 'destructive',
          duration: 5000
        });
        return;
      }

      // Step 3: Get referrer (from user data)
      console.log('🔍 Getting referrer information...');
      const { data: userData } = await authService.getUser(account.address);
      const referrerWallet = userData?.referrer_wallet;

      if (!referrerWallet) {
        console.log('⚠️ No referrer found');
        toast({
          title: 'Referrer Required',
          description: 'A referrer is required for activation. Please contact support.',
          variant: 'destructive',
          duration: 8000
        });
        return;
      }

      console.log('✅ Referrer found:', referrerWallet);

      // Step 4: Call payembed-activation API
      console.log('🚀 Calling activation API...');
      toast({
        title: '⏳ Activating Membership',
        description: 'Verifying NFT ownership and creating records...',
        duration: 5000
      });

      const response = await fetch(`${API_BASE}/payembed-activation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': `${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'x-wallet-address': account.address,
        },
        body: JSON.stringify({
          level,
          referrerWallet: referrerWallet,
        }),
      });

      console.log('📡 API Response Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Activation failed:', errorText);

        let errorJson;
        try {
          errorJson = JSON.parse(errorText);
        } catch (e) {
          errorJson = { message: errorText };
        }

        // Handle specific errors
        if (errorJson.error === 'NFT_NOT_FOUND') {
          toast({
            title: 'NFT Not Found',
            description: 'NFT ownership could not be verified on-chain. Please wait a few minutes for the transaction to confirm.',
            variant: 'destructive',
            duration: 10000
          });
        } else if (errorJson.error === 'USER_NOT_REGISTERED') {
          setShowRegistrationModal(true);
        } else {
          toast({
            title: 'Activation Failed',
            description: errorJson.message || 'Please try again or contact support',
            variant: 'destructive',
            duration: 8000
          });
        }
        return;
      }

      const result = await response.json();
      console.log('✅ Activation successful:', result);

      if (result.success || result.alreadyActivated) {
        toast({
          title: '🎉 Membership Activated!',
          description: `Level ${level} membership is now active`,
          variant: 'default',
          duration: 5000
        });

        setIsActivated(true);

        if (onSuccess) {
          onSuccess();
        }

        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      }

    } catch (error: any) {
      console.error('❌ Activation error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to activate membership',
        variant: 'destructive',
        duration: 5000
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegistrationComplete = () => {
    console.log('✅ Registration completed');
    setShowRegistrationModal(false);
    setIsRegistered(true);

    // Recheck status after registration
    setTimeout(() => {
      checkStatus();
    }, 1000);
  };

  // Show loading state
  if (checking) {
    return (
      <Card className={`bg-gradient-to-br from-amber-900/20 to-amber-800/10 border-amber-500/30 ${className}`}>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
            <span className="text-muted-foreground">Checking status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Already activated
  if (isActivated) {
    return (
      <Card className={`bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-500/30 ${className}`}>
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold">Level {level} Already Activated</span>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Your membership is active and ready
          </p>
        </CardContent>
      </Card>
    );
  }

  // Needs activation
  return (
    <>
      <Card className={`bg-gradient-to-br from-amber-900/20 to-amber-800/10 border-amber-500/30 ${className}`}>
        <CardHeader>
          <CardTitle className="text-center text-amber-400">
            Manual Membership Activation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Checklist */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {hasNFT ? (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-400" />
              )}
              <span className={hasNFT ? 'text-green-400' : 'text-red-400'}>
                Own Level {level} NFT
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              {isRegistered ? (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-400" />
              )}
              <span className={isRegistered ? 'text-green-400' : 'text-yellow-400'}>
                User Registration
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              {isActivated ? (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-gray-400" />
              )}
              <span className={isActivated ? 'text-green-400' : 'text-gray-400'}>
                Membership Activated
              </span>
            </div>
          </div>

          {/* Info message */}
          {hasNFT && !isActivated && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-400">
                📦 You own the NFT but membership is not activated yet. Click below to activate.
              </p>
            </div>
          )}

          {!hasNFT && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">
                ❌ You need to own Level {level} NFT to activate. Please purchase it first.
              </p>
            </div>
          )}

          {/* Activation Button */}
          <Button
            onClick={handleActivate}
            disabled={!account?.address || isProcessing || !hasNFT || isActivated}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
            size="lg"
          >
            {!account?.address ? (
              'Connect Wallet'
            ) : isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Activating...
              </>
            ) : (
              `Activate Level ${level} Membership`
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            This will verify your NFT ownership on-chain and activate your membership in the database.
          </p>
        </CardContent>
      </Card>

      {/* Registration Modal */}
      {account?.address && (
        <RegistrationModal
          isOpen={showRegistrationModal}
          onClose={() => setShowRegistrationModal(false)}
          walletAddress={account.address}
          onRegistrationComplete={handleRegistrationComplete}
        />
      )}
    </>
  );
}

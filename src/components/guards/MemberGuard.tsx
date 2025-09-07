import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Loader2, Shield, Crown, Users, AlertTriangle, Wallet } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { authService } from '../../lib/supabaseClient';
import { useI18n } from '../../contexts/I18nContext';
import RegistrationModal from '../modals/RegistrationModal';
import { referralService } from '../../api/landing/referral.client';

interface MemberGuardProps {
  children: React.ReactNode;
  requireLevel?: number; // Minimum membership level required
  requireActivation?: boolean; // Require activated member (default: true for dashboard)
  fallbackComponent?: React.ComponentType;
  redirectTo?: string;
}

interface UserStatus {
  isRegistered: boolean;
  isActivated: boolean;
  membershipLevel: number;
  needsRegistration: boolean;
  needsActivation: boolean;
}

export function MemberGuard({ 
  children, 
  requireLevel = 1,
  requireActivation = true,
  fallbackComponent: FallbackComponent,
  redirectTo
}: MemberGuardProps) {
  const { isConnected, walletAddress } = useWallet();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [referrerWallet, setReferrerWallet] = useState<string | undefined>();

  // Check user status when wallet connection changes
  useEffect(() => {
    if (isConnected && walletAddress) {
      checkUserStatus();
    } else {
      // Wallet disconnected - redirect to landing page
      if (!isConnected && !walletAddress) {
        setLocation('/');
      }
      setUserStatus(null);
      setIsLoading(false);
    }
  }, [isConnected, walletAddress]);

  const checkUserStatus = async () => {
    if (!walletAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get referrer from stored referral link
      const storedReferrer = referralService.getReferrerWallet();
      setReferrerWallet(storedReferrer);

      // Check if user exists in database
      const { exists } = await authService.userExists(walletAddress);
      
      if (!exists) {
        // Show registration modal for new users
        setShowRegistrationModal(true);
        setUserStatus({
          isRegistered: false,
          isActivated: false,
          membershipLevel: 0,
          needsRegistration: true,
          needsActivation: false,
        });
        setIsLoading(false);
        return;
      }

      // Check if user is an activated member
      const { isActivated } = await authService.isActivatedMember(walletAddress);
      
      // Get user membership level (assuming Level 1 if activated, 0 if not)
      const membershipLevel = isActivated ? 1 : 0;

      setUserStatus({
        isRegistered: true,
        isActivated,
        membershipLevel,
        needsRegistration: false,
        needsActivation: !isActivated,
      });

      // Auto-redirect non-activated users to welcome page if they try to access protected content
      if (requireActivation && !isActivated && redirectTo !== '/welcome') {
        setLocation('/welcome');
        return;
      }

    } catch (err) {
      console.error('MemberGuard user status check error:', err);
      setError(err instanceof Error ? err.message : 'Failed to verify access');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistrationComplete = () => {
    setShowRegistrationModal(false);
    // Refresh user status after registration
    checkUserStatus();
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-honey" />
              <div className="text-center">
                <h3 className="font-medium text-honey">{t('guard.checkingAccess')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('guard.verifyingMembership')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle wallet not connected - redirect to landing page
  if (!isConnected || !walletAddress) {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }

    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Card className="w-full max-w-md border-amber-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-500">
              <Wallet className="h-5 w-5" />
              {t('guard.walletRequired')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('guard.connectWalletToContinue')}
            </p>
            <Button 
              onClick={() => setLocation('/')}
              className="w-full bg-honey hover:bg-honey/90"
            >
              {t('guard.goToHome')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle API errors
  if (error) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Card className="w-full max-w-md border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t('guard.accessError')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {error}
            </p>
            <Button 
              onClick={checkUserStatus}
              variant="outline"
              className="w-full"
            >
              {t('guard.tryAgain')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle insufficient membership level for activated users
  if (userStatus && userStatus.isActivated && userStatus.membershipLevel < requireLevel) {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }

    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Card className="w-full max-w-md border-honey/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-honey">
              <Crown className="h-5 w-5" />
              {t('guard.upgradeRequired')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">{t('guard.currentLevel')}:</span>
                <Badge variant="outline">{userStatus.membershipLevel}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">{t('guard.requiredLevel')}:</span>
                <Badge className="bg-honey text-black">{requireLevel}</Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('guard.levelRequiredMessage')} {requireLevel}
            </p>
            <Button 
              onClick={() => setLocation('/me')}
              className="w-full bg-honey hover:bg-honey/90 text-black"
            >
              {t('guard.upgradeMembership')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle non-activated users who need membership activation
  if (requireActivation && userStatus && !userStatus.isActivated) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-honey" />
              <div className="text-center">
                <h3 className="font-medium text-honey">{t('guard.redirecting')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('guard.redirectingToActivation')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Registration Modal */}
      <RegistrationModal
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        walletAddress={walletAddress || ''}
        referrerWallet={referrerWallet}
        onRegistrationComplete={handleRegistrationComplete}
      />
      
      {/* Protected Content */}
      {children}
    </>
  );
}

export default MemberGuard;
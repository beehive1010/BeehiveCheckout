import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Loader2, Crown, AlertTriangle, Wallet } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
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
  // Use useWallet hook directly - no duplicate checks!
  const { isConnected, walletAddress, userStatus: walletUserStatus, isUserLoading, isNewUser } = useWallet();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [referrerWallet, setReferrerWallet] = useState<string | undefined>();

  // Get referrer on mount
  useEffect(() => {
    const storedReferrer = referralService.getReferrerWallet();
    setReferrerWallet(storedReferrer || undefined);
  }, []);

  // Handle new users - show registration modal
  useEffect(() => {
    if (isNewUser && !isUserLoading) {
      setShowRegistrationModal(true);
    }
  }, [isNewUser, isUserLoading]);

  // Handle redirects for unactivated users
  useEffect(() => {
    if (!isUserLoading && walletUserStatus) {
      const isActivated = walletUserStatus.isActivated;

      // Auto-redirect non-activated users to welcome page
      if (requireActivation && !isActivated && redirectTo) {
        console.log(`🛡️ MemberGuard: Redirecting unactivated user to ${redirectTo}`);
        setLocation(redirectTo);
      }
    }
  }, [isUserLoading, walletUserStatus, requireActivation, redirectTo]);

  const handleRegistrationComplete = () => {
    setShowRegistrationModal(false);
    // useWallet will automatically refresh
  };

  // Show loading state
  if (isUserLoading) {
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

  // Handle insufficient membership level for activated users
  if (walletUserStatus && walletUserStatus.isActivated && walletUserStatus.membershipLevel < requireLevel) {
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
                <Badge variant="outline">{walletUserStatus.membershipLevel}</Badge>
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
  if (requireActivation && walletUserStatus && !walletUserStatus.isActivated) {
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
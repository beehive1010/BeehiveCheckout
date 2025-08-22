import { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { useActiveAccount } from 'thirdweb/react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';
import { useNFTVerification } from '../hooks/useNFTVerification';
import ClaimMembershipButton from '../components/membership/ClaimMembershipButton';

export default function Welcome() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const account = useActiveAccount();
  const { hasLevel1NFT, isLoading } = useNFTVerification();

  // If user already has Level 1 NFT, redirect to dashboard
  if (hasLevel1NFT && !isLoading) {
    setLocation('/dashboard');
    return null;
  }

  // If no wallet connected, redirect to landing
  if (!account?.address) {
    setLocation('/');
    return null;
  }

  const handlePurchaseSuccess = () => {
    toast({
      title: t('welcome.success.title'),
      description: t('welcome.success.description'),
    });
    
    // Small delay to allow NFT ownership to update
    setTimeout(() => {
      setLocation('/dashboard');
    }, 2000);
  };

  const handlePurchaseError = (error: string) => {
    console.error('Purchase error:', error);
    toast({
      title: t('welcome.error.title'),
      description: error || t('welcome.error.description'),
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-secondary border-border shadow-2xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold text-honey mb-2">
              {t('welcome.title')}
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              {t('welcome.subtitle')}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* NFT Section */}
            <div className="bg-muted rounded-lg p-4 border border-honey/20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-honey">{t('welcome.nft.title')}</h3>
                  <p className="text-xs text-muted-foreground">{t('welcome.nft.description')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{t('welcome.nft.price')}</p>
                  <p className="text-xl font-bold text-honey">{t('welcome.nft.priceAmount')}</p>
                </div>
              </div>
              <div className="flex items-center text-xs">
                <i className="fas fa-layer-group text-honey mr-2"></i>
                <span className="text-honey font-medium">{t('welcome.nft.tokenId')}</span>
              </div>
            </div>

            {/* Benefits Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-honey">{t('welcome.benefits.title')}</h3>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <div className="w-4 h-4 rounded-full bg-honey/20 flex items-center justify-center mr-3">
                    <i className="fas fa-check text-honey text-xs"></i>
                  </div>
                  <span className="text-muted-foreground">{t('welcome.benefits.dashboard')}</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-4 h-4 rounded-full bg-honey/20 flex items-center justify-center mr-3">
                    <i className="fas fa-check text-honey text-xs"></i>
                  </div>
                  <span className="text-muted-foreground">{t('welcome.benefits.tasks')}</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-4 h-4 rounded-full bg-honey/20 flex items-center justify-center mr-3">
                    <i className="fas fa-check text-honey text-xs"></i>
                  </div>
                  <span className="text-muted-foreground">{t('welcome.benefits.education')}</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-4 h-4 rounded-full bg-honey/20 flex items-center justify-center mr-3">
                    <i className="fas fa-check text-honey text-xs"></i>
                  </div>
                  <span className="text-muted-foreground">{t('welcome.benefits.discover')}</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-4 h-4 rounded-full bg-honey/20 flex items-center justify-center mr-3">
                    <i className="fas fa-check text-honey text-xs"></i>
                  </div>
                  <span className="text-muted-foreground">{t('welcome.benefits.tokens')}</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-4 h-4 rounded-full bg-honey/20 flex items-center justify-center mr-3">
                    <i className="fas fa-check text-honey text-xs"></i>
                  </div>
                  <span className="text-muted-foreground">{t('welcome.benefits.hiveworld')}</span>
                </div>
              </div>
            </div>

            {/* Premium Section */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <i className="fas fa-gem text-honey mr-2"></i>
                <span className="text-honey font-medium text-sm">{t('welcome.premium.title')}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('welcome.premium.description')}
              </p>

              <ClaimMembershipButton
                walletAddress={account?.address || ""}
                level={1}
                onSuccess={handlePurchaseSuccess}
                onError={handlePurchaseError}
                className="w-full"
              />

              <p className="text-xs text-muted-foreground">
                {t('welcome.supportText')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
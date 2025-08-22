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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNGRkI4MDAiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCA0LTRoMTZjMiAwIDQgMiA0IDR2MTZjMCAyLTIgNC00IDRIMzZWMzR6Ii8+PC9nPjwvZz48L3N2Zz4=')] bg-repeat"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 pt-20 pb-16">
          <div className="text-center max-w-4xl mx-auto">
            {/* Main Title */}
            <div className="mb-8">
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-honey via-yellow-400 to-honey bg-clip-text text-transparent mb-4">
                {t('welcome.title')}
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                {t('welcome.subtitle')}
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <Card className="bg-secondary/50 backdrop-blur border-honey/20 hover:border-honey/40 transition-all duration-300 group">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-honey/10 flex items-center justify-center group-hover:bg-honey/20 transition-colors">
                    <i className="fas fa-graduation-cap text-honey text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-honey mb-2">{t('welcome.benefits.education')}</h3>
                  <p className="text-sm text-muted-foreground">Learn Web3 through interactive courses</p>
                </CardContent>
              </Card>

              <Card className="bg-secondary/50 backdrop-blur border-honey/20 hover:border-honey/40 transition-all duration-300 group">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-honey/10 flex items-center justify-center group-hover:bg-honey/20 transition-colors">
                    <i className="fas fa-coins text-honey text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-honey mb-2">{t('welcome.benefits.tokens')}</h3>
                  <p className="text-sm text-muted-foreground">Earn BCC tokens through platform activities</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Membership Section */}
      <div className="container mx-auto px-4 pb-20">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-secondary border-honey/30 shadow-2xl backdrop-blur">
            <CardHeader className="text-center pb-6">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-honey/20 to-honey/10 flex items-center justify-center">
                <i className="fas fa-crown text-honey text-3xl"></i>
              </div>
              <CardTitle className="text-2xl md:text-3xl font-bold text-honey mb-3">
                {t('welcome.premium.title')}
              </CardTitle>
              <p className="text-muted-foreground text-lg">
                {t('welcome.premium.description')}
              </p>
            </CardHeader>
            
            <CardContent className="space-y-8">
              {/* NFT Info Card */}
              <div className="bg-gradient-to-r from-honey/5 via-honey/10 to-honey/5 rounded-xl p-6 border border-honey/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-honey/20 flex items-center justify-center">
                      <i className="fas fa-layer-group text-honey text-xl"></i>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-honey">{t('welcome.nft.title')}</h3>
                      <p className="text-sm text-muted-foreground">{t('welcome.nft.description')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{t('welcome.nft.price')}</p>
                    <p className="text-2xl font-bold text-honey">{t('welcome.nft.priceAmount')}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-honey font-medium">{t('welcome.nft.tokenId')}</span>
                  <span className="text-muted-foreground">One-time purchase</span>
                </div>
              </div>

              {/* Benefits Grid */}
              <div>
                <h3 className="text-xl font-semibold text-honey mb-6 text-center">What You'll Unlock:</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-honey/20 flex items-center justify-center">
                      <i className="fas fa-tasks text-honey text-sm"></i>
                    </div>
                    <span className="text-sm font-medium">{t('welcome.benefits.tasks')}</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-honey/20 flex items-center justify-center">
                      <i className="fas fa-compass text-honey text-sm"></i>
                    </div>
                    <span className="text-sm font-medium">{t('welcome.benefits.discover')}</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-honey/20 flex items-center justify-center">
                      <i className="fas fa-sitemap text-honey text-sm"></i>
                    </div>
                    <span className="text-sm font-medium">{t('welcome.benefits.hiveworld')}</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-honey/20 flex items-center justify-center">
                      <i className="fas fa-shopping-cart text-honey text-sm"></i>
                    </div>
                    <span className="text-sm font-medium">NFT Marketplace</span>
                  </div>
                </div>
              </div>

              {/* Purchase Button */}
              <div className="text-center space-y-4">
                <ClaimMembershipButton
                  walletAddress={account?.address || ""}
                  level={1}
                  onSuccess={handlePurchaseSuccess}
                  onError={handlePurchaseError}
                  className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-honey to-yellow-400 hover:from-yellow-400 hover:to-honey text-black transition-all duration-300 shadow-lg hover:shadow-honey/25"
                />
                <p className="text-sm text-muted-foreground">
                  {t('welcome.supportText')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="relative">
        <svg className="absolute bottom-0 left-0 w-full h-24 fill-muted/20" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25"></path>
          <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5"></path>
          <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"></path>
        </svg>
      </div>
    </div>
  );
}
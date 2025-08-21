import { useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import HexagonIcon from '../components/UI/HexagonIcon';

export default function Landing() {
  const { isConnected, isRegistered, isActivated } = useWallet();
  const { t } = useI18n();
  const [, setLocation] = useLocation();

  // Check URL for referral parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const referrer = urlParams.get('ref');
    if (referrer) {
      localStorage.setItem('beehive-referrer', referrer);
    }
  }, []);

  // Redirect logic based on wallet and registration status
  useEffect(() => {
    if (isConnected && isRegistered && isActivated) {
      setLocation('/dashboard');
    } else if (isConnected && !isRegistered) {
      setLocation('/register');
    }
  }, [isConnected, isRegistered, isActivated, setLocation]);

  const handleGetStarted = async () => {
    if (!isConnected) {
      // ConnectButton will handle wallet connection
      console.log('Please use Connect Wallet button');
    }
  };

  return (
    <div className="min-h-screen bg-background honeycomb-pattern bg-honeycomb">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="mb-8">
            <HexagonIcon className="w-24 h-24 mx-auto mb-6" size="xl">
              <i className="fas fa-layer-group text-honey text-3xl"></i>
            </HexagonIcon>
            <h1 className="text-4xl md:text-6xl font-bold text-honey mb-4">
              {t('landing.hero.title')}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              {t('landing.hero.subtitle')}
            </p>
          </div>

          <Button 
            onClick={handleGetStarted}
            size="lg"
            className="btn-honey text-lg px-8 py-4 glow-hover animate-pulse-subtle"
            data-testid="button-get-started"
          >
            <i className="fas fa-rocket mr-3"></i>
            {t('landing.getStarted')}
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {/* Web3 Membership */}
          <Card className="bg-secondary border-border glow-hover card-hover">
            <CardContent className="p-6">
              <HexagonIcon className="mb-4">
                <i className="fas fa-shield-alt text-honey"></i>
              </HexagonIcon>
              <h3 className="text-xl font-semibold text-honey mb-3">
                {t('landing.features.membership.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('landing.features.membership.description')}
              </p>
            </CardContent>
          </Card>

          {/* Referral Matrix */}
          <Card className="bg-secondary border-border glow-hover card-hover">
            <CardContent className="p-6">
              <HexagonIcon className="mb-4">
                <i className="fas fa-sitemap text-honey"></i>
              </HexagonIcon>
              <h3 className="text-xl font-semibold text-honey mb-3">
                {t('landing.features.referral.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('landing.features.referral.description')}
              </p>
            </CardContent>
          </Card>

          {/* Education */}
          <Card className="bg-secondary border-border glow-hover card-hover">
            <CardContent className="p-6">
              <HexagonIcon className="mb-4">
                <i className="fas fa-graduation-cap text-honey"></i>
              </HexagonIcon>
              <h3 className="text-xl font-semibold text-honey mb-3">
                {t('landing.features.education.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('landing.features.education.description')}
              </p>
            </CardContent>
          </Card>

          {/* NFT Marketplace */}
          <Card className="bg-secondary border-border glow-hover card-hover">
            <CardContent className="p-6">
              <HexagonIcon className="mb-4">
                <i className="fas fa-gem text-honey"></i>
              </HexagonIcon>
              <h3 className="text-xl font-semibold text-honey mb-3">
                {t('landing.features.marketplace.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('landing.features.marketplace.description')}
              </p>
            </CardContent>
          </Card>

          {/* BCC Tokens */}
          <Card className="bg-secondary border-border glow-hover card-hover">
            <CardContent className="p-6">
              <HexagonIcon className="mb-4">
                <i className="fas fa-coins text-honey"></i>
              </HexagonIcon>
              <h3 className="text-xl font-semibold text-honey mb-3">
                {t('landing.features.tokens.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('landing.features.tokens.description')}
              </p>
            </CardContent>
          </Card>

          {/* Rewards */}
          <Card className="bg-secondary border-border glow-hover card-hover">
            <CardContent className="p-6">
              <HexagonIcon className="mb-4">
                <i className="fas fa-gift text-honey"></i>
              </HexagonIcon>
              <h3 className="text-xl font-semibold text-honey mb-3">
                {t('landing.features.rewards.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('landing.features.rewards.description')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-honey mb-12">
            {t('landing.howItWorks.title')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-honey text-black rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-honey mb-3">
                {t('landing.howItWorks.step1.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('landing.howItWorks.step1.description')}
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-honey text-black rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-honey mb-3">
                {t('landing.howItWorks.step2.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('landing.howItWorks.step2.description')}
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-honey text-black rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-honey mb-3">
                {t('landing.howItWorks.step3.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('landing.howItWorks.step3.description')}
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="bg-secondary border-border max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-honey mb-4">
                {t('landing.cta.title')}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t('landing.cta.description')}
              </p>
              <Button 
                onClick={handleGetStarted}
                size="lg"
                className="btn-honey text-lg px-8 py-4 glow-hover"
                data-testid="button-cta-start"
              >
                <i className="fas fa-arrow-right mr-3"></i>
                {t('landing.cta.button')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

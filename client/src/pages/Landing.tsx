import { useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ConnectButton } from 'thirdweb/react';
import { client, supportedChains, wallets, authConfig } from '../lib/web3';
import HexagonIcon from '../components/UI/HexagonIcon';

export default function Landing() {
  const { t } = useI18n();

  // Check URL for referral parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const referrer = urlParams.get('ref');
    if (referrer) {
      localStorage.setItem('beehive-referrer', referrer);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background honeycomb-pattern bg-honeycomb overflow-hidden">
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 w-32 h-32 bg-honey/5 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute top-32 right-20 w-24 h-24 bg-honey/10 rounded-full blur-xl animate-pulse delay-700"></div>
        <div className="absolute bottom-40 left-1/4 w-40 h-40 bg-honey/3 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 right-10 w-28 h-28 bg-honey/7 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>

      <div className="container mx-auto px-4 py-16 relative">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="mb-12 relative">
            {/* Animated background glow */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-honey/20 rounded-full blur-3xl animate-pulse"></div>
            </div>
            
            {/* Main icon with floating animation */}
            <div className="relative animate-float">
              <HexagonIcon className="w-32 h-32 mx-auto mb-8 drop-shadow-2xl" size="xl">
                <i className="fas fa-layer-group text-honey text-4xl drop-shadow-lg"></i>
              </HexagonIcon>
            </div>
            
            {/* Animated title with gradient */}
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-honey via-yellow-400 to-honey bg-clip-text text-transparent mb-6 leading-tight">
              {t('landing.hero.title')}
            </h1>
            
            {/* Enhanced subtitle */}
            <p className="text-xl md:text-3xl text-muted-foreground mb-12 max-w-4xl mx-auto leading-relaxed font-light">
              {t('landing.hero.subtitle')}
            </p>

            {/* Stats bar */}
            <div className="flex flex-wrap justify-center items-center gap-8 mb-12 text-sm md:text-base">
              <div className="flex items-center gap-2 bg-secondary/50 rounded-full px-4 py-2 backdrop-blur-sm border border-honey/20">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-muted-foreground">19 Membership Levels</span>
              </div>
              <div className="flex items-center gap-2 bg-secondary/50 rounded-full px-4 py-2 backdrop-blur-sm border border-honey/20">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-muted-foreground">3×3 Matrix System</span>
              </div>
              <div className="flex items-center gap-2 bg-secondary/50 rounded-full px-4 py-2 backdrop-blur-sm border border-honey/20">
                <div className="w-2 h-2 bg-honey rounded-full animate-pulse"></div>
                <span className="text-muted-foreground">NFT Marketplace</span>
              </div>
            </div>
          </div>

          {/* Enhanced CTA Button */}
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-honey to-yellow-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
            <ConnectButton
              client={client}
              chains={supportedChains}
              wallets={wallets}
              theme="dark"
              auth={authConfig}
              connectModal={{ 
                showThirdwebBranding: false, 
                size: "wide",
                title: "Connect to Beehive",
                titleIcon: "🐝",
              }}
              connectButton={{
                label: `🚀 ${t('landing.getStarted')}`,
                className: "relative btn-honey text-xl px-12 py-5 font-semibold transform hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-honey/25"
              }}
              detailsButton={{
                className: "relative btn-honey text-xl px-12 py-5 font-semibold transform hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-honey/25"
              }}
              data-testid="button-get-started"
            />
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-honey mb-4">Platform Features</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover the powerful features that make Beehive the ultimate Web3 membership platform
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Web3 Membership */}
          <Card className="bg-gradient-to-br from-secondary to-secondary/50 border-border glow-hover card-hover group hover:border-honey/50 transition-all duration-500 hover:-translate-y-2">
            <CardContent className="p-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-honey/10 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <HexagonIcon className="relative w-16 h-16 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-shield-alt text-honey text-2xl"></i>
                </HexagonIcon>
              </div>
              <h3 className="text-2xl font-semibold text-honey mb-4 group-hover:text-yellow-400 transition-colors duration-300">
                {t('landing.features.membership.title')}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t('landing.features.membership.description')}
              </p>
              <div className="mt-4 text-sm text-honey/70">19 Exclusive Levels</div>
            </CardContent>
          </Card>

          {/* Referral Matrix */}
          <Card className="bg-gradient-to-br from-secondary to-secondary/50 border-border glow-hover card-hover group hover:border-honey/50 transition-all duration-500 hover:-translate-y-2">
            <CardContent className="p-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-honey/10 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <HexagonIcon className="relative w-16 h-16 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-sitemap text-honey text-2xl"></i>
                </HexagonIcon>
              </div>
              <h3 className="text-2xl font-semibold text-honey mb-4 group-hover:text-yellow-400 transition-colors duration-300">
                {t('landing.features.referral.title')}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t('landing.features.referral.description')}
              </p>
              <div className="mt-4 text-sm text-honey/70">Auto-placement System</div>
            </CardContent>
          </Card>

          {/* Education */}
          <Card className="bg-gradient-to-br from-secondary to-secondary/50 border-border glow-hover card-hover group hover:border-honey/50 transition-all duration-500 hover:-translate-y-2">
            <CardContent className="p-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-honey/10 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <HexagonIcon className="relative w-16 h-16 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-graduation-cap text-honey text-2xl"></i>
                </HexagonIcon>
              </div>
              <h3 className="text-2xl font-semibold text-honey mb-4 group-hover:text-yellow-400 transition-colors duration-300">
                {t('landing.features.education.title')}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t('landing.features.education.description')}
              </p>
              <div className="mt-4 text-sm text-honey/70">Premium Courses</div>
            </CardContent>
          </Card>

          {/* NFT Marketplace */}
          <Card className="bg-gradient-to-br from-secondary to-secondary/50 border-border glow-hover card-hover group hover:border-honey/50 transition-all duration-500 hover:-translate-y-2">
            <CardContent className="p-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-honey/10 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <HexagonIcon className="relative w-16 h-16 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-gem text-honey text-2xl"></i>
                </HexagonIcon>
              </div>
              <h3 className="text-2xl font-semibold text-honey mb-4 group-hover:text-yellow-400 transition-colors duration-300">
                {t('landing.features.marketplace.title')}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t('landing.features.marketplace.description')}
              </p>
              <div className="mt-4 text-sm text-honey/70">Exclusive Collections</div>
            </CardContent>
          </Card>

          {/* BCC Tokens */}
          <Card className="bg-gradient-to-br from-secondary to-secondary/50 border-border glow-hover card-hover group hover:border-honey/50 transition-all duration-500 hover:-translate-y-2">
            <CardContent className="p-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-honey/10 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <HexagonIcon className="relative w-16 h-16 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-coins text-honey text-2xl"></i>
                </HexagonIcon>
              </div>
              <h3 className="text-2xl font-semibold text-honey mb-4 group-hover:text-yellow-400 transition-colors duration-300">
                {t('landing.features.tokens.title')}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t('landing.features.tokens.description')}
              </p>
              <div className="mt-4 text-sm text-honey/70">Dual Token System</div>
            </CardContent>
          </Card>

          {/* Rewards */}
          <Card className="bg-gradient-to-br from-secondary to-secondary/50 border-border glow-hover card-hover group hover:border-honey/50 transition-all duration-500 hover:-translate-y-2">
            <CardContent className="p-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-honey/10 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <HexagonIcon className="relative w-16 h-16 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-gift text-honey text-2xl"></i>
                </HexagonIcon>
              </div>
              <h3 className="text-2xl font-semibold text-honey mb-4 group-hover:text-yellow-400 transition-colors duration-300">
                {t('landing.features.rewards.title')}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t('landing.features.rewards.description')}
              </p>
              <div className="mt-4 text-sm text-honey/70">48hr Countdown</div>
            </CardContent>
          </Card>
          </div>
        </div>

        {/* How It Works */}
        <div className="text-center mb-24">
          <div className="mb-16">
            <h2 className="text-4xl font-bold text-honey mb-6">
              {t('landing.howItWorks.title')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get started in just three simple steps and unlock the power of Web3 membership
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connection lines */}
            <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-honey/50 via-honey to-honey/50"></div>
            
            <div className="text-center relative">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-honey/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-honey to-yellow-400 text-black rounded-full flex items-center justify-center text-3xl font-bold mx-auto shadow-2xl">
                  1
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-honey mb-4">
                {t('landing.howItWorks.step1.title')}
              </h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {t('landing.howItWorks.step1.description')}
              </p>
            </div>
            
            <div className="text-center relative">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-honey/20 rounded-full blur-xl animate-pulse delay-300"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-honey to-yellow-400 text-black rounded-full flex items-center justify-center text-3xl font-bold mx-auto shadow-2xl">
                  2
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-honey mb-4">
                {t('landing.howItWorks.step2.title')}
              </h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {t('landing.howItWorks.step2.description')}
              </p>
            </div>
            
            <div className="text-center relative">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-honey/20 rounded-full blur-xl animate-pulse delay-700"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-honey to-yellow-400 text-black rounded-full flex items-center justify-center text-3xl font-bold mx-auto shadow-2xl">
                  3
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-honey mb-4">
                {t('landing.howItWorks.step3.title')}
              </h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {t('landing.howItWorks.step3.description')}
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center relative">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-honey/5 via-honey/10 to-honey/5 rounded-3xl blur-3xl"></div>
          
          <Card className="relative bg-gradient-to-br from-secondary via-secondary/80 to-secondary/60 border-honey/30 max-w-4xl mx-auto backdrop-blur-sm shadow-2xl">
            <CardContent className="p-12">
              <div className="mb-8">
                <h2 className="text-4xl font-bold bg-gradient-to-r from-honey via-yellow-400 to-honey bg-clip-text text-transparent mb-6">
                  {t('landing.cta.title')}
                </h2>
                <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                  {t('landing.cta.description')}
                </p>
              </div>
              
              {/* Enhanced stats */}
              <div className="grid grid-cols-3 gap-8 mb-12">
                <div className="text-center">
                  <div className="text-3xl font-bold text-honey mb-2">19</div>
                  <div className="text-sm text-muted-foreground">Membership Levels</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-honey mb-2">3×3</div>
                  <div className="text-sm text-muted-foreground">Matrix System</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-honey mb-2">∞</div>
                  <div className="text-sm text-muted-foreground">Earning Potential</div>
                </div>
              </div>
              
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-r from-honey to-yellow-400 rounded-full blur-2xl opacity-40 animate-pulse"></div>
                <ConnectButton
                  client={client}
                  chains={supportedChains}
                  wallets={wallets}
                  theme="dark"
                  auth={authConfig}
                  connectModal={{ 
                    showThirdwebBranding: false, 
                    size: "wide",
                    title: "Connect to Beehive",
                    titleIcon: "🐝",
                  }}
                  connectButton={{
                    label: `⚡ ${t('landing.cta.button')}`,
                    className: "relative btn-honey text-xl px-16 py-6 font-bold transform hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-honey/30"
                  }}
                  detailsButton={{
                    className: "relative btn-honey text-xl px-16 py-6 font-bold transform hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-honey/30"
                  }}
                  data-testid="button-cta-start"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

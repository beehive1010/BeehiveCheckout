import { ConnectButton } from 'thirdweb/react';
import { client, supportedChains, wallets, authConfig } from '../lib/web3';
import HexagonIcon from './UI/HexagonIcon';
import { StatsBar } from './StatsBar';
import styles from '../features/landing/styles/landing.module.css';

interface HeroSectionProps {
  title: string;
  subtitle: string;
  getStartedText: string;
}

export function HeroSection({ title, subtitle, getStartedText }: HeroSectionProps) {
  return (
    <div className={styles.heroSection}>
      <div className="mb-12 relative">
        {/* Animated background glow */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 bg-honey/20 rounded-full blur-3xl animate-pulse"></div>
        </div>
        
        {/* Main icon with floating animation */}
        <div className={styles.heroIcon}>
          <HexagonIcon className="w-32 h-32 mx-auto mb-8 drop-shadow-2xl" size="xl">
            <i className="fas fa-layer-group text-honey text-4xl drop-shadow-lg"></i>
          </HexagonIcon>
        </div>
        
        {/* Animated title with gradient */}
        <h1 className={styles.heroTitle}>
          {title}
        </h1>
        
        {/* Enhanced subtitle */}
        <p className={styles.heroSubtitle}>
          {subtitle}
        </p>

        <StatsBar />
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
            label: `🚀 ${getStartedText}`,
            className: "relative btn-honey text-xl px-12 py-5 font-semibold transform hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-honey/25"
          }}
          detailsButton={{
            className: "relative btn-honey text-xl px-12 py-5 font-semibold transform hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-honey/25"
          }}
          data-testid="button-get-started"
        />
      </div>
    </div>
  );
}
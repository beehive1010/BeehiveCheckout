import { StatsBar } from './StatsBar';
import styles from '../../styles/landing/landing.module.css';

interface HeroSectionProps {
  title: string;
  subtitle: string;
  getStartedText: string;
}

export function HeroSection({ title, subtitle, getStartedText }: HeroSectionProps) {
  return (
    <div className={`${styles.heroSection} relative min-h-screen flex items-center justify-center`}>
      {/* Hero Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10"
        style={{ backgroundImage: 'url(/image/hero-background.png)' }}
      ></div>
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black/80"></div>
      
      <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
        {/* Logo Section */}
        <div className="mb-8 relative">
          {/* Animated background glow behind logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 bg-honey/20 rounded-full blur-3xl animate-pulse"></div>
          </div>
          
          {/* Main Logo */}
          <div className="relative">
            <img 
              src="/image/BCC.png" 
              alt="BCC Logo" 
              className="w-32 h-32 mx-auto mb-6 drop-shadow-2xl animate-bounce-slow object-contain"
            />
          </div>
        </div>
        
        {/* Title Section */}
        <div className="mb-12">
          {/* Animated title with gradient */}
          <h1 className={`${styles.heroTitle} text-5xl md:text-7xl font-bold mb-6`}>
            <span className="bg-gradient-to-r from-honey via-yellow-400 to-amber-300 bg-clip-text text-transparent drop-shadow-lg">
              {title}
            </span>
          </h1>
          
          {/* Enhanced subtitle */}
          <p className={`${styles.heroSubtitle} text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed`}>
            {subtitle}
          </p>
        </div>

        {/* Stats Bar */}
        <div className="mb-12">
          <StatsBar />
        </div>

        {/* Enhanced CTA Button */}
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-gradient-to-r from-honey to-yellow-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
          <button
            className="relative btn-honey text-xl px-12 py-5 font-semibold transform hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-honey/25 border-2 border-honey/30 backdrop-blur-sm"
            onClick={() => {
              // Scroll to features or show more content
              document.querySelector('.features-section')?.scrollIntoView({ 
                behavior: 'smooth' 
              });
            }}
            data-testid="button-get-started"
          >
            🚀 {getStartedText}
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="p-6 bg-black/20 backdrop-blur-sm rounded-xl border border-honey/20">
            <div className="text-honey text-3xl mb-3">🔗</div>
            <h3 className="text-honey font-semibold mb-2">Smart Contracts</h3>
            <p className="text-gray-400 text-sm">100% automated blockchain execution</p>
          </div>
          <div className="p-6 bg-black/20 backdrop-blur-sm rounded-xl border border-honey/20">
            <div className="text-honey text-3xl mb-3">💎</div>
            <h3 className="text-honey font-semibold mb-2">NFT Marketplace</h3>
            <p className="text-gray-400 text-sm">Trade exclusive Beehive NFTs</p>
          </div>
          <div className="p-6 bg-black/20 backdrop-blur-sm rounded-xl border border-honey/20">
            <div className="text-honey text-3xl mb-3">🎯</div>
            <h3 className="text-honey font-semibold mb-2">Matrix Rewards</h3>
            <p className="text-gray-400 text-sm">Exponential wealth growth system</p>
          </div>
        </div>
      </div>
    </div>
  );
}
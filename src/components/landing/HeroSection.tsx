import { useState, useEffect } from 'react';
import { StatsBar } from './StatsBar';
import styles from '../../styles/landing/landing.module.css';

interface HeroSectionProps {
  title: string;
  subtitle: string;
  getStartedText: string;
}

export function HeroSection({ title, subtitle, getStartedText }: HeroSectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div id="hero" className={`${styles.heroSection} relative min-h-screen flex items-center justify-center overflow-hidden`}>
      {/* Dynamic Particle Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-slate-900/90 to-black"></div>
        <div className="absolute inset-0">
          {/* Floating Particles */}
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-2 h-2 bg-honey/20 rounded-full animate-pulse opacity-60`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>
      </div>
      
      
      <div className={`relative z-10 text-center max-w-6xl mx-auto px-4 transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
        {/* Enhanced Logo Section */}
        <div className="mb-12 relative group">
          {/* Multi-layer Glow Effects */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 bg-honey/30 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute w-32 h-32 bg-yellow-400/20 rounded-full blur-2xl animate-ping"></div>
            <div className="absolute w-64 h-64 bg-amber-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>
          
          {/* Hexagon Frame */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-honey/30 rounded-full opacity-40 animate-spin" style={{ animationDuration: '20s' }}></div>
              <div className="absolute w-40 h-40 border border-honey/20 rounded-full opacity-60 animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }}></div>
            </div>
            
            {/* Logo with enhanced effects */}
            <div className="relative transform transition-all duration-500 group-hover:scale-110">
              <img 
                src="/image/BCC.png" 
                alt="BCC Logo" 
                className="w-40 h-40 mx-auto mb-6 drop-shadow-2xl animate-bounce-slow object-contain filter brightness-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-honey/20 to-transparent rounded-full mix-blend-overlay"></div>
            </div>
          </div>
        </div>
        
        {/* Dynamic Title Section */}
        <div className="mb-16">
          {/* Animated title with enhanced gradient */}
          <h1 className={`${styles.heroTitle} text-4xl md:text-6xl lg:text-7xl font-black mb-8 tracking-tight`}>
            <span className="relative inline-block">
              <span className="absolute inset-0 bg-gradient-to-r from-honey via-yellow-300 to-amber-400 bg-clip-text text-transparent blur-sm opacity-50 scale-105"></span>
              <span className="relative bg-gradient-to-r from-honey via-yellow-300 to-amber-400 bg-clip-text text-transparent animate-pulse">
                {title}
              </span>
            </span>
          </h1>
          
          {/* Animated subtitle with typewriter effect */}
          <div className="relative">
            <p className={`${styles.heroSubtitle} text-lg md:text-2xl lg:text-3xl text-gray-200 max-w-4xl mx-auto leading-relaxed font-light`}>
              <span className="inline-block animate-pulse">{subtitle}</span>
            </p>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-honey to-transparent rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mb-12">
          <StatsBar />
        </div>

        {/* Revolutionary CTA Button */}
        <div className="relative inline-block group mb-16">
          {/* Multi-layer Button Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-honey via-yellow-400 to-amber-400 rounded-full blur-2xl opacity-40 animate-pulse group-hover:opacity-60 group-active:opacity-80 transition-opacity duration-300"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-honey to-yellow-400 rounded-full blur-xl opacity-30 animate-ping"></div>
          
          <button
            className="relative bg-gradient-to-r from-honey via-yellow-400 to-amber-400 text-black 
                     text-base sm:text-lg md:text-xl 
                     px-12 py-5 sm:px-16 sm:py-6 md:px-20 md:py-7 
                     font-bold rounded-full 
                     transform hover:scale-110 active:scale-95 
                     transition-all duration-500 ease-out
                     shadow-2xl hover:shadow-honey/40 active:shadow-honey/60
                     border-2 border-yellow-300/50 backdrop-blur-sm 
                     group overflow-hidden
                     min-h-[60px] sm:min-h-[70px] md:min-h-[80px]
                     touch-manipulation select-none"
            onClick={() => {
              document.querySelector('.features-section')?.scrollIntoView({ 
                behavior: 'smooth' 
              });
            }}
            data-testid="button-get-started"
          >
            {/* Enhanced Button ripple effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full group-active:translate-x-full transition-transform duration-700 ease-out"></div>
            
            {/* Mobile tap ripple effect */}
            <div className="absolute inset-0 bg-white/20 rounded-full scale-0 group-active:scale-100 transition-transform duration-200 ease-out"></div>
            
            <span className="relative flex items-center justify-center gap-2 sm:gap-3">
              <span className="text-xl sm:text-2xl animate-bounce">🚀</span>
              <span className="tracking-wide font-extrabold">{getStartedText}</span>
              <span className="text-base sm:text-lg animate-pulse">⚡</span>
            </span>
          </button>
        </div>

        {/* Enhanced Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-5xl mx-auto">
          {[
            { icon: '🔗', title: 'Smart Contracts', desc: '100% automated blockchain execution', gradient: 'from-blue-400 to-cyan-400' },
            { icon: '💎', title: 'NFT Marketplace', desc: 'Trade exclusive Beehive NFTs', gradient: 'from-purple-400 to-pink-400' },
            { icon: '🎯', title: 'Matrix Rewards', desc: 'Exponential wealth growth system', gradient: 'from-green-400 to-emerald-400' }
          ].map((feature, index) => (
            <div key={index} className="group relative">
              {/* Card Background with Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl backdrop-blur-xl border border-white/20 transform group-hover:scale-105 transition-all duration-500"></div>
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-500`}></div>
              
              <div className="relative p-8">
                {/* Animated Icon */}
                <div className="relative mb-6">
                  <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} rounded-full blur-xl opacity-20 animate-pulse`}></div>
                  <div className="relative text-5xl mb-4 transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                    {feature.icon}
                  </div>
                </div>
                
                {/* Feature Content */}
                <h3 className="text-honey font-bold text-xl mb-3 group-hover:text-yellow-300 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed group-hover:text-gray-200 transition-colors duration-300">
                  {feature.desc}
                </p>
                
                {/* Hover Line Effect */}
                <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-1 bg-gradient-to-r ${feature.gradient} group-hover:w-20 transition-all duration-500 rounded-full`}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
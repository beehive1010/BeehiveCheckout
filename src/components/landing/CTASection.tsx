import { useState, useEffect } from 'react';
import { ConnectButton } from 'thirdweb/react';
import { Card, CardContent } from '../ui/card';
import { client, supportedChains, wallets } from '../../lib/web3';
import { useI18n } from '../../contexts/I18nContext';
import styles from '../../styles/landing/landing.module.css';

export function CTASection() {
  const { t } = useI18n();
  const [isVisible, setIsVisible] = useState(false);
  const [animatedStats, setAnimatedStats] = useState([0, 0, 0]);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isVisible) {
      const targets = [19, 33, 100];
      const increment = (index: number, target: number) => {
        let current = 0;
        const step = target / 50;
        const timer = setInterval(() => {
          current += step;
          if (current >= target) {
            current = target;
            clearInterval(timer);
          }
          setAnimatedStats(prev => {
            const newStats = [...prev];
            newStats[index] = Math.floor(current);
            return newStats;
          });
        }, 30);
      };
      
      setTimeout(() => increment(0, 19), 200);
      setTimeout(() => increment(1, 33), 400);
      setTimeout(() => increment(2, 100), 600);
    }
  }, [isVisible]);

  return (
    <div className={`relative mb-32 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      {/* Spectacular Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-honey/10 via-yellow-400/5 to-amber-400/10 rounded-3xl blur-3xl animate-pulse"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-honey/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-yellow-400/15 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        {/* Floating Particles */}
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 bg-honey/30 rounded-full animate-pulse opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>
      
      {/* Revolutionary CTA Card */}
      <Card className="relative max-w-6xl mx-auto bg-gradient-to-br from-slate-900/90 via-black/80 to-slate-900/90 backdrop-blur-2xl border border-white/20 overflow-hidden">
        {/* Card Border Glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-honey via-yellow-400 to-amber-400 rounded-3xl blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 to-black/95 rounded-3xl"></div>
        
        {/* Geometric Pattern Overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 20% 20%, rgba(255,193,7,0.3) 0%, transparent 20%), radial-gradient(circle at 80% 80%, rgba(255,193,7,0.2) 0%, transparent 20%), radial-gradient(circle at 40% 60%, rgba(255,193,7,0.1) 0%, transparent 20%)`
          }}></div>
        </div>
        
        <CardContent className="relative p-16">
          {/* Enhanced Header Section */}
          <div className="text-center mb-16">
            <div className="relative mb-8">
              <h2 className="text-6xl md:text-7xl font-black bg-gradient-to-r from-honey via-yellow-300 to-amber-400 bg-clip-text text-transparent mb-6 leading-tight">
                {t('landing.cta.title')}
              </h2>
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-40 h-1 bg-gradient-to-r from-transparent via-honey to-transparent rounded-full animate-pulse"></div>
            </div>
            <p className="text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed font-light">
              {t('landing.cta.description')}
            </p>
          </div>
          
          {/* Dynamic Animated Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
            {[
              { value: animatedStats[0], suffix: '', label: t('landing.ctaStats.membershipLevels'), gradient: 'from-blue-400 to-cyan-500', icon: '🏆' },
              { value: animatedStats[1], suffix: '', label: t('landing.ctaStats.matrixSystem'), gradient: 'from-purple-400 to-pink-500', icon: '🕸️' },
              { value: animatedStats[2], suffix: '%', label: t('landing.ctaStats.earningPotential'), gradient: 'from-green-400 to-emerald-500', icon: '🚀' }
            ].map((stat, index) => (
              <div key={index} className="text-center group">
                {/* Stat Background Glow */}
                <div className={`absolute -inset-4 bg-gradient-to-r ${stat.gradient} rounded-3xl blur-2xl opacity-0 group-hover:opacity-20 transition-all duration-500`}></div>
                
                <div className="relative bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/10 transform group-hover:scale-105 transition-all duration-500">
                  {/* Stat Icon */}
                  <div className="text-4xl mb-4 transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                    {stat.icon}
                  </div>
                  
                  {/* Animated Stat Value */}
                  <div className={`text-5xl font-black bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mb-3 transform group-hover:scale-110 transition-all duration-300`}>
                    {index === 1 ? '3×3' : index === 2 && stat.value === 100 ? '∞' : stat.value}{stat.suffix}
                  </div>
                  
                  {/* Stat Label */}
                  <div className="text-gray-400 font-medium group-hover:text-gray-300 transition-colors duration-300">
                    {stat.label}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4 w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${stat.gradient} transition-all duration-1000 ease-out rounded-full`}
                      style={{ width: index === 2 && stat.value >= 100 ? '100%' : `${(stat.value / (index === 0 ? 19 : index === 1 ? 33 : 100)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Ultra-Enhanced CTA Button */}
          <div className="text-center">
            <div className="relative inline-block group">
              {/* Multi-layer Button Glow */}
              <div className="absolute -inset-4 bg-gradient-to-r from-honey via-yellow-400 to-amber-400 rounded-full blur-3xl opacity-40 group-hover:opacity-60 animate-pulse transition-all duration-500"></div>
              <div className="absolute -inset-2 bg-gradient-to-r from-honey via-yellow-400 to-amber-400 rounded-full blur-2xl opacity-30 group-hover:opacity-50 animate-ping transition-all duration-300"></div>
              <div className="absolute -inset-1 bg-gradient-to-r from-honey to-yellow-400 rounded-full opacity-20 group-hover:opacity-40 transition-all duration-300"></div>
              
              <ConnectButton
                client={client}
                chains={supportedChains}
                wallets={wallets}
                theme="dark"
                connectModal={{ 
                  showThirdwebBranding: false, 
                  size: "wide",
                  title: "Connect to Beehive",
                  titleIcon: "🐝",
                }}
                connectButton={{
                  label: `⚡ ${t('landing.cta.button')}`,
                  className: "relative bg-gradient-to-r from-honey via-yellow-400 to-amber-400 text-black text-2xl md:text-3xl px-20 py-8 font-black rounded-full transform hover:scale-110 transition-all duration-500 shadow-2xl hover:shadow-honey/50 border-2 border-yellow-300/50 backdrop-blur-sm group overflow-hidden"
                }}
                detailsButton={{
                  className: "relative bg-gradient-to-r from-honey via-yellow-400 to-amber-400 text-black text-2xl md:text-3xl px-20 py-8 font-black rounded-full transform hover:scale-110 transition-all duration-500 shadow-2xl hover:shadow-honey/50 border-2 border-yellow-300/50 backdrop-blur-sm group overflow-hidden"
                }}
                data-testid="button-cta-start"
              />
              
              {/* Button Ripple Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 rounded-full pointer-events-none"></div>
            </div>
            
            {/* Subtitle */}
            <p className="text-gray-400 mt-8 text-lg font-light">
              🎆 Join thousands of members earning passive income
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
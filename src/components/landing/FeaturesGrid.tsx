import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import HexagonIcon from '../shared/HexagonIcon';
import { useI18n } from '../../contexts/I18nContext';
import { useIsMobile } from '../../hooks/use-mobile';
import { useIsDesktop } from '../../hooks/use-desktop';
import styles from '../../styles/landing/landing.module.css';

export function FeaturesGrid() {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const features = [
    {
      icon: "🛡️",
      title: t('landing.features.membership.title'),
      description: t('landing.features.membership.description'),
      extra: t('landing.platformFeatures.exclusiveLevels'),
      gradient: 'from-blue-500 via-purple-500 to-indigo-600',
      bgGradient: 'from-blue-500/10 to-purple-500/10',
      glowColor: 'shadow-blue-500/25'
    },
    {
      icon: "🕸️",
      title: t('landing.features.referral.title'),
      description: t('landing.features.referral.description'),
      extra: t('landing.platformFeatures.autoPlacement'),
      gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
      bgGradient: 'from-emerald-500/10 to-teal-500/10',
      glowColor: 'shadow-emerald-500/25'
    },
    {
      icon: "🎓",
      title: t('landing.features.education.title'),
      description: t('landing.features.education.description'),
      extra: t('landing.platformFeatures.premiumCourses'),
      gradient: 'from-orange-500 via-red-500 to-pink-600',
      bgGradient: 'from-orange-500/10 to-red-500/10',
      glowColor: 'shadow-orange-500/25'
    },
    {
      icon: "💎",
      title: t('landing.features.marketplace.title'),
      description: t('landing.features.marketplace.description'),
      extra: t('landing.platformFeatures.exclusiveCollections'),
      gradient: 'from-violet-500 via-purple-500 to-fuchsia-600',
      bgGradient: 'from-violet-500/10 to-purple-500/10',
      glowColor: 'shadow-violet-500/25'
    },
    {
      icon: "🪙",
      title: t('landing.features.tokens.title'),
      description: t('landing.features.tokens.description'),
      extra: t('landing.platformFeatures.dualTokenSystem'),
      gradient: 'from-yellow-500 via-orange-500 to-red-600',
      bgGradient: 'from-yellow-500/10 to-orange-500/10',
      glowColor: 'shadow-yellow-500/25'
    },
    {
      icon: "🎁",
      title: t('landing.features.rewards.title'),
      description: t('landing.features.rewards.description'),
      extra: t('landing.platformFeatures.countdown'),
      gradient: 'from-pink-500 via-rose-500 to-red-600',
      bgGradient: 'from-pink-500/10 to-rose-500/10',
      glowColor: 'shadow-pink-500/25'
    }
  ];

  return (
    <div id="features" className="features-section mb-32 relative">
      {/* Section Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-honey/5 to-transparent blur-3xl"></div>
      
      <div className="relative z-10">
        {/* Enhanced Section Header */}
        <div className="text-center mb-20">
          <div className="relative inline-block mb-8">
            <h2 className={`${isMobile ? 'text-3xl' : isDesktop ? 'text-5xl' : 'text-4xl'} font-black bg-gradient-to-r from-honey via-yellow-300 to-amber-400 bg-clip-text text-transparent mb-6`}>
              {t('landing.platformFeatures.title')}
            </h2>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-honey to-transparent rounded-full animate-pulse"></div>
          </div>
          <p className={`${isMobile ? 'text-base' : isDesktop ? 'text-xl' : 'text-lg'} text-gray-300 max-w-3xl mx-auto leading-relaxed font-light`}>
            {t('landing.platformFeatures.subtitle')}
          </p>
        </div>
        
        {/* Revolutionary Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative cursor-pointer"
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
              data-testid={`feature-card-${index}`}
            >
              {/* Dynamic Background Glow */}
              <div className={`absolute -inset-1 bg-gradient-to-r ${feature.gradient} rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-all duration-700`}></div>
              <div className={`absolute -inset-0.5 bg-gradient-to-r ${feature.gradient} rounded-3xl opacity-0 group-hover:opacity-50 transition-all duration-500`}></div>
              
              {/* Main Card */}
              <Card className={`relative bg-gradient-to-br from-black/80 via-slate-900/80 to-black/80 backdrop-blur-xl border-0 transform transition-all duration-500 group-hover:scale-105 group-hover:${feature.glowColor} overflow-hidden`}>
                {/* Card Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,193,7,0.1) 0%, transparent 25%), radial-gradient(circle at 75% 75%, rgba(255,193,7,0.05) 0%, transparent 25%)`
                  }}></div>
                </div>
                
                {/* Animated Border */}
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-3xl`}></div>
                <div className="absolute inset-[1px] bg-gradient-to-br from-slate-900/90 to-black/90 rounded-3xl"></div>
                
                <CardContent className={`relative ${isMobile ? 'p-6' : 'p-8'} h-full flex flex-col`}>
                  {/* Enhanced Icon Section */}
                  <div className="relative mb-8 flex justify-center">
                    {/* Icon Glow Effects */}
                    <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 scale-150`}></div>
                    <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} rounded-full blur-xl opacity-10 animate-pulse scale-125`}></div>

                    {/* Rotating Ring */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`w-20 h-20 border-2 border-transparent bg-gradient-to-r ${feature.gradient} rounded-full opacity-30 animate-spin`} style={{ animationDuration: `${10 + index * 2}s` }}></div>
                    </div>

                    {/* Icon Container */}
                    <div className="relative">
                      <div className={`${isMobile ? 'w-14 h-14' : 'w-16 h-16'} bg-gradient-to-br ${feature.bgGradient} rounded-2xl flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 border border-white/10`}>
                        <span className={`${isMobile ? 'text-3xl' : 'text-4xl'} filter drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                          {feature.icon}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="flex-1 text-center">
                    <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold mb-4 bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300`}>
                      {feature.title}
                    </h3>
                    <p className={`text-gray-300 ${isMobile ? 'text-sm' : 'text-base'} leading-relaxed mb-6 group-hover:text-gray-200 transition-colors duration-300`}>
                      {feature.description}
                    </p>

                    {/* Feature Badge */}
                    <div className={`inline-block ${isMobile ? 'px-3 py-1.5' : 'px-4 py-2'} bg-gradient-to-r ${feature.bgGradient} rounded-full border border-white/10 transition-all duration-300 group-hover:scale-105`}>
                      <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-white/80 group-hover:text-white transition-colors duration-300`}>
                        {feature.extra}
                      </span>
                    </div>
                  </div>
                  
                  {/* Hover Line Effect */}
                  <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-1 bg-gradient-to-r ${feature.gradient} group-hover:w-full transition-all duration-500 rounded-full`}></div>
                </CardContent>
              </Card>
              
              {/* Floating Particles */}
              {hoveredCard === index && (
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className={`absolute w-1 h-1 bg-gradient-to-r ${feature.gradient} rounded-full animate-ping`}
                      style={{
                        left: `${20 + Math.random() * 60}%`,
                        top: `${20 + Math.random() * 60}%`,
                        animationDelay: `${Math.random() * 2}s`,
                        animationDuration: `${1 + Math.random()}s`
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
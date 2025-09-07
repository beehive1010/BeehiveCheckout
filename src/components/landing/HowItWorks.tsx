import { useState, useEffect } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import styles from '../../styles/landing/landing.module.css';

export function HowItWorks() {
  const { t } = useI18n();
  const [activeStep, setActiveStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const steps = [
    {
      number: 1,
      title: t('landing.howItWorks.step1.title'),
      description: t('landing.howItWorks.step1.description'),
      icon: '🔗',
      gradient: 'from-emerald-400 via-teal-500 to-cyan-600',
      bgGradient: 'from-emerald-500/20 to-teal-500/20'
    },
    {
      number: 2,
      title: t('landing.howItWorks.step2.title'),
      description: t('landing.howItWorks.step2.description'),
      icon: '🎯',
      gradient: 'from-purple-400 via-violet-500 to-indigo-600',
      bgGradient: 'from-purple-500/20 to-violet-500/20'
    },
    {
      number: 3,
      title: t('landing.howItWorks.step3.title'),
      description: t('landing.howItWorks.step3.description'),
      icon: '🚀',
      gradient: 'from-orange-400 via-red-500 to-pink-600',
      bgGradient: 'from-orange-500/20 to-red-500/20'
    }
  ];

  return (
    <div id="how-it-works" className={`text-center mb-32 relative transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      {/* Section Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent rounded-3xl blur-3xl"></div>
      
      <div className="relative z-10">
        {/* Enhanced Section Header */}
        <div className="mb-20">
          <div className="relative inline-block mb-8">
            <h2 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-honey via-yellow-300 to-amber-400 bg-clip-text text-transparent mb-6">
              {t('landing.howItWorks.title')}
            </h2>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-honey to-transparent rounded-full animate-pulse"></div>
          </div>
          <p className="text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed font-light">
            {t('landing.howItWorks.subtitle')}
          </p>
        </div>
        
        {/* Revolutionary Steps Grid */}
        <div className="relative max-w-6xl mx-auto">
          {/* Dynamic Connection Lines */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-px">
            <div className="relative h-full">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-honey to-transparent opacity-30"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-honey to-transparent animate-pulse"></div>
              {/* Animated Progress Line */}
              <div 
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-honey to-yellow-400 transition-all duration-1000 ease-in-out"
                style={{ width: `${((activeStep + 1) / 3) * 100}%` }}
              ></div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 lg:gap-8">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={`relative group transition-all duration-700 transform ${
                  activeStep === index ? 'scale-105' : 'scale-100'
                }`}
                data-testid={`how-it-works-step-${index + 1}`}
              >
                {/* Step Background Glow */}
                <div className={`absolute -inset-4 bg-gradient-to-r ${step.gradient} rounded-3xl blur-2xl opacity-0 group-hover:opacity-20 transition-all duration-700 ${activeStep === index ? 'opacity-30' : ''}`}></div>
                
                {/* Step Container */}
                <div className="relative bg-gradient-to-br from-slate-900/80 via-black/60 to-slate-900/80 backdrop-blur-xl rounded-3xl border border-white/10 p-8 h-full transform transition-all duration-500 group-hover:border-white/20">
                  {/* Step Number Section */}
                  <div className="relative mb-8 flex flex-col items-center">
                    {/* Multi-layer Number Glow */}
                    <div className={`absolute inset-0 bg-gradient-to-r ${step.gradient} rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 scale-150 ${activeStep === index ? 'opacity-50 animate-pulse' : ''}`}></div>
                    <div className={`absolute inset-0 bg-gradient-to-r ${step.gradient} rounded-full blur-xl opacity-10 animate-pulse scale-125`}></div>
                    
                    {/* Rotating Rings */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`w-24 h-24 border-2 border-transparent bg-gradient-to-r ${step.gradient} rounded-full opacity-30 ${activeStep === index ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }}></div>
                      <div className={`absolute w-20 h-20 border border-white/20 rounded-full ${activeStep === index ? 'animate-spin' : ''}`} style={{ animationDuration: '6s', animationDirection: 'reverse' }}></div>
                    </div>
                    
                    {/* Step Number Circle */}
                    <div className={`relative w-16 h-16 bg-gradient-to-br ${step.bgGradient} rounded-2xl flex items-center justify-center border border-white/20 transform group-hover:scale-110 transition-all duration-500 ${activeStep === index ? 'scale-110 shadow-2xl' : ''}`}>
                      <span className="text-3xl font-black text-white drop-shadow-lg">
                        {step.number}
                      </span>
                    </div>
                    
                    {/* Step Icon */}
                    <div className={`mt-4 text-4xl transform transition-all duration-500 ${activeStep === index ? 'scale-125 animate-bounce' : ''}`}>
                      {step.icon}
                    </div>
                  </div>
                  
                  {/* Step Content */}
                  <div className="text-center">
                    <h3 className={`text-2xl font-bold mb-4 bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent transition-all duration-300 ${activeStep === index ? 'scale-105' : ''}`}>
                      {step.title}
                    </h3>
                    <p className={`text-gray-300 leading-relaxed transition-all duration-300 ${activeStep === index ? 'text-gray-200' : ''}`}>
                      {step.description}
                    </p>
                  </div>
                  
                  {/* Active Step Indicator */}
                  {activeStep === index && (
                    <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full h-1 bg-gradient-to-r ${step.gradient} transition-all duration-500 rounded-full`}></div>
                  )}
                </div>
                
                {/* Step Progress Indicator */}
                <div className="flex justify-center mt-6 lg:hidden">
                  <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    activeStep === index 
                      ? `bg-gradient-to-r ${step.gradient}` 
                      : 'bg-white/20'
                  }`}></div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Enhanced Mobile Progress Dots */}
          <div className="flex justify-center mt-12 lg:hidden gap-6">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveStep(index)}
                className={`relative w-6 h-6 rounded-full transition-all duration-300 ease-out 
                         touch-manipulation select-none
                         transform active:scale-90 hover:scale-110
                         ${
                  activeStep === index
                    ? 'bg-gradient-to-r from-honey to-yellow-400 scale-125 shadow-lg shadow-honey/40'
                    : 'bg-white/30 hover:bg-white/50 active:bg-white/60'
                }`}
                data-testid={`step-indicator-${index}`}
              >
                {/* Enhanced glow effect for active state */}
                {activeStep === index && (
                  <div className="absolute -inset-2 bg-honey/30 rounded-full blur-md animate-pulse"></div>
                )}
                
                {/* Ripple effect for touch */}
                <div className="absolute inset-0 bg-white/20 rounded-full scale-0 transition-transform duration-200 ease-out active:scale-150"></div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
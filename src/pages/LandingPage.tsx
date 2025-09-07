import { useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { BackgroundElements } from '../components/landing/BackgroundElements';
import { HeroSection } from '../components/landing/HeroSection';
import { FeaturesGrid } from '../components/landing/FeaturesGrid';
import { HowItWorks } from '../components/landing/HowItWorks';
import { CTASection } from '../components/landing/CTASection';
import { LandingFooter } from '../components/landing/LandingFooter';
import MatrixBottomNav from '../components/matrix/MatrixBottomNav';
import { referralService } from '../api/landing/referral.client';
import styles from '../styles/landing/landing.module.css';

export default function LandingPage() {
  const { t } = useI18n();

  // Handle referral parameters on page load
  useEffect(() => {
    referralService.handleReferralParameter();
  }, []);

  return (
    <div className={`${styles.landingContainer} honeycomb-pattern bg-honeycomb pb-20`}>
      <BackgroundElements />
      
      <div className="container mx-auto px-4 py-16 relative">
        <HeroSection 
          title={t('landing.hero.title')}
          subtitle={t('landing.hero.subtitle')}
          getStartedText={t('landing.getStarted')}
        />
        
        <FeaturesGrid />
        
        <HowItWorks />
        
        <CTASection />
      </div>
      
      <LandingFooter />
      
      {/* Fixed Bottom Navigation */}
      <MatrixBottomNav />
    </div>
  );
}
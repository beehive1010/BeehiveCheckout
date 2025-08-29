import { useEffect } from 'react';
import { useI18n } from '../../../contexts/I18nContext';
import { BackgroundElements } from '../../../components/BackgroundElements';
import { HeroSection } from '../../../components/HeroSection';
import { FeaturesGrid } from '../../../components/FeaturesGrid';
import { HowItWorks } from '../../../components/HowItWorks';
import { CTASection } from '../../../components/CTASection';
import { referralService } from '../services/referral.client';
import styles from '../styles/landing.module.css';

export default function LandingPage() {
  const { t } = useI18n();

  // Handle referral parameters on page load
  useEffect(() => {
    referralService.handleReferralParameter();
  }, []);

  return (
    <div className={`${styles.landingContainer} honeycomb-pattern bg-honeycomb`}>
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
    </div>
  );
}
import { useI18n } from '../contexts/I18nContext';
import styles from '../features/landing/styles/landing.module.css';

export function HowItWorks() {
  const { t } = useI18n();

  const steps = [
    {
      number: 1,
      title: t('landing.howItWorks.step1.title'),
      description: t('landing.howItWorks.step1.description')
    },
    {
      number: 2,
      title: t('landing.howItWorks.step2.title'),
      description: t('landing.howItWorks.step2.description')
    },
    {
      number: 3,
      title: t('landing.howItWorks.step3.title'),
      description: t('landing.howItWorks.step3.description')
    }
  ];

  return (
    <div className="text-center mb-24">
      <div className="mb-16">
        <h2 className="text-4xl font-bold text-honey mb-6">
          {t('landing.howItWorks.title')}
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {t('landing.howItWorks.subtitle')}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
        {/* Connection lines */}
        <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-honey/50 via-honey to-honey/50"></div>
        
        {steps.map((step, index) => (
          <div key={step.number} className={styles.stepContainer}>
            <div className={styles.stepNumber}>
              <div className="absolute inset-0 bg-honey/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: `${index * 300}ms` }}></div>
              <div className={styles.stepNumberCircle}>
                {step.number}
              </div>
            </div>
            <h3 className="text-2xl font-semibold text-honey mb-4">
              {step.title}
            </h3>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
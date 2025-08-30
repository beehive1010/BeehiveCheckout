import { Card, CardContent } from '../../../components/ui/card';
import HexagonIcon from '../shared/HexagonIcon';
import { useI18n } from '../../../contexts/I18nContext';
import styles from '../../styles/landing/landing.module.css';

export function FeaturesGrid() {
  const { t } = useI18n();

  const features = [
    {
      icon: "fas fa-shield-alt",
      title: t('landing.features.membership.title'),
      description: t('landing.features.membership.description'),
      extra: t('landing.platformFeatures.exclusiveLevels')
    },
    {
      icon: "fas fa-sitemap",
      title: t('landing.features.referral.title'),
      description: t('landing.features.referral.description'),
      extra: t('landing.platformFeatures.autoPlacement')
    },
    {
      icon: "fas fa-graduation-cap",
      title: t('landing.features.education.title'),
      description: t('landing.features.education.description'),
      extra: t('landing.platformFeatures.premiumCourses')
    },
    {
      icon: "fas fa-gem",
      title: t('landing.features.marketplace.title'),
      description: t('landing.features.marketplace.description'),
      extra: t('landing.platformFeatures.exclusiveCollections')
    },
    {
      icon: "fas fa-coins",
      title: t('landing.features.tokens.title'),
      description: t('landing.features.tokens.description'),
      extra: t('landing.platformFeatures.dualTokenSystem')
    },
    {
      icon: "fas fa-gift",
      title: t('landing.features.rewards.title'),
      description: t('landing.features.rewards.description'),
      extra: t('landing.platformFeatures.countdown')
    }
  ];

  return (
    <div className="mb-24">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold text-honey mb-4">{t('landing.platformFeatures.title')}</h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {t('landing.platformFeatures.subtitle')}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <Card key={index} className={`${styles.featureCard} group`}>
            <CardContent className="p-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-honey/10 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <HexagonIcon className={`${styles.featureIcon} relative w-16 h-16`}>
                  <i className={`${feature.icon} text-honey text-2xl`}></i>
                </HexagonIcon>
              </div>
              <h3 className={`${styles.featureTitle} text-2xl font-semibold mb-4`}>
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
              <div className="mt-4 text-sm text-honey/70">{feature.extra}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
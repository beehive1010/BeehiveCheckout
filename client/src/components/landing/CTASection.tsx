import { ConnectButton } from 'thirdweb/react';
import { Card, CardContent } from '../ui/card';
import { client, supportedChains, wallets } from '../../lib/web3';
import { useI18n } from '../../contexts/I18nContext';
import styles from '../../styles/landing/landing.module.css';

export function CTASection() {
  const { t } = useI18n();

  return (
    <div className={styles.ctaSection}>
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-honey/5 via-honey/10 to-honey/5 rounded-3xl blur-3xl"></div>
      
      <Card className={styles.ctaCard}>
        <CardContent className="p-12">
          <div className="mb-8">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-honey via-yellow-400 to-honey bg-clip-text text-transparent mb-6">
              {t('landing.cta.title')}
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              {t('landing.cta.description')}
            </p>
          </div>
          
          {/* Enhanced stats */}
          <div className={styles.ctaStats}>
            <div className="text-center">
              <div className={styles.ctaStatValue}>19</div>
              <div className={styles.ctaStatLabel}>{t('landing.ctaStats.membershipLevels')}</div>
            </div>
            <div className="text-center">
              <div className={styles.ctaStatValue}>3×3</div>
              <div className={styles.ctaStatLabel}>{t('landing.ctaStats.matrixSystem')}</div>
            </div>
            <div className="text-center">
              <div className={styles.ctaStatValue}>∞</div>
              <div className={styles.ctaStatLabel}>{t('landing.ctaStats.earningPotential')}</div>
            </div>
          </div>
          
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-honey to-yellow-400 rounded-full blur-2xl opacity-40 animate-pulse"></div>
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
                className: "relative btn-honey text-xl px-16 py-6 font-bold transform hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-honey/30"
              }}
              detailsButton={{
                className: "relative btn-honey text-xl px-16 py-6 font-bold transform hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-honey/30"
              }}
              data-testid="button-cta-start"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
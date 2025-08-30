import { useI18n } from '../../../contexts/I18nContext';
import styles from '../../styles/landing/landing.module.css';

export function StatsBar() {
  const { t } = useI18n();

  return (
    <div className={styles.statsBar}>
      <div className={styles.statItem}>
        <div className={`${styles.statDot} bg-green-500`}></div>
        <span className="text-muted-foreground">{t('landing.stats.membershipLevels')}</span>
      </div>
      <div className={styles.statItem}>
        <div className={`${styles.statDot} bg-blue-500`}></div>
        <span className="text-muted-foreground">{t('landing.stats.matrixSystem')}</span>
      </div>
      <div className={styles.statItem}>
        <div className={`${styles.statDot} bg-honey`}></div>
        <span className="text-muted-foreground">{t('landing.stats.nftMarketplace')}</span>
      </div>
    </div>
  );
}
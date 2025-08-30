import { Card, CardContent } from './ui/card';
import { TrendingUp, Users, Gift, Star, ArrowRight } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import styles from '../features/dashboard/styles/dashboard.module.css';

export function QuickActionsGrid() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();

  const actions = [
    {
      icon: <TrendingUp className="h-5 w-5 text-honey" />,
      iconBg: 'bg-honey/10',
      title: t('dashboard.actions.upgradeLevel'),
      description: t('dashboard.actions.upgradeDescription'),
      onClick: () => setLocation('/tasks')
    },
    {
      icon: <Users className="h-5 w-5 text-blue-400" />,
      iconBg: 'bg-blue-400/10',
      title: t('dashboard.actions.viewReferrals'),
      description: t('dashboard.actions.referralsDescription'),
      onClick: () => setLocation('/referrals')
    },
    {
      icon: <Gift className="h-5 w-5 text-green-400" />,
      iconBg: 'bg-green-400/10',
      title: t('dashboard.actions.claimNFT'),
      description: t('dashboard.actions.nftDescription'),
      onClick: () => setLocation('/tasks')
    },
    {
      icon: <Star className="h-5 w-5 text-purple-400" />,
      iconBg: 'bg-purple-400/10',
      title: t('dashboard.actions.learnEarn'),
      description: t('dashboard.actions.educationDescription'),
      onClick: () => setLocation('/education')
    }
  ];

  return (
    <div className={styles.actionsGrid}>
      {actions.map((action, index) => (
        <Card 
          key={index} 
          className={styles.actionCard}
          onClick={action.onClick}
        >
          <CardContent className={styles.actionContent}>
            <div className={`${styles.actionIcon} ${action.iconBg}`}>
              {action.icon}
            </div>
            <div className={styles.actionText}>
              <h4 className={styles.actionTitle}>{action.title}</h4>
              <p className={styles.actionDescription}>{action.description}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
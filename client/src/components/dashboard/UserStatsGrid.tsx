import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Users, Building2, DollarSign } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import styles from '../features/dashboard/styles/dashboard.module.css';

interface UserStatsGridProps {
  userStats: any;
  isLoadingUserStats: boolean;
  bccBalance: any;
}

export function UserStatsGrid({ userStats, isLoadingUserStats, bccBalance }: UserStatsGridProps) {
  const { t } = useI18n();

  const stats = [
    {
      icon: <Users className="h-8 w-8 text-blue-400" />,
      value: isLoadingUserStats ? '...' : (userStats?.directReferralCount || 0),
      label: t('dashboard.stats.directReferrals'),
      sublabel: t('dashboard.stats.thisMonth'),
      badge: '+12%',
      badgeColor: 'text-blue-400 border-blue-400/50'
    },
    {
      icon: <Building2 className="h-8 w-8 text-green-400" />,
      value: isLoadingUserStats ? '...' : (userStats?.totalTeamCount || 0),
      label: t('dashboard.stats.teamSize'),
      sublabel: t('dashboard.stats.totalMembers'),
      badge: '+8%',
      badgeColor: 'text-green-400 border-green-400/50'
    },
    {
      icon: <DollarSign className="h-8 w-8 text-honey" />,
      value: `$${isLoadingUserStats ? '...' : (userStats?.totalEarnings || '0.00')}`,
      label: t('dashboard.stats.totalEarnings'),
      sublabel: t('dashboard.stats.allTime'),
      badge: '+25%',
      badgeColor: 'text-honey border-honey/50'
    },
    {
      icon: <i className="fas fa-coins text-purple-400 text-2xl"></i>,
      value: typeof bccBalance === 'object' ? (bccBalance?.transferable || 0) : (bccBalance || 0),
      label: t('dashboard.stats.bccBalance'),
      sublabel: 'BCC',
      badge: '+5%',
      badgeColor: 'text-purple-400 border-purple-400/50'
    }
  ];

  return (
    <div className={styles.statsGrid}>
      {stats.map((stat, index) => (
        <Card key={index} className={styles.statCard}>
          <CardContent className="p-6">
            <div className={styles.statHeader}>
              {stat.icon}
              <div className="text-right">
                <Badge variant="outline" className={stat.badgeColor}>
                  {stat.badge}
                </Badge>
              </div>
            </div>
            <h3 className={styles.statValue}>
              {stat.value}
            </h3>
            <p className={styles.statLabel}>{stat.label}</p>
            <p className={`text-xs mt-1 ${stat.badgeColor.split(' ')[0]}`}>{stat.sublabel}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
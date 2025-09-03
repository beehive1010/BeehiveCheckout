import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Gift, CheckCircle, Building2, TrendingUp } from 'lucide-react';
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
      icon: <Gift className="h-6 w-6 md:h-8 md:w-8 text-honey" />,
      value: `$${isLoadingUserStats ? '...' : (userStats?.totalEarnings || '0.00')}`,
      label: 'Total rewards',
      sublabel: 'All time',
      badge: '+25%',
      badgeColor: 'text-honey border-honey/50'
    },
    {
      icon: <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-green-400" />,
      value: `$${isLoadingUserStats ? '...' : (userStats?.claimedAmount || '0.00')}`,
      label: 'Claimed rewards', 
      sublabel: 'Withdrawals',
      badge: '+15%',
      badgeColor: 'text-green-400 border-green-400/50'
    },
    {
      icon: <Building2 className="h-6 w-6 md:h-8 md:w-8 text-blue-400" />,
      value: isLoadingUserStats ? '...' : (userStats?.totalTeamCount || 0),
      label: 'Total team size',
      sublabel: 'Members',
      badge: '+8%',
      badgeColor: 'text-blue-400 border-blue-400/50'
    },
    {
      icon: <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-purple-400" />,
      value: isLoadingUserStats ? '...' : (userStats?.deepestLevel || 1),
      label: '最深层级',
      sublabel: 'Max level',
      badge: `L${userStats?.deepestLevel || 1}`,
      badgeColor: 'text-purple-400 border-purple-400/50'
    }
  ];

  return (
    <div className={styles.statsGrid}>
      {stats.map((stat, index) => (
        <Card key={index} className={styles.statCard}>
          <CardContent className="p-3 md:p-6">
            <div className={styles.statHeader}>
              {stat.icon}
              <div className="text-right">
                <Badge variant="outline" className={`text-xs ${stat.badgeColor}`}>
                  {stat.badge}
                </Badge>
              </div>
            </div>
            <h3 className={`${styles.statValue} text-lg md:text-2xl`}>
              {stat.value}
            </h3>
            <p className={`${styles.statLabel} text-xs md:text-sm`}>{stat.label}</p>
            <p className={`text-xs mt-1 ${stat.badgeColor.split(' ')[0]}`}>{stat.sublabel}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
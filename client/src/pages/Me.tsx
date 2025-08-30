import { useWallet } from '../hooks/useWallet';
import { useUserReferralStats } from '../hooks/useBeeHiveStats';
import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import HexagonIcon from '../components/shared/HexagonIcon';
import { AcademicCapIcon, UsersIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { DollarSign } from 'lucide-react';
import { IconActivity } from '@tabler/icons-react';
import { useLocation } from 'wouter';
import ClaimableRewardsCard from '../components/rewards/ClaimableRewardsCard';
import { PendingRewardsSection } from '@/components/rewards/PendingRewardsSection';
import { OrganizationActivity } from '@/components/organization/OrganizationActivity';
import styles from '../styles/me/me.module.css';

export default function Me() {
  const { 
    userData, 
    walletAddress, 
    currentLevel, 
    bccBalance, 
    cthBalance, 
    userActivity, 
    isActivityLoading,
    userBalances,
    isBalancesLoading 
  } = useWallet();
  const { data: userStats, isLoading: isLoadingUserStats } = useUserReferralStats();
  const { t, language } = useI18n();
  const [, setLocation] = useLocation();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString(language === 'en' ? 'en-US' : language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className={`${styles.meContainer} container mx-auto px-4 py-8`}>
      <h2 className="text-2xl font-bold text-honey mb-6">
        {t('me.title')}
      </h2>
      
      {/* Profile Card */}
      <Card className="bg-secondary border-border mb-6">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative">
              <HexagonIcon className="w-16 h-16 text-honey">
                <span className="text-2xl font-bold">L{currentLevel}</span>
              </HexagonIcon>
              <Badge className="absolute -top-2 -right-2 bg-honey text-secondary">
                L{currentLevel}
              </Badge>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-honey">
                {userData?.username || formatAddress(walletAddress || '')}
              </h3>
              <p className="text-muted-foreground text-sm">
                {formatAddress(walletAddress || '')}
              </p>
              <div className="flex items-center space-x-4 mt-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">BCC:</span>
                  <span className="font-medium text-honey ml-1">
                    {bccBalance?.transferable || 0}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Locked:</span>
                  <span className="font-medium text-honey ml-1">
                    {bccBalance?.restricted || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="rewards" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-secondary">
          <TabsTrigger value="rewards" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            {t('me.rewards') || 'Rewards'}
          </TabsTrigger>
          <TabsTrigger value="referrals" className="flex items-center gap-2">
            <UsersIcon className="w-4 h-4" />
            {t('me.referrals') || 'Referrals'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="space-y-6">
          <ClaimableRewardsCard walletAddress={walletAddress || ''} />
          
          {/* Pending Rewards Section */}
          {walletAddress && currentLevel && (
            <PendingRewardsSection 
              walletAddress={walletAddress} 
              currentUserLevel={currentLevel}
            />
          )}
        </TabsContent>


        <TabsContent value="referrals" className="space-y-6">
          {walletAddress && (
            <OrganizationActivity 
              walletAddress={walletAddress} 
              maxItems={5}
              className=""
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
import { useWallet } from '../hooks/useWallet';
import { useUserReferralStats } from '../hooks/useBeeHiveStats';
import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import HexagonIcon from '../components/UI/HexagonIcon';
import Learn from './Learn';
import Referrals from './Referrals';
import Settings from './Settings';
import { AcademicCapIcon, UsersIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { IconActivity } from '@tabler/icons-react';
import { useLocation } from 'wouter';

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
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-honey mb-6">
        User Center
      </h2>
      
      {/* Profile Card */}
      <Card className="bg-secondary border-border mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-4 lg:space-y-0 lg:space-x-6">
            <HexagonIcon size="xl">
              <img 
                src={userData?.user?.ipfsHash 
                  ? `https://ipfs.io/ipfs/${userData.user.ipfsHash}` 
                  : `https://api.dicebear.com/7.x/shapes/svg?seed=${walletAddress || 'default'}`
                } 
                alt="Profile Avatar" 
                className="w-20 h-20 rounded-full" 
              />
            </HexagonIcon>
            
            <div className="flex-1">
              <h3 className="text-xl font-bold text-honey mb-2">
                {userData?.user?.username || 'Member'}
              </h3>
              <p className="text-muted-foreground text-sm mb-2">
                {userData?.user?.email || 'member@beehive.app'}
              </p>
              <p className="text-muted-foreground text-sm font-mono mb-4">
                {walletAddress ? formatAddress(walletAddress) : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-honey text-black font-semibold">
                  Level {currentLevel} Member
                </Badge>
                <Badge variant="secondary" className="bg-green-600 text-white">
                  {t('me.status.active')}
                </Badge>
                <Badge variant="secondary" className="bg-blue-600 text-white">
                  {t('me.status.memberSince')} {userData?.user?.createdAt ? formatDate(userData.user.createdAt) : 'Oct 2024'}
                </Badge>
              </div>
            </div>
            
            <Button 
              className="btn-honey"
              data-testid="button-edit-profile"
            >
              <i className="fas fa-edit mr-2"></i>
              {t('me.editProfile')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-dollar-sign text-green-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">
              {isBalancesLoading ? '...' : (userBalances?.usdt?.toFixed(2) || '0.00')}
            </div>
            <div className="text-muted-foreground text-sm">{t('me.balances.usdt')}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-coins text-honey text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">{bccBalance?.transferable || 0}</div>
            <div className="text-muted-foreground text-sm">{t('me.balances.bccTransferable')}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-lock text-yellow-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">{bccBalance?.restricted || 0}</div>
            <div className="text-muted-foreground text-sm">{t('me.balances.bccRestricted')}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-gem text-purple-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">
              {cthBalance?.balance || 0}
            </div>
            <div className="text-muted-foreground text-sm">{t('me.balances.cth')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-users text-blue-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">
              {isLoadingUserStats ? '...' : (userStats?.directReferrals || 0)}
            </div>
            <div className="text-muted-foreground text-sm">{t('me.referrals.directReferrals') || 'Direct Referrals'}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-sitemap text-green-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">
              {isLoadingUserStats ? '...' : (userStats?.totalTeam || 0)}
            </div>
            <div className="text-muted-foreground text-sm">{t('me.referrals.totalTeam') || 'Total Team'}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-chart-line text-yellow-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">
              {isLoadingUserStats ? '...' : (userStats?.totalEarnings?.toFixed(2) || '0.00')}
            </div>
            <div className="text-muted-foreground text-sm">{t('me.referrals.totalEarnings') || 'Total Earnings'}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-clock text-purple-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">
              {isLoadingUserStats ? '...' : (userStats?.pendingRewards?.toFixed(2) || '0.00')}
            </div>
            <div className="text-muted-foreground text-sm">{t('me.referrals.pendingRewards') || 'Pending Rewards'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Up Button */}
      <div className="flex justify-center mb-6">
        <Button 
          onClick={() => setLocation('/tokens')}
          className="bg-honey text-black hover:bg-honey/90 font-semibold px-8 py-3 text-lg"
          data-testid="button-top-up"
        >
          <i className="fas fa-plus mr-2"></i>
          {t('buttons.topUp')}
        </Button>
      </div>

      {/* Tab Navigation */}
      <Tabs defaultValue="learn" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-secondary/50 border border-honey/20 rounded-xl p-1 mb-6 backdrop-blur-sm">
          <TabsTrigger 
            value="learn" 
            className="relative flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-300 data-[state=active]:bg-honey data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-honey/25 text-honey hover:bg-honey/10 hover:text-honey"
            data-testid="tab-learn"
          >
            <AcademicCapIcon className="w-5 h-5" />
            <span className="font-semibold">Learn</span>
          </TabsTrigger>
          <TabsTrigger 
            value="referrals" 
            className="relative flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-300 data-[state=active]:bg-honey data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-honey/25 text-honey hover:bg-honey/10 hover:text-honey"
            data-testid="tab-referrals"
          >
            <UsersIcon className="w-5 h-5" />
            <span className="font-semibold">Referrals</span>
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="relative flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-300 data-[state=active]:bg-honey data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-honey/25 text-honey hover:bg-honey/10 hover:text-honey"
            data-testid="tab-settings"
          >
            <Cog6ToothIcon className="w-5 h-5" />
            <span className="font-semibold">Settings</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="learn" className="mt-0">
          <Learn />
        </TabsContent>
        
        <TabsContent value="referrals" className="mt-0">
          <Referrals />
        </TabsContent>
        
        <TabsContent value="settings" className="mt-0">
          <Settings />
        </TabsContent>
      </Tabs>

      {/* Recent Activity */}
      <Card className="bg-secondary border-border mt-6">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-honey mb-4 flex items-center gap-2">
            <IconActivity className="w-5 h-5" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {isActivityLoading ? (
              <div className="flex justify-center py-4">
                <div className="text-muted-foreground">Loading activity...</div>
              </div>
            ) : userActivity.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No recent activity
              </div>
            ) : (
              userActivity.slice(0, 10).map((activity: any) => {
                const getActivityIcon = (type: string) => {
                  switch (type) {
                    case 'reward': return 'fas fa-gift';
                    case 'nft_purchase': return 'fas fa-shopping-cart';  
                    case 'token_purchase': return 'fas fa-coins';
                    case 'membership': return 'fas fa-star';
                    default: return 'fas fa-circle';
                  }
                };

                const getActivityColor = (type: string, amount?: string) => {
                  if (amount?.startsWith('+')) return 'text-green-400';
                  if (amount?.startsWith('-')) return 'text-muted-foreground';
                  return 'text-honey';
                };

                return (
                  <div 
                    key={activity.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-b-0"
                  >
                    <div className="flex items-center space-x-3">
                      <i className={`${getActivityIcon(activity.type)} text-honey-dark`}></i>
                      <div>
                        <p className="text-honey text-sm font-medium">
                          {activity.type === 'reward' ? 'Reward Received' :
                           activity.type === 'nft_purchase' ? 'NFT Purchase' :
                           activity.type === 'token_purchase' ? 'Token Purchase' :
                           activity.type === 'membership' ? 'Membership Purchase' :
                           activity.description}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {activity.description}
                          {activity.timestamp && (
                            <span className="ml-2">
                              • {formatDate(activity.timestamp)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {activity.amount && (
                      <span className={`font-semibold text-sm ${getActivityColor(activity.type, activity.amount)}`}>
                        {activity.amount}
                      </span>
                    )}
                    {activity.status && (
                      <Badge 
                        variant={activity.status === 'completed' ? 'default' : 'secondary'}
                        className={activity.status === 'completed' ? 'bg-green-600' : ''}
                      >
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

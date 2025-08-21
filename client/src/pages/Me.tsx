import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import HexagonIcon from '../components/UI/HexagonIcon';
import Learn from './Learn';
import Referrals from './Referrals';
import Settings from './Settings';

export default function Me() {
  const { userData, walletAddress, currentLevel, bccBalance } = useWallet();
  const { t, language } = useI18n();

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
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=96&h=96" 
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
            <div className="text-2xl font-bold text-honey">245.50</div>
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
            <div className="text-2xl font-bold text-honey">42</div>
            <div className="text-muted-foreground text-sm">{t('me.balances.cth')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <Tabs defaultValue="learn" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-secondary border-border mb-6">
          <TabsTrigger 
            value="learn" 
            className="data-[state=active]:bg-honey data-[state=active]:text-black text-honey"
            data-testid="tab-learn"
          >
            <i className="fas fa-graduation-cap mr-2"></i>
            Learn
          </TabsTrigger>
          <TabsTrigger 
            value="referrals" 
            className="data-[state=active]:bg-honey data-[state=active]:text-black text-honey"
            data-testid="tab-referrals"
          >
            <i className="fas fa-users mr-2"></i>
            Referrals
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="data-[state=active]:bg-honey data-[state=active]:text-black text-honey"
            data-testid="tab-settings"
          >
            <i className="fas fa-cog mr-2"></i>
            Settings
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
          <h3 className="text-lg font-semibold text-honey mb-4">
            Recent Activity
          </h3>
          <div className="space-y-3">
            {[
              {
                icon: 'fas fa-gift',
                type: 'Reward Received',
                description: 'From referral upgrade',
                amount: '+100 USDT',
                color: 'text-green-400'
              },
              {
                icon: 'fas fa-shopping-cart',
                type: 'NFT Claimed',
                description: 'Merchant NFT #1234',
                amount: '-50 BCC',
                color: 'text-muted-foreground'
              },
              {
                icon: 'fas fa-user-plus',
                type: 'New Referral',
                description: '0x1234...5678 joined',
                amount: 'Active',
                color: 'text-green-400'
              }
            ].map((activity, index) => (
              <div 
                key={index}
                className="flex items-center justify-between py-2 border-b border-border last:border-b-0"
              >
                <div className="flex items-center space-x-3">
                  <i className={`${activity.icon} text-honey-dark`}></i>
                  <div>
                    <p className="text-honey text-sm font-medium">{activity.type}</p>
                    <p className="text-muted-foreground text-xs">{activity.description}</p>
                  </div>
                </div>
                <span className={`font-semibold ${activity.color}`}>
                  {activity.amount}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

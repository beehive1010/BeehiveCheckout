import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import HexagonIcon from '../components/UI/HexagonIcon';
import { useToast } from '../hooks/use-toast';
import { TransactionWidget, useActiveAccount, useReadContract } from "thirdweb/react";
import { getNFT } from "thirdweb/extensions/erc1155";
import { claimTo } from "thirdweb/extensions/erc1155";
import { bbcMembershipContract, client, levelToTokenId } from "../lib/web3";

export default function Dashboard() {
  const { 
    userData, 
    isActivated, 
    currentLevel, 
    bccBalance, 
    walletAddress,
    activateMembership,
    isActivating
  } = useWallet();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const account = useActiveAccount();

  const handleActivateLevel1 = () => {
    // Mock Level 1 activation - in real implementation would integrate with payment system
    activateMembership({ level: 1, txHash: 'mock-tx-hash' }, {
      onSuccess: () => {
        toast({
          title: t('dashboard.activation.success.title'),
          description: t('dashboard.activation.success.description'),
        });
      },
      onError: (error: any) => {
        toast({
          title: t('dashboard.activation.error.title'),
          description: error.message || t('dashboard.activation.error.description'),
          variant: 'destructive',
        });
      },
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const quickActions = [
    {
      key: 'tasks',
      path: '/tasks',
      icon: 'fas fa-tasks',
      titleKey: 'nav.tasks',
      descriptionKey: 'dashboard.quickActions.tasks.description',
      statKey: 'dashboard.quickActions.tasks.stat',
      statValue: '12 Available'
    },
    {
      key: 'education',
      path: '/education',
      icon: 'fas fa-graduation-cap',
      titleKey: 'nav.education',
      descriptionKey: 'dashboard.quickActions.education.description',
      statKey: 'dashboard.quickActions.education.stat',
      statValue: 'Progress: 65%'
    },
    {
      key: 'hiveworld',
      path: '/hiveworld',
      icon: 'fas fa-sitemap',
      titleKey: 'nav.hiveworld',
      descriptionKey: 'dashboard.quickActions.hiveworld.description',
      statKey: 'dashboard.quickActions.hiveworld.stat',
      statValue: '3 Direct Refs'
    }
  ];

  const recentActivities = [
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
  ];

  if (!isActivated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto bg-secondary border-border glow-hover">
          <CardContent className="p-8 text-center">
            <HexagonIcon className="mx-auto mb-6" size="xl">
              <i className="fas fa-rocket text-honey text-3xl"></i>
            </HexagonIcon>
            
            <h1 className="text-3xl font-bold text-honey mb-4">
              {t('dashboard.welcome.title')}
            </h1>
            
            <p className="text-muted-foreground text-lg mb-6">
              {t('dashboard.welcome.description')}
            </p>

            <div className="bg-muted rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.membershipLevel')}</p>
                  <p className="text-2xl font-bold text-honey">Level 1</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.price')}</p>
                  <p className="text-2xl font-bold text-honey">130 USDT</p>
                </div>
              </div>
            </div>

            <div className="w-full">
              <TransactionWidget
                client={client}
                theme="dark"
                transaction={claimTo({
                  contract: bbcMembershipContract,
                  quantity: BigInt(1),
                  tokenId: levelToTokenId(1), // Level 1 Warrior/勇士 -> Token ID 0
                  to: account?.address || walletAddress || "",
                })}
              />
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              {t('dashboard.activationNote')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Membership Status Card */}
      <Card className="bg-secondary border-border glow-hover mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <HexagonIcon size="lg">
                <img 
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64" 
                  alt="User Avatar" 
                  className="w-12 h-12 rounded-full" 
                />
              </HexagonIcon>
              <div>
                <h2 className="text-xl font-bold text-honey">
                  {userData?.user?.username || 'Member'}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {walletAddress ? formatAddress(walletAddress) : ''}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className="bg-honey text-black font-semibold">
                    Level {currentLevel}
                  </Badge>
                  <Badge variant="secondary" className="bg-green-600 text-white">
                    {t('dashboard.status.active')}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Balance Display */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="balance-card">
                <p className="text-muted-foreground text-xs">USDT</p>
                <p className="text-honey font-bold">245.50</p>
              </div>
              <div className="balance-card">
                <p className="text-muted-foreground text-xs">{t('dashboard.balances.bccFree')}</p>
                <p className="text-honey font-bold">{bccBalance?.transferable || 0}</p>
              </div>
              <div className="balance-card">
                <p className="text-muted-foreground text-xs">{t('dashboard.balances.bccLocked')}</p>
                <p className="text-honey font-bold">{bccBalance?.restricted || 0}</p>
              </div>
              <div className="balance-card">
                <p className="text-muted-foreground text-xs">CTH</p>
                <p className="text-honey font-bold">42</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {quickActions.map((action) => (
          <Card 
            key={action.key}
            className="bg-secondary border-border glow-hover card-hover cursor-pointer"
            onClick={() => setLocation(action.path)}
            data-testid={`card-${action.key}`}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <HexagonIcon>
                  <i className={`${action.icon} text-honey`}></i>
                </HexagonIcon>
                <h3 className="text-lg font-semibold text-honey">
                  {t(action.titleKey)}
                </h3>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                {t(action.descriptionKey)}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-honey text-sm">{action.statValue}</span>
                <i className="fas fa-arrow-right text-honey"></i>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="bg-secondary border-border">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-honey mb-4">
            {t('dashboard.recentActivity')}
          </h3>
          <div className="space-y-3">
            {recentActivities.map((activity, index) => (
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

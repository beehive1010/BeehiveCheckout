import { useI18n } from '../contexts/I18nContext';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '../components/ui/card';

interface BlockchainStats {
  latestBlock: number;
  gasPrice: number;
  tps: number;
  recentTransactions: Array<{
    hash: string;
    type: string;
    amount: string;
    timestamp: string;
  }>;
}

export default function Discover() {
  const { t } = useI18n();

  // Fetch blockchain stats
  const { data: stats, isLoading: isLoadingStats } = useQuery<BlockchainStats>({
    queryKey: ['/api/discover/stats'],
    queryFn: async () => {
      const response = await fetch('/api/discover/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const partnerNetworks = [
    { name: 'Ethereum', icon: 'fab fa-ethereum', color: 'text-blue-400' },
    { name: 'Bitcoin', icon: 'fab fa-bitcoin', color: 'text-orange-400' },
    { name: 'Polygon', icon: 'fas fa-link', color: 'text-purple-400' },
    { name: 'Arbitrum', icon: 'fas fa-circle', color: 'text-blue-500' },
    { name: 'Optimism', icon: 'fas fa-gem', color: 'text-red-400' },
    { name: 'More', icon: 'fas fa-plus', color: 'text-honey' },
  ];

  if (isLoadingStats) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="h-8 bg-muted skeleton w-48"></div>
          <Card className="bg-secondary border-border">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="h-20 bg-muted skeleton"></div>
                <div className="h-20 bg-muted skeleton"></div>
                <div className="h-20 bg-muted skeleton"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-honey mb-6">
        {t('discover.title')}
      </h2>
      
      {/* Blockchain Explorer */}
      <Card className="bg-secondary border-border mb-6">
        <CardContent className="p-6">
          <h3 className="text-honey font-semibold text-lg mb-4">
            {t('discover.explorer.title')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-honey">
                {stats?.latestBlock.toLocaleString() || '18,542,891'}
              </div>
              <div className="text-muted-foreground text-sm">
                {t('discover.explorer.latestBlock')}
              </div>
            </div>
            <div className="bg-muted rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-honey">
                {stats?.gasPrice || '25'}
              </div>
              <div className="text-muted-foreground text-sm">
                {t('discover.explorer.gasPrice')}
              </div>
            </div>
            <div className="bg-muted rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-honey">
                {stats?.tps?.toFixed(1) || '15.4'}
              </div>
              <div className="text-muted-foreground text-sm">
                {t('discover.explorer.tps')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Partner Networks */}
      <div className="mb-6">
        <h3 className="text-honey font-semibold text-lg mb-4">
          {t('discover.partners.title')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {partnerNetworks.map((partner) => (
            <Card 
              key={partner.name}
              className="bg-secondary border-border glow-hover card-hover cursor-pointer"
              data-testid={`partner-${partner.name.toLowerCase()}`}
            >
              <CardContent className="p-4 text-center">
                <i className={`${partner.icon} text-3xl ${partner.color} mb-2`}></i>
                <p className="text-muted-foreground text-sm">{partner.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Network Activity */}
      <Card className="bg-secondary border-border">
        <CardContent className="p-6">
          <h3 className="text-honey font-semibold text-lg mb-4">
            {t('discover.activity.title')}
          </h3>
          <div className="space-y-3">
            {stats?.recentTransactions.map((tx, index) => (
              <div 
                key={index}
                className="flex items-center justify-between py-2 border-b border-border last:border-b-0"
              >
                <div className="flex items-center space-x-3">
                  <i className={`fas ${
                    tx.type === 'Transfer' ? 'fa-exchange-alt' :
                    tx.type === 'NFT Mint' ? 'fa-cube' : 'fa-coins'
                  } text-honey-dark`}></i>
                  <div>
                    <p className="text-honey text-sm font-mono">{tx.hash}</p>
                    <p className="text-muted-foreground text-xs">{tx.timestamp}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-honey text-sm">{tx.amount}</p>
                  <p className="text-muted-foreground text-xs">{tx.type}</p>
                </div>
              </div>
            )) || (
              // Fallback content if no stats loaded
              <div className="text-center py-8">
                <i className="fas fa-satellite-dish text-4xl text-muted-foreground mb-4"></i>
                <p className="text-muted-foreground">
                  {t('discover.activity.noData')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card className="bg-secondary border-border">
          <CardContent className="p-6">
            <h3 className="text-honey font-semibold text-lg mb-4">
              {t('discover.about.title')}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {t('discover.about.description')}
            </p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">
                  {t('discover.about.totalMembers')}
                </span>
                <span className="text-honey font-semibold">12,847</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">
                  {t('discover.about.activeLevels')}
                </span>
                <span className="text-honey font-semibold">19</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">
                  {t('discover.about.totalRewards')}
                </span>
                <span className="text-honey font-semibold">2.4M USDT</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary border-border">
          <CardContent className="p-6">
            <h3 className="text-honey font-semibold text-lg mb-4">
              {t('discover.ecosystem.title')}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {t('discover.ecosystem.description')}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <i className="fas fa-coins text-2xl text-honey mb-2"></i>
                <p className="text-xs text-muted-foreground">BCC Token</p>
              </div>
              <div className="text-center">
                <i className="fas fa-certificate text-2xl text-honey mb-2"></i>
                <p className="text-xs text-muted-foreground">BBC NFTs</p>
              </div>
              <div className="text-center">
                <i className="fas fa-store text-2xl text-honey mb-2"></i>
                <p className="text-xs text-muted-foreground">NFT Market</p>
              </div>
              <div className="text-center">
                <i className="fas fa-graduation-cap text-2xl text-honey mb-2"></i>
                <p className="text-xs text-muted-foreground">Education</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

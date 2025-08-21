import { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

interface DApp {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  users: string;
  tvl?: string;
  volume?: string;
  trending?: boolean;
  featured?: boolean;
  verified: boolean;
  chainId?: number;
}

interface NewsItem {
  id: string;
  title: string;
  description: string;
  readTime: number;
  timestamp: string;
  category: string;
}

export default function Discover() {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All', icon: 'fas fa-th-large' },
    { id: 'defi', name: t('discover.categories.defi'), icon: 'fas fa-coins' },
    { id: 'nft', name: t('discover.categories.nft'), icon: 'fas fa-gem' },
    { id: 'gamefi', name: t('discover.categories.gamefi'), icon: 'fas fa-gamepad' },
    { id: 'dao', name: t('discover.categories.dao'), icon: 'fas fa-users' },
    { id: 'bridge', name: t('discover.categories.bridge'), icon: 'fas fa-bridge' },
    { id: 'dex', name: t('discover.categories.dex'), icon: 'fas fa-exchange-alt' },
    { id: 'yield', name: t('discover.categories.yield'), icon: 'fas fa-chart-line' },
    { id: 'education', name: t('discover.categories.education'), icon: 'fas fa-graduation-cap' },
  ];

  const featuredDApps: DApp[] = [
    {
      id: 'beehive-membership',
      name: 'BeeHive Membership',
      category: 'dao',
      icon: 'fas fa-crown',
      description: '19-level membership system with Web3 rewards',
      users: '12.8K',
      featured: true,
      verified: true
    },
    {
      id: 'uniswap',
      name: 'Uniswap',
      category: 'dex',
      icon: 'fas fa-swimming-pool',
      description: 'Leading decentralized exchange protocol',
      users: '2.1M',
      tvl: '$3.2B',
      volume: '$847M',
      featured: true,
      verified: true
    },
    {
      id: 'opensea',
      name: 'OpenSea',
      category: 'nft',
      icon: 'fas fa-ship',
      description: 'Largest NFT marketplace',
      users: '1.8M',
      volume: '$124M',
      featured: true,
      verified: true
    },
    {
      id: 'compound',
      name: 'Compound',
      category: 'defi',
      icon: 'fas fa-piggy-bank',
      description: 'Algorithmic money market protocol',
      users: '180K',
      tvl: '$1.8B',
      featured: true,
      verified: true
    }
  ];

  const trendingDApps: DApp[] = [
    {
      id: 'matrix-rewards',
      name: 'Matrix Rewards',
      category: 'dao',
      icon: 'fas fa-sitemap',
      description: '3×3 matrix referral system',
      users: '8.4K',
      trending: true,
      verified: true
    },
    {
      id: 'pancakeswap',
      name: 'PancakeSwap',
      category: 'dex',
      icon: 'fas fa-layer-group',
      description: 'BSC leading DEX with farming',
      users: '890K',
      tvl: '$1.2B',
      volume: '$234M',
      trending: true,
      verified: true
    },
    {
      id: 'axie-infinity',
      name: 'Axie Infinity',
      category: 'gamefi',
      icon: 'fas fa-dragon',
      description: 'Popular play-to-earn game',
      users: '2.8M',
      trending: true,
      verified: true
    }
  ];

  const ecosystemServices = [
    {
      id: 'membership',
      title: t('discover.ecosystem.membership.title'),
      subtitle: t('discover.ecosystem.membership.subtitle'),
      icon: 'fas fa-crown',
      stats: [
        { label: t('discover.ecosystem.membership.levels'), value: '19' },
        { label: t('discover.ecosystem.membership.members'), value: '12.8K' }
      ]
    },
    {
      id: 'matrix',
      title: t('discover.ecosystem.matrix.title'),
      subtitle: t('discover.ecosystem.matrix.subtitle'),
      icon: 'fas fa-sitemap',
      stats: [
        { label: t('discover.ecosystem.matrix.structure'), value: '3×3' },
        { label: t('discover.ecosystem.matrix.rewards'), value: '24/7' }
      ]
    },
    {
      id: 'education',
      title: t('discover.ecosystem.education.title'),
      subtitle: t('discover.ecosystem.education.subtitle'),
      icon: 'fas fa-graduation-cap',
      stats: [
        { label: t('discover.ecosystem.education.courses'), value: '50+' },
        { label: t('discover.ecosystem.education.certificates'), value: '2.1K' }
      ]
    }
  ];

  const networks = [
    { name: 'Ethereum', icon: 'fab fa-ethereum', color: 'text-blue-400', chainId: 1 },
    { name: 'Polygon', icon: 'fas fa-link', color: 'text-purple-400', chainId: 137 },
    { name: 'Arbitrum', icon: 'fas fa-circle', color: 'text-blue-500', chainId: 42161 },
    { name: 'Optimism', icon: 'fas fa-gem', color: 'text-red-400', chainId: 10 },
    { name: 'BSC', icon: 'fas fa-coins', color: 'text-yellow-400', chainId: 56 },
    { name: 'Avalanche', icon: 'fas fa-mountain', color: 'text-red-500', chainId: 43114 }
  ];

  const news: NewsItem[] = [
    {
      id: '1',
      title: 'BeeHive Launches New Matrix 3.0 System',
      description: 'Enhanced 3×3 matrix with automated smart contract distribution and improved reward mechanisms.',
      readTime: 3,
      timestamp: '2 hours ago',
      category: 'Platform'
    },
    {
      id: '2',
      title: 'Multi-Chain USDT Bridge Now Live',
      description: 'Seamless USDT payments across Ethereum, Polygon, and Arbitrum networks.',
      readTime: 2,
      timestamp: '6 hours ago',
      category: 'Technology'
    },
    {
      id: '3',
      title: 'Education Hub Reaches 50+ Courses',
      description: 'Comprehensive Web3 learning platform with certification programs.',
      readTime: 4,
      timestamp: '1 day ago',
      category: 'Education'
    }
  ];

  const platformStats = [
    { label: t('discover.stats.totalValue'), value: '$12.4M', icon: 'fas fa-chart-line' },
    { label: t('discover.stats.transactions'), value: '847K', icon: 'fas fa-exchange-alt' },
    { label: t('discover.stats.users'), value: '28.6K', icon: 'fas fa-users' },
    { label: t('discover.stats.protocols'), value: '150+', icon: 'fas fa-cubes' }
  ];

  const filteredDApps = [...featuredDApps, ...trendingDApps].filter(dapp => {
    const matchesSearch = dapp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         dapp.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || dapp.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto px-4 py-4 md:py-6 space-y-6">
      {/* Header */}
      <div className="text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-bold text-honey mb-2">
          {t('discover.title')}
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          {t('discover.subtitle')}
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Input
          placeholder={t('discover.search.placeholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
          data-testid="input-search-dapps"
        />
        <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"></i>
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm" 
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            data-testid="button-clear-search"
          >
            <i className="fas fa-times text-xs"></i>
          </Button>
        )}
      </div>

      {/* Categories */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-honey">{t('discover.categories.title')}</h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(category.id)}
              className={`${
                activeCategory === category.id
                  ? 'bg-honey text-black hover:bg-honey/90'
                  : 'bg-secondary text-muted-foreground border-border hover:text-honey hover:bg-honey/10'
              }`}
              data-testid={`filter-category-${category.id}`}
            >
              <i className={`${category.icon} mr-2 text-xs`}></i>
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Featured DApps */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-honey">{t('discover.featured.title')}</h3>
          <Button variant="ghost" size="sm" className="text-honey hover:text-honey/80">
            {t('discover.featured.viewAll')} <i className="fas fa-arrow-right ml-2"></i>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredDApps.map((dapp) => (
            <Card key={dapp.id} className="bg-secondary border-border glow-hover card-hover cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-honey/20 rounded-lg flex items-center justify-center">
                      <i className={`${dapp.icon} text-honey`}></i>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">{dapp.name}</h4>
                      {dapp.verified && (
                        <i className="fas fa-check-circle text-green-400 text-xs"></i>
                      )}
                    </div>
                  </div>
                  {dapp.featured && (
                    <span className="text-xs px-2 py-1 rounded-full bg-honey/20 text-honey">
                      Featured
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-xs mb-3 line-clamp-2">
                  {dapp.description}
                </p>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">{dapp.users} {t('discover.trending.users')}</span>
                  {dapp.tvl && (
                    <span className="text-honey">{dapp.tvl} {t('discover.trending.tvl')}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* BeeHive Ecosystem */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-honey">{t('discover.ecosystem.title')}</h3>
          <p className="text-muted-foreground text-sm">{t('discover.ecosystem.subtitle')}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ecosystemServices.map((service) => (
            <Card key={service.id} className="bg-secondary border-border glow-hover card-hover cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-honey/20 rounded-lg flex items-center justify-center">
                    <i className={`${service.icon} text-honey`}></i>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">{service.title}</h4>
                    <p className="text-muted-foreground text-xs">{service.subtitle}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {service.stats.map((stat, index) => (
                    <div key={index} className="text-center">
                      <div className="text-honey font-bold text-lg">{stat.value}</div>
                      <div className="text-muted-foreground text-xs">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Trending DApps */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-honey">{t('discover.trending.title')}</h3>
          <p className="text-muted-foreground text-sm">{t('discover.trending.subtitle')}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trendingDApps.map((dapp) => (
            <Card key={dapp.id} className="bg-secondary border-border glow-hover card-hover cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-honey/20 rounded-lg flex items-center justify-center">
                      <i className={`${dapp.icon} text-honey`}></i>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">{dapp.name}</h4>
                      {dapp.verified && (
                        <i className="fas fa-check-circle text-green-400 text-xs"></i>
                      )}
                    </div>
                  </div>
                  {dapp.trending && (
                    <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">
                      🔥 {t('discover.trending.title')}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-xs mb-3 line-clamp-2">
                  {dapp.description}
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('discover.trending.users')}</span>
                    <span className="text-foreground">{dapp.users}</span>
                  </div>
                  {dapp.tvl && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('discover.trending.tvl')}</span>
                      <span className="text-honey">{dapp.tvl}</span>
                    </div>
                  )}
                  {dapp.volume && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('discover.trending.volume')}</span>
                      <span className="text-green-400">{dapp.volume}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Platform Stats */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-honey">{t('discover.stats.title')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {platformStats.map((stat, index) => (
            <Card key={index} className="bg-secondary border-border">
              <CardContent className="p-4 text-center">
                <i className={`${stat.icon} text-2xl text-honey mb-2`}></i>
                <div className="text-xl font-bold text-honey">{stat.value}</div>
                <div className="text-muted-foreground text-xs">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Supported Networks */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-honey">{t('discover.networks.title')}</h3>
          <p className="text-muted-foreground text-sm">{t('discover.networks.subtitle')}</p>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {networks.map((network) => (
            <Card key={network.name} className="bg-secondary border-border glow-hover card-hover cursor-pointer">
              <CardContent className="p-3 text-center">
                <i className={`${network.icon} text-2xl ${network.color} mb-2`}></i>
                <p className="text-muted-foreground text-xs">{network.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Latest News */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-honey">{t('discover.news.title')}</h3>
          <p className="text-muted-foreground text-sm">{t('discover.news.subtitle')}</p>
        </div>
        <div className="space-y-3">
          {news.map((item) => (
            <Card key={item.id} className="bg-secondary border-border glow-hover card-hover cursor-pointer">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground text-sm mb-1">{item.title}</h4>
                    <p className="text-muted-foreground text-xs mb-2 line-clamp-2">{item.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>{item.timestamp}</span>
                      <span>{item.readTime} {t('discover.news.minutes')}</span>
                      <span className="text-honey">{item.category}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-honey hover:text-honey/80 ml-4">
                    {t('discover.news.readMore')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

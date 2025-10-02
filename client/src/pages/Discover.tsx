import { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useLocation } from 'wouter';

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
  website?: string;
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
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const handleDAppClick = (dapp: DApp) => {
    if (!dapp.website) return;
    
    if (dapp.website.startsWith('http')) {
      // External link - open in new tab
      window.open(dapp.website, '_blank', 'noopener,noreferrer');
    } else {
      // Internal link - navigate within app
      setLocation(dapp.website);
    }
  };

  const categories = [
    { id: 'all', name: t('discover.categories.all'), icon: 'fas fa-th-large' },
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
      name: t('discover.dapps.beehive'),
      category: 'dao',
      icon: 'fas fa-crown',
      description: t('discover.dapps.beehiveDesc'),
      users: '12.8K',
      featured: true,
      verified: true,
      website: '/dashboard' // Internal link to dashboard
    },
    {
      id: 'uniswap',
      name: t('discover.dapps.uniswap'),
      category: 'dex',
      icon: 'fas fa-swimming-pool',
      description: t('discover.dapps.uniswapDesc'),
      users: '2.1M',
      tvl: '$3.2B',
      volume: '$847M',
      featured: true,
      verified: true,
      website: 'https://app.uniswap.org'
    },
    {
      id: 'opensea',
      name: t('discover.dapps.opensea'),
      category: 'nft',
      icon: 'fas fa-ship',
      description: t('discover.dapps.openseaDesc'),
      users: '1.8M',
      volume: '$124M',
      featured: true,
      verified: true,
      website: 'https://opensea.io'
    },
    {
      id: 'compound',
      name: t('discover.dapps.compound'),
      category: 'defi',
      icon: 'fas fa-piggy-bank',
      description: t('discover.dapps.compoundDesc'),
      users: '180K',
      tvl: '$1.8B',
      featured: true,
      verified: true,
      website: 'https://compound.finance'
    }
  ];

  const trendingDApps: DApp[] = [
    {
      id: 'matrix-rewards',
      name: t('discover.dapps.matrixRewards'),
      category: 'dao',
      icon: 'fas fa-sitemap',
      description: t('discover.dapps.matrixRewardsDesc'),
      users: '8.4K',
      trending: true,
      verified: true,
      website: '/hiveworld' // Internal link to matrix system
    },
    {
      id: 'pancakeswap',
      name: t('discover.dapps.pancakeswap'),
      category: 'dex',
      icon: 'fas fa-layer-group',
      description: t('discover.dapps.pancakeswapDesc'),
      users: '890K',
      tvl: '$1.2B',
      volume: '$234M',
      trending: true,
      verified: true,
      website: 'https://pancakeswap.finance'
    },
    {
      id: 'axie-infinity',
      name: t('discover.dapps.axieinfinity'),
      category: 'gamefi',
      icon: 'fas fa-dragon',
      description: t('discover.dapps.axieinfinityDesc'),
      users: '2.8M',
      trending: true,
      verified: true,
      website: 'https://axieinfinity.com'
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
    { name: t('discover.chains.ethereum'), icon: 'fab fa-ethereum', color: 'text-blue-400', chainId: 1 },
    { name: t('discover.chains.polygon'), icon: 'fas fa-link', color: 'text-purple-400', chainId: 137 },
    { name: t('discover.chains.arbitrum'), icon: 'fas fa-circle', color: 'text-blue-500', chainId: 42161 },
    { name: t('discover.chains.optimism'), icon: 'fas fa-gem', color: 'text-red-400', chainId: 10 },
    { name: t('discover.chains.bsc'), icon: 'fas fa-coins', color: 'text-yellow-400', chainId: 56 },
    { name: t('discover.chains.avalanche'), icon: 'fas fa-mountain', color: 'text-red-500', chainId: 43114 }
  ];

  const news: NewsItem[] = [
    {
      id: '1',
      title: t('discover.news.matrix30.title'),
      description: t('discover.news.matrix30.description'),
      readTime: 3,
      timestamp: '2 hours ago',
      category: 'Platform'
    },
    {
      id: '2',
      title: t('discover.news.bridge.title'),
      description: t('discover.news.bridge.description'),
      readTime: 2,
      timestamp: '6 hours ago',
      category: 'Technology'
    },
    {
      id: '3',
      title: t('discover.news.education.title'),
      description: t('discover.news.education.description'),
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
            <Card 
              key={dapp.id} 
              className="bg-secondary border-border glow-hover card-hover cursor-pointer transition-all hover:scale-105"
              onClick={() => handleDAppClick(dapp)}
              data-testid={`dapp-card-${dapp.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-honey/20 rounded-lg flex items-center justify-center hover:bg-honey/30 transition-colors">
                      <i className={`${dapp.icon} text-honey`}></i>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm hover:text-honey transition-colors">{dapp.name}</h4>
                      <div className="flex items-center space-x-1">
                        {dapp.verified && (
                          <i className="fas fa-check-circle text-green-400 text-xs"></i>
                        )}
                        {dapp.website && (
                          <i className="fas fa-external-link-alt text-muted-foreground text-xs"></i>
                        )}
                      </div>
                    </div>
                  </div>
                  {dapp.featured && (
                    <span className="text-xs px-2 py-1 rounded-full bg-honey/20 text-honey">
                      {t('discover.featured')}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-xs mb-3 line-clamp-2">
                  {dapp.description}
                </p>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">{dapp.users} {t('discover.trendingSection.users')}</span>
                  {dapp.tvl && (
                    <span className="text-honey">{dapp.tvl} {t('discover.trendingSection.tvl')}</span>
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
          <h3 className="text-lg font-semibold text-honey">{t('discover.trendingSection.title')}</h3>
          <p className="text-muted-foreground text-sm">{t('discover.trendingSection.subtitle')}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trendingDApps.map((dapp) => (
            <Card 
              key={dapp.id} 
              className="bg-secondary border-border glow-hover card-hover cursor-pointer transition-all hover:scale-105"
              onClick={() => handleDAppClick(dapp)}
              data-testid={`trending-dapp-card-${dapp.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-honey/20 rounded-lg flex items-center justify-center hover:bg-honey/30 transition-colors">
                      <i className={`${dapp.icon} text-honey`}></i>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm hover:text-honey transition-colors">{dapp.name}</h4>
                      <div className="flex items-center space-x-1">
                        {dapp.verified && (
                          <i className="fas fa-check-circle text-green-400 text-xs"></i>
                        )}
                        {dapp.website && (
                          <i className="fas fa-external-link-alt text-muted-foreground text-xs"></i>
                        )}
                      </div>
                    </div>
                  </div>
                  {dapp.trending && (
                    <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">
                      🔥 {t('discover.trending')}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-xs mb-3 line-clamp-2">
                  {dapp.description}
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('discover.trendingSection.users')}</span>
                    <span className="text-foreground">{dapp.users}</span>
                  </div>
                  {dapp.tvl && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('discover.trendingSection.tvl')}</span>
                      <span className="text-honey">{dapp.tvl}</span>
                    </div>
                  )}
                  {dapp.volume && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('discover.trendingSection.volume')}</span>
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

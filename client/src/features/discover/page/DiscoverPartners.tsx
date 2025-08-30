import { useState } from 'react';
import { useI18n } from '../../../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { 
  Search, 
  ExternalLink, 
  Users, 
  Star, 
  TrendingUp, 
  Globe, 
  Shield, 
  Zap,
  Award,
  Building,
  Code,
  DollarSign,
  Calendar,
  CheckCircle,
  ArrowUpRight
} from 'lucide-react';

interface Partner {
  id: string;
  name: string;
  description: string;
  logo: string;
  website: string;
  category: string;
  partnerType: 'strategic' | 'technology' | 'integration' | 'ecosystem';
  verified: boolean;
  featured: boolean;
  tier: 'gold' | 'silver' | 'bronze' | 'partner';
  integrationStatus: 'live' | 'development' | 'planned';
  benefits: string[];
  contractAddress?: string;
  chain?: string;
  tvl?: string;
  users?: string;
  joinedDate: string;
  socialLinks: {
    twitter?: string;
    discord?: string;
    telegram?: string;
    github?: string;
  };
}

interface Integration {
  id: string;
  partnerId: string;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'planned';
  progress: number;
  launchDate?: string;
  features: string[];
}

export default function DiscoverPartners() {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTier, setSelectedTier] = useState('all');

  const categories = [
    { id: 'all', name: 'All Partners', icon: Globe },
    { id: 'defi', name: 'DeFi Protocols', icon: TrendingUp },
    { id: 'infrastructure', name: 'Infrastructure', icon: Building },
    { id: 'development', name: 'Development Tools', icon: Code },
    { id: 'marketplace', name: 'Marketplaces', icon: DollarSign },
    { id: 'education', name: 'Education', icon: Award },
    { id: 'security', name: 'Security', icon: Shield }
  ];

  const partners: Partner[] = [
    {
      id: 'chainlink',
      name: 'Chainlink',
      description: 'Decentralized oracle network providing real-world data to smart contracts on the Beehive platform.',
      logo: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=100',
      website: 'https://chain.link',
      category: 'infrastructure',
      partnerType: 'strategic',
      verified: true,
      featured: true,
      tier: 'gold',
      integrationStatus: 'live',
      benefits: ['Price Feeds', 'VRF for Random Numbers', 'Automation', 'Cross-Chain Protocols'],
      tvl: '$14.2B',
      users: '1.8M',
      joinedDate: '2025-06-15',
      socialLinks: {
        twitter: 'https://twitter.com/chainlink',
        discord: 'https://discord.gg/chainlink',
        github: 'https://github.com/smartcontractkit'
      }
    },
    {
      id: 'thirdweb',
      name: 'thirdweb',
      description: 'Complete web3 development framework powering smart contract deployment and management for Beehive.',
      logo: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=100',
      website: 'https://thirdweb.com',
      category: 'development',
      partnerType: 'technology',
      verified: true,
      featured: true,
      tier: 'gold',
      integrationStatus: 'live',
      benefits: ['Smart Contract SDKs', 'Wallet Connect', 'NFT Infrastructure', 'Analytics Dashboard'],
      contractAddress: '0x6D513487bd63430Ca71Cd1d9A7DeA5aAcDbf0322',
      chain: 'alpha-centauri',
      users: '180K',
      joinedDate: '2025-05-20',
      socialLinks: {
        twitter: 'https://twitter.com/thirdweb',
        discord: 'https://discord.gg/thirdweb',
        github: 'https://github.com/thirdweb-dev'
      }
    },
    {
      id: 'opensea',
      name: 'OpenSea',
      description: 'Leading NFT marketplace integration for Beehive membership NFTs and advertisement collections.',
      logo: 'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=100',
      website: 'https://opensea.io',
      category: 'marketplace',
      partnerType: 'integration',
      verified: true,
      featured: true,
      tier: 'silver',
      integrationStatus: 'live',
      benefits: ['NFT Trading', 'Metadata Standards', 'Collection Management', 'Royalty Distribution'],
      contractAddress: '0xbF9bD50CA1801E02A37A011660eD65A89FB70e64',
      chain: 'ethereum',
      tvl: '$2.1B',
      users: '2.3M',
      joinedDate: '2025-07-10',
      socialLinks: {
        twitter: 'https://twitter.com/opensea',
        discord: 'https://discord.gg/opensea'
      }
    },
    {
      id: 'polygon',
      name: 'Polygon',
      description: 'Layer 2 scaling solution enabling fast and cheap transactions for Beehive token operations.',
      logo: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?w=100',
      website: 'https://polygon.technology',
      category: 'infrastructure',
      partnerType: 'strategic',
      verified: true,
      featured: false,
      tier: 'gold',
      integrationStatus: 'live',
      benefits: ['Low Gas Fees', 'Fast Transactions', 'EVM Compatibility', 'Bridge Infrastructure'],
      tvl: '$1.2B',
      users: '3.1M',
      joinedDate: '2025-04-25',
      socialLinks: {
        twitter: 'https://twitter.com/0xPolygon',
        discord: 'https://discord.gg/polygon',
        telegram: 'https://t.me/polygonofficial'
      }
    },
    {
      id: 'metamask',
      name: 'MetaMask',
      description: 'Primary wallet integration for seamless Web3 access and transaction signing on Beehive.',
      logo: 'https://images.unsplash.com/photo-1642104704074-907c0698cbd9?w=100',
      website: 'https://metamask.io',
      category: 'infrastructure',
      partnerType: 'technology',
      verified: true,
      featured: false,
      tier: 'silver',
      integrationStatus: 'live',
      benefits: ['Wallet Connection', 'Transaction Signing', 'Multi-Chain Support', 'Security Features'],
      users: '30M',
      joinedDate: '2025-03-12',
      socialLinks: {
        twitter: 'https://twitter.com/MetaMask',
        discord: 'https://discord.gg/metamask'
      }
    },
    {
      id: 'academy',
      name: 'Blockchain Academy',
      description: 'Educational partner providing certified Web3 courses and professional certification programs.',
      logo: 'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=100',
      website: 'https://blockchainacademy.com',
      category: 'education',
      partnerType: 'ecosystem',
      verified: true,
      featured: false,
      tier: 'bronze',
      integrationStatus: 'development',
      benefits: ['Certified Courses', 'Professional Certificates', 'Industry Recognition', 'Career Support'],
      users: '45K',
      joinedDate: '2025-08-01',
      socialLinks: {
        twitter: 'https://twitter.com/BlockchainAcad',
        discord: 'https://discord.gg/academy'
      }
    },
    {
      id: 'audit-firm',
      name: 'CertiK Security',
      description: 'Leading security auditing firm ensuring smart contract safety and platform security for Beehive.',
      logo: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=100',
      website: 'https://certik.com',
      category: 'security',
      partnerType: 'strategic',
      verified: true,
      featured: false,
      tier: 'gold',
      integrationStatus: 'live',
      benefits: ['Smart Contract Audits', 'Security Monitoring', 'Penetration Testing', 'Compliance Reports'],
      joinedDate: '2025-02-28',
      socialLinks: {
        twitter: 'https://twitter.com/CertiK',
        telegram: 'https://t.me/certik_community'
      }
    },
    {
      id: 'arbitrum',
      name: 'Arbitrum',
      description: 'Layer 2 Ethereum scaling solution for efficient smart contract execution and reduced gas costs.',
      logo: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=100',
      website: 'https://arbitrum.io',
      category: 'infrastructure',
      partnerType: 'strategic',
      verified: true,
      featured: false,
      tier: 'silver',
      integrationStatus: 'live',
      benefits: ['Ethereum L2 Scaling', 'Lower Fees', 'Fast Finality', 'DeFi Ecosystem'],
      tvl: '$2.8B',
      users: '850K',
      joinedDate: '2025-05-05',
      socialLinks: {
        twitter: 'https://twitter.com/arbitrum',
        discord: 'https://discord.gg/arbitrum'
      }
    }
  ];

  const integrations: Integration[] = [
    {
      id: 'chainlink-price-feeds',
      partnerId: 'chainlink',
      title: 'Price Feed Integration',
      description: 'Real-time USDT/BCC price feeds for accurate token conversions',
      status: 'completed',
      progress: 100,
      launchDate: '2025-06-20',
      features: ['Live Price Data', 'Automatic Updates', 'Multi-Chain Support']
    },
    {
      id: 'thirdweb-contracts',
      partnerId: 'thirdweb',
      title: 'Smart Contract Management',
      description: 'Deployment and management of Beehive membership and advertisement contracts',
      status: 'completed',
      progress: 100,
      launchDate: '2025-05-25',
      features: ['Contract Deployment', 'NFT Minting', 'Wallet Integration', 'Analytics']
    },
    {
      id: 'opensea-marketplace',
      partnerId: 'opensea',
      title: 'NFT Marketplace Integration',
      description: 'Enable trading of Beehive NFTs on OpenSea marketplace',
      status: 'in-progress',
      progress: 75,
      features: ['NFT Listings', 'Royalty Management', 'Collection Pages']
    },
    {
      id: 'polygon-bridge',
      partnerId: 'polygon',
      title: 'Cross-Chain Bridge',
      description: 'Seamless token transfers between Ethereum and Polygon networks',
      status: 'completed',
      progress: 100,
      launchDate: '2025-04-30',
      features: ['Token Bridging', 'Low Gas Fees', 'Fast Transfers']
    },
    {
      id: 'education-platform',
      partnerId: 'academy',
      title: 'Certification Program',
      description: 'Integrated Web3 education and certification system',
      status: 'planned',
      progress: 25,
      features: ['Course Integration', 'NFT Certificates', 'Progress Tracking']
    }
  ];

  const filteredPartners = partners.filter(partner => {
    const matchesSearch = searchQuery === '' || 
      partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || partner.category === selectedCategory;
    const matchesTier = selectedTier === 'all' || partner.tier === selectedTier;
    
    return matchesSearch && matchesCategory && matchesTier;
  });

  const getTierBadge = (tier: string) => {
    const colors = {
      gold: 'bg-yellow-500',
      silver: 'bg-gray-400',
      bronze: 'bg-orange-600',
      partner: 'bg-blue-500'
    };
    return colors[tier as keyof typeof colors] || 'bg-gray-500';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge className="bg-green-500">Live</Badge>;
      case 'development':
        return <Badge className="bg-blue-500">In Development</Badge>;
      case 'planned':
        return <Badge variant="outline">Planned</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getIntegrationStatus = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'in-progress':
        return <Badge className="bg-blue-500"><Zap className="w-3 h-3 mr-1" />In Progress</Badge>;
      case 'planned':
        return <Badge variant="outline"><Calendar className="w-3 h-3 mr-1" />Planned</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-honey">
          Discover Partners
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Explore our ecosystem of strategic partners, technology integrations, and collaborative networks that power the Beehive platform.
        </p>
        
        {/* Partner Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <Card className="bg-secondary/50 border-honey/20">
            <CardContent className="p-4 text-center">
              <Building className="w-6 h-6 text-honey mx-auto mb-2" />
              <div className="text-2xl font-bold text-honey">{partners.length}</div>
              <div className="text-sm text-muted-foreground">Total Partners</div>
            </CardContent>
          </Card>
          <Card className="bg-secondary/50 border-honey/20">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-6 h-6 text-honey mx-auto mb-2" />
              <div className="text-2xl font-bold text-honey">{integrations.filter(i => i.status === 'completed').length}</div>
              <div className="text-sm text-muted-foreground">Live Integrations</div>
            </CardContent>
          </Card>
          <Card className="bg-secondary/50 border-honey/20">
            <CardContent className="p-4 text-center">
              <Star className="w-6 h-6 text-honey mx-auto mb-2" />
              <div className="text-2xl font-bold text-honey">{partners.filter(p => p.tier === 'gold').length}</div>
              <div className="text-sm text-muted-foreground">Gold Partners</div>
            </CardContent>
          </Card>
          <Card className="bg-secondary/50 border-honey/20">
            <CardContent className="p-4 text-center">
              <Globe className="w-6 h-6 text-honey mx-auto mb-2" />
              <div className="text-2xl font-bold text-honey">5</div>
              <div className="text-sm text-muted-foreground">Supported Chains</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="bg-secondary/50 border-honey/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-honey" />
            Find Partners
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search partners by name, category, or technology..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50 border-honey/20"
              data-testid="input-search-partners"
            />
          </div>
          
          {/* Filter Row */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Category:</span>
              {categories.map(category => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className={selectedCategory === category.id ? "bg-honey text-black" : "border-honey/20 hover:bg-honey/10"}
                >
                  <category.icon className="w-3 h-3 mr-1" />
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Tier:</span>
              {['all', 'gold', 'silver', 'bronze', 'partner'].map(tier => (
                <Button
                  key={tier}
                  variant={selectedTier === tier ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTier(tier)}
                  className={selectedTier === tier ? "bg-honey text-black" : "border-honey/20 hover:bg-honey/10"}
                >
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="partners" className="space-y-6">
        <TabsList>
          <TabsTrigger value="partners">All Partners</TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="contracts">Smart Contracts</TabsTrigger>
        </TabsList>

        <TabsContent value="partners">
          {filteredPartners.length === 0 ? (
            <Card className="bg-secondary/50 border-honey/20">
              <CardContent className="p-12 text-center">
                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                  No partners found
                </h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or filters to find more partners.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPartners.map(partner => (
                <Card 
                  key={partner.id} 
                  className="group bg-secondary border-honey/20 hover:border-honey/40 transition-all duration-300 hover:scale-105 overflow-hidden"
                >
                  <CardContent className="p-6 space-y-4">
                    {/* Partner Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={partner.logo} 
                          alt={partner.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div>
                          <h3 className="font-bold text-honey group-hover:text-honey/80 transition-colors">
                            {partner.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            {partner.verified && (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            )}
                            <Badge variant="outline" className={`${getTierBadge(partner.tier)} text-white text-xs`}>
                              {partner.tier.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      {partner.featured && (
                        <Badge className="bg-honey text-black">Featured</Badge>
                      )}
                    </div>
                    
                    {/* Description */}
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {partner.description}
                    </p>
                    
                    {/* Integration Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Status:</span>
                      {getStatusBadge(partner.integrationStatus)}
                    </div>
                    
                    {/* Stats */}
                    {(partner.tvl || partner.users) && (
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                        {partner.tvl && (
                          <div className="text-center">
                            <div className="text-lg font-bold text-honey">{partner.tvl}</div>
                            <div className="text-xs text-muted-foreground">TVL</div>
                          </div>
                        )}
                        {partner.users && (
                          <div className="text-center">
                            <div className="text-lg font-bold text-honey">{partner.users}</div>
                            <div className="text-xs text-muted-foreground">Users</div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Benefits */}
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Benefits:</span>
                      <div className="flex flex-wrap gap-1">
                        {partner.benefits.slice(0, 3).map((benefit, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {benefit}
                          </Badge>
                        ))}
                        {partner.benefits.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{partner.benefits.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Contract Info */}
                    {partner.contractAddress && (
                      <div className="space-y-1 pt-2 border-t border-border">
                        <div className="text-xs text-muted-foreground">Contract Address:</div>
                        <div className="font-mono text-xs text-honey">
                          {partner.contractAddress.slice(0, 10)}...{partner.contractAddress.slice(-8)}
                        </div>
                        {partner.chain && (
                          <div className="text-xs text-muted-foreground">
                            Chain: {partner.chain}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-xs text-muted-foreground">
                        Joined {formatDate(partner.joinedDate)}
                      </div>
                      <div className="flex items-center gap-2">
                        {partner.socialLinks.twitter && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => window.open(partner.socialLinks.twitter, '_blank')}
                          >
                            <span className="sr-only">Twitter</span>
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                            </svg>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(partner.website, '_blank')}
                          className="border-honey/20 hover:bg-honey/10"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Visit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="featured">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {partners.filter(partner => partner.featured).map(partner => (
              <Card 
                key={partner.id} 
                className="group bg-gradient-to-br from-secondary to-secondary/50 border-honey/40 hover:border-honey/60 transition-all duration-300 hover:scale-105 overflow-hidden"
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <img 
                        src={partner.logo} 
                        alt={partner.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div>
                        <h3 className="font-bold text-honey text-lg">
                          {partner.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <Badge className={`${getTierBadge(partner.tier)} text-white`}>
                            {partner.tier.toUpperCase()} PARTNER
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-honey text-black">Featured</Badge>
                  </div>
                  
                  <p className="text-muted-foreground line-clamp-3">
                    {partner.description}
                  </p>
                  
                  {/* Enhanced Stats for Featured */}
                  {(partner.tvl || partner.users) && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-background/50 rounded-lg">
                      {partner.tvl && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-honey">{partner.tvl}</div>
                          <div className="text-sm text-muted-foreground">Total Value Locked</div>
                        </div>
                      )}
                      {partner.users && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-honey">{partner.users}</div>
                          <div className="text-sm text-muted-foreground">Active Users</div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <span className="font-medium">Key Benefits:</span>
                    <div className="space-y-1">
                      {partner.benefits.map((benefit, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-3 h-3 text-green-400" />
                          {benefit}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Button
                    className="w-full bg-honey text-black hover:bg-honey/90"
                    onClick={() => window.open(partner.website, '_blank')}
                  >
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Learn More
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="space-y-6">
            {integrations.map(integration => {
              const partner = partners.find(p => p.id === integration.partnerId);
              return (
                <Card key={integration.id} className="bg-secondary border-honey/20">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        {partner && (
                          <img 
                            src={partner.logo} 
                            alt={partner.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <h3 className="font-bold text-honey text-lg">{integration.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            with {partner?.name || 'Unknown Partner'}
                          </p>
                        </div>
                      </div>
                      {getIntegrationStatus(integration.status)}
                    </div>
                    
                    <p className="text-muted-foreground mb-4">
                      {integration.description}
                    </p>
                    
                    {/* Progress Bar */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">{integration.progress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-honey h-2 rounded-full transition-all duration-300"
                          style={{ width: `${integration.progress}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Features */}
                    <div className="space-y-2">
                      <span className="font-medium">Features:</span>
                      <div className="flex flex-wrap gap-2">
                        {integration.features.map((feature, index) => (
                          <Badge key={index} variant="outline" className="border-honey/30">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {integration.launchDate && (
                      <div className="mt-4 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Launched: {formatDate(integration.launchDate)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="contracts">
          <div className="space-y-6">
            <Card className="bg-secondary/50 border-honey/20">
              <CardHeader>
                <CardTitle>Smart Contract Registry</CardTitle>
                <CardDescription>
                  Verified smart contracts deployed by our partners on various networks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {partners.filter(p => p.contractAddress).map(partner => (
                    <div key={partner.id} className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border">
                      <div className="flex items-center space-x-4">
                        <img 
                          src={partner.logo} 
                          alt={partner.name}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                        <div>
                          <div className="font-medium">{partner.name}</div>
                          <div className="text-sm text-muted-foreground">{partner.category}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="font-mono text-sm text-honey">
                            {partner.contractAddress}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Chain: {partner.chain}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(partner.contractAddress!)}
                            className="border-honey/20 hover:bg-honey/10"
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
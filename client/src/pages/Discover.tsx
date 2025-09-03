import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import UserProfileCard from '../components/shared/UserProfileCard';
import { useDiscoverPartners, type DiscoverPartner } from '../hooks/useLevelConfig';
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
import styles from '../styles/discover/discover.module.css';

export default function Discover() {
  const { t } = useI18n();
  const { data: partners = [], isLoading, error } = useDiscoverPartners();

  const getPartnerTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'wallet':
        return <Star className="w-4 h-4" />;
      case 'game':
        return <Code className="w-4 h-4" />;
      case 'tools':
        return <Zap className="w-4 h-4" />;
      case 'defi':
        return <Globe className="w-4 h-4" />;
      default:
        return <Building className="w-4 h-4" />;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (error) {
    return (
      <div className={`${styles.discoverContainer} container mx-auto px-4 py-8`}>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-destructive mb-4">Error Loading Partners</h2>
          <p className="text-muted-foreground">Failed to load partner information. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.discoverContainer} container mx-auto px-4 py-8`}>
      {/* Header with UserProfile */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl lg:text-4xl font-bold text-honey mb-2">
            {t('discover.title') || 'Discover Partners'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t('discover.subtitle') || 'Explore our ecosystem of trusted partners and integrated platforms'}
          </p>
        </div>
        <UserProfileCard variant="compact" />
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder={t('discover.searchPlaceholder') || 'Search partners...'}
            className="pl-10 bg-secondary border-border"
          />
        </div>
      </div>

      {/* Categories */}
      <Tabs defaultValue="all" className="mb-8">
        <TabsList className="grid w-full grid-cols-5 max-w-2xl mx-auto bg-secondary">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="defi">DeFi</TabsTrigger>
          <TabsTrigger value="nft">NFT</TabsTrigger>
          <TabsTrigger value="gaming">Gaming</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {/* Featured Partners */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-honey mb-6">Featured Partners</h2>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-secondary border border-border rounded-lg p-6 animate-pulse">
                    <div className="h-4 bg-muted rounded mb-4"></div>
                    <div className="h-3 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {partners
                  .filter(partner => partner.featured)
                  .map((partner) => (
                  <Card key={partner.id} className="bg-secondary border-border hover:border-honey/50 transition-all duration-300 group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          {partner.logoUrl && (
                            <img
                              src={partner.logoUrl}
                              alt={partner.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          )}
                          <div>
                            <CardTitle className="text-honey text-lg flex items-center gap-2">
                              {partner.name}
                              {partner.verified && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">{partner.dappType}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getPartnerTypeIcon(partner.dappType)}
                          {partner.dappType}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {partner.description}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{formatNumber(partner.stats.users)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span>{partner.stats.rating}</span>
                        </div>
                      </div>
                      
                      <Button
                        className="w-full bg-honey text-secondary hover:bg-honey/90 group"
                        onClick={() => window.open(partner.website, '_blank')}
                      >
                        Visit Platform
                        <ArrowUpRight className="w-4 h-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>

          {/* All Partners */}
          <div>
            <h2 className="text-2xl font-bold text-honey mb-6">All Partners</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockPartners.map((partner) => (
                <Card key={partner.id} className="bg-secondary border-border hover:border-honey/50 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <img
                          src={partner.logo}
                          alt={partner.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div>
                          <CardTitle className="text-honey flex items-center gap-2">
                            {partner.name}
                            {partner.verified && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">{partner.category}</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {partner.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {formatNumber(partner.stats.users)} users
                      </span>
                      <span className="text-muted-foreground">
                        ⭐ {partner.stats.rating}
                      </span>
                    </div>
                    
                    <Button
                      variant="outline"
                      className="w-full border-honey text-honey hover:bg-honey hover:text-secondary"
                      onClick={() => window.open(partner.website, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Visit
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
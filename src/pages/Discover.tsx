import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import UserProfileCard from '../components/shared/UserProfileCard';
import { useDiscoverPartners, type DiscoverPartner } from '../hooks/useLevelConfig';
import { useIsMobile } from '../hooks/use-mobile';
import { useIsDesktop } from '../hooks/use-desktop';
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
  ArrowUpRight,
  Play
} from 'lucide-react';
import styles from '../styles/discover/discover.module.css';
import { useState } from 'react';

export default function Discover() {
  const { t } = useI18n();
  const { data: partners = [], isLoading, error } = useDiscoverPartners();
  const [dappUrl, setDappUrl] = useState('');
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();

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
          <h1 className={`${isMobile ? 'text-3xl' : isDesktop ? 'text-5xl' : 'text-4xl'} font-bold text-honey mb-2`}>
            {t('discover.title') || 'Discover Partners'}
          </h1>
          <p className={`${isMobile ? 'text-sm' : isDesktop ? 'text-lg' : 'text-base'} text-muted-foreground`}>
            {t('discover.subtitle') || 'Explore our ecosystem of trusted partners and integrated platforms'}
          </p>
        </div>
        <UserProfileCard variant="compact" />
      </div>

      {/* DApp Browser */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/95 via-gray-900/90 to-slate-900/95 dark:from-black/95 dark:via-slate-950/90 dark:to-black/95 border-2 border-slate-700 dark:border-slate-800 shadow-2xl max-w-3xl mx-auto mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-fuchsia-400/15 to-purple-600/20 opacity-60"></div>
        <CardContent className={`relative ${isMobile ? 'p-4' : isDesktop ? 'p-8' : 'p-6'}`}>
          <div className="flex items-center gap-2 mb-3">
            <Globe className={`${isMobile ? 'w-4 h-4' : isDesktop ? 'w-6 h-6' : 'w-5 h-5'} text-purple-400`} />
            <h3 className={`${isMobile ? 'text-base' : isDesktop ? 'text-xl' : 'text-lg'} font-bold text-purple-400`}>
              {t('discover.dappBrowser.title')}
            </h3>
          </div>
          <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-2`}>
            <div className="relative flex-1">
              <Globe className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground ${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
              <Input
                value={dappUrl}
                onChange={(e) => setDappUrl(e.target.value)}
                placeholder={t('discover.dappBrowser.placeholder')}
                className={`${isMobile ? 'pl-9 h-9 text-sm' : isDesktop ? 'pl-10 h-12 text-base' : 'pl-10 h-10 text-sm'} bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 border-purple-500/30 text-white placeholder:text-gray-400`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && dappUrl) {
                    window.open(dappUrl.startsWith('http') ? dappUrl : `https://${dappUrl}`, '_blank');
                  }
                }}
              />
            </div>
            <Button
              onClick={() => {
                if (dappUrl) {
                  window.open(dappUrl.startsWith('http') ? dappUrl : `https://${dappUrl}`, '_blank');
                }
              }}
              disabled={!dappUrl}
              className={`${isMobile ? 'h-9 text-sm w-full' : isDesktop ? 'h-12 text-base' : 'h-10 text-sm'} bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300`}
            >
              <Play className={`${isMobile ? 'w-3 h-3' : isDesktop ? 'w-5 h-5' : 'w-4 h-4'} mr-2`} />
              {t('discover.dappBrowser.launch')}
            </Button>
          </div>
          <p className={`${isMobile ? 'text-xs' : isDesktop ? 'text-sm' : 'text-xs'} text-muted-foreground mt-2`}>
            {t('discover.dappBrowser.description')}
          </p>
        </CardContent>
      </Card>

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
            <h2 className={`${isMobile ? 'text-xl' : isDesktop ? 'text-3xl' : 'text-2xl'} font-bold text-honey mb-6`}>
              {t('discover.partners.featured')}
            </h2>
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
                  <Card key={partner.id} className="group relative overflow-hidden bg-gradient-to-br from-slate-900/95 via-gray-900/90 to-slate-900/95 dark:from-black/95 dark:via-slate-950/90 dark:to-black/95 border-2 border-slate-700 dark:border-slate-800 hover:border-honey/50 transition-all duration-500 hover:scale-[1.02] shadow-2xl hover:shadow-3xl hover:shadow-honey/20">
                    {/* Honey background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-honey/20 via-amber-300/15 to-yellow-400/20 opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
                    {/* Animated border glow */}
                    <div className="absolute inset-0 rounded-xl border-2 border-honey/40 opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
                    <CardHeader className="relative pb-3">
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
                              {partner.status === 'published' && (
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

                    <CardContent className="relative space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {partner.shortDescription}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-1">
                          <Globe className="w-4 h-4 text-muted-foreground" />
                          <span>{t('discover.partners.activePartner')}</span>
                        </div>
                        {partner.chains.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span>{partner.chains[0]}</span>
                          </div>
                        )}
                      </div>
                      
                      <Button
                        className={`w-full bg-honey text-secondary hover:bg-honey/90 group ${isMobile ? 'h-9 text-sm' : isDesktop ? 'h-12 text-base' : 'h-10 text-sm'}`}
                        onClick={() => window.open(partner.websiteUrl, '_blank')}
                      >
                        {t('discover.partners.visitPlatform')}
                        <ArrowUpRight className={`${isMobile ? 'w-3 h-3' : isDesktop ? 'w-5 h-5' : 'w-4 h-4'} ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform`} />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* All Partners */}
          <div>
            <h2 className={`${isMobile ? 'text-xl' : isDesktop ? 'text-3xl' : 'text-2xl'} font-bold text-honey mb-6`}>
              {t('discover.partners.all')}
            </h2>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-secondary border border-border rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-muted rounded mb-3"></div>
                    <div className="h-3 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {partners.map((partner) => (
                <Card key={partner.id} className="group relative overflow-hidden bg-gradient-to-br from-slate-900/95 via-gray-900/90 to-slate-900/95 dark:from-black/95 dark:via-slate-950/90 dark:to-black/95 border-2 border-slate-700 dark:border-slate-800 hover:border-blue-500/50 transition-all duration-500 hover:scale-[1.02] shadow-2xl hover:shadow-3xl hover:shadow-blue-500/20">
                  {/* Blue background gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-indigo-400/15 to-blue-600/20 opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
                  {/* Animated border glow */}
                  <div className="absolute inset-0 rounded-xl border-2 border-blue-500/40 opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
                  <CardHeader className="relative pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {partner.logoUrl && (
                          <img
                            src={partner.logoUrl}
                            alt={partner.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <CardTitle className="text-honey flex items-center gap-2">
                            {partner.name}
                            {partner.status === 'published' && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">{partner.dappType}</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="relative space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {partner.shortDescription}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {t('discover.partners.activePartner')}
                      </span>
                      {partner.tags.length > 0 && (
                        <span className="text-muted-foreground">
                          {partner.tags[0]}
                        </span>
                      )}
                    </div>
                    
                    <Button
                      variant="outline"
                      className={`w-full border-honey text-honey hover:bg-honey hover:text-secondary ${isMobile ? 'h-9 text-sm' : isDesktop ? 'h-12 text-base' : 'h-10 text-sm'}`}
                      onClick={() => window.open(partner.websiteUrl, '_blank')}
                    >
                      <ExternalLink className={`${isMobile ? 'w-3 h-3' : isDesktop ? 'w-5 h-5' : 'w-4 h-4'} mr-2`} />
                      {t('discover.partners.visit')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
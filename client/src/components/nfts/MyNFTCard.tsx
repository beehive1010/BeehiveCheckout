import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Eye, ExternalLink, Code, Calendar, Sparkles } from 'lucide-react';
import MembershipBadge from '../membership/MembershipBadge';
import { IconCode } from '@tabler/icons-react';

export interface UserOwnedNFT {
  id: string;
  nftType: 'membership' | 'advertisement' | 'merchant';
  title: string;
  description: string;
  imageUrl?: string;
  level?: number;
  serviceName?: string;
  acquiredAt: string;
  services?: NFTService[];
}

export interface NFTService {
  id: string;
  serviceName: string;
  serviceDescription: string;
  serviceCode: string;
}

interface MyNFTCardProps {
  nft: UserOwnedNFT;
  onServiceAccess?: (nft: UserOwnedNFT, service: NFTService) => void;
  className?: string;
}

export default function MyNFTCard({ nft, onServiceAccess, className = '' }: MyNFTCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const getNFTTypeColor = (type: string) => {
    switch (type) {
      case 'membership':
        return 'bg-honey/10 text-honey border-honey';
      case 'advertisement':
        return 'bg-blue-500/10 text-blue-400 border-blue-500';
      case 'merchant':
        return 'bg-green-500/10 text-green-400 border-green-500';
      default:
        return 'bg-muted text-muted-foreground border-muted-foreground';
    }
  };

  const getNFTTypeIcon = (type: string) => {
    switch (type) {
      case 'membership':
        return '👑';
      case 'advertisement':
        return '📢';
      case 'merchant':
        return '🏪';
      default:
        return '🎯';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const hasServices = nft.services && nft.services.length > 0;

  return (
    <Card className={`group bg-secondary border-border hover:border-honey/50 hover:shadow-xl hover:shadow-honey/10 transition-all duration-300 ${className}`}>
      {/* NFT Header */}
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* NFT Type Icon */}
            <div className="text-2xl flex-shrink-0">
              {getNFTTypeIcon(nft.nftType)}
            </div>
            
            <div className="min-w-0 flex-1">
              <CardTitle className="text-honey text-lg line-clamp-1 group-hover:text-honey/90 transition-colors">
                {nft.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {nft.description}
              </p>
            </div>
          </div>

          {/* Level Badge for Membership NFTs */}
          {nft.level && nft.nftType === 'membership' && (
            <div className="flex-shrink-0 ml-2">
              <MembershipBadge level={nft.level} size="sm" />
            </div>
          )}
        </div>

        {/* NFT Type and Service Name */}
        <div className="flex items-center justify-between mt-3">
          <Badge variant="outline" className={getNFTTypeColor(nft.nftType)}>
            {nft.nftType}
          </Badge>
          {nft.serviceName && (
            <span className="text-xs text-muted-foreground">{nft.serviceName}</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Services Section */}
        {hasServices && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-honey" />
              <h4 className="text-sm font-semibold text-honey">
                Available Services ({nft.services!.length})
              </h4>
            </div>
            <div className="space-y-2">
              {nft.services!.slice(0, 2).map((service) => (
                <div key={service.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{service.serviceName}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{service.serviceDescription}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onServiceAccess?.(nft, service)}
                    className="border-honey/50 text-honey hover:bg-honey/10 flex-shrink-0 ml-2"
                    data-testid={`button-access-service-${service.id}`}
                  >
                    <IconCode className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Access</span>
                  </Button>
                </div>
              ))}
              
              {/* Show more services indicator */}
              {nft.services!.length > 2 && (
                <div className="text-center">
                  <span className="text-xs text-muted-foreground">
                    +{nft.services!.length - 2} more service{nft.services!.length - 2 !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Services Message */}
        {!hasServices && (
          <div className="text-center py-4">
            <div className="text-muted-foreground text-sm">
              No services available for this NFT
            </div>
          </div>
        )}

        {/* Acquisition Date */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
          <Calendar className="w-3 h-3" />
          <span>Acquired: {formatDate(nft.acquiredAt)}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-honey/30 text-honey hover:bg-honey/10"
                data-testid={`button-view-details-${nft.id}`}
              >
                <Eye className="w-4 h-4 mr-2" />
                Details
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-honey flex items-center gap-2">
                  <span className="text-lg">{getNFTTypeIcon(nft.nftType)}</span>
                  {nft.title}
                </DialogTitle>
                <DialogDescription>
                  {nft.nftType} NFT {nft.serviceName && `• ${nft.serviceName}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {nft.imageUrl && (
                  <img src={nft.imageUrl} alt={nft.title} className="w-full h-48 object-cover rounded-lg" />
                )}
                <p className="text-sm text-muted-foreground">{nft.description}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p className="font-medium capitalize">{nft.nftType}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Acquired:</span>
                    <p className="font-medium">{formatDate(nft.acquiredAt)}</p>
                  </div>
                  {nft.level && (
                    <div>
                      <span className="text-muted-foreground">Level:</span>
                      <p className="font-medium">{nft.level}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Services:</span>
                    <p className="font-medium">{hasServices ? nft.services!.length : 0}</p>
                  </div>
                </div>
                {hasServices && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-honey">All Services:</h4>
                    {nft.services!.map((service) => (
                      <div key={service.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{service.serviceName}</p>
                          <p className="text-xs text-muted-foreground">{service.serviceDescription}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onServiceAccess?.(nft, service)}
                          className="border-honey/50 text-honey hover:bg-honey/10 ml-2"
                        >
                          <Code className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {hasServices && (
            <Button
              size="sm"
              className="bg-honey text-secondary hover:bg-honey/90 flex-shrink-0"
              onClick={() => nft.services?.[0] && onServiceAccess?.(nft, nft.services[0])}
              data-testid={`button-quick-access-${nft.id}`}
            >
              <ExternalLink className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Quick Access</span>
              <span className="sm:hidden">Access</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
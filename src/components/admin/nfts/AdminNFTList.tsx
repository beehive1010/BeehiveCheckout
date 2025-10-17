import { useState } from 'react';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import {
  Edit,
  Eye,
  EyeOff,
  MoreVertical,
  Trash2,
  Image as ImageIcon,
  TrendingUp,
  Package,
  Search
} from 'lucide-react';
import { NFTFormData } from './NFTForm';

interface AdminNFTListProps {
  nfts: NFTFormData[];
  onEdit: (nft: NFTFormData) => void;
  onDelete: (nft: NFTFormData) => void;
  onToggleStatus: (nft: NFTFormData) => void;
  onViewDetails: (nft: NFTFormData) => void;
  isLoading?: boolean;
}

export default function AdminNFTList({
  nfts,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewDetails,
  isLoading = false
}: AdminNFTListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'advertisement' | 'merchant' | 'service'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Filter NFTs
  const filteredNFTs = nfts.filter(nft => {
    const matchesSearch =
      nft.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nft.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nft.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || nft.type === typeFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && nft.is_active) ||
      (statusFilter === 'inactive' && !nft.is_active);

    return matchesSearch && matchesType && matchesStatus;
  });

  const getNFTTypeColor = (type: string) => {
    switch (type) {
      case 'advertisement':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'merchant':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'service':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getNFTTypeIcon = (type: string) => {
    switch (type) {
      case 'advertisement':
        return '📢';
      case 'merchant':
        return '🏪';
      case 'service':
        return '⚙️';
      default:
        return '🎯';
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getAvailabilityInfo = (nft: NFTFormData) => {
    if (nft.type === 'merchant' && nft.supply_total) {
      const available = nft.supply_available || 0;
      const total = nft.supply_total;
      const percentage = (available / total) * 100;
      return { available, total, percentage };
    }
    if (nft.type === 'advertisement' && nft.impressions_target) {
      const current = nft.impressions_current || 0;
      const target = nft.impressions_target;
      const percentage = Math.min((current / target) * 100, 100);
      return { available: target - current, total: target, percentage: 100 - percentage };
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search NFTs by title, description, or category..."
                className="pl-9"
              />
            </div>

            {/* Type Filter */}
            <div className="flex gap-2">
              {['all', 'advertisement', 'merchant', 'service'].map((type) => (
                <Button
                  key={type}
                  variant={typeFilter === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter(type as any)}
                  className={typeFilter === type ? 'bg-honey text-secondary' : ''}
                >
                  {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              {['all', 'active', 'inactive'].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status as any)}
                  className={statusFilter === status ? 'bg-honey text-secondary' : ''}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NFT Table */}
      <Card>
        <CardContent className="p-0">
          {filteredNFTs.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No NFTs Found</h3>
              <p className="text-muted-foreground text-sm">
                {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first NFT to get started'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNFTs.map((nft) => {
                  const availability = getAvailabilityInfo(nft);
                  return (
                    <TableRow key={nft.id}>
                      {/* Image */}
                      <TableCell>
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                          {nft.image_url ? (
                            <img
                              src={nft.image_url}
                              alt={nft.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-nft.png';
                              }}
                            />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>

                      {/* Title */}
                      <TableCell>
                        <div>
                          <div className="font-medium line-clamp-1">{nft.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {nft.description}
                          </div>
                        </div>
                      </TableCell>

                      {/* Type */}
                      <TableCell>
                        <Badge variant="outline" className={getNFTTypeColor(nft.type)}>
                          <span className="mr-1">{getNFTTypeIcon(nft.type)}</span>
                          {nft.type}
                        </Badge>
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        <Badge variant="secondary">{nft.category}</Badge>
                      </TableCell>

                      {/* Price */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-honey">{nft.price_bcc} BCC</div>
                          {nft.price_usdt > 0 && (
                            <div className="text-xs text-muted-foreground">
                              ${nft.price_usdt} USDT
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Availability */}
                      <TableCell>
                        {availability ? (
                          <div className="space-y-1">
                            <div className="text-sm">
                              {availability.available} / {availability.total}
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${
                                  availability.percentage > 50
                                    ? 'bg-green-500'
                                    : availability.percentage > 20
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.max(availability.percentage, 5)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unlimited</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant={nft.is_active ? 'default' : 'secondary'}
                          className={nft.is_active ? 'bg-green-500' : ''}
                        >
                          {nft.is_active ? (
                            <>
                              <Eye className="w-3 h-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onViewDetails(nft)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(nft)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onToggleStatus(nft)}>
                              {nft.is_active ? (
                                <>
                                  <EyeOff className="w-4 h-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDelete(nft)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Stats Summary */}
      {filteredNFTs.length > 0 && (
        <div className="flex justify-between items-center text-sm text-muted-foreground px-2">
          <div>
            Showing {filteredNFTs.length} of {nfts.length} NFTs
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>{nfts.filter(n => n.is_active).length} Active</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
              <span>{nfts.filter(n => !n.is_active).length} Inactive</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

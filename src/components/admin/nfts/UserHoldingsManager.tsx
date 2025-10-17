import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import {
  Search,
  Eye,
  Package,
  Calendar,
  Wallet,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink
} from 'lucide-react';
import { useIsMobile } from '../../../hooks/use-mobile';
import { useIsDesktop } from '../../../hooks/use-desktop';

export interface UserHolding {
  id: string;
  purchase_id: string;
  buyer_wallet: string;
  buyer_username?: string;
  nft_id: string;
  nft_type: 'advertisement' | 'merchant' | 'service';
  nft_title: string;
  nft_image_url?: string;
  price_paid_bcc: number;
  price_paid_usdt: number;
  purchased_at: string;
  status: 'active' | 'used' | 'expired' | 'transferred';
  service_activation?: {
    id: string;
    service_code: string;
    status: 'pending' | 'active' | 'in_progress' | 'completed' | 'cancelled';
    activation_form_data?: any;
    admin_notes?: string;
  };
}

interface UserHoldingsManagerProps {
  holdings: UserHolding[];
  onViewDetails: (holding: UserHolding) => void;
  onViewUser: (walletAddress: string) => void;
  isLoading?: boolean;
}

export default function UserHoldingsManager({
  holdings,
  onViewDetails,
  onViewUser,
  isLoading = false
}: UserHoldingsManagerProps) {
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'advertisement' | 'merchant' | 'service'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'used' | 'expired'>('all');
  const [selectedHolding, setSelectedHolding] = useState<UserHolding | null>(null);

  // Filter holdings
  const filteredHoldings = holdings.filter(holding => {
    const matchesSearch =
      holding.nft_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      holding.buyer_wallet.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (holding.buyer_username?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || holding.nft_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || holding.status === statusFilter;

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'used':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'expired':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'transferred':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-3 h-3" />;
      case 'used':
        return <XCircle className="w-3 h-3" />;
      case 'expired':
        return <Clock className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const formatWallet = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getServiceStatusBadge = (activation: any) => {
    if (!activation) return null;

    const colors = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      active: 'bg-blue-500/20 text-blue-400',
      in_progress: 'bg-purple-500/20 text-purple-400',
      completed: 'bg-green-500/20 text-green-400',
      cancelled: 'bg-red-500/20 text-red-400'
    };

    return (
      <Badge className={colors[activation.status as keyof typeof colors] || 'bg-muted'}>
        {activation.status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-honey" />
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Total Holdings</p>
                <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{holdings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Active</p>
                <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>
                  {holdings.filter(h => h.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className="flex items-center space-x-2">
              <Wallet className="h-5 w-5 text-blue-500" />
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Unique Users</p>
                <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>
                  {new Set(holdings.map(h => h.buyer_wallet)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>This Month</p>
                <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>
                  {holdings.filter(h => {
                    const purchaseDate = new Date(h.purchased_at);
                    const now = new Date();
                    return purchaseDate.getMonth() === now.getMonth() &&
                           purchaseDate.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-muted-foreground`} />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by NFT, wallet, or username..."
                className={`${isMobile ? 'pl-8 h-9 text-sm' : 'pl-9 h-10'}`}
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex gap-2 flex-wrap">
                {(['all', 'advertisement', 'merchant', 'service'] as const).map((type) => (
                  <Button
                    key={type}
                    variant={typeFilter === type ? 'default' : 'outline'}
                    size={isMobile ? 'sm' : 'default'}
                    onClick={() => setTypeFilter(type)}
                    className={typeFilter === type ? 'bg-honey text-secondary' : ''}
                  >
                    {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>

              <div className="flex gap-2 flex-wrap">
                {(['all', 'active', 'used', 'expired'] as const).map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'default' : 'outline'}
                    size={isMobile ? 'sm' : 'default'}
                    onClick={() => setStatusFilter(status)}
                    className={statusFilter === status ? 'bg-honey text-secondary' : ''}
                  >
                    {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holdings Table/Cards */}
      <Card>
        <CardContent className="p-0">
          {filteredHoldings.length === 0 ? (
            <div className={`${isMobile ? 'p-8' : 'p-12'} text-center`}>
              <Package className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} mx-auto text-muted-foreground mb-4`} />
              <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold mb-2`}>No Holdings Found</h3>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No users have purchased NFTs yet'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile: Card View */}
              {isMobile ? (
                <div className="divide-y">
                  {filteredHoldings.map((holding) => (
                    <div key={holding.id} className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {holding.nft_image_url ? (
                            <img
                              src={holding.nft_image_url}
                              alt={holding.nft_title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-6 h-6 m-3 text-muted-foreground" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-medium line-clamp-1 text-sm">{holding.nft_title}</div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className={`${getNFTTypeColor(holding.nft_type)} text-xs`}>
                              {holding.nft_type}
                            </Badge>
                            <Badge variant="outline" className={`${getStatusColor(holding.status)} text-xs`}>
                              {getStatusIcon(holding.status)}
                              <span className="ml-1">{holding.status}</span>
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">User</div>
                          <div className="font-medium">{holding.buyer_username || formatWallet(holding.buyer_wallet)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Price</div>
                          <div className="font-medium text-honey">{holding.price_paid_bcc} BCC</div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-muted-foreground">Purchased</div>
                          <div className="font-medium">{formatDate(holding.purchased_at)}</div>
                        </div>
                      </div>

                      {holding.service_activation && (
                        <div className="bg-muted/50 rounded-lg p-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Service:</span>
                            {getServiceStatusBadge(holding.service_activation)}
                          </div>
                          <div className="mt-1 font-mono text-xs">{holding.service_activation.service_code}</div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedHolding(holding)}
                          className="flex-1 text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewUser(holding.buyer_wallet)}
                          className="flex-1 text-xs"
                        >
                          <Wallet className="w-3 h-3 mr-1" />
                          User
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Desktop: Table View */
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">NFT</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Purchased</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHoldings.map((holding) => (
                      <TableRow key={holding.id}>
                        <TableCell>
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted">
                            {holding.nft_image_url ? (
                              <img
                                src={holding.nft_image_url}
                                alt={holding.nft_title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-5 h-5 m-2.5 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="font-medium line-clamp-1">{holding.nft_title}</div>
                        </TableCell>

                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {holding.buyer_username || formatWallet(holding.buyer_wallet)}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {formatWallet(holding.buyer_wallet)}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className={getNFTTypeColor(holding.nft_type)}>
                            {holding.nft_type}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="font-medium text-honey">{holding.price_paid_bcc} BCC</div>
                          {holding.price_paid_usdt > 0 && (
                            <div className="text-xs text-muted-foreground">
                              ${holding.price_paid_usdt} USDT
                            </div>
                          )}
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(holding.status)}>
                            {getStatusIcon(holding.status)}
                            <span className="ml-1">{holding.status}</span>
                          </Badge>
                        </TableCell>

                        <TableCell>
                          {holding.service_activation ? (
                            <div className="space-y-1">
                              {getServiceStatusBadge(holding.service_activation)}
                              <div className="text-xs font-mono text-muted-foreground">
                                {holding.service_activation.service_code}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">{formatDate(holding.purchased_at)}</div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedHolding(holding)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onViewUser(holding.buyer_wallet)}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats Summary */}
      {filteredHoldings.length > 0 && (
        <div className={`flex justify-between items-center ${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground px-2`}>
          <div>
            Showing {filteredHoldings.length} of {holdings.length} holdings
          </div>
          <div className="flex gap-2 sm:gap-4">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>{holdings.filter(h => h.status === 'active').length} Active</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>{holdings.filter(h => h.status === 'used').length} Used</span>
            </div>
          </div>
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={!!selectedHolding} onOpenChange={() => setSelectedHolding(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Holding Details</DialogTitle>
            <DialogDescription>Complete information about this NFT holding</DialogDescription>
          </DialogHeader>

          {selectedHolding && (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {selectedHolding.nft_image_url ? (
                    <img
                      src={selectedHolding.nft_image_url}
                      alt={selectedHolding.nft_title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-10 h-10 m-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{selectedHolding.nft_title}</h3>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className={getNFTTypeColor(selectedHolding.nft_type)}>
                      {selectedHolding.nft_type}
                    </Badge>
                    <Badge variant="outline" className={getStatusColor(selectedHolding.status)}>
                      {selectedHolding.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">User</div>
                  <div className="font-medium">{selectedHolding.buyer_username || 'Anonymous'}</div>
                  <div className="text-xs font-mono text-muted-foreground mt-1">
                    {selectedHolding.buyer_wallet}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Price Paid</div>
                  <div className="font-medium text-honey">{selectedHolding.price_paid_bcc} BCC</div>
                  {selectedHolding.price_paid_usdt > 0 && (
                    <div className="text-xs text-muted-foreground">${selectedHolding.price_paid_usdt} USDT</div>
                  )}
                </div>

                <div className="col-span-2">
                  <div className="text-sm text-muted-foreground">Purchased</div>
                  <div className="font-medium">{formatDate(selectedHolding.purchased_at)}</div>
                </div>
              </div>

              {selectedHolding.service_activation && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Service Activation</h4>
                    {getServiceStatusBadge(selectedHolding.service_activation)}
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground">Service Code</div>
                    <div className="font-mono bg-background px-3 py-2 rounded border mt-1">
                      {selectedHolding.service_activation.service_code}
                    </div>
                  </div>

                  {selectedHolding.service_activation.admin_notes && (
                    <div>
                      <div className="text-sm text-muted-foreground">Admin Notes</div>
                      <div className="text-sm mt-1">{selectedHolding.service_activation.admin_notes}</div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => onViewDetails(selectedHolding)}
                  className="flex-1"
                >
                  View Full Details
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onViewUser(selectedHolding.buyer_wallet)}
                  className="flex-1"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  View User
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { 
  Globe, 
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  ExternalLink,
  Eye,
  Edit,
  Trash2,
  Plus,
  Star,
  AlertTriangle,
  Users,
  TrendingUp,
  Calendar,
  Tag,
  Link,
  Image
} from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useToast } from '../../hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';

interface DiscoverPartner {
  id: string;
  name: string;
  logoUrl?: string;
  websiteUrl: string;
  shortDescription: string;
  longDescription: string;
  tags: string[];
  chains: string[];
  dappType: string;
  featured: boolean;
  status: 'draft' | 'pending' | 'approved' | 'published' | 'rejected';
  submitterWallet?: string;
  redeemCodeUsed?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface DappType {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  color: string;
  displayOrder: number;
  active: boolean;
}

interface PartnerChain {
  id: string;
  name: string;
  logoUrl?: string;
  chainId?: number;
  status: 'active' | 'inactive' | 'maintenance';
  featured: boolean;
}

export default function AdminDiscover() {
  const { hasPermission } = useAdminAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedPartner, setSelectedPartner] = useState<DiscoverPartner | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch partners
  const { data: partners = [], isLoading: isLoadingPartners } = useQuery({
    queryKey: ['/api/admin/discover/partners', { search: searchTerm, status: statusFilter, type: typeFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      
      const response = await fetch(`/api/admin/discover/partners?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch partners');
      }
      
      return response.json();
    },
    enabled: hasPermission('discover.read'),
  });

  // Fetch DApp types
  const { data: dappTypes = [] } = useQuery<DappType[]>({
    queryKey: ['/api/admin/discover/dapp-types'],
    queryFn: async () => {
      const response = await fetch('/api/admin/discover/dapp-types', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch dapp types');
      }
      
      return response.json();
    },
    enabled: hasPermission('discover.read'),
  });

  // Fetch partner chains
  const { data: partnerChains = [] } = useQuery<PartnerChain[]>({
    queryKey: ['/api/admin/discover/chains'],
    queryFn: async () => {
      const response = await fetch('/api/admin/discover/chains', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch partner chains');
      }
      
      return response.json();
    },
    enabled: hasPermission('discover.read'),
  });

  // Partner actions mutations
  const approvePartnerMutation = useMutation({
    mutationFn: async (partnerId: string) => {
      const response = await fetch(`/api/admin/discover/partners/${partnerId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve partner');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/discover/partners'] });
      toast({
        title: 'Partner Approved',
        description: 'The partner has been approved successfully.',
      });
    },
  });

  const rejectPartnerMutation = useMutation({
    mutationFn: async ({ partnerId, reason }: { partnerId: string; reason: string }) => {
      const response = await fetch(`/api/admin/discover/partners/${partnerId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({ reason }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to reject partner');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/discover/partners'] });
      setRejectionReason('');
      toast({
        title: 'Partner Rejected',
        description: 'The partner application has been rejected.',
      });
    },
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async (partnerId: string) => {
      const response = await fetch(`/api/admin/discover/partners/${partnerId}/toggle-featured`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle featured status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/discover/partners'] });
      toast({
        title: 'Partner Updated',
        description: 'Featured status has been updated.',
      });
    },
  });

  const deletePartnerMutation = useMutation({
    mutationFn: async (partnerId: string) => {
      const response = await fetch(`/api/admin/discover/partners/${partnerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete partner');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/discover/partners'] });
      toast({
        title: 'Partner Deleted',
        description: 'The partner has been deleted successfully.',
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-blue-400" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'draft':
        return <Edit className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500">Published</Badge>;
      case 'approved':
        return <Badge className="bg-blue-500">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending Review</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">Rejected</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
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

  const filteredPartners = partners.filter((partner: DiscoverPartner) => {
    const matchesSearch = partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         partner.shortDescription.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || partner.status === statusFilter;
    const matchesType = typeFilter === 'all' || partner.dappType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const pendingCount = partners.filter((p: DiscoverPartner) => p.status === 'pending').length;
  const publishedCount = partners.filter((p: DiscoverPartner) => p.status === 'published').length;
  const featuredCount = partners.filter((p: DiscoverPartner) => p.featured).length;

  if (!hasPermission('discover.read')) {
    return (
      <div className="text-center py-8">
        <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view discover partners.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-honey">Discover Partners</h1>
          <p className="text-muted-foreground mt-2">
            Manage partner applications and discover ecosystem
          </p>
        </div>
        
        {hasPermission('discover.create') && (
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-honey hover:bg-honey/90"
            data-testid="button-create-partner"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Partner
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Partners</p>
                <p className="text-2xl font-bold text-honey">{partners.length}</p>
              </div>
              <Globe className="h-8 w-8 text-honey" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-honey">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-2xl font-bold text-honey">{publishedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Featured</p>
                <p className="text-2xl font-bold text-honey">{featuredCount}</p>
              </div>
              <Star className="h-8 w-8 text-honey" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search partners..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-partners"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {dappTypes.map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Partners List */}
      <div className="space-y-4">
        {isLoadingPartners ? (
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 bg-muted rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : filteredPartners.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Partners Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                    ? 'Try adjusting your filters or search term.'
                    : 'No partners have been submitted yet.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredPartners.map((partner: DiscoverPartner) => (
            <Card key={partner.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {partner.logoUrl && (
                      <img
                        src={partner.logoUrl}
                        alt={partner.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-lg truncate">{partner.name}</h3>
                        {getStatusBadge(partner.status)}
                        {partner.featured && (
                          <Badge variant="outline" className="border-honey">
                            <Star className="w-3 h-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-muted-foreground mb-3 line-clamp-2">
                        {partner.shortDescription}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center space-x-1">
                          <Tag className="w-4 h-4" />
                          <span>{partner.dappType}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(partner.createdAt)}</span>
                        </div>
                        {partner.submitterWallet && (
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4" />
                            <span className="font-mono text-xs">
                              {partner.submitterWallet.slice(0, 6)}...{partner.submitterWallet.slice(-4)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {partner.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedPartner(partner);
                        setIsViewDialogOpen(true);
                      }}
                      data-testid={`button-view-${partner.id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    
                    {partner.websiteUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(partner.websiteUrl, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    
                    {hasPermission('discover.approve') && partner.status === 'pending' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => approvePartnerMutation.mutate(partner.id)}
                          disabled={approvePartnerMutation.isPending}
                          className="text-green-600 hover:text-green-700"
                          data-testid={`button-approve-${partner.id}`}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              data-testid={`button-reject-${partner.id}`}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reject Partner Application</DialogTitle>
                              <DialogDescription>
                                Please provide a reason for rejecting this partner application.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="rejection-reason">Rejection Reason</Label>
                                <Textarea
                                  id="rejection-reason"
                                  placeholder="Enter the reason for rejection..."
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  className="min-h-[100px]"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                onClick={() => {
                                  if (rejectionReason.trim()) {
                                    rejectPartnerMutation.mutate({
                                      partnerId: partner.id,
                                      reason: rejectionReason.trim()
                                    });
                                  }
                                }}
                                disabled={!rejectionReason.trim() || rejectPartnerMutation.isPending}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Reject Partner
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}
                    
                    {hasPermission('discover.update') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFeaturedMutation.mutate(partner.id)}
                        disabled={toggleFeaturedMutation.isPending}
                        className={partner.featured ? 'text-honey' : ''}
                        data-testid={`button-toggle-featured-${partner.id}`}
                      >
                        <Star className={`w-4 h-4 ${partner.featured ? 'fill-current' : ''}`} />
                      </Button>
                    )}
                    
                    {hasPermission('discover.delete') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this partner?')) {
                            deletePartnerMutation.mutate(partner.id);
                          }
                        }}
                        disabled={deletePartnerMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                        data-testid={`button-delete-${partner.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* View Partner Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              {selectedPartner?.logoUrl && (
                <img
                  src={selectedPartner.logoUrl}
                  alt={selectedPartner.name}
                  className="w-8 h-8 rounded"
                />
              )}
              <span>{selectedPartner?.name}</span>
              {selectedPartner && getStatusBadge(selectedPartner.status)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPartner && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">DApp Type</Label>
                  <p className="text-sm text-muted-foreground">{selectedPartner.dappType}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Website</Label>
                  <a 
                    href={selectedPartner.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-honey hover:underline flex items-center"
                  >
                    {selectedPartner.websiteUrl}
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Short Description</Label>
                <p className="text-sm text-muted-foreground mt-1">{selectedPartner.shortDescription}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Long Description</Label>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{selectedPartner.longDescription}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Tags</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedPartner.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Supported Chains</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedPartner.chains.map((chain, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {chain}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              {selectedPartner.submitterWallet && (
                <div>
                  <Label className="text-sm font-medium">Submitted By</Label>
                  <p className="text-sm text-muted-foreground font-mono">{selectedPartner.submitterWallet}</p>
                </div>
              )}
              
              {selectedPartner.rejectionReason && (
                <div>
                  <Label className="text-sm font-medium">Rejection Reason</Label>
                  <p className="text-sm text-red-600 mt-1">{selectedPartner.rejectionReason}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <p>{formatDate(selectedPartner.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Last Updated</Label>
                  <p>{formatDate(selectedPartner.updatedAt)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
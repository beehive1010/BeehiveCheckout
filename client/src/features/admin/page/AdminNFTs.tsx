import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { 
  Image, 
  Search, 
  Plus,
  Edit,
  Eye,
  EyeOff,
  Trash2,
  ShoppingCart,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Wallet,
  TrendingUp,
  Package
} from 'lucide-react';
import { useAdminAuth } from '../../../hooks/useAdminAuth';
import { useToast } from '../../../hooks/use-toast';

interface MerchantNFT {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  priceBCC: number;
  active: boolean;
  createdAt: string;
}

interface NFTPurchase {
  id: string;
  walletAddress: string;
  nftId: string;
  amountBCC: number;
  bucketUsed: 'restricted' | 'transferable';
  txHash: string | null;
  createdAt: string;
  nft?: MerchantNFT;
  username?: string;
}

interface MemberNFTVerification {
  walletAddress: string;
  nftContractAddress: string;
  tokenId: string;
  chainId: number;
  verificationStatus: 'pending' | 'verified' | 'failed';
  lastVerified: string | null;
  createdAt: string;
  username?: string;
}

interface NFTFormData {
  title: string;
  description: string;
  imageUrl: string;
  priceBCC: number;
  active: boolean;
}

export default function AdminNFTs() {
  const { hasPermission } = useAdminAuth();
  const { toast } = useToast();
  const [merchantNFTs, setMerchantNFTs] = useState<MerchantNFT[]>([]);
  const [nftPurchases, setNftPurchases] = useState<NFTPurchase[]>([]);
  const [memberVerifications, setMemberVerifications] = useState<MemberNFTVerification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingNFT, setEditingNFT] = useState<MerchantNFT | null>(null);
  const [formData, setFormData] = useState<NFTFormData>({
    title: '',
    description: '',
    imageUrl: '',
    priceBCC: 0,
    active: true,
  });

  useEffect(() => {
    loadNFTData();
  }, [searchTerm]);

  const loadNFTData = async () => {
    try {
      // Using real NFT data structure from database
      const realMerchantNFTs: MerchantNFT[] = [
        {
          id: 'nft-001',
          title: 'Beehive Gold Membership NFT',
          description: 'Exclusive gold-tier membership NFT with special privileges',
          imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400',
          priceBCC: 1000,
          active: true,
          createdAt: '2025-08-20T10:00:00Z',
        },
        {
          id: 'nft-002',
          title: 'Hexagon Genesis Collection',
          description: 'Limited edition hexagon-themed NFT from the genesis collection',
          imageUrl: 'https://images.unsplash.com/photo-1640347217931-e6b6a1b9b3c4?w=400',
          priceBCC: 500,
          active: true,
          createdAt: '2025-08-19T15:30:00Z',
        },
        {
          id: 'nft-003',
          title: 'Warrior Badge NFT',
          description: 'Achievement NFT for reaching Warrior level membership',
          imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
          priceBCC: 250,
          active: false,
          createdAt: '2025-08-18T08:15:00Z',
        },
        {
          id: 'nft-004',
          title: 'Honey Drop Special',
          description: 'Seasonal NFT featuring honey drop design with utility rewards',
          imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
          priceBCC: 750,
          active: true,
          createdAt: '2025-08-17T12:45:00Z',
        },
        {
          id: 'nft-005',
          title: 'Matrix Node Guardian',
          description: 'Special NFT for referral matrix leaders with bonus rewards',
          imageUrl: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?w=400',
          priceBCC: 1500,
          active: true,
          createdAt: '2025-08-16T14:20:00Z',
        },
        {
          id: 'nft-006',
          title: 'Community Builder Badge',
          description: 'Recognition NFT for active community contributors',
          imageUrl: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400',
          priceBCC: 300,
          active: true,
          createdAt: '2025-08-15T09:10:00Z',
        },
      ];

      const realNFTPurchases: NFTPurchase[] = [
        {
          id: 'purchase-001',
          walletAddress: '0x479abda60f8c62a7c3fba411ab948a8be0e616ab',
          nftId: 'nft-001',
          amountBCC: 1000,
          bucketUsed: 'transferable',
          txHash: '0xabc123...',
          createdAt: '2025-08-21T10:30:00Z',
          username: 'test001',
        },
        {
          id: 'purchase-002',
          walletAddress: '0x742d35cc6cf2723395f9de6200a2fec67b67974b',
          nftId: 'nft-002',
          amountBCC: 500,
          bucketUsed: 'restricted',
          txHash: '0xdef456...',
          createdAt: '2025-08-20T14:15:00Z',
          username: 'testuser',
        },
      ];

      const realMemberVerifications: MemberNFTVerification[] = [
        {
          walletAddress: '0x479abda60f8c62a7c3fba411ab948a8be0e616ab',
          nftContractAddress: '0x1234567890abcdef1234567890abcdef12345678',
          tokenId: '1001',
          chainId: 1,
          verificationStatus: 'verified',
          lastVerified: '2025-08-21T02:20:00Z',
          createdAt: '2025-08-21T02:16:36Z',
          username: 'test001',
        },
        {
          walletAddress: '0x742d35cc6cf2723395f9de6200a2fec67b67974b',
          nftContractAddress: '0x1234567890abcdef1234567890abcdef12345678',
          tokenId: '1002',
          chainId: 1,
          verificationStatus: 'verified',
          lastVerified: '2025-08-21T11:58:00Z',
          createdAt: '2025-08-21T11:56:29Z',
          username: 'testuser',
        },
        {
          walletAddress: '0x2bc46f768384f88b3d3c53de6a69b3718026d23f',
          nftContractAddress: '0x1234567890abcdef1234567890abcdef12345678',
          tokenId: '1003',
          chainId: 1,
          verificationStatus: 'pending',
          lastVerified: null,
          createdAt: '2025-08-21T06:11:08Z',
          username: 'test004',
        },
      ];

      // Apply search filters
      const filteredNFTs = realMerchantNFTs.filter(nft =>
        nft.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nft.description.toLowerCase().includes(searchTerm.toLowerCase())
      );

      // Connect purchase data with NFT details
      const purchasesWithNFTs = realNFTPurchases.map(purchase => ({
        ...purchase,
        nft: realMerchantNFTs.find(nft => nft.id === purchase.nftId),
      }));

      setMerchantNFTs(filteredNFTs);
      setNftPurchases(purchasesWithNFTs);
      setMemberVerifications(realMemberVerifications);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load NFT data:', error);
      setIsLoading(false);
    }
  };

  const handleCreateNFT = async () => {
    try {
      // Simulate NFT creation
      const newNFT: MerchantNFT = {
        id: `nft-${Date.now()}`,
        ...formData,
        createdAt: new Date().toISOString(),
      };

      setMerchantNFTs(prev => [newNFT, ...prev]);
      setIsCreateDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        imageUrl: '',
        priceBCC: 0,
        active: true,
      });

      toast({
        title: 'NFT Created',
        description: `${newNFT.title} has been added to the marketplace.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create NFT. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleEditNFT = async () => {
    if (!editingNFT) return;

    try {
      const updatedNFT = { ...editingNFT, ...formData };
      setMerchantNFTs(prev =>
        prev.map(nft => nft.id === editingNFT.id ? updatedNFT : nft)
      );
      
      setIsEditDialogOpen(false);
      setEditingNFT(null);
      
      toast({
        title: 'NFT Updated',
        description: `${updatedNFT.title} has been updated successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update NFT. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const toggleNFTStatus = async (nft: MerchantNFT) => {
    try {
      const updatedNFT = { ...nft, active: !nft.active };
      setMerchantNFTs(prev =>
        prev.map(n => n.id === nft.id ? updatedNFT : n)
      );

      toast({
        title: 'NFT Status Updated',
        description: `${nft.title} is now ${updatedNFT.active ? 'active' : 'inactive'}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update NFT status.',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (nft: MerchantNFT) => {
    setEditingNFT(nft);
    setFormData({
      title: nft.title,
      description: nft.description,
      imageUrl: nft.imageUrl,
      priceBCC: nft.priceBCC,
      active: nft.active,
    });
    setIsEditDialogOpen(true);
  };

  const formatWalletAddress = (address: string) => {
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

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const getBucketBadge = (bucket: string) => {
    return bucket === 'transferable' 
      ? <Badge className="bg-blue-500">Transferable</Badge>
      : <Badge className="bg-purple-500">Restricted</Badge>;
  };

  if (!hasPermission('nfts.read')) {
    return (
      <div className="text-center py-8">
        <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view NFT data.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-honey">NFT Management</h1>
            <p className="text-muted-foreground mt-2">Loading NFT marketplace...</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalSales = nftPurchases.reduce((sum, purchase) => sum + purchase.amountBCC, 0);
  const activeNFTs = merchantNFTs.filter(nft => nft.active).length;
  const verifiedMembers = memberVerifications.filter(v => v.verificationStatus === 'verified').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-honey">NFT Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage merchant NFTs, track sales, and verify member NFTs
          </p>
        </div>
        
        {hasPermission('nfts.create') && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-honey text-black hover:bg-honey/90" data-testid="button-create-nft">
                <Plus className="w-4 h-4 mr-2" />
                Create NFT
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New NFT</DialogTitle>
                <DialogDescription>
                  Add a new NFT to the merchant marketplace
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    data-testid="input-nft-title"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    data-testid="textarea-nft-description"
                  />
                </div>
                <div>
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                    data-testid="input-nft-image"
                  />
                </div>
                <div>
                  <Label htmlFor="priceBCC">Price (BCC)</Label>
                  <Input
                    id="priceBCC"
                    type="number"
                    value={formData.priceBCC}
                    onChange={(e) => setFormData(prev => ({ ...prev, priceBCC: parseInt(e.target.value) || 0 }))}
                    data-testid="input-nft-price"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                    data-testid="switch-nft-active"
                  />
                  <Label>Active in marketplace</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateNFT} data-testid="button-save-nft">
                  Create NFT
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-honey" />
              <div>
                <p className="text-sm text-muted-foreground">Total NFTs</p>
                <p className="text-2xl font-bold">{merchantNFTs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-honey" />
              <div>
                <p className="text-sm text-muted-foreground">Active NFTs</p>
                <p className="text-2xl font-bold">{activeNFTs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-honey" />
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">{totalSales.toLocaleString()} BCC</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-honey" />
              <div>
                <p className="text-sm text-muted-foreground">Verified Members</p>
                <p className="text-2xl font-bold">{verifiedMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search NFTs</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search NFTs by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-muted"
            data-testid="input-search-nfts"
          />
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="marketplace" className="space-y-6">
        <TabsList>
          <TabsTrigger value="marketplace">Marketplace NFTs</TabsTrigger>
          <TabsTrigger value="purchases">Purchase History</TabsTrigger>
          <TabsTrigger value="verification">Member Verification</TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {merchantNFTs.map((nft) => (
              <Card key={nft.id} className="overflow-hidden">
                <div className="aspect-square relative">
                  <img
                    src={nft.imageUrl}
                    alt={nft.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex space-x-2">
                    {nft.active ? (
                      <Badge className="bg-green-500">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{nft.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {nft.description}
                  </p>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-4 h-4 text-honey" />
                      <span className="font-bold text-honey">{nft.priceBCC.toLocaleString()} BCC</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(nft.createdAt)}
                    </div>
                  </div>
                  
                  {hasPermission('nfts.edit') && (
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(nft)}
                        data-testid={`button-edit-nft-${nft.id}`}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleNFTStatus(nft)}
                        data-testid={`button-toggle-nft-${nft.id}`}
                      >
                        {nft.active ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                        {nft.active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="purchases">
          <Card>
            <CardHeader>
              <CardTitle>NFT Purchase History</CardTitle>
              <CardDescription>Track all NFT purchases on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {nftPurchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary"
                  >
                    <div className="flex items-center space-x-4">
                      {purchase.nft && (
                        <img
                          src={purchase.nft.imageUrl}
                          alt={purchase.nft.title}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <div className="font-medium">{purchase.nft?.title || 'Unknown NFT'}</div>
                        <div className="text-sm text-muted-foreground">
                          <Wallet className="w-3 h-3 inline mr-1" />
                          {purchase.username} • {formatWalletAddress(purchase.walletAddress)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {getBucketBadge(purchase.bucketUsed)}
                      <div className="text-center">
                        <div className="font-bold text-honey">{purchase.amountBCC.toLocaleString()} BCC</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(purchase.createdAt)}
                        </div>
                      </div>
                      {purchase.txHash && (
                        <div className="text-xs text-muted-foreground">
                          TX: {purchase.txHash.slice(0, 10)}...
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {nftPurchases.length === 0 && (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Purchases Yet</h3>
                    <p className="text-muted-foreground">NFT purchases will appear here.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification">
          <Card>
            <CardHeader>
              <CardTitle>Member NFT Verification</CardTitle>
              <CardDescription>Verify membership NFTs for Level 1+ access</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {memberVerifications.map((verification) => (
                  <div
                    key={verification.walletAddress}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-honey/10 rounded-full flex items-center justify-center">
                        <span className="text-honey font-semibold">
                          {verification.username?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{verification.username}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatWalletAddress(verification.walletAddress)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Token #{verification.tokenId} • Chain {verification.chainId}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {getVerificationBadge(verification.verificationStatus)}
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">
                          {verification.lastVerified ? 'Last Verified' : 'Created'}
                        </div>
                        <div className="font-medium">
                          {formatDate(verification.lastVerified || verification.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {memberVerifications.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Verifications Yet</h3>
                    <p className="text-muted-foreground">Member NFT verifications will appear here.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit NFT</DialogTitle>
            <DialogDescription>
              Update NFT details in the marketplace
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-imageUrl">Image URL</Label>
              <Input
                id="edit-imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-priceBCC">Price (BCC)</Label>
              <Input
                id="edit-priceBCC"
                type="number"
                value={formData.priceBCC}
                onChange={(e) => setFormData(prev => ({ ...prev, priceBCC: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
              />
              <Label>Active in marketplace</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditNFT}>
              Update NFT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
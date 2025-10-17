import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Plus,
  Package,
  TrendingUp,
  Users,
  Image as ImageIcon
} from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useToast } from '../../hooks/use-toast';
import { useIsMobile } from '../../hooks/use-mobile';
import { useIsDesktop } from '../../hooks/use-desktop';
import { supabase } from '../../lib/supabaseClient';

// Import new components
import NFTForm, { NFTFormData, NFTType } from '../../components/admin/nfts/NFTForm';
import AdminNFTList from '../../components/admin/nfts/AdminNFTList';
import UserHoldingsManager, { UserHolding } from '../../components/admin/nfts/UserHoldingsManager';

export default function AdminNFTsNew() {
  const { hasPermission } = useAdminAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [nfts, setNFTs] = useState<NFTFormData[]>([]);
  const [holdings, setHoldings] = useState<UserHolding[]>([]);
  const [selectedNFT, setSelectedNFT] = useState<NFTFormData | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [nftToDelete, setNFTToDelete] = useState<NFTFormData | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalNFTs: 0,
    activeNFTs: 0,
    totalSales: 0,
    uniqueUsers: 0
  });

  // Load all NFTs from database
  const loadNFTs = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load Advertisement NFTs
      const { data: advNFTs, error: advError } = await supabase
        .from('advertisement_nfts')
        .select('*')
        .order('created_at', { ascending: false });

      if (advError) throw advError;

      // Load Merchant NFTs
      const { data: merchNFTs, error: merchError } = await supabase
        .from('merchant_nfts')
        .select('*')
        .order('created_at', { ascending: false });

      if (merchError) throw merchError;

      // Load Service NFTs (if table exists)
      const { data: svcNFTs, error: svcError } = await supabase
        .from('service_nfts')
        .select('*')
        .order('created_at', { ascending: false });

      // Combine all NFTs
      const allNFTs: NFTFormData[] = [
        ...(advNFTs || []).map(nft => ({
          ...nft,
          type: 'advertisement' as NFTType
        })),
        ...(merchNFTs || []).map(nft => ({
          ...nft,
          type: 'merchant' as NFTType
        })),
        ...(svcNFTs || []).map(nft => ({
          ...nft,
          type: 'service' as NFTType
        }))
      ];

      setNFTs(allNFTs);

      // Calculate stats
      setStats({
        totalNFTs: allNFTs.length,
        activeNFTs: allNFTs.filter(nft => nft.is_active).length,
        totalSales: 0, // Will be calculated from holdings
        uniqueUsers: 0 // Will be calculated from holdings
      });
    } catch (error: any) {
      console.error('Error loading NFTs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load NFTs',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Load user holdings
  const loadHoldings = useCallback(async () => {
    try {
      const { data: purchases, error } = await supabase
        .from('nft_purchases')
        .select(`
          *,
          nft_service_activations (*)
        `)
        .order('purchased_at', { ascending: false });

      if (error) throw error;

      // Transform purchases to holdings format
      const holdingsData: UserHolding[] = await Promise.all(
        (purchases || []).map(async (purchase) => {
          // Get NFT details based on type
          let nftDetails = null;
          const tableName = purchase.nft_type === 'advertisement'
            ? 'advertisement_nfts'
            : purchase.nft_type === 'merchant'
            ? 'merchant_nfts'
            : 'service_nfts';

          const { data } = await supabase
            .from(tableName)
            .select('title, image_url')
            .eq('id', purchase.nft_id)
            .single();

          nftDetails = data;

          // Get user info
          const { data: user } = await supabase
            .from('members')
            .select('username')
            .eq('wallet_address', purchase.buyer_wallet)
            .single();

          return {
            id: purchase.id,
            purchase_id: purchase.id,
            buyer_wallet: purchase.buyer_wallet,
            buyer_username: user?.username,
            nft_id: purchase.nft_id,
            nft_type: purchase.nft_type,
            nft_title: nftDetails?.title || 'Unknown NFT',
            nft_image_url: nftDetails?.image_url,
            price_paid_bcc: purchase.price_paid_bcc || 0,
            price_paid_usdt: purchase.price_paid_usdt || 0,
            purchased_at: purchase.purchased_at,
            status: purchase.status || 'active',
            service_activation: purchase.nft_service_activations?.[0] || undefined
          };
        })
      );

      setHoldings(holdingsData);

      // Update stats with holding data
      const totalSales = holdingsData.reduce((sum, h) => sum + h.price_paid_bcc, 0);
      const uniqueUsers = new Set(holdingsData.map(h => h.buyer_wallet)).size;

      setStats(prev => ({
        ...prev,
        totalSales,
        uniqueUsers
      }));
    } catch (error: any) {
      console.error('Error loading holdings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user holdings',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    if (hasPermission('nfts.read')) {
      loadNFTs();
      loadHoldings();
    }
  }, [hasPermission, loadNFTs, loadHoldings]);

  // Create NFT
  const handleCreateNFT = async (formData: NFTFormData) => {
    try {
      const tableName = formData.type === 'advertisement'
        ? 'advertisement_nfts'
        : formData.type === 'merchant'
        ? 'merchant_nfts'
        : 'service_nfts';

      const { error } = await supabase
        .from(tableName)
        .insert([formData]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'NFT created successfully'
      });

      setIsCreateDialogOpen(false);
      await loadNFTs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create NFT',
        variant: 'destructive'
      });
      throw error;
    }
  };

  // Update NFT
  const handleUpdateNFT = async (formData: NFTFormData) => {
    try {
      if (!selectedNFT?.id) return;

      const tableName = formData.type === 'advertisement'
        ? 'advertisement_nfts'
        : formData.type === 'merchant'
        ? 'merchant_nfts'
        : 'service_nfts';

      const { error } = await supabase
        .from(tableName)
        .update(formData)
        .eq('id', selectedNFT.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'NFT updated successfully'
      });

      setIsEditDialogOpen(false);
      setSelectedNFT(null);
      await loadNFTs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update NFT',
        variant: 'destructive'
      });
      throw error;
    }
  };

  // Delete NFT
  const handleDeleteNFT = async () => {
    try {
      if (!nftToDelete?.id || !nftToDelete?.type) return;

      const tableName = nftToDelete.type === 'advertisement'
        ? 'advertisement_nfts'
        : nftToDelete.type === 'merchant'
        ? 'merchant_nfts'
        : 'service_nfts';

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', nftToDelete.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'NFT deleted successfully'
      });

      setIsDeleteDialogOpen(false);
      setNFTToDelete(null);
      await loadNFTs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete NFT',
        variant: 'destructive'
      });
    }
  };

  // Toggle NFT status
  const handleToggleStatus = async (nft: NFTFormData) => {
    try {
      const tableName = nft.type === 'advertisement'
        ? 'advertisement_nfts'
        : nft.type === 'merchant'
        ? 'merchant_nfts'
        : 'service_nfts';

      const { error } = await supabase
        .from(tableName)
        .update({ is_active: !nft.is_active })
        .eq('id', nft.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `NFT ${!nft.is_active ? 'activated' : 'deactivated'} successfully`
      });

      await loadNFTs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle NFT status',
        variant: 'destructive'
      });
    }
  };

  // Edit NFT
  const handleEditNFT = (nft: NFTFormData) => {
    setSelectedNFT(nft);
    setIsEditDialogOpen(true);
  };

  // View NFT details
  const handleViewDetails = (nft: NFTFormData) => {
    setSelectedNFT(nft);
    // TODO: Implement detail view
    toast({
      title: 'View Details',
      description: `Viewing details for: ${nft.title}`
    });
  };

  // Delete NFT (show confirmation)
  const handleDeleteClick = (nft: NFTFormData) => {
    setNFTToDelete(nft);
    setIsDeleteDialogOpen(true);
  };

  // View user
  const handleViewUser = (walletAddress: string) => {
    // TODO: Navigate to user details page
    toast({
      title: 'View User',
      description: `Viewing user: ${walletAddress}`
    });
  };

  // View holding details
  const handleViewHoldingDetails = (holding: UserHolding) => {
    toast({
      title: 'Holding Details',
      description: `Viewing holding: ${holding.nft_title}`
    });
  };

  // Permission check
  if (!hasPermission('nfts.read')) {
    return (
      <div className={`text-center ${isMobile ? 'py-8' : 'py-12'}`}>
        <ImageIcon className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'} mx-auto text-muted-foreground mb-4`} />
        <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold mb-2`}>Access Denied</h2>
        <p className={`${isMobile ? 'text-sm' : 'text-base'} text-muted-foreground`}>
          You don't have permission to view NFT data.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-${isMobile ? '4' : '6'}`}>
      {/* Header */}
      <div className={`flex ${isMobile ? 'flex-col gap-4' : 'items-center justify-between'}`}>
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : isDesktop ? 'text-4xl' : 'text-3xl'} font-bold text-honey`}>
            NFT Management
          </h1>
          <p className={`${isMobile ? 'text-sm' : 'text-base'} text-muted-foreground mt-2`}>
            Manage advertisement, merchant, and service NFTs
          </p>
        </div>

        {hasPermission('nfts.create') && (
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className={`bg-honey text-secondary hover:bg-honey/90 ${isMobile ? 'w-full h-10' : isDesktop ? 'h-12' : 'h-10'}`}
            data-testid="button-create-nft"
          >
            <Plus className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} mr-2`} />
            Create NFT
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-${isMobile ? '3' : '4'}`}>
        <Card>
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className="flex items-center space-x-2">
              <Package className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-honey`} />
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Total NFTs</p>
                <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{stats.totalNFTs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className="flex items-center space-x-2">
              <ImageIcon className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-green-500`} />
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Active</p>
                <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{stats.activeNFTs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className="flex items-center space-x-2">
              <TrendingUp className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-500`} />
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Total Sales</p>
                <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold`}>
                  {stats.totalSales.toLocaleString()} BCC
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className="flex items-center space-x-2">
              <Users className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-purple-500`} />
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Users</p>
                <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{stats.uniqueUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="published" className="space-y-4">
        <TabsList className={`grid w-full grid-cols-3 ${isMobile ? 'h-auto' : ''}`}>
          <TabsTrigger value="published" className={isMobile ? 'text-xs py-2' : ''}>
            Published NFTs
          </TabsTrigger>
          <TabsTrigger value="create" className={isMobile ? 'text-xs py-2' : ''}>
            Create NFT
          </TabsTrigger>
          <TabsTrigger value="holdings" className={isMobile ? 'text-xs py-2' : ''}>
            User Holdings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="published">
          <AdminNFTList
            nfts={nfts}
            onEdit={handleEditNFT}
            onDelete={handleDeleteClick}
            onToggleStatus={handleToggleStatus}
            onViewDetails={handleViewDetails}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="create">
          <NFTForm
            onSave={handleCreateNFT}
            onCancel={() => {}}
          />
        </TabsContent>

        <TabsContent value="holdings">
          <UserHoldingsManager
            holdings={holdings}
            onViewDetails={handleViewHoldingDetails}
            onViewUser={handleViewUser}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit NFT</DialogTitle>
            <DialogDescription>Update NFT details and translations</DialogDescription>
          </DialogHeader>
          {selectedNFT && (
            <NFTForm
              nft={selectedNFT}
              onSave={handleUpdateNFT}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedNFT(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New NFT</DialogTitle>
            <DialogDescription>Add a new NFT to the marketplace</DialogDescription>
          </DialogHeader>
          <NFTForm
            onSave={handleCreateNFT}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the NFT "{nftToDelete?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNFT}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

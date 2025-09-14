import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useWallet } from '../hooks/useWallet';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useToast } from '../hooks/use-toast';
import { Package, Star, MessageSquare, Play, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface ServiceActivation {
  id: string;
  buyer_wallet: string;
  nft_purchase_id: string;
  nft_id: string;
  nft_type: 'advertisement' | 'merchant';
  service_code: string;
  activation_form_data: any;
  status: 'pending' | 'active' | 'in_progress' | 'completed' | 'cancelled' | 'destroyed';
  admin_notes?: string;
  service_start_date?: string;
  service_end_date?: string;
  created_at: string;
  updated_at: string;
}

interface NFTWithService {
  purchase: any;
  nft: any;
  service: ServiceActivation | null;
}

interface ServiceProgress {
  id: string;
  service_activation_id: string;
  step_name: string;
  step_description?: string;
  step_order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completed_at?: string;
  notes?: string;
}

export default function NFTCenter() {
  const { t } = useI18n();
  const { walletAddress } = useWallet();
  const { toast } = useToast();
  
  // State management
  const [loading, setLoading] = useState(false);
  const [nftsWithServices, setNftsWithServices] = useState<NFTWithService[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceActivation | null>(null);
  const [serviceProgress, setServiceProgress] = useState<ServiceProgress[]>([]);
  const [activationForm, setActivationForm] = useState({
    projectDescription: '',
    requirements: '',
    timeline: '',
    contactInfo: '',
    additionalNotes: ''
  });
  const [showActivationDialog, setShowActivationDialog] = useState(false);

  // Fetch user's NFTs and service activations
  const fetchNFTsAndServices = useCallback(async () => {
    if (!walletAddress) return;

    setLoading(true);
    try {
      // Get NFT purchases
      const { data: purchases, error: purchaseError } = await supabase
        .from('nft_purchases')
        .select('*')
        .eq('buyer_wallet', walletAddress)
        .order('purchased_at', { ascending: false });

      if (purchaseError) throw purchaseError;

      // Get service activations
      const { data: services, error: serviceError } = await supabase
        .from('nft_service_activations')
        .select('*')
        .eq('buyer_wallet', walletAddress);

      if (serviceError) throw serviceError;

      // Combine NFT data with service info
      const combined: NFTWithService[] = [];
      
      for (const purchase of purchases || []) {
        // Get NFT details
        const table = purchase.nft_type === 'advertisement' ? 'advertisement_nfts' : 'merchant_nfts';
        const { data: nftData } = await supabase
          .from(table)
          .select('*')
          .eq('id', purchase.nft_id)
          .single();

        // Find corresponding service activation
        const service = services?.find(s => s.nft_purchase_id === purchase.id) || null;

        combined.push({
          purchase,
          nft: nftData,
          service
        });
      }

      setNftsWithServices(combined);
    } catch (error: any) {
      console.error('Error fetching NFTs and services:', error);
      toast({
        title: "Error",
        description: "Failed to load your NFTs and services",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [walletAddress, toast]);

  // Fetch service progress
  const fetchServiceProgress = useCallback(async (serviceId: string) => {
    try {
      const { data, error } = await supabase
        .from('service_progress')
        .select('*')
        .eq('service_activation_id', serviceId)
        .order('step_order', { ascending: true });

      if (error) throw error;
      setServiceProgress(data || []);
    } catch (error: any) {
      console.error('Error fetching service progress:', error);
    }
  }, []);

  // Activate service
  const activateService = async (serviceId: string) => {
    try {
      const { error } = await supabase
        .from('nft_service_activations')
        .update({
          activation_form_data: activationForm,
          status: 'active',
          service_start_date: new Date().toISOString()
        })
        .eq('id', serviceId);

      if (error) throw error;

      toast({
        title: "Service Activated!",
        description: "Your service request has been submitted to our admin team.",
        duration: 6000
      });

      setShowActivationDialog(false);
      setActivationForm({
        projectDescription: '',
        requirements: '',
        timeline: '',
        contactInfo: '',
        additionalNotes: ''
      });

      await fetchNFTsAndServices();
    } catch (error: any) {
      toast({
        title: "Activation Failed",
        description: error.message || "Failed to activate service",
        variant: "destructive"
      });
    }
  };

  // Complete and destroy service
  const completeAndDestroyService = async (nftWithService: NFTWithService) => {
    if (!nftWithService.service) return;

    try {
      // Mark service as destroyed
      const { error: serviceError } = await supabase
        .from('nft_service_activations')
        .update({
          status: 'destroyed',
          service_end_date: new Date().toISOString(),
          admin_notes: 'Service completed - NFT and BCC destroyed'
        })
        .eq('id', nftWithService.service.id);

      if (serviceError) throw serviceError;

      // Update purchase record to mark as destroyed
      const { error: purchaseError } = await supabase
        .from('nft_purchases')
        .update({
          metadata: { 
            ...nftWithService.purchase.metadata, 
            destroyed: true,
            destruction_date: new Date().toISOString(),
            bcc_burned: nftWithService.purchase.price_bcc
          }
        })
        .eq('id', nftWithService.purchase.id);

      if (purchaseError) throw purchaseError;

      toast({
        title: "Service Completed",
        description: `Service completed successfully. ${nftWithService.purchase.price_bcc} BCC and NFT have been destroyed.`,
        duration: 8000
      });

      await fetchNFTsAndServices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete service",
        variant: "destructive"
      });
    }
  };

  // Load data on mount
  useEffect(() => {
    if (walletAddress) {
      fetchNFTsAndServices();
    }
  }, [walletAddress, fetchNFTsAndServices]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'active': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'in_progress': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'destroyed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'cancelled': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'active': return <Play className="w-4 h-4" />;
      case 'in_progress': return <MessageSquare className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'destroyed': return <Trash2 className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  if (!walletAddress) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl text-center">
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-8">
          <h1 className="text-2xl font-bold text-orange-400 mb-4">Wallet Required</h1>
          <p className="text-muted-foreground">
            Please connect your wallet to view your NFT collection.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-honey mb-3">
          NFT Center
        </h1>
        <p className="text-muted-foreground">
          Manage your owned NFTs and activate services
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey" />
          <span className="ml-2 text-muted-foreground">Loading your NFTs...</span>
        </div>
      )}

      {/* NFT Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nftsWithServices.map((nftWithService) => {
            const { purchase, nft, service } = nftWithService;
            const isDestroyed = purchase.metadata?.destroyed || service?.status === 'destroyed';
            const isAdNFT = purchase.nft_type === 'advertisement';

            return (
              <Card 
                key={purchase.id} 
                className={`transition-all duration-200 ${
                  isDestroyed 
                    ? 'border-red-500/30 bg-red-500/5' 
                    : isAdNFT 
                    ? 'border-blue-500/20 hover:border-blue-500/40' 
                    : 'border-purple-500/20 hover:border-purple-500/40'
                }`}
              >
                <CardHeader className="pb-3">
                  <img 
                    src={nft?.image_url} 
                    alt={nft?.title}
                    className={`w-full h-48 object-cover rounded-lg mb-3 ${
                      isDestroyed ? 'grayscale opacity-50' : ''
                    }`}
                  />
                  
                  <div className="flex items-center justify-between">
                    <Badge className={`${
                      isAdNFT 
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                        : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                    }`}>
                      {nft?.category}
                    </Badge>
                    
                    {service && (
                      <Badge className={getStatusColor(service.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(service.status)}
                          <span>{service.status}</span>
                        </div>
                      </Badge>
                    )}
                  </div>
                  
                  <CardTitle className="text-lg text-foreground">{nft?.title}</CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">{nft?.description}</p>
                  
                  {/* Purchase Info */}
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Purchased: {new Date(purchase.created_at).toLocaleDateString()}</div>
                      <div>Paid: {purchase.price_bcc} BCC</div>
                      {isDestroyed && (
                        <div className="text-red-400 font-medium">
                          🔥 NFT and {purchase.price_bcc} BCC destroyed
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Service Code */}
                  {service && !isDestroyed && (
                    <div className="bg-honey/10 rounded-lg p-3">
                      <div className="text-sm font-medium text-honey mb-1">Service Code</div>
                      <div className="text-xs font-mono bg-background px-2 py-1 rounded border">
                        {service.service_code}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {service && !isDestroyed && (
                      <>
                        {service.status === 'pending' && (
                          <Dialog open={showActivationDialog} onOpenChange={setShowActivationDialog}>
                            <DialogTrigger asChild>
                              <Button 
                                className="w-full bg-green-500 hover:bg-green-600 text-white"
                                onClick={() => setSelectedService(service)}
                              >
                                <Play className="mr-2 h-4 w-4" />
                                Activate Service
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Activate Service: {nft?.title}</DialogTitle>
                                <DialogDescription>
                                  Fill out this form to start your service. Our admin team will contact you.
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="project-desc">Project Description</Label>
                                  <Textarea
                                    id="project-desc"
                                    value={activationForm.projectDescription}
                                    onChange={(e) => setActivationForm({...activationForm, projectDescription: e.target.value})}
                                    placeholder="Describe your project requirements..."
                                    rows={3}
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="requirements">Specific Requirements</Label>
                                  <Textarea
                                    id="requirements"
                                    value={activationForm.requirements}
                                    onChange={(e) => setActivationForm({...activationForm, requirements: e.target.value})}
                                    placeholder="List your specific requirements..."
                                    rows={2}
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="timeline">Expected Timeline</Label>
                                  <Input
                                    id="timeline"
                                    value={activationForm.timeline}
                                    onChange={(e) => setActivationForm({...activationForm, timeline: e.target.value})}
                                    placeholder="e.g., 2-3 weeks"
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="contact">Contact Information</Label>
                                  <Input
                                    id="contact"
                                    value={activationForm.contactInfo}
                                    onChange={(e) => setActivationForm({...activationForm, contactInfo: e.target.value})}
                                    placeholder="Email, Telegram, Discord..."
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="notes">Additional Notes</Label>
                                  <Textarea
                                    id="notes"
                                    value={activationForm.additionalNotes}
                                    onChange={(e) => setActivationForm({...activationForm, additionalNotes: e.target.value})}
                                    placeholder="Any additional information..."
                                    rows={2}
                                  />
                                </div>
                                
                                <Button 
                                  onClick={() => selectedService && activateService(selectedService.id)}
                                  disabled={!activationForm.projectDescription || !activationForm.contactInfo}
                                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                                >
                                  Submit Service Request
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        
                        {service.status === 'completed' && (
                          <Button 
                            onClick={() => completeAndDestroyService(nftWithService)}
                            className="w-full bg-red-500 hover:bg-red-600 text-white"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Complete & Destroy NFT
                          </Button>
                        )}
                        
                        {(service.status === 'active' || service.status === 'in_progress') && (
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setSelectedService(service);
                              fetchServiceProgress(service.id);
                            }}
                            className="w-full"
                          >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            View Progress
                          </Button>
                        )}
                      </>
                    )}
                    
                    {isDestroyed && (
                      <div className="text-center py-4">
                        <div className="text-red-400 text-sm font-medium">
                          ⚰️ Service Completed
                        </div>
                        <div className="text-xs text-muted-foreground">
                          NFT and BCC have been destroyed
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && nftsWithServices.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-honey/30 mx-auto mb-4 flex items-center justify-center">
            <Package className="w-8 h-8 text-honey/30" />
          </div>
          <p className="text-muted-foreground mb-4">No NFTs in your collection yet</p>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/nfts'}
            className="border-honey/30 text-honey hover:bg-honey/10"
          >
            Browse NFT Marketplace
          </Button>
        </div>
      )}
    </div>
  );
}
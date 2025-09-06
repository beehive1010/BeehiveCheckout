import React, { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { useActiveAccount } from 'thirdweb/react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ArrowLeft, Coins, CreditCard, ShoppingBag, GraduationCap, Megaphone, Package } from 'lucide-react';
import BccPurchaseInterface from '../components/BccPurchaseInterface';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';

interface AvailableItem {
  id: string;
  title: string;
  description: string;
  priceUSDT: number;
  priceBCC: number;
  imageUrl?: string;
  category: string;
  isActive: boolean;
  itemType: 'merchant_nft' | 'advertisement_nft' | 'course';
}

export default function TokenPurchase() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const account = useActiveAccount();
  const [activeTab, setActiveTab] = useState('purchase');

  // Fetch user's BCC balance using Supabase API
  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['/api/bcc/spending-balance', account?.address],
    enabled: !!account?.address,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/bcc/spending-balance', undefined, account!.address);
      return response.json();
    },
  });

  // Fetch available items for purchase
  const { data: availableItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['/api/bcc/available-items', account?.address],
    enabled: !!account?.address && activeTab === 'marketplace',
    queryFn: async (): Promise<{ success: boolean; items: AvailableItem[]; count: number }> => {
      const response = await fetch('/api/bcc/available-items', {
        headers: {
          'X-Wallet-Address': account!.address,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch available items');
      }
      
      return response.json();
    },
  });

  const merchantNFTs = availableItems?.items.filter(item => item.itemType === 'merchant_nft') || [];
  const advertisementNFTs = availableItems?.items.filter(item => item.itemType === 'advertisement_nft') || [];
  const courses = availableItems?.items.filter(item => item.itemType === 'course') || [];

  const handleBackToDashboard = () => {
    setLocation('/dashboard');
  };

  const renderItemGrid = (items: AvailableItem[], title: string, icon: React.ReactNode, emptyMessage: string) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-semibold">{title}</h3>
        <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
          {items.length} available
        </Badge>
      </div>
      
      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="border-muted/30 hover:border-honey/40 transition-colors">
              <CardHeader className="pb-3">
                <div className="aspect-video bg-muted/20 rounded-lg mb-3 flex items-center justify-center">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Package className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {item.category}
                  </Badge>
                  <div className="text-right">
                    <div className="font-bold text-honey">{item.priceBCC} BCC</div>
                    <div className="text-xs text-muted-foreground">${item.priceUSDT} value</div>
                  </div>
                </div>
                <Button 
                  className="w-full bg-honey hover:bg-honey/90 text-black"
                  disabled={!balance || balance.balance.totalSpendable < item.priceBCC}
                >
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  {balance && balance.balance.totalSpendable >= item.priceBCC ? 'Purchase with BCC' : 'Insufficient BCC'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={handleBackToDashboard}
            className="border-honey/30 text-honey hover:bg-honey/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-3xl lg:text-4xl font-bold text-honey mb-3 bg-gradient-to-r from-honey via-honey/90 to-honey/70 bg-clip-text text-transparent">
              BCC Token Center
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Purchase BCC tokens with USDC via Thirdweb bridge and spend them on premium NFTs, courses, and services
            </p>
          </div>
          
          {/* Current Balance Display */}
          {balance && (
            <div className="text-center lg:text-right">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Coins className="w-4 h-4" />
                <span>Current Balance</span>
              </div>
              <div className="text-2xl font-bold text-green-400">
                {balance.balance.totalSpendable} BCC
              </div>
              <div className="text-sm text-muted-foreground">
                ${balance.balance.totalSpendable} spending power
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="border-b border-border">
          <TabsList className="grid grid-cols-2 w-full max-w-lg mx-auto bg-background border border-border rounded-xl p-1">
            <TabsTrigger 
              value="purchase" 
              className="flex items-center gap-2 data-[state=active]:bg-honey data-[state=active]:text-secondary font-medium"
            >
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Purchase BCC</span>
              <span className="sm:hidden">Purchase</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="marketplace" 
              className="flex items-center gap-2 data-[state=active]:bg-honey data-[state=active]:text-secondary font-medium"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">BCC Marketplace</span>
              <span className="sm:hidden">Marketplace</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Purchase BCC Tab */}
        <TabsContent value="purchase" className="space-y-6">
          <div className="max-w-4xl mx-auto">
            <BccPurchaseInterface 
              onPurchaseSuccess={() => {
                // Optionally switch to marketplace tab after purchase
                setActiveTab('marketplace');
              }}
              showBalance={true}
            />
          </div>
        </TabsContent>

        {/* BCC Marketplace Tab */}
        <TabsContent value="marketplace" className="space-y-6">
          {itemsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading marketplace items...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Insufficient Balance Warning */}
              {balance && balance.balance.totalSpendable === 0 && (
                <Card className="border-yellow-500/20 bg-yellow-500/5">
                  <CardContent className="pt-6 text-center">
                    <Coins className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h3 className="font-semibold text-yellow-500 mb-2">No BCC Balance</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      You need BCC tokens to purchase items from the marketplace
                    </p>
                    <Button 
                      onClick={() => setActiveTab('purchase')}
                      className="bg-yellow-500 hover:bg-yellow-500/90 text-black"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Purchase BCC Tokens
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Merchant NFTs */}
              {renderItemGrid(
                merchantNFTs, 
                "Merchant NFTs", 
                <Package className="w-5 h-5 text-blue-400" />,
                "No merchant NFTs available at the moment"
              )}

              {/* Advertisement NFTs */}
              {renderItemGrid(
                advertisementNFTs, 
                "Advertisement NFTs", 
                <Megaphone className="w-5 h-5 text-purple-400" />,
                "No advertisement NFTs available at the moment"
              )}

              {/* Courses */}
              {renderItemGrid(
                courses, 
                "Educational Courses", 
                <GraduationCap className="w-5 h-5 text-green-400" />,
                "No courses available at the moment"
              )}

              {/* No Items Available */}
              {availableItems?.items.length === 0 && (
                <div className="text-center py-12">
                  <ShoppingBag className="w-20 h-20 text-muted-foreground mx-auto mb-6 opacity-50" />
                  <h3 className="text-xl font-semibold text-muted-foreground mb-2">Marketplace Coming Soon</h3>
                  <p className="text-muted-foreground mb-6">
                    We're preparing amazing NFTs and courses for you to purchase with BCC tokens
                  </p>
                  <Button 
                    onClick={() => setActiveTab('purchase')}
                    variant="outline" 
                    className="border-honey/30 text-honey hover:bg-honey/10"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Purchase BCC for Future Use
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
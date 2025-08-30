import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useToast } from '../hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

export default function AdminNFTManager() {
  const { walletAddress } = useWallet();
  const { toast } = useToast();
  
  // Merchant NFT form state
  const [merchantNFT, setMerchantNFT] = useState({
    title: '',
    description: '',
    imageUrl: '',
    priceBCC: 100
  });

  // Advertisement NFT form state
  const [adNFT, setAdNFT] = useState({
    title: '',
    description: '',
    imageUrl: '',
    serviceName: '',
    serviceType: 'dapp' as 'dapp' | 'banner' | 'promotion',
    priceBCC: 200,
    codeTemplate: ''
  });

  const handleCreateMerchantNFT = async () => {
    try {
      const response = await fetch('/api/admin/create-merchant-nft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress!
        },
        body: JSON.stringify(merchantNFT)
      });

      if (!response.ok) {
        throw new Error('Failed to create merchant NFT');
      }

      toast({
        title: 'Success',
        description: 'Merchant NFT created successfully!'
      });

      // Reset form
      setMerchantNFT({
        title: '',
        description: '',
        imageUrl: '',
        priceBCC: 100
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create merchant NFT',
        variant: 'destructive'
      });
    }
  };

  const handleCreateAdNFT = async () => {
    try {
      const response = await fetch('/api/admin/create-advertisement-nft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress!
        },
        body: JSON.stringify(adNFT)
      });

      if (!response.ok) {
        throw new Error('Failed to create advertisement NFT');
      }

      toast({
        title: 'Success',
        description: 'Advertisement NFT created successfully!'
      });

      // Reset form
      setAdNFT({
        title: '',
        description: '',
        imageUrl: '',
        serviceName: '',
        serviceType: 'dapp',
        priceBCC: 200,
        codeTemplate: ''
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create advertisement NFT',
        variant: 'destructive'
      });
    }
  };

  if (!walletAddress) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <p>Please connect your wallet to access admin features</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Admin NFT Manager</h1>
      
      <Tabs defaultValue="merchant" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="merchant">Merchant NFTs</TabsTrigger>
          <TabsTrigger value="advertisement">Advertisement NFTs</TabsTrigger>
        </TabsList>

        <TabsContent value="merchant">
          <Card>
            <CardHeader>
              <CardTitle>Create Merchant NFT</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="merchant-title">Title</Label>
                <Input
                  id="merchant-title"
                  value={merchantNFT.title}
                  onChange={(e) => setMerchantNFT({...merchantNFT, title: e.target.value})}
                  placeholder="NFT Title"
                />
              </div>
              
              <div>
                <Label htmlFor="merchant-desc">Description</Label>
                <Textarea
                  id="merchant-desc"
                  value={merchantNFT.description}
                  onChange={(e) => setMerchantNFT({...merchantNFT, description: e.target.value})}
                  placeholder="NFT Description"
                />
              </div>

              <div>
                <Label htmlFor="merchant-image">Image URL</Label>
                <Input
                  id="merchant-image"
                  value={merchantNFT.imageUrl}
                  onChange={(e) => setMerchantNFT({...merchantNFT, imageUrl: e.target.value})}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label htmlFor="merchant-price">Price (BCC)</Label>
                <Input
                  id="merchant-price"
                  type="number"
                  value={merchantNFT.priceBCC}
                  onChange={(e) => setMerchantNFT({...merchantNFT, priceBCC: parseInt(e.target.value)})}
                />
              </div>

              <Button 
                onClick={handleCreateMerchantNFT}
                className="w-full"
                disabled={!merchantNFT.title || !merchantNFT.description || !merchantNFT.imageUrl}
              >
                Create Merchant NFT
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advertisement">
          <Card>
            <CardHeader>
              <CardTitle>Create Advertisement NFT</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ad-title">Title</Label>
                <Input
                  id="ad-title"
                  value={adNFT.title}
                  onChange={(e) => setAdNFT({...adNFT, title: e.target.value})}
                  placeholder="NFT Title"
                />
              </div>
              
              <div>
                <Label htmlFor="ad-desc">Description</Label>
                <Textarea
                  id="ad-desc"
                  value={adNFT.description}
                  onChange={(e) => setAdNFT({...adNFT, description: e.target.value})}
                  placeholder="NFT Description"
                />
              </div>

              <div>
                <Label htmlFor="ad-image">Image URL</Label>
                <Input
                  id="ad-image"
                  value={adNFT.imageUrl}
                  onChange={(e) => setAdNFT({...adNFT, imageUrl: e.target.value})}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label htmlFor="ad-service">Service Name</Label>
                <Input
                  id="ad-service"
                  value={adNFT.serviceName}
                  onChange={(e) => setAdNFT({...adNFT, serviceName: e.target.value})}
                  placeholder="DApp or Service Name"
                />
              </div>

              <div>
                <Label htmlFor="ad-type">Service Type</Label>
                <Select value={adNFT.serviceType} onValueChange={(value: 'dapp' | 'banner' | 'promotion') => setAdNFT({...adNFT, serviceType: value})}>
                  <SelectTrigger id="ad-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dapp">DApp</SelectItem>
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="promotion">Promotion</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="ad-price">Price (BCC)</Label>
                <Input
                  id="ad-price"
                  type="number"
                  value={adNFT.priceBCC}
                  onChange={(e) => setAdNFT({...adNFT, priceBCC: parseInt(e.target.value)})}
                />
              </div>

              <div>
                <Label htmlFor="ad-code">Code Template (optional)</Label>
                <Input
                  id="ad-code"
                  value={adNFT.codeTemplate}
                  onChange={(e) => setAdNFT({...adNFT, codeTemplate: e.target.value})}
                  placeholder="SERVICE-XXX"
                />
              </div>

              <Button 
                onClick={handleCreateAdNFT}
                className="w-full"
                disabled={!adNFT.title || !adNFT.description || !adNFT.imageUrl || !adNFT.serviceName}
              >
                Create Advertisement NFT
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
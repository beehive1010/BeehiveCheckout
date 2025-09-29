import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import AdvertisementNFTCard, { AdvertisementNFT } from './AdvertisementNFTCard';
import MerchantNFTCard, { MerchantNFT } from './MerchantNFTCard';

// Sample data for testing - matches our API interface
const sampleAdvertisementNFTs: AdvertisementNFT[] = [
  {
    id: 'ad-1',
    title: 'Premium DeFi Platform Ad',
    description: 'Discover the next generation of decentralized finance with our innovative platform. Earn up to 15% APY on your crypto investments.',
    imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400',
    category: 'defi',
    priceBCC: 150,
    priceUSDT: 25,
    clickUrl: 'https://example-defi.com',
    impressionsTarget: 10000,
    impressionsCurrent: 2547,
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    advertiserWallet: '0x1234567890123456789012345678901234567890',
    metadata: { priority: 'high', target_audience: 'crypto_enthusiasts' },
    createdAt: new Date().toISOString(),
    type: 'advertisement'
  },
  {
    id: 'ad-2',
    title: 'NFT Marketplace Launch',
    description: 'Join the largest NFT marketplace on the blockchain. Trade, collect, and create unique digital assets.',
    imageUrl: 'https://images.unsplash.com/photo-1634973357973-f2ed2657db3c?w=400',
    category: 'nft',
    priceBCC: 100,
    priceUSDT: 18,
    clickUrl: 'https://example-nft-market.com',
    impressionsTarget: 8000,
    impressionsCurrent: 1876,
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    advertiserWallet: '0x2345678901234567890123456789012345678901',
    metadata: { priority: 'medium', target_audience: 'nft_collectors' },
    createdAt: new Date().toISOString(),
    type: 'advertisement'
  }
];

const sampleMerchantNFTs: MerchantNFT[] = [
  {
    id: 'merchant-1',
    title: 'Golden Bee Membership',
    description: 'Exclusive golden bee NFT that grants access to premium features and rewards in the BEEHIVE ecosystem.',
    imageUrl: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=400',
    category: 'membership',
    priceBCC: 500,
    priceUSDT: 80,
    supplyTotal: 1000,
    supplyAvailable: 847,
    creatorWallet: '0x1111111111111111111111111111111111111111',
    metadata: { rarity: 'rare', benefits: ['premium_access', 'bonus_rewards'] },
    createdAt: new Date().toISOString(),
    type: 'merchant'
  },
  {
    id: 'merchant-2',
    title: 'Digital Art Collection #1',
    description: 'Unique digital artwork created by renowned crypto artists. Part of limited edition collection.',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
    category: 'art',
    priceBCC: 250,
    priceUSDT: 40,
    supplyTotal: 500,
    supplyAvailable: 324,
    creatorWallet: '0x2222222222222222222222222222222222222222',
    metadata: { rarity: 'epic', artist: 'CryptoArtist123' },
    createdAt: new Date().toISOString(),
    type: 'merchant'
  }
];

export default function NFTTestPage() {
  const handlePurchase = (nft: any) => {
    console.log('Purchase initiated for:', nft.title);
    // This will trigger the PaymentConfirmationModal in the card component
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">NFT Test Page</h1>
        
        {/* Advertisement NFTs Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📢 Advertisement NFTs
              <span className="text-sm font-normal text-muted-foreground">
                ({sampleAdvertisementNFTs.length} items)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sampleAdvertisementNFTs.map(nft => (
                <AdvertisementNFTCard
                  key={nft.id}
                  nft={nft}
                  onPurchase={handlePurchase}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Merchant NFTs Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏪 Merchant NFTs
              <span className="text-sm font-normal text-muted-foreground">
                ({sampleMerchantNFTs.length} items)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sampleMerchantNFTs.map(nft => (
                <MerchantNFTCard
                  key={nft.id}
                  nft={nft}
                  onPurchase={handlePurchase}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Test Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              This page demonstrates the NFT components with sample data. To test:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Connect your wallet to see the purchase buttons enabled</li>
              <li>Click "Purchase with BCC" to open the payment confirmation modal</li>
              <li>The modal will show your current BCC balance and allow you to confirm the purchase</li>
              <li>The purchase will be processed using the real database functions</li>
              <li>Check the console for purchase logs and API responses</li>
            </ol>
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                <strong>Note:</strong> This uses real API calls to the database. 
                Make sure you have sufficient BCC balance to test purchases.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
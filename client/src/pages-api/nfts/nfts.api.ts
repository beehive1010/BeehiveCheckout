import { httpClient } from '../../lib/http';

export interface NFTListing {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  serviceName: string;
  serviceType: 'dapp' | 'banner' | 'promotion';
  priceBCC: number;
  totalSupply: number;
  claimedCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface UserNFT {
  id: string;
  nftId: string;
  title: string;
  imageUrl: string;
  claimedAt: string;
  tokenId?: string;
}

export const nftsApi = {
  async getAvailableNFTs(): Promise<NFTListing[]> {
    return httpClient.get<NFTListing[]>('/nfts/available');
  },

  async getUserNFTs(walletAddress: string): Promise<UserNFT[]> {
    return httpClient.get<UserNFT[]>('/nfts/user', walletAddress);
  },

  async claimNFT(nftId: string, walletAddress: string): Promise<{ success: boolean; tokenId: string }> {
    return httpClient.post('/nfts/claim', { nftId }, walletAddress);
  },

  async getNFTDetails(nftId: string): Promise<NFTListing> {
    return httpClient.get<NFTListing>(`/nfts/${nftId}`);
  }
};
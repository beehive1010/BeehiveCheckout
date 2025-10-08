import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { callEdgeFunction } from '../lib/edgeFunctions';

// NFT interfaces
export interface AdvertisementNFT {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  price_usdt: number;
  price_bcc: number;
  category: string;
  advertiser_wallet: string | null;
  click_url: string | null;
  impressions_target: number | null;
  impressions_current: number;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface MerchantNFT {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  price_usdt: number;
  price_bcc: number;
  category: string;
  supply_total: number | null;
  supply_available: number | null;
  is_active: boolean;
  creator_wallet: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface NFTPurchase {
  id: string;
  nft_type: string;
  nft_id: string;
  buyer_wallet: string;
  price_usdt: number;
  price_bcc: number | null;
  payment_method: string;
  status: string;
  purchased_at: string;
  transaction_hash: string | null;
  metadata: any;
}

// NFT state interface
interface NFTState {
  // NFT data
  advertisementNFTs: AdvertisementNFT[];
  merchantNFTs: MerchantNFT[];
  myPurchases: NFTPurchase[];
  
  // Loading.tsx states
  isLoading: boolean;
  isProcessing: boolean;
  currentStep: string;
  
  // Error handling
  error: string | null;
  lastUpdated: string | null;
  
  // Purchase state
  purchaseState: {
    nftId: string | null;
    loading: boolean;
    error: string | null;
  };
  
  // Actions
  setLoading: (loading: boolean) => void;
  setProcessing: (processing: boolean, step?: string) => void;
  setError: (error: string | null) => void;
  
  // Data loading
  loadAdvertisementNFTs: () => Promise<void>;
  loadMerchantNFTs: () => Promise<void>;
  loadMyPurchases: (walletAddress: string) => Promise<void>;
  refreshAll: (walletAddress?: string) => Promise<void>;
  
  // Purchase actions
  purchaseNFT: (nftId: string, nftType: 'advertisement' | 'merchant', paymentMethod: 'usdt' | 'bcc', walletAddress: string) => Promise<boolean>;
  
  // Utilities
  reset: () => void;
}

// Default state
const defaultState = {
  advertisementNFTs: [],
  merchantNFTs: [],
  myPurchases: [],
  isLoading: false,
  isProcessing: false,
  currentStep: '',
  error: null,
  lastUpdated: null,
  purchaseState: {
    nftId: null,
    loading: false,
    error: null,
  },
};

export const useNFTStore = create<NFTState>()(
  devtools(
    (set, get) => ({
      ...defaultState,
      
      // Basic actions
      setLoading: (isLoading) => {
        set({ isLoading });
      },
      
      setProcessing: (isProcessing, currentStep = '') => {
        set({ isProcessing, currentStep });
      },
      
      setError: (error) => {
        set({ error });
      },
      
      // Load advertisement NFTs
      loadAdvertisementNFTs: async () => {
        const { setLoading, setError } = get();
        setLoading(true);
        setError(null);
        
        try {
          console.log('📢 Loading.tsx advertisement NFTs...');
          // Optimized query with selective fields and limit
          const { data, error } = await supabase
            .from('advertisement_nfts')
            .select(`
              id, title, description, image_url, price_usdt, price_bcc,
              category, advertiser_wallet, click_url, impressions_target,
              impressions_current, is_active, starts_at, ends_at,
              created_at, updated_at
            `)
            .eq('is_active', true)
            .gte('ends_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(50); // Pagination for performance
          
          if (error) {
            throw new Error(error.message);
          }
          
          set({ 
            advertisementNFTs: (data || []) as AdvertisementNFT[],
            lastUpdated: new Date().toISOString()
          });
          console.log('✅ Advertisement NFTs loaded:', data?.length);
        } catch (error) {
          console.error('❌ Failed to load advertisement NFTs:', error);
          setError(error instanceof Error ? error.message : 'Failed to load advertisement NFTs');
        } finally {
          setLoading(false);
        }
      },
      
      // Load merchant NFTs
      loadMerchantNFTs: async () => {
        const { setLoading, setError } = get();
        setLoading(true);
        setError(null);
        
        try {
          console.log('🛍️ Loading.tsx merchant NFTs...');
          // Optimized query with selective fields and limit
          const { data, error } = await supabase
            .from('merchant_nfts')
            .select(`
              id, title, description, image_url, price_usdt, price_bcc,
              category, supply_total, supply_available, is_active,
              creator_wallet, created_at, updated_at
            `)
            .eq('is_active', true)
            .gt('supply_available', 0)
            .order('created_at', { ascending: false })
            .limit(50); // Pagination for performance
          
          if (error) {
            throw new Error(error.message);
          }
          
          set({ 
            merchantNFTs: (data || []) as MerchantNFT[],
            lastUpdated: new Date().toISOString()
          });
          console.log('✅ Merchant NFTs loaded:', data?.length);
        } catch (error) {
          console.error('❌ Failed to load merchant NFTs:', error);
          setError(error instanceof Error ? error.message : 'Failed to load merchant NFTs');
        } finally {
          setLoading(false);
        }
      },
      
      // Load user's purchases
      loadMyPurchases: async (walletAddress: string) => {
        const { setError } = get();
        setError(null);
        
        try {
          console.log('💳 Loading.tsx purchases for:', walletAddress);
          // Optimized query with selective fields and limit
          const { data, error } = await supabase
            .from('nft_purchases')
            .select(`
              id, nft_type, nft_id, buyer_wallet, price_usdt, price_bcc,
              payment_method, status, purchased_at, transaction_hash
            `)
            .eq('buyer_wallet', walletAddress)
            .order('purchased_at', { ascending: false })
            .limit(100); // Recent purchases only
          
          if (error) {
            throw new Error(error.message);
          }
          
          set({ 
            myPurchases: (data || []) as NFTPurchase[],
            lastUpdated: new Date().toISOString()
          });
          console.log('✅ Purchases loaded:', data?.length);
        } catch (error) {
          console.error('❌ Failed to load purchases:', error);
          setError(error instanceof Error ? error.message : 'Failed to load purchases');
        }
      },
      
      // Purchase NFT
      purchaseNFT: async (nftId, nftType, paymentMethod, walletAddress) => {
        const { setProcessing, setError } = get();
        setProcessing(true, 'Processing NFT purchase...');
        setError(null);
        
        set({
          purchaseState: {
            nftId,
            loading: true,
            error: null,
          }
        });
        
        try {
          console.log('🛒 Purchasing NFT:', { nftId, nftType, paymentMethod });
          
          const result = await callEdgeFunction('nft-purchase', {
            action: 'purchase',
            nftId,
            nftType,
            paymentMethod,
          }, walletAddress);
          
          if (!result.success) {
            throw new Error(result.error || 'Purchase failed');
          }
          
          // Refresh purchases and NFT data
          await get().loadMyPurchases(walletAddress);
          await get().refreshAll();
          
          console.log('✅ NFT purchase successful');
          return true;
        } catch (error) {
          console.error('❌ NFT purchase failed:', error);
          const errorMessage = error instanceof Error ? error.message : 'Purchase failed';
          setError(errorMessage);
          
          set({
            purchaseState: {
              nftId,
              loading: false,
              error: errorMessage,
            }
          });
          
          return false;
        } finally {
          setProcessing(false);
          
          // Clear purchase state after a delay
          setTimeout(() => {
            set({
              purchaseState: {
                nftId: null,
                loading: false,
                error: null,
              }
            });
          }, 3000);
        }
      },
      
      // Refresh all data
      refreshAll: async (walletAddress) => {
        const { loadAdvertisementNFTs, loadMerchantNFTs, loadMyPurchases } = get();
        
        console.log('🔄 Refreshing all NFT data...');
        await Promise.all([
          loadAdvertisementNFTs(),
          loadMerchantNFTs(),
          ...(walletAddress ? [loadMyPurchases(walletAddress)] : [])
        ]);
      },
      
      // Reset store
      reset: () => {
        console.log('🔄 Resetting NFT store');
        set(defaultState);
      }
    }),
    {
      name: 'NFTStore',
    }
  )
);
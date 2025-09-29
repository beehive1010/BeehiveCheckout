import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Database } from '../../types/database.types';

// Type aliases from database schema
export type UserData = Database['public']['Tables']['users']['Row'];
export type MemberData = Database['public']['Tables']['members']['Row'];

// Extended user data combining user and member info
export interface ExtendedUserData extends UserData {
  current_level?: number;
  is_activated?: boolean;
  team_size?: number;
}

export interface UserBalances {
  bcc_balance: number;
  bcc_transferable: number;
  bcc_restricted: number;
  bcc_locked: number;
  total_usdt_earned: number;
  total_earned: number;
  available_balance: number;
  total_withdrawn: number;
  wallet_address: string;
}

// User state interface
interface UserState {
  // Connection state
  walletAddress: string | null;
  isConnected: boolean;
  
  // User data
  userData: UserData | null;
  balances: UserBalances;
  
  // Status flags
  isRegistered: boolean;
  isActivated: boolean;
  isLoading: boolean;
  
  // Error handling
  error: string | null;
  lastUpdated: string | null;
  
  // Actions
  setWalletConnection: (address: string | null, connected: boolean) => void;
  setUserData: (userData: UserData | null) => void;
  setBalances: (balances: UserBalances) => void;
  setStatus: (isRegistered: boolean, isActivated: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Async actions
  loadUserData: (walletAddress: string) => Promise<void>;
  loadBalances: (walletAddress: string) => Promise<void>;
  refreshAll: (walletAddress: string) => Promise<void>;
  reset: () => void;
}

// Default balances
const defaultBalances: UserBalances = {
  bcc_balance: 0,
  bcc_transferable: 0,
  bcc_restricted: 0,
  bcc_locked: 0,
  total_usdt_earned: 0,
  total_earned: 0,
  available_balance: 0,
  total_withdrawn: 0,
  wallet_address: ''
};

// Default state
const defaultState = {
  walletAddress: null,
  isConnected: false,
  userData: null,
  balances: defaultBalances,
  isRegistered: false,
  isActivated: false,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set, get) => ({
        ...defaultState,
        
        // Sync actions
        setWalletConnection: (address, connected) => {
          console.log('🔗 Wallet connection changed:', { address, connected });
          set({ 
            walletAddress: address, 
            isConnected: connected,
            lastUpdated: new Date().toISOString()
          });
          
          // Reset user data if disconnected
          if (!connected || !address) {
            set({
              userData: null,
              balances: defaultBalances,
              isRegistered: false,
              isActivated: false,
              error: null
            });
          }
        },
        
        setUserData: (userData) => {
          set({ 
            userData,
            isRegistered: !!userData,
            lastUpdated: new Date().toISOString()
          });
        },
        
        setBalances: (balances) => {
          set({ 
            balances,
            lastUpdated: new Date().toISOString()
          });
        },
        
        setStatus: (isRegistered, isActivated) => {
          set({ 
            isRegistered, 
            isActivated,
            lastUpdated: new Date().toISOString()
          });
        },
        
        setLoading: (isLoading) => {
          set({ isLoading });
        },
        
        setError: (error) => {
          set({ error });
        },
        
        // Async actions
        loadUserData: async (walletAddress: string) => {
          const { setLoading, setError, setUserData } = get();
          setLoading(true);
          setError(null);
          
          try {
            console.log('📊 Loading user data for:', walletAddress);
            
            // Use Auth Edge Function to get user data (users table)
            const userResponse = await fetch(`${import.meta.env.VITE_API_BASE}/auth`, {
              method: 'POST',
              headers: {
                'x-wallet-address': walletAddress,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ action: 'get-user' })
            });

            if (!userResponse.ok) {
              throw new Error(`Failed to fetch user data: ${userResponse.status}`);
            }

            const userResult = await userResponse.json();
            
            if (!userResult.success) {
              throw new Error(userResult.error || 'Failed to load user data');
            }
            
            setUserData(userResult.user);
            console.log('✅ User data loaded:', userResult.user);
          } catch (error) {
            console.error('❌ Failed to load user data:', error);
            setError(error instanceof Error ? error.message : 'Failed to load user data');
          } finally {
            setLoading(false);
          }
        },
        
        loadBalances: async (walletAddress: string) => {
          const { setError } = get();
          
          try {
            console.log('💰 Loading balances for:', walletAddress);
            // This would need to be implemented with proper balance API
            // For now, use mock data
            const mockBalances: UserBalances = {
              bcc_balance: 0,
              bcc_transferable: 0,
              bcc_restricted: 0,
              bcc_locked: 0,
              total_usdt_earned: 0,
              total_earned: 0,
              available_balance: 0,
              total_withdrawn: 0,
              wallet_address: walletAddress
            };
            
            set({ 
              balances: mockBalances,
              lastUpdated: new Date().toISOString()
            });
            console.log('💰 Balances loaded (mock)');
          } catch (error) {
            console.error('❌ Failed to load balances:', error);
            setError(error instanceof Error ? error.message : 'Failed to load balances');
          }
        },
        
        refreshAll: async (walletAddress: string) => {
          const { loadUserData, loadBalances } = get();
          
          console.log('🔄 Refreshing all user data for:', walletAddress);
          await Promise.all([
            loadUserData(walletAddress),
            loadBalances(walletAddress)
          ]);
        },
        
        reset: () => {
          console.log('🔄 Resetting user store');
          set({
            ...defaultState,
            balances: { ...defaultBalances }
          });
        }
      }),
      {
        name: 'beehive-user-store',
        partialize: (state) => ({
          walletAddress: state.walletAddress,
          isConnected: state.isConnected,
          userData: state.userData,
          isRegistered: state.isRegistered,
          isActivated: state.isActivated,
          lastUpdated: state.lastUpdated
        }),
      }
    ),
    {
      name: 'UserStore',
    }
  )
);
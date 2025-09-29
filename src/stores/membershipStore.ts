import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { callEdgeFunction } from '../lib/edgeFunctions';
import { Database } from '../../types/database.types';

// Type aliases from database schema
export type MemberData = Database['public']['Tables']['members']['Row'];

// Computed properties for member data
export interface ComputedMemberData {
  is_activated: boolean;
  nft_claimed: boolean;
  directReferrals: number;
  totalDownline: number;
  canUpgrade: boolean;
  nextLevel: number | null;
}

export interface MembershipRecord {
  wallet_address: string;
  level: number;
  is_activated: boolean;
  activation_time: string;
  transaction_hash?: string;
}

// Membership state interface
interface MembershipState {
  // Core membership data
  currentLevel: number;
  memberData: MemberData | null;
  membershipHistory: MembershipRecord[];
  
  // Computed properties
  isActivated: boolean;
  canUpgrade: boolean;
  nextLevel: number | null;
  
  // Referral data
  directReferrals: number;
  totalDownline: number;
  
  // UI state
  isLoading: boolean;
  isProcessing: boolean;
  currentStep: string;
  error: string | null;
  lastUpdated: string | null;
  
  // Actions
  setMemberData: (memberData: MemberData | null) => void;
  setMembershipHistory: (history: MembershipRecord[]) => void;
  setReferralData: (referrerWallet: string | null, directReferrals: number, totalDownline: number) => void;
  setProcessingState: (isProcessing: boolean, currentStep?: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Async actions
  loadMembershipData: (walletAddress: string) => Promise<void>;
  loadMembershipHistory: (walletAddress: string) => Promise<void>;
  loadReferralStats: (walletAddress: string) => Promise<void>;
  activateMembership: (data: { level: number; txHash?: string; referrerWallet?: string }, walletAddress: string) => Promise<boolean>;
  upgradeMembership: (data: { level: number; txHash?: string }, walletAddress: string) => Promise<boolean>;
  refreshAll: (walletAddress: string) => Promise<void>;
  reset: () => void;
}

// Default state
const defaultState = {
  currentLevel: 0,
  memberData: null,
  membershipHistory: [],
  canUpgrade: false,
  nextLevel: null,
  isActivated: false,
  directReferrals: 0,
  totalDownline: 0,
  isLoading: false,
  isProcessing: false,
  currentStep: '',
  error: null,
  lastUpdated: null,
};

export const useMembershipStore = create<MembershipState>()(
  devtools(
    persist(
      (set, get) => ({
        ...defaultState,
        
        // Sync actions
        setMemberData: (memberData) => {
          const currentLevel = memberData?.current_level || 0;
          const nextLevel = memberData?.current_level && memberData.current_level < 19 
            ? memberData.current_level + 1 
            : null;
            
          set({ 
            memberData,
            currentLevel,
            nextLevel,
            canUpgrade: !!nextLevel,
            isActivated: !!memberData && memberData.current_level > 0,
            lastUpdated: new Date().toISOString()
          });
        },
        
        setMembershipHistory: (membershipHistory) => {
          set({ 
            membershipHistory,
            lastUpdated: new Date().toISOString()
          });
        },
        
        setReferralData: (referrerWallet, directReferrals, totalDownline) => {
          set({ 
            directReferrals, 
            totalDownline,
            lastUpdated: new Date().toISOString()
          });
        },
        
        setProcessingState: (isProcessing, currentStep = '') => {
          set({ isProcessing, currentStep });
        },
        
        setLoading: (isLoading) => {
          set({ isLoading });
        },
        
        setError: (error) => {
          set({ error });
        },
        
        // Async actions
        loadMembershipData: async (walletAddress: string) => {
          const { setLoading, setError, setMemberData } = get();
          setLoading(true);
          setError(null);
          
          try {
            console.log('📊 Loading membership data for:', walletAddress);
            
            // Use Edge Function for member info
            const memberResponse = await fetch(`${import.meta.env.VITE_API_BASE}/member-info`, {
              method: 'GET',
              headers: {
                'x-wallet-address': walletAddress,
                'Content-Type': 'application/json'
              }
            });

            if (!memberResponse.ok) {
              throw new Error(`Failed to fetch membership data: ${memberResponse.status}`);
            }

            const memberResult = await memberResponse.json();
            
            if (!memberResult.success && memberResult.error !== 'Member not found') {
              throw new Error(memberResult.error || 'Failed to load membership data');
            }
            
            // Set member data (null if not found, which is valid)
            setMemberData(memberResult.member);
            console.log('✅ Membership data loaded:', memberResult.member);
          } catch (error) {
            console.error('❌ Failed to load membership data:', error);
            setError(error instanceof Error ? error.message : 'Failed to load membership data');
          } finally {
            setLoading(false);
          }
        },
        
        loadMembershipHistory: async (walletAddress: string) => {
          const { setError } = get();
          
          try {
            console.log('📈 Loading membership history for:', walletAddress);
            // This would need proper API implementation
            // For now, mock empty history
            set({ 
              membershipHistory: [],
              lastUpdated: new Date().toISOString()
            });
            console.log('📈 Membership history loaded (mock)');
          } catch (error) {
            console.error('❌ Failed to load membership history:', error);
            setError(error instanceof Error ? error.message : 'Failed to load membership history');
          }
        },
        
        loadReferralStats: async (walletAddress: string) => {
          const { setError } = get();
          
          try {
            console.log('👥 Loading referral stats for:', walletAddress);
            // This would need proper API implementation
            // For now, mock data
            set({ 
              directReferrals: 0,
              totalDownline: 0,
              lastUpdated: new Date().toISOString()
            });
            console.log('👥 Referral stats loaded (mock)');
          } catch (error) {
            console.error('❌ Failed to load referral stats:', error);
            setError(error instanceof Error ? error.message : 'Failed to load referral stats');
          }
        },
        
        activateMembership: async (data, walletAddress) => {
          const { setProcessingState, setError, loadMembershipData } = get();
          setProcessingState(true, 'Activating membership...');
          setError(null);
          
          try {
            console.log('🚀 Activating membership:', data);
            
            const result = await callEdgeFunction('activate-membership', {
              transactionHash: data.txHash,
              level: data.level,
              paymentMethod: 'nft_claim',
              paymentAmount: data.level === 1 ? 130 : 100 + (data.level - 1) * 50,
              referrerWallet: data.referrerWallet
            }, walletAddress);
            
            if (!result.success) {
              throw new Error(result.error || 'Activation failed');
            }
            
            // Reload membership data
            await loadMembershipData(walletAddress);
            
            console.log('✅ Membership activation successful');
            return true;
          } catch (error) {
            console.error('❌ Membership activation failed:', error);
            setError(error instanceof Error ? error.message : 'Activation failed');
            return false;
          } finally {
            setProcessingState(false);
          }
        },
        
        upgradeMembership: async (data, walletAddress) => {
          const { setProcessingState, setError, loadMembershipData } = get();
          setProcessingState(true, 'Upgrading membership...');
          setError(null);
          
          try {
            console.log('⬆️ Upgrading membership:', data);
            
            const result = await callEdgeFunction('nft-upgrades', {
              action: 'process-upgrade',
              transactionHash: data.txHash,
              level: data.level,
              payment_amount_usdc: 100 + (data.level - 1) * 50,
              paymentMethod: 'token_payment'
            }, walletAddress);
            
            if (!result.success) {
              throw new Error(result.error || 'Upgrade failed');
            }
            
            // Reload membership data
            await loadMembershipData(walletAddress);
            
            console.log('✅ Membership upgrade successful');
            return true;
          } catch (error) {
            console.error('❌ Membership upgrade failed:', error);
            setError(error instanceof Error ? error.message : 'Upgrade failed');
            return false;
          } finally {
            setProcessingState(false);
          }
        },
        
        refreshAll: async (walletAddress: string) => {
          const { loadMembershipData, loadMembershipHistory, loadReferralStats } = get();
          
          console.log('🔄 Refreshing all membership data for:', walletAddress);
          await Promise.all([
            loadMembershipData(walletAddress),
            loadMembershipHistory(walletAddress),
            loadReferralStats(walletAddress)
          ]);
        },
        
        reset: () => {
          console.log('🔄 Resetting membership store');
          set(defaultState);
        }
      }),
      {
        name: 'beehive-membership-store',
        partialize: (state) => ({
          memberData: state.memberData,
          membershipHistory: state.membershipHistory,
          isActivated: state.isActivated,
          canUpgrade: state.canUpgrade,
          nextLevel: state.nextLevel,
          directReferrals: state.directReferrals,
          totalDownline: state.totalDownline,
          lastUpdated: state.lastUpdated
        }),
      }
    ),
    {
      name: 'MembershipStore',
    }
  )
);
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Notification interface
interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  autoClose?: boolean;
  duration?: number;
}

// UI state interface
interface UIState {
  // Global loading states
  isLoading: boolean;
  isConnecting: boolean;
  isProcessing: boolean;
  
  // Progress tracking
  currentStep: string;
  progress: number;
  totalSteps: number;
  
  // Modal states
  modals: {
    registration: boolean;
    referralLink: boolean;
    withdraw: boolean;
    matrixView: boolean;
    settings: boolean;
  };
  
  // Notifications
  notifications: Notification[];
  
  // Form states
  errors: Record<string, string>;
  
  // Theme and preferences
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  
  // Network status
  isOnline: boolean;
  networkError: string | null;
  
  // Actions
  setLoading: (loading: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setProcessing: (processing: boolean, step?: string) => void;
  setProgress: (current: number, total?: number) => void;
  setCurrentStep: (step: string) => void;
  
  // Modal actions
  openModal: (modal: keyof UIState['modals']) => void;
  closeModal: (modal: keyof UIState['modals']) => void;
  closeAllModals: () => void;
  
  // Notification actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  removeNotification: (id: string) => void;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  
  // Error handling
  setError: (field: string, error: string) => void;
  clearError: (field: string) => void;
  clearAllErrors: () => void;
  
  // Preferences
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Network status
  setNetworkStatus: (online: boolean, error?: string | null) => void;
  
  // Utilities
  reset: () => void;
}

// Default state
const defaultState = {
  isLoading: false,
  isConnecting: false,
  isProcessing: false,
  currentStep: '',
  progress: 0,
  totalSteps: 0,
  modals: {
    registration: false,
    referralLink: false,
    withdraw: false,
    matrixView: false,
    settings: false,
  },
  notifications: [],
  errors: {},
  theme: 'system' as const,
  sidebarCollapsed: false,
  isOnline: true,
  networkError: null,
};

export const useUIStore = create<UIState>()(
  devtools(
    (set, get) => ({
      ...defaultState,
      
      // Loading.tsx states
      setLoading: (isLoading) => {
        set({ isLoading });
      },
      
      setConnecting: (isConnecting) => {
        set({ isConnecting });
      },
      
      setProcessing: (isProcessing, currentStep = '') => {
        set({ isProcessing, currentStep });
      },
      
      setProgress: (progress, totalSteps) => {
        set({ 
          progress, 
          ...(totalSteps !== undefined && { totalSteps })
        });
      },
      
      setCurrentStep: (currentStep) => {
        set({ currentStep });
      },
      
      // Modal actions
      openModal: (modal) => {
        set((state) => ({
          modals: {
            ...state.modals,
            [modal]: true
          }
        }));
      },
      
      closeModal: (modal) => {
        set((state) => ({
          modals: {
            ...state.modals,
            [modal]: false
          }
        }));
      },
      
      closeAllModals: () => {
        set({
          modals: {
            registration: false,
            referralLink: false,
            withdraw: false,
            matrixView: false,
            settings: false,
          }
        });
      },
      
      // Notification actions
      addNotification: (notificationData) => {
        const notification: Notification = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString(),
          read: false,
          autoClose: notificationData.type === 'success' || notificationData.type === 'info',
          duration: notificationData.type === 'error' ? 8000 : 5000,
          ...notificationData
        };
        
        set((state) => ({
          notifications: [notification, ...state.notifications]
        }));
        
        // Auto-remove notification after duration
        if (notification.autoClose) {
          setTimeout(() => {
            get().removeNotification(notification.id);
          }, notification.duration);
        }
        
        console.log('📢 Notification added:', notification);
      },
      
      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }));
      },
      
      markNotificationAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map(n => 
            n.id === id ? { ...n, read: true } : n
          )
        }));
      },
      
      clearAllNotifications: () => {
        set({ notifications: [] });
      },
      
      // Error handling
      setError: (field, error) => {
        set((state) => ({
          errors: {
            ...state.errors,
            [field]: error
          }
        }));
      },
      
      clearError: (field) => {
        set((state) => {
          const { [field]: removed, ...errors } = state.errors;
          return { errors };
        });
      },
      
      clearAllErrors: () => {
        set({ errors: {} });
      },
      
      // Preferences
      setTheme: (theme) => {
        set({ theme });
        console.log('🎨 Theme changed to:', theme);
      },
      
      setSidebarCollapsed: (sidebarCollapsed) => {
        set({ sidebarCollapsed });
      },
      
      // Network status
      setNetworkStatus: (isOnline, networkError) => {
        set({ isOnline, networkError: networkError || null });
        
        if (!isOnline) {
          get().addNotification({
            type: 'warning',
            title: 'Network Issue',
            message: networkError || 'You appear to be offline',
          });
        }
      },
      
      // Utilities
      reset: () => {
        console.log('🔄 Resetting UI store');
        set(defaultState);
      }
    }),
    {
      name: 'UIStore',
    }
  )
);
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabaseApi } from './supabase';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Function to get wallet address from Web3 context
function getWalletAddress(): string | null {
  // Get wallet address from localStorage or sessionStorage where it's stored
  // This is a fallback method to access wallet address in the query client
  try {
    // Check if we can access the wallet address from the document
    const walletAddressElement = document.querySelector('[data-wallet-address]');
    if (walletAddressElement) {
      return walletAddressElement.getAttribute('data-wallet-address');
    }
    
    // Fallback to checking sessionStorage or localStorage
    return sessionStorage.getItem('wallet-address') || localStorage.getItem('wallet-address');
  } catch {
    return null;
  }
}

// Enhanced API request helper using Supabase Edge Functions
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  walletAddress?: string,
): Promise<Response> {
  // Get wallet address from session storage
  const addressToUse = walletAddress || getWalletAddress();
  
  // Map Express.js endpoints to Supabase Edge Function endpoints
  const endpointMap: Record<string, string> = {
    '/api/auth/register': 'auth',
    '/api/auth/user': 'auth', 
    '/api/balance/user': 'balance',
    '/api/balance/initialize': 'balance',
    '/api/balance/activate-level1': 'balance',
    '/api/balance/withdraw-usdt': 'balance',
    '/api/balance/withdrawals': 'balance',
    '/api/dashboard/data': 'balance', 
    '/api/dashboard/balances': 'balance',
    '/api/dashboard/matrix': 'matrix',
    '/api/dashboard/referrals': 'matrix',
    '/api/dashboard/activity': 'rewards',
    '/api/membership/activate': 'nft-upgrades',
    '/api/rewards/user': 'rewards/get-balance',
    '/api/rewards/claimable': 'rewards/get-claims',
    '/api/rewards/claim': 'rewards/claim-reward',
    '/api/wallet/withdraw-usdt': 'balance',
    '/api/wallet/log-connection': 'auth'
  };
  
  const functionName = endpointMap[url] || url.replace('/api/', '').replace(/\//g, '-');
  
  try {
    // For rewards functions that use URL-based actions, call directly
    if (functionName.startsWith('rewards/')) {
      const result = await supabaseApi.callFunction(functionName, data || {}, addressToUse);
      
      // Create a mock Response object for compatibility
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => result.data || result,
        text: async () => JSON.stringify(result.data || result)
      } as Response;
      
      return mockResponse;
    }
    
    // For other functions that use action-based parameters
    let action = '';
    switch (url) {
      case '/api/auth/register':
        action = 'register';
        break;
      case '/api/auth/user':
        action = 'get-user';
        break;
      case '/api/balance/user':
        action = 'get-balance';
        break;
      case '/api/balance/initialize':
        action = 'initialize-balance';
        break;
      case '/api/balance/activate-level1':
        action = 'activate-level1';
        break;
      case '/api/balance/withdraw-usdt':
        action = 'withdraw-usdt';
        break;
      case '/api/balance/withdrawals':
        action = 'get-withdrawals';
        break;
      case '/api/membership/activate':
        action = 'process-upgrade';
        break;
      case '/api/dashboard/matrix':
        action = 'get-matrix';
        break;
      case '/api/dashboard/referrals':
        action = 'get-downline';
        break;
      case '/api/matrix/stats':
        action = 'get-matrix-stats';
        break;
      case '/api/matrix/upline':
        action = 'get-upline';
        break;
      case '/api/matrix/downline':
        action = 'get-downline';
        break;
      case '/api/matrix/place':
        action = 'place-member';
        break;
      default:
        // For other endpoints, derive action from URL
        action = url.replace('/api/', '').replace(/\//g, '-');
    }

    const requestData = {
      action,
      ...data,
      walletAddress: addressToUse || data?.walletAddress,
      _method: method.toUpperCase()
    };
    
    const result = await supabaseApi.callFunction(functionName, requestData, addressToUse);
    
    // Create a mock Response object for compatibility
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => result.data || result,
      text: async () => JSON.stringify(result.data || result)
    } as Response;
    
    return mockResponse;
  } catch (error: any) {
    console.error(`Supabase API Error [${functionName}]:`, error);
    
    // Create mock error response
    const errorResponse = {
      ok: false,
      status: 500,
      statusText: error.message || 'Internal Server Error',
      json: async () => ({ error: error.message }),
      text: async () => error.message
    } as Response;
    
    throw errorResponse;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Include wallet address if available
    const walletAddress = getWalletAddress();
    
    // Handle different queryKey formats
    let url: string;
    if (queryKey.length === 1 && typeof queryKey[0] === 'string') {
      // Single URL string: ["/api/membership/available-levels/0x123"]
      url = queryKey[0];
    } else {
      // Array segments: ["/api/membership", "available-levels", "0x123"]
      url = queryKey.join("/");
    }
    
    try {
      // Use apiRequest to handle Supabase calls
      const res = await apiRequest('GET', url, undefined, walletAddress);
      return await res.json();
    } catch (error: any) {
      if (unauthorizedBehavior === "returnNull" && error.status === 401) {
        return null;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
      // Handle undefined data from thirdweb queries
      placeholderData: (previousData: any) => previousData,
      // Provide default data for specific query keys that might be undefined
      select: (data) => {
        // Handle thirdweb's "unsupported_token" query
        if (data === undefined || data === null) {
          return false; // Return false for unsupported token queries
        }
        return data;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

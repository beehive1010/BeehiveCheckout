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
    '/api/auth/register': 'auth-register',
    '/api/auth/user': 'auth-user', 
    '/api/balance/user': 'balance-user',
    '/api/balance/initialize': 'balance-initialize',
    '/api/balance/activate-level1': 'balance-activate-level1',
    '/api/balance/withdraw-usdt': 'balance-withdraw-usdt',
    '/api/balance/withdrawals': 'balance-withdrawals',
    '/api/dashboard/data': 'dashboard-data',
    '/api/dashboard/balances': 'dashboard-balances',
    '/api/dashboard/matrix': 'dashboard-matrix',
    '/api/dashboard/referrals': 'dashboard-referrals',
    '/api/dashboard/activity': 'dashboard-activity',
    '/api/membership/activate': 'membership-activate',
    '/api/rewards/user': 'rewards-user',
    '/api/rewards/claimable': 'rewards-claimable',
    '/api/rewards/claim': 'rewards-claim',
    '/api/wallet/withdraw-usdt': 'wallet-withdraw-usdt',
    '/api/wallet/log-connection': 'wallet-log-connection'
  };
  
  const functionName = endpointMap[url] || url.replace('/api/', '').replace(/\//g, '-');
  
  try {
    const requestData = {
      ...data,
      walletAddress: addressToUse || data?.walletAddress,
      _method: method.toUpperCase()
    };
    
    const result = await supabaseApi.invokeFunction(functionName, requestData);
    
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

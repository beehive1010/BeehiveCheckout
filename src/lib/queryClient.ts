import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabaseApi, dbFunctions } from './supabase';

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
  
  // Map Express.js endpoints to deployed Supabase Edge Functions
  // Based on deployed functions: admin, auth, balance, bcc-purchase, matrix, nft-upgrades, rewards, admin-cleanup
  const endpointMap: Record<string, string> = {
    // Auth functions
    '/api/auth/register': 'auth',
    '/api/auth/user': 'auth', 
    '/api/auth/login': 'auth',
    '/api/wallet/log-connection': 'auth',
    
    // Balance functions
    '/api/balance/user': 'balance',
    '/api/balance/initialize': 'balance',
    '/api/balance/activate-level1': 'balance',
    '/api/balance/withdraw-usdt': 'balance',
    '/api/balance/withdrawals': 'balance',
    '/api/dashboard/balances': 'balance',
    '/api/wallet/withdraw-usdt': 'balance',
    
    // Matrix functions
    '/api/dashboard/matrix': 'matrix',
    '/api/dashboard/referrals': 'matrix',
    '/api/matrix/stats': 'matrix',
    '/api/matrix/upline': 'matrix',
    '/api/matrix/downline': 'matrix',
    '/api/matrix/place': 'matrix',
    
    // Dashboard functions
    '/api/dashboard/activity': 'dashboard',
    '/api/dashboard/data': 'dashboard', 
    '/api/dashboard/stats': 'dashboard',
    
    // Rewards functions
    '/api/rewards/user': 'rewards',
    '/api/rewards/claimable': 'rewards',
    '/api/rewards/claim': 'rewards',
    
    // V2 API endpoints - map to existing edge functions
    '/api/v2/rewards/claimable': 'rewards',
    '/api/v2/rewards/pending': 'rewards',
    '/api/v2/rewards/stats': 'rewards',
    '/api/v2/balance/summary': 'balance',
    '/api/v2/balance/breakdown': 'balance',
    '/api/v2/balance/global-pool': 'balance',
    
    // NFT upgrade functions
    '/api/membership/activate': 'nft-upgrades',
    '/api/nft/upgrade': 'nft-upgrades',
    '/api/membership/purchase': 'nft-upgrades',
    
    // BCC purchase functions
    '/api/bcc/purchase': 'bcc-purchase',
    '/api/bcc/exchange': 'bcc-purchase',
    
    // Admin functions
    '/api/admin/users': 'admin',
    '/api/admin/stats': 'admin',
    '/api/admin/cleanup': 'admin-cleanup'
  };
  
  const functionName = endpointMap[url] || url.replace('/api/', '').replace(/\//g, '-');
  
  try {
    // Determine action based on the endpoint URL
    let action = '';
    switch (url) {
      // Auth actions
      case '/api/auth/register':
        action = 'register';
        break;
      case '/api/auth/user':
        action = 'get-user';
        break;
      case '/api/auth/login':
        action = 'login';
        break;
      case '/api/wallet/log-connection':
        action = 'log-connection';
        break;
      
      // Balance actions
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
      case '/api/wallet/withdraw-usdt':
        action = 'withdraw-usdt';
        break;
      case '/api/balance/withdrawals':
        action = 'get-withdrawals';
        break;
      case '/api/dashboard/data':
      case '/api/dashboard/balances':
        action = 'get-dashboard-data';
        break;
      
      // Matrix actions
      case '/api/dashboard/matrix':
        action = 'get-matrix';
        break;
      case '/api/dashboard/referrals':
        action = 'get-referrals';
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
      
      // Dashboard actions (handled by dashboard function)
      case '/api/dashboard/activity':
        action = 'get-activity';
        break;
      case '/api/dashboard/stats':
        action = 'get-stats';
        break;
      case '/api/rewards/user':
        action = 'get-rewards';
        break;
      case '/api/rewards/claimable':
        action = 'get-claimable';
        break;
      case '/api/rewards/claim':
        action = 'claim-reward';
        break;
      
      // V2 API actions - Fixed to match actual edge function actions
      case '/api/v2/rewards/claimable':
        action = 'get-claims'; // Fixed: was 'get-claimable'
        break;
      case '/api/v2/rewards/pending':
        action = 'check-pending-rewards'; // Fixed: was 'get-pending'
        break;
      case '/api/v2/rewards/stats':
        action = 'dashboard'; // Fixed: was 'get-stats'
        break;
      case '/api/v2/balance/summary':
        action = 'get-balance'; // Fixed: balance function uses 'get-balance' for summary
        break;
      case '/api/v2/balance/breakdown':
        action = 'get-balance'; // Fixed: balance function doesn't support breakdown, use get-balance
        break;
      case '/api/v2/balance/global-pool':
        action = 'get-balance'; // Fixed: balance function doesn't support global-pool, use get-balance
        break;
      
      // NFT upgrade actions
      case '/api/membership/activate':
        action = 'activate-membership';
        break;
      case '/api/nft/upgrade':
        action = 'process-upgrade';
        break;
      case '/api/membership/purchase':
        action = 'purchase-membership';
        break;
      
      // BCC purchase actions
      case '/api/bcc/purchase':
        action = 'purchase-bcc';
        break;
      case '/api/bcc/exchange':
        action = 'exchange-bcc';
        break;
      
      // Admin actions
      case '/api/admin/users':
        action = 'get-users';
        break;
      case '/api/admin/stats':
        action = 'get-stats';
        break;
      case '/api/admin/cleanup':
        action = 'cleanup';
        break;
      
      default:
        // For other endpoints, derive action from URL
        action = url.replace('/api/', '').replace(/\//g, '-');
    }

    const requestData = {
      action,
      ...(data || {}),
      walletAddress: addressToUse || (data as any)?.walletAddress,
      _method: method.toUpperCase()
    };
    
    // Call the Edge Function directly - no fallback since functions are deployed
    const result = await supabaseApi.callFunction(functionName, requestData, addressToUse || undefined);
    
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
    console.error(`Supabase Edge Function Error [${functionName}]:`, error);
    
    // Handle authentication errors specifically
    let status = 500;
    if (error.message?.includes('Authentication') || 
        error.message?.includes('session') || 
        error.message?.includes('sign in') ||
        error.message?.includes('JWT')) {
      status = 401;
    } else if (error.message?.includes('not found') || 
               error.message?.includes('404')) {
      status = 404;
    } else if (error.message?.includes('forbidden') || 
               error.message?.includes('403')) {
      status = 403;
    }
    
    // Create mock error response for compatibility
    const errorResponse = {
      ok: false,
      status: status,
      statusText: error.message || 'Internal Server Error',
      json: async () => ({ 
        success: false, 
        error: error.message || 'Edge Function request failed',
        functionName,
        action: error.action || 'unknown'
      }),
      text: async () => error.message || 'Edge Function request failed'
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
      const res = await apiRequest('GET', url, undefined, walletAddress || undefined);
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

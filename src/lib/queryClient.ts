import {QueryClient, QueryFunction} from "@tanstack/react-query";

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

// Direct Supabase Edge Function caller
export async function apiRequest(
    method: string,
    url: string,
    data?: { action?: string } | any,
    walletAddress?: string,
    options?: {
        method?: string;
        data?: unknown;
        walletAddress?: string;
    }): Promise<Response> {
  const finalMethod = options?.method || method;
  const finalData = options?.data || data;
  // Get wallet address from session storage
  const addressToUse = options?.walletAddress || walletAddress || getWalletAddress();
  
  // Base Supabase URL
  const baseUrl = 'https://cdjmtevekxpmgrixkiqt.supabase.co/functions/v1';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  // Simple mapping: extract function name from URL
  let functionName = 'balance'; // default
  let action = 'get-balance'; // default
  
  // Determine function and action from URL
  if (url.includes('/auth/') || url.includes('/wallet/')) {
    functionName = 'auth';
    if (url.includes('register')) action = 'register';
    else if (url.includes('user')) action = 'get-user';
    else if (url.includes('login')) action = 'login';
    else if (url.includes('log-connection')) action = 'log-connection';
  } else if (url.includes('/balance/') || url.includes('/v2/balance/')) {
    functionName = 'balance';
    action = 'get-balance'; // All balance operations use get-balance
  } else if (url.includes('/matrix/') || url.includes('/dashboard/matrix') || url.includes('/dashboard/referrals')) {
    functionName = 'matrix';
    if (url.includes('stats')) action = 'get-matrix-stats';
    else if (url.includes('referrals')) action = 'get-referrals';
    else if (url.includes('upline')) action = 'get-upline';
    else if (url.includes('downline')) action = 'get-downline';
    else if (url.includes('place')) action = 'place-member';
    else action = 'get-matrix';
  } else if (url.includes('/rewards/') || url.includes('/v2/rewards/')) {
    functionName = 'rewards';
    if (url.includes('claimable')) action = 'get-claims';
    else if (url.includes('pending')) action = 'check-pending-rewards';
    else if (url.includes('stats') || url.includes('dashboard')) action = 'dashboard';
    else if (url.includes('history')) action = 'get-claims';
    else if (url.includes('claim')) action = 'claim-reward';
    else action = 'get-balance';
  } else if (url.includes('/membership/') || url.includes('/nft/')) {
    functionName = 'nft-upgrades';
    if (url.includes('activate')) action = 'activate-membership';
    else if (url.includes('upgrade')) action = 'process-upgrade';
    else if (url.includes('purchase')) action = 'purchase-membership';
  } else if (url.includes('/bcc/')) {
    functionName = 'bcc-purchase';
    if (url.includes('purchase')) action = 'purchase-bcc';
    else if (url.includes('exchange')) action = 'exchange-bcc';
  } else if (url.includes('/admin/')) {
    functionName = 'admin';
    if (url.includes('users')) action = 'get-users';
    else if (url.includes('stats')) action = 'get-stats';
    else if (url.includes('cleanup')) action = 'cleanup';
  } else if (url.includes('/dashboard/')) {
    functionName = 'dashboard';
    if (url.includes('activity')) action = 'get-activity';
    else if (url.includes('stats')) action = 'get-stats';
    else action = 'get-dashboard-data';
  } else if (url.includes('/notifications/')) {
    functionName = 'notification';
    if (url.includes('stats')) action = 'get-notification-stats';
    else if (url.includes('read')) action = 'mark-read';
    else if (url.includes('archive')) action = 'archive';
    else action = 'get-notifications';
  }
  
  try {
    const requestData = {
      action,
      ...(finalData || {}),
      walletAddress: addressToUse
    };
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`
    };
    
    if (addressToUse) {
      headers['x-wallet-address'] = addressToUse;
    }
    
    // Call Supabase Edge Function directly
    const response = await fetch(`${baseUrl}/${functionName}`, {
      method: finalMethod === 'GET' ? 'POST' : finalMethod, // Most edge functions expect POST
      headers,
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    
    return response;
  } catch (error: any) {
    console.error(`Supabase Edge Function Error [${functionName}]:`, error);
    
    // Create mock error response for compatibility
    const errorResponse = {
      ok: false,
      status: 500,
      statusText: error.message || 'Internal Server Error',
      json: async () => ({ 
        success: false, 
        error: error.message || 'Edge Function request failed',
        functionName,
        action
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

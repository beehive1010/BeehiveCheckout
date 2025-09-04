import { QueryClient, QueryFunction } from "@tanstack/react-query";

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

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  walletAddress?: string,
): Promise<Response> {
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Include wallet address header if available
  const addressToUse = walletAddress || getWalletAddress();
  if (addressToUse) {
    headers["X-Wallet-Address"] = addressToUse;
  }
  
  // FORCE localhost for all API calls in development
  const baseUrl = 'http://localhost:5000';
  const fullUrl = url.startsWith('http') ? url.replace(/https:\/\/[^\/]+/, baseUrl) : `${baseUrl}${url}`;

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    
    // Include wallet address header if available
    const walletAddress = getWalletAddress();
    if (walletAddress) {
      headers["X-Wallet-Address"] = walletAddress;
    }
    
    // No JWT authentication - simplified wallet-only approach
    
    // Handle different queryKey formats
    let url: string;
    if (queryKey.length === 1 && typeof queryKey[0] === 'string') {
      // Single URL string: ["/api/membership/available-levels/0x123"]
      url = queryKey[0];
    } else {
      // Array segments: ["/api/membership", "available-levels", "0x123"]
      url = queryKey.join("/");
    }
    
    const res = await fetch(url, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
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

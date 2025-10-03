// Edge Functions utility for calling Supabase Edge Functions
// Secure implementation with environment variable configuration

interface EdgeFunctionOptions {
  walletAddress?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

interface EdgeFunctionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  amount?: number;
  message?: string;
  timestamp?: string;
  withdrawalId?: string;
  transactionHash?: string;
  id?: string;
}

// Secure API base URL from environment
const getApiBase = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL environment variable is required');
  }
  return `${supabaseUrl}/functions/v1`;
};

// Validate environment on module load
let API_BASE: string;
try {
  API_BASE = getApiBase();
} catch (error) {
  console.error('❌ Edge Functions configuration error:', error);
  throw error;
}

// Secure headers generation
const getSecureHeaders = (options: EdgeFunctionOptions = {}): Record<string, string> => {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error('VITE_SUPABASE_ANON_KEY environment variable is required');
  }
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${anonKey}`,
    'apikey': anonKey,
    'X-Client-Info': 'beehive-platform/1.0.0',
    ...options.headers
  };
};

// Fetch with timeout and abort controller
const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeoutMs: number = 30000
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

// Retry logic for edge function calls
const retryEdgeFunction = async <T>(
  operation: () => Promise<EdgeFunctionResponse<T>>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<EdgeFunctionResponse<T>> => {
  let lastError: EdgeFunctionResponse<T>;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      
      // Don't retry on client errors (4xx)
      if (!result.success && result.error?.includes('HTTP 4')) {
        return result;
      }
      
      // Return successful results or server errors on last attempt
      if (result.success || attempt === maxRetries) {
        return result;
      }
      
      lastError = result;
    } catch (error) {
      lastError = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
      
      if (attempt === maxRetries) {
        break;
      }
    }
    
    // Exponential backoff for retries
    const delay = baseDelay * Math.pow(2, attempt - 1);
    console.log(`🔄 Retrying edge function call in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  return lastError!;
};

export async function callEdgeFunction<T = any>(
  functionName: string,
  data: any,
  walletAddress?: string,
  options: EdgeFunctionOptions = {}
): Promise<EdgeFunctionResponse<T>> {
  const { timeout = 30000, retries = 2, ...restOptions } = options;
  
  // Validate function name to prevent injection
  if (!/^[a-zA-Z0-9_-]+$/.test(functionName)) {
    return {
      success: false,
      error: `Invalid function name: ${functionName}`,
      timestamp: new Date().toISOString()
    };
  }
  
  const operation = async (): Promise<EdgeFunctionResponse<T>> => {
    try {
      const url = `${API_BASE}/${functionName}`;
      const headers = getSecureHeaders(restOptions);

      // Add wallet address to headers if provided (with validation)
      const targetWallet = walletAddress || restOptions.walletAddress;
      if (targetWallet) {
        // Validate wallet address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(targetWallet)) {
          return {
            success: false,
            error: 'Invalid wallet address format',
            timestamp: new Date().toISOString()
          };
        }
        headers['x-wallet-address'] = targetWallet;
      }

      // Log with security masking
      const maskedData = { ...data };
      Object.keys(maskedData).forEach(key => {
        if (key.toLowerCase().includes('password') || key.toLowerCase().includes('key')) {
          maskedData[key] = '***';
        }
      });
      
      console.log(`📞 Secure Edge Function Call: ${functionName}`, {
        url: url.replace(/\/functions\/v1\/.*/, '/functions/v1/***'), // Mask URL
        data: maskedData,
        walletAddress: targetWallet ? `${targetWallet.slice(0, 6)}...${targetWallet.slice(-4)}` : undefined,
        timestamp: new Date().toISOString()
      });

      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      }, timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`❌ Edge Function ${functionName} failed:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          timestamp: new Date().toISOString()
        });
        
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
          timestamp: new Date().toISOString()
        };
      }

      const result = await response.json() as EdgeFunctionResponse<T>;
      
      // Add timestamp to response
      result.timestamp = new Date().toISOString();
      
      console.log(`✅ Edge Function ${functionName} success:`, {
        success: result.success,
        hasData: !!result.data,
        timestamp: result.timestamp
      });
      
      return result;
    } catch (error) {
      console.error(`❌ Edge Function ${functionName} error:`, {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  };
  
  // Use retry logic if retries > 0
  if (retries > 0) {
    return retryEdgeFunction(operation, retries + 1);
  }
  
  return operation();
}

// Typed Edge Function callers with enhanced security
export const edgeFunctions = {
  activateMembership: (data: any, walletAddress: string, options?: EdgeFunctionOptions) =>
    callEdgeFunction('activate-membership', data, walletAddress, { 
      timeout: 45000, // Extended timeout for blockchain operations
      retries: 3,
      ...options 
    }),
    
  levelUpgrade: (data: any, walletAddress: string, options?: EdgeFunctionOptions) =>
    callEdgeFunction('level-upgrade', data, walletAddress, {
      timeout: 30000,
      retries: 2,
      ...options
    }),
    
  nftUpgrades: (data: any, walletAddress: string, options?: EdgeFunctionOptions) =>
    callEdgeFunction('nft-upgrades', data, walletAddress, { 
      timeout: 45000, // Extended for NFT operations
      retries: 3,
      ...options 
    }),
    
  matrixOperations: (data: any, walletAddress: string, options?: EdgeFunctionOptions) =>
    callEdgeFunction('matrix-operations', data, walletAddress, { 
      timeout: 30000,
      retries: 2,
      ...options 
    }),
    
  rewards: (data: any, walletAddress: string, options?: EdgeFunctionOptions) =>
    callEdgeFunction('rewards', data, walletAddress, { 
      timeout: 20000,
      retries: 2,
      ...options 
    }),
    
  chainData: (data: any, walletAddress?: string, options?: EdgeFunctionOptions) =>
    callEdgeFunction('chain-data', data, walletAddress, { 
      timeout: 15000,
      retries: 1,
      ...options 
    }),
    
  notifications: (data: any, walletAddress: string, options?: EdgeFunctionOptions) =>
    callEdgeFunction('notifications', data, walletAddress, { 
      timeout: 10000,
      retries: 1,
      ...options 
    }),
    
  auth: (data: any, walletAddress?: string, options?: EdgeFunctionOptions) =>
    callEdgeFunction('auth', data, walletAddress, {
      timeout: 15000,
      retries: 2,
      ...options
    }),

  syncMembers: (data: any, walletAddress?: string, options?: EdgeFunctionOptions) =>
    callEdgeFunction('sync-members', data, walletAddress, {
      timeout: 60000, // 60s for batch sync operations
      retries: 1,
      ...options
    })
};

// Health check for edge functions
export const testEdgeFunctionConnectivity = async (): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> => {
  const startTime = Date.now();
  
  try {
    const result = await callEdgeFunction('auth', { action: 'health-check' }, undefined, {
      timeout: 5000,
      retries: 0
    });
    
    const latency = Date.now() - startTime;
    
    return {
      healthy: result.success || result.error?.includes('Unknown action'), // Health check may not be implemented
      latency,
      error: result.success ? undefined : result.error
    };
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// Export configuration info (no sensitive data)
export const getEdgeFunctionInfo = () => ({
  apiBase: API_BASE,
  hasValidConfig: !!(API_BASE && import.meta.env.VITE_SUPABASE_ANON_KEY),
  availableFunctions: Object.keys(edgeFunctions)
});

export default callEdgeFunction;
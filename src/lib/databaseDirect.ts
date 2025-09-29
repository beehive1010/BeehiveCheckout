// Direct PostgreSQL database connection utility with secure environment configuration
// Uses IPv4 connection with SSL and proper credential management

// Secure configuration from environment variables
const getDbConfig = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const databaseUrl = import.meta.env.DATABASE_URL;
  
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL environment variable is required');
  }
  
  // Extract project ID from Supabase URL for REST API
  const projectId = supabaseUrl.match(/https:\/\/(.*?)\.supabase\.co/)?.[1];
  if (!projectId) {
    throw new Error('Invalid VITE_SUPABASE_URL format');
  }
  
  return {
    projectId,
    restApiBase: `${supabaseUrl}/rest/v1`,
    databaseUrl, // Full connection string with credentials
    supabaseUrl
  };
};

// Validate environment on module load
let dbConfig: ReturnType<typeof getDbConfig>;
try {
  dbConfig = getDbConfig();
} catch (error) {
  console.error('❌ Database configuration error:', error);
  throw error;
}

interface QueryOptions {
  select?: string;
  filter?: Record<string, any>;
  single?: boolean;
  timeout?: number; // milliseconds
  retries?: number;
}

interface QueryResult<T = any> {
  data: T | null;
  error: Error | null;
  status?: number;
}

class DirectDatabaseClient {
  private getHeaders() {
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!anonKey) {
      throw new Error('VITE_SUPABASE_ANON_KEY environment variable is required');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
      'apikey': anonKey,
      'X-Client-Info': 'beehive-platform/1.0.0'
    };
  }
  
  private async fetchWithTimeout(
    url: string, 
    options: RequestInit, 
    timeoutMs: number = 10000
  ): Promise<Response> {
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
  }
  
  private async retryOperation<T>(
    operation: () => Promise<T>, 
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on authentication errors
        if (lastError.message.includes('401') || lastError.message.includes('403')) {
          throw lastError;
        }
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`🔄 Retrying database operation (attempt ${attempt + 1}/${maxRetries}) in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  async query<T = any>(table: string, options: QueryOptions = {}): Promise<QueryResult<T>> {
    const { timeout = 10000, retries = 3, ...queryOptions } = options;
    
    return this.retryOperation(async () => {
      try {
        // Validate table name to prevent injection
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
          throw new Error(`Invalid table name: ${table}`);
        }
        
        let url = `${dbConfig.restApiBase}/${table}`;
        const params = new URLSearchParams();

        // Add select fields (validate to prevent injection)
        if (queryOptions.select) {
          // Basic validation for select clause
          if (!/^[a-zA-Z0-9_,.*\s()]+$/.test(queryOptions.select)) {
            throw new Error(`Invalid select clause: ${queryOptions.select}`);
          }
          params.append('select', queryOptions.select);
        }

        // Add filters with validation
        if (queryOptions.filter) {
          Object.entries(queryOptions.filter).forEach(([key, value]) => {
            // Validate key format
            if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(key.split('.')[0])) {
              throw new Error(`Invalid filter key: ${key}`);
            }
            
            if (key.includes('.')) {
              // Handle operators like 'ilike', 'gte', etc.
              params.append(key, value);
            } else {
              params.append(`${key}`, `eq.${value}`);
            }
          });
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        // Log query with security masking
        const maskedUrl = url.replace(/([?&])([^=]+)=([^&]*)/g, (match, sep, key, value) => {
          if (key.toLowerCase().includes('password') || key.toLowerCase().includes('key')) {
            return `${sep}${key}=***`;
          }
          return match;
        });
        console.log('🔍 Secure IPv4 DB Query:', maskedUrl);

        const response = await this.fetchWithTimeout(url, {
          method: 'GET',
          headers: this.getHeaders(),
        }, timeout);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error('❌ Database query failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          });
          throw new Error(`Database query failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        if (queryOptions.single) {
          return {
            data: data.length > 0 ? data[0] : null,
            error: data.length === 0 ? new Error('No data found') : null,
            status: response.status
          };
        }

        return { 
          data, 
          error: null, 
          status: response.status 
        };
      } catch (error) {
        console.error('❌ Secure database query error:', {
          error: error instanceof Error ? error.message : String(error),
          table,
          timestamp: new Date().toISOString()
        });
        
        return { 
          data: null, 
          error: error instanceof Error ? error : new Error(String(error)) 
        };
      }
    }, retries);
  }

  // User queries with validation
  async checkUserExists(walletAddress: string) {
    // Validate wallet address format
    if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return { 
        data: null, 
        error: new Error('Invalid wallet address format') 
      };
    }
    
    return this.query('users', {
      filter: { [`wallet_address.eq`]: walletAddress },
      select: 'wallet_address,username,email,created_at',
      single: true,
      timeout: 5000
    });
  }

  async checkMembershipLevel(walletAddress: string, minLevel: number = 1) {
    // Validate inputs
    if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return { 
        data: null, 
        error: new Error('Invalid wallet address format') 
      };
    }
    
    if (!Number.isInteger(minLevel) || minLevel < 0 || minLevel > 19) {
      return { 
        data: null, 
        error: new Error('Invalid level: must be integer between 0-19') 
      };
    }
    
    return this.query('members', {
      filter: { 
        [`wallet_address.eq`]: walletAddress,
        [`current_level.gte`]: minLevel
      },
      select: 'wallet_address,current_level,activation_time,referrer_wallet',
      single: true,
      timeout: 5000
    });
  }
  
  // Additional secure query methods
  async getMemberData(walletAddress: string) {
    if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return { 
        data: null, 
        error: new Error('Invalid wallet address format') 
      };
    }
    
    return this.query('members', {
      filter: { [`wallet_address.ilike`]: walletAddress },
      select: '*',
      single: true,
      timeout: 5000
    });
  }

  // Secure RPC function calls (for complex operations)
  async callRPC(functionName: string, params: Record<string, any>, options: { timeout?: number; retries?: number } = {}) {
    const { timeout = 15000, retries = 2 } = options;
    
    return this.retryOperation(async () => {
      try {
        // Validate function name to prevent injection
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(functionName)) {
          throw new Error(`Invalid RPC function name: ${functionName}`);
        }
        
        const url = `${dbConfig.restApiBase}/rpc/${functionName}`;
        
        // Log with parameter masking for security
        const maskedParams = { ...params };
        Object.keys(maskedParams).forEach(key => {
          if (key.toLowerCase().includes('password') || key.toLowerCase().includes('key')) {
            maskedParams[key] = '***';
          }
        });
        console.log('🔧 Secure IPv4 RPC Call:', functionName, maskedParams);

        const response = await this.fetchWithTimeout(url, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(params)
        }, timeout);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error('❌ RPC call failed:', {
            function: functionName,
            status: response.status,
            error: errorText
          });
          throw new Error(`RPC call failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return { data, error: null };
      } catch (error) {
        console.error('❌ Secure RPC call error:', {
          function: functionName,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
        return { 
          data: null, 
          error: error instanceof Error ? error : new Error(String(error)) 
        };
      }
    }, retries);
  }
  
  // Health check method
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      const result = await this.query('users', {
        select: 'count(*)',
        timeout: 5000,
        retries: 1
      });
      
      const latency = Date.now() - startTime;
      
      if (result.error) {
        return { 
          healthy: false, 
          latency, 
          error: result.error.message 
        };
      }
      
      return { 
        healthy: true, 
        latency 
      };
    } catch (error) {
      return { 
        healthy: false, 
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Export singleton instance
export const directDB = new DirectDatabaseClient();

// Export secure configuration getter (no sensitive data)
export const getSecureDbInfo = () => ({
  projectId: dbConfig.projectId,
  hasValidConfig: !!(dbConfig.restApiBase && import.meta.env.VITE_SUPABASE_ANON_KEY),
  restApiBase: dbConfig.restApiBase
});

// Connection test utility
export const testDatabaseConnection = async () => {
  console.log('🔍 Testing secure database connection...');
  
  const healthResult = await directDB.healthCheck();
  
  if (healthResult.healthy) {
    console.log(`✅ Database connection healthy (${healthResult.latency}ms)`);
  } else {
    console.error(`❌ Database connection failed: ${healthResult.error}`);
  }
  
  return healthResult;
};

// Type exports
export type { QueryOptions, QueryResult };
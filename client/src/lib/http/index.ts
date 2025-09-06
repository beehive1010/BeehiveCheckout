// Updated HTTP Client to use Supabase Edge Functions
import { supabaseApi } from '../supabase';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  walletAddress?: string;
}

class HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, walletAddress } = options;
    
    // Use Supabase API for all requests
    try {
      const functionName = endpoint.replace('/api/', '').replace(/\//g, '-');
      const requestData = {
        ...body,
        walletAddress: walletAddress || sessionStorage.getItem('wallet-address'),
        _method: method
      };
      
      const result = await supabaseApi.invokeFunction(functionName, requestData);
      return result.data as T;
    } catch (error: any) {
      throw new Error(error.message || `Failed to call ${endpoint}`);
    }
    }
  }

  async get<T>(endpoint: string, walletAddress?: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', walletAddress });
  }

  async post<T>(endpoint: string, body?: any, walletAddress?: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, walletAddress });
  }

  async put<T>(endpoint: string, body?: any, walletAddress?: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, walletAddress });
  }

  async patch<T>(endpoint: string, body?: any, walletAddress?: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body, walletAddress });
  }

  async delete<T>(endpoint: string, walletAddress?: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', walletAddress });
  }

  // Health check for connectivity testing
  async health(): Promise<{ status: string; timestamp: string }> {
    return this.get('/api/health');
  }
}

export const httpClient = new HttpClient();
export default httpClient;
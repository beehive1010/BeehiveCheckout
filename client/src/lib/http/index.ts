const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.MODE === 'development' ? '/api' : '/api');

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  walletAddress?: string;
}

class HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', headers = {}, body, walletAddress } = options;
    
    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...(walletAddress && { 'x-wallet-address': walletAddress }),
      },
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, config);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text() as T;
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
    return this.get('/health');
  }
}

export const httpClient = new HttpClient();
export default httpClient;
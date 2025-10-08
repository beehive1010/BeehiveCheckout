/**
 * Utility for handling dynamic module imports with retry logic
 * Specifically designed to handle thirdweb module loading issues
 */

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Import a module with retry logic and fallback handling
 */
export async function importWithRetry<T = unknown>(
  importFn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onRetry
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await importFn();
    } catch (error) {
      lastError = error as Error;
      
      console.warn(`Module import attempt ${attempt}/${maxRetries} failed:`, error);
      
      // Check for specific thirdweb dynamic import errors
      if (error instanceof Error) {
        const isChunkLoadError = 
          error.message.includes('Failed to fetch dynamically imported module') ||
          error.message.includes('Loading.tsx chunk') ||
          error.message.includes('eth_getTransactionCount') ||
          error.message.includes('Loading.tsx CSS chunk');

        if (isChunkLoadError) {
          console.log(`🔄 Retrying module import (attempt ${attempt}/${maxRetries})...`);
        }
      }

      if (onRetry) {
        onRetry(attempt, error as Error);
      }

      // Don't retry on the last attempt
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }

  throw new Error(`Module import failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
}

/**
 * Specific utility for thirdweb transaction functions with enhanced error handling
 */
export async function importThirdwebTransaction() {
  return importWithRetry(
    () => import('thirdweb'),
    {
      maxRetries: 5,
      retryDelay: 2000,
      onRetry: (attempt, error) => {
        console.log(`🔄 Retrying thirdweb import... (${attempt}/5)`);
        if (error.message.includes('eth_getTransactionCount')) {
          console.log('🎯 Detected eth_getTransactionCount module error - this is a known issue');
        }
      }
    }
  );
}

/**
 * Preload commonly failing thirdweb modules
 */
export async function preloadThirdwebModules(): Promise<void> {
  try {
    console.log('🚀 Preloading thirdweb modules...');
    
    // Preload core thirdweb functionality
    await importWithRetry(() => import('thirdweb'), {
      maxRetries: 2,
      retryDelay: 500
    });
    
    console.log('✅ Thirdweb modules preloaded successfully');
  } catch (error) {
    console.warn('⚠️ Failed to preload thirdweb modules:', error);
    // Don't throw - this is just optimization
  }
}

/**
 * Handle chunk loading errors globally
 */
export function setupGlobalChunkErrorHandler(): void {
  // Handle unhandled promise rejections related to chunk loading
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    if (error instanceof Error) {
      const isChunkError = 
        error.message.includes('Loading.tsx chunk') ||
        error.message.includes('Failed to fetch dynamically imported module') ||
        error.message.includes('eth_getTransactionCount');
        
      if (isChunkError) {
        console.error('🚨 Global chunk loading error detected:', error.message);
        
        // Optionally show user-friendly message
        const userMessage = 'Network loading issue detected. Please refresh the page and try again.';
        
        // You can integrate with your toast system here
        if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).showToast) {
          ((window as unknown as Record<string, unknown>).showToast as (options: {
            title: string;
            description: string;
            variant: string;
          }) => void)({
            title: 'Network Error',
            description: userMessage,
            variant: 'destructive'
          });
        }
        
        // Prevent the error from bubbling up
        event.preventDefault();
      }
    }
  });
}
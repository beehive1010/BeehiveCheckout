import { createThirdwebClient } from 'thirdweb';

// Initialize Thirdweb client
export const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID || '3123b1ac2ebdb966dd415c6e964dc335'
});

// Client configuration options
export const clientConfig = {
  secretKey: import.meta.env.VITE_THIRDWEB_SECRET_KEY, // Server-side only
  appMetadata: {
    name: "BeeHive Web3 Platform",
    description: "Web3 membership and learning platform with blockchain-based credentials",
    logoUrl: "https://your-domain.com/logo.png",
    url: "https://your-domain.com",
  },
};

// Development/Production client settings
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// Client utilities
export const getClientId = () => {
  return import.meta.env.VITE_THIRDWEB_CLIENT_ID || '3123b1ac2ebdb966dd415c6e964dc335';
};

export const validateClient = () => {
  if (!client) {
    throw new Error('Thirdweb client not initialized');
  }
  return true;
};
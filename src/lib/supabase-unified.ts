// Unified Supabase client configuration for Beehive Platform
// This file re-exports from supabaseClient.ts to maintain a single client instance
// and avoid "Multiple GoTrueClient instances detected" warnings

// Re-export the single Supabase client instance and all services
export {
  supabase,
  supabaseApi,
  authService,
  balanceService,
  membershipService,
  matrixService,
  rewardService,
  transactionService,
  referralService,
  nftService,
  educationService,
  courseService,
  taskService,
  callEdgeFunction,
  EDGE_FUNCTIONS_URL
} from './supabaseClient';

// Default export for convenience
export { default } from './supabaseClient';

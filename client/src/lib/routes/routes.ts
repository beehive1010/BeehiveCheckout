// Protected routes that require Level 1 NFT
export const protectedRoutes = [
  '/dashboard',
  '/tasks',
  '/education',
  '/discover',
  '/me',
  '/profile'
];

// Public routes accessible without wallet or NFT
export const publicRoutes = [
  '/',
  '/landing',
  '/hiveworld',
  '/blog'
];

// Registration flow routes (require wallet but not NFT)
export const registrationFlowRoutes = [
  '/register',
  '/welcome'
];
import type { Express } from "express";
import { createServer, type Server } from "http";

// Import route registrars
import { registerAuthRoutes } from "./routes/auth.routes";
import { registerWalletRoutes } from "./routes/wallet.routes";
import { registerUsersRoutes } from "./routes/users.routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // JWT secret for authentication
  const JWT_SECRET = process.env.JWT_SECRET || 'beehive-secret-key';
  
  // API Route Protection - Force JSON response for API calls  
  app.use('/api', (req, res, next) => {
    console.log(`🔍 API Route Hit: ${req.method} ${req.originalUrl}`);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-API-Route', 'true');
    next();
  });
  
  // Middleware to extract wallet address from auth
  const requireWallet = (req: any, res: any, next: any) => {
    const walletAddress = req.headers['x-wallet-address'];
    if (!walletAddress) {
      return res.status(401).json({ error: 'Wallet address required' });
    }
    req.walletAddress = walletAddress.toLowerCase();
    next();
  };

  // Register feature routes
  registerAuthRoutes(app, requireWallet);
  registerWalletRoutes(app);
  registerUsersRoutes(app, requireWallet);

  // TODO: Register remaining route modules
  // registerMembershipRoutes(app, requireWallet);
  // registerRewardsRoutes(app, requireWallet);
  // registerReferralsRoutes(app, requireWallet);
  // registerEducationRoutes(app, requireWallet);
  // registerTasksRoutes(app, requireWallet);
  // registerAdminRoutes(app, requireWallet);

  // Create and return HTTP server
  const server = createServer(app);
  
  return server;
}
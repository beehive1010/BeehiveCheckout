import type { Express } from "express";
import { createServer, type Server } from "http";

// Import route registrars
import { registerAuthRoutes } from "./routes/auth.routes";
import { registerWalletRoutes } from "./routes/wallet.routes";
import { registerUsersRoutes } from "./routes/users.routes";
import { registerMembershipRoutes } from "./routes/membership.routes";
import { registerRewardsRoutes } from "./routes/rewards.routes";
import { registerReferralsRoutes } from "./routes/referrals.routes";
import { registerEducationRoutes } from "./routes/education.routes";
import { registerTasksRoutes } from "./routes/tasks.routes";
import { registerAdminRoutes } from "./routes/admin.routes";
import { registerDashboardRoutes } from "./routes/dashboard.routes";
import { registerDashboardFixRoutes } from "./routes/dashboard-fix.routes";
import { registerNotificationsRoutes } from "./routes/notifications.routes";
import { registerStatsRoutes } from "./routes/stats.routes";
import { registerMatrixRoutes } from "./routes/matrix.routes";
import { registerConfigRoutes } from "./routes/config.routes";
import { registerBlogRoutes } from "./routes/blog.routes";
import { serviceRequestsRouter } from "./routes/service-requests.routes";
import healthRoutes from "./routes/health.routes";

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

  // Health routes (no auth required)
  app.use('/api', healthRoutes);

  // Register all feature routes
  registerAuthRoutes(app, requireWallet);
  registerWalletRoutes(app);
  registerUsersRoutes(app, requireWallet);
  registerMembershipRoutes(app, requireWallet);
  registerRewardsRoutes(app, requireWallet);
  registerReferralsRoutes(app, requireWallet);
  registerEducationRoutes(app, requireWallet);
  registerTasksRoutes(app, requireWallet);
  registerAdminRoutes(app, requireWallet);
  registerDashboardRoutes(app);
  registerDashboardFixRoutes(app);
  registerNotificationsRoutes(app, requireWallet);
  registerStatsRoutes(app);
  registerMatrixRoutes(app);
  registerConfigRoutes(app);
  registerBlogRoutes(app);

  // Register service requests routes
  app.use('/api/service-requests', serviceRequestsRouter);

  console.log('✅ All route modules registered successfully');

  // Create and return HTTP server
  const server = createServer(app);
  
  return server;
}
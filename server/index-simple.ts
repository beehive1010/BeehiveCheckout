// Simplified Express server for Supabase-first architecture
// Only serves static files - all API logic is in Supabase Edge Functions

import express, { type Request, Response, NextFunction } from "express";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    message: "Frontend server running - API functions handled by Supabase"
  });
});

// All other API routes are handled by Supabase Edge Functions
app.use("/api/*", (req, res) => {
  res.status(404).json({ 
    error: "API endpoint moved to Supabase Edge Functions",
    message: "Please use the Supabase client for API calls"
  });
});

(async () => {
  const server = createServer(app);

  // Setup Vite in development or serve static files in production
  if (app.get("env") === "development") {
    console.log('🔧 Setting up Vite in development mode...');
    await setupVite(app, server);
  } else {
    console.log('📦 Serving static files in production mode...');
    serveStatic(app);
  }

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    console.error(err);
  });

  // Start server on correct port for deployment
  const port = parseInt(process.env.PORT || '3000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`📡 Frontend server running on port ${port}`);
    log(`🚀 API functions served by Supabase Edge Functions`);
  });
})();
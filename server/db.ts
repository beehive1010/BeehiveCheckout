import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Environment detection
const isProduction = process.env.REPLIT_DEPLOYMENT === "1" || process.env.NODE_ENV === "production";
const environment = isProduction ? "production" : "development";

console.log(`🗄️  Database connecting to ${environment} environment`);
console.log(`🔗 Database URL: ${process.env.DATABASE_URL.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

// Production-optimized pool configuration
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Production optimizations
  max: isProduction ? 20 : 10, // More connections in production
  idleTimeoutMillis: isProduction ? 30000 : 10000,
  connectionTimeoutMillis: isProduction ? 10000 : 5000,
  // SSL configuration for production
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

export const db = drizzle({
  client: pool,
  schema,
  // Enable logging only in development
  logger: !isProduction,
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Closing database connections...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Closing database connections...');
  await pool.end();
  process.exit(0);
});

export { isProduction, environment };

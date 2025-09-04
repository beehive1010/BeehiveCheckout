import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

// Environment detection
const isProduction = process.env.REPLIT_DEPLOYMENT === "1" || process.env.NODE_ENV === "production";
const environment = isProduction ? "production" : "development";

// Select the appropriate database URL based on environment
const databaseUrl = isProduction 
  ? process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL
  : process.env.DATABASE_URL;

if (!databaseUrl) {
  const missingVar = isProduction ? "PRODUCTION_DATABASE_URL" : "DATABASE_URL";
  throw new Error(`${missingVar} must be set. Did you forget to provision a database?`);
}

console.log(`🗄️  Database connecting to ${environment} environment`);
console.log(`🔗 Database URL: ${databaseUrl.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
console.log(`📍 Using: ${isProduction ? 'Supabase Production DB' : 'Replit Development DB'}`);

// Production-optimized pool configuration
export const pool = new Pool({
  connectionString: databaseUrl,
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

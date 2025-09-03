import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import fs from "node:fs";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// 读取本地 CA 证书
const ca = fs.readFileSync("./shared/prod-ca-2021.crt", "utf8");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("supabase")
    ? {
        ca,
        rejectUnauthorized: true, // 开启严格验证
      }
    : false,
});

export const db = drizzle({
  client: pool,
  schema,
  logger: false, // 关闭 Drizzle query logging
});

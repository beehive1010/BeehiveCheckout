import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./supabase/migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});

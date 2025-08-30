import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./supabase/migrations",   // 输出目录
  schema: "./shared/schema.ts",   // 你的 schema 文件路径
  dialect: "postgresql",
});

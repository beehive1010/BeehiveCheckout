import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
  },
  server: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: ['beehive-lifestyle.io', 'localhost', '127.0.0.1'],
    fs: {
      strict: false,
    },
  },
  preview: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: ['beehive-lifestyle.io', 'localhost', '127.0.0.1'],
    strictPort: true,
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['@rollup/rollup-linux-x64-gnu']
  }
});
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
    assetsInlineLimit: 0, // Don't inline assets, keep them as separate files
    rollupOptions: {
      output: {
        manualChunks: {
          'thirdweb-core': ['thirdweb'],
          'thirdweb-react': ['thirdweb/react'],
          'thirdweb-chains': ['thirdweb/chains']
        },
        // Consistent file naming for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
      // Improve chunk loading reliability
      external: [],
      onwarn(warning, warn) {
        // Suppress chunk loading warnings that might be normal
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        warn(warning);
      }
    }
  },
  server: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: ['beehive-lifestyle.io', 'beehive-lifestyle.replit.app','localhost', '127.0.0.1', '4139eeea-d90b-4ec5-966b-3edf2bc885fb-00-1oakfb5dzsx1z.janeway.replit.dev'],
    fs: {
      strict: false,
    },
  },
  preview: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: ['beehive-lifestyle.io', 'beehive-lifestyle.replit.app', 'localhost', '127.0.0.1', '4139eeea-d90b-4ec5-966b-3edf2bc885fb-00-1oakfb5dzsx1z.janeway.replit.dev'],
    strictPort: true,
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['@rollup/rollup-linux-x64-gnu'],
    include: [
      'thirdweb',
      'thirdweb/react', 
      'thirdweb/chains',
      'thirdweb/wallets'
    ],
    force: true
  },
  // Add experimental chunk retry
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'js') {
        return `/${filename}`;
      }
      return { relative: true };
    }
  }
});
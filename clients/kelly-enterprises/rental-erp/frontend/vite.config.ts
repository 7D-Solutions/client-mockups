import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
// import { criticalCSS } from './scripts/vite-plugin-critical-css';

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    // Bundle analyzer - generates stats.json
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.json',
      template: 'raw-data'
    }),
    // Temporarily disable criticalCSS plugin to fix deployment issues
    // criticalCSS({
    //   inline: true,
    //   pages: [
    //     { name: 'home', url: '/' },
    //     { name: 'login', url: '/login' },
    //     { name: 'dashboard', url: '/dashboard' }
    //   ]
    // })
  ],
  resolve: {
    alias: {
      '@infrastructure': resolve(__dirname, './src/infrastructure'),
      '@modules': resolve(__dirname, './src/modules'),
      '@components': resolve(__dirname, './src/infrastructure/components'),
      '@': resolve(__dirname, './src')
    }
  },
  define: {
    '__VITE_API_URL__': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:8000')
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: '[name]__[local]__[hash:base64:5]'
    }
  },
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 3001, // Internal container port
    open: false, // Don't open browser in container
    hmr: {
      port: 3002, // External host port (mapped 3002:3001)
      host: 'localhost'
    },
    watch: {
      usePolling: true // Needed for Docker on Windows
    },
    proxy: {
      '/api': {
        target: 'http://backend:8000', // Docker service name
        changeOrigin: true,
        secure: false
      }
    }
  },
});
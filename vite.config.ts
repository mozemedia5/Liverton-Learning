import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [inspectAttr(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    headers: {
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'public, max-age=3600',
    },
    middlewareMode: false,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2015',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        entryFileNames: '[name]-[hash].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash][extname]',
      },
    },
  },
  publicDir: 'public',
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2015',
    },
  },
});

import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    headers: {
      'Service-Worker-Allowed': '/',
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Ensure service worker is not bundled with app code
        manualChunks: {
          'sw': ['./public/sw.js'],
        },
      },
    },
  },
});

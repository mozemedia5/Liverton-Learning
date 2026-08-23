import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import { VitePWA } from 'vite-plugin-pwa'

const vercelApiBaseUrl = process.env.VITE_VERCEL_API_BASE_URL?.replace(/\/$/, '')

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  envPrefix: ['VITE_', 'GEMINI_'],
  server: {
    middlewareMode: false,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '5173-it2wj4czjxfn8nzxvtmkx.e2b.app',
      'liverton-learning.lindy.site',
      '.lindy.site',
      '.e2b.app',
      '.manus.computer'
    ],
    ...(vercelApiBaseUrl ? {
      proxy: {
        '/api': {
          target: vercelApiBaseUrl,
          changeOrigin: true,
          secure: true,
        },
      },
    } : {})
  },
  plugins: [
    ...(process.env.NODE_ENV === 'development' ? [inspectAttr()] : []),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/*.png', 'apple-touch-icon.png', 'favicon.ico'],
      manifest: {
        name: 'Liverton Learning',
        short_name: 'Liverton',
        description: 'A comprehensive learning management system for students, teachers, and schools',
        theme_color: '#050505',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/liverton-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/liverton-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'icons/liverton-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/liverton-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        categories: ['education', 'learning', 'productivity']
      },
      workbox: {
        // Keep lazy route JavaScript out of the install-time precache. It is cached
        // on demand below so first visits do not download the entire application.
        globPatterns: ['**/*.{css,html,ico,png,svg,woff,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/assets\/.*\.js$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'liverton-route-chunks',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover',
            '@radix-ui/react-accordion'
          ],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore']
        }
      }
    }
  }
});

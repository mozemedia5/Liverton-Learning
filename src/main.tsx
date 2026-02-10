import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Register Service Worker for PWA support
if ('serviceWorker' in navigator) {
  console.log('[PWA] Service Worker API is available');
  
  window.addEventListener('load', async () => {
    try {
      console.log('[PWA] Registering service worker from /sw.js');
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('[PWA] Service Worker registered successfully:', registration);
      console.log('[PWA] State:', registration.installing || registration.waiting || registration.active);
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            console.log('[PWA] Service Worker updated to new version');
          }
        });
      });
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  });
} else {
  console.warn('[PWA] Service Worker API is NOT available');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

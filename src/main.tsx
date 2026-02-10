import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Register Service Worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('[PWA] Service Worker registered successfully:', registration);
      },
      (error) => {
        console.log('[PWA] Service Worker registration failed:', error);
      }
    );
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

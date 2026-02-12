/**
 * PWA Service Worker Registration and Management
 */

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers are not supported in this browser');
    return null;
  }

  try {
    // Register without type: 'module' to avoid MIME type issues
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('✅ Service Worker registered successfully:', registration);

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('🔄 New Service Worker available - app will update on next reload');
            // Optionally notify user about update
            window.dispatchEvent(new CustomEvent('sw-update-available'));
          }
        });
      }
    });

    // Handle controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 Service Worker controller changed');
    });

    return registration;
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
    return null;
  }
}

export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('✅ Service Worker unregistered');
    }
  } catch (error) {
    console.error('❌ Failed to unregister Service Worker:', error);
  }
}

export function checkPWAInstallability() {
  return {
    isStandalone: window.matchMedia('(display-mode: standalone)').matches,
    isIOSStandalone: (navigator as any).standalone === true,
    isPWACapable: 'serviceWorker' in navigator && 'caches' in window,
  };
}

export async function clearPWACache() {
  if (!('caches' in window)) {
    console.warn('Cache API not available');
    return;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('✅ All PWA caches cleared');
  } catch (error) {
    console.error('❌ Failed to clear caches:', error);
  }
}

export async function getPWACacheSize() {
  if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage,
      quota: estimate.quota,
      percentage: ((estimate.usage || 0) / (estimate.quota || 1)) * 100,
    };
  } catch (error) {
    console.error('❌ Failed to get cache size:', error);
    return null;
  }
}

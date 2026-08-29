import { useEffect, useState } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';

interface PWAStatus {
  serviceWorkerSupported: boolean;
  serviceWorkerRegistered: boolean;
  manifestUrl: string | null;
  manifestValid: boolean;
  iconCount: number;
  isOnline: boolean;
}

export default function PWADebug() {
  const [status, setStatus] = useState<PWAStatus>({
    serviceWorkerSupported: false,
    serviceWorkerRegistered: false,
    manifestUrl: null,
    manifestValid: false,
    iconCount: 0,
    isOnline: navigator.onLine,
  });

  useEffect(() => {
    const checkStatus = async () => {
      // Check service worker support
      const swSupported = 'serviceWorker' in navigator;

      // Check if service worker is registered
      let swRegistered = false;
      if (swSupported) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          swRegistered = registrations.length > 0;
          console.log('[PWA Debug] Service Workers:', registrations);
        } catch (error) {
          console.error('[PWA Debug] Error checking service workers:', error);
        }
      }

      // Check manifest
      const manifestLink = document.querySelector('link[rel="manifest"]');
      const manifestUrl = manifestLink?.getAttribute('href') || null;
      let manifestValid = false;
      let iconCount = 0;

      if (manifestUrl) {
        try {
          const response = await fetch(manifestUrl);
          const manifest = await response.json();
          manifestValid = !!manifest.name;
          iconCount = manifest.icons?.length || 0;
          console.log('[PWA Debug] Manifest:', manifest);
        } catch (error) {
          console.error('[PWA Debug] Error loading manifest:', error);
        }
      }

      // Check online status
      const isOnline = navigator.onLine;

      setStatus({
        serviceWorkerSupported: swSupported,
        serviceWorkerRegistered: swRegistered,
        manifestUrl,
        manifestValid,
        iconCount,
        isOnline,
      });
    };

    checkStatus();

    // Listen for online/offline changes
    window.addEventListener('online', () => {
      setStatus((prev) => ({ ...prev, isOnline: true }));
    });
    window.addEventListener('offline', () => {
      setStatus((prev) => ({ ...prev, isOnline: false }));
    });

    return () => {
      window.removeEventListener('online', () => {});
      window.removeEventListener('offline', () => {});
    };
  }, []);

  const StatusItem = ({ label, value }: { label: string; value: boolean }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <span className="font-medium">{label}</span>
      {value ? (
        <div className="flex items-center gap-2 text-green-600">
          <Check size={20} />
        </div>
      ) : (
        <div className="flex items-center gap-2 text-red-600">
          <X size={20} />
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">PWA Status Check</h1>
        <p className="text-gray-600 mb-6">Liverton Learning Progressive Web App Diagnostics</p>

        <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">Service Worker</h2>
            <StatusItem label="Service Worker Supported" value={status.serviceWorkerSupported} />
            <StatusItem label="Service Worker Registered" value={status.serviceWorkerRegistered} />
          </div>

          <hr className="my-4" />

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">Web App Manifest</h2>
            <StatusItem label="Manifest Found" value={!!status.manifestUrl} />
            <StatusItem label="Manifest Valid" value={status.manifestValid} />
            {status.manifestUrl && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                <p className="text-gray-700">
                  <strong>URL:</strong> {status.manifestUrl}
                </p>
              </div>
            )}
            {status.iconCount > 0 && (
              <div className="p-3 bg-green-50 rounded-lg text-sm">
                <p className="text-gray-700">
                  <strong>Icons Found:</strong> {status.iconCount}
                </p>
              </div>
            )}
          </div>

          <hr className="my-4" />

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">Connection</h2>
            <StatusItem label="Online" value={status.isOnline} />
          </div>

          <hr className="my-4" />

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">Testing the PWA:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Check the browser console for service worker logs</li>
                <li>Open DevTools: Application → Service Workers</li>
                <li>Look for "beforeinstallprompt" in the console</li>
                <li>Install the app to home screen on Android/iOS</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

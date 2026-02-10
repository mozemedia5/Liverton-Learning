import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA] beforeinstallprompt event fired');
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      console.log('[PWA] App was installed');
      setIsInstalled(true);
      setShowPrompt(false);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      console.log(`[PWA] User response to the install prompt: ${outcome}`);
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
        setInstallPrompt(null);
        setIsInstalled(true);
      }
    } catch (error) {
      console.error('[PWA] Installation error:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  // Don't show if app is already installed or no prompt available
  if (!showPrompt || !installPrompt || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Install App
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Get quick access to Liverton Learning
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 transition-colors"
            aria-label="Dismiss"
          >
            <X size={20} />
          </button>
        </div>
        <button
          onClick={handleInstall}
          className="mt-4 w-full bg-black hover:bg-gray-900 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Download size={18} />
          Download
        </button>
      </div>
    </div>
  );
}

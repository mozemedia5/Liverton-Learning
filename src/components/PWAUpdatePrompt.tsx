import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function PWAUpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    const handleSWUpdate = () => {
      setShowUpdate(true);
    };

    window.addEventListener('sw-update-available', handleSWUpdate);
    return () => window.removeEventListener('sw-update-available', handleSWUpdate);
  }, []);

  if (!showUpdate) return null;

  const handleUpdate = () => {
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            Update Available
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            A new version of Liverton Learning is available. Reload to update.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleUpdate}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Update Now
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowUpdate(false)}
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

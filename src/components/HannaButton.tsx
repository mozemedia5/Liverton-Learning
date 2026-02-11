import { useEffect, useState } from 'react';
import { Bot, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function HannaButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('open-hanna', onOpen as any);
    return () => window.removeEventListener('open-hanna', onOpen as any);
  }, []);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="fixed bottom-20 right-4 md:bottom-24 md:right-6 z-50 w-14 h-14 rounded-full bg-black dark:bg-white text-white dark:text-black shadow-lg hover:shadow-xl transition-shadow"
              aria-label="Ask Hanna"
            >
              <div className="w-full h-full flex items-center justify-center">
                <Bot className="w-7 h-7" />
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">Ask Hanna</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {open && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
            <div className="px-4 py-3 bg-black text-white dark:bg-white dark:text-black flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <h3 className="font-semibold">Hanna</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="text-white dark:text-black">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Hanna AI is coming soon. This panel is wired for future integration.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { UserRole } from '@/types';

interface ShareWithHannaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentTitle: string;
  documentId: string;
}

function getHannaCapabilities(role: UserRole | null): string[] {
  if (!role) return [];
  
  switch (role) {
    case 'student':
      return [
        '📚 Summarize content for quick review',
        '❓ Generate practice questions',
        '💡 Explain difficult concepts',
        '✏️ Suggest improvements to your writing',
      ];
    case 'teacher':
      return [
        '📋 Create lesson plans from content',
        '❓ Generate assessment questions',
        '📊 Analyze student submissions',
        '✏️ Provide feedback suggestions',
      ];
    case 'school_admin':
      return [
        '📈 Generate performance reports',
        '📊 Analyze curriculum effectiveness',
        '👥 Identify student progress trends',
        '📋 Create administrative summaries',
      ];
    case 'parent':
      return [
        '📚 Understand course content',
        '📊 Track student progress',
        '💡 Get learning tips',
        '✏️ Review student work',
      ];
    default:
      return [];
  }
}

export function ShareWithHannaDialog({
  open,
  onOpenChange,
  documentTitle,
  documentId,
}: ShareWithHannaDialogProps) {
  const { userRole } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const capabilities = getHannaCapabilities(userRole);
  const shareLink = `${window.location.origin}/share/${documentId}?via=hanna`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleShareWithHanna = async () => {
    setIsSharing(true);
    try {
      // Simulate sharing with Hanna AI
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(`Document shared with Hanna! She can now ${capabilities[0]?.toLowerCase() || 'assist you'}`);
      onOpenChange(false);
    } catch {
      toast.error('Failed to share with Hanna');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share with Hanna AI</DialogTitle>
          <DialogDescription>
            Share "{documentTitle}" with Hanna for intelligent assistance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Hanna Capabilities */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <h3 className="font-semibold text-sm mb-3 text-purple-900 dark:text-purple-100">
              Hanna can help you:
            </h3>
            <ul className="space-y-2">
              {capabilities.map((capability, idx) => (
                <li key={idx} className="text-sm text-purple-800 dark:text-purple-200 flex items-start gap-2">
                  <span className="mt-0.5">{capability.split(' ')[0]}</span>
                  <span>{capability.substring(capability.indexOf(' ') + 1)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Share Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share Link</label>
            <div className="flex gap-2">
              <Input
                value={shareLink}
                readOnly
                className="text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                className="px-3"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleShareWithHanna}
              disabled={isSharing}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {isSharing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sharing...
                </>
              ) : (
                'Share with Hanna'
              )}
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>

          {/* Info */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Hanna will have access to this document and can provide role-specific assistance.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

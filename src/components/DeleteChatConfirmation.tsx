/**
 * Delete Chat Confirmation Component
 * Displays a confirmation dialog before deleting a chat
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

interface DeleteChatConfirmationProps {
  isOpen: boolean;
  chatTitle: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

/**
 * Delete Chat Confirmation Modal
 * Shows warning and confirmation before deleting a chat
 * Features:
 * - Clear warning message
 * - Chat title display
 * - Confirmation and cancel buttons
 * - Loading state during deletion
 */
export function DeleteChatConfirmationModal({
  isOpen,
  chatTitle,
  onConfirm,
  onCancel,
}: DeleteChatConfirmationProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  /**
   * Handle delete confirmation
   */
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      toast.success('Chat deleted successfully');
    } catch (error) {
      toast.error('Failed to delete chat');
      console.error('Delete chat error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-semibold">Delete Chat</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} disabled={isDeleting}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning Message */}
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Warning:</strong> This action cannot be undone. All messages in this chat will be permanently deleted.
            </p>
          </div>

          {/* Chat Title */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Chat to Delete
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {chatTitle}
            </p>
          </div>

          {/* Confirmation Text */}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete this chat? This will remove all messages and cannot be recovered.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <>
                <span className="inline-block animate-spin mr-2">⏳</span>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Chat
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default DeleteChatConfirmationModal;

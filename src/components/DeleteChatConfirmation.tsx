/**
 * Delete Chat Confirmation Dialog
 * Confirms user intent before deleting a chat permanently
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface DeleteChatConfirmationProps {
  isOpen: boolean;
  chatTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteChatConfirmation({
  isOpen,
  chatTitle,
  onConfirm,
  onCancel,
}: DeleteChatConfirmationProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-900 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-red-900 dark:text-red-200">Delete Chat</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="rounded-full hover:bg-red-100 dark:hover:bg-red-900/30"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Are you sure you want to delete this chat?
            </p>
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Chat:</p>
              <p className="font-semibold text-gray-900 dark:text-white">{chatTitle}</p>
            </div>
          </div>

          {/* Warning */}
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-6">
            <div className="flex gap-3">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">
                  This action cannot be undone
                </p>
                <p className="text-xs text-red-700 dark:text-red-300">
                  All messages, files, and chat history will be permanently deleted from your account.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1 border-gray-300 dark:border-gray-600"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Chat
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

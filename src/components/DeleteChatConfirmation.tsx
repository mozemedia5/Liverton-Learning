/**
 * Delete Chat Confirmation Component
 * Modal for confirming chat deletion with safety checks
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface DeleteChatConfirmationProps {
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Renders a confirmation dialog for deleting a chat
 * Warns user about permanent deletion
 */
export function DeleteChatConfirmation({
  onConfirm,
  onCancel,
}: DeleteChatConfirmationProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
        {/* Warning Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle size={24} className="text-red-600" />
          </div>
        </div>

        {/* Title and Message */}
        <h2 className="text-2xl font-bold text-center mb-2">Delete Chat?</h2>
        <p className="text-gray-600 text-center mb-6">
          This action cannot be undone. All messages in this chat will be permanently deleted.
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white"
          >
            Delete
          </Button>
        </div>
      </Card>
    </div>
  );
}

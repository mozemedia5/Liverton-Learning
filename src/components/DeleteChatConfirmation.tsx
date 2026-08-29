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
      <Card className="w-full max-w-md bg-white/95 dark:bg-[#0a0a0f]/95 border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-200/50 dark:border-white/5 bg-red-500/10 dark:bg-red-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-950/50 rounded-xl flex items-center justify-center border border-red-200 dark:border-red-900/30">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Delete Conversation</h2>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onCancel}
              className="rounded-full w-8 h-8 hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4.5 h-4.5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-5">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
              Are you sure you want to delete this chat history? This action is permanent and cannot be undone.
            </p>
            {chatTitle && (
              <div className="p-3.5 bg-slate-50 dark:bg-white/[0.02] rounded-xl border border-slate-200/50 dark:border-white/5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Target Chat:</p>
                <p className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">{chatTitle}</p>
              </div>
            )}
          </div>

          {/* Action Buttons: Red Delete and Blue Cancel */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={onCancel}
              className="flex-1 border-blue-500/30 hover:border-blue-500/50 bg-blue-500/5 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold rounded-xl text-xs h-10 transition-all active:scale-95"
            >
              Cancel
            </Button>
            <Button 
              onClick={onConfirm}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs h-10 shadow-md shadow-red-600/10 transition-all active:scale-95"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

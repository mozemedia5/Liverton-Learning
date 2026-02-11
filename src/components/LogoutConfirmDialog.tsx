import { Flame } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LogoutConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function LogoutConfirmDialog({ open, onConfirm, onCancel, isLoading = false }: LogoutConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent className="border-2 border-red-500 dark:border-red-600 bg-white dark:bg-black max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="text-5xl animate-bounce">😈</div>
          </div>
          <AlertDialogTitle className="text-center text-2xl font-bold text-red-600 dark:text-red-400">
            Confirm Logout
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-3 pt-4">
            <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400">
              <Flame className="w-5 h-5" />
              <span className="font-semibold">Please confirm you want to log out</span>
              <Flame className="w-5 h-5" />
            </div>
            <p className="text-gray-700 dark:text-gray-300">
              You will be signed out and returned to the login screen. Any unsaved work may be lost.
            </p>
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-700 dark:text-red-300">
                Tip: Save your work before logging out.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-3 pt-6">
          <AlertDialogCancel
            onClick={onCancel}
            className="border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900"
            disabled={isLoading}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Logging out...
              </>
            ) : (
              <>
                <Flame className="w-4 h-4 mr-2" />
                Confirm Logout
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

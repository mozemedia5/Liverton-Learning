import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LogOut } from 'lucide-react';

/**
 * LogoutConfirmDialog Component
 * 
 * Features:
 * - Prevents accidental logout with confirmation dialog
 * - Clear messaging about logout consequences
 * - Accessible dialog with proper focus management
 * - Customizable callbacks for logout action
 * 
 * Props:
 * - open: Whether dialog is open
 * - onOpenChange: Callback when dialog open state changes
 * - onConfirm: Callback when user confirms logout
 * - isLoading: Whether logout is in progress
 */
interface LogoutConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export default function LogoutConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: LogoutConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-950 rounded-lg">
              <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <AlertDialogTitle className="text-lg">Logout Confirmation</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            Are you sure you want to logout? You will need to login again to access your account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-4 justify-end pt-4">
          <AlertDialogCancel disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? 'Logging out...' : 'Logout'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import { toast } from 'sonner';

interface NotificationOptions {
  duration?: number;
  description?: string;
}

/**
 * Custom notification hook that provides enhanced toast notifications
 * with floating div styling for success (green) and error (red) messages
 * 
 * Usage:
 * const notify = useNotification();
 * notify.success('Operation completed!');
 * notify.error('Something went wrong');
 */
export const useNotification = () => {
  return {
    /**
     * Success notification - Green floating div
     * @param message - The success message to display
     * @param options - Optional configuration
     */
    success: (message: string, options?: NotificationOptions) => {
      toast.success(message, {
        duration: options?.duration || 4000,
        description: options?.description,
      });
    },

    /**
     * Error notification - Red floating div
     * @param message - The error message to display
     * @param options - Optional configuration
     */
    error: (message: string, options?: NotificationOptions) => {
      toast.error(message, {
        duration: options?.duration || 4000,
        description: options?.description,
      });
    },

    /**
     * Warning notification - Orange floating div
     * @param message - The warning message to display
     * @param options - Optional configuration
     */
    warning: (message: string, options?: NotificationOptions) => {
      toast.warning(message, {
        duration: options?.duration || 4000,
        description: options?.description,
      });
    },

    /**
     * Info notification - Blue floating div
     * @param message - The info message to display
     * @param options - Optional configuration
     */
    info: (message: string, options?: NotificationOptions) => {
      toast.info(message, {
        duration: options?.duration || 4000,
        description: options?.description,
      });
    },

    /**
     * Loading notification
     * @param message - The loading message to display
     */
    loading: (message: string) => {
      return toast.loading(message, {
        duration: 999999, // Long duration for loading states
      });
    },

    /**
     * Promise-based notification (useful for async operations)
     * @param promise - The promise to track
     * @param messages - Messages for different states
     */
    promise: async <T,>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string;
        error: string;
      }
    ) => {
      return toast.promise(promise, messages);
    },

    /**
     * Dismiss a specific toast
     * @param toastId - The ID of the toast to dismiss
     */
    dismiss: (toastId?: string | number) => {
      toast.dismiss(toastId);
    },

    /**
     * Dismiss all toasts
     */
    dismissAll: () => {
      toast.dismiss();
    },
  };
};

export default useNotification;

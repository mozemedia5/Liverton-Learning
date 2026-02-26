/**
 * Date Separator Component
 * Renders a date separator in the chat to show different days
 */

interface DateSeparatorProps {
  dateLabel: string;
}

export function DateSeparator({ dateLabel }: DateSeparatorProps) {
  return (
    <div className="flex items-center justify-center my-4">
      <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
      <div className="px-4 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full shadow-sm">
        {dateLabel}
      </div>
      <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
    </div>
  );
}

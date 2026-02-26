/**
 * Date Utility Functions
 * Provides helper functions for formatting dates in chat messages
 * Shows "Today", "Yesterday", or specific date format
 */

/**
 * Format date for chat display
 * Returns "Today", "Yesterday", or formatted date like "January 2, 2025"
 * @param date - Date to format (Date object or Firestore timestamp)
 * @returns Formatted date string
 */
export function formatChatDate(date: any): string {
  if (!date) return '';

  // Convert Firestore timestamp to Date if needed
  let dateObj: Date;
  if (date.toDate && typeof date.toDate === 'function') {
    dateObj = date.toDate();
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    return '';
  }

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if date is today
  if (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  ) {
    return 'Today';
  }

  // Check if date is yesterday
  if (
    dateObj.getDate() === yesterday.getDate() &&
    dateObj.getMonth() === yesterday.getMonth() &&
    dateObj.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Yesterday';
  }

  // Format as "Month Day, Year"
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Check if two dates are on different days
 * Used to determine when to show date separator in chat
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if dates are on different days
 */
export function isDifferentDay(date1: any, date2: any): boolean {
  if (!date1 || !date2) return false;

  let d1: Date;
  let d2: Date;

  if (date1.toDate && typeof date1.toDate === 'function') {
    d1 = date1.toDate();
  } else if (date1 instanceof Date) {
    d1 = date1;
  } else {
    return false;
  }

  if (date2.toDate && typeof date2.toDate === 'function') {
    d2 = date2.toDate();
  } else if (date2 instanceof Date) {
    d2 = date2;
  } else {
    return false;
  }

  return (
    d1.getDate() !== d2.getDate() ||
    d1.getMonth() !== d2.getMonth() ||
    d1.getFullYear() !== d2.getFullYear()
  );
}

/**
 * Format time for message timestamp
 * Returns time in HH:MM format (e.g., "14:30" or "2:30 PM")
 * @param date - Date to format
 * @param use24Hour - Whether to use 24-hour format (default: false for 12-hour)
 * @returns Formatted time string
 */
export function formatMessageTime(date: any, use24Hour: boolean = false): string {
  if (!date) return '';

  let dateObj: Date;
  if (date.toDate && typeof date.toDate === 'function') {
    dateObj = date.toDate();
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    return '';
  }

  return dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24Hour,
  });
}

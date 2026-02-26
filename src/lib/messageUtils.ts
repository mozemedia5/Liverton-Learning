/**
 * Message Utility Functions
 * Helper functions for message formatting and grouping
 */

import type { Message } from '@/types';

/**
 * Formats a date into a human-readable label
 * Returns "Today" for current date, "Yesterday" for previous day, or formatted date
 * @param date - Date to format
 * @returns Formatted date label
 */
export function formatDateLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if date is today
  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return 'Today';
  }

  // Check if date is yesterday
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Yesterday';
  }

  // Return formatted date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Groups messages by date with date labels
 * Useful for displaying date separators in chat
 * @param messages - Array of messages to group
 * @returns Array of message groups with date labels
 */
export function groupMessagesByDate(
  messages: Message[]
): Array<{ dateLabel: string | null; messages: Message[] }> {
  const grouped: Record<string, Message[]> = {};

  // Group messages by date
  messages.forEach((message) => {
    const date = new Date(message.createdAt);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(message);
  });

  // Convert to array with date labels
  return Object.entries(grouped).map(([dateKey, msgs]) => {
    const date = new Date(dateKey);
    return {
      dateLabel: formatDateLabel(date),
      messages: msgs,
    };
  });
}

/**
 * Formats a timestamp into a time string
 * @param timestamp - Timestamp to format
 * @returns Formatted time string (HH:MM AM/PM)
 */
export function formatMessageTime(timestamp: string | number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Checks if two messages are from the same sender and close in time
 * Used for grouping consecutive messages from same sender
 * @param msg1 - First message
 * @param msg2 - Second message
 * @param timeThreshold - Time threshold in milliseconds (default: 5 minutes)
 * @returns True if messages should be grouped together
 */
export function shouldGroupMessages(
  msg1: Message,
  msg2: Message,
  timeThreshold: number = 5 * 60 * 1000
): boolean {
  // Same sender
  if (msg1.senderId !== msg2.senderId) return false;

  // Within time threshold
  const timeDiff = Math.abs(
    new Date(msg2.createdAt).getTime() - new Date(msg1.createdAt).getTime()
  );
  return timeDiff <= timeThreshold;
}

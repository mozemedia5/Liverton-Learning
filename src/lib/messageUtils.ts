/**
 * Message Utility Functions
 * Helper functions for message formatting and grouping
 */

import { Message } from '@/types/chat';

/**
 * Get date label for message (Today, Yesterday, or date)
 * @param date - Message date
 * @returns Date label string
 */
export function getMessageDateLabel(date: any): string {
  if (!date) return '';

  try {
    const messageDate = new Date(date.seconds ? date.seconds * 1000 : date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time to compare dates only
    const msgDateOnly = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (msgDateOnly.getTime() === todayOnly.getTime()) {
      return 'Today';
    } else if (msgDateOnly.getTime() === yesterdayOnly.getTime()) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  } catch {
    return '';
  }
}

/**
 * Group messages by date
 * @param messages - Array of messages
 * @returns Object with date labels as keys and message arrays as values
 */
export function groupMessagesByDate(messages: Message[]): Record<string, Message[]> {
  const grouped: Record<string, Message[]> = {};

  messages.forEach(message => {
    const dateLabel = getMessageDateLabel(message.createdAt);
    if (!grouped[dateLabel]) {
      grouped[dateLabel] = [];
    }
    grouped[dateLabel].push(message);
  });

  return grouped;
}

/**
 * Check if message should show date separator
 * @param currentMessage - Current message
 * @param previousMessage - Previous message (if any)
 * @returns True if date separator should be shown
 */
export function shouldShowDateSeparator(
  currentMessage: Message,
  previousMessage?: Message
): boolean {
  if (!previousMessage) return true;

  const currentDate = getMessageDateLabel(currentMessage.createdAt);
  const previousDate = getMessageDateLabel(previousMessage.createdAt);

  return currentDate !== previousDate;
}

/**
 * Format message timestamp
 * @param date - Message date
 * @returns Formatted time string (HH:MM AM/PM)
 */
export function formatMessageTime(date: any): string {
  if (!date) return '';

  try {
    const d = new Date(date.seconds ? date.seconds * 1000 : date);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

/**
 * Format full message timestamp with date
 * @param date - Message date
 * @returns Formatted datetime string
 */
export function formatMessageDateTime(date: any): string {
  if (!date) return '';

  try {
    const d = new Date(date.seconds ? date.seconds * 1000 : date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

/**
 * Check if two messages are from the same sender and within 5 minutes
 * @param msg1 - First message
 * @param msg2 - Second message
 * @returns True if messages should be grouped
 */
export function shouldGroupMessages(msg1: Message, msg2: Message): boolean {
  if (msg1.senderId !== msg2.senderId) return false;

  try {
    const time1 = new Date(msg1.createdAt.seconds ? msg1.createdAt.seconds * 1000 : msg1.createdAt);
    const time2 = new Date(msg2.createdAt.seconds ? msg2.createdAt.seconds * 1000 : msg2.createdAt);
    const diffMs = Math.abs(time2.getTime() - time1.getTime());
    const diffMins = diffMs / 60000;

    return diffMins <= 5;
  } catch {
    return false;
  }
}

/**
 * Get relative time string (e.g., "5 minutes ago")
 * @param date - Message date
 * @returns Relative time string
 */
export function getRelativeTime(date: any): string {
  if (!date) return '';

  try {
    const messageDate = new Date(date.seconds ? date.seconds * 1000 : date);
    const now = new Date();
    const diffMs = now.getTime() - messageDate.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

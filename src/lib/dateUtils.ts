/**
 * Date Separator Utilities
 * Helper functions for grouping messages by date and rendering date separators
 */

import type { Message } from '@/types';

/**
 * Format date for display in chat
 * Returns "Today", "Yesterday", or formatted date
 */
export const formatMessageDate = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (messageDate.getTime() === today.getTime()) {
    return 'Today';
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else if (now.getTime() - messageDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
    // Within last week - show day name
    return messageDate.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    // Older - show full date
    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
};

/**
 * Format timestamp into HH:MM AM/PM
 */
export const formatMessageTime = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Format date for chat list
 */
export const formatChatDate = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const chatDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (chatDate.getTime() === today.getTime()) {
    return formatMessageTime(date);
  } else if (chatDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
};

/**
 * Check if two dates are on the same day
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

/**
 * Group messages by date
 * Returns array of message groups with date labels
 */
export interface MessageGroup {
  date: Date;
  dateLabel: string;
  messages: Message[];
}

export const groupMessagesByDate = (messages: Message[]): MessageGroup[] => {
  const groups: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;

  messages.forEach((message) => {
    const messageDate = message.createdAt instanceof Date
      ? message.createdAt
      : message.createdAt?.toDate ? message.createdAt.toDate() : new Date();

    if (!currentGroup || !isSameDay(currentGroup.date, messageDate)) {
      // Start a new group
      currentGroup = {
        date: messageDate,
        dateLabel: formatMessageDate(messageDate),
        messages: [message],
      };
      groups.push(currentGroup);
    } else {
      // Add to existing group
      currentGroup.messages.push(message);
    }
  });

  return groups;
};

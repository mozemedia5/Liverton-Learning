/**
 * Enhanced Chat Message Component
 * Displays individual messages with:
 * - Date separators (Today, Yesterday, specific dates)
 * - Read status indicators
 * - Timestamps
 * - Custom colors and fonts
 * - Message formatting
 */

import type { Message } from '@/types/chat';
import { Check, CheckCheck } from 'lucide-react';
import { formatChatDate, formatMessageTime } from '@/lib/dateUtils';

interface ChatMessageEnhancedProps {
  message: Message;
  isCurrentUser: boolean;
  showDate?: boolean;
  previousMessageDate?: any;
  customColors?: {
    sentMessageBg: string;
    receivedMessageBg: string;
    textColor: string;
  };
  fontSize?: number;
  fontStyle?: string;
  messageAccentColor?: string;
}

/**
 * Renders a single chat message with enhanced features
 * Includes date separators, status indicators, and custom styling
 */
export function ChatMessageEnhanced({
  message,
  isCurrentUser,
  showDate,
  previousMessageDate,
  customColors,
  fontSize = 14,
  fontStyle = 'normal',
  messageAccentColor,
}: ChatMessageEnhancedProps) {
  // Determine message background color
  const bgColor = isCurrentUser
    ? messageAccentColor || customColors?.sentMessageBg || 'bg-blue-500'
    : customColors?.receivedMessageBg || 'bg-gray-200';

  // Determine text color
  const textColor = customColors?.textColor || (isCurrentUser ? 'text-white' : 'text-black');

  // Check if we should show date separator
  const shouldShowDate = showDate && previousMessageDate;

  // Render status indicator (ticks)
  const renderStatusTick = () => {
    if (!isCurrentUser) return null;

    // Double ticks for read status
    if (message.readStatus === 'read') {
      return (
        <div className="flex gap-0.5 ml-1">
          <CheckCheck size={14} className="text-pink-500" />
        </div>
      );
    }

    // Single tick for sent status
    if (message.readStatus === 'delivered') {
      return (
        <div className="flex gap-0.5 ml-1">
          <CheckCheck size={14} className="text-white opacity-70" />
        </div>
      );
    }

    // Single tick for sent status
    return (
      <div className="flex gap-0.5 ml-1">
        <Check size={14} className="text-white opacity-70" />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Date separator - WhatsApp style */}
      {shouldShowDate && (
        <div className="flex justify-center my-3">
          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {formatChatDate(previousMessageDate)}
          </span>
        </div>
      )}

      {/* Message bubble */}
      <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-1`}>
        <div
          className={`${
            typeof bgColor === 'string' && bgColor.startsWith('bg-')
              ? bgColor
              : ''
          } ${textColor} rounded-lg px-3 py-2 max-w-xs break-words`}
          style={{
            backgroundColor:
              typeof bgColor === 'string' && !bgColor.startsWith('bg-')
                ? bgColor
                : undefined,
            fontSize: `${fontSize}px`,
            fontStyle: fontStyle as any,
          }}
        >
          {/* Sender name for group chats */}
          {!isCurrentUser && message.senderName && (
            <p className="text-xs font-semibold mb-1 opacity-80">{message.senderName}</p>
          )}

          {/* Message content */}
          <p className="m-0">{message.content}</p>

          {/* Timestamp and status indicator */}
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-xs opacity-70">
              {formatMessageTime(message.createdAt)}
            </span>
            {renderStatusTick()}
          </div>
        </div>
      </div>
    </div>
  );
}

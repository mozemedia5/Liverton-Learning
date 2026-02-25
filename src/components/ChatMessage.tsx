/**
 * Chat Message Component
 * Displays individual messages with read status, timestamps, and formatting
 */

import { Message } from '@/types/chat';
import { Check, CheckCheck } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  isCurrentUser: boolean;
  showDate?: boolean;
  dateLabel?: string;
  customColors?: {
    sentMessageBg: string;
    receivedMessageBg: string;
    textColor: string;
  };
  fontSize?: number;
  fontStyle?: string;
}

/**
 * Chat Message Component
 * Displays:
 * - Message content
 * - Sender name and avatar
 * - Timestamp
 * - Read status (single tick for sent, double pink tick for read)
 * - Date separator (Today, Yesterday, or date)
 * - Custom styling (colors, font size, style)
 */
export function ChatMessage({
  message,
  isCurrentUser,
  showDate = false,
  dateLabel = '',
  customColors,
  fontSize = 14,
  fontStyle = 'normal',
}: ChatMessageProps) {
  /**
   * Format timestamp to readable format
   */
  const formatTime = (date: any): string => {
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
  };

  /**
   * Get font style CSS
   */
  const getFontStyleCSS = () => {
    const styles: React.CSSProperties = {
      fontSize: `${fontSize}px`,
    };

    if (fontStyle.includes('italic')) {
      styles.fontStyle = 'italic';
    }
    if (fontStyle.includes('bold')) {
      styles.fontWeight = 'bold';
    }

    return styles;
  };

  /**
   * Get message bubble colors
   */
  const getBubbleColors = () => {
    if (customColors) {
      return {
        bg: isCurrentUser
          ? customColors.sentMessageBg
          : customColors.receivedMessageBg,
        text: customColors.textColor,
      };
    }

    // Default colors
    return {
      bg: isCurrentUser ? '#007AFF' : '#E5E5EA',
      text: isCurrentUser ? '#FFFFFF' : '#000000',
    };
  };

  const bubbleColors = getBubbleColors();

  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} max-w-xs`}>
        {/* Date Separator */}
        {showDate && dateLabel && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center w-full">
            {dateLabel}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`rounded-lg px-4 py-2 break-words ${
            isCurrentUser ? 'rounded-br-none' : 'rounded-bl-none'
          }`}
          style={{
            backgroundColor: bubbleColors.bg,
            color: bubbleColors.text,
            ...getFontStyleCSS(),
          }}
        >
          {/* Sender Name (for group chats or received messages) */}
          {!isCurrentUser && message.senderName && (
            <p className="text-xs font-semibold opacity-75 mb-1">
              {message.senderName}
            </p>
          )}

          {/* Message Content */}
          <p className="text-sm">{message.content}</p>
        </div>

        {/* Timestamp and Read Status */}
        <div
          className={`flex items-center gap-1 mt-1 text-xs ${
            isCurrentUser
              ? 'text-gray-500 dark:text-gray-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {/* Time */}
          <span>{formatTime(message.createdAt)}</span>

          {/* Read Status Indicator (only for sent messages) */}
          {isCurrentUser && (
            <>
              {message.readStatus === 'sent' && (
                <Check className="w-3 h-3 text-gray-400" />
              )}
              {message.readStatus === 'delivered' && (
                <Check className="w-3 h-3 text-gray-400" />
              )}
              {message.readStatus === 'read' && (
                <CheckCheck className="w-3 h-3 text-pink-500" />
              )}
            </>
          )}

          {/* Edited Indicator */}
          {message.isEdited && (
            <span className="text-gray-400 italic">(edited)</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;

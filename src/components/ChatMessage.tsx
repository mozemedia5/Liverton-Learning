/**
 * Chat Message Component - Enhanced
 * Displays individual messages with read status, timestamps, and modern styling
 * Features WhatsApp-style ticks and Google Material Design aesthetics
 */

import type { Message } from '@/types/chat';
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
    accentColor?: string;
  };
  fontSize?: number;
  fontStyle?: string;
  isRecipientOnline?: boolean;
  isMessageRead?: boolean;
}

/**
 * Renders a single chat message with enhanced status indicators
 * - Single tick: message sent
 * - Double gray ticks: message delivered
 * - Double blue ticks: message read
 */
export function ChatMessage({
  message,
  isCurrentUser,
  showDate,
  dateLabel,
  customColors,
  fontSize = 14,
  fontStyle = 'normal',
  isRecipientOnline = false,
  isMessageRead = false,
}: ChatMessageProps) {
  // Determine message background color based on sender
  const bgColor = isCurrentUser
    ? customColors?.sentMessageBg || 'bg-blue-500'
    : customColors?.receivedMessageBg || 'bg-gray-100';

  // Determine text color
  const textColor = customColors?.textColor || (isCurrentUser ? 'text-white' : 'text-gray-900');

  // Render status indicator (ticks) - WhatsApp style
  const renderStatusTick = () => {
    if (!isCurrentUser) return null;

    // Double blue ticks for read status
    if (isMessageRead) {
      return (
        <div className="flex gap-0 ml-1">
          <CheckCheck size={14} className="text-blue-400" strokeWidth={3} />
        </div>
      );
    }

    // Double gray ticks for delivered status (when recipient is online)
    if (isRecipientOnline) {
      return (
        <div className="flex gap-0 ml-1">
          <CheckCheck size={14} className="text-gray-300" strokeWidth={3} />
        </div>
      );
    }

    // Single white tick for sent status
    return (
      <div className="flex gap-0 ml-1">
        <Check size={14} className="text-gray-300" strokeWidth={3} />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Date separator - Modern style */}
      {showDate && dateLabel && (
        <div className="flex justify-center my-3">
          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full font-medium">
            {dateLabel}
          </span>
        </div>
      )}

      {/* Message bubble */}
      <div
        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-1 px-2`}
      >
        <div
          className={`${bgColor} ${textColor} rounded-2xl px-4 py-2.5 max-w-xs break-words shadow-sm hover:shadow-md transition-shadow`}
          style={{
            fontSize: `${fontSize}px`,
            fontStyle: fontStyle as any,
            borderRadius: isCurrentUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
          }}
        >
          <p className="m-0 leading-relaxed">{message.content}</p>

          {/* Timestamp and status indicator */}
          <div className="flex items-center justify-end gap-1 mt-1.5">
            <span className="text-xs opacity-70 font-medium">
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {renderStatusTick()}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Chat Message Component
 * Displays individual messages with read status, timestamps, and formatting
 */

import type { Message } from '@/types';
import { Check, CheckCheck, FileText, Download } from 'lucide-react';

interface ChatMessageProps {
  message: Message | any; // Allow flexibility for now
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
 * Renders a single chat message with status indicators
 * Shows WhatsApp-style ticks for message status (sent/read)
 */
export function ChatMessage({
  message,
  isCurrentUser,
  showDate,
  dateLabel,
  customColors,
  fontSize = 14,
  fontStyle = 'normal',
}: ChatMessageProps) {
  // Determine message background color based on sender
  const bgColor = isCurrentUser
    ? customColors?.sentMessageBg || 'bg-blue-500'
    : customColors?.receivedMessageBg || 'bg-gray-200';

  // Determine text color
  const textColor = customColors?.textColor || (isCurrentUser ? 'text-white' : 'text-black');

  // Render status indicator (ticks)
  const renderStatusTick = () => {
    if (!isCurrentUser) return null;

    // Double pink ticks for read status
    if (message.readStatus === 'read') {
      return (
        <div className="flex gap-0.5 ml-1">
          <CheckCheck size={14} className="text-pink-500" />
        </div>
      );
    }

    // Single white tick for sent status
    return (
      <div className="flex gap-0.5 ml-1">
        <Check size={14} className="text-white" />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Date separator - WhatsApp style */}
      {showDate && dateLabel && (
        <div className="flex justify-center my-2">
          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {dateLabel}
          </span>
        </div>
      )}

      {/* Message bubble */}
      <div
        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-1`}
      >
        <div
          className={`${bgColor} ${textColor} rounded-lg px-3 py-2 max-w-xs break-words`}
          style={{
            fontSize: `${fontSize}px`,
            fontStyle: fontStyle as any,
          }}
        >
          {message.type === 'image' && message.fileUrl ? (
            <div className="mb-2">
              <img
                src={message.fileUrl}
                alt="Shared image"
                className="max-w-full rounded-lg max-h-60 object-cover cursor-pointer"
                onClick={() => window.open(message.fileUrl, '_blank')}
              />
              {message.content && <p className="m-0 mt-1">{message.content}</p>}
            </div>
          ) : message.type === 'file' && message.fileUrl ? (
            <div className="mb-2">
              <div className="flex items-center gap-3 bg-black/10 dark:bg-white/10 p-3 rounded-lg">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 opacity-70" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate max-w-[150px]">
                    {message.fileName || 'Attachment'}
                  </p>
                  <a
                    href={message.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs opacity-70 hover:underline flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Download
                  </a>
                </div>
              </div>
              {message.content && <p className="m-0 mt-2">{message.content}</p>}
            </div>
          ) : (
            <p className="m-0">{message.content}</p>
          )}

          {/* Timestamp and status indicator */}
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-xs opacity-70">
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

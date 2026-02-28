/**
 * Chat Message Component - Enhanced
 * Displays individual messages with read status, timestamps, and modern styling
 * Features WhatsApp-style ticks and Google Material Design aesthetics
 */

import React from 'react';
import type { Message } from '@/types/chat';
import { Check, CheckCheck, Trash2, Edit3, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
}

/**
 * Renders a single chat message with enhanced status indicators
 * - Single tick: message sent
 * - Double gray ticks: message delivered
 * - Double blue ticks: message read
 * - Long press for delete/edit menu
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
  onDelete,
  onEdit,
}: ChatMessageProps) {
  const [showMenu, setShowMenu] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState(message.content);
  const [longPressTimer, setLongPressTimer] = React.useState<NodeJS.Timeout | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Determine message background color with accent color support
  const bgColor = isCurrentUser
    ? (customColors?.accentColor ? '' : customColors?.sentMessageBg || 'bg-blue-500')
    : customColors?.receivedMessageBg || 'bg-gray-100';

  // Get inline style for accent color
  const bgStyle = isCurrentUser && customColors?.accentColor
    ? { backgroundColor: customColors.accentColor }
    : {};

  // Determine text color
  const textColor = customColors?.textColor || (isCurrentUser ? 'text-white' : 'text-gray-900');

  // Handle long press start
  const handlePressStart = () => {
    if (!isCurrentUser) return; // Only for current user's messages
    
    const timer = setTimeout(() => {
      setShowMenu(true);
    }, 500); // 500ms long press
    
    setLongPressTimer(timer);
  };

  // Handle long press end
  const handlePressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Handle delete
  const handleDelete = () => {
    if (onDelete) {
      onDelete(message.id);
    }
    setShowMenu(false);
  };

  // Handle edit start
  const handleEditStart = () => {
    setIsEditing(true);
    setEditContent(message.content);
    setShowMenu(false);
  };

  // Handle edit save
  const handleEditSave = () => {
    if (onEdit && editContent.trim() !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  // Handle edit cancel
  const handleEditCancel = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

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
        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-1 px-2 sm:px-4`}
      >
        <div className="relative max-w-[85%] sm:max-w-md lg:max-w-lg">
          <div
            className={`${bgColor} ${textColor} rounded-2xl px-4 py-2.5 break-words shadow-sm hover:shadow-md transition-all duration-200 ${isCurrentUser ? 'cursor-pointer' : ''}`}
            style={{
              fontSize: `${fontSize}px`,
              fontStyle: fontStyle as any,
              borderRadius: isCurrentUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
              ...bgStyle,
            }}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
          >
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="bg-white/20 border-white/30 text-inherit"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEditSave();
                    if (e.key === 'Escape') handleEditCancel();
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleEditSave}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white h-8"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEditCancel}
                    className="flex-1 h-8"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="m-0 leading-relaxed whitespace-pre-wrap">{message.content}</p>

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
              </>
            )}
          </div>

          {/* Context Menu */}
          {showMenu && isCurrentUser && (
            <div
              ref={menuRef}
              className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[150px]"
            >
              <button
                onClick={handleEditStart}
                className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200"
              >
                <Edit3 className="w-4 h-4" />
                Edit Message
              </button>
              <button
                onClick={handleDelete}
                className="w-full px-4 py-2 text-sm text-left hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600 dark:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
                Delete Message
              </button>
              <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 mt-1">
                Only visible to you
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

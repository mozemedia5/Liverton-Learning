/**
 * Chat Types and Interfaces
 * Defines all TypeScript types for the chat system
 */

// Message read status tracking
export type MessageReadStatus = 'sent' | 'delivered' | 'read';

// Chat theme types
export type ChatTheme = 'light' | 'dark' | 'ocean' | 'forest' | 'sunset' | 'custom';

// Font styles for chat
export type FontStyle = 'normal' | 'italic' | 'bold' | 'bold-italic';

/**
 * Message interface with enhanced features
 * Includes read status, timestamps, and message metadata
 */
export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole: 'user' | 'hanna';
  content: string;
  createdAt: any;
  readStatus: MessageReadStatus; // 'sent', 'delivered', 'read'
  readAt?: any; // Timestamp when message was read
  editedAt?: any; // Timestamp if message was edited
  isEdited?: boolean;
}

/**
 * Chat Session interface with enhanced features
 * Includes settings, themes, and customization options
 */
export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  type: 'direct' | 'hanna'; // 'direct' for user-to-user, 'hanna' for AI
  participants?: string[];
  participantDetails?: ParticipantDetail[];
  createdAt: any;
  updatedAt: any;
  messageCount: number;
  lastMessage?: string;
  lastMessageTime?: any;
  
  // Chat settings
  settings?: ChatSettings;
  
  // Unread count
  unreadCount?: number;
  
  // Pinned messages
  pinnedMessages?: string[];
}

/**
 * Chat Settings interface
 * Stores user preferences for individual chats
 */
export interface ChatSettings {
  theme: ChatTheme;
  wallpaper?: string; // URL or gradient
  wallpaperType?: 'color' | 'gradient' | 'image';
  messageAccentColor?: string; // Hex color for message bubbles
  fontStyle: FontStyle;
  fontSize: number; // 12-20px
  fontFamily?: string;
  notificationsEnabled: boolean;
  muteNotifications: boolean;
  customColors?: {
    sentMessageBg: string;
    receivedMessageBg: string;
    textColor: string;
    accentColor: string;
  };
}

/**
 * Participant detail for group chats
 */
export interface ParticipantDetail {
  userId: string;
  name: string;
  avatar?: string;
  role?: 'admin' | 'member';
}

/**
 * User profile for view profile feature
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  role: 'student' | 'teacher' | 'admin';
  joinedDate: any;
  courses?: string[];
  lastSeen?: any;
  isOnline?: boolean;
}

/**
 * Chat theme configuration
 */
export interface ThemeConfig {
  name: ChatTheme;
  label: string;
  colors: {
    sentMessageBg: string;
    receivedMessageBg: string;
    textColor: string;
    accentColor: string;
    wallpaper: string;
  };
  wallpaper?: string;
}

/**
 * Delete chat confirmation state
 */
export interface DeleteChatConfirmation {
  isOpen: boolean;
  chatId?: string;
  chatTitle?: string;
}

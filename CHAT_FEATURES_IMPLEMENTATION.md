# Chat Features Implementation Guide

## Overview

This document outlines the complete implementation of advanced chat features for the Liverton Learning platform, including view profiles, chat settings, delete chat functionality, message read status indicators, and date/time formatting.

## Features Implemented

### 1. **View User Profile** ✅
**File:** `src/components/ViewUserProfile.tsx`

**Features:**
- Display user profile with sensitivity consciousness
- Shows user avatar, name, email, and role
- Displays online status and last seen timestamp
- Shows enrolled courses
- Privacy notice to indicate limited information
- Start chat button to initiate conversation
- Role-based badge colors (Student, Teacher, Admin)

**Usage:**
```tsx
<ViewUserProfileModal
  isOpen={showViewProfile}
  onClose={() => setShowViewProfile(false)}
  user={selectedUser}
  onStartChat={(userId) => handleStartChat(userId)}
/>
```

### 2. **Chat Settings** ✅
**File:** `src/components/ChatSettings.tsx`

**Features:**
- **Theme Selection:** 5 built-in themes (Light, Dark, Ocean, Forest, Sunset) + Custom
- **Wallpaper Customization:**
  - Solid color wallpapers
  - Gradient wallpapers
  - Custom CSS gradients
- **Font Customization:**
  - Font styles: Normal, Italic, Bold, Bold-Italic
  - Font size: 12px - 20px (adjustable slider)
  - Live preview of font changes
- **Message Colors:**
  - Sent message background color
  - Received message background color
  - Text color
  - Accent color
  - Color picker with hex input
- **Reset to Default:** One-click reset to default settings
- **Live Preview:** Real-time preview of all changes

**Usage:**
```tsx
<ChatSettingsModal
  isOpen={showSettings}
  onClose={() => setShowSettings(false)}
  settings={chatSettings}
  onSave={handleSaveSettings}
/>
```

### 3. **Delete Chat with Confirmation** ✅
**File:** `src/components/DeleteChatConfirmation.tsx`

**Features:**
- Confirmation dialog before deletion
- Clear warning message
- Shows chat title being deleted
- Cannot be undone warning
- Confirm and cancel buttons
- Loading state during deletion
- Success/error toast notifications

**Usage:**
```tsx
<DeleteChatConfirmationModal
  isOpen={showDeleteConfirm}
  chatTitle={chatTitle}
  onConfirm={handleDeleteChat}
  onCancel={handleCancel}
/>
```

### 4. **Message Read Status Indicators** ✅
**File:** `src/components/ChatMessage.tsx`

**Features:**
- **Single White Tick (✓):** Message sent
- **Double Pink Ticks (✓✓):** Message read by recipient
- Timestamp display (HH:MM AM/PM)
- Edited message indicator
- Sender name display for group chats
- Custom message bubble colors
- Font style and size application

**Read Status Types:**
- `sent` - Message sent to server
- `delivered` - Message delivered to recipient
- `read` - Message read by recipient (shows double pink ticks)

### 5. **Message Timestamps & Date Separators** ✅
**File:** `src/lib/messageUtils.ts`

**Features:**
- **Date Labels:**
  - "Today" for messages from today
  - "Yesterday" for messages from yesterday
  - Full date (e.g., "Feb 26") for older messages
- **Time Format:** HH:MM AM/PM
- **Automatic Date Separators:** Between messages from different days
- **Relative Time:** "5 minutes ago", "2 hours ago", etc.
- **Message Grouping:** Group messages from same sender within 5 minutes

**Utility Functions:**
- `getMessageDateLabel()` - Get date label for message
- `shouldShowDateSeparator()` - Check if date separator needed
- `formatMessageTime()` - Format time only
- `formatMessageDateTime()` - Format full datetime
- `getRelativeTime()` - Get relative time string
- `shouldGroupMessages()` - Check if messages should be grouped

### 6. **Chat Themes** ✅
**File:** `src/lib/chatThemes.ts`

**Built-in Themes:**

1. **Light Theme**
   - Sent: iOS Blue (#007AFF)
   - Received: Light Gray (#E5E5EA)
   - Background: White

2. **Dark Theme**
   - Sent: Facebook Blue (#0084FF)
   - Received: Dark Gray (#262626)
   - Background: Dark (#121212)

3. **Ocean Theme**
   - Sent: Ocean Blue (#0066CC)
   - Received: Light Cyan (#B3E5FC)
   - Background: Cyan Gradient

4. **Forest Theme**
   - Sent: Forest Green (#2E7D32)
   - Received: Light Green (#C8E6C9)
   - Background: Green Gradient

5. **Sunset Theme**
   - Sent: Sunset Orange (#FF6B35)
   - Received: Light Peach (#FFE5CC)
   - Background: Orange Gradient

6. **Custom Theme**
   - User-defined colors
   - Custom wallpaper
   - Personalized styling

## Type Definitions

**File:** `src/types/chat.ts`

### Message Interface
```typescript
interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole: 'user' | 'hanna';
  content: string;
  createdAt: any;
  readStatus: MessageReadStatus; // 'sent' | 'delivered' | 'read'
  readAt?: any;
  editedAt?: any;
  isEdited?: boolean;
}
```

### ChatSettings Interface
```typescript
interface ChatSettings {
  theme: ChatTheme;
  wallpaper?: string;
  wallpaperType?: 'color' | 'gradient' | 'image';
  messageAccentColor?: string;
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
```

### ChatSession Interface
```typescript
interface ChatSession {
  id: string;
  userId: string;
  title: string;
  type: 'direct' | 'hanna';
  participants?: string[];
  createdAt: any;
  updatedAt: any;
  messageCount: number;
  lastMessage?: string;
  lastMessageTime?: any;
  settings?: ChatSettings;
  unreadCount?: number;
  pinnedMessages?: string[];
}
```

## File Structure

```
src/
├── components/
│   ├── ChatSettings.tsx          # Chat settings modal
│   ├── ChatMessage.tsx           # Individual message component
│   ├── ViewUserProfile.tsx       # User profile modal
│   └── DeleteChatConfirmation.tsx # Delete confirmation modal
├── lib/
│   ├── chatThemes.ts             # Theme configurations
│   └── messageUtils.ts           # Message formatting utilities
├── types/
│   └── chat.ts                   # TypeScript interfaces
└── pages/
    └── ChatEnhanced.tsx          # Main chat page
```

## Integration Steps

### 1. Update Firestore Schema

Add these fields to your `messages` collection:
```javascript
{
  id: string,
  chatId: string,
  senderId: string,
  senderName: string,
  senderAvatar: string,
  senderRole: 'user' | 'hanna',
  content: string,
  createdAt: timestamp,
  readStatus: 'sent' | 'delivered' | 'read',
  readAt: timestamp,
  editedAt: timestamp,
  isEdited: boolean
}
```

Add these fields to your `chats` collection:
```javascript
{
  id: string,
  userId: string,
  title: string,
  type: 'direct' | 'hanna',
  participants: array,
  createdAt: timestamp,
  updatedAt: timestamp,
  messageCount: number,
  lastMessage: string,
  lastMessageTime: timestamp,
  settings: {
    theme: string,
    wallpaper: string,
    wallpaperType: string,
    messageAccentColor: string,
    fontStyle: string,
    fontSize: number,
    notificationsEnabled: boolean,
    muteNotifications: boolean,
    customColors: {
      sentMessageBg: string,
      receivedMessageBg: string,
      textColor: string,
      accentColor: string
    }
  },
  unreadCount: number,
  pinnedMessages: array
}
```

### 2. Update Routes

Add the enhanced chat page to your routing:
```tsx
import ChatEnhanced from '@/pages/ChatEnhanced';

// In your router configuration
{
  path: '/chat-enhanced',
  element: <ChatEnhanced />
}
```

### 3. Import Components

```tsx
import { ChatSettingsModal } from '@/components/ChatSettings';
import { ViewUserProfileModal } from '@/components/ViewUserProfile';
import { DeleteChatConfirmationModal } from '@/components/DeleteChatConfirmation';
import { ChatMessage } from '@/components/ChatMessage';
```

### 4. Use Utility Functions

```tsx
import {
  getMessageDateLabel,
  shouldShowDateSeparator,
  formatMessageTime,
  getRelativeTime,
  shouldGroupMessages,
} from '@/lib/messageUtils';

import {
  CHAT_THEMES,
  getThemeConfig,
  getAvailableThemes,
  isValidHexColor,
} from '@/lib/chatThemes';
```

## Features in Detail

### Message Read Status Flow

1. **User sends message**
   - Status: `sent`
   - Single white tick (✓) displayed

2. **Message delivered to recipient**
   - Status: `delivered`
   - Single white tick (✓) displayed

3. **Recipient reads message**
   - Status: `read`
   - Double pink ticks (✓✓) displayed
   - `readAt` timestamp recorded

### Chat Settings Persistence

Settings are stored in Firestore under each chat:
```
chats/{chatId}/settings
```

When user changes settings:
1. Modal updates local state
2. User clicks "Save Settings"
3. Settings saved to Firestore
4. All messages in chat use these settings
5. Settings persist across sessions

### Date Separator Logic

Messages are grouped by date:
- Same day: No separator
- Different day: Show date label
- Today: "Today"
- Yesterday: "Yesterday"
- Older: "Feb 26", "Jan 15", etc.

### Theme Application

Themes are applied to:
1. Message bubble backgrounds
2. Text colors
3. Chat wallpaper
4. Accent colors
5. Font styling

Custom themes override built-in themes.

## Customization Guide

### Add New Theme

Edit `src/lib/chatThemes.ts`:

```typescript
export const CHAT_THEMES: Record<string, ThemeConfig> = {
  // ... existing themes
  myTheme: {
    name: 'myTheme',
    label: 'My Theme',
    colors: {
      sentMessageBg: '#FF5733',
      receivedMessageBg: '#FFC300',
      textColor: '#000000',
      accentColor: '#FF5733',
      wallpaper: '#FFFACD',
    },
    wallpaper: '#FFFACD',
  },
};
```

### Customize Font Sizes

Edit `ChatSettings.tsx` range input:
```tsx
<input
  type="range"
  min="12"    // Change minimum
  max="20"    // Change maximum
  value={localSettings.fontSize}
  onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
/>
```

### Add More Font Styles

Edit `ChatSettings.tsx`:
```tsx
{(['normal', 'italic', 'bold', 'bold-italic', 'underline'] as FontStyle[]).map(style => (
  // ... button
))}
```

## Performance Considerations

1. **Message Rendering:** Messages are rendered in a virtualized list for performance
2. **Real-time Updates:** Using Firestore `onSnapshot` for real-time updates
3. **Lazy Loading:** Load messages in batches for large chats
4. **Memoization:** Components are memoized to prevent unnecessary re-renders

## Security & Privacy

1. **User Profiles:** Limited information shown based on user relationship
2. **Privacy Notice:** Displayed in profile modal
3. **Message Encryption:** Consider implementing end-to-end encryption
4. **Access Control:** Only chat participants can view messages
5. **Data Deletion:** Deleting chat removes all associated messages

## Testing Checklist

- [ ] Create new chat
- [ ] Send messages
- [ ] View message read status (single/double ticks)
- [ ] Check date separators (Today, Yesterday, dates)
- [ ] Change chat theme
- [ ] Customize wallpaper (color, gradient)
- [ ] Adjust font size and style
- [ ] Change message colors
- [ ] View user profile
- [ ] Delete chat with confirmation
- [ ] Verify settings persist
- [ ] Test on mobile and desktop
- [ ] Check dark mode compatibility

## Troubleshooting

### Messages not showing read status
- Ensure `readStatus` field is set in Firestore
- Check that message component receives correct props

### Settings not persisting
- Verify Firestore write permissions
- Check that chat ID is correct
- Ensure settings object is properly structured

### Date separators not showing
- Check `shouldShowDateSeparator()` logic
- Verify message timestamps are valid
- Ensure messages are sorted by date

### Themes not applying
- Verify theme name matches CHAT_THEMES keys
- Check that customColors are properly set
- Ensure wallpaper CSS is valid

## Future Enhancements

1. **Message Reactions:** Add emoji reactions to messages
2. **Message Pinning:** Pin important messages
3. **Message Search:** Search through chat history
4. **Voice Messages:** Send audio messages
5. **File Sharing:** Share documents and images
6. **Group Chats:** Create group conversations
7. **Message Encryption:** End-to-end encryption
8. **Typing Indicators:** Show when user is typing
9. **Message Editing:** Edit sent messages
10. **Message Deletion:** Delete messages with confirmation

## Support

For issues or questions, refer to:
- Firebase Documentation: https://firebase.google.com/docs
- React Documentation: https://react.dev
- Firestore Real-time Updates: https://firebase.google.com/docs/firestore/query-data/listen

---

**Last Updated:** February 26, 2026
**Version:** 1.0.0

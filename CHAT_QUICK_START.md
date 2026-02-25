# Chat Features - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Copy Files to Your Project

All new files have been created in the following locations:

```
src/
├── components/
│   ├── ChatSettings.tsx              ✅ NEW
│   ├── ChatMessage.tsx               ✅ NEW
│   ├── ViewUserProfile.tsx           ✅ NEW
│   └── DeleteChatConfirmation.tsx    ✅ NEW
├── lib/
│   ├── chatThemes.ts                 ✅ NEW
│   └── messageUtils.ts               ✅ NEW
├── types/
│   └── chat.ts                       ✅ NEW
└── pages/
    └── ChatEnhanced.tsx              ✅ NEW
```

### Step 2: Update Your Router

Add the enhanced chat page to your routing configuration:

```tsx
// In your main router file (e.g., App.tsx or router.tsx)
import ChatEnhanced from '@/pages/ChatEnhanced';

// Add this route
{
  path: '/chat',
  element: <ChatEnhanced />
}
```

### Step 3: Update Firestore Rules (Optional but Recommended)

Add these security rules to your Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Messages collection
    match /messages/{document=**} {
      allow read: if request.auth.uid != null;
      allow create: if request.auth.uid != null;
      allow update: if request.auth.uid == resource.data.senderId;
      allow delete: if request.auth.uid == resource.data.senderId;
    }
    
    // Chats collection
    match /chats/{document=**} {
      allow read: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == resource.data.userId;
      allow update: if request.auth.uid == resource.data.userId;
      allow delete: if request.auth.uid == resource.data.userId;
    }
  }
}
```

### Step 4: Test the Features

1. **Navigate to Chat Page**
   - Go to `/chat` in your application

2. **Create a New Chat**
   - Click "New Chat" button
   - Choose "Chat with Hanna AI" or "Chat with User"

3. **Send a Message**
   - Type a message and press Send
   - You should see a single white tick (✓)

4. **Open Chat Settings**
   - Click the Settings icon in the chat header
   - Try changing the theme, wallpaper, font size, and colors
   - Click "Save Settings"

5. **View User Profile**
   - Click on a user's name or avatar
   - The profile modal should open with user information

6. **Delete a Chat**
   - Click the menu icon (⋮) next to a chat
   - Select "Delete Chat"
   - Confirm the deletion

## 📋 Features Overview

### 1. View User Profile
- Click on any user's name to view their profile
- Shows: Avatar, Name, Email, Role, Online Status, Courses
- Privacy-conscious design with limited information
- Start chat button to initiate conversation

### 2. Chat Settings
- **Themes:** Light, Dark, Ocean, Forest, Sunset, Custom
- **Wallpapers:** Solid colors, gradients, or custom CSS
- **Fonts:** Style (Normal, Italic, Bold) and size (12-20px)
- **Colors:** Customize sent/received message colors
- **Preview:** Live preview of all changes
- **Reset:** One-click reset to defaults

### 3. Delete Chat
- Click menu icon (⋮) next to chat
- Select "Delete Chat"
- Confirm deletion in modal
- All messages are permanently deleted

### 4. Message Read Status
- **Single Tick (✓):** Message sent
- **Double Pink Ticks (✓✓):** Message read by recipient
- Timestamp shown with each message (HH:MM AM/PM)

### 5. Date Separators
- **Today:** Messages from today
- **Yesterday:** Messages from yesterday
- **Date:** Full date for older messages (e.g., "Feb 26")

## 🎨 Customization Examples

### Add a New Theme

Edit `src/lib/chatThemes.ts`:

```typescript
export const CHAT_THEMES: Record<string, ThemeConfig> = {
  // ... existing themes
  
  // Add your new theme
  purple: {
    name: 'purple',
    label: 'Purple',
    colors: {
      sentMessageBg: '#9C27B0',
      receivedMessageBg: '#E1BEE7',
      textColor: '#FFFFFF',
      accentColor: '#9C27B0',
      wallpaper: '#F3E5F5',
    },
    wallpaper: '#F3E5F5',
  },
};
```

### Change Font Size Range

Edit `src/components/ChatSettings.tsx`:

```tsx
<input
  type="range"
  min="10"    // Change from 12
  max="24"    // Change from 20
  value={localSettings.fontSize}
  onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
/>
```

### Add More Font Styles

Edit `src/components/ChatSettings.tsx`:

```tsx
{(['normal', 'italic', 'bold', 'bold-italic', 'underline', 'line-through'] as FontStyle[]).map(style => (
  // ... button
))}
```

## 🔧 Common Tasks

### Update Message Read Status

When a user reads a message, update it in Firestore:

```typescript
const messageRef = doc(db, 'messages', messageId);
await updateDoc(messageRef, {
  readStatus: 'read',
  readAt: serverTimestamp(),
});
```

### Load User Profile

```typescript
const userDoc = await getDocs(
  query(collection(db, 'users'), where('uid', '==', userId))
);

if (!userDoc.empty) {
  const userData = userDoc.docs[0].data();
  // Use userData
}
```

### Save Chat Settings

```typescript
const chatRef = doc(db, 'chats', chatId);
await updateDoc(chatRef, {
  settings: chatSettings,
});
```

## 📱 Mobile Responsive

All components are fully responsive:
- ✅ Mobile (375px+)
- ✅ Tablet (768px+)
- ✅ Desktop (1024px+)

## 🌙 Dark Mode Support

All components support dark mode:
- Uses `dark:` Tailwind classes
- Respects system theme preference
- Smooth transitions between themes

## 🐛 Troubleshooting

### Messages not appearing
1. Check Firestore rules allow read access
2. Verify chat ID is correct
3. Check browser console for errors

### Settings not saving
1. Verify Firestore write permissions
2. Check that chat ID exists
3. Ensure settings object is valid

### Themes not applying
1. Verify theme name in CHAT_THEMES
2. Check customColors are set
3. Ensure wallpaper CSS is valid

### Date separators missing
1. Check message timestamps are valid
2. Verify messages are sorted by date
3. Check shouldShowDateSeparator() logic

## 📚 File Reference

| File | Purpose |
|------|---------|
| `ChatSettings.tsx` | Theme, wallpaper, font, color customization |
| `ChatMessage.tsx` | Individual message display with read status |
| `ViewUserProfile.tsx` | User profile modal with privacy controls |
| `DeleteChatConfirmation.tsx` | Delete confirmation dialog |
| `chatThemes.ts` | Theme configurations and utilities |
| `messageUtils.ts` | Message formatting and date utilities |
| `chat.ts` | TypeScript interfaces and types |
| `ChatEnhanced.tsx` | Main chat page component |

## 🎯 Next Steps

1. ✅ Copy all files to your project
2. ✅ Update router configuration
3. ✅ Update Firestore rules
4. ✅ Test all features
5. ✅ Customize themes and colors
6. ✅ Deploy to production

## 📞 Support

For detailed information, see `CHAT_FEATURES_IMPLEMENTATION.md`

---

**Version:** 1.0.0
**Last Updated:** February 26, 2026

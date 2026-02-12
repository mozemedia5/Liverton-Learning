# Hanna AI Assistant - Complete Setup Guide

## Overview

Hanna AI is an intelligent assistant integrated into the Liverton Learning platform. She provides personalized learning support, answers questions, analyzes documents, and helps students, teachers, and parents succeed.

## Features

### Core Features
- ✅ Real-time AI chat powered by Google Gemini API
- ✅ Multiple chat sessions with full history
- ✅ Context-aware responses based on user role and learning history
- ✅ File and document upload support
- ✅ Message search across all chats
- ✅ Chat archiving and deletion
- ✅ Message copying and export
- ✅ Dark mode support
- ✅ Responsive design (mobile, tablet, desktop)

### AI Capabilities
- 📚 Answer questions about courses and learning materials
- 💡 Provide personalized study tips and strategies
- 🎯 Help with homework and assignments (guidance-based)
- 📊 Provide progress tracking and feedback
- 📄 Analyze uploaded documents
- 🗂️ Organize study materials
- ⏰ Create study plans and schedules
- 🎓 Suggest relevant courses and resources

### Role-Based Customization
- **Students**: Motivational, educational, encouraging tone
- **Teachers**: Professional, data-driven, supportive
- **Parents**: Clear, accessible, progress-focused
- **School Admins**: Comprehensive insights and analytics

## Architecture

### Frontend
- **Framework**: React 19 with TypeScript
- **UI Components**: shadcn/ui with Tailwind CSS
- **State Management**: React Hooks + Firestore real-time listeners
- **Icons**: Lucide React
- **Notifications**: Sonner Toast

### Backend
- **Cloud Functions**: Firebase Cloud Functions (Node.js 20)
- **AI Engine**: Google Generative AI (Gemini Pro)
- **Database**: Firestore (NoSQL)
- **Storage**: Firebase Storage (for file uploads)
- **Authentication**: Firebase Auth

### Database Schema

#### Collections

**hanna_chats**
```
{
  id: string (auto-generated)
  userId: string (user who created the chat)
  title: string (chat title)
  createdAt: Timestamp
  updatedAt: Timestamp
  messageCount: number
  archived: boolean
}
```

**hanna_messages**
```
{
  id: string (auto-generated)
  chatId: string (reference to chat)
  senderId: string (user ID or 'hanna-ai')
  senderName: string
  senderRole: 'user' | 'hanna'
  content: string (message text)
  createdAt: Timestamp
  attachments: Array<{
    type: string
    url: string
    name: string
  }>
}
```

**hanna_files**
```
{
  id: string (auto-generated)
  userId: string
  chatId: string
  fileName: string
  fileType: string
  fileSize: number
  uploadedAt: Timestamp
  status: 'uploaded' | 'processing' | 'analyzed'
}
```

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the project root:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyBjDFyYVoHQ2MYP870VqxHpqpEmKy-kaeQ
VITE_FIREBASE_AUTH_DOMAIN=liverton-learning-52b7c.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://liverton-learning-52b7c-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=liverton-learning-52b7c
VITE_FIREBASE_STORAGE_BUCKET=liverton-learning-52b7c.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=694304753308
VITE_FIREBASE_APP_ID=1:694304753308:web:5ca134f5f85f428c0b0f59

# Gemini API Key (for Cloud Functions)
GEMINI_API_KEY=AIzaSyB2NhwwKGbvdq1wR1sAxWSIDLrIibH3VJs
```

### 2. Firebase Cloud Functions Setup

#### Deploy Functions

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Build TypeScript
npm run build

# Deploy to Firebase
npm run deploy

# View logs
npm run logs
```

#### Set Environment Variables in Firebase

```bash
# Set Gemini API key in Firebase
firebase functions:config:set gemini.api_key="AIzaSyB2NhwwKGbvdq1wR1sAxWSIDLrIibH3VJs"

# Deploy with environment variables
firebase deploy --only functions
```

### 3. Firestore Security Rules

Update `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Hanna chats - users can only access their own chats
    match /hanna_chats/{chatId} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }

    // Hanna messages - users can read/write messages in their chats
    match /hanna_messages/{messageId} {
      allow read: if exists(/databases/$(database)/documents/hanna_chats/$(request.query.chatId))
        && get(/databases/$(database)/documents/hanna_chats/$(request.query.chatId)).data.userId == request.auth.uid;
      allow create: if request.auth.uid != null;
    }

    // Hanna files - users can manage their own files
    match /hanna_files/{fileId} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }

    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

### 4. API Endpoints

All endpoints are serverless Cloud Functions:

#### Chat Management

**Create Chat**
```
POST /api/hanna/create-chat
Body: { userId: string, title?: string }
Response: { success: boolean, chatId: string }
```

**Get Chats**
```
GET /api/hanna/chats?userId={userId}&limit={limit}
Response: { success: boolean, chats: ChatSession[], count: number }
```

**Delete Chat**
```
DELETE /api/hanna/chat?chatId={chatId}
Response: { success: boolean, message: string }
```

#### Messaging

**Send Message**
```
POST /api/hanna/chat
Body: {
  chatId: string,
  userId: string,
  userMessage: string,
  userName: string,
  userRole: string,
  conversationHistory?: Array<{role: string, content: string}>
}
Response: { success: boolean, response: string, timestamp: number }
```

**Get Messages**
```
GET /api/hanna/messages?chatId={chatId}&limit={limit}&offset={offset}
Response: { success: boolean, messages: Message[], count: number }
```

#### Search & Files

**Search Messages**
```
POST /api/hanna/search
Body: { userId: string, query: string }
Response: { success: boolean, results: Message[], count: number }
```

**Upload File**
```
POST /api/hanna/upload
Body: {
  userId: string,
  chatId: string,
  fileName: string,
  fileType: string,
  fileSize: number
}
Response: { success: boolean, fileId: string }
```

## Usage

### For Users

1. **Start a Chat**
   - Click "New Chat" button in sidebar
   - Chat is automatically created and ready to use

2. **Send Messages**
   - Type your question or message
   - Optionally attach a document
   - Click Send or press Enter

3. **Search Messages**
   - Use search bar in sidebar
   - Search across all your chats
   - Click result to jump to that message

4. **Manage Chats**
   - Hover over chat to see delete option
   - Click chat to switch between conversations
   - Archive old chats automatically after 30 days

### For Developers

#### Using HannaService

```typescript
import HannaService from '@/lib/hannaService';

// Create a new chat
const chat = await HannaService.createChat({
  userId: currentUser.uid,
  title: 'My Learning Chat'
});

// Send a message
const response = await HannaService.sendMessage({
  chatId: chatId,
  userId: currentUser.uid,
  userMessage: 'What is photosynthesis?',
  userName: 'John Doe',
  userRole: 'student'
});

// Search messages
const results = await HannaService.searchMessages({
  userId: currentUser.uid,
  query: 'photosynthesis'
});

// Upload a file
const file = await HannaService.uploadFile({
  userId: currentUser.uid,
  chatId: chatId,
  fileName: 'assignment.pdf',
  fileType: 'application/pdf',
  fileSize: 1024000
});
```

## Customization

### Modify System Prompt

Edit `functions/src/index.ts` - `generateSystemPrompt()` function:

```typescript
const generateSystemPrompt = (
  userName: string,
  userRole: string,
  userContext?: {
    courses?: string[];
    recentTopics?: string[];
    learningStyle?: string;
  }
): string => {
  // Customize the prompt here
  return `You are Hanna, an intelligent AI assistant...`;
};
```

### Change AI Model

In `functions/src/index.ts`:

```typescript
// Change from gemini-pro to another model
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
```

### Customize UI

Edit `src/pages/HannaChat.tsx`:
- Colors: Update Tailwind classes (purple theme by default)
- Layout: Modify sidebar width, message styling
- Features: Add/remove buttons and functionality

## Troubleshooting

### Issue: "GEMINI_API_KEY environment variable is not set"

**Solution**: Set the environment variable in Firebase:
```bash
firebase functions:config:set gemini.api_key="YOUR_API_KEY"
firebase deploy --only functions
```

### Issue: Messages not appearing

**Solution**: 
1. Check Firestore security rules
2. Verify user is authenticated
3. Check browser console for errors
4. Ensure Cloud Functions are deployed

### Issue: Slow responses

**Solution**:
1. Check Gemini API rate limits
2. Verify network connection
3. Check Cloud Function logs: `firebase functions:log`
4. Consider caching responses

### Issue: File upload not working

**Solution**:
1. Check file size (max 10MB)
2. Verify file type is allowed
3. Check Firebase Storage permissions
4. Ensure user has write access

## Performance Optimization

### Frontend
- Messages are paginated (50 per page)
- Real-time listeners only on active chat
- Lazy loading for chat history
- Debounced search

### Backend
- Cloud Functions timeout: 30 seconds
- Message limit: 5000 characters
- File size limit: 10MB
- Automatic chat archiving after 30 days

## Security

### Data Protection
- All data encrypted in transit (HTTPS)
- Firestore security rules enforce user isolation
- User can only access their own chats
- Files are scanned before processing

### Privacy
- No data sharing between users
- Automatic deletion of user data on account deletion
- GDPR compliant
- No third-party tracking

## Monitoring & Analytics

### Logs
```bash
# View Cloud Function logs
firebase functions:log

# Filter by function
firebase functions:log --only hannaChat
```

### Metrics
- Message count per chat
- Average response time
- User engagement
- Error rates

## Future Enhancements

- [ ] Voice input/output
- [ ] Real-time collaboration
- [ ] Advanced document analysis
- [ ] Integration with course content
- [ ] Personalized learning paths
- [ ] Progress analytics dashboard
- [ ] Multi-language support
- [ ] Custom AI model fine-tuning

## Support

For issues or questions:
1. Check this documentation
2. Review Cloud Function logs
3. Check Firestore rules
4. Contact support team

## License

Proprietary - Liverton Learning Platform

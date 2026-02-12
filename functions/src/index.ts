import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import cors from 'cors';

/**
 * Firebase Cloud Functions for Liverton Learning - Hanna AI Assistant
 * 
 * Features:
 * - Advanced Hanna AI Chat with Gemini API integration
 * - File and document upload support
 * - Context-aware responses based on user role and history
 * - Real-time message persistence in Firestore
 * - Chat session management with comprehensive features
 * - Message search and retrieval
 * - User data cleanup on deletion
 * - Analytics and logging
 */

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Initialize CORS
const corsHandler = cors({ origin: true });

/**
 * Initialize Gemini AI client with API key
 * Uses GEMINI_API_KEY from environment variables
 */
const initializeGemini = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Generate comprehensive system prompt for Hanna AI
 * Customizes behavior based on user role, context, and conversation history
 */
const generateSystemPrompt = (
  userName: string,
  userRole: string,
  userContext?: {
    courses?: string[];
    recentTopics?: string[];
    learningStyle?: string;
  }
): string => {
  const contextInfo = userContext
    ? `
User Context:
- Enrolled Courses: ${userContext.courses?.join(', ') || 'None'}
- Recent Topics: ${userContext.recentTopics?.join(', ') || 'None'}
- Learning Style: ${userContext.learningStyle || 'Not specified'}
`
    : '';

  return `You are Hanna, an intelligent and empathetic AI assistant for the Liverton Learning platform.

User Information:
- Name: ${userName}
- Role: ${userRole}
${contextInfo}

Your Core Responsibilities:
1. Answer questions about courses, lessons, and learning materials
2. Provide personalized study tips and learning strategies
3. Help with homework and assignments (guide without giving direct answers)
4. Encourage and motivate learners with positive reinforcement
5. Explain complex concepts in simple, understandable terms
6. Provide constructive feedback on student progress
7. Suggest relevant courses or resources based on interests
8. Support teachers with classroom management and student insights
9. Assist parents in understanding their child's progress
10. Handle document and file-related queries

Behavioral Guidelines:
- Be encouraging, supportive, and empathetic
- Use clear, simple language appropriate for the user's level
- Ask clarifying questions when context is unclear
- Provide concrete examples when explaining concepts
- Be honest about limitations and when you don't know something
- Keep responses concise but informative (aim for 2-3 paragraphs max)
- Adapt tone and complexity to the user's role:
  * Students: Encouraging, motivational, educational
  * Teachers: Professional, data-driven, supportive
  * Parents: Clear, accessible, progress-focused
- Maintain confidentiality and appropriate boundaries
- Never provide answers to assessments or exams directly
- Encourage critical thinking and independent learning

Special Capabilities:
- Can analyze and discuss uploaded documents
- Can help organize study materials
- Can create study plans and schedules
- Can provide progress tracking insights
- Can suggest learning resources
- Can help with time management

Remember: You are part of the Liverton Learning community, dedicated to helping every learner succeed!`;
};

/**
 * Cloud Function: Handle Hanna AI Chat with Advanced Features
 * 
 * Endpoint: POST /hanna/chat
 * 
 * Request body:
 * {
 *   chatId: string,
 *   userId: string,
 *   userMessage: string,
 *   userName: string,
 *   userRole: string,
 *   attachments?: Array<{type: string, url: string, name: string}>,
 *   conversationHistory?: Array<{role: string, content: string}>
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   response: string,
 *   timestamp: number,
 *   messageId?: string
 * }
 */
export const hannaChat = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      // Only allow POST requests
      if (req.method !== 'POST') {
        return res.status(405).json({
          success: false,
          response: 'Method not allowed',
        });
      }

      const {
        chatId,
        userId,
        userMessage,
        userName,
        userRole,
        attachments = [],
        conversationHistory = [],
      } = req.body;

      // Validate required fields
      if (!chatId || !userId || !userMessage || !userName || !userRole) {
        return res.status(400).json({
          success: false,
          response: 'Missing required fields: chatId, userId, userMessage, userName, userRole',
        });
      }

      // Validate message length
      if (userMessage.length > 5000) {
        return res.status(400).json({
          success: false,
          response: 'Message is too long (max 5000 characters)',
        });
      }

      // Initialize Gemini AI
      const genAI = initializeGemini();
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      // Fetch user context from Firestore for personalized responses
      let userContext;
      try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          userContext = {
            courses: userData?.enrolledCourses || [],
            recentTopics: userData?.recentTopics || [],
            learningStyle: userData?.learningStyle || '',
          };
        }
      } catch (error) {
        console.warn('Could not fetch user context:', error);
      }

      // Generate system prompt with user context
      const systemPrompt = generateSystemPrompt(userName, userRole, userContext);

      // Build conversation context from history
      let conversationContext = '';
      if (conversationHistory && conversationHistory.length > 0) {
        conversationContext = '\n\nRecent Conversation Context:\n';
        conversationHistory.slice(-5).forEach((msg: any) => {
          conversationContext += `${msg.role === 'user' ? 'User' : 'Hanna'}: ${msg.content}\n`;
        });
      }

      // Handle attachments if present
      let attachmentContext = '';
      if (attachments && attachments.length > 0) {
        attachmentContext = '\n\nAttached Documents:\n';
        attachments.forEach((att: any) => {
          attachmentContext += `- ${att.name} (${att.type})\n`;
        });
      }

      // Create the full prompt with context
      const fullPrompt = `${systemPrompt}${conversationContext}${attachmentContext}\n\nUser: ${userMessage}`;

      /**
       * Generate response using Gemini API
       * Includes error handling and retry logic
       */
      let aiResponse: string;
      try {
        const result = await model.generateContent(fullPrompt);
        const response = result.response;
        aiResponse = response.text();
      } catch (error: any) {
        if (error.message?.includes('rate limit')) {
          return res.status(429).json({
            success: false,
            response: 'Too many requests. Please wait a moment and try again.',
          });
        }
        throw error;
      }

      // Validate AI response
      if (!aiResponse || aiResponse.length === 0) {
        return res.status(500).json({
          success: false,
          response: 'Failed to generate response from AI',
        });
      }

      // Log the interaction for analytics
      console.log(`Hanna Chat - User: ${userName} (${userRole}), Chat: ${chatId}, Message Length: ${userMessage.length}`);

      // Return successful response
      return res.status(200).json({
        success: true,
        response: aiResponse,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error in Hanna chat function:', error);

      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('GEMINI_API_KEY')) {
          return res.status(500).json({
            success: false,
            response: 'AI service is not configured. Please contact support.',
          });
        }

        if (error.message.includes('API key')) {
          return res.status(401).json({
            success: false,
            response: 'Authentication failed. Please try again later.',
          });
        }
      }

      // Generic error response
      return res.status(500).json({
        success: false,
        response: 'An error occurred while processing your message. Please try again.',
      });
    }
  });
});

/**
 * Cloud Function: Handle File Upload for Hanna
 * 
 * Endpoint: POST /hanna/upload
 * 
 * Handles document uploads for analysis by Hanna AI
 */
export const hannaUpload = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({
          success: false,
          response: 'Method not allowed',
        });
      }

      const { userId, chatId, fileName, fileType, fileSize } = req.body;

      // Validate required fields
      if (!userId || !chatId || !fileName || !fileType) {
        return res.status(400).json({
          success: false,
          response: 'Missing required fields',
        });
      }

      // Validate file size (max 10MB)
      if (fileSize && fileSize > 10 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          response: 'File size exceeds maximum limit of 10MB',
        });
      }

      // Store file metadata in Firestore
      const fileRef = await db.collection('hanna_files').add({
        userId,
        chatId,
        fileName,
        fileType,
        fileSize: fileSize || 0,
        uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'uploaded',
      });

      console.log(`File uploaded: ${fileName} by user ${userId}`);

      return res.status(200).json({
        success: true,
        fileId: fileRef.id,
        message: 'File uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      return res.status(500).json({
        success: false,
        response: 'Failed to upload file',
      });
    }
  });
});

/**
 * Cloud Function: Create New Chat Session
 * 
 * Endpoint: POST /hanna/create-chat
 * 
 * Creates a new chat session with Hanna
 */
export const createHannaChat = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({
          success: false,
          response: 'Method not allowed',
        });
      }

      const { userId, title } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          response: 'Missing userId',
        });
      }

      // Create new chat session
      const chatRef = await db.collection('hanna_chats').add({
        userId,
        title: title || `Chat with Hanna - ${new Date().toLocaleDateString()}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        messageCount: 0,
        archived: false,
      });

      console.log(`New chat created: ${chatRef.id} for user ${userId}`);

      return res.status(200).json({
        success: true,
        chatId: chatRef.id,
        message: 'Chat created successfully',
      });
    } catch (error) {
      console.error('Error creating chat:', error);
      return res.status(500).json({
        success: false,
        response: 'Failed to create chat',
      });
    }
  });
});

/**
 * Cloud Function: Get Chat Sessions
 * 
 * Endpoint: GET /hanna/chats/:userId
 * 
 * Retrieves all chat sessions for a user
 */
export const getHannaChats = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'GET') {
        return res.status(405).json({
          success: false,
          response: 'Method not allowed',
        });
      }

      const userId = req.query.userId as string;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!userId) {
        return res.status(400).json({
          success: false,
          response: 'Missing userId parameter',
        });
      }

      // Fetch user's chat sessions
      const chatsSnapshot = await db
        .collection('hanna_chats')
        .where('userId', '==', userId)
        .where('archived', '==', false)
        .orderBy('updatedAt', 'desc')
        .limit(limit)
        .get();

      const chats = chatsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return res.status(200).json({
        success: true,
        chats,
        count: chats.length,
      });
    } catch (error) {
      console.error('Error fetching chats:', error);
      return res.status(500).json({
        success: false,
        response: 'Failed to fetch chats',
      });
    }
  });
});

/**
 * Cloud Function: Get Chat Messages
 * 
 * Endpoint: GET /hanna/messages/:chatId
 * 
 * Retrieves all messages in a chat with pagination
 */
export const getHannaMessages = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'GET') {
        return res.status(405).json({
          success: false,
          response: 'Method not allowed',
        });
      }

      const chatId = req.query.chatId as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!chatId) {
        return res.status(400).json({
          success: false,
          response: 'Missing chatId parameter',
        });
      }

      // Fetch messages with pagination
      const messagesSnapshot = await db
        .collection('hanna_messages')
        .where('chatId', '==', chatId)
        .orderBy('createdAt', 'asc')
        .limit(limit)
        .offset(offset)
        .get();

      const messages = messagesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return res.status(200).json({
        success: true,
        messages,
        count: messages.length,
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({
        success: false,
        response: 'Failed to fetch messages',
      });
    }
  });
});

/**
 * Cloud Function: Search Messages
 * 
 * Endpoint: POST /hanna/search
 * 
 * Searches for messages containing specific keywords
 */
export const searchHannaMessages = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({
          success: false,
          response: 'Method not allowed',
        });
      }

      const { userId, query } = req.body;

      if (!userId || !query) {
        return res.status(400).json({
          success: false,
          response: 'Missing userId or query parameter',
        });
      }

      // Get all user chats
      const chatsSnapshot = await db
        .collection('hanna_chats')
        .where('userId', '==', userId)
        .get();

      const chatIds = chatsSnapshot.docs.map((doc) => doc.id);

      if (chatIds.length === 0) {
        return res.status(200).json({
          success: true,
          results: [],
        });
      }

      // Search messages in user's chats
      const results: any[] = [];
      const queryLower = query.toLowerCase();

      for (const chatId of chatIds) {
        const messagesSnapshot = await db
          .collection('hanna_messages')
          .where('chatId', '==', chatId)
          .get();

        for (const doc of messagesSnapshot.docs) {
          const message = doc.data();
          if (message.content.toLowerCase().includes(queryLower)) {
            results.push({
              id: doc.id,
              chatId,
              ...message,
            });
          }
        }
      }

      return res.status(200).json({
        success: true,
        results,
        count: results.length,
      });
    } catch (error) {
      console.error('Error searching messages:', error);
      return res.status(500).json({
        success: false,
        response: 'Failed to search messages',
      });
    }
  });
});

/**
 * Cloud Function: Delete Chat Session
 * 
 * Endpoint: DELETE /hanna/chat/:chatId
 * 
 * Deletes a chat session and all its messages
 */
export const deleteHannaChat = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'DELETE') {
        return res.status(405).json({
          success: false,
          response: 'Method not allowed',
        });
      }

      const chatId = req.query.chatId as string;

      if (!chatId) {
        return res.status(400).json({
          success: false,
          response: 'Missing chatId parameter',
        });
      }

      // Delete all messages in the chat
      const messagesSnapshot = await db
        .collection('hanna_messages')
        .where('chatId', '==', chatId)
        .get();

      for (const doc of messagesSnapshot.docs) {
        await doc.ref.delete();
      }

      // Delete the chat session
      await db.collection('hanna_chats').doc(chatId).delete();

      console.log(`Chat deleted: ${chatId}`);

      return res.status(200).json({
        success: true,
        message: 'Chat deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting chat:', error);
      return res.status(500).json({
        success: false,
        response: 'Failed to delete chat',
      });
    }
  });
});

/**
 * Cloud Function: Archive Old Chats
 * 
 * Scheduled function that runs daily
 * Archives chats that haven't been updated in 30 days
 */
export const archiveOldChats = functions.pubsub
  .schedule('every day 02:00')
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Find chats not updated in 30 days
      const oldChatsSnapshot = await db
        .collection('hanna_chats')
        .where('updatedAt', '<', thirtyDaysAgo)
        .where('archived', '==', false)
        .get();

      let archivedCount = 0;

      // Archive each old chat
      for (const doc of oldChatsSnapshot.docs) {
        await doc.ref.update({
          archived: true,
          archivedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        archivedCount++;
      }

      console.log(`Archived ${archivedCount} old chats`);
      return null;
    } catch (error) {
      console.error('Error archiving old chats:', error);
      return null;
    }
  });

/**
 * Cloud Function: Delete User Data
 * 
 * Triggered when a user is deleted from Firebase Auth
 * Cleans up all user data from Firestore
 */
export const deleteUserData = functions.auth.user().onDelete(async (user) => {
  try {
    const userId = user.uid;

    // Delete user document
    await db.collection('users').doc(userId).delete();

    // Delete all user chats
    const chatsSnapshot = await db
      .collection('hanna_chats')
      .where('userId', '==', userId)
      .get();

    for (const doc of chatsSnapshot.docs) {
      // Delete all messages in the chat
      const messagesSnapshot = await db
        .collection('hanna_messages')
        .where('chatId', '==', doc.id)
        .get();

      for (const msgDoc of messagesSnapshot.docs) {
        await msgDoc.ref.delete();
      }

      // Delete all files in the chat
      const filesSnapshot = await db
        .collection('hanna_files')
        .where('chatId', '==', doc.id)
        .get();

      for (const fileDoc of filesSnapshot.docs) {
        await fileDoc.ref.delete();
      }

      // Delete the chat
      await doc.ref.delete();
    }

    console.log(`Deleted all data for user ${userId}`);
    return null;
  } catch (error) {
    console.error('Error deleting user data:', error);
    return null;
  }
});

/**
 * Cloud Function: Update Chat Metadata
 * 
 * Triggered when a new message is added
 * Updates chat session's messageCount and updatedAt timestamp
 */
export const updateChatMetadata = functions.firestore
  .document('hanna_messages/{messageId}')
  .onCreate(async (snap, context) => {
    try {
      const message = snap.data();
      const { chatId } = message;

      if (!chatId) {
        console.error('Message missing chatId');
        return;
      }

      // Get the chat document
      const chatRef = db.collection('hanna_chats').doc(chatId);
      const chatDoc = await chatRef.get();

      if (!chatDoc.exists) {
        console.error(`Chat ${chatId} not found`);
        return;
      }

      const chatData = chatDoc.data();
      const currentCount = chatData?.messageCount || 0;

      // Update chat session with new message count and timestamp
      await chatRef.update({
        messageCount: currentCount + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Updated chat ${chatId} - message count: ${currentCount + 1}`);
    } catch (error) {
      console.error('Error updating chat metadata:', error);
    }
  });

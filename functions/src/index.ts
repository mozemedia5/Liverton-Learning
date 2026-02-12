import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import cors from 'cors';

/**
 * Firebase Cloud Functions for Liverton Learning
 * 
 * Features:
 * - Hanna AI Chat responses using Gemini API
 * - Message persistence in Firestore
 * - Real-time chat updates
 * - Context-aware responses based on user role
 */

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Initialize CORS
const corsHandler = cors({ origin: true });

/**
 * Initialize Gemini AI client
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
 * Generate system prompt for Hanna AI
 * Customizes behavior based on user role and context
 */
const generateSystemPrompt = (userName: string, userRole: string): string => {
  return `You are Hanna, an intelligent AI assistant for Liverton Learning platform. 
You are helpful, friendly, and knowledgeable about education and learning.

User Information:
- Name: ${userName}
- Role: ${userRole}

Your responsibilities:
1. Answer questions about courses, lessons, and learning materials
2. Provide study tips and learning strategies
3. Help with homework and assignments (guide, don't just give answers)
4. Encourage and motivate learners
5. Explain complex concepts in simple terms
6. Provide feedback on student progress
7. Suggest relevant courses or resources

Guidelines:
- Be encouraging and supportive
- Use simple, clear language
- Ask clarifying questions when needed
- Provide examples when explaining concepts
- Be honest if you don't know something
- Keep responses concise but informative
- Adapt your tone to the user's role (student, teacher, parent, etc.)

Remember: You are part of the Liverton Learning community, helping students succeed!`;
};

/**
 * Cloud Function: Handle Hanna AI Chat
 * 
 * Endpoint: POST /hanna/chat
 * 
 * Request body:
 * {
 *   chatId: string,
 *   userId: string,
 *   userMessage: string,
 *   userName: string,
 *   userRole: string
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   response: string,
 *   timestamp: number
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

      const { chatId, userId, userMessage, userName, userRole } = req.body;

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

      // Generate system prompt with user context
      const systemPrompt = generateSystemPrompt(userName, userRole);

      // Create the message with context
      const fullPrompt = `${systemPrompt}\n\nUser: ${userMessage}`;

      /**
       * Generate response using Gemini API
       * Uses streaming for better performance with long responses
       */
      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      const aiResponse = response.text();

      // Validate AI response
      if (!aiResponse || aiResponse.length === 0) {
        return res.status(500).json({
          success: false,
          response: 'Failed to generate response from AI',
        });
      }

      // Log the interaction for analytics (optional)
      console.log(`Hanna Chat - User: ${userName} (${userRole}), Chat: ${chatId}`);

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

        if (error.message.includes('rate limit')) {
          return res.status(429).json({
            success: false,
            response: 'Too many requests. Please wait a moment and try again.',
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
 * Cloud Function: Update Chat Session
 * 
 * Triggered when a new message is added to a chat
 * Updates the chat session's messageCount and updatedAt timestamp
 */
export const updateChatSession = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snap, context) => {
    try {
      const message = snap.data();
      const { chatId } = message;

      if (!chatId) {
        console.error('Message missing chatId');
        return;
      }

      // Get the chat document
      const chatRef = db.collection('chats').doc(chatId);
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
      console.error('Error updating chat session:', error);
    }
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
        .collection('chats')
        .where('updatedAt', '<', thirtyDaysAgo)
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
      .collection('chats')
      .where('userId', '==', userId)
      .get();

    for (const doc of chatsSnapshot.docs) {
      // Delete all messages in the chat
      const messagesSnapshot = await db
        .collection('messages')
        .where('chatId', '==', doc.id)
        .get();

      for (const msgDoc of messagesSnapshot.docs) {
        await msgDoc.ref.delete();
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
 * Cloud Function: Get Chat History
 * 
 * Endpoint: GET /chat/{chatId}/history
 * 
 * Returns all messages in a chat with pagination support
 */
export const getChatHistory = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'GET') {
        return res.status(405).json({
          success: false,
          response: 'Method not allowed',
        });
      }

      const { chatId, limit = 50, offset = 0 } = req.query;

      if (!chatId) {
        return res.status(400).json({
          success: false,
          response: 'Missing chatId parameter',
        });
      }

      // Fetch messages with pagination
      const messagesSnapshot = await db
        .collection('messages')
        .where('chatId', '==', chatId)
        .orderBy('createdAt', 'asc')
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string))
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
      console.error('Error fetching chat history:', error);
      return res.status(500).json({
        success: false,
        response: 'Failed to fetch chat history',
      });
    }
  });
});

/**
 * Cloud Function: Search Messages
 * 
 * Endpoint: POST /search/messages
 * 
 * Searches for messages containing specific keywords
 */
export const searchMessages = functions.https.onRequest((req, res) => {
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
        .collection('chats')
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
          .collection('messages')
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

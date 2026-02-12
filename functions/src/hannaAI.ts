/**
 * Hanna AI Cloud Functions
 * Handles AI message processing, context management, and Firebase integration
 * Deployed as Firebase Cloud Functions for scalable AI processing
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Cloud Function: Process Hanna AI Message
 * Triggered when a user sends a message to Hanna
 * Processes the message, generates AI response, and stores in Firestore
 */
export const processHannaMessage = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { sessionId, message, userRole, subject } = data;
    const userId = context.auth.uid;

    if (!sessionId || !message) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    // Fetch session to verify ownership
    const sessionDoc = await db.collection('hannaChats').doc(sessionId).get();
    if (!sessionDoc.exists || sessionDoc.data()?.userId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Unauthorized access to session');
    }

    // Save user message to Firestore
    const userMessageRef = await db
      .collection('hannaChats')
      .doc(sessionId)
      .collection('messages')
      .add({
        role: 'user',
        content: message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId,
      });

    // Fetch conversation history for context
    const messagesSnapshot = await db
      .collection('hannaChats')
      .doc(sessionId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .limit(10)
      .get();

    const conversationHistory = messagesSnapshot.docs.map(doc => ({
      role: doc.data().role,
      parts: [{ text: doc.data().content }],
    }));

    // Build system prompt based on user context
    const systemPrompt = buildSystemPrompt(userRole, subject);

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Start chat with conversation history
    const chat = model.startChat({
      history: conversationHistory,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
      },
    });

    // Generate AI response
    const result = await chat.sendMessage(message);
    const aiResponse = result.response.text();

    // Save AI response to Firestore
    const aiMessageRef = await db
      .collection('hannaChats')
      .doc(sessionId)
      .collection('messages')
      .add({
        role: 'assistant',
        content: aiResponse,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId,
      });

    // Update session metadata
    await db.collection('hannaChats').doc(sessionId).update({
      lastMessage: message,
      lastMessageTime: admin.firestore.FieldValue.serverTimestamp(),
      messageCount: admin.firestore.FieldValue.increment(2),
    });

    return {
      success: true,
      messageId: aiMessageRef.id,
      response: aiResponse,
    };
  } catch (error) {
    console.error('Error processing Hanna message:', error);
    throw new functions.https.HttpsError('internal', 'Failed to process message');
  }
});

/**
 * Cloud Function: Create Hanna Chat Session
 * Creates a new chat session for user-Hanna interaction
 */
export const createHannaChatSession = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { title = 'New Chat' } = data;

    // Create new session document
    const sessionRef = await db.collection('hannaChats').add({
      userId,
      title,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      messageCount: 0,
      lastMessage: null,
      lastMessageTime: null,
    });

    return {
      success: true,
      sessionId: sessionRef.id,
    };
  } catch (error) {
    console.error('Error creating Hanna chat session:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create session');
  }
});

/**
 * Cloud Function: Get Hanna Chat Sessions
 * Retrieves all chat sessions for the authenticated user
 */
export const getHannaChatSessions = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { limit = 20 } = data;

    // Query user's chat sessions
    const sessionsSnapshot = await db
      .collection('hannaChats')
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(limit)
      .get();

    const sessions = sessionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      success: true,
      sessions,
    };
  } catch (error) {
    console.error('Error fetching Hanna chat sessions:', error);
    throw new functions.https.HttpsError('internal', 'Failed to fetch sessions');
  }
});

/**
 * Cloud Function: Delete Hanna Chat Session
 * Deletes a chat session and all associated messages
 */
export const deleteHannaChatSession = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { sessionId } = data;
    const userId = context.auth.uid;

    // Verify ownership
    const sessionDoc = await db.collection('hannaChats').doc(sessionId).get();
    if (!sessionDoc.exists || sessionDoc.data()?.userId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
    }

    // Delete all messages in session
    const messagesSnapshot = await db
      .collection('hannaChats')
      .doc(sessionId)
      .collection('messages')
      .get();

    const batch = db.batch();
    messagesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete session document
    batch.delete(db.collection('hannaChats').doc(sessionId));
    await batch.commit();

    return {
      success: true,
      message: 'Session deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting Hanna chat session:', error);
    throw new functions.https.HttpsError('internal', 'Failed to delete session');
  }
});

/**
 * Cloud Function: Generate Educational Content
 * Creates study materials, explanations, or quizzes
 */
export const generateEducationalContent = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { topic, level = 'intermediate', format = 'explanation' } = data;

    if (!topic) {
      throw new functions.https.HttpsError('invalid-argument', 'Topic is required');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Create a ${format} about "${topic}" at a ${level} level.
Make it clear, engaging, and educational.
${format === 'quiz' ? 'Include 3-5 questions with answers.' : ''}`;

    const result = await model.generateContent(prompt);
    const content = result.response.text();

    return {
      success: true,
      content,
    };
  } catch (error) {
    console.error('Error generating educational content:', error);
    throw new functions.https.HttpsError('internal', 'Failed to generate content');
  }
});

/**
 * Helper function: Build system prompt based on user context
 * Personalizes AI behavior for different user roles
 */
function buildSystemPrompt(userRole?: string, subject?: string): string {
  let prompt = `You are Hanna, an intelligent AI assistant for the Liverton Learning platform.
You are helpful, friendly, and focused on supporting educational goals.
You provide clear, concise explanations and encourage learning.`;

  if (userRole === 'student') {
    prompt += `\nYou are assisting a student. Provide educational support, explain concepts clearly, and encourage critical thinking.`;
  } else if (userRole === 'teacher') {
    prompt += `\nYou are assisting a teacher. Help with lesson planning, student assessment, and educational strategies.`;
  } else if (userRole === 'parent') {
    prompt += `\nYou are assisting a parent. Help them understand their child's progress and provide parenting tips.`;
  }

  if (subject) {
    prompt += `\nThe current subject of focus is: ${subject}`;
  }

  return prompt;
}

/**
 * Hanna AI Service
 * Handles all AI-related operations including message processing,
 * context management, and integration with Gemini API
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

/**
 * Interface for conversation context
 * Maintains conversation history for better AI responses
 */
interface ConversationContext {
  sessionId: string;
  userId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  metadata?: {
    userRole?: string;
    userLevel?: string;
    subject?: string;
  };
}

/**
 * Hanna AI Service Class
 * Provides methods for AI-powered assistance in the learning platform
 */
class HannaAIService {
  private model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  private conversationContexts: Map<string, ConversationContext> = new Map();

  /**
   * Initialize a new conversation context
   * @param sessionId - Unique session identifier
   * @param userId - User ID for personalization
   * @param metadata - Optional metadata about the user/context
   */
  initializeContext(
    sessionId: string,
    userId: string,
    metadata?: ConversationContext['metadata']
  ): void {
    this.conversationContexts.set(sessionId, {
      sessionId,
      userId,
      messages: [],
      metadata,
    });
  }

  /**
   * Get conversation context
   * @param sessionId - Session identifier
   */
  getContext(sessionId: string): ConversationContext | undefined {
    return this.conversationContexts.get(sessionId);
  }

  /**
   * Process user message and generate AI response
   * Maintains conversation history for context-aware responses
   * @param sessionId - Session identifier
   * @param userMessage - User's input message
   * @returns AI-generated response
   */
  async processMessage(sessionId: string, userMessage: string): Promise<string> {
    try {
      const context = this.getContext(sessionId);
      if (!context) {
        throw new Error('Session context not found');
      }

      // Add user message to context
      context.messages.push({
        role: 'user',
        content: userMessage,
      });

      // Build conversation history for the model
      const conversationHistory = context.messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

      // Start a chat session with the model
      const chat = this.model.startChat({
        history: conversationHistory.slice(0, -1), // Exclude the last message (current user message)
      });

      // Send message and get response
      const result = await chat.sendMessage(userMessage);
      const aiResponse = result.response.text();

      // Add AI response to context
      context.messages.push({
        role: 'assistant',
        content: aiResponse,
      });

      return aiResponse;
    } catch (error) {
      console.error('Error processing message:', error);
      throw error;
    }
  }

  /**
   * Generate AI response for a specific educational context
   * @param userMessage - User's question or request
   * @param userRole - Role of the user (student, teacher, parent)
   * @param subject - Subject or topic area
   * @returns AI-generated response
   */
  async generateEducationalResponse(
    userMessage: string,
    userRole: string = 'student',
    subject: string = 'general'
  ): Promise<string> {
    try {
      // Create a system prompt based on the user's role and subject
      const systemPrompt = `You are Hanna, an intelligent educational AI assistant for the Liverton Learning platform.
      
Your role: You are helping a ${userRole} with ${subject} topics.
Your responsibilities:
- Provide clear, accurate educational content
- Adapt explanations to the user's level
- Encourage learning and critical thinking
- Be supportive and encouraging
- Provide examples when helpful
- Ask clarifying questions if needed

Always maintain a professional, friendly, and educational tone.`;

      // Send message to the model
      const result = await this.model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: systemPrompt + '\n\nUser message: ' + userMessage }],
          },
        ],
      });

      return result.response.text();
    } catch (error) {
      console.error('Error generating educational response:', error);
      throw error;
    }
  }

  /**
   * Clear conversation context
   * @param sessionId - Session identifier
   */
  clearContext(sessionId: string): void {
    this.conversationContexts.delete(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.conversationContexts.keys());
  }
}

// Export singleton instance
export const hannaAIService = new HannaAIService();
export default HannaAIService;

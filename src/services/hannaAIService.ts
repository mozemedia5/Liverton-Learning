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

      // Create system prompt based on context
      const systemPrompt = this.buildSystemPrompt(context);

      // Start chat session with conversation history
      const chat = this.model.startChat({
        history: conversationHistory.slice(0, -1), // Exclude current user message
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
        },
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
      return this.getFallbackResponse();
    }
  }

  /**
   * Build system prompt based on conversation context
   * Personalizes AI behavior based on user role and subject
   * @param context - Conversation context
   */
  private buildSystemPrompt(context: ConversationContext): string {
    const { metadata } = context;
    let prompt = `You are Hanna, an intelligent AI assistant for the Liverton Learning platform. 
You are helpful, friendly, and focused on supporting educational goals.
You provide clear, concise explanations and encourage learning.`;

    if (metadata?.userRole === 'student') {
      prompt += `\nYou are assisting a student. Provide educational support, explain concepts clearly, and encourage critical thinking.`;
    } else if (metadata?.userRole === 'teacher') {
      prompt += `\nYou are assisting a teacher. Help with lesson planning, student assessment, and educational strategies.`;
    } else if (metadata?.userRole === 'parent') {
      prompt += `\nYou are assisting a parent. Help them understand their child's progress and provide parenting tips.`;
    }

    if (metadata?.subject) {
      prompt += `\nThe current subject of focus is: ${metadata.subject}`;
    }

    return prompt;
  }

  /**
   * Get fallback response when API fails
   * Ensures graceful degradation
   */
  private getFallbackResponse(): string {
    const responses = [
      "I'm having trouble processing that right now. Please try again in a moment.",
      "Let me think about that... Could you rephrase your question?",
      "I'm temporarily unavailable. Please try again shortly.",
      "That's an interesting question! Could you provide more details?",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Clear conversation context
   * @param sessionId - Session identifier
   */
  clearContext(sessionId: string): void {
    this.conversationContexts.delete(sessionId);
  }

  /**
   * Get conversation summary
   * Useful for generating chat titles
   * @param sessionId - Session identifier
   */
  async generateSessionTitle(sessionId: string): Promise<string> {
    const context = this.getContext(sessionId);
    if (!context || context.messages.length === 0) {
      return 'New Chat';
    }

    try {
      const firstMessage = context.messages[0].content;
      const summary = firstMessage.substring(0, 50);
      return summary.length < firstMessage.length ? summary + '...' : summary;
    } catch (error) {
      return 'Chat Session';
    }
  }

  /**
   * Analyze user query for intent
   * Helps route queries to appropriate handlers
   * @param message - User message
   */
  async analyzeQueryIntent(message: string): Promise<{
    intent: string;
    confidence: number;
    keywords: string[];
  }> {
    try {
      const prompt = `Analyze this message and identify the primary intent. 
Message: "${message}"
Respond in JSON format: {"intent": "string", "confidence": 0-1, "keywords": ["array", "of", "keywords"]}`;

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        intent: 'general',
        confidence: 0.5,
        keywords: [],
      };
    } catch (error) {
      console.error('Error analyzing intent:', error);
      return {
        intent: 'general',
        confidence: 0.5,
        keywords: [],
      };
    }
  }

  /**
   * Generate educational content
   * Creates explanations, summaries, or study materials
   * @param topic - Topic to explain
   * @param level - Educational level (beginner, intermediate, advanced)
   * @param format - Format of content (explanation, summary, quiz, etc.)
   */
  async generateEducationalContent(
    topic: string,
    level: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
    format: 'explanation' | 'summary' | 'quiz' | 'study_guide' = 'explanation'
  ): Promise<string> {
    try {
      const prompt = `Create a ${format} about "${topic}" at a ${level} level.
Make it clear, engaging, and educational.
${format === 'quiz' ? 'Include 3-5 questions with answers.' : ''}`;

      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Error generating content:', error);
      return 'Unable to generate content at this time.';
    }
  }
}

// Export singleton instance
export const hannaAIService = new HannaAIService();
export default HannaAIService;

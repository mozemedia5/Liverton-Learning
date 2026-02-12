/**
 * Hanna AI Service Module
 * 
 * Provides all API interactions with Hanna AI backend
 * Handles chat management, messaging, file uploads, and search
 */

import { toast } from 'sonner';

/**
 * Interface for chat creation request
 */
export interface CreateChatRequest {
  userId: string;
  title?: string;
}

/**
 * Interface for sending a message
 */
export interface SendMessageRequest {
  chatId: string;
  userId: string;
  userMessage: string;
  userName: string;
  userRole: string;
  attachments?: Array<{
    type: string;
    url: string;
    name: string;
  }>;
  conversationHistory?: Array<{
    role: string;
    content: string;
  }>;
}

/**
 * Interface for file upload
 */
export interface FileUploadRequest {
  userId: string;
  chatId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

/**
 * Interface for search request
 */
export interface SearchRequest {
  userId: string;
  query: string;
}

/**
 * Hanna AI Service Class
 * Centralized API client for all Hanna-related operations
 */
export class HannaService {
  private static readonly BASE_URL = '/api/hanna';
  private static readonly TIMEOUT = 30000; // 30 seconds

  /**
   * Create a new chat session
   */
  static async createChat(request: CreateChatRequest) {
    try {
      const response = await fetch(`${this.BASE_URL}/create-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to create chat');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }

  /**
   * Send a message to Hanna AI
   */
  static async sendMessage(request: SendMessageRequest) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

      const response = await fetch(`${this.BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.response || 'Failed to send message');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Upload a file for Hanna to analyze
   */
  static async uploadFile(request: FileUploadRequest) {
    try {
      const response = await fetch(`${this.BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Get all chat sessions for a user
   */
  static async getChats(userId: string, limit: number = 50) {
    try {
      const response = await fetch(
        `${this.BASE_URL}/chats?userId=${userId}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching chats:', error);
      throw error;
    }
  }

  /**
   * Get messages for a specific chat
   */
  static async getMessages(
    chatId: string,
    limit: number = 50,
    offset: number = 0
  ) {
    try {
      const response = await fetch(
        `${this.BASE_URL}/messages?chatId=${chatId}&limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  /**
   * Search messages across all chats
   */
  static async searchMessages(request: SearchRequest) {
    try {
      const response = await fetch(`${this.BASE_URL}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to search messages');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }

  /**
   * Delete a chat session
   */
  static async deleteChat(chatId: string) {
    try {
      const response = await fetch(`${this.BASE_URL}/chat?chatId=${chatId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  }

  /**
   * Archive a chat session
   */
  static async archiveChat(chatId: string) {
    try {
      const response = await fetch(`${this.BASE_URL}/chat/archive`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatId }),
      });

      if (!response.ok) {
        throw new Error('Failed to archive chat');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error archiving chat:', error);
      throw error;
    }
  }

  /**
   * Get chat statistics
   */
  static async getChatStats(userId: string) {
    try {
      const response = await fetch(`${this.BASE_URL}/stats?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  }

  /**
   * Export chat as PDF or text
   */
  static async exportChat(chatId: string, format: 'pdf' | 'txt' = 'txt') {
    try {
      const response = await fetch(
        `${this.BASE_URL}/export?chatId=${chatId}&format=${format}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export chat');
      }

      return response.blob();
    } catch (error) {
      console.error('Error exporting chat:', error);
      throw error;
    }
  }
}

export default HannaService;

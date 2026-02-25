/**
 * Enhanced Chat Page
 * Main chat interface with Firebase Firestore integration
 * Features: real-time messaging, user profiles, themes, settings, delete chat
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Send,
  Settings,
  Trash2,
  User,
  Plus,
} from 'lucide-react';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatSettings } from '@/components/ChatSettings';
import { ViewUserProfile } from '@/components/ViewUserProfile';
import { DeleteChatConfirmation } from '@/components/DeleteChatConfirmation';
import type { Message, ChatSettings as ChatSettingsType, UserProfile, ChatTheme } from '@/types/chat';
import { groupMessagesByDate } from '@/lib/messageUtils';

/**
 * Main Chat Enhanced Component
 * Displays chat interface with all enhanced features
 */
export default function ChatEnhanced() {
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentUser] = useState<UserProfile>({
    id: 'user-1',
    name: 'You',
    email: 'user@example.com',
    avatar: '',
    role: 'student',
    joinedDate: new Date().toISOString(),
    status: 'online',
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [chatSettings, setChatSettings] = useState<ChatSettingsType>({
    theme: 'light' as ChatTheme,
    fontSize: 14,
    fontStyle: 'normal',
    wallpaper: '',
    notificationsEnabled: true,
    muteNotifications: false,
    colors: {
      sentMessageBg: '#007AFF',
      receivedMessageBg: '#E5E5EA',
      textColor: '#000000',
      accentColor: '#007AFF',
    },
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Handles sending a new message
   * Creates message object with timestamp and read status
   */
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    // Create new message with proper Message interface
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      chatId: 'chat-1',
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: 'user',
      content: inputValue,
      createdAt: new Date().toISOString(),
      readStatus: 'sent',
    };

    // Add message to state
    setMessages([...messages, newMessage]);
    setInputValue('');

    // Simulate message delivery after 500ms
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id ? { ...msg, readStatus: 'delivered' } : msg
        )
      );
    }, 500);

    // Simulate message read after 2 seconds
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id ? { ...msg, readStatus: 'read' } : msg
        )
      );
    }, 2000);
  };

  /**
   * Handles settings change
   * Updates chat settings and applies them to the UI
   */
  const handleSettingsChange = (newSettings: ChatSettingsType) => {
    setChatSettings(newSettings);
    setShowSettings(false);
  };

  /**
   * Groups messages by date for display
   * Returns array of message groups with date labels
   */
  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
            <User size={20} />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">Chat</h1>
            <p className="text-sm text-gray-500">Online</p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowProfile(true)}
            title="View Profile"
          >
            <User size={20} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <Settings size={20} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete Chat"
          >
            <Trash2 size={20} />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto p-4"
        style={{
          backgroundImage: chatSettings.wallpaper
            ? `url(${chatSettings.wallpaper})`
            : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Plus size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No messages yet. Start a conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messageGroups.map((group, groupIndex) => (
              <div key={groupIndex}>
                {/* Date separator */}
                {group.dateLabel && (
                  <div className="flex justify-center my-4">
                    <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {group.dateLabel}
                    </span>
                  </div>
                )}

                {/* Messages in this group */}
                {group.messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isCurrentUser={message.senderId === currentUser.id}
                    customColors={chatSettings.colors}
                    fontSize={chatSettings.fontSize}
                    fontStyle={chatSettings.fontStyle}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Send size={20} />
          </Button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <ChatSettings
          currentSettings={chatSettings}
          onSettingsChange={handleSettingsChange}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* User Profile Modal */}
      {showProfile && (
        <ViewUserProfile
          profile={currentUser}
          onClose={() => setShowProfile(false)}
        />
      )}

      {/* Delete Chat Confirmation */}
      {showDeleteConfirm && (
        <DeleteChatConfirmation
          onConfirm={() => {
            setMessages([]);
            setShowDeleteConfirm(false);
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

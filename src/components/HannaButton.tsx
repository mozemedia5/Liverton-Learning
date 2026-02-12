/**
 * HannaButton Component
 * Floating AI assistant button that appears on authenticated pages
 * Features: Role-based descriptions, direct navigation to Hanna chat
 */

import { useState } from 'react';
import { Bot, X, Sparkles, MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * HannaButton Component
 * Displays a floating button for accessing Hanna AI assistant
 * Button is hidden when user is actively in the Hanna chat interface
 * Shows role-specific information about Hanna's capabilities
 * Provides quick access to start new chats or view existing sessions
 */
export function HannaButton() {
  const { userRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  /**
   * Check if user is currently in the Hanna chat interface
   * Returns true if the current route is the Hanna AI page or Chat page with Hanna selected
   * This prevents showing the floating button when already in the chat
   */
  const isInHannaChat = 
    location.pathname === '/features/hanna-ai' || 
    location.pathname === '/features/chat';

  /**
   * Get role-specific description of Hanna's capabilities
   * Customizes the dialog content based on user's role
   * @returns Object containing title, description, and features list
   */
  const getHannaDescription = () => {
    switch (userRole) {
      case 'student':
        return {
          title: 'Hanna - Your AI Learning Assistant',
          description: 'Hanna helps you with:',
          features: [
            '📚 Homework help and explanations',
            '❓ Answer questions about course materials',
            '✍️ Essay writing assistance and feedback',
            '📊 Study tips and learning strategies',
            '🎯 Personalized learning recommendations',
            '⏰ Assignment deadline reminders',
          ],
        };
      case 'teacher':
        return {
          title: 'Hanna - Your AI Teaching Assistant',
          description: 'Hanna helps you with:',
          features: [
            '📝 Lesson plan creation and suggestions',
            '✅ Automated grading assistance',
            '📊 Student performance analytics',
            '💡 Teaching methodology recommendations',
            '📧 Automated communication templates',
            '🎓 Curriculum development support',
          ],
        };
      case 'school_admin':
        return {
          title: 'Hanna - Your AI Administrative Assistant',
          description: 'Hanna helps you with:',
          features: [
            '📊 School performance analytics',
            '👥 Student and staff management insights',
            '📋 Report generation and analysis',
            '💼 Administrative task automation',
            '📈 Enrollment and retention predictions',
            '🔍 Data-driven decision support',
          ],
        };
      case 'platform_admin':
        return {
          title: 'Hanna - Your AI Platform Assistant',
          description: 'Hanna helps you with:',
          features: [
            '🌐 Platform-wide analytics and insights',
            '👥 User management and support',
            '🔒 Security monitoring and alerts',
            '📊 System performance metrics',
            '💡 Feature recommendations',
            '🚀 Platform optimization suggestions',
          ],
        };
      default:
        return {
          title: 'Hanna - Your AI Assistant',
          description: 'Hanna helps you with:',
          features: ['🚀 Advanced AI features at your fingertips'],
        };
    }
  };

  /**
   * Handle starting a new chat with Hanna
   * Navigates to the Chat page where a new session will be created
   */
  const handleNewChat = () => {
    setOpen(false);
    navigate('/features/chat');
  };

  /**
   * Handle viewing existing chat sessions
   * Navigates to the Chat page to view and select from existing sessions
   */
  const handleExistingSessions = () => {
    setOpen(false);
    navigate('/features/chat');
  };

  const hannaInfo = getHannaDescription();

  /**
   * Don't render the floating button if user is in the Hanna chat interface
   * This improves UX by avoiding duplicate AI interfaces
   */
  if (isInHannaChat) {
    return null;
  }

  return (
    <>
      {/* Floating Hanna AI Button */}
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 rounded-full w-14 h-14 p-0 bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 z-30 flex items-center justify-center group"
        title="Open Hanna AI Assistant"
      >
        <div className="relative">
          <Bot className="w-6 h-6" />
          <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-yellow-300 animate-pulse" />
        </div>
      </Button>

      {/* Hanna Info & Chat Options Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-2 border-purple-300 dark:border-purple-700">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Bot className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-yellow-400" />
                </div>
                <DialogTitle className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {hannaInfo.title}
                </DialogTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="h-auto p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <DialogDescription className="text-base font-semibold text-gray-700 dark:text-gray-300 pt-2">
              {hannaInfo.description}
            </DialogDescription>
          </DialogHeader>

          {/* Features List */}
          <div className="space-y-3 py-4">
            {hannaInfo.features.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800"
              >
                <span className="text-lg flex-shrink-0">{feature.split(' ')[0]}</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {feature.substring(feature.indexOf(' ') + 1)}
                </span>
              </div>
            ))}
          </div>

          {/* Chat Options */}
          <div className="space-y-3 pt-4 border-t border-purple-200 dark:border-purple-800">
            {/* Start New Chat Button */}
            <Button
              onClick={handleNewChat}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Start New Chat with Hanna
            </Button>

            {/* View Existing Sessions Button */}
            <Button
              onClick={handleExistingSessions}
              variant="outline"
              className="w-full border-2 border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950 font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-5 h-5" />
              View Existing Sessions
            </Button>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>💡 Tip:</strong> Your chat history is saved automatically. Start a new chat or continue with an existing session anytime!
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

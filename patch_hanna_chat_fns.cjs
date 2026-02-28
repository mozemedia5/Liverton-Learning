const fs = require('fs');
let content = fs.readFileSync('Liverton-learning/src/pages/HannaChat.tsx', 'utf8');

const functionsToAdd = `
  /**
   * Handle chat session long press
   */
  const handleChatPressStart = (chatId: string) => {
    const timer = setTimeout(() => {
      setLongPressedChatId(chatId);
    }, 500);
    setChatLongPressTimer(timer);
  };

  const handleChatPressEnd = () => {
    if (chatLongPressTimer) {
      clearTimeout(chatLongPressTimer);
      setChatLongPressTimer(null);
    }
  };

  /**
   * Handle chat session deletion
   */
  const handleDeleteChat = async (chatId: string) => {
    try {
      toast.success('Chat deleted');
      setChatSessions(prev => prev.filter(c => c.id !== chatId));
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setMessages([]);
      }
      setLongPressedChatId(null);
    } catch (error) {
      toast.error('Failed to delete chat');
    }
  };

  /**
   * Handle file upload
   */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadProgress(0);

    try {
      // Simulate file upload with progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      setTimeout(() => {
        clearInterval(interval);
        setSelectedFile(file);
        setUploadingFile(false);
        toast.success('File uploaded successfully');
      }, 2000);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
      setUploadingFile(false);
    }
  };

  /**
   * Handle emoji selection
   */
  const handleEmojiSelect = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  /**
   * Handle message deletion (local only)
   */
  const handleDeleteMessage = async (messageId: string) => {
    try {
      toast.success('Message deleted (local only)');
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
    } catch (error) {
      toast.error('Failed to delete message');
    }
  };

  /**
   * Handle message editing (local only)
   */
  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      toast.success('Message edited (local only)');
      setMessages(prevMessages => prevMessages.map(msg =>
        msg.id === messageId ? { ...msg, content: newContent } : msg
      ));
    } catch (error) {
      toast.error('Failed to edit message');
    }
  };
`;

content = content.replace("const handleSendMessage = async (e: React.FormEvent) => {", functionsToAdd + "\n  const handleSendMessage = async (e: React.FormEvent) => {");

fs.writeFileSync('Liverton-learning/src/pages/HannaChat.tsx', content);
